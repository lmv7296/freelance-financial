package model

import "time"

// Example placeholder entity demonstrating how domain models are defined.
// Replace or extend this with your actual business entities.
type Item struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
