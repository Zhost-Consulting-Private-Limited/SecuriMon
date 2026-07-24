package main

import (
	"testing"
	"time"

	gopsnet "github.com/shirou/gopsutil/v3/net"
)

// fixedTime returns a deterministic point in time, offsetBySeconds after an arbitrary
// fixed base, so tests can express "1 minute later" etc. without depending on the
// wall clock.
func fixedTime(offsetBySeconds int64) time.Time {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return base.Add(time.Duration(offsetBySeconds) * time.Second)
}

func TestRecordAndCheckTriggersAtThreshold(t *testing.T) {
	tracker := newPortScanTracker()
	now := fixedTime(0)

	ports := make([]uint32, portScanDistinctPorts)
	for i := range ports {
		ports[i] = uint32(1000 + i)
	}

	triggered := tracker.recordAndCheck(now, map[string][]uint32{"198.51.100.23": ports})
	if len(triggered) != 1 || triggered[0] != "198.51.100.23" {
		t.Fatalf("expected 198.51.100.23 to trigger at exactly the threshold, got %+v", triggered)
	}
}

func TestRecordAndCheckDoesNotTriggerBelowThreshold(t *testing.T) {
	tracker := newPortScanTracker()
	now := fixedTime(0)

	ports := make([]uint32, portScanDistinctPorts-1)
	for i := range ports {
		ports[i] = uint32(1000 + i)
	}

	triggered := tracker.recordAndCheck(now, map[string][]uint32{"198.51.100.23": ports})
	if len(triggered) != 0 {
		t.Fatalf("expected no trigger below the threshold, got %+v", triggered)
	}
}

func TestRecordAndCheckAccumulatesAcrossTicks(t *testing.T) {
	tracker := newPortScanTracker()
	ip := "198.51.100.23"

	// Spread the distinct ports across several ticks a minute apart, well within the window.
	for i := 0; i < portScanDistinctPorts-1; i++ {
		tick := fixedTime(int64(i) * 60)
		triggered := tracker.recordAndCheck(tick, map[string][]uint32{ip: {uint32(2000 + i)}})
		if len(triggered) != 0 {
			t.Fatalf("did not expect a trigger before the threshold is reached (tick %d), got %+v", i, triggered)
		}
	}

	finalTick := fixedTime(int64(portScanDistinctPorts-1) * 60)
	triggered := tracker.recordAndCheck(finalTick, map[string][]uint32{ip: {uint32(2000 + portScanDistinctPorts - 1)}})
	if len(triggered) != 1 || triggered[0] != ip {
		t.Fatalf("expected the accumulated distinct ports to trigger on the final tick, got %+v", triggered)
	}
}

func TestRecordAndCheckIgnoresTouchesOutsideWindow(t *testing.T) {
	tracker := newPortScanTracker()
	ip := "198.51.100.23"

	// First batch of touches, then let the window fully expire before adding more -
	// the old touches should have been pruned and not count toward the threshold.
	tracker.recordAndCheck(fixedTime(0), map[string][]uint32{ip: {1, 2, 3}})

	afterWindow := fixedTime(int64(portScanWindow.Seconds()) + 60)
	triggered := tracker.recordAndCheck(afterWindow, map[string][]uint32{ip: {4, 5}})
	if len(triggered) != 0 {
		t.Fatalf("expected stale touches to be pruned and not contribute to the threshold, got %+v", triggered)
	}
}

func TestRecordAndCheckRespectsCooldown(t *testing.T) {
	tracker := newPortScanTracker()
	ip := "198.51.100.23"

	ports := make([]uint32, portScanDistinctPorts)
	for i := range ports {
		ports[i] = uint32(3000 + i)
	}

	first := tracker.recordAndCheck(fixedTime(0), map[string][]uint32{ip: ports})
	if len(first) != 1 {
		t.Fatalf("expected the first crossing to trigger, got %+v", first)
	}

	// Same IP touches more distinct ports shortly after - still within cooldown, should not refire.
	moreports := append(ports, uint32(9999))
	second := tracker.recordAndCheck(fixedTime(60), map[string][]uint32{ip: moreports})
	if len(second) != 0 {
		t.Fatalf("expected no re-trigger within the cooldown window, got %+v", second)
	}

	afterCooldown := fixedTime(int64(portScanCooldown.Seconds()) + 60)
	third := tracker.recordAndCheck(afterCooldown, map[string][]uint32{ip: {8000, 8001, 8002, 8003, 8004}})
	if len(third) != 1 {
		t.Fatalf("expected a re-trigger once the cooldown has elapsed, got %+v", third)
	}
}

