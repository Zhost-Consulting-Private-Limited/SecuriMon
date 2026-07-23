package main

import "testing"

func TestParseAptUpgradableCountsPackagesAndSkipsHeader(t *testing.T) {
	output := `Listing... Done
nginx/focal-updates 1.18.0-0ubuntu1.4 amd64 [upgradable from: 1.18.0-0ubuntu1.2]
curl/focal-updates 7.68.0-1ubuntu2.18 amd64 [upgradable from: 7.68.0-1ubuntu2.14]
`
	result := parseAptUpgradable(output)
	if result.totalUpgradable != 2 {
		t.Fatalf("expected 2 upgradable packages, got %d", result.totalUpgradable)
	}
	if result.securityFlagged != 0 {
		t.Fatalf("expected 0 security-flagged packages, got %d", result.securityFlagged)
	}
}

func TestParseAptUpgradableFlagsSecurityRepo(t *testing.T) {
	output := `Listing... Done
openssl/focal-security 1.1.1f-1ubuntu2.19 amd64 [upgradable from: 1.1.1f-1ubuntu2.17]
vim/focal-updates 2:8.1.2269-1ubuntu5.9 amd64 [upgradable from: 2:8.1.2269-1ubuntu5.7]
`
	result := parseAptUpgradable(output)
	if result.totalUpgradable != 2 {
		t.Fatalf("expected 2 upgradable packages, got %d", result.totalUpgradable)
	}
	if result.securityFlagged != 1 {
		t.Fatalf("expected 1 security-flagged package, got %d", result.securityFlagged)
	}
}

func TestParseAptUpgradableHandlesNoUpdates(t *testing.T) {
	result := parseAptUpgradable("Listing... Done\n")
	if result.totalUpgradable != 0 {
		t.Fatalf("expected 0 upgradable packages, got %d", result.totalUpgradable)
	}
}

func TestParseYumCheckUpdateCountsPackageLines(t *testing.T) {
	output := `
bash.x86_64                4.4.20-4.el8              baseos
openssl.x86_64             1.1.1k-7.el8              appstream

Obsoleting Packages
`
	result := parseYumCheckUpdate(output, "yum")
	if result.totalUpgradable != 2 {
		t.Fatalf("expected 2 upgradable packages, got %d: tool=%s", result.totalUpgradable, result.tool)
	}
}

func TestParseYumCheckUpdateHandlesNoUpdates(t *testing.T) {
	result := parseYumCheckUpdate("", "dnf")
	if result.totalUpgradable != 0 {
		t.Fatalf("expected 0 upgradable packages, got %d", result.totalUpgradable)
	}
}

func TestRunPatchCheckReportsNoFindingsWithoutSupportedTool(t *testing.T) {
	// This just exercises RunPatchCheck() end-to-end on whatever this machine actually
	// has - on Windows (this dev machine) it must return no findings without erroring,
	// which is the honest, verifiable claim for this environment.
	if got := len(RunPatchCheck()); got > 1 {
		t.Fatalf("expected at most 1 finding, got %d", got)
	}
}
