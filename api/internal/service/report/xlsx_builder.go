package report

import (
	"bytes"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
	"go-freelancer/internal/model"
)

type XLSXBuilder struct {
	company *model.Company
	lang    string
}

func NewXLSXBuilder(company *model.Company, lang string) *XLSXBuilder {
	return &XLSXBuilder{
		company: company,
		lang:    lang,
	}
}

func (b *XLSXBuilder) getStyles(f *excelize.File) (headerStyle, currencyStyle, boldCurrencyStyle, dateStyle, normalStyle, boldStyle int, err error) {
	// Header style: Bold, light gray background, borders
	headerStyle, err = f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "0F172A"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"F1F5F9"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "bottom", Color: "CBD5E1", Style: 1},
			{Type: "top", Color: "CBD5E1", Style: 1},
		},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	if err != nil {
		return
	}

	// Currency format: € #,##0.00
	currFmt := "€ #,##0.00;[Red]-€ #,##0.00;€ 0.00"
	if b.lang == "en" {
		currFmt = "€#,##0.00;[Red]-€#,##0.00;€0.00"
	}

	currencyStyle, err = f.NewStyle(&excelize.Style{
		CustomNumFmt: &currFmt,
		Alignment:    &excelize.Alignment{Horizontal: "right"},
	})
	if err != nil {
		return
	}

	boldCurrencyStyle, err = f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true, Color: "0F172A"},
		CustomNumFmt: &currFmt,
		Alignment:    &excelize.Alignment{Horizontal: "right"},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "top", Color: "CBD5E1", Style: 1},
			{Type: "bottom", Color: "CBD5E1", Style: 2},
		},
	})
	if err != nil {
		return
	}

	dateFmt := "yyyy-mm-dd"
	dateStyle, err = f.NewStyle(&excelize.Style{
		CustomNumFmt: &dateFmt,
		Alignment:    &excelize.Alignment{Horizontal: "center"},
	})
	if err != nil {
		return
	}

	normalStyle, err = f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	if err != nil {
		return
	}

	boldStyle, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "0F172A"},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	return
}

func (b *XLSXBuilder) drawCompanyHeader(f *excelize.File, sheet, title, periodLabel string) int {
	compName := "FreelanceFin"
	if b.company != nil && b.company.Name != nil && *b.company.Name != "" {
		compName = *b.company.Name
	}
	_ = f.SetCellValue(sheet, "A1", compName)
	_ = f.SetCellValue(sheet, "A2", fmt.Sprintf("%s - %s", title, periodLabel))
	genDate := time.Now().Format("2006-01-02 15:04")
	_ = f.SetCellValue(sheet, "A3", fmt.Sprintf("Aangemaakt: %s", genDate))

	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14, Color: "1E293B"}})
	subStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 11, Color: "2563EB"}})
	infoStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Size: 9, Color: "64748B"}})

	_ = f.SetCellStyle(sheet, "A1", "A1", titleStyle)
	_ = f.SetCellStyle(sheet, "A2", "A2", subStyle)
	_ = f.SetCellStyle(sheet, "A3", "A3", infoStyle)

	return 5 // Start table at row 5
}

