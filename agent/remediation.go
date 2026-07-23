package main

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"
)

// ExecuteRemediation securely executes a whitelisted remediation action
func ExecuteRemediation(action string, params map[string]interface{}) (string, error) {
	log.Printf("Executing remediation action: %s", action)

	if runtime.GOOS == "windows" {
		log.Println("Remediation on Windows is a placeholder for MVP.")
		return "skipped (windows)", nil
	}

	switch action {
	case "enable_ufw":
		out, err := exec.Command("ufw", "--force", "enable").CombinedOutput()
		if err != nil {
			return "failed", err
		}
		return string(out), nil

	case "disable_ssh_password_auth":
		// This uses sed to quickly patch sshd_config. In production, a safer parsing library might be used.
		out, err := exec.Command("sed", "-i", `s/^#\?PasswordAuthentication\s\+yes/PasswordAuthentication no/g`, "/etc/ssh/sshd_config").CombinedOutput()
		if err != nil {
			return "failed", err
		}
		// Restart SSH service to apply changes
		exec.Command("systemctl", "restart", "sshd").Run()
		return string(out), nil

	case "rotate_logs":
		if _, err := exec.LookPath("logrotate"); err != nil {
			return "failed", fmt.Errorf("logrotate not found on this host")
		}
		out, err := exec.Command("logrotate", "-f", "/etc/logrotate.conf").CombinedOutput()
		if err != nil {
			return "failed", err
		}
		return string(out), nil

	case "block_ip":
		ip, ok := params["ip"].(string)
		if !ok {
			return "failed", nil
		}
		out, err := exec.Command("ufw", "deny", "from", ip).CombinedOutput()
		if err != nil {
			return "failed", err
		}
		return string(out), nil

	default:
		log.Printf("Unknown or disallowed remediation action: %s", action)
		return "unknown action", nil
	}
}
