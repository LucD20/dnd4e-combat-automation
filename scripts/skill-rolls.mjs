import { MODULE_ID } from "./constants.mjs";
import { setting } from "./utils.mjs";

/*
 * Skill checks:
 *  - The system rolls "1d20 + @mod" with the whole skill total in @mod. We split it into named parts
 *    (ability, training, ½ level, armour penalty, module bonuses such as Words of Friendship, the rest)
 *    so the roll dialog and the chat breakdown show where each number comes from. The total is unchanged.
 *  - Skill lists on actor sheets are sorted by their displayed label, so they stay alphabetical in any
 *    language (the system orders them by key: acr, arc, ath...).
 * Module bonuses on a skill: active effects with flags[MODULE_ID].skillBonus = { skill, value, var }.
 */

const TRAINING = { 8: "expertise", 5: "trained", 0: "untrained" };

/** Named parts for a skill check: [{ var, value }], adding up to the skill total. */
export function skillParts(actor, skillId) {
	const sys = actor?.system;
	const skl = sys?.skills?.[skillId];
	if (!skl || !Number.isFinite(Number(skl.total)) || Number.isFinite(parseInt(skl.absolute))) return null;
	const total = Number(skl.total);
	const parts = [];
	const add = (v, value) => { if (value) parts.push({ var: v, value }); };
	add(`ability_${skl.ability}`, Number(skl.mod) || 0);
	const tr = sys.skillTraining?.[TRAINING[skl.training]];
	add("training", tr ? (Number(tr.value) || 0) + (Number(tr.untyped) || 0) : 0);
	let halfLevel = true;
	try { halfLevel = !game.settings.get("dnd4e", "halfLevelOptions"); } catch (e) { /* default rules */ }
	if (halfLevel) add("lvhalf", Math.floor((Number(sys.details?.level) || 0) / 2));
	add("armourPen", -(Number(skl.armourPen) || 0));
	for (const e of actor.effects ?? []) {
		const b = e.flags?.[MODULE_ID]?.skillBonus;
		if (!b || e.disabled || b.skill !== skillId) continue;
		add(b.var, Number(b.value) || 0);
	}
	const known = parts.reduce((a, p) => a + p.value, 0);
	add("skillOther", total - known);
	return parts;
}

function wrapRollSkill() {
	const proto = CONFIG.Actor?.documentClass?.prototype;
	if (!proto?.rollSkill || proto.rollSkill.d4eaParts) return;
	const original = proto.rollSkill;
	const wrapped = function (skillId, options = {}) {
		try {
			if (setting("readableRolls") && !options.parts) {
				const parts = skillParts(this, skillId);
				if (parts?.length) {
					options.parts = parts.map((p) => `@${p.var}`);
					options.data = Object.fromEntries(parts.map((p) => [p.var, p.value]));
				}
			}
		} catch (err) {
			console.error(`${MODULE_ID} | skill parts`, err);
		}
		return original.call(this, skillId, options);
	};
	wrapped.d4eaParts = true;
	// Keep any wrapper flags set by other module code (Words of Friendship wraps the result)
	Object.assign(wrapped, original);
	proto.rollSkill = wrapped;
}

/* -------------------------------------------- */
/*  Roll dialog: show "3 (Charisma) + 5 (Training)" instead of variable names */
/* -------------------------------------------- */

export function onRenderRollDialog(app, element, labelFor) {
	const root = element instanceof HTMLElement ? element : element?.[0];
	const input = root?.querySelector("input[name='formula']");
	const data = app?.rollConfig?.data ?? app?.options?.rollConfig?.data;
	if (!input || !data || !/@(ability_|training|skillOther|armourPen|lvhalf)/.test(input.value)) return;
	input.value = input.value.replace(/@([A-Za-z0-9_]+)/g, (all, v) => {
		const value = Number(data[v]);
		if (v === "bonus" || !Number.isFinite(value)) return all;
		return `${value} (${labelFor(v)})`;
	}).replace(/\s*\+\s*@bonus\b/, "");
	input.title = input.value;
}

/* -------------------------------------------- */
/*  Alphabetical skill lists                      */
/* -------------------------------------------- */

const labelOf = (el) => (el.querySelector(".skill-name, [data-action='rollSkillCheck'], h4") ?? el).textContent.trim();

export function sortSkillLists(element) {
	const root = element instanceof HTMLElement ? element : element?.[0];
	if (!root) return;
	const parents = new Set([...root.querySelectorAll("[data-skill]")].map((el) => el.parentElement));
	const lang = game.i18n?.lang || "pt-BR";
	for (const parent of parents) {
		const items = [...parent.children].filter((el) => el.dataset?.skill);
		if (items.length < 5) continue;
		const sorted = [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b), lang, { sensitivity: "base" }));
		if (sorted.every((el, i) => el === items[i])) continue;
		const marker = document.createComment("d4ea-skills");
		items[0].before(marker);
		marker.after(...sorted);
		marker.remove();
	}
}

export function registerSkillRollHooks() {
	Hooks.once("ready", wrapRollSkill);
	Hooks.on("renderApplicationV2", (app, element) => {
		try {
			if (app.document instanceof Actor) sortSkillLists(element);
		} catch (err) {
			console.error(`${MODULE_ID} | skill sort`, err);
		}
	});
}
