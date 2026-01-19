export const CARD_COUNT = 11;
export const TRIGGER_COUNT = CARD_COUNT - 1; // 10 trigger points between 11 cards
export const CARD_HEIGHT_VH = 70;
export const CARD_GAP_VH = 5;
export const CARD_UNIT_VH = CARD_HEIGHT_VH + CARD_GAP_VH; // 75vh per card

// Trigger zone within each 10% segment (relative to segment, so 0.4-0.6 means 4%-6% of the 10% segment)
export const TRIGGER_ZONE_LOW = 0.4; // 4% of segment = 40% within segment
export const TRIGGER_ZONE_HIGH = 0.6; // 6% of segment = 60% within segment

export const CARD_GRADIENTS = [
  'from-rose-500 to-pink-600',
  'from-orange-500 to-amber-600',
  'from-yellow-500 to-lime-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-sky-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-fuchsia-500 to-pink-600',
  'from-slate-500 to-zinc-600',
  'from-red-500 to-rose-600',
  'from-amber-500 to-orange-600',
] as const;

export function getCardGradient(index: number): (typeof CARD_GRADIENTS)[number] {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length] ?? CARD_GRADIENTS[0];
}
