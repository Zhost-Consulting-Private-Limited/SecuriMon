package main

import (
	"log"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

func RunSecurityScan() []SecurityFinding {
	// Always a non-nil slice: encodes as JSON [] rather than null when empty, which
	// the backend's findings-ingestion endpoint requires (see routes/agent.ts).
	findings := []SecurityFinding{}

	// Skip Linux-specific checks if running on Windows
	if runtime.GOOS == "windows" {
		log.Println("Security scan: Windows OS detected. Running Windows-specific rules (placeholder).")
		return findings
	}

	// 1. Check SSH Password Authentication
	sshConfig, err := os.ReadFile("/etc/ssh/sshd_config")
	if err == nil {
		configStr := string(sshConfig)
		// Extremely simple heuristic for MVP
		passed := !strings.Contains(configStr, "PasswordAuthentication yes") && strings.Contains(configStr, "PasswordAuthentication no")
		findings = append(findings, SecurityFinding{
			RuleID:             "ssh.password_login",
			Category:           "ssh",
			Severity:           "HIGH",
			Passed:             passed,
			AutoFixable:        true,
			BusinessImpactText: "Password authentication allows attackers to brute-force your server.",
			RecommendedAction:  "Disable password authentication and use SSH keys.",
			Detail:             "Found in /etc/ssh/sshd_config",
		})
	}

	// 2. Check UFW (Uncomplicated Firewall) Status
	out, err := exec.Command("ufw", "status").Output()
	ufwPassed := false
	if err == nil && strings.Contains(string(out), "Status: active") {
		ufwPassed = true
	} else if err != nil && !strings.Contains(err.Error(), "not found") {
		// Only fail if UFW exists but isn't active
		ufwPassed = false
	} else {
		// If ufw doesn't exist, we skip or assume failed. For MVP, we fail it to prompt install.
		ufwPassed = false
	}

	findings = append(findings, SecurityFinding{
		RuleID:             "firewall.ufw_active",
		Category:           "firewall",
		Severity:           "HIGH",
		Passed:             ufwPassed,
		AutoFixable:        true,
		BusinessImpactText: "An inactive firewall exposes all server ports to the public internet.",
		RecommendedAction:  "Enable UFW and configure default deny policies.",
		Detail:             "UFW status check",
	})

	return findings
}
