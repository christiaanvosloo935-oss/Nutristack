import type { Match, Recipe } from "./types";

export type EffortLevel = "quick" | "medium" | "long";

export interface Effort {
  minutes: number;
  level: EffortLevel;
}

export const EFFORT_LEVELS: Array<{ level: EffortLevel; emoji: string; title: string; range: string }> = [
  { level: "quick", emoji: "⚡", title: "Quick", range: "under 30 min" },
  { level: "medium", emoji: "🍳", title: "Medium", range: "30–60 min" },
  { level: "long", emoji: "🍲", title: "Long", range: "over an hour" },
];

const QUICK_MAX = 30;
const MEDIUM_MAX = 60;
const OVERNIGHT_MINUTES = 480;

export function levelForMinutes(minutes: number): EffortLevel {
  if (minutes <= QUICK_MAX) return "quick";
  return minutes <= MEDIUM_MAX ? "medium" : "long";
}

const DURATION = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)\b/gi;

/** Add up every duration written in the instructions (a range counts as its upper end). */
function writtenMinutes(instructions: string): number {
  const text = instructions
    .replace(/half an hour|half hour/gi, "30 minutes")
    .replace(/(\d+)\s+1\/2/g, "$1.5")
    .replace(/\b1\/2\b/g, "0.5");
  let total = 0;
  for (const [, from, to, unit] of text.matchAll(DURATION)) {
    const amount = Number(to ?? from);
    total += unit.toLowerCase().startsWith("h") ? amount * 60 : amount;
  }
  return total;
}

function sentenceCount(instructions: string): number {
  return instructions.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * TheMealDB has no cooking times, so estimate: written durations plus prep time,
 * or (with no durations written) prep plus a little per sentence of instructions.
 */
export function estimateEffort(recipe: Pick<Recipe, "ingredients" | "instructions">): Effort {
  const prep = 2 + recipe.ingredients.length;
  const written = writtenMinutes(recipe.instructions);
  let minutes = written > 0 ? written + prep : prep + sentenceCount(recipe.instructions) * 2.5;
  if (/overnight/i.test(recipe.instructions)) minutes = Math.max(minutes, OVERNIGHT_MINUTES);
  minutes = Math.max(10, roundTo5(minutes));
  return { minutes, level: levelForMinutes(minutes) };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `~${hours} h` : `~${hours} h ${rest} min`;
}

export function groupByEffort(matches: Match[]): Array<{ level: EffortLevel; matches: Match[] }> {
  const groups = new Map<EffortLevel, Match[]>();
  for (const m of matches) {
    const { level } = estimateEffort(m.recipe);
    groups.set(level, [...(groups.get(level) ?? []), m]);
  }
  return EFFORT_LEVELS.filter(({ level }) => groups.has(level)).map(({ level }) => ({ level, matches: groups.get(level)! }));
}
