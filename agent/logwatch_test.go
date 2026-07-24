package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestClassifyLogLineDetectsError(t *testing.T) {
	cases := []string{
		"2026-07-24 ERROR failed to connect to database",
		"CRITICAL: disk full on /var",
		"upstream request FAILED after 3 retries",
	}
	for _, line := range cases {
		if got := classifyLogLine(line); got != "ERROR" {
			t.Errorf("classifyLogLine(%q) = %q, want ERROR", line, got)
		}
	}
}

func TestClassifyLogLineDetectsWarning(t *testing.T) {
	if got := classifyLogLine("WARN: connection pool nearing capacity"); got != "WARNING" {
		t.Errorf("classifyLogLine(warn line) = %q, want WARNING", got)
	}
}

func TestClassifyLogLineIgnoresRoutineLines(t *testing.T) {
	cases := []string{
		"GET /health 200 OK 12ms",
		"INFO: worker started",
		"",
	}
	for _, line := range cases {
		if got := classifyLogLine(line); got != "" {
			t.Errorf("classifyLogLine(%q) = %q, want \"\" (not worth reporting)", line, got)
		}
	}
}

func TestTruncateLogMessageLeavesShortMessagesAlone(t *testing.T) {
	msg := "ERROR: short message"
	if got := truncateLogMessage(msg); got != msg {
		t.Errorf("expected short message unchanged, got %q", got)
	}
}

func TestTruncateLogMessageCapsLongMessages(t *testing.T) {
	long := make([]byte, logMessageMaxLen+200)
	for i := range long {
		long[i] = 'x'
	}
	got := truncateLogMessage(string(long))
	if len(got) != logMessageMaxLen {
		t.Errorf("expected truncated message to be exactly %d chars, got %d", logMessageMaxLen, len(got))
	}
}

func TestExpandLogSourcesExpandsGlobsAndDedupes(t *testing.T) {
	dir := t.TempDir()
	files := []string{"a.log", "b.log"}
	for _, f := range files {
		if err := os.WriteFile(filepath.Join(dir, f), []byte("x"), 0644); err != nil {
			t.Fatalf("failed to write fixture file: %v", err)
		}
	}

	patterns := []string{
		filepath.Join(dir, "*.log"),
		filepath.Join(dir, "a.log"), // duplicate of a glob match - should be deduped
	}

	got := expandLogSources(patterns)
	want := []string{filepath.Join(dir, "a.log"), filepath.Join(dir, "b.log")}

	if !reflect.DeepEqual(got, want) {
		t.Errorf("expandLogSources() = %+v, want %+v", got, want)
	}
}

func TestExpandLogSourcesTreatsNonMatchingPatternAsLiteralPath(t *testing.T) {
	// A path that doesn't exist yet (e.g. a log file not yet created) should still be
	// returned as a literal candidate, not silently dropped - the tailer will pick it up
	// once the file appears (tail.Config's ReOpen/Poll handles that).
	nonExistent := filepath.Join(t.TempDir(), "not-yet-created.log")

	got := expandLogSources([]string{nonExistent})
	want := []string{nonExistent}

	if !reflect.DeepEqual(got, want) {
		t.Errorf("expandLogSources() = %+v, want %+v", got, want)
	}
}

func TestExpandLogSourcesDedupesAcrossMultiplePatterns(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, "app.log")
	if err := os.WriteFile(logPath, []byte("x"), 0644); err != nil {
		t.Fatalf("failed to write fixture file: %v", err)
	}

	got := expandLogSources([]string{logPath, logPath})
	if len(got) != 1 {
		t.Errorf("expected duplicate literal paths to be deduped, got %+v", got)
	}
}
