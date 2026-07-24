package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
)

type remoteConfigResponse struct {
	FIMWatchPaths []string `json:"fim_watch_paths"`
}

// fetchRemoteConfig polls the backend for dashboard-set configuration. Currently this is
// just FIM watch paths - the first real implementation of the "config channel"
// AGENT_SPEC.md has always described (dashboard -> backend -> agent), which previously
// existed only as documentation with no code behind it.
func fetchRemoteConfig(backendURL, serverID, apiKey string) (*remoteConfigResponse, error) {
	url := fmt.Sprintf("%s/v1/agent/%s/config", backendURL, serverID)
	resp, err := makeHTTPRequest("GET", url, apiKey, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("config fetch failed [%d]: %s", resp.StatusCode, string(body))
	}

	var result remoteConfigResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// mergeRemoteFIMPaths is the pure, testable core: given what's currently configured and
// what the dashboard now says, decides what should be persisted and whether anything
// actually changed - separated from the network fetch and file-save side effects so it
// can be unit tested without a running backend.
func mergeRemoteFIMPaths(current []string, remote []string) (merged []string, changed bool) {
	if stringSlicesEqual(current, remote) {
		return current, false
	}
	return remote, true
}

// SyncRemoteConfig fetches the dashboard-set configuration and, if it differs from
// what's currently persisted locally, updates and saves it - so a change made in the
// dashboard's Configuration tab reaches the agent within one scan-ticker cycle, without
// requiring a hand-edited local config file.
func SyncRemoteConfig(config *Config, configPath string) {
	remote, err := fetchRemoteConfig(config.BackendURL, config.ServerID, config.APIKey)
	if err != nil {
		log.Printf("Config sync: failed to fetch remote config: %v", err)
		return
	}

	merged, changed := mergeRemoteFIMPaths(config.FIMWatchPaths, remote.FIMWatchPaths)
	if !changed {
		return
	}

	config.FIMWatchPaths = merged
	if err := SaveConfig(configPath, config); err != nil {
		log.Printf("Config sync: failed to save updated config: %v", err)
		return
	}
	log.Printf("Config sync: updated FIM watch paths from dashboard (%d paths)", len(merged))
}