// BuildProfitLossXLSX generates Excel workbook for Profit & Loss.
func (b *XLSXBuilder) BuildProfitLossXLSX(data *ProfitLossData) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Winst & verlies"
	if b.lang == "en" {
		sheet = "Profit & loss"
	}
	f.SetSheetName("Sheet1", sheet)

	hStyle, currStyle, boldCurrStyle, _, normStyle, boldStyle, err := b.getStyles(f)
	if err != nil {
		return nil, err
	}

	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	row := b.drawCompanyHeader(f, sheet, ReportTitle(model.ReportKeyProfitLoss, b.lang), periodLabel)

	// Summary Block
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Onderdeel")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Bedrag")
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), hStyle)
	row++

	revLabel := "Omzet (excl. btw)"
	costsLabel := "Kosten (excl. btw)"
	resLabel := "Netto resultaat"
	if b.lang == "en" {
		revLabel = "Revenue (excl. VAT)"
		costsLabel = "Costs (excl. VAT)"
		resLabel = "Net Result"
	}

	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), revLabel)
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), float64(data.RevenueExclVatCents)/100.0)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), normStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), currStyle)
	row++

	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), costsLabel)
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), float64(data.TotalCostsExclVatCents)/100.0)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), normStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), currStyle)
	row++

	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), resLabel)
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), float64(data.NetResultCents)/100.0)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), boldStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), boldCurrStyle)
	row += 3

	// Costs Table
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Categorie")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Aantal")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), "Excl. btw")
	_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), "Btw")
	_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), "Totaal")
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("E%d", row), hStyle)
	row++

	for _, cat := range data.CategoryCosts {
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), cat.Category)
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), cat.Count)
		_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), float64(cat.NetCents)/100.0)
		_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), float64(cat.VatCents)/100.0)
		_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), float64(cat.TotalCents)/100.0)

		_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), normStyle)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("E%d", row), currStyle)
		row++
	}

	// Totals
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Totaal kosten")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), float64(data.TotalCostsExclVatCents)/100.0)
	_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), float64(data.TotalCostsVatCents)/100.0)
	_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), float64(data.TotalCostsTotalCents)/100.0)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), boldStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("E%d", row), boldCurrStyle)

	_ = f.SetColWidth(sheet, "A", "A", 30)
	_ = f.SetColWidth(sheet, "B", "B", 12)
	_ = f.SetColWidth(sheet, "C", "E", 18)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildVatSummaryXLSX generates Excel workbook for VAT Summary.
func (b *XLSXBuilder) BuildVatSummaryXLSX(data *VatSummaryData) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Btw-overzicht"
	if b.lang == "en" {
		sheet = "VAT summary"
	}
	f.SetSheetName("Sheet1", sheet)

	hStyle, currStyle, boldCurrStyle, _, normStyle, boldStyle, err := b.getStyles(f)
	if err != nil {
		return nil, err
	}

	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	row := b.drawCompanyHeader(f, sheet, ReportTitle(model.ReportKeyVatSummary, b.lang), periodLabel)

	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Rubriek")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Omschrijving")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), "Omzet")
	_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), "Omzetbelasting")
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), hStyle)
	row++

	for _, rub := range data.Rubrieken {
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), rub.Code)
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), rub.Label)
		if rub.Turnover != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), *rub.Turnover)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), currStyle)
		}
		if rub.Vat != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), *rub.Vat)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), currStyle)
		}
		_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("B%d", row), normStyle)
		row++
	}

	// Balance Row
	row++
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Totaal te betalen / te ontvangen")
	_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), data.Balance)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), boldStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldCurrStyle)

	_ = f.SetColWidth(sheet, "A", "A", 12)
	_ = f.SetColWidth(sheet, "B", "B", 45)
	_ = f.SetColWidth(sheet, "C", "D", 20)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildInvoicesXLSX generates multi-sheet Excel workbook for Invoices & Open Items.
