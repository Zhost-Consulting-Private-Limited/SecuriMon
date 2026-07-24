package main

import (
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

// patchCheckResult is the pure, testable shape produced by parsing a package manager's
// upgradable-list output - separated from the exec.Command calls so the parsing logic
// itself can be unit tested without a real apt/yum/dnf on this machine.
type patchCheckResult struct {
	tool            string
	totalUpgradable int
	securityFlagged int // heuristic - see parseAptUpgradable / countYumSecurityLines
	securityUnknown bool
}

// parseAptUpgradable parses `apt list --upgradable` output. The first line is a
// "Listing..." header, not a package; each subsequent non-empty line is one upgradable
// package. Security-repo detection is a heuristic (Debian/Ubuntu security repos are
// conventionally suffixed "-security", e.g. "focal-security") - not authoritative, since
// apt doesn't expose a first-class "is this a security update" flag the way dnf does.
func parseAptUpgradable(output string) patchCheckResult {
	result := patchCheckResult{tool: "apt"}
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Listing...") {
			continue
		}
		result.totalUpgradable++
		if strings.Contains(line, "-security") {
			result.securityFlagged++
		}
	}
	return result
}

// parseYumCheckUpdate parses `yum check-update` / `dnf check-update` output. Real output
// is one package per line (name, version, repo, space-separated) with a blank line
// separating an optional leading "obsoleting packages" section; blank lines and any
// line that doesn't look like "name version repo" are skipped rather than counted.
func parseYumCheckUpdate(output string, tool string) patchCheckResult {
	result := patchCheckResult{tool: tool}
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) != 3 {
			continue // section headers, warnings, etc.
		}
		result.totalUpgradable++
	}
	return result
}

func runPatchCheck() patchCheckResult {
	if _, err := exec.LookPath("apt"); err == nil {
		out, _ := exec.Command("apt", "list", "--upgradable").CombinedOutput()
		return parseAptUpgradable(string(out))
	}

	if _, err := exec.LookPath("dnf"); err == nil {
		out, _ := exec.Command("dnf", "check-update").CombinedOutput()
		result := parseYumCheckUpdate(string(out), "dnf")
		if secOut, secErr := exec.Command("dnf", "check-update", "--security").CombinedOutput(); secErr == nil || len(secOut) > 0 {
			result.securityFlagged = parseYumCheckUpdate(string(secOut), "dnf").totalUpgradable
		} else {
			result.securityUnknown = true
		}
		return result
	}

	if _, err := exec.LookPath("yum"); err == nil {
		out, _ := exec.Command("yum", "check-update").CombinedOutput()
		result := parseYumCheckUpdate(string(out), "yum")
		if secOut, secErr := exec.Command("yum", "check-update", "--security").CombinedOutput(); secErr == nil || len(secOut) > 0 {
			result.securityFlagged = parseYumCheckUpdate(string(secOut), "yum").totalUpgradable
		} else {
			result.securityUnknown = true
		}
		return result
	}

	return patchCheckResult{tool: "", totalUpgradable: 0}
}

// RunPatchCheck reports available OS package updates as a SecurityFinding
// (Phase 3 Patch Management). Detection-only by design this batch - no auto-apply
// action exists, since silently upgrading packages on someone's production server is a
// materially different risk level than the existing safe remediation actions and
// deserves its own careful design (opt-in policy, maintenance windows, rollback story).
func RunPatchCheck() []SecurityFinding {
	findings := []SecurityFinding{}
	if runtime.GOOS == "windows" {
		return findings
	}

	result := runPatchCheck()
	if result.tool == "" {
		return findings // no supported package manager found - nothing to report
	}

	severity := "LOW"
	detail := "No pending package updates found (" + result.tool + ")."
	if result.totalUpgradable > 0 {
		severity = "MEDIUM"
		detail = strconv.Itoa(result.totalUpgradable) + " package update(s) available (" + result.tool + ")"
		if result.securityUnknown {
			detail += "; security-specific count unavailable"
		} else if result.securityFlagged > 0 {
			severity = "HIGH"
			detail += ", including " + strconv.Itoa(result.securityFlagged) + " security update(s)"
		}
		detail += "."
	}

	findings = append(findings, SecurityFinding{
		RuleID:             "patches.available_updates",
		Category:           "patches",
		Severity:           severity,
		Passed:             result.totalUpgradable == 0,
		AutoFixable:        false,
		BusinessImpactText: "Unpatched packages can leave known, publicly-documented vulnerabilities open on this server.",
		RecommendedAction:  "Review and apply available package updates during your next maintenance window.",
		Detail:             detail,
	})

	return findings
}
