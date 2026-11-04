import { MODULE_ID } from "./constants.mjs";
import { drawPreview, clearPreview } from "./cover-preview.mjs";

export function registerSettings() {
	const world = (key, def = true) => game.settings.register(MODULE_ID, key, {
		name: `DND4EAUTO.Settings.${key}.Name`,
		hint: `DND4EAUTO.Settings.${key}.Hint`,
		scope: "world",
		config: true,
		type: Boolean,
		default: def,
	});
	world("enableQuarry");
	world("enableCurse");
	world("enableRage");
	world("enableMarks");
	world("enableCover");
	world("warnNotNearest");
	world("actionTracker");
	world("opportunityAttacks");
	world("autoMoveActions");
	world("reactionPrompts");
	world("damageTargets");
	world("powerRiders");
	world("primeShot");
	world("tempHpFeatures");
	world("conditionalRiders");

	const client = (key, def = true, onChange = undefined) => game.settings.register(MODULE_ID, key, {
		name: `DND4EAUTO.Settings.${key}.Name`,
		hint: `DND4EAUTO.Settings.${key}.Hint`,
		scope: "client",
		config: true,
		type: Boolean,
		default: def,
		onChange,
	});
	client("actionPanel");
	client("actionWarnings");
	client("dockPips", true, () => import("./actions/dock.mjs").then((m) => m.refreshDock()));
	client("sheetModHighlights", true);
	client("readableRolls", true);
	client("tokenBadges", true, () => canvas?.tokens?.placeables.forEach((t) => t.renderFlags?.set({ refresh: true })));

	game.settings.register(MODULE_ID, "coverPreview", {
		name: "DND4EAUTO.Settings.coverPreview.Name",
		hint: "DND4EAUTO.Settings.coverPreview.Hint",
		scope: "client",
		config: true,
		type: Boolean,
		default: true,
		onChange: (value) => (value ? drawPreview() : clearPreview()),
	});
	game.settings.register(MODULE_ID, "preloadIndexes", {
		name: "DND4EAUTO.Settings.preloadIndexes.Name",
		hint: "DND4EAUTO.Settings.preloadIndexes.Hint",
		scope: "client",
		config: true,
		type: Boolean,
		default: true,
	});
	game.settings.register(MODULE_ID, "debug", {
		name: "DND4EAUTO.Settings.debug.Name",
		hint: "DND4EAUTO.Settings.debug.Hint",
		scope: "client",
		config: true,
		type: Boolean,
		default: false,
	});

	game.keybindings.register(MODULE_ID, "toggleActionPanel", {
		name: "DND4EAUTO.Keybindings.toggleActionPanel",
		editable: [],
		onDown: () => {
			import("./actions/panel.mjs").then((m) => m.ActionPanel.toggle());
			return true;
		},
	});

	game.keybindings.register(MODULE_ID, "toggleCoverPreview", {
		name: "DND4EAUTO.Keybindings.toggleCoverPreview",
		editable: [],
		onDown: () => {
			const current = game.settings.get(MODULE_ID, "coverPreview");
			game.settings.set(MODULE_ID, "coverPreview", !current);
			return true;
		},
	});
}
