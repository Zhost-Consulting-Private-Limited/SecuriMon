package main

import (
	"testing"
	"time"
)

func TestTelemetryIntervalDefaultsWhenUnset(t *testing.T) {
	got := telemetryInterval(&Config{})
	if got != defaultTelemetryInterval {
		t.Errorf("expected default %v, got %v", defaultTelemetryInterval, got)
	}
}

func TestTelemetryIntervalUsesDashboardValue(t *testing.T) {
	got := telemetryInterval(&Config{MetricsIntervalSeconds: 30})
	if got != 30*time.Second {
		t.Errorf("expected 30s, got %v", got)
	}
}

func TestTelemetryIntervalClampsBelowMinimum(t *testing.T) {
	got := telemetryInterval(&Config{MetricsIntervalSeconds: 1})
	if got != minTelemetryInterval {
		t.Errorf("expected clamp to minimum %v, got %v", minTelemetryInterval, got)
	}
}

func TestTelemetryIntervalIgnoresNegativeValue(t *testing.T) {
	got := telemetryInterval(&Config{MetricsIntervalSeconds: -5})
	if got != defaultTelemetryInterval {
		t.Errorf("expected default for negative value, got %v", got)
	}
}

func TestScanIntervalDefaultsToHourly(t *testing.T) {
	got := scanInterval(&Config{})
	if got != defaultScanInterval {
		t.Errorf("expected default hourly %v, got %v", defaultScanInterval, got)
	}
}

func TestScanIntervalDaily(t *testing.T) {
	got := scanInterval(&Config{ScanSchedule: "daily"})
	if got != dailyScanInterval {
		t.Errorf("expected daily %v, got %v", dailyScanInterval, got)
	}
}

func TestScanIntervalFallsBackToHourlyForUnrecognizedValue(t *testing.T) {
	got := scanInterval(&Config{ScanSchedule: "weekly"})
	if got != defaultScanInterval {
		t.Errorf("expected fallback to hourly for unrecognized value, got %v", got)
	}
}
