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
	fmt.Println("SecuriMon Agent starting...")

	// Load configuration
	configPath := "/etc/securimon/agent.conf"

	// On Windows, use a different default path
	if os.Getenv("OS") == "Windows_NT" {
		configPath = os.Getenv("ProgramData") + "\\SecuriMon\\agent.conf"
	}

	config, err := LoadConfig(configPath)
	if err != nil {
		log.Printf("Warning: Failed to load config from %s: %v", configPath, err)
		log.Printf("The agent will continue running but needs configuration to communicate with the backend.")
	} else {
		log.Printf("Loaded config for Tenant ID: %s, Server ID: %s", config.TenantID, config.ServerID)
	}

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Main execution loop (Heartbeat / Telemetry simulation)
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	log.Println("Agent initialized and entering main loop...")

	for {
		select {
		case <-ticker.C:
			log.Println("Agent heartbeat: collecting telemetry...")
			if config != nil {
				// TODO: Implement actual telemetry collection (CPU, RAM, Disk) and push to BackendURL
			}
		case sig := <-sigChan:
			log.Printf("Received signal: %v. Shutting down gracefully...", sig)
			// TODO: Clean up resources, flush buffers
			return
		}
	}
}
