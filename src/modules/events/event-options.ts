export const EVENT_CITIES = [
  "Las Vegas, USA", "Singapore", "Davos, Switzerland", "Aspen, USA", "Monaco",
  "Bogotá, Colombia", "Medellín, Colombia", "Mexico City, Mexico", "Buenos Aires, Argentina",
] as const;

export const EVENT_CATEGORIES = [
  "Sports", "Luxury", "Investing", "Startups", "Technology", "Entertainment",
  "Web3", "Real Estate", "Fashion", "Media",
] as const;

export const EVENT_AUDIENCE_OPTIONS = [
  "Founders", "Investors", "Family Offices", "Executives", "Brands", "Sponsors",
  "Creators", "Media", "Athletes", "Government", "Service Providers",
] as const;

export const EVENT_TIMEZONES: Record<(typeof EVENT_CITIES)[number], string> = {
  "Las Vegas, USA": "America/Los_Angeles",
  Singapore: "Asia/Singapore",
  "Davos, Switzerland": "Europe/Zurich",
  "Aspen, USA": "America/Denver",
  Monaco: "Europe/Monaco",
  "Bogotá, Colombia": "America/Bogota",
  "Medellín, Colombia": "America/Bogota",
  "Mexico City, Mexico": "America/Mexico_City",
  "Buenos Aires, Argentina": "America/Argentina/Buenos_Aires",
};
