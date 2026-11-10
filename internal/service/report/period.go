package report

import (
	"fmt"
	"time"
)

// PeriodInfo holds parsed period details for reports.
type PeriodInfo struct {
	From          string // YYYY-MM-DD
	To            string // YYYY-MM-DD
	FromTime      time.Time
	ToTime        time.Time
	PeriodSlug    string // e.g. 2026-Q3, 2026-07, 2026, 2026-07-01_2026-08-15
	LabelNL       string
	LabelEN       string
	IsWholePeriod bool // true if whole month, whole quarter, or whole year
	IsQuarter     bool
	QuarterNum    int
	Year          int
}

var monthsNL = map[time.Month]string{
	time.January:   "januari",
	time.February:  "februari",
	time.March:     "maart",
	time.April:     "april",
	time.May:       "mei",
	time.June:      "juni",
	time.July:      "juli",
	time.August:    "augustus",
	time.September: "september",
	time.October:   "oktober",
	time.November:  "november",
	time.December:  "december",
}

var monthsEN = map[time.Month]string{
	time.January:   "January",
	time.February:  "February",
	time.March:     "March",
	time.April:     "April",
	time.May:       "May",
	time.June:      "June",
	time.July:      "July",
	time.August:    "August",
	time.September: "September",
	time.October:   "October",
	time.November:  "November",
	time.December:  "December",
}

// ParsePeriod parses and classifies the date range.
func ParsePeriod(fromStr, toStr string) (*PeriodInfo, error) {
	fromT, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return nil, fmt.Errorf("invalid from date: %w", err)
	}
	toT, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return nil, fmt.Errorf("invalid to date: %w", err)
	}

	if fromT.After(toT) {
		return nil, fmt.Errorf("from date (%s) cannot be after to date (%s)", fromStr, toStr)
	}

	info := &PeriodInfo{
		From:     fromStr,
		To:       toStr,
		FromTime: fromT,
		ToTime:   toT,
		Year:     fromT.Year(),
	}

	// 1. Check if Whole Year
	if fromT.Month() == time.January && fromT.Day() == 1 &&
		toT.Month() == time.December && toT.Day() == 31 &&
		fromT.Year() == toT.Year() {
		info.IsWholePeriod = true
		info.PeriodSlug = fmt.Sprintf("%d", fromT.Year())
		info.LabelNL = fmt.Sprintf("Jaar %d", fromT.Year())
		info.LabelEN = fmt.Sprintf("Year %d", fromT.Year())
		return info, nil
	}

	// 2. Check if Whole Quarter
	if fromT.Year() == toT.Year() {
		y := fromT.Year()
		if fromStr == fmt.Sprintf("%d-01-01", y) && toStr == fmt.Sprintf("%d-03-31", y) {
			info.IsWholePeriod = true
			info.IsQuarter = true
			info.QuarterNum = 1
			info.PeriodSlug = fmt.Sprintf("%d-Q1", y)
			info.LabelNL = fmt.Sprintf("1e kwartaal %d (Q1)", y)
			info.LabelEN = fmt.Sprintf("Q1 %d", y)
			return info, nil
		}
		if fromStr == fmt.Sprintf("%d-04-01", y) && toStr == fmt.Sprintf("%d-06-30", y) {
			info.IsWholePeriod = true
			info.IsQuarter = true
			info.QuarterNum = 2
			info.PeriodSlug = fmt.Sprintf("%d-Q2", y)
			info.LabelNL = fmt.Sprintf("2e kwartaal %d (Q2)", y)
			info.LabelEN = fmt.Sprintf("Q2 %d", y)
			return info, nil
		}
		if fromStr == fmt.Sprintf("%d-07-01", y) && toStr == fmt.Sprintf("%d-09-30", y) {
			info.IsWholePeriod = true
			info.IsQuarter = true
			info.QuarterNum = 3
			info.PeriodSlug = fmt.Sprintf("%d-Q3", y)
			info.LabelNL = fmt.Sprintf("3e kwartaal %d (Q3)", y)
			info.LabelEN = fmt.Sprintf("Q3 %d", y)
			return info, nil
		}
		if fromStr == fmt.Sprintf("%d-10-01", y) && toStr == fmt.Sprintf("%d-12-31", y) {
			info.IsWholePeriod = true
			info.IsQuarter = true
			info.QuarterNum = 4
			info.PeriodSlug = fmt.Sprintf("%d-Q4", y)
			info.LabelNL = fmt.Sprintf("4e kwartaal %d (Q4)", y)
			info.LabelEN = fmt.Sprintf("Q4 %d", y)
			return info, nil
		}
	}

	// 3. Check if Whole Month
	if fromT.Year() == toT.Year() && fromT.Month() == toT.Month() && fromT.Day() == 1 {
		lastDayOfMonth := time.Date(fromT.Year(), fromT.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
		if toT.Day() == lastDayOfMonth {
			info.IsWholePeriod = true
			info.PeriodSlug = fmt.Sprintf("%d-%02d", fromT.Year(), int(fromT.Month()))
			info.LabelNL = fmt.Sprintf("%s %d", monthsNL[fromT.Month()], fromT.Year())
			info.LabelEN = fmt.Sprintf("%s %d", monthsEN[fromT.Month()], fromT.Year())
			return info, nil
		}
	}

	// 4. Custom Range
	info.IsWholePeriod = false
	info.PeriodSlug = fmt.Sprintf("%s_%s", fromStr, toStr)
	info.LabelNL = fmt.Sprintf("%s t/m %s", fromStr, toStr)
	info.LabelEN = fmt.Sprintf("%s to %s", fromStr, toStr)
	return info, nil
}

