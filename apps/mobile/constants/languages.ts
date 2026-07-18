// Static list of languages a member can choose to "follow" on their profile.
// No shared language enum exists elsewhere in the app yet, so this is a
// curated starting list (same static-array approach as timezones.ts).
// "ALL" is a sentinel meaning "follow every language" — it's the default and
// is mutually exclusive with picking specific languages.
export const ALL_LANGUAGES = "ALL";

export const LANGUAGES: string[] = [
  "English",
  "Mandarin Chinese",
  "Cantonese",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Tagalog",
  "Hindi",
  "Arabic",
  "Russian",
  "Dutch",
  "Turkish",
];
