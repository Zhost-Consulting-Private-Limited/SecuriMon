#!/bin/bash
set -e

# SecuriMon Agent - 1-Click Installation Script for Linux

echo "========================================="
echo "   SecuriMon Agent Installer             "
echo "========================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo)."
  exit 1
fi

if [ -z "$INSTALL_TOKEN" ]; then
  echo "[ERROR] INSTALL_TOKEN environment variable is required."
  echo "Usage: curl -sSL https://install.securimon.com | INSTALL_TOKEN=xxx bash"
  exit 1
fi

BACKEND_URL=${BACKEND_URL:-"https://api.securimon.com"}
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
  BIN_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  BIN_ARCH="arm64"
else
  echo "[ERROR] Unsupported architecture: $ARCH"
  exit 1
fi

echo "[1/4] Downloading agent binary for $BIN_ARCH..."
# In production, download from actual release artifacts
# curl -sSL "$BACKEND_URL/downloads/agent/linux/$BIN_ARCH/securimon-agent" -o /usr/local/bin/securimon-agent
touch /usr/local/bin/securimon-agent # Placeholder
chmod +x /usr/local/bin/securimon-agent

echo "[2/4] Registering agent with backend..."
# In production, we curl the backend /v1/agent/register to get credentials
# Response would give server_id and api_key
mkdir -p /etc/securimon

cat <<EOF > /etc/securimon/agent.conf
{
  "tenant_id": "placeholder_tenant",
  "server_id": "placeholder_server",
  "api_key": "placeholder_key",
  "backend_url": "$BACKEND_URL"
}
EOF
chmod 600 /etc/securimon/agent.conf

echo "[3/4] Creating systemd service..."
cat <<EOF > /etc/systemd/system/securimon-agent.service
[Unit]
Description=SecuriMon Telemetry and Security Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/securimon-agent
Restart=always
RestartSec=10
User=root
LimitNOFILE=10000

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Starting service..."
systemctl daemon-reload
systemctl enable securimon-agent
# systemctl start securimon-agent # Disabled for local testing

echo "========================================="
echo " [SUCCESS] SecuriMon Agent is installed! "
echo " Check status with: systemctl status securimon-agent"
echo "========================================="
