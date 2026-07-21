package main

import (
	"encoding/json"
	"os"
)

// Config represents the agent configuration loaded from the local filesystem
type Config struct {
	TenantID   string `json:"tenant_id"`
	ServerID   string `json:"server_id"`
	APIKey     string `json:"api_key"`
	BackendURL string `json:"backend_url"`
}

// LoadConfig reads and parses the JSON configuration file
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// SaveConfig writes the configuration back to the local filesystem
func SaveConfig(path string, cfg *Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0600)
}
