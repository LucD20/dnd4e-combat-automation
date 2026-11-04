import { MODULE_ID, KIND } from "./constants.mjs";
import { setting } from "./utils.mjs";

/*
 * Big, coloured badges on a token for quarry / curse / mark: the portrait of whoever applied it
 * inside a ring in the kind's colour, stacked down the token's top-right corner. The small
 * status icon on the left is kept as well.
 */

export const BADGE_KINDS = {
	[KIND.QUARRY]: { color: 0x2e7d32, icon: `modules/${MODULE_ID}/icons/quarry.svg` },
	[KIND.CURSE]: { color: 0x7b1fa2, icon: `modules/${MODULE_ID}/icons/curse.svg` },
	[KIND.MARK]: { color: 0xc62828, icon: `modules/${MODULE_ID}/icons/mark.svg` },
};

const CONTAINER = `${MODULE_ID}-badges`;

function badgeEntries(token) {
	const actor = token.actor;
	if (!actor) return [];
	const entries = [];
	for (const e of actor.effects) {
		if (e.disabled) continue;
		const flags = e.flags?.[MODULE_ID];
		if (BADGE_KINDS[flags?.kind]) {
			entries.push({ kind: flags.kind, portrait: flags.portrait || BADGE_KINDS[flags.kind].icon, id: e.id });
		} else if (e.statuses?.has("mark")) {
			// Marks applied by the dnd4e system itself (e.g. a Fighter's power): show the marker too
			const markerUuid = e.system?.changes?.find((c) => c.key === "system.marker")?.value;
			const marker = markerUuid ? fromUuidSync(markerUuid) : null;
			const markerToken = marker?.getActiveTokens?.()[0];
			const portrait = markerToken?.document.texture.src || marker?.img || BADGE_KINDS[KIND.MARK].icon;
			entries.push({ kind: KIND.MARK, portrait, id: e.id });
		}
	}
	return entries;
}

async function texture(src) {
	const load = foundry.canvas?.loadTexture ?? globalThis.loadTexture;
	try {
		return await load(src);
	} catch (err) {
		return null;
	}
}

export async function refreshBadges(token) {
	if (!token?.actor || token.destroyed) return;
	const entries = setting("tokenBadges") ? badgeEntries(token) : [];
	const signature = entries.map((e) => `${e.kind}:${e.portrait}`).join("|") + `@${token.w}`;
	let container = token.getChildByName?.(CONTAINER);
	if (container && container.d4eaSignature === signature) return;
	if (container) {
		token.removeChild(container);
		container.destroy({ children: true });
	}
	if (!entries.length) return;

	container = new PIXI.Container();
	container.name = CONTAINER;
	container.d4eaSignature = signature;
	container.eventMode = "none";
	token.addChild(container);

	const size = Math.max(24, Math.min(token.w, token.h) * 0.4);
	const r = size / 2;
	for (const [i, entry] of entries.entries()) {
		const badge = new PIXI.Container();
		badge.position.set(token.w - r * 0.6, r * 0.6 + i * (size * 0.9));

		const ring = new PIXI.Graphics();
		ring.beginFill(BADGE_KINDS[entry.kind].color).drawCircle(0, 0, r).endFill();
		badge.addChild(ring);

		const tex = await texture(entry.portrait);
		if (container.destroyed) return;
		if (tex) {
			const sprite = new PIXI.Sprite(tex);
			sprite.anchor.set(0.5);
			const inner = r * 0.82;
			const scale = (inner * 2) / Math.max(tex.width, tex.height);
			sprite.scale.set(scale);
			const mask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(0, 0, inner).endFill();
			badge.addChild(mask);
			sprite.mask = mask;
			badge.addChild(sprite);
		}

		// Kind glyph in the lower-left of the badge
		const glyphTex = await texture(BADGE_KINDS[entry.kind].icon);
		if (container.destroyed) return;
		if (glyphTex && entry.portrait !== BADGE_KINDS[entry.kind].icon) {
			const glyph = new PIXI.Sprite(glyphTex);
			glyph.anchor.set(0.5);
			glyph.width = glyph.height = r * 0.9;
			glyph.position.set(-r * 0.7, r * 0.7);
			badge.addChild(glyph);
		}
		container.addChild(badge);
	}
}

export function registerBadgeHooks() {
	Hooks.on("refreshToken", (token) => {
		refreshBadges(token);
	});
	const refreshFor = (effect) => {
		const actor = effect.parent;
		if (!(actor instanceof Actor)) return;
		for (const t of actor.getActiveTokens()) refreshBadges(t);
	};
	Hooks.on("createActiveEffect", refreshFor);
	Hooks.on("deleteActiveEffect", refreshFor);
	Hooks.on("updateActiveEffect", refreshFor);
}
