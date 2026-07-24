package main

import "time"

const (
	defaultTelemetryInterval = 60 * time.Second
	minTelemetryInterval     = 10 * time.Second
	defaultScanInterval      = 1 * time.Hour
	dailyScanInterval        = 24 * time.Hour
)

// telemetryInterval decides how often the agent should push telemetry, based on the
// dashboard-set MetricsIntervalSeconds. Clamped to a sane minimum so a misconfigured
// dashboard value can't hammer the backend; defaults to 60s when unset.
func telemetryInterval(config *Config) time.Duration {
	if config.MetricsIntervalSeconds <= 0 {
		return defaultTelemetryInterval
	}
	interval := time.Duration(config.MetricsIntervalSeconds) * time.Second
	if interval < minTelemetryInterval {
		return minTelemetryInterval
	}
	return interval
}

// scanInterval decides how often the agent should run its security scan, based on the
// dashboard-set ScanSchedule. An empty or unrecognized value falls back to hourly (the
// pre-existing default) rather than erroring, since a bad dashboard value shouldn't break
// the agent's core scan loop.
func scanInterval(config *Config) time.Duration {
	switch config.ScanSchedule {
	case "daily":
		return dailyScanInterval
	default:
		return defaultScanInterval
	}
}
