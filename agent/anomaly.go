package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/process"
)

// MVP heuristic threshold - cumulative CPU% gopsutil reports since process start (or
// since the last call), not a true instantaneous reading. Good enough to flag sustained
// high-CPU processes without needing a second polling pass, but can false-positive on
// legitimate CPU-heavy workloads; that tradeoff is why it's paired with a name-match
// signal rather than used alone as the only criterion for severity.
const minerCPUThreshold = 80.0

var knownMinerNames = []string{
	"xmrig", "minerd", "cpuminer", "ethminer", "cgminer", "bfgminer", "nheqminer", "ccminer",
}

// ScanForCryptoMiners lists running processes (cross-platform via gopsutil) and reports
// anything matching a known miner binary name, or any unrecognized process consuming
// sustained high CPU, as a crypto_miner ThreatEvent (FR-5xx).
func ScanForCryptoMiners(config *Config) {
	procs, err := process.Processes()
	if err != nil {
		log.Printf("Crypto-miner scan: failed to list processes: %v", err)
		return
	}

	for _, p := range procs {
		name, err := p.Name()
		if err != nil || name == "" {
			continue
		}
		lowerName := strings.ToLower(name)

		matchedKnownName := ""
		for _, known := range knownMinerNames {
			if strings.Contains(lowerName, known) {
				matchedKnownName = known
				break
			}
		}

		cpuPercent, cpuErr := p.CPUPercent()
		if cpuErr != nil {
			cpuPercent = 0
		}

		isSuspicious := matchedKnownName != "" || cpuPercent >= minerCPUThreshold
		if !isSuspicious {
			continue
		}

		reason := fmt.Sprintf("sustained high CPU usage (%.1f%%) from an unrecognized process", cpuPercent)
		if matchedKnownName != "" {
			reason = fmt.Sprintf("process name matches known crypto-miner binary '%s'", matchedKnownName)
		}

		event := &ThreatEvent{
			EventType:  "crypto_miner",
			Severity:   "CRITICAL",
			Detail:     fmt.Sprintf("Suspicious process '%s' (PID %d): %s", name, p.Pid, reason),
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
		}

		log.Printf("Threat detected: crypto_miner - %s", event.Detail)
		if err := SendThreatEvent(config.BackendURL, config.ServerID, config.APIKey, event); err != nil {
			log.Printf("Failed to push threat event: %v", err)
		}
	}
}
