/*
 * Reads movement out of a power's text (EN / PT):
 *   forced movement  "push/pull/slide the target N squares", "o alvo é empurrado/puxado/conduzido N quadrados"
 *   ally shifts      "the target / an ally can shift N squares", "o aliado pode ajustar N quadrados"
 *   follow-up        "During the slide, you or one of your allies can make a melee basic attack" (+N power bonus)
 * The detail fields (Hit / Miss / Effect) are read first; without a match there, the description's
 * "Hit:/Sucesso:", "Miss:/Fracasso:" and "Effect:/Efeito:" paragraphs.
 */

const MODES = [
	{ mode: "push", re: /^(push|empurr)/i },
	{ mode: "pull", re: /^(pull|pux)/i },
	{ mode: "slide", re: /^(slide|conduz)/i },
];
const FORCED_RE = /\b(push(?:es|ed)?|pull(?:s|ed)?|slid(?:e|es|ing)|empurr\w*|pux\w*|conduz\w*|conduzid\w*)\b([^.;:]{0,40}?)\b(\d+)\s+(?:squares?|quadrados?)/gi;
const MINOR_RE = /minor action|a[çc][ãa]o m[íi]nima/i;
const ALLY_SHIFT_RE = /\b(ally|allies|target|each ally|aliad[oa]s?|alvo)\b[^.;]{0,30}?\b(shifts?|ajust\w*)\s+(\d+)\s+(?:squares?|quadrados?)/gi;
const FOLLOW_UP_RE = /(during the slide[^.]*melee basic attack|durante (?:a|o) (?:condu[çc][ãa]o|deslocamento)[^.]*ataque b[áa]sico corpo a corpo)/i;
const FOLLOW_UP_BONUS_RE = /\+(\d+) power bonus|b[ôo]nus de poder de \+?(\d+)|\+(\d+) de b[ôo]nus de poder/i;

function plain(html) {
	return String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
}

/** Split a power description into its Hit / Miss / Effect paragraphs. */
function descriptionSections(html) {
	const text = plain(html);
	const out = {};
	const re = /\b(Hit|Sucesso|Acerto|Miss|Fracasso|Erro|Effect|Efeito)\s*:/gi;
	const marks = [...text.matchAll(re)];
	for (const [n, m] of marks.entries()) {
		const end = marks[n + 1]?.index ?? text.length;
		const word = m[1].toLowerCase();
		const when = ["hit", "sucesso", "acerto"].includes(word) ? "hit" : ["miss", "fracasso", "erro"].includes(word) ? "miss" : "effect";
		out[when] = `${out[when] ?? ""} ${text.slice(m.index + m[0].length, end)}`;
	}
	return out;
}

function powerTexts(item) {
	const sys = item?.system ?? {};
	const fields = { hit: plain(sys.hit?.detail), miss: plain(sys.miss?.detail), effect: plain(sys.effect?.detail) };
	const forced = new RegExp(FORCED_RE.source, "i");
	const ally = new RegExp(ALLY_SHIFT_RE.source, "i");
	if (Object.values(fields).some((t) => forced.test(t) || ally.test(t))) return fields;
	return { ...fields, ...descriptionSections(sys.description?.value) };
}

/**
 * Forced movement in a power: [{ mode, squares, when: "hit"|"miss"|"effect", followUp }].
 * Only the first one per section, skipping repeatable "as a minor action" slides.
 */
export function forcedMovesFor(item) {
	const out = [];
	const texts = powerTexts(item);
	const all = Object.values(texts).join(" ");
	for (const when of ["hit", "miss", "effect"]) {
		const text = texts[when];
		if (!text) continue;
		for (const m of text.matchAll(FORCED_RE)) {
			const around = text.slice(m.index, m.index + m[0].length + 40);
			if (MINOR_RE.test(around)) continue;
			const mode = MODES.find((x) => x.re.test(m[1]))?.mode;
			if (!mode) continue;
			// "you slide each enemy" vs "the target": both apply to the power's targets
			let followUp = null;
			if (FOLLOW_UP_RE.test(all)) {
				const b = all.match(FOLLOW_UP_BONUS_RE);
				followUp = { bonus: Number(b?.[1] ?? b?.[2] ?? b?.[3]) || 0 };
			}
			out.push({ mode, squares: Number(m[3]), when, followUp });
			break;
		}
	}
	return out;
}

/** Shifts the power grants to its targets/allies: [{ squares, when }]. */
export function allyShiftsFor(item) {
	const out = [];
	const texts = powerTexts(item);
	for (const when of ["hit", "miss", "effect"]) {
		const text = texts[when];
		if (!text) continue;
		const m = [...text.matchAll(ALLY_SHIFT_RE)][0];
		if (m) out.push({ squares: Number(m[3]), when });
	}
	return out;
}
