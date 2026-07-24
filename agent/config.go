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
	// FIMWatchPaths, if set, overrides the default File Integrity Monitoring watch
	// list (see drift.go). Left empty by default - the agent falls back to common
	// web-server config paths that actually exist on the host.
	FIMWatchPaths []string `json:"fim_watch_paths,omitempty"`
	// LogSources, if set, is a list of file paths/globs (e.g. "/var/log/nginx/*.log")
	// the agent tails for generic ERROR/WARNING lines (see logwatch.go). Dashboard-set,
	// delivered via the same config channel as FIMWatchPaths.
	LogSources []string `json:"log_sources,omitempty"`
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
