package tax

import (
	"context"
	"encoding/json"
	"fmt"
	"math"

	"go-freelancer/internal/model"
)

// TaxCalculator calculates income tax for a given legal form
type TaxCalculator interface {
	Calculate(
		ctx context.Context,
		profile *model.TaxProfile,
		rules []model.TaxRule,
		revenueCents int64,
		expensesCents int64,
		currentMonth int,
		provisionalPaidCents int64,
	) (*model.IncomeTaxEstimate, []model.TaxRuleUsed, []model.TaxWarning, error)
}

// EenmanszaakCalculator handles income tax calculations for ZZP / eenmanszaak
type EenmanszaakCalculator struct{}

func NewEenmanszaakCalculator() *EenmanszaakCalculator {
	return &EenmanszaakCalculator{}
}

// Helpers for rule matching
func matchRule(rules []model.TaxRule, key string, profile *model.TaxProfile) *model.TaxRule {
	for _, r := range rules {
		if r.Key != key {
			continue
		}
		// Match conditions
		matched := true
		for condKey, condVal := range r.Conditions {
			switch condKey {
			case "reached_aow_age":
				if b, ok := condVal.(bool); ok && b != profile.ReachedAOWAge {
					matched = false
				}
			case "meets_hours_criterion":
				if b, ok := condVal.(bool); ok {
					if profile.MeetsHoursCriterion == nil || *profile.MeetsHoursCriterion != b {
						matched = false
					}
				}
			case "is_starter":
				if b, ok := condVal.(bool); ok && b != profile.IsStarter {
					matched = false
				}
			}
			if !matched {
				break
			}
		}
		if matched {
			return &r
		}
	}
	return nil
}

func formatDisplayValue(valType string, raw json.RawMessage) string {
	switch valType {
	case "percentage":
		var p float64
		if err := json.Unmarshal(raw, &p); err == nil {
			pct := p * 100
			return fmt.Sprintf("%.2f%%", pct)
		}
	case "amount":
		var a float64
		if err := json.Unmarshal(raw, &a); err == nil {
			return fmt.Sprintf("€ %s", formatEuroAmount(int64(math.Round(a*100))))
		}
	case "number":
		var n float64
		if err := json.Unmarshal(raw, &n); err == nil {
			return fmt.Sprintf("%.0f", n)
		}
	}
	return string(raw)
}

func formatEuroAmount(cents int64) string {
	euros := float64(cents) / 100.0
	return fmt.Sprintf("%.2f", euros)
}

func centsToEuroDecimal(cents int64) float64 {
	return math.Round(float64(cents))/100.0
}

// Bracket definition
type TaxBracket struct {
	From float64  `json:"from"`
	To   *float64 `json:"to"`
	Rate float64  `json:"rate"`
}

// Piecewise definition
type PiecewiseSegment struct {
	From float64  `json:"from"`
	To   *float64 `json:"to"`
	Base float64  `json:"base"`
	Rate float64  `json:"rate"`
}

func calculateBracketTax(brackets []TaxBracket, incomeCents int64) int64 {
	incomeEuros := float64(incomeCents) / 100.0
	if incomeEuros <= 0 {
		return 0
	}
	var tax float64
	for _, b := range brackets {
		if incomeEuros <= b.From {
			continue
		}
		taxableInBracket := incomeEuros - b.From
		if b.To != nil {
			span := *b.To - b.From
			if taxableInBracket > span {
				taxableInBracket = span
			}
		}
		tax += taxableInBracket * b.Rate
	}
	return int64(math.Round(tax * 100))
}

func calculatePiecewise(segments []PiecewiseSegment, incomeCents int64) int64 {
	incomeEuros := float64(incomeCents) / 100.0
	if incomeEuros <= 0 {
		return 0
	}
	for _, s := range segments {
		if incomeEuros > s.From && (s.To == nil || incomeEuros <= *s.To) {
			credit := s.Base + s.Rate*(incomeEuros-s.From)
			if credit < 0 {
				credit = 0
			}
			return int64(math.Round(credit * 100))
		}
	}
	return 0
}

