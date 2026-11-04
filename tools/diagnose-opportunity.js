// Checks whether the opportunity-card fixes (v0.3.1) are actually loaded in this browser. Read-only.
// Usage: F12 > Console, paste, Enter, then paste the JSON line back.
(async () => {
	const id = "dnd4e-combat-automation";
	const mod = game.modules.get(id);
	const cssLoaded = [...document.styleSheets].some((s) => {
		try {
			return [...s.cssRules].some((r) => r.cssText?.includes("d4ea-oa-attack"));
		} catch (e) {
			return false;
		}
	});
	let jsHasSync = null;
	try {
		const m = await import(`/modules/${id}/scripts/reactions/opportunity.mjs`);
		jsHasSync = typeof m.syncOpportunityButtons === "function";
	} catch (e) {
		jsHasSync = `import failed: ${e.message}`;
	}
	const buttons = [...document.querySelectorAll(".d4ea-oa-attack")].slice(-3).map((b) => {
		const cs = getComputedStyle(b);
		return { disabled: b.disabled, classes: b.className, bg: cs.backgroundColor, color: cs.color, opacity: cs.opacity, text: b.textContent.trim().slice(0, 40), container: b.closest("#chat-notifications") ? "notification" : b.closest("#chat") ? "chat-log" : "other" };
	});
	const result = { version: mod?.version, active: mod?.active, cssLoaded, jsHasSync, buttons };
	console.log(result);
	console.log(JSON.stringify(result));
})();