func TestFilterScannableTouchesIgnoresOutboundEphemeralPorts(t *testing.T) {
	// This is the exact scenario that produced false positives during manual testing:
	// this host making several outbound connections (e.g. to an API), each getting a
	// different random local ephemeral port. None of those local ports are ones this
	// host is listening on, so none should be counted.
	conns := []gopsnet.ConnectionStat{
		{Laddr: gopsnet.Addr{Port: 51234}, Raddr: gopsnet.Addr{IP: "93.184.216.34", Port: 443}, Status: "ESTABLISHED"},
		{Laddr: gopsnet.Addr{Port: 51235}, Raddr: gopsnet.Addr{IP: "93.184.216.34", Port: 443}, Status: "ESTABLISHED"},
		{Laddr: gopsnet.Addr{Port: 51236}, Raddr: gopsnet.Addr{IP: "93.184.216.34", Port: 443}, Status: "ESTABLISHED"},
	}

	observed := filterScannableTouches(conns)
	if len(observed) != 0 {
		t.Fatalf("expected outbound client connections on ephemeral ports to be ignored, got %+v", observed)
	}
}

func TestFilterScannableTouchesCountsInboundHitsOnListeningPorts(t *testing.T) {
	conns := []gopsnet.ConnectionStat{
		{Laddr: gopsnet.Addr{Port: 22}, Status: "LISTEN"},
		{Laddr: gopsnet.Addr{Port: 80}, Status: "LISTEN"},
		{Laddr: gopsnet.Addr{Port: 22}, Raddr: gopsnet.Addr{IP: "198.51.100.23"}, Status: "ESTABLISHED"},
		{Laddr: gopsnet.Addr{Port: 80}, Raddr: gopsnet.Addr{IP: "198.51.100.23"}, Status: "ESTABLISHED"},
	}

	observed := filterScannableTouches(conns)
	if len(observed["198.51.100.23"]) != 2 {
		t.Fatalf("expected 2 touches against this host's own listening ports, got %+v", observed)
	}
}

func TestFilterScannableTouchesIgnoresLoopback(t *testing.T) {
	conns := []gopsnet.ConnectionStat{
		{Laddr: gopsnet.Addr{Port: 5432}, Status: "LISTEN"},
		{Laddr: gopsnet.Addr{Port: 5432}, Raddr: gopsnet.Addr{IP: "127.0.0.1"}, Status: "ESTABLISHED"},
		{Laddr: gopsnet.Addr{Port: 5432}, Raddr: gopsnet.Addr{IP: "::1"}, Status: "ESTABLISHED"},
	}

	observed := filterScannableTouches(conns)
	if len(observed) != 0 {
		t.Fatalf("expected loopback peers to be ignored, got %+v", observed)
	}
}

func TestFilterScannableTouchesIgnoresNonEstablished(t *testing.T) {
	conns := []gopsnet.ConnectionStat{
		{Laddr: gopsnet.Addr{Port: 443}, Status: "LISTEN"},
		{Laddr: gopsnet.Addr{Port: 443}, Raddr: gopsnet.Addr{IP: "198.51.100.23"}, Status: "TIME_WAIT"},
	}

	observed := filterScannableTouches(conns)
	if len(observed) != 0 {
		t.Fatalf("expected non-ESTABLISHED connections to be ignored, got %+v", observed)
	}
}

func TestRecordAndCheckPrunesStaleIPEntries(t *testing.T) {
	tracker := newPortScanTracker()
	ip := "198.51.100.23"

	tracker.recordAndCheck(fixedTime(0), map[string][]uint32{ip: {1, 2}})
	if _, exists := tracker.touches[ip]; !exists {
		t.Fatalf("expected the IP to be tracked after its first observation")
	}

	// IP not observed again, and enough time passes that its touches all fall outside the window.
	afterWindow := fixedTime(int64(portScanWindow.Seconds()) + 60)
	tracker.recordAndCheck(afterWindow, map[string][]uint32{"203.0.113.9": {1}})

	if _, exists := tracker.touches[ip]; exists {
		t.Errorf("expected the stale IP's tracker entry to be pruned, but it's still present")
	}
}
