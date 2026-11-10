package report

import (
	"math"
	"sort"
	"time"

	"go-freelancer/internal/model"
)

type CategoryCostItem struct {
	Category   string
	Count      int
	NetCents   int64
	VatCents   int64
	TotalCents int64
}

type OpenInvoiceItem struct {
	Invoice     *model.Invoice
	DaysOverdue int
	IsOverdue   bool
}

type ClientRevenueItem struct {
	ClientName    string
	Count         int
	SubtotalCents int64
	TotalCents    int64
}

type ProfitLossData struct {
	Period                  *PeriodInfo
	RevenueInvoices         []*model.Invoice
	RevenueExclVatCents     int64
	RevenueVatCents         int64
	RevenueTotalCents       int64
	CategoryCosts           []CategoryCostItem
	TotalCostsExclVatCents  int64
	TotalCostsVatCents      int64
	TotalCostsTotalCents    int64
	NetResultCents          int64
	UnreviewedExpensesCount int
	NonEurInvoices          []*model.Invoice
	NonEurExpenses          []*model.Expense
	IsEmpty                 bool
}

type VatSummaryData struct {
	Period                  *PeriodInfo
	Rubrieken               []model.VatRubriek
	VatDue5a                float64
	InputVat5b              float64
	Balance                 float64
	UsesKOR                 bool
	Warnings                []model.TaxWarning
	UnreviewedExpensesCount int
	NonEurInvoices          []*model.Invoice
	NonEurExpenses          []*model.Expense
	IsEmpty                 bool
}

type InvoicesReportData struct {
	Period                   *PeriodInfo
	AllInvoices              []*model.Invoice
	AllInvoicesSubtotalCents int64
	AllInvoicesVatCents      int64
	AllInvoicesTotalCents    int64
	OpenItems                []OpenInvoiceItem
	TotalOpenCents           int64
	TotalOverdueCents        int64
	ClientBreakdown          []ClientRevenueItem
	NonEurInvoices           []*model.Invoice
	IsEmpty                  bool
}

type ExpensesReportData struct {
	Period                  *PeriodInfo
	AllExpenses             []*model.Expense
	AllExpensesNetCents     int64
	AllExpensesVatCents     int64
	AllExpensesTotalCents   int64
	CategoryBreakdown       []CategoryCostItem
	WithReceiptCount        int
	WithReceiptTotalCents   int64
	WithoutReceiptCount     int
	WithoutReceiptTotalCents int64
	UnreviewedExpensesCount int
	NonEurExpenses          []*model.Expense
	IsEmpty                 bool
}

