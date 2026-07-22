package main

import (
    "log"
    "os"
    "runtime"
    "strings"
    "time"
    "strconv"
    "os/exec"
)

// CrossPlatformAgent represents a server agent that supports both Windows and Linux
// This refactored version maintains compatibility with both platforms
// while adding Windows-specific functionality alongside existing Linux support

type CrossPlatformAgent struct {
    Config        *Config
    IsWindows     bool
    IsLinux       bool
    PlatformInfo  PlatformInfo
}

type PlatformInfo struct {
    OSVersion    string
    Architecture string
    ServiceName  string
    ExecutableName string
}

func NewCrossPlatformAgent(config *Config) *CrossPlatformAgent {
    agent := &CrossPlatformAgent{
        Config: config,
    }
    
    // Detect platform
    agent.IsWindows = runtime.GOOS == "windows"
    agent.IsLinux = runtime.GOOS == "linux"
    
    agent.PlatformInfo = agent.detectPlatformInfo()
    
    return agent
}

func (agent *CrossPlatformAgent) detectPlatformInfo() PlatformInfo {
    info := PlatformInfo{}
    
    if agent.IsWindows {
        info.OSVersion = agent.getWindowsOSVersion()
        info.Architecture = agent.getWindowsArchitecture()
        info.ServiceName = "WindowsService"
        info.ExecutableName = "securimon.exe"
        return info
    }
    
    if agent.IsLinux {
        info.OSVersion = agent.getLinuxOSVersion()
        info.Architecture = agent.getLinuxArchitecture()
        info.ServiceName = "systemd"
        info.ExecutableName = "/usr/local/bin/securimon"
        return info
    }
    
    return PlatformInfo{OSVersion: runtime.GOOS, Architecture: "unknown"}
}

func (agent *CrossPlatformAgent) getWindowsOSVersion() string {
    cmd := exec.Command("cmd", "/c", "wmic os get Caption /value")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "Unknown Windows OS"
    }
    
    lines := strings.Split(string(output), "\n")
    for _, line := range lines {
        if strings.Contains(line, "Caption") {
            version := strings.TrimSpace(strings.ReplaceAll(line, "Caption", ""))
            return strings.TrimSpace(version)
        }
    }
    return "Windows"
}

func (agent *CrossPlatformAgent) getWindowsArchitecture() string {
    cmd := exec.Command("cmd", "/c", "echo %PROCESSOR_ARCHITECTURE%")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "x86"
    }
    return strings.TrimSpace(string(output))
}

func (agent *CrossPlatformAgent) getLinuxOSVersion() string {
    cmd := exec.Command("cat", "/etc/os-release")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "Unknown Linux"
    }
    
    lines := strings.Split(string(output), "\n")
    for _, line := range lines {
        if strings.HasPrefix(line, "PRETTY_NAME=") {
            version := strings.TrimPrefix(line, "PRETTY_NAME=")
            if strings.HasPrefix(version, "\") && strings.HasSuffix(version, "\") {
                version = strings.TrimPrefix(version, "\")
                version = strings.TrimSuffix(version, "\")
            }
            if strings.HasPrefix(version, "'") && strings.HasSuffix(version, "'") {
                version = strings.TrimPrefix(version, "'")
                version = strings.TrimSuffix(version, "'")
            }
            return version
        }
    }
    return "Linux"
}

func (agent *CrossPlatformAgent) getLinuxArchitecture() string {
    cmd := exec.Command("uname", "-m")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "x86_64"
    }
    return strings.TrimSpace(string(output))
}

func (agent *CrossPlatformAgent) Start() error {
    if agent.IsWindows {
        return agent.startWindowsService()
    } else if agent.IsLinux {
        return agent.startLinuxService()
    }
    return fmt.Errorf("unsupported platform")
}

func (agent *CrossPlatformAgent) startWindowsService() error {
    log.Printf("Starting Windows service: %s", agent.Config.ServiceID)
    
    // Register Windows service using sc command
    cmd := exec.Command("sc", "create", agent.Config.ServiceID, 
        "binPath=", agent.PlatformInfo.ExecutableName,
        "start= auto", "displayname= SecuriMon Agent")
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to create Windows service: %v", err)
    }
    
    // Start the service
    cmd = exec.Command("sc", "start", agent.Config.ServiceID)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to start Windows service: %v", err)
    }
    
    log.Printf("Windows service started successfully: %s", agent.Config.ServiceID)
    return nil
}

