#!/bin/bash
set -e

# Vigilon Agent - 1-Click Installation Script for Linux

echo "========================================="
echo "   Vigilon Agent Installer             "
echo "========================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo)."
  exit 1
fi

if [ -z "$INSTALL_TOKEN" ]; then
  echo "[ERROR] INSTALL_TOKEN environment variable is required."
  echo "Usage: curl -sSL https://your-backend/install.sh | INSTALL_TOKEN=xxx BACKEND_URL=https://your-backend bash"
  exit 1
fi

BACKEND_URL=${BACKEND_URL:-"https://vigilon.bithost.in"}
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
  BIN_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  BIN_ARCH="arm64"
else
  echo "[ERROR] Unsupported architecture: $ARCH"
  exit 1
fi

echo "[1/4] Installing agent binary for $BIN_ARCH..."
# This week's build does not yet host versioned release binaries for download here.
# Self-hosted operators should build the agent from source (agent/) or take a binary
# produced by .github/workflows/agent-builder.yml and place it at the path below.
if [ ! -f /usr/local/bin/vigilon-agent ]; then
  echo "[WARN] /usr/local/bin/vigilon-agent not found - build it from the agent/ source"
  echo "       (go build -o /usr/local/bin/vigilon-agent ./agent) and re-run this script,"
  echo "       or copy a CI-built binary there before continuing."
  exit 1
fi
chmod +x /usr/local/bin/vigilon-agent

echo "[2/4] Registering agent with backend..."
HOSTNAME_VAL=$(hostname)
OS_ID=$(. /etc/os-release 2>/dev/null && echo "$ID" || echo "linux")
OS_VERSION=$(. /etc/os-release 2>/dev/null && echo "$VERSION_ID" || echo "")
KERNEL_VERSION=$(uname -r)

REGISTER_RESPONSE=$(curl -sSf -X POST "$BACKEND_URL/v1/agent/register" \
  -H "Content-Type: application/json" \
  -d "{\"install_token\":\"$INSTALL_TOKEN\",\"hostname\":\"$HOSTNAME_VAL\",\"os\":\"$OS_ID\",\"os_version\":\"$OS_VERSION\",\"kernel_version\":\"$KERNEL_VERSION\"}")

SERVER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"server_id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"([^"]*)"$/\1/')
API_KEY=$(echo "$REGISTER_RESPONSE" | grep -o '"api_key"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"([^"]*)"$/\1/')
TENANT_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"tenant_id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"([^"]*)"$/\1/')

if [ -z "$SERVER_ID" ] || [ -z "$API_KEY" ]; then
  echo "[ERROR] Registration failed. Backend response: $REGISTER_RESPONSE"
  exit 1
fi

mkdir -p /etc/vigilon
cat <<EOF > /etc/vigilon/agent.conf
{
  "tenant_id": "$TENANT_ID",
  "server_id": "$SERVER_ID",
  "api_key": "$API_KEY",
  "backend_url": "$BACKEND_URL"
}
EOF
chmod 600 /etc/vigilon/agent.conf

echo "[3/4] Creating systemd service..."
cat <<EOF > /etc/systemd/system/vigilon-agent.service
[Unit]
Description=Vigilon Telemetry and Security Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/vigilon-agent
Restart=always
RestartSec=10
User=root
LimitNOFILE=10000

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Starting service..."
systemctl daemon-reload
systemctl enable vigilon-agent
systemctl restart vigilon-agent

echo "========================================="
echo " [SUCCESS] Vigilon Agent is installed! "
echo " Check status with: systemctl status vigilon-agent"
echo "========================================="
