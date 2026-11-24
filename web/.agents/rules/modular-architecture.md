# Architecture Guidelines: Modular Building Blocks & Lean Pages

Always adhere to the **Modular Building Blocks & Lean Pages** architecture in this project:

1. **Pages as Assembly Floor**:
   - Files in `src/app/(pages)/*` must stay lean (target < 400–500 lines).
   - Pages are strictly for assembly: managing high-level state, search/filter criteria, mounting modals, and rendering building blocks.
   - NEVER define 100+ lines of mock data, complex SVG previews, or giant wizard schemas inside a page file.

2. **Reusable Pure Logic & Formatters in `src/lib/`**:
   - Currency formatters (e.g. `formatEuro`, `formatCurrency`) and domain math (e.g. `calculateLineItemsTotals`) must live in `src/lib/formatCurrency.js`.
   - Date formatters, clipboard utilities, and string cleaners must live in `src/lib/`.

3. **Datasets & Constants in `src/data/`**:
   - Mock data, initial arrays, trade types, tax rates, payment methods, and filter options must live in `src/data/` (e.g. `invoices.js`, `clients.js`).

4. **Reusable UI Building Blocks in `src/components/`**:
   - Any complex UI section, live preview, or itemized sub-editor (e.g. `ClientInvoicePreview.jsx`, `LineItemsEditor.jsx`, `ClientAutocomplete.jsx`) must be in its own file under `src/components/`.

5. **Form Schemas in `src/schemas/`**:
   - Multi-step wizard steps and field arrays must live in `src/schemas/` (e.g. `invoiceFormSchema.jsx`).
