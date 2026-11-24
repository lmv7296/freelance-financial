---
name: modular-building-blocks
description: >-
  Use this skill whenever creating, modifying, refactoring, or structuring pages,
  components, utilities, and schemas in this project. Enforces the Modular Building
  Blocks & Lean Pages Architecture: keeping page files strictly as assembly surfaces
  (under 400-500 lines), extracting reusable logic and formatters to src/lib/,
  domain datasets and constants to src/data/, sub-components and live previews to
  src/components/, and multi-step form schemas to src/schemas/.
---

# Modular Building Blocks & Lean Page Architecture

This skill governs the architectural separation of concerns across the codebase. Every feature must be built from modular, decoupled building blocks, with page files acting solely as the assembly floor.

---

## Core Philosophy

1. **The Page is an Assembly Floor**:
   - Page files (`src/app/(pages)/*`) must NEVER become monolithic dumping grounds for hundreds of lines of mock data, complex SVG/mockup previews, inline form schemas, or repetitive formatting functions.
   - Target line count for page files: **under 400–500 lines**.
   - A page's sole responsibility is: managing page-level state, search/filter criteria, triggering modals, and composing reusable building blocks.

2. **Everything Reusable is a Building Block**:
   - If a function, formatting helper, dataset, preview, or sub-form could conceivably be used in more than one place, it MUST live in its dedicated directory.

---

## Directory Organization & Responsibilities

```
src/
├── app/(pages)/       # Assembly only: Page layouts, high-level state & composition
├── components/        # Reusable UI building blocks (previews, editors, modals, widgets)
├── components/ui/     # Primitives (button, card, input, dialog)
├── data/              # Domain datasets, static constants, filters, options
├── lib/               # Pure logic, formatters, calculations, clipboard & utils
└── schemas/           # Multi-step wizard steps, form field definitions & validation
```

---

## Rules by Directory

### 1. `src/lib/` — Pure Logic, Formatting & Calculations
* **Formatters**: Any function that turns raw data into formatted strings (e.g. `formatEuro`, `formatCurrency`, `formatDate`, `formatPhone`).
* **Calculators**: Pure domain math (e.g. `calculateLineItemsTotals` for subtotal, VAT, and gross totals).
* **Browser Utilities**: Clipboard interaction (`copyToClipboard`), URL helpers, local storage sync.
* **Extensibility**: Design formatters to accept currency codes, locales, and options so they can be expanded without rewriting.

### 2. `src/data/` — Domain Data & Constants
* **Initial Datasets**: Seed data like `INITIAL_INVOICES`, `INITIAL_CLIENTS`.
* **Selection Options**: Reusable dropdown options like `TRADE_TYPES`, `PAYMENT_METHODS`, `VAT_RATES`.
* **Filter Tabs**: Tab lists like `STATUS_FILTERS`.

### 3. `src/components/` — UI Building Blocks & Previews
* **Complex Sub-Views**: Move sub-editors and live customer previews out of page files into their own components:
  * `ClientInvoicePreview.jsx`: Live customer preview (A4 invoice, smartphone screen, PIN receipt).
  * `LineItemsEditor.jsx`: Editable itemized table for labor/materials with live calculations.
  * `ClientAutocomplete.jsx`: Autocomplete input backed by client dossiers.
* **Component Decoupling**: Components must accept values and callbacks via props (`formValues`, `handleChange`, `onSelect`), avoiding tight coupling to specific page state.

### 4. `src/schemas/` — Form Schemas & Wizards
* **Wizard Configurations**: Multi-step wizard definitions (like `CREATE_INVOICE_STEPS`) and field schemas (`CREATE_INVOICE_FIELDS`).
* **Separation of Steps**: Ensure step definitions are strictly segregated (e.g. Step 1 is solely customer identity; Step 2 is solely work/pricing construction).

---

## Refactoring Checklist (Pre-Flight)

Before completing any page or feature implementation, run this pre-flight checklist:

1. [ ] **Page Size**: Is the page file under 500 lines? If not, identify large blocks to extract.
2. [ ] **Formatters**: Are formatters like `formatEuro` imported from `@/lib/formatCurrency`?
3. [ ] **Calculations**: Are calculations (e.g. `subtotal + vat`) unified in `@/lib/formatCurrency`?
4. [ ] **Datasets**: Are static mock arrays and selection lists imported from `@/data/`?
5. [ ] **Preview & Sub-Editors**: Are previews and editors in `@/components/`?
6. [ ] **Form Schemas**: Are large step/field arrays in `@/schemas/`?
7. [ ] **Biome Check**: Run `npx @biomejs/biome check src/` to verify zero errors and clean imports.
