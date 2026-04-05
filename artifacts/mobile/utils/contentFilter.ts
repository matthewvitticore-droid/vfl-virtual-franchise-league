const BLOCKED = [
  "fuck","shit","ass","bitch","cunt","dick","pussy","cock","nigger","nigga",
  "faggot","fag","retard","nazi","kike","spic","chink","gook","whore","slut",
  "rape","jizz","piss","bastard","asshole","damn","crap","balls",
];

export function isClean(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z]/g, "");
  return !BLOCKED.some(w => lower.includes(w));
}

export function sanitize(text: string, maxLen = 32): string {
  return text.trim().replace(/[^a-zA-Z0-9\s\-'.&]/g, "").slice(0, maxLen);
}

export function sanitizeAbbr(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function autoAbbr(city: string, name: string): string {
  const words = (city + " " + name).split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  return (words[0] ?? "VFL").slice(0, 3).toUpperCase();
}
