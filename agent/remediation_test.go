package main

import "testing"

func TestBuildBlockIPCommandsUfw(t *testing.T) {
	commands := buildBlockIPCommands("ufw", "198.51.100.23")
	if len(commands) != 1 {
		t.Fatalf("expected 1 command for ufw, got %d: %+v", len(commands), commands)
	}
	want := []string{"ufw", "deny", "from", "198.51.100.23"}
	if !equalArgs(commands[0], want) {
		t.Errorf("got %+v, want %+v", commands[0], want)
	}
}

func TestBuildBlockIPCommandsFirewalld(t *testing.T) {
	commands := buildBlockIPCommands("firewalld", "198.51.100.23")
	if len(commands) != 2 {
		t.Fatalf("expected 2 commands for firewalld (add-rich-rule + reload), got %d: %+v", len(commands), commands)
	}
	if commands[0][0] != "firewall-cmd" || commands[1][0] != "firewall-cmd" {
		t.Fatalf("expected both commands to invoke firewall-cmd, got %+v", commands)
	}
	if commands[1][1] != "--reload" {
		t.Errorf("expected the second command to be a reload, got %+v", commands[1])
	}
	if commands[0][1] != "--permanent" {
		t.Errorf("expected the first command's first flag to be --permanent, got %+v", commands[0])
	}
	if !containsSubstring(commands[0][2], "198.51.100.23") {
		t.Errorf("expected the rich-rule argument to reference the IP, got %+v", commands[0])
	}
}

func TestBuildBlockIPCommandsRejectsMalformedIP(t *testing.T) {
	// Guards against rich-rule injection via a bogus "IP" containing quotes/rule syntax -
	// firewall-cmd parses its own rule grammar, and exec.Command doesn't go through a
	// shell, so this is specifically about firewalld's own rule parser, not shell escaping.
	malformed := `198.51.100.23" accept #`
	if commands := buildBlockIPCommands("firewalld", malformed); commands != nil {
		t.Fatalf("expected no commands for a malformed IP, got %+v", commands)
	}
	if commands := buildBlockIPCommands("ufw", malformed); commands != nil {
		t.Fatalf("expected no commands for a malformed IP, got %+v", commands)
	}
}

func TestBuildBlockIPCommandsUnknownTool(t *testing.T) {
	if commands := buildBlockIPCommands("none", "198.51.100.23"); commands != nil {
		t.Fatalf("expected no commands for an unknown/absent tool, got %+v", commands)
	}
}

func equalArgs(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for i := range got {
		if got[i] != want[i] {
			return false
		}
	}
	return true
}

func containsSubstring(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		func() bool {
			for i := 0; i+len(substr) <= len(s); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}())
}
