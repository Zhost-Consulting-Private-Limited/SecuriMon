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

// collectWatchedItems returns a map of watched-item key -> current content hash, for
// every item that currently exists/is readable. Missing items are simply omitted rather
// than treated as an error, since e.g. /etc/cron.d may legitimately not exist.
func collectWatchedItems() map[string]string {
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

	return items
}

// RunDriftDetection hashes a small set of security-relevant cron files/entries and
// system binaries and diffs them against a locally stored baseline (FR-5xx "suspicious
// cron/binary changes", overlapping Phase 3's Configuration Drift Detection). Linux-only:
// cron paths and binary locations here are Linux-specific, matching the existing
// Linux-only world-writable scan in scanner.go.
func RunDriftDetection(config *Config) {
	if runtime.GOOS != "linux" {
		return
	}

	baseline := loadBaseline()
	firstRun := len(baseline) == 0
	current := collectWatchedItems()
	changedCount := 0

	for key, hash := range current {
		prevHash, existed := baseline[key]
		if existed && prevHash != hash {
			eventType := "binary_change"
			if !strings.HasPrefix(key, "binary:") {
				eventType = "cron_change"
			}

			event := &ThreatEvent{
				EventType:  eventType,
				Severity:   "HIGH",
				Detail:     fmt.Sprintf("%s changed unexpectedly since the last scan", key),
				OccurredAt: time.Now().UTC().Format(time.RFC3339),
			}

			log.Printf("Threat detected: %s - %s", eventType, event.Detail)
			if err := SendThreatEvent(config.BackendURL, config.ServerID, config.APIKey, event); err != nil {
				log.Printf("Failed to push threat event: %v", err)
			}
			changedCount++
		}
		baseline[key] = hash
	}

	if firstRun {
		log.Printf("Drift detection: established baseline for %d watched items", len(current))
	} else if changedCount > 0 {
		log.Printf("Drift detection: %d change(s) detected and baseline updated", changedCount)
	}

	saveBaseline(baseline)
}
