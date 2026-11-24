package report

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
	"go-freelancer/internal/model"
)

type PDFBuilder struct {
	company *model.Company
	lang    string
}

func NewPDFBuilder(company *model.Company, lang string) *PDFBuilder {
	return &PDFBuilder{
		company: company,
		lang:    lang,
	}
}

func (b *PDFBuilder) createPDF() *fpdf.Fpdf {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)

	// Embed custom UTF-8 Geist font
	pdf.AddUTF8FontFromBytes("Geist", "", GeistRegularFont)
	pdf.AddUTF8FontFromBytes("Geist", "B", GeistRegularFont)

	// Setup footer
	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(128, 128, 128)
		pageStr := fmt.Sprintf("Pagina %d van {nb}", pdf.PageNo())
		if b.lang == "en" {
			pageStr = fmt.Sprintf("Page %d of {nb}", pdf.PageNo())
		}
		pdf.CellFormat(0, 8, pageStr, "", 0, "R", false, 0, "")
	})
	pdf.AliasNbPages("{nb}")

	return pdf
}

func (b *PDFBuilder) drawHeader(pdf *fpdf.Fpdf, title, periodLabel string) {
	pdf.AddPage()

	// 1. Company details (left) & Logo (right)
	startY := pdf.GetY()

	// Draw Logo if available and valid PNG/JPG
	logoDrawn := false
	if b.company != nil && b.company.LogoPath != nil && *b.company.LogoPath != "" {
		lPath := *b.company.LogoPath
		ext := strings.ToLower(filepath.Ext(lPath))
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" {
			if _, err := os.Stat(lPath); err == nil {
				imgType := "PNG"
				if ext == ".jpg" || ext == ".jpeg" {
					imgType = "JPEG"
				}
				// 35mm wide max, placed at X=160
				pdf.ImageOptions(lPath, 155, startY, 40, 0, false, fpdf.ImageOptions{ImageType: imgType}, 0, "")
				logoDrawn = true
			}
		}
	}

	// Company Info on Left
	pdf.SetXY(15, startY)
	pdf.SetFont("Geist", "B", 14)
	pdf.SetTextColor(27, 37, 89) // Primary Navy
	compName := "FreelanceFin"
	if b.company != nil && b.company.Name != nil && *b.company.Name != "" {
		compName = *b.company.Name
	}
	pdf.Cell(130, 6, compName)
	pdf.Ln(6)

	pdf.SetFont("Geist", "", 9)
	pdf.SetTextColor(100, 116, 139) // Slate gray

	var compDetails []string
	if b.company != nil {
		if b.company.KVKNumber != nil && *b.company.KVKNumber != "" {
			compDetails = append(compDetails, fmt.Sprintf("KvK: %s", *b.company.KVKNumber))
		}
		if b.company.VATNumber != nil && *b.company.VATNumber != "" {
			compDetails = append(compDetails, fmt.Sprintf("Btw: %s", *b.company.VATNumber))
		}
	}
	if len(compDetails) > 0 {
		pdf.Cell(130, 5, strings.Join(compDetails, "  |  "))
		pdf.Ln(5)
	}

	if logoDrawn {
		if pdf.GetY() < startY+16 {
			pdf.SetY(startY + 16)
		}
	} else {
		pdf.Ln(2)
	}

	// Separator line
	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.3)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(4)

	// Report Title & Period Banner
	pdf.SetFont("Geist", "B", 16)
	pdf.SetTextColor(15, 23, 42) // Dark Slate
	pdf.Cell(120, 8, title)

	pdf.SetFont("Geist", "", 9)
	pdf.SetTextColor(100, 116, 139)
	genDate := time.Now().Format("2006-01-02 15:04")
	genLabel := fmt.Sprintf("Aangemaakt: %s", genDate)
	if b.lang == "en" {
		genLabel = fmt.Sprintf("Generated: %s", genDate)
	}
	pdf.CellFormat(60, 8, genLabel, "", 0, "R", false, 0, "")
	pdf.Ln(7)

	pdf.SetFont("Geist", "B", 10)
	pdf.SetTextColor(37, 99, 235) // Blue highlight
	pdf.Cell(180, 6, periodLabel)
	pdf.Ln(8)
}

