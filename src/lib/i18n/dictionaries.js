/**
 * UI translations. Every language has its own file in ./locales (see README.md there).
 * Keys are nested by area; look them up with t("settings.lists.title").
 * Missing keys fall back to Dutch, then to the key itself.
 * Placeholders: t("settings.invoices.termDays", { count: 14 }) fills {count}.
 */
import en from "./locales/en.json";
import nl from "./locales/nl.json";

export const DEFAULT_LANGUAGE = "nl";

/** Languages the user can choose in Settings → Language & display */
export const SUPPORTED_LANGUAGES = [
  { code: "nl", label: "Nederlands" },
  { code: "en", label: "English" },
];

const DICTIONARIES = { nl, en };

function lookup(dictionary, key) {
  return key
    .split(".")
    .reduce(
      (node, part) =>
        node && typeof node === "object" ? node[part] : undefined,
      dictionary,
    );
}

/**
 * @param {string} language
 * @param {string} key - dot path, e.g. "settings.lists.title"
 * @param {Record<string, string | number>} [vars]
 */
export function translate(language, key, vars) {
  const value =
    lookup(DICTIONARIES[language], key) ??
    lookup(DICTIONARIES[DEFAULT_LANGUAGE], key);
  if (typeof value !== "string") return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}