func (b *XLSXBuilder) BuildInvoicesXLSX(data *InvoicesReportData) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	s1 := "Facturen"
	s2 := "Openstaand"
	s3 := "Per klant"
	if b.lang == "en" {
		s1 = "Invoices"
		s2 = "Open items"
		s3 = "By client"
	}

	f.SetSheetName("Sheet1", s1)
	_, _ = f.NewSheet(s2)
	_, _ = f.NewSheet(s3)

	hStyle, currStyle, boldCurrStyle, dateStyle, normStyle, boldStyle, err := b.getStyles(f)
	if err != nil {
		return nil, err
	}

	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}

	// --- SHEET 1: Facturen (All Invoices) ---
	r1 := b.drawCompanyHeader(f, s1, "Facturen in periode", periodLabel)
	_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), "Factuurnummer")
	_ = f.SetCellValue(s1, fmt.Sprintf("B%d", r1), "Klant")
	_ = f.SetCellValue(s1, fmt.Sprintf("C%d", r1), "Factuurdatum")
	_ = f.SetCellValue(s1, fmt.Sprintf("D%d", r1), "Vervaldatum")
	_ = f.SetCellValue(s1, fmt.Sprintf("E%d", r1), "Status")
	_ = f.SetCellValue(s1, fmt.Sprintf("F%d", r1), "Betaaldatum")
	_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), "Subtotaal")
	_ = f.SetCellValue(s1, fmt.Sprintf("H%d", r1), "Btw")
	_ = f.SetCellValue(s1, fmt.Sprintf("I%d", r1), "Totaal")
	_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("I%d", r1), hStyle)
	r1++

	for _, inv := range data.AllInvoices {
		_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), inv.InvoiceNumber)
		_ = f.SetCellValue(s1, fmt.Sprintf("B%d", r1), inv.ClientName)
		_ = f.SetCellValue(s1, fmt.Sprintf("C%d", r1), inv.IssueDate)
		_ = f.SetCellValue(s1, fmt.Sprintf("D%d", r1), inv.DueDate)
		_ = f.SetCellValue(s1, fmt.Sprintf("E%d", r1), inv.Status)
		if inv.PaidAt != nil {
			_ = f.SetCellValue(s1, fmt.Sprintf("F%d", r1), *inv.PaidAt)
		}
		_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), float64(inv.SubtotalCents)/100.0)
		_ = f.SetCellValue(s1, fmt.Sprintf("H%d", r1), float64(inv.VatAmountCents)/100.0)
		_ = f.SetCellValue(s1, fmt.Sprintf("I%d", r1), float64(inv.TotalCents)/100.0)

		_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("B%d", r1), normStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("C%d", r1), fmt.Sprintf("D%d", r1), dateStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("E%d", r1), fmt.Sprintf("E%d", r1), normStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("F%d", r1), fmt.Sprintf("F%d", r1), dateStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("G%d", r1), fmt.Sprintf("I%d", r1), currStyle)
		r1++
	}

	// Totals
	_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), "Totaal")
	_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), float64(data.AllInvoicesSubtotalCents)/100.0)
	_ = f.SetCellValue(s1, fmt.Sprintf("H%d", r1), float64(data.AllInvoicesVatCents)/100.0)
	_ = f.SetCellValue(s1, fmt.Sprintf("I%d", r1), float64(data.AllInvoicesTotalCents)/100.0)
	_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("F%d", r1), boldStyle)
	_ = f.SetCellStyle(s1, fmt.Sprintf("G%d", r1), fmt.Sprintf("I%d", r1), boldCurrStyle)

	_ = f.SetColWidth(s1, "A", "A", 20)
	_ = f.SetColWidth(s1, "B", "B", 30)
	_ = f.SetColWidth(s1, "C", "F", 15)
	_ = f.SetColWidth(s1, "G", "I", 18)

	// --- SHEET 2: Openstaand (Open & Overdue Items) ---
	r2 := b.drawCompanyHeader(f, s2, fmt.Sprintf("Openstaand per %s", data.Period.To), periodLabel)
	_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), "Factuurnummer")
	_ = f.SetCellValue(s2, fmt.Sprintf("B%d", r2), "Klant")
	_ = f.SetCellValue(s2, fmt.Sprintf("C%d", r2), "Factuurdatum")
	_ = f.SetCellValue(s2, fmt.Sprintf("D%d", r2), "Vervaldatum")
	_ = f.SetCellValue(s2, fmt.Sprintf("E%d", r2), "Status")
	_ = f.SetCellValue(s2, fmt.Sprintf("F%d", r2), "Dagen vervallen")
	_ = f.SetCellValue(s2, fmt.Sprintf("G%d", r2), "Openstaand bedrag")
	_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("G%d", r2), hStyle)
	r2++

	for _, item := range data.OpenItems {
		inv := item.Invoice
		statusStr := "Openstaand"
		if item.IsOverdue {
			statusStr = "Vervallen"
		}
		_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), inv.InvoiceNumber)
		_ = f.SetCellValue(s2, fmt.Sprintf("B%d", r2), inv.ClientName)
		_ = f.SetCellValue(s2, fmt.Sprintf("C%d", r2), inv.IssueDate)
		_ = f.SetCellValue(s2, fmt.Sprintf("D%d", r2), inv.DueDate)
		_ = f.SetCellValue(s2, fmt.Sprintf("E%d", r2), statusStr)
		if item.IsOverdue {
			_ = f.SetCellValue(s2, fmt.Sprintf("F%d", r2), item.DaysOverdue)
		} else {
			_ = f.SetCellValue(s2, fmt.Sprintf("F%d", r2), 0)
		}
		_ = f.SetCellValue(s2, fmt.Sprintf("G%d", r2), float64(inv.TotalCents)/100.0)

		_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("B%d", r2), normStyle)
		_ = f.SetCellStyle(s2, fmt.Sprintf("C%d", r2), fmt.Sprintf("D%d", r2), dateStyle)
		_ = f.SetCellStyle(s2, fmt.Sprintf("E%d", r2), fmt.Sprintf("F%d", r2), normStyle)
		_ = f.SetCellStyle(s2, fmt.Sprintf("G%d", r2), fmt.Sprintf("G%d", r2), currStyle)
		r2++
	}

	_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), "Totaal openstaand")
	_ = f.SetCellValue(s2, fmt.Sprintf("G%d", r2), float64(data.TotalOpenCents)/100.0)
	_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("F%d", r2), boldStyle)
	_ = f.SetCellStyle(s2, fmt.Sprintf("G%d", r2), fmt.Sprintf("G%d", r2), boldCurrStyle)

	_ = f.SetColWidth(s2, "A", "A", 20)
	_ = f.SetColWidth(s2, "B", "B", 30)
	_ = f.SetColWidth(s2, "C", "D", 15)
	_ = f.SetColWidth(s2, "E", "F", 16)
	_ = f.SetColWidth(s2, "G", "G", 20)

	// --- SHEET 3: Per klant (Revenue by Client) ---
	r3 := b.drawCompanyHeader(f, s3, "Omzet per klant", periodLabel)
	_ = f.SetCellValue(s3, fmt.Sprintf("A%d", r3), "Klant")
	_ = f.SetCellValue(s3, fmt.Sprintf("B%d", r3), "Aantal facturen")
	_ = f.SetCellValue(s3, fmt.Sprintf("C%d", r3), "Omzet excl. btw")
	_ = f.SetCellValue(s3, fmt.Sprintf("D%d", r3), "Totaal incl. btw")
	_ = f.SetCellStyle(s3, fmt.Sprintf("A%d", r3), fmt.Sprintf("D%d", r3), hStyle)
	r3++

	for _, cItem := range data.ClientBreakdown {
		_ = f.SetCellValue(s3, fmt.Sprintf("A%d", r3), cItem.ClientName)
		_ = f.SetCellValue(s3, fmt.Sprintf("B%d", r3), cItem.Count)
		_ = f.SetCellValue(s3, fmt.Sprintf("C%d", r3), float64(cItem.SubtotalCents)/100.0)
		_ = f.SetCellValue(s3, fmt.Sprintf("D%d", r3), float64(cItem.TotalCents)/100.0)

		_ = f.SetCellStyle(s3, fmt.Sprintf("A%d", r3), fmt.Sprintf("A%d", r3), normStyle)
		_ = f.SetCellStyle(s3, fmt.Sprintf("B%d", r3), fmt.Sprintf("B%d", r3), normStyle)
		_ = f.SetCellStyle(s3, fmt.Sprintf("C%d", r3), fmt.Sprintf("D%d", r3), currStyle)
		r3++
	}

	_ = f.SetColWidth(s3, "A", "A", 35)
	_ = f.SetColWidth(s3, "B", "B", 18)
	_ = f.SetColWidth(s3, "C", "D", 20)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildExpensesXLSX generates multi-sheet Excel workbook for Expenses by Category.
