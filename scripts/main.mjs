import { MODULE_ID } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerSocket } from "./effects.mjs";
import { actorFromSpeaker, log } from "./utils.mjs";
import * as quarry from "./features/quarry.mjs";
import * as curse from "./features/curse.mjs";
import * as rage from "./features/rage.mjs";
import * as mark from "./features/mark.mjs";
import * as defeat from "./features/defeat.mjs";
import { onRollDamage, onRenderRollDialog } from "./damage-dialog.mjs";
import { onEvaluateCommonAttackBonuses, computeCover } from "./cover.mjs";
import { registerPreviewHooks, drawPreview } from "./cover-preview.mjs";
import { preloadCompendiumIndexes } from "./preload.mjs";

Hooks.once("init", () => {
	registerSettings();
	registerPreviewHooks();
	game.modules.get(MODULE_ID).api = {
		applyMark: mark.applyMark,
		computeCover,
		drawCoverPreview: drawPreview,
	};
});

Hooks.once("ready", () => {
	if (game.system.id !== "dnd4e") {
		console.warn(`${MODULE_ID} | This module only works with the dnd4e system.`);
		return;
	}
	registerSocket();
	preloadCompendiumIndexes().catch((err) => console.warn(`${MODULE_ID} | preload`, err));
	log("ready");
});

/* A power was used (its chat card was posted). */
Hooks.on("dnd4e.usePower", async (item) => {
	const actor = item?.actor;
	if (!actor) return;
	try {
		for (const feature of [quarry, curse, rage]) {
			if (await feature.onUsePower(item, actor)) break;
		}
	} catch (err) {
		console.error(`${MODULE_ID} | usePower`, err);
	}
});

/* An attack was rolled against targets (hit/miss known). */
Hooks.on("dnd4e.rollAttack", async (itemData, targetData, speaker) => {
	try {
		const actor = actorFromSpeaker(speaker);
		if (actor) await mark.onAttackRolled(itemData, targetData, actor);
	} catch (err) {
		console.error(`${MODULE_ID} | rollAttack`, err);
	}
});

/* Damage: remember the power, then add toggles to the damage dialog. */
Hooks.on("dnd4e.rollDamage", (item) => onRollDamage(item));
Hooks.on("renderRollDialog", (app, element) => {
	try {
		onRenderRollDialog(app, element);
	} catch (err) {
		console.error(`${MODULE_ID} | renderRollDialog`, err);
	}
});

/* Attack dialog: automatic cover. */
Hooks.on("dnd4e.evaluateCommonAttackBonuses", (item, attacker, target, config) => {
	try {
		onEvaluateCommonAttackBonuses(item, attacker, target, config);
	} catch (err) {
		console.error(`${MODULE_ID} | cover`, err);
	}
});

/* Quarry/curse end when the creature drops to 0 HP. */
Hooks.on("updateActor", (actor, changes) => {
	defeat.onUpdateActor(actor, changes).catch((err) => console.error(`${MODULE_ID} | updateActor`, err));
});
