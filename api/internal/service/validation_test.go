package service_test

import (
	"testing"

	"go-freelancer/internal/service"
)

func TestValidation_KVK(t *testing.T) {
	valid := []string{"12345678", "87654321", "00000000"}
	for _, v := range valid {
		if err := service.ValidateKVK(v); err != nil {
			t.Errorf("expected valid KVK %q, got error: %v", v, err)
		}
	}

	invalid := []string{"1234567", "123456789", "1234567A", "abcdefgh", "1234 5678"}
	for _, inv := range invalid {
		if err := service.ValidateKVK(inv); err == nil {
			t.Errorf("expected invalid KVK %q, got nil error", inv)
		}
	}
}

func TestValidation_VAT(t *testing.T) {
	valid := []struct {
		input    string
		expected string
	}{
		{"NL123456789B01", "NL123456789B01"},
		{"nl 123456789 b01", "NL123456789B01"},
		{"NL.123456789.B01", "NL123456789B01"},
	}
	for _, tc := range valid {
		res, err := service.ValidateVAT(tc.input, "NL")
		if err != nil {
			t.Errorf("expected valid VAT %q, got: %v", tc.input, err)
		}
		if res != tc.expected {
			t.Errorf("expected normalized VAT %q, got %q", tc.expected, res)
		}
	}

	invalid := []string{"NL12345678B01", "NL1234567890B01", "BE123456789B01", "NL123456789A01", "123456789B01"}
	for _, inv := range invalid {
		if _, err := service.ValidateVAT(inv, "NL"); err == nil {
			t.Errorf("expected invalid VAT %q, got nil error", inv)
		}
	}
}

func TestValidation_PostalCodeNL(t *testing.T) {
	valid := []struct {
		input    string
		expected string
	}{
		{"1012AB", "1012 AB"},
		{"1012 ab", "1012 AB"},
		{"1012  AB", "1012 AB"},
	}
	for _, tc := range valid {
		res, err := service.ValidatePostalCodeNL(tc.input)
		if err != nil {
			t.Errorf("expected valid postal code %q, got: %v", tc.input, err)
		}
		if res != tc.expected {
			t.Errorf("expected normalized %q, got %q", tc.expected, res)
		}
	}

	invalid := []string{"0123AB", "123AB", "10123AB", "10121", "1012A"}
	for _, inv := range invalid {
		if _, err := service.ValidatePostalCodeNL(inv); err == nil {
			t.Errorf("expected invalid postal code %q, got nil error", inv)
		}
	}
}

func TestValidation_IBAN(t *testing.T) {
	// Known valid IBANs
	valid := []string{
		"NL91ABNA0417164300",
		"nl91 abna 0417 1643 00",
		"NL91-ABNA-0417-1643-00",
		"NL20INGB0001234567",
	}
	for _, v := range valid {
		err := service.ValidateIBAN(v)
		if err != nil {
			t.Errorf("expected valid IBAN %q, got error: %v", v, err)
		}
	}

	// Corrupted check digits or wrong format
	invalid := []string{
		"NL90ABNA0417164300", // bad check digits
		"NL91ABNA0417164301", // bad check digits
		"NL02INGB0001234567", // bad check digits
		"123456789012345",
		"NL91",
	}
	for _, inv := range invalid {
		if err := service.ValidateIBAN(inv); err == nil {
			t.Errorf("expected invalid IBAN %q, got nil error", inv)
		}
	}
}

func TestValidation_NormalizePhoneE164(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"06 1234 5678", "+31612345678"},
		{"+31 6 1234 5678", "+31612345678"},
		{"0031612345678", "+31612345678"},
		{"06-12345678", "+31612345678"},
		{"+31612345678", "+31612345678"},
	}

	for _, tc := range cases {
		res, err := service.NormalizePhoneE164(tc.input)
		if err != nil {
			t.Errorf("expected valid phone for %q, got err: %v", tc.input, err)
		}
		if res != tc.expected {
			t.Errorf("expected %q, got %q", tc.expected, res)
		}
	}

	invalid := []string{"", "abc", "123"}
	for _, inv := range invalid {
		if _, err := service.NormalizePhoneE164(inv); err == nil {
			t.Errorf("expected error for invalid phone %q, got nil", inv)
		}
	}
}

func TestValidation_SanitizeSVG(t *testing.T) {
	validSVG := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>`)
	sanitized, err := service.SanitizeSVG(validSVG)
	if err != nil {
		t.Fatalf("expected valid SVG, got error: %v", err)
	}
	if len(sanitized) == 0 {
		t.Error("expected non-empty sanitized SVG")
	}

	malicious := [][]byte{
		[]byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		[]byte(`<svg onload="alert('xss')" width="100" height="100"></svg>`),
		[]byte(`<svg><a href="javascript:alert(1)"><circle cx="50" cy="50" r="40"/></a></svg>`),
		[]byte(`not an svg`),
	}

	for _, m := range malicious {
		if _, err := service.SanitizeSVG(m); err == nil {
			t.Errorf("expected error for malicious SVG %q, got nil", string(m))
		}
	}
}