// calculateArbeidsinkomen computes the income base for arbeidskorting.
// TODO: confirm with accountant (see art. 8.11 Wet IB 2001 and tax-vault-backend.md)
// For eenmanszaak, winst vóór ondernemersaftrek (step 1) is currently used.
func calculateArbeidsinkomen(winstCents int64) int64 {
	if winstCents < 0 {
		return 0
	}
	return winstCents
}

// calculateBijdrageInkomenZvw computes the income base for Zvw contribution.
// TODO: confirm with accountant (see Zvw rules and tax-vault-backend.md)
// For eenmanszaak, belastbare winst (step 4) capped at max_income is currently used.
func calculateBijdrageInkomenZvw(belastbareWinstCents int64, maxIncomeCents int64) int64 {
	if belastbareWinstCents <= 0 {
		return 0
	}
	if belastbareWinstCents > maxIncomeCents {
		return maxIncomeCents
	}
	return belastbareWinstCents
}

func (c *EenmanszaakCalculator) Calculate(
	ctx context.Context,
	profile *model.TaxProfile,
	rules []model.TaxRule,
	revenueCents int64,
	expensesCents int64,
	currentMonth int,
	provisionalPaidCents int64,
) (*model.IncomeTaxEstimate, []model.TaxRuleUsed, []model.TaxWarning, error) {
	warnings := make([]model.TaxWarning, 0)
	rulesUsedMap := make(map[string]model.TaxRuleUsed)

	// Check if essential rules exist
	box1Rule := matchRule(rules, "ib.box1.brackets", profile)
	if box1Rule == nil {
		return &model.IncomeTaxEstimate{
			Status:           "unavailable",
			Kind:             "inkomstenbelasting",
			Label:            "Inkomstenbelasting & Zvw (ZZP / eenmanszaak)",
			ProjectionMethod: nil,
			ToDate:           nil,
			Projected:        nil,
		}, nil, []model.TaxWarning{
			{
				Code:     "rules_unavailable",
				Severity: "warning",
				Message:  "Belastingregels voor dit belastingjaar zijn niet beschikbaar.",
			},
		}, nil
	}

	recordRule := func(r *model.TaxRule) {
		if r == nil {
			return
		}
		var val interface{}
		_ = json.Unmarshal(r.Value, &val)
		rulesUsedMap[r.Key] = model.TaxRuleUsed{
			Key:          r.Key,
			Label:        r.Label,
			ValueType:    r.ValueType,
			Value:        val,
			DisplayValue: formatDisplayValue(r.ValueType, r.Value),
			TaxYear:      r.TaxYear,
			SourceURL:    r.SourceURL,
			VerifiedAt:   r.VerifiedAt,
		}
	}

	// Hours criterion warning
	if profile.MeetsHoursCriterion == nil {
		warnings = append(warnings, model.TaxWarning{
			Code:     "hours_criterion_unknown",
			Severity: "warning",
			Message:  "Het urencriterium (1.225 uur) is nog niet ingesteld. Ondernemersaftrek is voorlopig niet meegerekend.",
		})
	}

	// Calculate scenario
	calcScenario := func(revCents, expCents int64, basisLabel string, provPaidCents int64) *model.TaxScenario {
		steps := make([]model.TaxCalculationStep, 0)

		// 1. Winst
		winstCents := revCents - expCents
		steps = append(steps, model.TaxCalculationStep{
			Key:     "winst",
			Label:   "Winst uit onderneming (omzet - kosten)",
			Amount:  centsToEuroDecimal(winstCents),
			Kind:    "income",
			RuleKey: nil,
			Note:    nil,
		})

		// 2. Ondernemersaftrek (Zelfstandigenaftrek + Startersaftrek)
		var zelfstandigenaftrekCents int64 = 0
		var startersaftrekCents int64 = 0

		if profile.MeetsHoursCriterion != nil && *profile.MeetsHoursCriterion {
			zRule := matchRule(rules, "ib.zelfstandigenaftrek", profile)
			if zRule != nil {
				recordRule(zRule)
				var zAmount float64
				_ = json.Unmarshal(zRule.Value, &zAmount)
				zelfstandigenaftrekCents = int64(math.Round(zAmount * 100))
			}

			if profile.IsStarter {
				sRule := matchRule(rules, "ib.startersaftrek", profile)
				if sRule != nil {
					recordRule(sRule)
					var sAmount float64
					_ = json.Unmarshal(sRule.Value, &sAmount)
					startersaftrekCents = int64(math.Round(sAmount * 100))
				}
			}

			// Capping rule: zelfstandigenaftrek is at most winst unless is_starter
			if !profile.IsStarter && zelfstandigenaftrekCents > winstCents {
				if winstCents > 0 {
					zelfstandigenaftrekCents = winstCents
				} else {
					zelfstandigenaftrekCents = 0
				}
			}
		}

		ondernemersaftrekCents := zelfstandigenaftrekCents + startersaftrekCents
		zKey := "ib.zelfstandigenaftrek"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "ondernemersaftrek",
			Label:   "Ondernemersaftrek",
			Amount:  centsToEuroDecimal(ondernemersaftrekCents),
			Kind:    "deduction",
			RuleKey: &zKey,
			Note:    nil,
		})

		// 3. Mkb-winstvrijstelling
		winstNaAftrekCents := winstCents - ondernemersaftrekCents
		var mkbVrijstellingCents int64 = 0
		mkbRule := matchRule(rules, "ib.mkb_winstvrijstelling", profile)
		if mkbRule != nil {
			recordRule(mkbRule)
			var mkbRate float64
			_ = json.Unmarshal(mkbRule.Value, &mkbRate)
			if winstNaAftrekCents > 0 {
				mkbVrijstellingCents = int64(math.Round(float64(winstNaAftrekCents) * mkbRate))
			}
		}
		mkbKey := "ib.mkb_winstvrijstelling"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "mkb_winstvrijstelling",
			Label:   "Mkb-winstvrijstelling",
			Amount:  centsToEuroDecimal(mkbVrijstellingCents),
			Kind:    "deduction",
			RuleKey: &mkbKey,
			Note:    nil,
		})

		// 4. Belastbare winst
		belastbareWinstCents := winstNaAftrekCents - mkbVrijstellingCents
		if belastbareWinstCents < 0 {
			belastbareWinstCents = 0
		}
		steps = append(steps, model.TaxCalculationStep{
			Key:     "belastbare_winst",
			Label:   "Belastbare winst uit onderneming",
			Amount:  centsToEuroDecimal(belastbareWinstCents),
			Kind:    "subtotal",
			RuleKey: nil,
			Note:    nil,
		})

		// 5. Belastbaar inkomen box 1 (including other_box1_income)
		var otherBox1Cents int64 = 0
		if profile.OtherBox1Income != nil {
			otherBox1Cents = int64(math.Round(*profile.OtherBox1Income * 100))
		}
		belastbaarInkomenBox1Cents := belastbareWinstCents + otherBox1Cents
		steps = append(steps, model.TaxCalculationStep{
			Key:     "belastbaar_inkomen_box1",
			Label:   "Belastbaar inkomen uit werk en woning (box 1)",
			Amount:  centsToEuroDecimal(belastbaarInkomenBox1Cents),
			Kind:    "subtotal",
			RuleKey: nil,
			Note:    nil,
		})

		// 6. Inkomstenbelasting via brackets
		recordRule(box1Rule)
		var brackets []TaxBracket
		_ = json.Unmarshal(box1Rule.Value, &brackets)
		rawTaxBox1Cents := calculateBracketTax(brackets, belastbaarInkomenBox1Cents)
		box1Key := "ib.box1.brackets"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "inkomstenbelasting_box1_bruto",
			Label:   "Inkomstenbelasting box 1 (bruto)",
			Amount:  centsToEuroDecimal(rawTaxBox1Cents),
			Kind:    "tax",
			RuleKey: &box1Key,
			Note:    nil,
		})

		// 7. Aftrekbeperking (capped deduction rate)
		var aftrekbeperkingCents int64 = 0
		capRule := matchRule(rules, "ib.deduction_rate_cap", profile)
		if capRule != nil && len(brackets) >= 3 {
			recordRule(capRule)
			var maxRate float64
			_ = json.Unmarshal(capRule.Value, &maxRate) // e.g. 0.3756
			topBracketFrom := brackets[len(brackets)-1].From
			topBracketRate := brackets[len(brackets)-1].Rate // 0.4950
			// If total deductions caused income to not be taxed at 49.50%
			totDeductionsCents := ondernemersaftrekCents + mkbVrijstellingCents
			incomeBeforeDeductionsEuros := float64(belastbaarInkomenBox1Cents+totDeductionsCents) / 100.0
			if incomeBeforeDeductionsEuros > topBracketFrom && totDeductionsCents > 0 {
				deductionsInTopBracket := incomeBeforeDeductionsEuros - topBracketFrom
				totDeductionsEuros := float64(totDeductionsCents) / 100.0
				if deductionsInTopBracket > totDeductionsEuros {
					deductionsInTopBracket = totDeductionsEuros
				}
				diffRate := topBracketRate - maxRate
				aftrekbeperkingCents = int64(math.Round(deductionsInTopBracket * diffRate * 100))
			}
		}
		capKey := "ib.deduction_rate_cap"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "aftrekbeperking",
			Label:   "Correctie aftrekbeperking",
			Amount:  centsToEuroDecimal(aftrekbeperkingCents),
			Kind:    "tax",
			RuleKey: &capKey,
			Note:    nil,
		})

		// 8. Heffingskortingen (Algemene heffingskorting + Arbeidskorting)
		var algemeneHeffingskortingCents int64 = 0
		ahRule := matchRule(rules, "ib.algemene_heffingskorting", profile)
		if ahRule != nil {
			recordRule(ahRule)
			var segments []PiecewiseSegment
			_ = json.Unmarshal(ahRule.Value, &segments)
			algemeneHeffingskortingCents = calculatePiecewise(segments, belastbaarInkomenBox1Cents)
		}

		var arbeidskortingCents int64 = 0
		akRule := matchRule(rules, "ib.arbeidskorting", profile)
		if akRule != nil {
			recordRule(akRule)
			var segments []PiecewiseSegment
			_ = json.Unmarshal(akRule.Value, &segments)
			arbeidsinkomenCents := calculateArbeidsinkomen(winstCents)
			arbeidskortingCents = calculatePiecewise(segments, arbeidsinkomenCents)
		}

		totHeffingskortingCents := algemeneHeffingskortingCents + arbeidskortingCents
		// Capped at tax
		taxBeforeCredits := rawTaxBox1Cents + aftrekbeperkingCents
		if totHeffingskortingCents > taxBeforeCredits {
			totHeffingskortingCents = taxBeforeCredits
		}

		ahKey := "ib.algemene_heffingskorting"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "heffingskortingen",
			Label:   "Heffingskortingen (algemene heffingskorting & arbeidskorting)",
			Amount:  centsToEuroDecimal(totHeffingskortingCents),
			Kind:    "credit",
			RuleKey: &ahKey,
			Note:    nil,
		})

		// Final IB
		ibTaxCents := taxBeforeCredits - totHeffingskortingCents
		if ibTaxCents < 0 {
			ibTaxCents = 0
		}
		steps = append(steps, model.TaxCalculationStep{
			Key:     "inkomstenbelasting_netto",
			Label:   "Inkomstenbelasting (te betalen)",
			Amount:  centsToEuroDecimal(ibTaxCents),
			Kind:    "subtotal",
			RuleKey: nil,
			Note:    nil,
		})

		// 9. Zvw-bijdrage
		var zvwTaxCents int64 = 0
		zvwRateRule := matchRule(rules, "zvw.rate_entrepreneur", profile)
		zvwMaxRule := matchRule(rules, "zvw.max_income", profile)
		if zvwRateRule != nil && zvwMaxRule != nil {
			recordRule(zvwRateRule)
			recordRule(zvwMaxRule)
			var zvwRate float64
			var zvwMax float64
			_ = json.Unmarshal(zvwRateRule.Value, &zvwRate)
			_ = json.Unmarshal(zvwMaxRule.Value, &zvwMax)
			bijdrageInkomenCents := calculateBijdrageInkomenZvw(belastbareWinstCents, int64(math.Round(zvwMax*100)))
			zvwTaxCents = int64(math.Round(float64(bijdrageInkomenCents) * zvwRate))
		}
		zvwKey := "zvw.rate_entrepreneur"
		steps = append(steps, model.TaxCalculationStep{
			Key:     "zvw_bijdrage",
			Label:   "Inkomensafhankelijke bijdrage Zvw",
			Amount:  centsToEuroDecimal(zvwTaxCents),
			Kind:    "tax",
			RuleKey: &zvwKey,
			Note:    nil,
		})

		// 10. Total Tax and Still to pay
		totalTaxCents := ibTaxCents + zvwTaxCents
		stillToPayCents := totalTaxCents - provPaidCents
		steps = append(steps, model.TaxCalculationStep{
			Key:     "totaal_te_betalen",
			Label:   "Totaal inkomstenheffingen",
			Amount:  centsToEuroDecimal(totalTaxCents),
			Kind:    "total",
			RuleKey: nil,
			Note:    nil,
		})

		effectiveRate := 0.0
		if winstCents > 0 {
			effectiveRate = math.Round((float64(totalTaxCents)/float64(winstCents))*10000) / 10000.0
		}

		return &model.TaxScenario{
			BasisLabel:                basisLabel,
			Profit:                    centsToEuroDecimal(winstCents),
			TaxableIncome:             centsToEuroDecimal(belastbaarInkomenBox1Cents),
			TotalTax:                  centsToEuroDecimal(totalTaxCents),
			ProvisionalAssessmentPaid: centsToEuroDecimal(provPaidCents),
			StillToPay:                centsToEuroDecimal(stillToPayCents),
			EffectiveRate:             effectiveRate,
			Components: []model.TaxComponent{
				{Key: "ib", Label: "Inkomstenbelasting box 1", Amount: centsToEuroDecimal(ibTaxCents)},
				{Key: "zvw", Label: "Bijdrage Zorgverzekeringswet (Zvw)", Amount: centsToEuroDecimal(zvwTaxCents)},
			},
			Steps: steps,
		}
	}

	monthNames := []string{
		"", "januari", "februari", "maart", "april", "mei", "juni",
		"juli", "augustus", "september", "oktober", "november", "december",
	}
	monthName := "huidige maand"
	if currentMonth >= 1 && currentMonth <= 12 {
		monthName = monthNames[currentMonth]
	}
	basisLabelToDate := fmt.Sprintf("Werkelijke cijfers t/m %s", monthName)

	toDateScenario := calcScenario(revenueCents, expensesCents, basisLabelToDate, provisionalPaidCents)

	// Projected scenario
	var projectedScenario *model.TaxScenario
	projMethod := "Jaarprojectie op basis van gemiddelde winst per verstreken maand (winst ÷ maanden × 12)"
	if currentMonth > 0 {
		scaleFactor := 12.0 / float64(currentMonth)
		projRevCents := int64(math.Round(float64(revenueCents) * scaleFactor))
		projExpCents := int64(math.Round(float64(expensesCents) * scaleFactor))
		var fullYearProvPaidCents int64 = 0
		if profile.ProvisionalAssessmentMonthly != nil {
			fullYearProvPaidCents = int64(math.Round(*profile.ProvisionalAssessmentMonthly * 100 * 12))
		} else {
			fullYearProvPaidCents = provisionalPaidCents
		}
		projectedScenario = calcScenario(projRevCents, projExpCents, "Verwacht resultaat heel kalenderjaar", fullYearProvPaidCents)
	}

	rulesUsed := make([]model.TaxRuleUsed, 0, len(rulesUsedMap))
	for _, ru := range rulesUsedMap {
		rulesUsed = append(rulesUsed, ru)
	}

	return &model.IncomeTaxEstimate{
		Status:           "available",
		Kind:             "inkomstenbelasting",
		Label:            "Inkomstenbelasting & Zvw (ZZP / eenmanszaak)",
		ProjectionMethod: &projMethod,
		ToDate:           toDateScenario,
		Projected:        projectedScenario,
	}, rulesUsed, warnings, nil
}