// BuildProfitLossData aggregates revenue and approved expenses for profit & loss.
func BuildProfitLossData(
	period *PeriodInfo,
	invoices []*model.Invoice,
	expenses []*model.Expense,
) *ProfitLossData {
	data := &ProfitLossData{
		Period: period,
	}

	// 1. Process Invoices in period (IssueDate within from and to, not DRAFT and not CANCELLED)
	for _, inv := range invoices {
		if inv.IssueDate == "" {
			continue
		}
		if inv.IssueDate < period.From || inv.IssueDate > period.To {
			continue
		}
		if inv.Status == model.InvoiceStatusDraft || inv.Status == model.InvoiceStatusCancelled {
			continue
		}
		// Non-EUR currency check
		if inv.Currency != "" && inv.Currency != "EUR" {
			data.NonEurInvoices = append(data.NonEurInvoices, inv)
			continue
		}

		data.RevenueInvoices = append(data.RevenueInvoices, inv)
		data.RevenueExclVatCents += inv.SubtotalCents
		data.RevenueVatCents += inv.VatAmountCents
		data.RevenueTotalCents += inv.TotalCents
	}

	// 2. Process Expenses in period (ReceiptDate within from and to)
	catMap := make(map[string]*CategoryCostItem)
	for _, exp := range expenses {
		if exp.ReceiptDate == nil || *exp.ReceiptDate == "" {
			continue
		}
		rDate := *exp.ReceiptDate
		if rDate < period.From || rDate > period.To {
			continue
		}
		if exp.Status == model.ExpenseStatusNeedsReview {
			data.UnreviewedExpensesCount++
			continue
		}
		if exp.Status != model.ExpenseStatusApproved {
			continue
		}
		// Non-EUR currency check
		if exp.Currency != "" && exp.Currency != "EUR" {
			data.NonEurExpenses = append(data.NonEurExpenses, exp)
			continue
		}

		cat := exp.Category
		if cat == nil || *cat == "" {
			defaultCat := "Overig"
			cat = &defaultCat
		}

		item, ok := catMap[*cat]
		if !ok {
			item = &CategoryCostItem{Category: *cat}
			catMap[*cat] = item
		}
		item.Count++

		var netCents int64
		if exp.SubtotalAmount != nil {
			netCents = int64(math.Round(*exp.SubtotalAmount * 100))
		} else {
			netCents = int64(math.Round(exp.TotalAmount * 100))
		}
		var vatCents int64
		if exp.VatAmount != nil {
			vatCents = int64(math.Round(*exp.VatAmount * 100))
		}
		totalCents := int64(math.Round(exp.TotalAmount * 100))

		item.NetCents += netCents
		item.VatCents += vatCents
		item.TotalCents += totalCents

		data.TotalCostsExclVatCents += netCents
		data.TotalCostsVatCents += vatCents
		data.TotalCostsTotalCents += totalCents
	}

	for _, item := range catMap {
		data.CategoryCosts = append(data.CategoryCosts, *item)
	}
	sort.Slice(data.CategoryCosts, func(i, j int) bool {
		return data.CategoryCosts[i].NetCents > data.CategoryCosts[j].NetCents
	})

	data.NetResultCents = data.RevenueExclVatCents - data.TotalCostsExclVatCents
	if len(data.RevenueInvoices) == 0 && len(data.CategoryCosts) == 0 {
		data.IsEmpty = true
	}

	return data
}

// BuildInvoicesReportData prepares the Invoices & Open Items report data.
func BuildInvoicesReportData(
	period *PeriodInfo,
	allInvoices []*model.Invoice,
) *InvoicesReportData {
	data := &InvoicesReportData{
		Period: period,
	}

	clientMap := make(map[string]*ClientRevenueItem)

	for _, inv := range allInvoices {
		// Part 1: All invoices issued in period
		if inv.IssueDate != "" && inv.IssueDate >= period.From && inv.IssueDate <= period.To {
			if inv.Currency != "" && inv.Currency != "EUR" {
				data.NonEurInvoices = append(data.NonEurInvoices, inv)
			} else {
				data.AllInvoices = append(data.AllInvoices, inv)
				data.AllInvoicesSubtotalCents += inv.SubtotalCents
				data.AllInvoicesVatCents += inv.VatAmountCents
				data.AllInvoicesTotalCents += inv.TotalCents

				// Client revenue (only for non-cancelled & non-draft)
				if inv.Status != model.InvoiceStatusDraft && inv.Status != model.InvoiceStatusCancelled {
					cName := inv.ClientName
					if cName == "" {
						cName = "Onbekende klant"
					}
					cItem, ok := clientMap[cName]
					if !ok {
						cItem = &ClientRevenueItem{ClientName: cName}
						clientMap[cName] = cItem
					}
					cItem.Count++
					cItem.SubtotalCents += inv.SubtotalCents
					cItem.TotalCents += inv.TotalCents
				}
			}
		}

		// Part 2: Open items on the 'to' date
		// Issued on or before 'to', not cancelled, and paid_at is null or after 'to'
		if inv.IssueDate != "" && inv.IssueDate <= period.To && inv.Status != model.InvoiceStatusCancelled {
			isOpen := false
			if inv.PaidAt == nil || *inv.PaidAt == "" || *inv.PaidAt > period.To {
				isOpen = true
			}
			if isOpen {
				daysOverdue := 0
				isOverdue := false
				if inv.DueDate != "" && inv.DueDate < period.To {
					isOverdue = true
					if dueT, err := time.Parse("2006-01-02", inv.DueDate); err == nil {
						days := int(period.ToTime.Sub(dueT).Hours() / 24)
						if days > 0 {
							daysOverdue = days
						}
					}
				}
				data.OpenItems = append(data.OpenItems, OpenInvoiceItem{
					Invoice:     inv,
					DaysOverdue: daysOverdue,
					IsOverdue:   isOverdue,
				})
				data.TotalOpenCents += inv.TotalCents
				if isOverdue {
					data.TotalOverdueCents += inv.TotalCents
				}
			}
		}
	}

	for _, cItem := range clientMap {
		data.ClientBreakdown = append(data.ClientBreakdown, *cItem)
	}
	sort.Slice(data.ClientBreakdown, func(i, j int) bool {
		return data.ClientBreakdown[i].SubtotalCents > data.ClientBreakdown[j].SubtotalCents
	})

	// Sort open items: overdue first, then by days overdue descending
	sort.Slice(data.OpenItems, func(i, j int) bool {
		if data.OpenItems[i].IsOverdue != data.OpenItems[j].IsOverdue {
			return data.OpenItems[i].IsOverdue
		}
		return data.OpenItems[i].DaysOverdue > data.OpenItems[j].DaysOverdue
	})

	if len(data.AllInvoices) == 0 && len(data.OpenItems) == 0 {
		data.IsEmpty = true
	}

	return data
}

