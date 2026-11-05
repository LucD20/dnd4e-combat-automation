import { areEnemies, isDefeated } from "../utils.mjs";

/*
 * Squares a token can reach with a shift or a forced movement (push / pull / slide), on a square grid.
 *
 *  - Each step is one square in any of the 8 directions (diagonals cost 1, like the rest of the module).
 *  - Walls block a step (tested centre to centre with the movement collision backend).
 *  - The mover can pass through the squares of its allies but not of its enemies, and can only stop
 *    on squares no other creature occupies (defeated creatures don't count).
 *  - push: every step must end farther from the source; pull: every step must end closer.
 *  - "Up to N squares": every reachable square within N steps is a valid destination.
 *
 * Positions are grid offsets of the token's top-left square: { i: row, j: column }.
 */

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export const key = (p) => `${p.i},${p.j}`;

/** Footprint rectangle (inclusive) of a token whose top-left square is `p`. */
export function rectAt(p, w, h) {
	return { i0: p.i, j0: p.j, i1: p.i + h - 1, j1: p.j + w - 1 };
}

function overlaps(a, b) {
	return a.i0 <= b.i1 && b.i0 <= a.i1 && a.j0 <= b.j1 && b.j0 <= a.j1;
}

/** Chebyshev distance between two footprints (0 = overlapping, 1 = adjacent). */
export function rectDistance(a, b) {
	const di = Math.max(0, b.i0 - a.i1, a.i0 - b.i1);
	const dj = Math.max(0, b.j0 - a.j1, a.j0 - b.j1);
	return Math.max(di, dj);
}

function sizeOf(tokenDoc) {
	return { w: Math.max(1, Math.round(tokenDoc.width)), h: Math.max(1, Math.round(tokenDoc.height)) };
}

/** Grid offset of a token's top-left square. */
export function offsetOf(tokenDoc) {
	const size = canvas.grid.size;
	return { i: Math.round(tokenDoc.y / size), j: Math.round(tokenDoc.x / size) };
}

export function tokenRect(token) {
	const doc = token.document ?? token;
	const { w, h } = sizeOf(doc);
	return rectAt(offsetOf(doc), w, h);
}

/** Top-left canvas point of a grid offset. */
export function pointOf(p) {
	const size = canvas.grid.size;
	return { x: p.j * size, y: p.i * size };
}

function centerOf(p, w, h) {
	const size = canvas.grid.size;
	return { x: (p.j + w / 2) * size, y: (p.i + h / 2) * size };
}

function wallBetween(a, b, w, h) {
	const backend = CONFIG.Canvas?.polygonBackends?.move;
	if (!backend?.testCollision) return false;
	try {
		return !!backend.testCollision(centerOf(a, w, h), centerOf(b, w, h), { type: "move", mode: "any" });
	} catch (err) {
		return false;
	}
}

function insideScene(p, w, h) {
	const r = canvas.dimensions?.sceneRect;
	if (!r) return true;
	const size = canvas.grid.size;
	const x = p.j * size, y = p.i * size;
	return x >= r.x - 1 && y >= r.y - 1 && x + w * size <= r.x + r.width + 1 && y + h * size <= r.y + r.height + 1;
}

/**
 * @param {Token} token                The token being moved
 * @param {object} opts
 * @param {"shift"|"push"|"pull"|"slide"} opts.mode
 * @param {number} opts.squares        Maximum number of squares
 * @param {Token} [opts.source]        The creature pushing/pulling (required for push/pull)
 * @param {Token[]} [opts.others]      Creatures on the map (defaults to the canvas tokens)
 * @returns {Map<string, {pos, steps, path: {i,j}[]}>}  Reachable destinations (path excludes the start)
 */
export function reachable(token, { mode, squares, source = null, others = null }) {
	const doc = token.document;
	const { w, h } = sizeOf(doc);
	const start = offsetOf(doc);
	const sourceRect = source ? tokenRect(source) : null;
	const creatures = (others ?? canvas.tokens.placeables)
		.filter((t) => t !== token && t !== source && t.actor && !t.document.hidden && !isDefeated(t))
		.map((t) => ({ rect: tokenRect(t), enemy: areEnemies(token, t) }));
	// The source occupies its squares too (and is never passable for the target being pushed/pulled)
	if (source && source !== token && !isDefeated(source)) creatures.push({ rect: sourceRect, enemy: true });

	const blockedPass = (r) => creatures.some((c) => c.enemy && overlaps(r, c.rect));
	const blockedStop = (r) => creatures.some((c) => overlaps(r, c.rect));
	const dist = (p) => rectDistance(rectAt(p, w, h), sourceRect);

	const result = new Map();
	const seen = new Map([[key(start), { pos: start, steps: 0, path: [] }]]);
	let frontier = [seen.get(key(start))];
	for (let step = 1; step <= squares; step++) {
		const next = [];
		for (const node of frontier) {
			for (const [di, dj] of DIRS) {
				const p = { i: node.pos.i + di, j: node.pos.j + dj };
				const k = key(p);
				if (seen.has(k)) continue;
				if (!insideScene(p, w, h)) continue;
				const r = rectAt(p, w, h);
				if (blockedPass(r)) continue;
				if (mode === "push" && sourceRect && dist(p) <= dist(node.pos)) continue;
				if (mode === "pull" && sourceRect && dist(p) >= dist(node.pos)) continue;
				if (wallBetween(node.pos, p, w, h)) continue;
				const entry = { pos: p, steps: step, path: [...node.path, p] };
				seen.set(k, entry);
				next.push(entry);
				if (!blockedStop(r)) result.set(k, entry);
			}
		}
		frontier = next;
		if (!frontier.length) break;
	}
	return result;
}