func (b *PDFBuilder) drawEmptyNotice(pdf *fpdf.Fpdf) {
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(226, 232, 240)
	pdf.Rect(15, pdf.GetY(), 180, 22, "FD")

	pdf.SetXY(15, pdf.GetY()+6)
	pdf.SetFont("Geist", "", 10)
	pdf.SetTextColor(100, 116, 139)
	msg := "Geen gegevens beschikbaar voor de geselecteerde periode."
	if b.lang == "en" {
		msg = "No data available for the selected period."
	}
	pdf.CellFormat(180, 8, msg, "", 0, "C", false, 0, "")
	pdf.Ln(18)
}

func (b *PDFBuilder) drawUnreviewedNotice(pdf *fpdf.Fpdf, count int) {
	if count <= 0 {
		return
	}
	pdf.Ln(2)
	pdf.SetFillColor(254, 243, 199) // Amber background
	pdf.SetDrawColor(245, 158, 11)  // Amber border
	y := pdf.GetY()
	pdf.Rect(15, y, 180, 12, "FD")

	pdf.SetXY(18, y+2)
	pdf.SetFont("Geist", "", 9)
	pdf.SetTextColor(146, 64, 14) // Dark Amber text
	msg := fmt.Sprintf("Let op: er zijn %d uitgaven die nog beoordeeld moeten worden. Deze zijn niet meegenomen in het rapport.", count)
	if b.lang == "en" {
		msg = fmt.Sprintf("Notice: there are %d expenses pending review. These have been excluded from this report.", count)
	}
	pdf.CellFormat(174, 8, msg, "", 0, "L", false, 0, "")
	pdf.Ln(14)
}

func (b *PDFBuilder) drawNonEurNotice(pdf *fpdf.Fpdf, invCount, expCount int) {
	if invCount == 0 && expCount == 0 {
		return
	}
	pdf.Ln(2)
	pdf.SetFillColor(254, 242, 242) // Red-50
	pdf.SetDrawColor(239, 68, 68)   // Red border
	y := pdf.GetY()
	pdf.Rect(15, y, 180, 14, "FD")

	pdf.SetXY(18, y+2)
	pdf.SetFont("Geist", "", 9)
	pdf.SetTextColor(153, 27, 27)
	msg := fmt.Sprintf("Waarschuwing: er zijn %d facturen en %d uitgaven in vreemde valuta uitgesloten van de totalen.", invCount, expCount)
	if b.lang == "en" {
		msg = fmt.Sprintf("Warning: %d invoices and %d expenses in foreign currencies have been excluded from the totals.", invCount, expCount)
	}
	pdf.CellFormat(174, 9, msg, "", 0, "L", false, 0, "")
	pdf.Ln(16)
}

