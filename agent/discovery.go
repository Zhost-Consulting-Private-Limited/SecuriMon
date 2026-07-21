package main

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemInfo struct {
	Hostname      string
	OS            string
	OSVersion     string
	KernelVersion string
}

type MetricsPayload struct {
	CollectedAt    time.Time `json:"collected_at"`
	CPUPercent     float64   `json:"cpu_percent"`
	RAMPercent     float64   `json:"ram_percent"`
	SwapPercent    float64   `json:"swap_percent"`
	Load1m         float64   `json:"load_1m"`
	Load5m         float64   `json:"load_5m"`
	Load15m        float64   `json:"load_15m"`
	NetworkRxBytes uint64    `json:"network_rx_bytes"`
	NetworkTxBytes uint64    `json:"network_tx_bytes"`
}

func GetSystemInfo() (*SystemInfo, error) {
	hInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	return &SystemInfo{
		Hostname:      hInfo.Hostname,
		OS:            hInfo.OS,
		OSVersion:     hInfo.PlatformVersion,
		KernelVersion: hInfo.KernelVersion,
	}, nil
}

func CollectMetrics() (*MetricsPayload, error) {
	payload := &MetricsPayload{CollectedAt: time.Now().UTC()}

	// CPU
	cpuPercents, err := cpu.Percent(0, false)
	if err == nil && len(cpuPercents) > 0 {
		payload.CPUPercent = cpuPercents[0]
	}

	// Memory & Swap
	vMem, err := mem.VirtualMemory()
	if err == nil {
		payload.RAMPercent = vMem.UsedPercent
	}
	sMem, err := mem.SwapMemory()
	if err == nil {
		payload.SwapPercent = sMem.UsedPercent
	}

	// Load Avg
	lInfo, err := load.Avg()
	if err == nil {
		payload.Load1m = lInfo.Load1
		payload.Load5m = lInfo.Load5
		payload.Load15m = lInfo.Load15
	}

	// Network
	netIO, err := net.IOCounters(false)
	if err == nil && len(netIO) > 0 {
		payload.NetworkRxBytes = netIO[0].BytesRecv
		payload.NetworkTxBytes = netIO[0].BytesSent
	}

	return payload, nil
}
