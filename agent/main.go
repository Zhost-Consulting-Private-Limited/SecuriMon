package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	fmt.Println("Vigilon Agent starting...")

	// Load configuration
	configPath := "/etc/vigilon/agent.conf"

	// On Windows, use a different default path
	if os.Getenv("OS") == "Windows_NT" {
		configPath = os.Getenv("ProgramData") + "\\Vigilon\\agent.conf"
	}

	config, err := LoadConfig(configPath)
	if err != nil || config.APIKey == "placeholder_key" {
		log.Printf("Valid config not found at %s. Attempting to register via INSTALL_TOKEN...", configPath)

		installToken := os.Getenv("INSTALL_TOKEN")
		if installToken == "" {
			log.Fatalf("Fatal: No INSTALL_TOKEN provided in environment, and valid config missing.")
		}

		backendURL := os.Getenv("BACKEND_URL")
		if backendURL == "" {
			backendURL = "http://localhost:4000" // Default for local dev
		}

		sysInfo, err := GetSystemInfo()
		if err != nil {
			log.Fatalf("Failed to retrieve system info: %v", err)
		}

		regResp, err := RegisterAgent(backendURL, installToken, sysInfo)
		if err != nil {
			log.Fatalf("Fatal: Agent registration failed: %v", err)
		}

		// Save new config
		config = &Config{
			TenantID:   regResp.TenantID,
			ServerID:   regResp.ServerID,
			APIKey:     regResp.APIKey,
			BackendURL: backendURL,
		}
		if err := SaveConfig(configPath, config); err != nil {
			log.Printf("Warning: Failed to save config to disk: %v", err)
		}
		log.Println("Agent registered successfully!")
	} else {
		log.Printf("Loaded config for Tenant ID: %s, Server ID: %s", config.TenantID, config.ServerID)
	}

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start Threat Detection loop in a background goroutine
	go StartThreatDetection(config)

	// Start WebSocket listener in a background goroutine
	go ConnectWebSocket(config)

	// Main execution loop (Heartbeat / Telemetry)
	ticker := time.NewTicker(60 * time.Second)
	scanTicker := time.NewTicker(1 * time.Hour)  // Run security scan hourly
	appTicker := time.NewTicker(5 * time.Minute) // Refresh application inventory
	defer ticker.Stop()
	defer scanTicker.Stop()
	defer appTicker.Stop()

	log.Println("Agent initialized and entering main loop...")

	// Sync dashboard-set config (e.g. FIM watch paths) synchronously before anything
	// reads config.FIMWatchPaths from another goroutine, to avoid a data race on the
	// shared *Config - see SyncRemoteConfig in remoteconfig.go.
	SyncRemoteConfig(config, configPath)

	// Run initial security scan, application discovery, and drift baseline
	go runAndPushScan(config)
	go runAndPushApplications(config)
	go RunDriftDetection(config)

	for {
		select {
		case <-ticker.C:
			log.Println("Agent heartbeat: collecting telemetry...")
			metrics, err := CollectMetrics()
			if err != nil {
				log.Printf("Error collecting metrics: %v", err)
				continue
			}

			err = SendTelemetry(config.BackendURL, config.ServerID, config.APIKey, metrics)
			if err != nil {
				log.Printf("Failed to push telemetry: %v", err)
			} else {
				log.Println("Telemetry pushed successfully.")
			}

			go ScanForCryptoMiners(config)
		case <-scanTicker.C:
			SyncRemoteConfig(config, configPath) // synchronous - see comment above
			go runAndPushScan(config)
			go RunDriftDetection(config)
		case <-appTicker.C:
			go runAndPushApplications(config)
		case sig := <-sigChan:
			log.Printf("Received signal: %v. Shutting down gracefully...", sig)
			// TODO: Clean up resources, flush buffers
			return
		}
	}
}

func runAndPushApplications(config *Config) {
	services := DiscoverApplications()
	if len(services) == 0 {
		return
	}
	if err := SendApplicationServices(config.BackendURL, config.ServerID, config.APIKey, services); err != nil {
		log.Printf("Failed to push application inventory: %v", err)
	} else {
		log.Printf("Pushed %d running services successfully.", len(services))
	}
}

func runAndPushScan(config *Config) {
	log.Println("Running scheduled security scan...")
	findings := RunSecurityScan()
	err := SendSecurityScan(config.BackendURL, config.ServerID, config.APIKey, findings)
	if err != nil {
		log.Printf("Failed to push security findings: %v", err)
	} else {
		log.Printf("Pushed %d security findings successfully.", len(findings))
	}
}
