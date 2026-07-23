package main

import "testing"

func TestClassifyDriftKey(t *testing.T) {
	cases := map[string]string{
		"binary:/usr/bin/sudo":      "binary_change",
		"fim:/etc/nginx/nginx.conf": "file_integrity_change",
		"file:/etc/crontab":         "cron_change",
		"file:/etc/cron.d/backup":   "cron_change",
		"crontab:root":              "cron_change",
	}
	for key, want := range cases {
		if got := classifyDriftKey(key); got != want {
			t.Errorf("classifyDriftKey(%q) = %q, want %q", key, got, want)
		}
	}
}

func TestComputeDriftDiffsDetectsChangedBinary(t *testing.T) {
	baseline := driftBaseline{"binary:/usr/bin/sudo": "hash-old"}
	current := map[string]string{"binary:/usr/bin/sudo": "hash-new"}

	diffs := computeDriftDiffs(baseline, current)
	if len(diffs) != 1 {
		t.Fatalf("expected 1 diff, got %d: %+v", len(diffs), diffs)
	}
	if diffs[0].key != "binary:/usr/bin/sudo" || diffs[0].eventType != "binary_change" {
		t.Errorf("unexpected diff: %+v", diffs[0])
	}
}

func TestComputeDriftDiffsDetectsChangedFimPath(t *testing.T) {
	baseline := driftBaseline{"fim:/etc/nginx/nginx.conf": "hash-old"}
	current := map[string]string{"fim:/etc/nginx/nginx.conf": "hash-new"}

	diffs := computeDriftDiffs(baseline, current)
	if len(diffs) != 1 || diffs[0].eventType != "file_integrity_change" {
		t.Fatalf("expected 1 file_integrity_change diff, got %+v", diffs)
	}
}

func TestComputeDriftDiffsIgnoresUnchangedItems(t *testing.T) {
	baseline := driftBaseline{"binary:/usr/bin/sudo": "hash-same"}
	current := map[string]string{"binary:/usr/bin/sudo": "hash-same"}

	diffs := computeDriftDiffs(baseline, current)
	if len(diffs) != 0 {
		t.Fatalf("expected no diffs for an unchanged item, got %+v", diffs)
	}
}

func TestComputeDriftDiffsIgnoresFirstSighting(t *testing.T) {
	// A key with no prior baseline entry is a first sighting, not a "change" -
	// this is what prevents an alert flood the first time the agent runs.
	baseline := driftBaseline{}
	current := map[string]string{"binary:/usr/bin/sudo": "hash-new"}

	diffs := computeDriftDiffs(baseline, current)
	if len(diffs) != 0 {
		t.Fatalf("expected no diffs for a first-sighting item, got %+v", diffs)
	}
}

func TestFimPathsToWatchUsesConfigOverride(t *testing.T) {
	config := &Config{FIMWatchPaths: []string{"/custom/path.conf"}}
	paths := fimPathsToWatch(config)
	if len(paths) != 1 || paths[0] != "/custom/path.conf" {
		t.Fatalf("expected config override to be used, got %+v", paths)
	}
}

func TestFimPathsToWatchFallsBackToDefaults(t *testing.T) {
	config := &Config{}
	paths := fimPathsToWatch(config)
	if len(paths) != len(defaultFimWatchPaths) {
		t.Fatalf("expected default FIM paths when config is unset, got %+v", paths)
	}
}
