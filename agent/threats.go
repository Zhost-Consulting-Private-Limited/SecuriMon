package main

import (
	"log"
	"regexp"
	"runtime"
	"time"

	"github.com/nxadm/tail"
)

func StartThreatDetection(config *Config) {
	if runtime.GOOS != "linux" {
		log.Println("Threat detection: Tailing auth.log is only supported on Linux. Skipping.")
		return
	}

	logFile := "/var/log/auth.log"
	t, err := tail.TailFile(logFile, tail.Config{
		Follow:   true,
		ReOpen:   true,
		Poll:     true,                                 // Reliable across different OSs/filesystems
		Location: &tail.SeekInfo{Offset: 0, Whence: 2}, // Start at end of file
	})

	if err != nil {
		log.Printf("Warning: Cannot tail %s for threat detection: %v", logFile, err)
		return
	}

	log.Printf("Started threat detection. Tailing %s", logFile)

	// Simple regex to catch standard OpenSSH failed passwords
	failedLoginRegex := regexp.MustCompile(`Failed password for .* from ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)`)

	for line := range t.Lines {
		if match := failedLoginRegex.FindStringSubmatch(line.Text); match != nil {
			ip := match[1]

			event := &ThreatEvent{
				EventType:  "ssh_bruteforce",
				Severity:   "HIGH",
				SourceIP:   ip,
				Detail:     "Failed SSH login attempt detected from " + ip,
				OccurredAt: time.Now().UTC().Format(time.RFC3339),
			}

			log.Printf("Threat detected: %s from IP %s", event.EventType, ip)

			err := SendThreatEvent(config.BackendURL, config.ServerID, config.APIKey, event)
			if err != nil {
				log.Printf("Failed to push threat event: %v", err)
			}
		}
	}
}
