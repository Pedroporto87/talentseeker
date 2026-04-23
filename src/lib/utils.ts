import { clsx } from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeKeyword(input: string) {
  return normalizeText(input).toLowerCase();
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join(" ");
}

export function summarizeList(values: string[], limit = 3) {
  return values.slice(0, limit).join(", ");
}
