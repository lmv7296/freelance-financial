package config_test

import (
	"testing"

	"go-freelancer/internal/config"
)

func TestConfigLoadAndDSN(t *testing.T) {
	cfg := config.Load()

	if cfg.Port == "" {
		t.Error("expected Port to have a default value")
	}

	dsn := cfg.DSN()
	if dsn == "" {
		t.Error("expected DSN to return a valid connection string")
	}
}
