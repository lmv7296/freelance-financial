package repository

import (
	"strings"
)

// isUniqueViolation checks whether a database error is a unique constraint violation (PostgreSQL code 23505).
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "UNIQUE constraint")
}

func stringPtr(s string) *string {
	return &s
}

