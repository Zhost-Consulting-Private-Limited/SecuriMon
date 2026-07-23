package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const baselinePath = "/etc/vigilon/baseline.json"

var watchedBinaries = []string{
	"/bin/bash", "/usr/bin/ssh", "/usr/sbin/sshd", "/usr/bin/sudo", "/usr/bin/passwd",
}

// defaultFimWatchPaths are used when the user hasn't set Config.FIMWatchPaths - common
// web-server config files worth knowing if they change unexpectedly. Paths that don't
// exist on a given host are silently skipped (see collectWatchedItems), so it's safe to
// list paths for servers that aren't running that particular web server.
var defaultFimWatchPaths = []string{
	"/etc/nginx/nginx.conf",
	"/etc/apache2/apache2.conf",
	"/etc/httpd/conf/httpd.conf", // RHEL-family Apache path
}

type driftBaseline map[string]string // watched-item key -> sha256 hex digest

func hashBytes(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func hashFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return hashBytes(data), nil
}

func loadBaseline() driftBaseline {
	data, err := os.ReadFile(baselinePath)
	if err != nil {
		return driftBaseline{}
	}
	var b driftBaseline
	if err := json.Unmarshal(data, &b); err != nil {
		return driftBaseline{}
	}
	return b
}

func saveBaseline(b driftBaseline) {
	if err := os.MkdirAll(filepath.Dir(baselinePath), 0700); err != nil {
		log.Printf("Drift detection: failed to create baseline dir: %v", err)
		return
	}
	data, err := json.MarshalIndent(b, "", "  ")
	if err != nil {
		return
	}
	if err := os.WriteFile(baselinePath, data, 0600); err != nil {
		log.Printf("Drift detection: failed to write baseline: %v", err)
	}
}

func rootCrontabHash() (string, bool) {
	out, err := exec.Command("crontab", "-l").CombinedOutput()
	if err != nil {
		return "", false // no crontab for root, or crontab command unavailable
	}
	return hashBytes(out), true
}

func fimPathsToWatch(config *Config) []string {
	if len(config.FIMWatchPaths) > 0 {
		return config.FIMWatchPaths
	}
	return defaultFimWatchPaths
}

// collectWatchedItems returns a map of watched-item key -> current content hash, for
// every item that currently exists/is readable. Missing items are simply omitted rather
// than treated as an error, since e.g. /etc/cron.d (or a given web server's config)
// may legitimately not exist on this host. Keys are prefixed by category so
// classifyDriftKey can determine the right event type without a second lookup:
//   - "file:"     cron drop-in files (/etc/crontab, /etc/cron.d/*)
//   - "crontab:"  root's crontab
//   - "binary:"   high-value system binaries
//   - "fim:"      user- or default-configured File Integrity Monitoring paths
func collectWatchedItems(config *Config) map[string]string {
	items := map[string]string{}

	if h, err := hashFile("/etc/crontab"); err == nil {
		items["file:/etc/crontab"] = h
	}

	if entries, err := os.ReadDir("/etc/cron.d"); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			p := filepath.Join("/etc/cron.d", e.Name())
			if h, err := hashFile(p); err == nil {
				items["file:"+p] = h
			}
		}
	}

	if h, ok := rootCrontabHash(); ok {
		items["crontab:root"] = h
	}

	for _, bin := range watchedBinaries {
		if h, err := hashFile(bin); err == nil {
			items["binary:"+bin] = h
		}
	}

	for _, p := range fimPathsToWatch(config) {
		if h, err := hashFile(p); err == nil {
			items["fim:"+p] = h
		}
	}

	return items
}

// classifyDriftKey maps a collectWatchedItems key to the ThreatEvent type it should be
// reported as. Pure function, exported from I/O for testability.
func classifyDriftKey(key string) string {
	switch {
	case strings.HasPrefix(key, "binary:"):
		return "binary_change"
	case strings.HasPrefix(key, "fim:"):
		return "file_integrity_change"
	default:
		return "cron_change"
	}
}

type driftDiff struct {
	key       string
	eventType string
}

// computeDriftDiffs is the pure, testable core of drift detection: given a previous
// baseline and the current snapshot, it returns one driftDiff per key that existed in
// the baseline with a different hash now. Keys with no prior baseline entry are treated
// as newly-observed (first sighting), not a change - this is what prevents an alert
// flood the first time the agent runs against a host it hasn't seen before.
func computeDriftDiffs(baseline driftBaseline, current map[string]string) []driftDiff {
	var diffs []driftDiff
	for key, hash := range current {
		if prevHash, existed := baseline[key]; existed && prevHash != hash {
			diffs = append(diffs, driftDiff{key: key, eventType: classifyDriftKey(key)})
		}
	}
	return diffs
}

// RunDriftDetection hashes a small set of security-relevant cron files/entries, system
// binaries, and File Integrity Monitoring paths, and diffs them against a locally stored
// baseline (FR-5xx "suspicious cron/binary changes", Phase 3's Configuration Drift
// Detection and File Integrity Monitoring). Linux-only: cron/binary/web-config paths
// here are Linux-specific, matching the existing Linux-only world-writable scan in
// scanner.go.
func RunDriftDetection(config *Config) {
	if runtime.GOOS != "linux" {
		return
	}

	baseline := loadBaseline()
	firstRun := len(baseline) == 0
	current := collectWatchedItems(config)
	diffs := computeDriftDiffs(baseline, current)

	for _, d := range diffs {
		event := &ThreatEvent{
			EventType:  d.eventType,
			Severity:   "HIGH",
			Detail:     fmt.Sprintf("%s changed unexpectedly since the last scan", d.key),
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
		}

		log.Printf("Threat detected: %s - %s", d.eventType, event.Detail)
		if err := SendThreatEvent(config.BackendURL, config.ServerID, config.APIKey, event); err != nil {
			log.Printf("Failed to push threat event: %v", err)
		}
	}

	for key, hash := range current {
		baseline[key] = hash
	}

	if firstRun {
		log.Printf("Drift detection: established baseline for %d watched items", len(current))
	} else if len(diffs) > 0 {
		log.Printf("Drift detection: %d change(s) detected and baseline updated", len(diffs))
	}

	saveBaseline(baseline)
}
