// Static list of geographic/business markets a member can choose to "follow"
// on their profile. No shared market enum exists elsewhere in the app yet;
// this leads with the China / non-China split already used for video links
// elsewhere in the app (chinaVideoLink / nonChinaVideoLink).
// "ALL" is a sentinel meaning "follow every market" — it's the default and
// is mutually exclusive with picking specific markets.
export const ALL_MARKETS = "ALL";

export const MARKETS: string[] = [
  "Greater China",
  "North America",
  "Latin America",
  "Europe",
  "Southeast Asia",
  "South Asia",
  "Middle East",
  "Africa",
  "Oceania",
];
