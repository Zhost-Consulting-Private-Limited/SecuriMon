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
