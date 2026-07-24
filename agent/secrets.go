package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
)

// Bounds so this can't hang or thrash a busy server - same discipline as the
// world-writable-file scan in scanner.go.
const (
	secretsScanMaxFilesVisited = 20000
	secretsScanMaxFindings     = 20
)

var secretsScanRoots = []string{"/etc", "/opt", "/var/www"}

var secretsScanExtensions = map[string]bool{
	".env": true, ".yml": true, ".yaml": true, ".conf": true, ".json": true,
}

type secretPattern struct {
	label string
	re    *regexp.Regexp
}

// Patterns intentionally only capture enough to prove a match exists (used for the
// finding's byte-length trim below) - the actual matched secret value is never
// transmitted or logged, only the file path and which pattern matched.
var secretPatterns = []secretPattern{
	{label: "aws_access_key_id", re: regexp.MustCompile(`AKIA[0-9A-Z]{16}`)},
	{label: "private_key_block", re: regexp.MustCompile(`-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----`)},
	{label: "hardcoded_password_assignment", re: regexp.MustCompile(`(?i)(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"\s]{6,}['"]`)},
}

type secretMatch struct {
	path  string
	label string
}

// scanForSecrets walks a bounded set of common config/app directories looking for
// credential-shaped strings (Phase 3 Secrets Scanner). It never returns or logs the
// matched text itself - only the file path and which pattern matched - so the scanner
// can't become a secrets-leak vector in its own right.
func scanForSecrets() []secretMatch {
	return scanForSecretsInRoots(secretsScanRoots)
}

// scanForSecretsInRoots is the testable core of scanForSecrets, parameterized on the
// roots to walk so tests can point it at a throwaway temp directory instead of real
// system paths.
func scanForSecretsInRoots(roots []string) []secretMatch {
	var matches []secretMatch
	visited := 0

	for _, root := range roots {
		if _, err := os.Stat(root); err != nil {
			continue
		}
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			visited++
			if visited > secretsScanMaxFilesVisited || len(matches) >= secretsScanMaxFindings {
				return filepath.SkipAll
			}
			if d.IsDir() {
				return nil
			}
			if !secretsScanExtensions[filepath.Ext(path)] {
				return nil
			}

			data, err := os.ReadFile(path)
			if err != nil {
				return nil
			}

			for _, p := range secretPatterns {
				if p.re.Match(data) {
					matches = append(matches, secretMatch{path: path, label: p.label})
					break // one finding per file is enough signal; avoid duplicate noise
				}
			}
			return nil
		})
	}

	return matches
}

// RunSecretsScan wraps scanForSecrets into SecurityFinding entries for the existing
// findings pipeline. Linux/macOS path conventions only run meaningfully where these
// directories exist; on Windows this simply finds nothing rather than erroring.
func RunSecretsScan() []SecurityFinding {
	findings := []SecurityFinding{}
	if runtime.GOOS == "windows" {
		return findings
	}

	for _, m := range scanForSecrets() {
		findings = append(findings, SecurityFinding{
			RuleID:             "secrets.exposed_credential",
			Category:           "secrets",
			Severity:           "CRITICAL",
			Passed:             false,
			AutoFixable:        false,
			BusinessImpactText: "A credential-shaped string was found in a config file. If real, this could let an attacker who reads this file impersonate a service or account.",
			RecommendedAction:  "Remove the credential from this file and use environment variables or a secrets manager instead. Rotate the credential if it was ever real.",
			Detail:             m.path + ": " + m.label,
		})
	}

	return findings
}
