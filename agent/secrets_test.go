package main

import (
	"os"
	"path/filepath"
	"testing"
)

// Split across a concatenation (rather than one literal) so this fixture doesn't read
// as an unbroken, real-AWS-key-shaped string in the source/diff - it's not a real key,
// but GitHub's (and our own) secret scanner can't tell that from shape alone.
const fakeAWSKeyFixture = "AKIA" + "ABCDEFGHIJKLMNOP"

func TestScanForSecretsDetectsAWSKey(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.env")
	if err := os.WriteFile(path, []byte("AWS_ACCESS_KEY_ID="+fakeAWSKeyFixture+"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) != 1 {
		t.Fatalf("expected 1 match, got %d: %+v", len(matches), matches)
	}
	if matches[0].label != "aws_access_key_id" {
		t.Errorf("expected label aws_access_key_id, got %s", matches[0].label)
	}
	if matches[0].path != path {
		t.Errorf("expected path %s, got %s", path, matches[0].path)
	}
}

func TestScanForSecretsDetectsPrivateKeyBlock(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "id_rsa.conf")
	content := "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEr...\n-----END RSA PRIVATE KEY-----\n"
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) != 1 || matches[0].label != "private_key_block" {
		t.Fatalf("expected a single private_key_block match, got %+v", matches)
	}
}

func TestScanForSecretsDetectsHardcodedPassword(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "app.yaml")
	if err := os.WriteFile(path, []byte("database:\n  password: \"SuperSecret123\"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) != 1 || matches[0].label != "hardcoded_password_assignment" {
		t.Fatalf("expected a single hardcoded_password_assignment match, got %+v", matches)
	}
}

func TestScanForSecretsIgnoresCleanFiles(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.env")
	if err := os.WriteFile(path, []byte("PORT=4000\nNODE_ENV=production\n"), 0644); err != nil {
		t.Fatal(err)
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) != 0 {
		t.Fatalf("expected no matches for a clean file, got %+v", matches)
	}
}

func TestScanForSecretsRespectsExtensionAllowlist(t *testing.T) {
	dir := t.TempDir()
	// .txt is not in secretsScanExtensions - this file should be skipped entirely,
	// even though its content would otherwise match the AWS key pattern.
	path := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(path, []byte(fakeAWSKeyFixture), 0644); err != nil {
		t.Fatal(err)
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) != 0 {
		t.Fatalf("expected .txt files to be skipped by the extension allowlist, got %+v", matches)
	}
}

func TestScanForSecretsCapsFindingsCount(t *testing.T) {
	dir := t.TempDir()
	for i := 0; i < secretsScanMaxFindings+5; i++ {
		path := filepath.Join(dir, "secret"+string(rune('a'+i))+".env")
		if err := os.WriteFile(path, []byte("AWS_ACCESS_KEY_ID="+fakeAWSKeyFixture+"\n"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	matches := scanForSecretsInRoots([]string{dir})
	if len(matches) > secretsScanMaxFindings {
		t.Fatalf("expected at most %d matches, got %d", secretsScanMaxFindings, len(matches))
	}
}
