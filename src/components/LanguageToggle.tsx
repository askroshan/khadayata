import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  SupportedLanguage,
  LANGUAGE_LABELS,
  LANGUAGE_NATIVE,
  getPreferredLanguage,
  setPreferredLanguage,
  getAvailableLanguages,
  MultilingualContent,
} from "@/lib/i18n-utils";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  content?: MultilingualContent | string | null;
  onChange: (language: SupportedLanguage) => void;
  className?: string;
}

export function LanguageToggle({ content, onChange, className = "" }: LanguageToggleProps) {
  const [current, setCurrent] = useState<SupportedLanguage>(getPreferredLanguage);
  const available = content ? getAvailableLanguages(content) : (["en", "gu", "hi"] as SupportedLanguage[]);

  useEffect(() => {
    onChange(current);
  }, [current, onChange]);

  if (available.length <= 1) return null;

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1.5" aria-hidden="true" />
      {available.map((lang) => (
        <Button
          key={lang}
          size="sm"
          variant={current === lang ? "default" : "ghost"}
          className={`h-7 px-2.5 text-xs font-medium ${current === lang ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            setCurrent(lang);
            setPreferredLanguage(lang);
          }}
          aria-label={`Switch to ${LANGUAGE_LABELS[lang]}`}
          title={LANGUAGE_NATIVE[lang]}
        >
          {LANGUAGE_LABELS[lang]}
        </Button>
      ))}
    </div>
  );
}
