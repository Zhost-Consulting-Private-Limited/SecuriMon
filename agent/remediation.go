package main

import (
	"fmt"
	"log"
	"net"
	"os/exec"
	"runtime"
	"strings"
)

// buildBlockIPCommands returns the sequence of command argv slices needed to block a
// source IP with the given firewall tool ("ufw" or "firewalld"; any other value, or an
// unparseable IP, returns no commands). Pure and side-effect-free so it can be unit
// tested without a real firewall present - the same pattern used for patches.go's
// output parsers.
//
// The IP is validated with net.ParseIP before being embedded in firewalld's rich-rule
// string: that string isn't passed through a shell (exec.Command doesn't invoke one),
// but firewalld parses its own rule syntax, so an attacker-controlled "IP" containing
// quotes could otherwise break out of the intended rule (e.g. turn a reject into an
// accept, or target a different address than the one that was actually detected).
func buildBlockIPCommands(tool string, ip string) [][]string {
	if net.ParseIP(ip) == nil {
		return nil
	}

	switch tool {
	case "ufw":
		return [][]string{{"ufw", "deny", "from", ip}}
	case "firewalld":
		return [][]string{
			{"firewall-cmd", "--permanent", `--add-rich-rule=rule family="ipv4" source address="` + ip + `" reject`},
			{"firewall-cmd", "--reload"},
		}
	default:
		return nil
	}
}

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

		tool := "none"
		if _, err := exec.LookPath("ufw"); err == nil {
			tool = "ufw"
		} else if _, err := exec.LookPath("firewall-cmd"); err == nil {
			tool = "firewalld"
		}

		commands := buildBlockIPCommands(tool, ip)
		if len(commands) == 0 {
			return "failed", fmt.Errorf("could not build a block command: either no supported firewall tool (ufw or firewalld) was found, or the IP %q didn't parse as valid", ip)
		}

		var combinedOutput strings.Builder
		for _, args := range commands {
			out, err := exec.Command(args[0], args[1:]...).CombinedOutput()
			combinedOutput.Write(out)
			if err != nil {
				return combinedOutput.String(), err
			}
		}
		return combinedOutput.String(), nil

	default:
		log.Printf("Unknown or disallowed remediation action: %s", action)
		return "unknown action", nil
	}
}
