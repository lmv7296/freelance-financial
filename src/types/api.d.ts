export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string; // Min 8 chars, max 72 chars
}

export interface RegisterResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  error: string;
}

export interface HealthResponse {
  status: "available" | "healthy";
  timestamp: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Expenses (receipts sent in via WhatsApp, data extracted by the backend)
// All amounts are decimal numbers in the expense currency (e.g. 42.1 = €42,10)
// ---------------------------------------------------------------------------

export type ExpenseStatus =
  | "processing" // receipt received, extraction still running
  | "needs_review" // extracted, waiting for a human check
  | "approved"
  | "rejected";

export interface ExpenseVatLine {
  rate: number; // percentage, e.g. 21, 9 or 0
  base_amount: number; // amount excl. BTW for this rate
  vat_amount: number;
}

export interface ExpenseLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number | null;
}

export interface Expense {
  id: string;
  status: ExpenseStatus;
  source: "whatsapp" | "upload" | string;
  sender_name: string | null;
  sender_phone: string | null;

  merchant_name: string | null;
  merchant_address: string | null;
  receipt_date: string | null; // YYYY-MM-DD
  payment_method: string | null;
  category: string | null;
  currency: string; // ISO 4217, e.g. "EUR"

  subtotal_amount: number | null; // total excl. BTW
  vat_amount: number | null; // total BTW
  total_amount: number | null; // total incl. BTW
  vat_lines: ExpenseVatLine[];
  line_items: ExpenseLineItem[];

  receipt_url: string; // image or PDF of the original receipt
  receipt_content_type: string | null; // e.g. "image/jpeg", "application/pdf"
  extraction_confidence: number | null; // 0..1, how sure the backend is

  client_id: string | null;
  client_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;

  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListExpensesResponse {
  expenses: Expense[];
}

export interface ExpenseResponse {
  expense: Expense;
}

export type UpdateExpenseRequest = Partial<
  Pick<
    Expense,
    | "status"
    | "merchant_name"
    | "merchant_address"
    | "receipt_date"
    | "payment_method"
    | "category"
    | "subtotal_amount"
    | "vat_amount"
    | "total_amount"
    | "vat_lines"
    | "line_items"
    | "client_id"
    | "invoice_id"
    | "notes"
    | "rejection_reason"
  >
>;
