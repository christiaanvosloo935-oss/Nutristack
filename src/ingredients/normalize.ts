const SYNONYMS: Array<[RegExp, string]> = [
  [/\bscallion\b/g, "spring onion"],
  [/\bgreen onion\b/g, "spring onion"],
  [/\bcilantro\b/g, "coriander"],
  [/\baubergine\b/g, "eggplant"],
  [/\bcourgette\b/g, "zucchini"],
];

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ss") || word.endsWith("us")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function normalizeIngredient(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  let result = cleaned.split(" ").map(singularize).join(" ");
  for (const [pattern, replacement] of SYNONYMS) result = result.replace(pattern, replacement);
  return result;
}