// BuildExpensesReportData prepares the Expenses by Category report data.
func BuildExpensesReportData(
	period *PeriodInfo,
	allExpenses []*model.Expense,
) *ExpensesReportData {
	data := &ExpensesReportData{
		Period: period,
	}

	catMap := make(map[string]*CategoryCostItem)

	for _, exp := range allExpenses {
		if exp.ReceiptDate == nil || *exp.ReceiptDate == "" {
			continue
		}
		rDate := *exp.ReceiptDate
		if rDate < period.From || rDate > period.To {
			continue
		}
		if exp.Status == model.ExpenseStatusNeedsReview {
			data.UnreviewedExpensesCount++
			continue
		}
		if exp.Status != model.ExpenseStatusApproved {
			continue
		}
		if exp.Currency != "" && exp.Currency != "EUR" {
			data.NonEurExpenses = append(data.NonEurExpenses, exp)
			continue
		}

		data.AllExpenses = append(data.AllExpenses, exp)

		var netCents int64
		if exp.SubtotalAmount != nil {
			netCents = int64(math.Round(*exp.SubtotalAmount * 100))
		} else {
			netCents = int64(math.Round(exp.TotalAmount * 100))
		}
		var vatCents int64
		if exp.VatAmount != nil {
			vatCents = int64(math.Round(*exp.VatAmount * 100))
		}
		totalCents := int64(math.Round(exp.TotalAmount * 100))

		data.AllExpensesNetCents += netCents
		data.AllExpensesVatCents += vatCents
		data.AllExpensesTotalCents += totalCents

		// Category grouping
		cat := exp.Category
		if cat == nil || *cat == "" {
			defaultCat := "Overig"
			cat = &defaultCat
		}
		cItem, ok := catMap[*cat]
		if !ok {
			cItem = &CategoryCostItem{Category: *cat}
			catMap[*cat] = cItem
		}
		cItem.Count++
		cItem.NetCents += netCents
		cItem.VatCents += vatCents
		cItem.TotalCents += totalCents

		// Receipt tracking
		hasReceipt := exp.ReceiptURL != "" || exp.ReceiptFilePath != ""
		if hasReceipt {
			data.WithReceiptCount++
			data.WithReceiptTotalCents += totalCents
		} else {
			data.WithoutReceiptCount++
			data.WithoutReceiptTotalCents += totalCents
		}
	}

	for _, cItem := range catMap {
		data.CategoryBreakdown = append(data.CategoryBreakdown, *cItem)
	}
	sort.Slice(data.CategoryBreakdown, func(i, j int) bool {
		return data.CategoryBreakdown[i].TotalCents > data.CategoryBreakdown[j].TotalCents
	})

	if len(data.AllExpenses) == 0 {
		data.IsEmpty = true
	}

	return data
}