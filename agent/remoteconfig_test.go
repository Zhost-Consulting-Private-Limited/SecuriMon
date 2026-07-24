package main

import "testing"

func TestMergeRemoteFIMPathsNoChange(t *testing.T) {
	current := []string{"/etc/nginx/nginx.conf"}
	remote := []string{"/etc/nginx/nginx.conf"}

	merged, changed := mergeRemoteStringList(current, remote)
	if changed {
		t.Fatalf("expected no change for identical paths, got changed=%v merged=%+v", changed, merged)
	}
}

func TestMergeRemoteFIMPathsDetectsChange(t *testing.T) {
	current := []string{"/etc/nginx/nginx.conf"}
	remote := []string{"/etc/nginx/nginx.conf", "/etc/apache2/apache2.conf"}

	merged, changed := mergeRemoteStringList(current, remote)
	if !changed {
		t.Fatalf("expected a change when the dashboard adds a path")
	}
	if !stringSlicesEqual(merged, remote) {
		t.Errorf("expected merged to equal the remote value, got %+v", merged)
	}
}

func TestMergeRemoteFIMPathsBothEmpty(t *testing.T) {
	merged, changed := mergeRemoteStringList(nil, []string{})
	if changed {
		t.Fatalf("expected no change when both current and remote are empty, got merged=%+v", merged)
	}
}

func TestMergeRemoteFIMPathsDashboardClearsCustomList(t *testing.T) {
	current := []string{"/etc/nginx/nginx.conf"}
	remote := []string{}

	merged, changed := mergeRemoteStringList(current, remote)
	if !changed {
		t.Fatalf("expected a change when the dashboard clears a previously-set list")
	}
	if len(merged) != 0 {
		t.Errorf("expected merged to be empty, got %+v", merged)
	}
}

func TestStringSlicesEqualDifferentOrder(t *testing.T) {
	// Order matters here deliberately - this is a simple positional comparison, not a
	// set comparison, which is sufficient since both sides come from the same source
	// (the dashboard's stored list) round-tripping through JSON.
	a := []string{"/a", "/b"}
	b := []string{"/b", "/a"}
	if stringSlicesEqual(a, b) {
		t.Errorf("expected order-sensitive comparison to treat differently-ordered slices as unequal")
	}
}
