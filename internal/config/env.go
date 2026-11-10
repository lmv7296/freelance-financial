package config

import (
	"bufio"
	"io"
	"os"
	"strings"
)

// loadDotEnv searches for a local .env file in the current or parent directories
// and loads variables into the process environment without overwriting already set variables.
func loadDotEnv() {
	candidates := []string{".env", "../.env", "../../.env"}
	for _, filepath := range candidates {
		file, err := os.Open(filepath)
		if err == nil {
			defer file.Close()
			parseDotEnv(file)
			return
		}
	}
}

func parseDotEnv(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip comments and empty lines
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip surrounding quotes if present
		if len(val) >= 2 {
			if (strings.HasPrefix(val, `"`) && strings.HasSuffix(val, `"`)) ||
				(strings.HasPrefix(val, `'`) && strings.HasSuffix(val, `'`)) {
				val = val[1 : len(val)-1]
			}
		}

		// Only set if not already set in the system environment
		if _, exists := os.LookupEnv(key); !exists && key != "" {
			_ = os.Setenv(key, val)
		}
	}
}
