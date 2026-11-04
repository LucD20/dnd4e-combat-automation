/*
 * Powers that let *you* shift as part of them ("Shift 1 square before or after you attack",
 * "O bárbaro ajusta 2 quadrados antes de atacar") grant a free shift that doesn't cost a move action.
 * Shifts of the target or an ally ("the target shifts", "um aliado ajusta") are ignored.
 */

const PATTERNS = [
	/\bshifts?\s+(\d+)\s+squares?/gi,
	/\bajust(?:a|e|ar|am)\s+(\d+)\s+quadrados?/gi,
];
const OTHERS = /(target|ally|allies|enemy|creature|alvo|aliad[oa]s?|inimigo|criatura)\s*(can\s*|pode\s*)?$/i;

function plain(html) {
	return String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
}

/** Number of squares the power lets its user shift for free (0 = none). */
export function freeShiftFor(item) {
	const sys = item?.system;
	if (item?.type !== "power" || !sys) return 0;
	const texts = [sys.special, sys.effect?.detail, sys.hit?.detail, plain(sys.description?.value)];
	let best = 0;
	for (const text of texts) {
		if (!text) continue;
		for (const re of PATTERNS) {
			re.lastIndex = 0;
			for (const m of String(text).matchAll(re)) {
				const before = text.slice(Math.max(0, m.index - 25), m.index);
				if (OTHERS.test(before)) continue;
				best = Math.max(best, Number(m[1]) || 0);
			}
		}
	}
	return best;
}
