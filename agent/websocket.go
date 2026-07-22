package main

import (
	"encoding/json"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type CommandPayload struct {
	CommandID string                 `json:"command_id"`
	Action    string                 `json:"action"`
	Params    map[string]interface{} `json:"params"`
}

type RemediationResult struct {
	Type      string `json:"type"`
	CommandID string `json:"command_id"`
	Action    string `json:"action"`
	Status    string `json:"status"`
	Detail    string `json:"detail"`
}

func ConnectWebSocket(config *Config) {
	// Reconnection loop
	for {
		wsURLStr := strings.Replace(config.BackendURL, "http", "ws", 1) + "/v1/agent/stream?apiKey=" + url.QueryEscape(config.APIKey)
		log.Printf("Attempting to connect WebSocket to backend: %s", wsURLStr)

		c, _, err := websocket.DefaultDialer.Dial(wsURLStr, nil)
		if err != nil {
			log.Printf("WebSocket connection failed: %v. Retrying in 10s...", err)
			time.Sleep(10 * time.Second)
			continue
		}

		log.Println("WebSocket connected successfully. Listening for commands...")

		// Message reading loop
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				break // break inner loop, triggers reconnect
			}

			var cmd CommandPayload
			if err := json.Unmarshal(message, &cmd); err != nil {
				log.Printf("Failed to parse incoming command: %v", err)
				continue
			}

			// Execute the command locally
			resultStr, execErr := ExecuteRemediation(cmd.Action, cmd.Params)

			status := "success"
			if execErr != nil {
				status = "failed"
				resultStr = execErr.Error()
			}

			// Report result back via WS
			res := RemediationResult{
				Type:      "remediation_result",
				CommandID: cmd.CommandID,
				Action:    cmd.Action,
				Status:    status,
				Detail:    resultStr,
			}

			if err := c.WriteJSON(res); err != nil {
				log.Printf("Failed to send remediation result: %v", err)
			} else {
				log.Printf("Remediation result sent successfully for cmd %s", cmd.CommandID)
			}
		}

		c.Close()
		log.Println("WebSocket closed. Attempting reconnect in 5s...")
		time.Sleep(5 * time.Second)
	}
}
