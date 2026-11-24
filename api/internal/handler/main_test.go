package handler_test

import (
	"fmt"
	"os"
	"testing"
)

// TestMain runs the handler tests from a temporary working directory.
// The setups and handlers use relative paths such as ./uploads/receipts and
// ./uploads/logos (GetLogo reads the latter directly), so without this every
// run would write receipt and logo files into the repository.
func TestMain(m *testing.M) {
	os.Exit(runInTempDir(m))
}

func runInTempDir(m *testing.M) int {
	dir, err := os.MkdirTemp("", "handler-test-*")
	if err != nil {
		fmt.Fprintln(os.Stderr, "create temp dir:", err)
		return 1
	}
	defer os.RemoveAll(dir)

	original, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, "get working dir:", err)
		return 1
	}
	if err := os.Chdir(dir); err != nil {
		fmt.Fprintln(os.Stderr, "change to temp dir:", err)
		return 1
	}
	defer os.Chdir(original) //nolint:errcheck // best effort before exit

	return m.Run()
}
