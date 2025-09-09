export type Locale = "en";
const strings: Record<Locale, Record<string, string>> = {
  en: {
    performance: "Performance",
    dayNight: "Day / Night"
  }
};

export function t(key: string, locale: Locale = "en"): string {
  return strings[locale][key] ?? key;
}