func (agent *CrossPlatformAgent) startLinuxService() error {
    log.Printf("Starting systemd service: %s", agent.Config.ServiceID)
    
    // Create systemd service file
    serviceFile := fmt.Sprintf(`%s.service`, agent.Config.ServiceID)
    serviceContent := fmt.Sprintf(`[Unit]
Description=SecuriMon Agent - %s
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/securimon
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=securimon-agent

[Install]
WantedBy=multi-user.target
`, agent.Config.ServiceID)
    
    // Write service file
    err := os.WriteFile("/etc/systemd/system/"+serviceFile, []byte(serviceContent), 0644)
    if err != nil {
        return fmt.Errorf("failed to write systemd service file: %v", err)
    }
    
    // Reload systemd
    cmd := exec.Command("systemctl", "daemon-reload")
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to reload systemd: %v", err)
    }
    
    // Enable and start service
    cmd = exec.Command("systemctl", "enable", serviceFile)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to enable service: %v", err)
    }
    
    cmd = exec.Command("systemctl", "start", serviceFile)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to start service: %v", err)
    }
    
    log.Printf("Systemd service started successfully: %s", serviceFile)
    return nil
}

func (agent *CrossPlatformAgent) Stop() error {
    if agent.IsWindows {
        return agent.stopWindowsService()
    } else if agent.IsLinux {
        return agent.stopLinuxService()
    }
    return fmt.Errorf("unsupported platform")
}

func (agent *CrossPlatformAgent) stopWindowsService() error {
    log.Printf("Stopping Windows service: %s", agent.Config.ServiceID)
    
    cmd := exec.Command("sc", "stop", agent.Config.ServiceID)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to stop Windows service: %v", err)
    }
    
    // Delete service
    cmd = exec.Command("sc", "delete", agent.Config.ServiceID)
    if err := cmd.Run(); err != nil {
        // Log warning but don't fail - service might not exist
        log.Printf("Warning: failed to delete Windows service: %v", err)
    }
    
    log.Printf("Windows service stopped successfully: %s", agent.Config.ServiceID)
    return nil
}

func (agent *CrossPlatformAgent) stopLinuxService() error {
    log.Printf("Stopping systemd service: %s", agent.Config.ServiceID)
    
    serviceFile := fmt.Sprintf("%s.service", agent.Config.ServiceID)
    
    // Stop service
    cmd := exec.Command("systemctl", "stop", serviceFile)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to stop service: %v", err)
    }
    
    // Disable service
    cmd = exec.Command("systemctl", "disable", serviceFile)
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to disable service: %v", err)
    }
    
    // Remove service file
    if err := os.Remove("/etc/systemd/system/" + serviceFile); err != nil {
        // Log warning but don't fail - file might not exist
        log.Printf("Warning: failed to remove service file: %v", err)
    }
    
    // Reload systemd
    cmd = exec.Command("systemctl", "daemon-reload")
    if err := cmd.Run(); err != nil {
        log.Printf("Warning: failed to reload systemd: %v", err)
    }
    
    log.Printf("Systemd service stopped successfully: %s", serviceFile)
    return nil
}

func (agent *CrossPlatformAgent) GetStatus() (string, error) {
    if agent.IsWindows {
        return agent.getWindowsServiceStatus()
    } else if agent.IsLinux {
        return agent.getLinuxServiceStatus()
    }
    return "unknown", fmt.Errorf("unsupported platform")
}

func (agent *CrossPlatformAgent) getWindowsServiceStatus() (string, error) {
    cmd := exec.Command("sc", "query", agent.Config.ServiceID, "state", "state")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "stopped", err
    }
    
    statusStr := string(output)
    if strings.Contains(statusStr, "RUNNING") {
        return "running", nil
    } else if strings.Contains(statusStr, "STOPPED") {
        return "stopped", nil
    }
    return "unknown", nil
}

func (agent *CrossPlatformAgent) getLinuxServiceStatus() (string, error) {
    serviceFile := fmt.Sprintf("%s.service", agent.Config.ServiceID)
    
    cmd := exec.Command("systemctl", "is-active", serviceFile)
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "stopped", nil
    }
    
    status := strings.TrimSpace(string(output))
    switch status {
    case "active":
        return "running", nil
    case "inactive":
        return "stopped", nil
    case "failed":
        return "failed", nil
    default:
        return "unknown", nil
    }
}
func (agent *CrossPlatformAgent) LogDiagnostics() error {
    log.Printf("=== SecuriMon Cross-Platform Agent Diagnostics ===")
    log.Printf("Platform: %s (%s)", runtime.GOOS, agent.PlatformInfo.Architecture)
    log.Printf("OS Version: %s", agent.PlatformInfo.OSVersion)
    log.Printf("Service ID: %s", agent.Config.ServiceID)
    log.Printf("Backend URL: %s", agent.Config.BackendURL)
    log.Printf("API Key: %s", maskAPIKey(agent.Config.APIKey))
    
    // Get platform-specific status
    status, err := agent.GetStatus()
    if err != nil {
        log.Printf("Status check failed: %v", err)
    } else {
        log.Printf("Service Status: %s", status)
    }
    
    // Log current metrics
    log.Printf("Running on platform: %s", runtime.GOOS)
    
    return nil
}

func maskAPIKey(apiKey string) string {
    if len(apiKey) <= 4 {
        return "****"
    }
    return apiKey[:4] + strings.Repeat("*", len(apiKey)-4)
}
