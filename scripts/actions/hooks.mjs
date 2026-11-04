import { MODULE_ID } from "../constants.mjs";
import { setting } from "../utils.mjs";
import { spend, kindForActionType, combatantForActor, getState, setChargePending, addExtraAction, onTurnChange, resetAll, isCombatantsTurn, canModify } from "./state.mjs";
import { ActionPanel } from "./panel.mjs";
import { renderTrackerPips } from "./tracker-pips.mjs";
import { integrateCombatDock, refreshDock } from "./dock.mjs";

/** dnd4e.usePower: spend the power's action. */
export async function onUsePower(item) {
	if (!setting("actionTracker")) return;
	const combatant = combatantForActor(item.actor);
	if (!combatant || !combatant.combat?.started || !canModify(combatant)) return;
	const kind = kindForActionType(item.system?.actionType);
	if (!kind) return;

	// The attack made as part of a Charge is included in the Charge's standard action.
	const state = getState(combatant);
	if (state.chargePending && kind === "standard" && item.system?.attack?.isAttack) {
		await setChargePending(combatant, false);
		return;
	}
	await spend(combatant, kind, { source: item.name });
}

/** Spending an Action Point (from the sheet or the panel) grants an extra action this turn. */
function onUpdateActor(actor, changes, options, userId) {
	if (!setting("actionTracker") || game.user.id !== userId) return;
	const ap = foundry.utils.getProperty(changes, "system.actionpoints.value");
	if (ap === undefined) return;
	const before = options?.[MODULE_ID]?.apBefore;
	const combatant = combatantForActor(actor);
	if (!combatant || !isCombatantsTurn(combatant)) return;
	if ((before !== undefined) && (ap >= before)) return;
	addExtraAction(combatant);
}

function onPreUpdateActor(actor, changes, options) {
	if (foundry.utils.getProperty(changes, "system.actionpoints.value") === undefined) return;
	options[MODULE_ID] = { apBefore: actor.system.actionpoints?.value };
}

export function registerActionTracker() {
	Hooks.on("combatTurnChange", (combat, previous, current) => {
		onTurnChange(combat, previous, current).catch((e) => console.error(`${MODULE_ID} | turn change`, e));
		ActionPanel.refresh();
		setTimeout(refreshDock, 150);
	});
	Hooks.on("combatStart", (combat) => {
		resetAll(combat).catch((e) => console.error(`${MODULE_ID} | combat start`, e));
		ActionPanel.autoOpen();
	});
	Hooks.on("preUpdateActor", onPreUpdateActor);
	Hooks.on("updateActor", onUpdateActor);
	Hooks.on("updateCombatant", () => ActionPanel.refresh());
	Hooks.on("updateCombat", () => ActionPanel.refresh());
	Hooks.on("deleteCombat", () => ActionPanel.refresh());
	Hooks.on("controlToken", () => ActionPanel.refresh());
	Hooks.on("renderCombatTracker", (app, element) => renderTrackerPips(app, element));
	Hooks.once("ready", () => {
		integrateCombatDock();
		if (game.combat?.started) ActionPanel.autoOpen();
	});
}
