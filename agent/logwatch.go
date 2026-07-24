package main

import (
	"log"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/nxadm/tail"
)

const logMessageMaxLen = 500

// classifyLogLine returns "ERROR", "WARNING", or "" (not worth reporting) for a raw log
// line. Skipping the "" case keeps generic log tailing from flooding the timeline with
// routine INFO-level chatter - only lines worth a human's attention get pushed.
func classifyLogLine(line string) string {
	lower := strings.ToLower(line)
	switch {
	case strings.Contains(lower, "error") || strings.Contains(lower, "critical") || strings.Contains(lower, "fail"):
		return "ERROR"
	case strings.Contains(lower, "warn"):
		return "WARNING"
	default:
		return ""
	}
}

// expandLogSources glob-expands each configured pattern (e.g. "/var/log/nginx/*.log")
// into concrete file paths, dedupes, and sorts for deterministic ordering. A pattern with
// no wildcard matches is treated as a literal path (so a plain "/var/log/auth.log" still
// works even before the file exists or if it never matches its own glob).
func expandLogSources(patterns []string) []string {
	seen := make(map[string]bool)
	var expanded []string

	for _, pattern := range patterns {
		matches, err := filepath.Glob(pattern)
		if err != nil || len(matches) == 0 {
			matches = []string{pattern}
		}
		for _, m := range matches {
			if !seen[m] {
				seen[m] = true
				expanded = append(expanded, m)
			}
		}
	}

	sort.Strings(expanded)
	return expanded
}

func truncateLogMessage(msg string) string {
	if len(msg) <= logMessageMaxLen {
		return msg
	}
	return msg[:logMessageMaxLen]
}

var (
	watchedLogPaths   = make(map[string]bool)
	watchedLogPathsMu sync.Mutex
)

// StartLogWatchers tails every configured log source, reporting classified ERROR/WARNING
// lines back to the backend as TimelineEvents (via SendLogEvent). Called once at startup
// and again every time the scan ticker fires, so a log source added from the dashboard
// starts being tailed within about an hour without an agent restart.
//
// Known limitation, stated rather than silently dropped: removing a source from the
// dashboard does not stop an already-running tailer until the agent restarts - this
// handles the (much more common) case of adding sources live, not live teardown.
func StartLogWatchers(config *Config) {
	for _, path := range expandLogSources(config.LogSources) {
		watchedLogPathsMu.Lock()
		alreadyWatched := watchedLogPaths[path]
		watchedLogPaths[path] = true
		watchedLogPathsMu.Unlock()

		if alreadyWatched {
			continue
		}

		go watchLogFile(config, path)
	}
}

func watchLogFile(config *Config, path string) {
	t, err := tail.TailFile(path, tail.Config{
		Follow:   true,
		ReOpen:   true,
		Poll:     true,                                 // Reliable across different OSs/filesystems
		Location: &tail.SeekInfo{Offset: 0, Whence: 2}, // Start at end of file
	})
	if err != nil {
		log.Printf("Log watch: cannot tail %s: %v", path, err)
		return
	}

	log.Printf("Log watch: started tailing %s", path)

	for line := range t.Lines {
		level := classifyLogLine(line.Text)
		if level == "" {
			continue
		}

		event := &LogEvent{
			Source:  path,
			Level:   level,
			Message: truncateLogMessage(line.Text),
		}
		if err := SendLogEvent(config.BackendURL, config.ServerID, config.APIKey, event); err != nil {
			log.Printf("Log watch: failed to push log event from %s: %v", path, err)
		}
	}
}
