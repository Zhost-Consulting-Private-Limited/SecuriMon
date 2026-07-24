package main

import (
	"fmt"
	"log"
	"net"
	"time"

	gopsnet "github.com/shirou/gopsutil/v3/net"
)

const (
	portScanWindow        = 5 * time.Minute
	portScanDistinctPorts = 5
	portScanCooldown      = 15 * time.Minute
)

type portTouch struct {
	port uint32
	seen time.Time
}

// portScanTracker holds the rolling per-remote-IP port-touch history and last-alert
// times. Not safe for concurrent use - only ScanForPortScans (called from the same
// ticker case as the crypto-miner scan) touches it, matching that scan's existing
// concurrency profile rather than adding a mutex for a single caller.
type portScanTracker struct {
	touches   map[string][]portTouch // remote IP -> touches within the window
	lastAlert map[string]time.Time
}

func newPortScanTracker() *portScanTracker {
	return &portScanTracker{
		touches:   map[string][]portTouch{},
		lastAlert: map[string]time.Time{},
	}
}

// recordAndCheck is the pure, testable core of port scan detection: given the set of
// (remote IP -> local ports observed) "now", it prunes touches older than
// portScanWindow, records the new ones, and returns the remote IPs that have just
// crossed portScanDistinctPorts distinct ports and aren't within their cooldown - i.e.
// should be reported as a port_scan ThreatEvent this tick. Also prunes tracker entries
// for IPs with no touches left in the window, so memory doesn't grow unboundedly from
// one-off connections.
func (t *portScanTracker) recordAndCheck(now time.Time, observed map[string][]uint32) []string {
	cutoff := now.Add(-portScanWindow)
	var triggered []string

	for ip, ports := range observed {
		kept := t.touches[ip][:0]
		for _, touch := range t.touches[ip] {
			if touch.seen.After(cutoff) {
				kept = append(kept, touch)
			}
		}
		for _, port := range ports {
			kept = append(kept, portTouch{port: port, seen: now})
		}
		t.touches[ip] = kept

		distinctPorts := map[uint32]bool{}
		for _, touch := range kept {
			distinctPorts[touch.port] = true
		}
		if len(distinctPorts) < portScanDistinctPorts {
			continue
		}

		if lastAlert, alerted := t.lastAlert[ip]; alerted && now.Sub(lastAlert) < portScanCooldown {
			continue
		}

		t.lastAlert[ip] = now
		triggered = append(triggered, ip)
	}

	for ip, touches := range t.touches {
		if _, stillObserved := observed[ip]; stillObserved {
			continue
		}
		allStale := true
		for _, touch := range touches {
			if touch.seen.After(cutoff) {
				allStale = false
				break
			}
		}
		if allStale {
			delete(t.touches, ip)
			delete(t.lastAlert, ip)
		}
	}

	return triggered
}

// filterScannableTouches is the pure, testable core of connection filtering: given a
// snapshot of TCP connections, it returns remote IP -> local ports touched, counting
// ONLY established connections where the local port is one this host is actually
// LISTENING on (i.e. a real service being probed), and excluding loopback peers.
//
// This matters because a connection's local port is meaningless for scan detection in
// the outbound-client case: every outbound connection this host makes (e.g. to an API
// it calls) gets a fresh, effectively random ephemeral local port, which would otherwise
// look identical to "many distinct ports touched" and produce constant false positives
// on ordinary outbound traffic - confirmed by an early version of this function actually
// doing that against this host's own outbound connections during testing.
func filterScannableTouches(conns []gopsnet.ConnectionStat) map[string][]uint32 {
	listeningPorts := map[uint32]bool{}
	for _, c := range conns {
		if c.Status == "LISTEN" {
			listeningPorts[c.Laddr.Port] = true
		}
	}

	observed := map[string][]uint32{}
	for _, c := range conns {
		if c.Status != "ESTABLISHED" {
			continue
		}
		if !listeningPorts[c.Laddr.Port] {
			continue // this host's side of an outbound client connection, not a scanned service
		}
		if isLoopback(c.Raddr.IP) {
			continue
		}
		observed[c.Raddr.IP] = append(observed[c.Raddr.IP], c.Laddr.Port)
	}
	return observed
}

func isLoopback(ip string) bool {
	parsed := net.ParseIP(ip)
	return parsed != nil && parsed.IsLoopback()
}

var globalPortScanTracker = newPortScanTracker()

// ScanForPortScans polls current TCP connections and flags any remote IP that has
// connected to portScanDistinctPorts or more of this host's actual listening services
// within portScanWindow (FR-5xx port scan detection - the last piece of Phase 1 MVP's
// original Threat Detection promise that hadn't been built).
//
// Honest scope: this sees only currently-established sockets (via gopsutil, cross-
// platform), not raw SYN/RST packets, and only counts ports this host is confirmed to
// be listening on (see filterScannableTouches). It catches "connect scans" against real
// running services - anything that completes the TCP handshake, like a basic
// `nmap -sT` - but misses stealth SYN scans and probes against closed/non-listening
// ports, which never become a visible connection at all. Same class of tradeoff as the
// crypto-miner CPU-threshold heuristic in anomaly.go.
func ScanForPortScans(config *Config) {
	conns, err := gopsnet.Connections("tcp")
	if err != nil {
		log.Printf("Port scan detection: failed to list connections: %v", err)
		return
	}

	observed := filterScannableTouches(conns)

	for _, ip := range globalPortScanTracker.recordAndCheck(time.Now(), observed) {
		event := &ThreatEvent{
			EventType:  "port_scan",
			Severity:   "HIGH",
			SourceIP:   ip,
			Detail:     fmt.Sprintf("%s connected to %d+ distinct local ports within %s", ip, portScanDistinctPorts, portScanWindow),
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
		}

		log.Printf("Threat detected: port_scan - %s", event.Detail)
		if err := SendThreatEvent(config.BackendURL, config.ServerID, config.APIKey, event); err != nil {
			log.Printf("Failed to push threat event: %v", err)
		}
	}
}
