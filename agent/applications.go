package main

import (
	"os/exec"
	"runtime"
	"strings"
)

// DiscoverApplications finds running systemd services on Linux. PM2/Docker/Kubernetes
// discovery (per AGENT_SPEC.md §3.5) is not yet implemented - this is a first, real
// slice of Application Monitoring rather than the previously fully-unpopulated table.
func DiscoverApplications() []ApplicationService {
	if runtime.GOOS != "linux" {
		return []ApplicationService{}
	}

	out, err := exec.Command("systemctl", "list-units", "--type=service", "--state=running", "--no-legend", "--plain").Output()
	if err != nil {
		return []ApplicationService{}
	}

	var services []ApplicationService
	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		name := strings.TrimSuffix(fields[0], ".service")
		if name == "" {
			continue
		}
		services = append(services, ApplicationService{
			Name:   name,
			Status: "running",
		})
	}
	return services
}
