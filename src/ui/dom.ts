type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "function") node.addEventListener(key.replace(/^on/, "").toLowerCase(), value);
    else if (typeof value === "boolean") (node as unknown as Record<string, unknown>)[key] = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

const claims = new WeakMap<HTMLElement, number>();

/**
 * Mark `root` as owned by the screen being rendered. The returned function reports whether
 * that screen is still the one showing, so late async work can drop its render if the user moved on.
 */
export function claimRoot(root: HTMLElement): () => boolean {
  const claim = (claims.get(root) ?? 0) + 1;
  claims.set(root, claim);
  return () => claims.get(root) === claim;
}
