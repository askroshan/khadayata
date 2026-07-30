export type SupportedLanguage = "en" | "gu" | "hi";

export interface MultilingualContent {
  en?: string;
  gu?: string;
  hi?: string;
}

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  gu: "Gujarati",
  hi: "Hindi",
};

export const LANGUAGE_NATIVE: Record<SupportedLanguage, string> = {
  en: "English",
  gu: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0",
  hi: "\u0939\u093F\u0928\u094D\u0926\u0940",
};

export function getLocalizedContent(
  content: MultilingualContent | string | null | undefined,
  language: SupportedLanguage
): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  return content[language] || content.en || content.gu || content.hi || "";
}

export function hasTranslation(
  content: MultilingualContent | string | null | undefined,
  language: SupportedLanguage
): boolean {
  if (!content) return false;
  if (typeof content === "string") return language === "en";
  return !!content[language];
}

export function getAvailableLanguages(
  content: MultilingualContent | string | null | undefined
): SupportedLanguage[] {
  if (!content) return [];
  if (typeof content === "string") return ["en"];
  return (Object.keys(content) as SupportedLanguage[]).filter(
    (lang) => !!content[lang]
  );
}

export function getPreferredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem("preferred-language");
  if (stored && (stored === "en" || stored === "gu" || stored === "hi")) {
    return stored;
  }
  return "en";
}

export function setPreferredLanguage(lang: SupportedLanguage): void {
  localStorage.setItem("preferred-language", lang);
}