// BuildProfitLossPDF renders the Profit & Loss report.
func (b *PDFBuilder) BuildProfitLossPDF(data *ProfitLossData) ([]byte, error) {
	pdf := b.createPDF()
	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	b.drawHeader(pdf, ReportTitle(model.ReportKeyProfitLoss, b.lang), periodLabel)

	if data.IsEmpty {
		b.drawEmptyNotice(pdf)
	} else {
		// Summary KPI Cards (Revenue, Costs, Net Result)
		pdf.SetFont("Geist", "B", 10)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(71, 85, 105)

		revLabel := "Omzet (excl. btw)"
		costsLabel := "Kosten (excl. btw)"
		resLabel := "Netto resultaat"
		if b.lang == "en" {
			revLabel = "Revenue (excl. VAT)"
			costsLabel = "Costs (excl. VAT)"
			resLabel = "Net Result"
		}

		// Row 1: KPI boxes
		pdf.Rect(15, pdf.GetY(), 58, 18, "F")
		pdf.Rect(76, pdf.GetY(), 58, 18, "F")
		pdf.Rect(137, pdf.GetY(), 58, 18, "F")

		currY := pdf.GetY()
		// Box 1
		pdf.SetXY(17, currY+2)
		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(54, 4, revLabel)
		pdf.SetXY(17, currY+7)
		pdf.SetFont("Geist", "B", 12)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(54, 6, FormatCurrency(data.RevenueExclVatCents, b.lang))

		// Box 2
		pdf.SetXY(78, currY+2)
		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(54, 4, costsLabel)
		pdf.SetXY(78, currY+7)
		pdf.SetFont("Geist", "B", 12)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(54, 6, FormatCurrency(data.TotalCostsExclVatCents, b.lang))

		// Box 3
		pdf.SetXY(139, currY+2)
		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(54, 4, resLabel)
		pdf.SetXY(139, currY+7)
		pdf.SetFont("Geist", "B", 12)
		if data.NetResultCents >= 0 {
			pdf.SetTextColor(22, 101, 52) // Green
		} else {
			pdf.SetTextColor(185, 28, 28) // Red
		}
		pdf.Cell(54, 6, FormatCurrency(data.NetResultCents, b.lang))
		pdf.SetY(currY + 24)

		// Table: Costs by Category
		secHeader := "Kosten per categorie"
		thCat := "Categorie"
		thCount := "Aantal"
		thExcl := "Excl. btw"
		thVat := "Btw"
		thTotal := "Totaal"
		thTot := "Totaal kosten"
		if b.lang == "en" {
			secHeader = "Costs by category"
			thCat = "Category"
			thCount = "Count"
			thExcl = "Excl. VAT"
			thVat = "VAT"
			thTotal = "Total"
			thTot = "Total costs"
		}

		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, secHeader)
		pdf.Ln(7)

		// Table Header
		pdf.SetFont("Geist", "B", 9)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(60, 7, thCat, "1", 0, "L", true, 0, "")
		pdf.CellFormat(20, 7, thCount, "1", 0, "C", true, 0, "")
		pdf.CellFormat(35, 7, thExcl, "1", 0, "R", true, 0, "")
		pdf.CellFormat(30, 7, thVat, "1", 0, "R", true, 0, "")
		pdf.CellFormat(35, 7, thTotal, "1", 1, "R", true, 0, "")

		// Table Rows
		pdf.SetFont("Geist", "", 9)
		pdf.SetTextColor(15, 23, 42)
		fill := false
		for _, cat := range data.CategoryCosts {
			pdf.SetFillColor(248, 250, 252)
			pdf.CellFormat(60, 6, cat.Category, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(20, 6, fmt.Sprintf("%d", cat.Count), "1", 0, "C", fill, 0, "")
			pdf.CellFormat(35, 6, FormatCurrency(cat.NetCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(30, 6, FormatCurrency(cat.VatCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(35, 6, FormatCurrency(cat.TotalCents, b.lang), "1", 1, "R", fill, 0, "")
			fill = !fill
		}

		// Table Totals
		pdf.SetFont("Geist", "B", 9)
		pdf.SetFillColor(241, 245, 249)
		pdf.CellFormat(80, 7, thTot, "1", 0, "L", true, 0, "")
		pdf.CellFormat(35, 7, FormatCurrency(data.TotalCostsExclVatCents, b.lang), "1", 0, "R", true, 0, "")
		pdf.CellFormat(30, 7, FormatCurrency(data.TotalCostsVatCents, b.lang), "1", 0, "R", true, 0, "")
		pdf.CellFormat(35, 7, FormatCurrency(data.TotalCostsTotalCents, b.lang), "1", 1, "R", true, 0, "")
	}

	b.drawUnreviewedNotice(pdf, data.UnreviewedExpensesCount)
	b.drawNonEurNotice(pdf, len(data.NonEurInvoices), len(data.NonEurExpenses))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildVatSummaryPDF renders the VAT Summary report.
func (b *PDFBuilder) BuildVatSummaryPDF(data *VatSummaryData) ([]byte, error) {
	pdf := b.createPDF()
	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	b.drawHeader(pdf, ReportTitle(model.ReportKeyVatSummary, b.lang), periodLabel)

	if data.IsEmpty && len(data.Rubrieken) == 0 {
		b.drawEmptyNotice(pdf)
	} else {
		thCode := "Rubriek"
		thDesc := "Omschrijving"
		thTurnover := "Omzet"
		thVat := "Omzetbelasting"
		if b.lang == "en" {
			thCode = "Section"
			thDesc = "Description"
			thTurnover = "Turnover"
			thVat = "VAT"
		}

		// Table Header
		pdf.SetFont("Geist", "B", 9)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(20, 7, thCode, "1", 0, "C", true, 0, "")
		pdf.CellFormat(85, 7, thDesc, "1", 0, "L", true, 0, "")
		pdf.CellFormat(38, 7, thTurnover, "1", 0, "R", true, 0, "")
		pdf.CellFormat(37, 7, thVat, "1", 1, "R", true, 0, "")

		// Table Rows
		pdf.SetFont("Geist", "", 9)
		pdf.SetTextColor(15, 23, 42)
		fill := false
		for _, rub := range data.Rubrieken {
			pdf.SetFillColor(248, 250, 252)

			tStr := "-"
			if rub.Turnover != nil {
				tStr = FormatFloatCurrency(*rub.Turnover, b.lang)
			}
			vStr := "-"
			if rub.Vat != nil {
				vStr = FormatFloatCurrency(*rub.Vat, b.lang)
			}

			isHighlight := rub.Code == "5a" || rub.Code == "5b" || rub.Code == "5c"
			if isHighlight {
				pdf.SetFont("Geist", "B", 9)
			} else {
				pdf.SetFont("Geist", "", 9)
			}

			pdf.CellFormat(20, 6, rub.Code, "1", 0, "C", fill, 0, "")
			pdf.CellFormat(85, 6, rub.Label, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(38, 6, tStr, "1", 0, "R", fill, 0, "")
			pdf.CellFormat(37, 6, vStr, "1", 1, "R", fill, 0, "")
			fill = !fill
		}

		// Balance row
		pdf.Ln(4)
		pdf.SetFont("Geist", "B", 11)
		balLabel := "Totaal te betalen / te ontvangen"
		if b.lang == "en" {
			balLabel = "Total VAT payable / receivable"
		}
		pdf.SetFillColor(241, 245, 249)
		pdf.CellFormat(143, 8, balLabel, "1", 0, "L", true, 0, "")
		if data.Balance > 0 {
			pdf.SetTextColor(185, 28, 28) // To pay
		} else {
			pdf.SetTextColor(22, 101, 52) // Refund
		}
		pdf.CellFormat(37, 8, FormatFloatCurrency(data.Balance, b.lang), "1", 1, "R", true, 0, "")
	}

	b.drawUnreviewedNotice(pdf, data.UnreviewedExpensesCount)
	b.drawNonEurNotice(pdf, len(data.NonEurInvoices), len(data.NonEurExpenses))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildInvoicesPDF renders the Invoices & Open Items report.
func (b *PDFBuilder) BuildInvoicesPDF(data *InvoicesReportData) ([]byte, error) {
	pdf := b.createPDF()
	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	b.drawHeader(pdf, ReportTitle(model.ReportKeyInvoices, b.lang), periodLabel)

	if data.IsEmpty {
		b.drawEmptyNotice(pdf)
	} else {
		// Section 1: Invoices issued in period
		s1Title := "Gefactureerd in periode"
		thNum := "Factuurnr"
		thClient := "Klant"
		thDate := "Datum"
		thDue := "Vervaldatum"
		thStatus := "Status"
		thSub := "Subtotaal"
		thTot := "Totaal"
		if b.lang == "en" {
			s1Title = "Invoiced in period"
			thNum = "Invoice #"
			thClient = "Client"
			thDate = "Date"
			thDue = "Due Date"
			thStatus = "Status"
			thSub = "Subtotal"
			thTot = "Total"
		}

		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, s1Title)
		pdf.Ln(7)

		// Table 1 Header
		pdf.SetFont("Geist", "B", 8)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(28, 6, thNum, "1", 0, "L", true, 0, "")
		pdf.CellFormat(44, 6, thClient, "1", 0, "L", true, 0, "")
		pdf.CellFormat(22, 6, thDate, "1", 0, "C", true, 0, "")
		pdf.CellFormat(22, 6, thDue, "1", 0, "C", true, 0, "")
		pdf.CellFormat(20, 6, thStatus, "1", 0, "C", true, 0, "")
		pdf.CellFormat(22, 6, thSub, "1", 0, "R", true, 0, "")
		pdf.CellFormat(22, 6, thTot, "1", 1, "R", true, 0, "")

		// Rows
		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(15, 23, 42)
		fill := false
		for _, inv := range data.AllInvoices {
			cName := inv.ClientName
			if len(cName) > 24 {
				cName = cName[:21] + "..."
			}
			pdf.SetFillColor(248, 250, 252)
			pdf.CellFormat(28, 5.5, inv.InvoiceNumber, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(44, 5.5, cName, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(22, 5.5, inv.IssueDate, "1", 0, "C", fill, 0, "")
			pdf.CellFormat(22, 5.5, inv.DueDate, "1", 0, "C", fill, 0, "")
			pdf.CellFormat(20, 5.5, inv.Status, "1", 0, "C", fill, 0, "")
			pdf.CellFormat(22, 5.5, FormatCurrency(inv.SubtotalCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(22, 5.5, FormatCurrency(inv.TotalCents, b.lang), "1", 1, "R", fill, 0, "")
			fill = !fill
		}

		// Totals row
		pdf.SetFont("Geist", "B", 8)
		pdf.SetFillColor(241, 245, 249)
		pdf.CellFormat(136, 6, "Totaal", "1", 0, "L", true, 0, "")
		pdf.CellFormat(22, 6, FormatCurrency(data.AllInvoicesSubtotalCents, b.lang), "1", 0, "R", true, 0, "")
		pdf.CellFormat(22, 6, FormatCurrency(data.AllInvoicesTotalCents, b.lang), "1", 1, "R", true, 0, "")
		pdf.Ln(8)

		// Section 2: Open and Overdue items
		s2Title := fmt.Sprintf("Openstaande posten per peildatum (%s)", data.Period.To)
		thDays := "Dagen vervallen"
		if b.lang == "en" {
			s2Title = fmt.Sprintf("Open items as of %s", data.Period.To)
			thDays = "Days overdue"
		}

		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, s2Title)
		pdf.Ln(7)

		if len(data.OpenItems) == 0 {
			pdf.SetFont("Geist", "", 9)
			pdf.SetTextColor(100, 116, 139)
			noOpenMsg := "Geen openstaande posten op deze datum."
			if b.lang == "en" {
				noOpenMsg = "No open items as of this date."
			}
			pdf.Cell(180, 6, noOpenMsg)
			pdf.Ln(8)
		} else {
			pdf.SetFont("Geist", "B", 8)
			pdf.SetFillColor(241, 245, 249)
			pdf.SetTextColor(51, 65, 85)
			pdf.CellFormat(32, 6, thNum, "1", 0, "L", true, 0, "")
			pdf.CellFormat(50, 6, thClient, "1", 0, "L", true, 0, "")
			pdf.CellFormat(24, 6, thDue, "1", 0, "C", true, 0, "")
			pdf.CellFormat(28, 6, thStatus, "1", 0, "C", true, 0, "")
			pdf.CellFormat(22, 6, thDays, "1", 0, "C", true, 0, "")
			pdf.CellFormat(24, 6, thTot, "1", 1, "R", true, 0, "")

			pdf.SetFont("Geist", "", 8)
			fill = false
			for _, item := range data.OpenItems {
				inv := item.Invoice
				cName := inv.ClientName
				if len(cName) > 28 {
					cName = cName[:25] + "..."
				}
				statusText := "Openstaand"
				daysStr := "-"
				if item.IsOverdue {
					statusText = "Vervallen"
					daysStr = fmt.Sprintf("%d", item.DaysOverdue)
					if b.lang == "en" {
						statusText = "Overdue"
					}
					pdf.SetTextColor(185, 28, 28) // Red for overdue
				} else {
					if b.lang == "en" {
						statusText = "Open"
					}
					pdf.SetTextColor(15, 23, 42)
				}
				pdf.SetFillColor(248, 250, 252)
				pdf.CellFormat(32, 5.5, inv.InvoiceNumber, "1", 0, "L", fill, 0, "")
				pdf.CellFormat(50, 5.5, cName, "1", 0, "L", fill, 0, "")
				pdf.CellFormat(24, 5.5, inv.DueDate, "1", 0, "C", fill, 0, "")
				pdf.CellFormat(28, 5.5, statusText, "1", 0, "C", fill, 0, "")
				pdf.CellFormat(22, 5.5, daysStr, "1", 0, "C", fill, 0, "")
				pdf.CellFormat(24, 5.5, FormatCurrency(inv.TotalCents, b.lang), "1", 1, "R", fill, 0, "")
				fill = !fill
			}
			pdf.SetTextColor(15, 23, 42)
			pdf.SetFont("Geist", "B", 8)
			pdf.SetFillColor(241, 245, 249)
			pdf.CellFormat(156, 6, "Totaal openstaand", "1", 0, "L", true, 0, "")
			pdf.CellFormat(24, 6, FormatCurrency(data.TotalOpenCents, b.lang), "1", 1, "R", true, 0, "")
			pdf.Ln(8)
		}

		// Section 3: Revenue per client
		s3Title := "Omzet per klant (excl. btw)"
		if b.lang == "en" {
			s3Title = "Revenue by client (excl. VAT)"
		}
		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, s3Title)
		pdf.Ln(7)

		pdf.SetFont("Geist", "B", 8)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(90, 6, thClient, "1", 0, "L", true, 0, "")
		pdf.CellFormat(30, 6, "Facturen", "1", 0, "C", true, 0, "")
		pdf.CellFormat(30, 6, thSub, "1", 0, "R", true, 0, "")
		pdf.CellFormat(30, 6, thTot, "1", 1, "R", true, 0, "")

		pdf.SetFont("Geist", "", 8)
		pdf.SetTextColor(15, 23, 42)
		fill = false
		for _, cItem := range data.ClientBreakdown {
			pdf.SetFillColor(248, 250, 252)
			pdf.CellFormat(90, 5.5, cItem.ClientName, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(30, 5.5, fmt.Sprintf("%d", cItem.Count), "1", 0, "C", fill, 0, "")
			pdf.CellFormat(30, 5.5, FormatCurrency(cItem.SubtotalCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(30, 5.5, FormatCurrency(cItem.TotalCents, b.lang), "1", 1, "R", fill, 0, "")
			fill = !fill
		}
	}

	b.drawNonEurNotice(pdf, len(data.NonEurInvoices), 0)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// BuildExpensesPDF renders the Expenses by Category report.
func (b *PDFBuilder) BuildExpensesPDF(data *ExpensesReportData) ([]byte, error) {
	pdf := b.createPDF()
	periodLabel := data.Period.LabelNL
	if b.lang == "en" {
		periodLabel = data.Period.LabelEN
	}
	b.drawHeader(pdf, ReportTitle(model.ReportKeyExpenses, b.lang), periodLabel)

	if data.IsEmpty {
		b.drawEmptyNotice(pdf)
	} else {
		// Category breakdown
		s1Title := "Totalen per categorie"
		thCat := "Categorie"
		thCount := "Aantal"
		thNet := "Netto"
		thVat := "Btw"
		thTot := "Totaal"
		if b.lang == "en" {
			s1Title = "Totals by category"
			thCat = "Category"
			thCount = "Count"
			thNet = "Net"
			thVat = "VAT"
			thTot = "Total"
		}

		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, s1Title)
		pdf.Ln(7)

		pdf.SetFont("Geist", "B", 8.5)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(60, 6.5, thCat, "1", 0, "L", true, 0, "")
		pdf.CellFormat(24, 6.5, thCount, "1", 0, "C", true, 0, "")
		pdf.CellFormat(32, 6.5, thNet, "1", 0, "R", true, 0, "")
		pdf.CellFormat(32, 6.5, thVat, "1", 0, "R", true, 0, "")
		pdf.CellFormat(32, 6.5, thTot, "1", 1, "R", true, 0, "")

		pdf.SetFont("Geist", "", 8.5)
		pdf.SetTextColor(15, 23, 42)
		fill := false
		for _, cat := range data.CategoryBreakdown {
			pdf.SetFillColor(248, 250, 252)
			pdf.CellFormat(60, 5.5, cat.Category, "1", 0, "L", fill, 0, "")
			pdf.CellFormat(24, 5.5, fmt.Sprintf("%d", cat.Count), "1", 0, "C", fill, 0, "")
			pdf.CellFormat(32, 5.5, FormatCurrency(cat.NetCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(32, 5.5, FormatCurrency(cat.VatCents, b.lang), "1", 0, "R", fill, 0, "")
			pdf.CellFormat(32, 5.5, FormatCurrency(cat.TotalCents, b.lang), "1", 1, "R", fill, 0, "")
			fill = !fill
		}

		// Totals row
		pdf.SetFont("Geist", "B", 8.5)
		pdf.SetFillColor(241, 245, 249)
		pdf.CellFormat(84, 6.5, "Totaal", "1", 0, "L", true, 0, "")
		pdf.CellFormat(32, 6.5, FormatCurrency(data.AllExpensesNetCents, b.lang), "1", 0, "R", true, 0, "")
		pdf.CellFormat(32, 6.5, FormatCurrency(data.AllExpensesVatCents, b.lang), "1", 0, "R", true, 0, "")
		pdf.CellFormat(32, 6.5, FormatCurrency(data.AllExpensesTotalCents, b.lang), "1", 1, "R", true, 0, "")
		pdf.Ln(8)

		// Receipts summary
		recTitle := "Bonnen controle"
		if b.lang == "en" {
			recTitle = "Receipts verification"
		}
		pdf.SetFont("Geist", "B", 11)
		pdf.SetTextColor(15, 23, 42)
		pdf.Cell(180, 6, recTitle)
		pdf.Ln(7)

		pdf.SetFont("Geist", "", 9)
		recMsg := fmt.Sprintf("Met bon: %d uitgaven (%s)   |   Zonder bon: %d uitgaven (%s)",
			data.WithReceiptCount, FormatCurrency(data.WithReceiptTotalCents, b.lang),
			data.WithoutReceiptCount, FormatCurrency(data.WithoutReceiptTotalCents, b.lang))
		if b.lang == "en" {
			recMsg = fmt.Sprintf("With receipt: %d expenses (%s)   |   Without receipt: %d expenses (%s)",
				data.WithReceiptCount, FormatCurrency(data.WithReceiptTotalCents, b.lang),
				data.WithoutReceiptCount, FormatCurrency(data.WithoutReceiptTotalCents, b.lang))
		}
		pdf.Cell(180, 6, recMsg)
		pdf.Ln(8)
	}

	b.drawUnreviewedNotice(pdf, data.UnreviewedExpensesCount)
	b.drawNonEurNotice(pdf, 0, len(data.NonEurExpenses))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}