func (b *XLSXBuilder) BuildExpensesXLSX(data *ExpensesReportData) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	s1 := "Uitgaven"
	s2 := "Per categorie"
	s3 := "Bonnen"
	if b.lang == "en" {
		s1 = "Expenses"
		s2 = "By category"
		s3 = "Receipts"
	}

	f.SetSheetName("Sheet1", s1)
	_, _ = f.NewSheet(s2)
	_, _ = f.NewSheet(s3)

	hStyle, currStyle, boldCurrStyle, dateStyle, normStyle, boldStyle, err := b.getStyles(f)
	if err != nil {
		return nil, err
	}

	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}

	// --- SHEET 1: Uitgaven ---
	r1 := b.drawCompanyHeader(f, s1, "Uitgaven in periode", periodLabel)
	_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), "Datum")
	_ = f.SetCellValue(s1, fmt.Sprintf("B%d", r1), "Leverancier")
	_ = f.SetCellValue(s1, fmt.Sprintf("C%d", r1), "Categorie")
	_ = f.SetCellValue(s1, fmt.Sprintf("D%d", r1), "Betaalmethode")
	_ = f.SetCellValue(s1, fmt.Sprintf("E%d", r1), "Netto bedrag")
	_ = f.SetCellValue(s1, fmt.Sprintf("F%d", r1), "Btw bedrag")
	_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), "Totaal bedrag")
	_ = f.SetCellValue(s1, fmt.Sprintf("H%d", r1), "Bon aanwezig")
	_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("H%d", r1), hStyle)
	r1++

	for _, exp := range data.AllExpenses {
		rDate := ""
		if exp.ReceiptDate != nil {
			rDate = *exp.ReceiptDate
		}
		cat := "Overig"
		if exp.Category != nil && *exp.Category != "" {
			cat = *exp.Category
		}
		method := "-"
		if exp.PaymentMethod != nil && *exp.PaymentMethod != "" {
			method = *exp.PaymentMethod
		}
		hasReceipt := "Nee"
		if exp.ReceiptURL != "" || exp.ReceiptFilePath != "" {
			hasReceipt = "Ja"
		}

		var netVal, vatVal float64
		if exp.SubtotalAmount != nil {
			netVal = *exp.SubtotalAmount
		} else {
			netVal = exp.TotalAmount
		}
		if exp.VatAmount != nil {
			vatVal = *exp.VatAmount
		}

		_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), rDate)
		_ = f.SetCellValue(s1, fmt.Sprintf("B%d", r1), exp.MerchantName)
		_ = f.SetCellValue(s1, fmt.Sprintf("C%d", r1), cat)
		_ = f.SetCellValue(s1, fmt.Sprintf("D%d", r1), method)
		_ = f.SetCellValue(s1, fmt.Sprintf("E%d", r1), netVal)
		_ = f.SetCellValue(s1, fmt.Sprintf("F%d", r1), vatVal)
		_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), exp.TotalAmount)
		_ = f.SetCellValue(s1, fmt.Sprintf("H%d", r1), hasReceipt)

		_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("A%d", r1), dateStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("B%d", r1), fmt.Sprintf("D%d", r1), normStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("E%d", r1), fmt.Sprintf("G%d", r1), currStyle)
		_ = f.SetCellStyle(s1, fmt.Sprintf("H%d", r1), fmt.Sprintf("H%d", r1), normStyle)
		r1++
	}

	// Totals
	_ = f.SetCellValue(s1, fmt.Sprintf("A%d", r1), "Totaal")
	_ = f.SetCellValue(s1, fmt.Sprintf("E%d", r1), float64(data.AllExpensesNetCents)/100.0)
	_ = f.SetCellValue(s1, fmt.Sprintf("F%d", r1), float64(data.AllExpensesVatCents)/100.0)
	_ = f.SetCellValue(s1, fmt.Sprintf("G%d", r1), float64(data.AllExpensesTotalCents)/100.0)
	_ = f.SetCellStyle(s1, fmt.Sprintf("A%d", r1), fmt.Sprintf("D%d", r1), boldStyle)
	_ = f.SetCellStyle(s1, fmt.Sprintf("E%d", r1), fmt.Sprintf("G%d", r1), boldCurrStyle)

	_ = f.SetColWidth(s1, "A", "A", 15)
	_ = f.SetColWidth(s1, "B", "C", 30)
	_ = f.SetColWidth(s1, "D", "D", 20)
	_ = f.SetColWidth(s1, "E", "G", 18)
	_ = f.SetColWidth(s1, "H", "H", 15)

	// --- SHEET 2: Per categorie ---
	r2 := b.drawCompanyHeader(f, s2, "Uitgaven per categorie", periodLabel)
	_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), "Categorie")
	_ = f.SetCellValue(s2, fmt.Sprintf("B%d", r2), "Aantal")
	_ = f.SetCellValue(s2, fmt.Sprintf("C%d", r2), "Netto bedrag")
	_ = f.SetCellValue(s2, fmt.Sprintf("D%d", r2), "Btw bedrag")
	_ = f.SetCellValue(s2, fmt.Sprintf("E%d", r2), "Totaal bedrag")
	_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("E%d", r2), hStyle)
	r2++

	for _, cat := range data.CategoryBreakdown {
		_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), cat.Category)
		_ = f.SetCellValue(s2, fmt.Sprintf("B%d", r2), cat.Count)
		_ = f.SetCellValue(s2, fmt.Sprintf("C%d", r2), float64(cat.NetCents)/100.0)
		_ = f.SetCellValue(s2, fmt.Sprintf("D%d", r2), float64(cat.VatCents)/100.0)
		_ = f.SetCellValue(s2, fmt.Sprintf("E%d", r2), float64(cat.TotalCents)/100.0)

		_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("B%d", r2), normStyle)
		_ = f.SetCellStyle(s2, fmt.Sprintf("C%d", r2), fmt.Sprintf("E%d", r2), currStyle)
		r2++
	}

	_ = f.SetCellValue(s2, fmt.Sprintf("A%d", r2), "Totaal")
	_ = f.SetCellValue(s2, fmt.Sprintf("C%d", r2), float64(data.AllExpensesNetCents)/100.0)
	_ = f.SetCellValue(s2, fmt.Sprintf("D%d", r2), float64(data.AllExpensesVatCents)/100.0)
	_ = f.SetCellValue(s2, fmt.Sprintf("E%d", r2), float64(data.AllExpensesTotalCents)/100.0)
	_ = f.SetCellStyle(s2, fmt.Sprintf("A%d", r2), fmt.Sprintf("B%d", r2), boldStyle)
	_ = f.SetCellStyle(s2, fmt.Sprintf("C%d", r2), fmt.Sprintf("E%d", r2), boldCurrStyle)

	_ = f.SetColWidth(s2, "A", "A", 30)
	_ = f.SetColWidth(s2, "B", "B", 12)
	_ = f.SetColWidth(s2, "C", "E", 18)

	// --- SHEET 3: Bonnen ---
	r3 := b.drawCompanyHeader(f, s3, "Bonnen controle", periodLabel)
	_ = f.SetCellValue(s3, fmt.Sprintf("A%d", r3), "Status")
	_ = f.SetCellValue(s3, fmt.Sprintf("B%d", r3), "Aantal uitgaven")
	_ = f.SetCellValue(s3, fmt.Sprintf("C%d", r3), "Totaalbedrag")
	_ = f.SetCellStyle(s3, fmt.Sprintf("A%d", r3), fmt.Sprintf("C%d", r3), hStyle)
	r3++

	_ = f.SetCellValue(s3, fmt.Sprintf("A%d", r3), "Met bon")
	_ = f.SetCellValue(s3, fmt.Sprintf("B%d", r3), data.WithReceiptCount)
	_ = f.SetCellValue(s3, fmt.Sprintf("C%d", r3), float64(data.WithReceiptTotalCents)/100.0)
	_ = f.SetCellStyle(s3, fmt.Sprintf("A%d", r3), fmt.Sprintf("B%d", r3), normStyle)
	_ = f.SetCellStyle(s3, fmt.Sprintf("C%d", r3), fmt.Sprintf("C%d", r3), currStyle)
	r3++

	_ = f.SetCellValue(s3, fmt.Sprintf("A%d", r3), "Zonder bon")
	_ = f.SetCellValue(s3, fmt.Sprintf("B%d", r3), data.WithoutReceiptCount)
	_ = f.SetCellValue(s3, fmt.Sprintf("C%d", r3), float64(data.WithoutReceiptTotalCents)/100.0)
	_ = f.SetCellStyle(s3, fmt.Sprintf("A%d", r3), fmt.Sprintf("B%d", r3), normStyle)
	_ = f.SetCellStyle(s3, fmt.Sprintf("C%d", r3), fmt.Sprintf("C%d", r3), currStyle)
	r3++

	_ = f.SetColWidth(s3, "A", "A", 25)
	_ = f.SetColWidth(s3, "B", "B", 18)
	_ = f.SetColWidth(s3, "C", "C", 20)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}