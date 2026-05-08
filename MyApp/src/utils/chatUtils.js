/**
 * Deterministic hash for string to [0, 1) float
 */
export const hashStringToUnitFloat = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
};

/**
 * Apply deterministic jitter to coordinates for privacy
 */

/**
 * Generate a deterministic color for an anonymous user based on their ID
 */
export const getAnonymousColor = (id) => {
  const hues = [260, 280, 300, 320, 240, 200, 180]; // Purple, Blue, Teal variants
  const index = Math.floor(hashStringToUnitFloat(id) * hues.length);
  return `hsl(${hues[index]}, 70%, 75%)`;
};
