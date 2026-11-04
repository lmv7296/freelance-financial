# Translations

Every language has one file here with all texts of the app. `nl.json` is the source:
new texts are added there first, then to every other language.

## Adding a language

1. Copy `en.json` to `<code>.json` (ISO 639-1 code, e.g. `de.json`) and translate the
   values. Leave the keys and the `{placeholders}` as they are.
2. In `src/lib/i18n/dictionaries.js`: import the file, add it to `DICTIONARIES` and to
   `SUPPORTED_LANGUAGES` (the label is the language's own name, e.g. "Deutsch").
3. Run `pnpm i18n:check`. It lists missing keys, extra keys and placeholders that
   don't match the Dutch file.

A key that is missing in a language falls back to Dutch, so a half-finished
translation still works.

## Writing texts

- `{name}` is filled in by the app, e.g. `"Nog {count} dagen"`.
- Keys are grouped by page or area: `expenses.*`, `taxVault.*`, `auth.*`, …
- Amounts and dates are formatted by the app per language; don't put them in the text.
- Dutch: "btw" in lower case in running text ("btw-aangifte", "excl. btw"), as the
  Belastingdienst writes it.
