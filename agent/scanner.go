package main

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// Bounds on the world-writable-file scan so it can't hang or thrash a busy server.
const (
	worldWritableMaxFilesVisited = 20000
	worldWritableMaxFindings     = 10
)

var worldWritableScanRoots = []string{"/etc", "/opt", "/var/www"}

func scanWorldWritableFiles() []string {
	var offenders []string
	visited := 0

	for _, root := range worldWritableScanRoots {
		if _, err := os.Stat(root); err != nil {
			continue
		}
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil // skip unreadable entries rather than aborting the whole scan
			}
			visited++
			if visited > worldWritableMaxFilesVisited || len(offenders) >= worldWritableMaxFindings {
				return filepath.SkipAll
			}
			if d.IsDir() {
				return nil
			}
			info, err := d.Info()
			if err != nil {
				return nil
			}
			if info.Mode().Perm()&0002 != 0 {
				offenders = append(offenders, path)
			}
			return nil
		})
	}
	return offenders
}

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

		// 1b. Check SSH root login (CIS 5.2.8-equivalent)
		rootLoginPassed := strings.Contains(configStr, "PermitRootLogin no")
		findings = append(findings, SecurityFinding{
			RuleID:             "ssh.root_login",
			Category:           "ssh",
			Severity:           "HIGH",
			Passed:             rootLoginPassed,
			AutoFixable:        false, // no remediation action wired for this yet
			BusinessImpactText: "Allowing direct root login over SSH removes a layer of attacker friction and audit trail (no per-user accountability).",
			RecommendedAction:  "Set 'PermitRootLogin no' in /etc/ssh/sshd_config and use sudo from a named account instead.",
			Detail:             "Found in /etc/ssh/sshd_config",
		})
	}

	// 2. Check firewall status. Debian/Ubuntu ship ufw; RHEL-family (CentOS, RHEL,
	// AlmaLinux, Rocky, Amazon Linux) ship firewalld instead - check for whichever is
	// actually present rather than assuming ufw everywhere.
	if _, err := exec.LookPath("ufw"); err == nil {
		out, _ := exec.Command("ufw", "status").Output()
		ufwPassed := strings.Contains(string(out), "Status: active")
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
	} else if _, err := exec.LookPath("firewall-cmd"); err == nil {
		out, _ := exec.Command("firewall-cmd", "--state").Output()
		firewalldPassed := strings.TrimSpace(string(out)) == "running"
		findings = append(findings, SecurityFinding{
			RuleID:             "firewall.firewalld_active",
			Category:           "firewall",
			Severity:           "HIGH",
			Passed:             firewalldPassed,
			AutoFixable:        false, // no remediation action wired for firewalld yet
			BusinessImpactText: "An inactive firewall exposes all server ports to the public internet.",
			RecommendedAction:  "Run 'systemctl enable --now firewalld' and configure zone rules.",
			Detail:             "firewalld status check",
		})
	} else {
		findings = append(findings, SecurityFinding{
			RuleID:             "firewall.none_detected",
			Category:           "firewall",
			Severity:           "HIGH",
			Passed:             false,
			AutoFixable:        false,
			BusinessImpactText: "No supported firewall tool (ufw or firewalld) was found on this server.",
			RecommendedAction:  "Install and enable ufw (Debian/Ubuntu) or firewalld (RHEL-family).",
			Detail:             "Neither ufw nor firewall-cmd found in PATH",
		})
	}

	// 3. Scan for world-writable files in common config/web directories (CIS
	// filesystem-permissions equivalent). Bounded scan - see scanWorldWritableFiles.
	offenders := scanWorldWritableFiles()
	worldWritableDetail := "No world-writable files found in " + strings.Join(worldWritableScanRoots, ", ")
	if len(offenders) > 0 {
		worldWritableDetail = fmt.Sprintf("Found %d world-writable file(s), e.g. %s", len(offenders), strings.Join(offenders, ", "))
	}
	findings = append(findings, SecurityFinding{
		RuleID:             "filesystem.world_writable",
		Category:           "filesystem",
		Severity:           "MEDIUM",
		Passed:             len(offenders) == 0,
		AutoFixable:        false,
		BusinessImpactText: "World-writable files can let any local user (or a compromised low-privilege process) tamper with configuration or web content.",
		RecommendedAction:  "Remove world-write permission (chmod o-w) from the affected files.",
		Detail:             worldWritableDetail,
	})

	// 4. Scan for exposed credentials in common config/app directories (Phase 3
	// Secrets Scanner). See secrets.go - never includes the actual matched value.
	findings = append(findings, RunSecretsScan()...)

	return findings
}
