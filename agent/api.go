package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type RegisterRequest struct {
	InstallToken  string `json:"install_token"`
	Hostname      string `json:"hostname"`
	OS            string `json:"os"`
	OSVersion     string `json:"os_version"`
	KernelVersion string `json:"kernel_version"`
}

type SecurityFinding struct {
	RuleID             string `json:"rule_id"`
	Category           string `json:"category"`
	Severity           string `json:"severity"`
	Passed             bool   `json:"passed"`
	AutoFixable        bool   `json:"auto_fixable"`
	BusinessImpactText string `json:"business_impact_text"`
	RecommendedAction  string `json:"recommended_action"`
	Detail             string `json:"detail"`
}

type ThreatEvent struct {
	EventType  string `json:"event_type"`
	Severity   string `json:"severity"`
	SourceIP   string `json:"source_ip"`
	Detail     string `json:"detail"`
	OccurredAt string `json:"occurred_at"` // ISO8601 string
}

type ApplicationService struct {
	Name         string    `json:"name"`
	Status       string    `json:"status"` // "running", "stopped", "failed", "unknown"
	PID          int       `json:"pid,omitempty"`
	CPU          float64   `json:"cpu,omitempty"`
	Memory       float64   `json:"memory,omitempty"`
	RestartCount int       `json:"restart_count,omitempty"`
	Command      string    `json:"command,omitempty"`
	StartTime    time.Time `json:"start_time,omitempty"`
	Metadata     string    `json:"metadata,omitempty"` // JSON config
}

type RegisterResponse struct {
	ServerID string `json:"server_id"`
	APIKey   string `json:"api_key"`
	TenantID string `json:"tenant_id"`
}

func RegisterAgent(backendURL, installToken string, info *SystemInfo) (*RegisterResponse, error) {
	reqBody := RegisterRequest{
		InstallToken:  installToken,
		Hostname:      info.Hostname,
		OS:            info.OS,
		OSVersion:     info.OSVersion,
		KernelVersion: info.KernelVersion,
	}

	data, _ := json.Marshal(reqBody)
	resp, err := makeHTTPRequest("POST", backendURL+"/v1/agent/register", "", data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("registration failed [%d]: %s", resp.StatusCode, string(body))
	}

	var regResp RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&regResp); err != nil {
		return nil, err
	}

	return &regResp, nil
}

func SendTelemetry(backendURL, serverID, apiKey string, metrics *MetricsPayload) error {
	data, _ := json.Marshal(metrics)
	url := fmt.Sprintf("%s/v1/agent/%s/telemetry", backendURL, serverID)

	resp, err := makeHTTPRequest("POST", url, apiKey, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 202 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telemetry push failed [%d]: %s", resp.StatusCode, string(body))
	}

	return nil
}

func SendSecurityScan(backendURL, serverID, apiKey string, findings []SecurityFinding) error {
	payload := map[string]interface{}{
		"findings": findings,
	}
	data, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/v1/agent/%s/findings", backendURL, serverID)

	resp, err := makeHTTPRequest("POST", url, apiKey, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 202 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("findings push failed [%d]: %s", resp.StatusCode, string(body))
	}

	return nil
}

func SendThreatEvent(backendURL, serverID, apiKey string, event *ThreatEvent) error {
	data, _ := json.Marshal(event)
	url := fmt.Sprintf("%s/v1/agent/%s/events", backendURL, serverID)

	resp, err := makeHTTPRequest("POST", url, apiKey, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 202 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("threat event push failed [%d]: %s", resp.StatusCode, string(body))
	}

	return nil
}

func SendApplicationServices(backendURL, serverID, apiKey string, services []ApplicationService) error {
	payload := map[string]interface{}{
		"services": services,
	}
	data, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/v1/agent/%s/applications", backendURL, serverID)

	resp, err := makeHTTPRequest("POST", url, apiKey, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 202 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("application services push failed [%d]: %s", resp.StatusCode, string(body))
	}

	return nil
}

func makeHTTPRequest(method, url, apiKey string, body []byte) (*http.Response, error) {
	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
		},
	}
	return client.Do(req)
}
