package service

import (
	"bytes"
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"strings"
)

var (
	ErrInvalidKVK        = errors.New("kvk_number must be exactly 8 digits")
	ErrInvalidVAT        = errors.New("vat_number must follow format NL + 9 digits + B + 2 digits (e.g. NL123456789B01)")
	ErrInvalidPostalCode = errors.New("postal_code must be a valid Dutch postal code (4 digits starting with 1-9 followed by 2 letters, e.g. 1012 AB)")
	ErrInvalidIBAN       = errors.New("iban must be a valid IBAN with correct checksum (mod 97)")
	ErrInvalidPhone      = errors.New("phone must be a valid phone number in E.164 format")
	ErrInvalidSVG        = errors.New("invalid or unsafe SVG file")
	ErrInvalidCountry    = errors.New("country must be a valid ISO 3166-1 alpha-2 code")
	ErrInvalidTaxRegime  = errors.New("legal_form must be one of: eenmanszaak, vof, bv")
	ErrInvalidLegalForm  = errors.New("legal_form must be one of: eenmanszaak, vof, bv")
)

var (
	kvkRegex        = regexp.MustCompile(`^[0-9]{8}$`)
	vatRegex        = regexp.MustCompile(`^NL[0-9]{9}B[0-9]{2}$`)
	vatGenericRegex = regexp.MustCompile(`^[A-Z]{2}[A-Z0-9]{2,13}$`)
	dutchPostcodeRx = regexp.MustCompile(`^[1-9][0-9]{3}[A-Za-z]{2}$`)
	isoCountryRegex = regexp.MustCompile(`^[A-Za-z]{2}$`)
)

// ValidateKVK validates an 8-digit Dutch Chamber of Commerce (KvK) number.
func ValidateKVK(kvk string) error {
	clean := strings.TrimSpace(kvk)
	if clean == "" {
		return nil
	}
	if !kvkRegex.MatchString(clean) {
		return ErrInvalidKVK
	}
	return nil
}

// ValidateVAT validates and normalises a VAT ID.
// When country is NL: NL + 9 digits + B + 2 digits.
// Otherwise: 2-letter prefix + 2 to 13 letters/digits.
func ValidateVAT(vat string, country string) (string, error) {
	clean := strings.ToUpper(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(vat), " ", ""), ".", ""))
	if clean == "" {
		return "", nil
	}
	cUpper := strings.ToUpper(strings.TrimSpace(country))
	if cUpper == "NL" || cUpper == "" {
		if !vatRegex.MatchString(clean) {
			return "", ErrInvalidVAT
		}
	} else {
		if !vatGenericRegex.MatchString(clean) {
			return "", errors.New("vat_number must be a 2-letter country prefix followed by 2 to 13 letters or digits")
		}
	}
	return clean, nil
}

// ValidateCountry validates an ISO 3166-1 alpha-2 code and returns uppercase.
func ValidateCountry(country string) (string, error) {
	clean := strings.TrimSpace(country)
	if !isoCountryRegex.MatchString(clean) {
		return "", ErrInvalidCountry
	}
	return strings.ToUpper(clean), nil
}

// TaxRegimeForCountry maps an ISO 3166-1 country code to its standard VAT tax regime string.
func TaxRegimeForCountry(country string) string {
	switch strings.ToUpper(strings.TrimSpace(country)) {
	case "NL", "":
		return "NL_BTW_STANDARD"
	case "BE":
		return "BE_TVA_STANDARD"
	case "DE":
		return "DE_MWST_STANDARD"
	case "ES":
		return "ES_AUTONOMO_GENERAL"
	default:
		return strings.ToUpper(strings.TrimSpace(country)) + "_STANDARD"
	}
}

// ValidatePostalCodeNL validates and formats Dutch postal codes.
func ValidatePostalCodeNL(postcode string) (string, error) {
	clean := strings.TrimSpace(postcode)
	if clean == "" {
		return "", nil
	}
	stripped := strings.ReplaceAll(clean, " ", "")
	if !dutchPostcodeRx.MatchString(stripped) {
		return "", ErrInvalidPostalCode
	}
	return strings.ToUpper(stripped[:4] + " " + stripped[4:]), nil
}

// ValidateIBAN validates an IBAN string using ISO 7064 Mod-97 checksum.
func ValidateIBAN(iban string) error {
	clean := strings.ToUpper(strings.TrimSpace(iban))
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	if clean == "" {
		return nil
	}
	if len(clean) < 15 || len(clean) > 34 {
		return ErrInvalidIBAN
	}
	for _, c := range clean {
		if !((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return ErrInvalidIBAN
		}
	}
	rearranged := clean[4:] + clean[:4]
	var numericStr strings.Builder
	for _, char := range rearranged {
		if char >= 'A' && char <= 'Z' {
			numericStr.WriteString(fmt.Sprintf("%d", char-'A'+10))
		} else {
			numericStr.WriteRune(char)
		}
	}
	n := new(big.Int)
	_, ok := n.SetString(numericStr.String(), 10)
	if !ok {
		return ErrInvalidIBAN
	}
	rem := new(big.Int).Mod(n, big.NewInt(97))
	if rem.Int64() != 1 {
		return ErrInvalidIBAN
	}
	return nil
}

// NormalizePhoneE164 validates and normalizes phone numbers to E.164.
func NormalizePhoneE164(phone string) (string, error) {
	clean := strings.TrimSpace(phone)
	if clean == "" {
		return "", ErrInvalidPhone
	}
	var b strings.Builder
	for _, ch := range clean {
		if ch == '+' || (ch >= '0' && ch <= '9') {
			b.WriteRune(ch)
		}
	}
	clean = b.String()
	if strings.HasPrefix(clean, "00") {
		clean = "+" + clean[2:]
	} else if strings.HasPrefix(clean, "06") {
		clean = "+316" + clean[2:]
	} else if strings.HasPrefix(clean, "31") && !strings.HasPrefix(clean, "+") {
		clean = "+" + clean
	} else if !strings.HasPrefix(clean, "+") {
		if strings.HasPrefix(clean, "0") {
			clean = "+31" + clean[1:]
		} else {
			clean = "+" + clean
		}
	}
	e164Rx := regexp.MustCompile(`^\+[1-9][0-9]{7,14}$`)
	if !e164Rx.MatchString(clean) {
		return "", ErrInvalidPhone
	}
	return clean, nil
}

// SanitizeSVG checks an SVG byte slice for malicious script tags or handlers.
func SanitizeSVG(data []byte) ([]byte, error) {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return nil, ErrInvalidSVG
	}
	lower := bytes.ToLower(trimmed)
	if !bytes.Contains(lower, []byte("<svg")) {
		return nil, ErrInvalidSVG
	}
	dangerous := [][]byte{
		[]byte("<script"),
		[]byte("</script"),
		[]byte("javascript:"),
		[]byte("onload="),
		[]byte("onerror="),
		[]byte("onclick="),
		[]byte("onmouseover="),
		[]byte("xlink:href=\"javascript:"),
		[]byte("href=\"javascript:"),
	}
	for _, d := range dangerous {
		if bytes.Contains(lower, d) {
			return nil, fmt.Errorf("%w: contains dangerous script or handler", ErrInvalidSVG)
		}
	}
	return trimmed, nil
}
