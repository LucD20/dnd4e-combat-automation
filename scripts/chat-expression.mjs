import { MODULE_ID } from "./constants.mjs";
import { setting } from "./utils.mjs";

/*
 * Readable roll breakdowns in chat. The dnd4e system shows the roll "expression" with raw
 * variables ("1d20 + @wepAttack + @powerMod + @lvhalf"); each variable span is paired by id with
 * the span of its value in the formula. We replace each variable with a label and its value
 * ("Arma +2", "Atributo +4") and append the module's automatic modifiers (Prime Shot, Vicious
 * Mockery), which the system's expression doesn't include.
 */

const LABEL_KEYS = {
	wepAttack: "wepAttack", impAttack: "impAttack", powerMod: "powerMod", lvhalf: "lvhalf", bonus: "bonus",
	powBase: "powBase", powMax: "powMax", wepDamage: "wepDamage", impDamage: "impDamage",
	wepCritBonus: "wepCritBonus", impCritBonus: "impCritBonus", highCrit: "highCrit", versatile: "versatile",
	extraDamage: "extraDamage", actorBonusDamage: "bonusDamage", dmg: "bonusDamage",
	ammo: "ammo", ammoC: "ammo", ammoM: "ammo", powAmmo: "ammo", powAmmoC: "ammo", powAmmoM: "ammo",
	wep2ndryDamage: "wep2ndryDamage", pow2ndryDamage: "wep2ndryDamage",
};

function labelFor(variable) {
	const common = CONFIG.DND4E?.commonAttackBonuses?.[variable];
	if (common?.label) return game.i18n.localize(common.label);
	const key = LABEL_KEYS[variable];
	return key ? game.i18n.localize(`DND4EAUTO.RollVars.${key}`) : null;
}

function signedValue(text) {
	const t = String(text ?? "").trim();
	if (!t) return "";
	if (/^[+-]/.test(t)) return t;
	return /^\d+(\.\d+)?$/.test(t) ? `+${t}` : t;
}

function relabel(container, rollEl) {
	for (const span of container.querySelectorAll(".roll-expression")) {
		if (span.querySelector(".roll-expression")) continue; // only leaf spans
		const m = span.textContent.trim().match(/^@([A-Za-z0-9_]+)$/);
		if (!m) continue;
		const label = labelFor(m[1]);
		if (!label) continue;
		const formulaSpan = span.id ? rollEl.querySelector(`#${CSS.escape(span.id.replace(/^exp/, "form"))}`) : null;
		const value = formulaSpan ? signedValue(formulaSpan.textContent) : "";
		span.innerHTML = `${foundry.utils.escapeHTML(label)}${value ? ` <b>${foundry.utils.escapeHTML(value)}</b>` : ""}`;
		span.classList.add("d4ea-roll-var");
	}
	// Variables outside spans (when the system couldn't pair them): label only
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		if (!node.nodeValue.includes("@") || node.parentElement?.classList.contains("d4ea-roll-var")) continue;
		node.nodeValue = node.nodeValue.replace(/@([A-Za-z0-9_]+)/g, (all, v) => labelFor(v) ?? all);
	}
}

export function onRenderChatMessage(message, html) {
	if (!setting("readableRolls") || !message.rolls?.length) return;
	const rollEls = html.querySelectorAll(".dice-roll");
	rollEls.forEach((rollEl, i) => {
		const expression = rollEl.querySelector(".dice-tooltip.dice-formula");
		if (!expression || expression.dataset.d4eaDone) return;
		expression.dataset.d4eaDone = "1";
		relabel(expression, rollEl);
		const mods = message.rolls[i]?.options?.d4eaMods;
		if (mods?.length) {
			const extra = mods.map((m) => `<span class="d4ea-roll-mod ${m.value < 0 ? "penalty" : "bonus"}">${foundry.utils.escapeHTML(m.label)} <b>${m.value > 0 ? "+" : ""}${m.value}</b></span>`).join(" + ");
			expression.insertAdjacentHTML("beforeend", ` + ${extra}`);
		}
	});
}
