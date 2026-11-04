// Finds which description makes the FIRST sheet opening slow. Read-only.
// Usage: reload Foundry (F5), wait ~10 s, then F12 > Console, paste this file, Enter. Paste the JSON line back.
(async () => {
	const actorName = "Grontar";
	const actor = game.actors.getName(actorName) ?? game.actors.find((a) => a.type === "Player Character");
	const mod = game.modules.get("dnd4e-combat-automation");
	const packs = game.packs.contents;
	const info = {
		moduleVersion: mod?.active ? mod.version : "inactive",
		preloadSetting: mod?.active ? game.settings.get("dnd4e-combat-automation", "preloadIndexes") : null,
		packs: packs.length,
		packsIndexed: packs.filter((p) => p.indexed).length,
		packsDocsLoaded: packs.filter((p) => p.contents?.length).map((p) => `${p.collection}:${p.contents.length}`),
	};

	const TE = foundry.applications.ux.TextEditor.implementation;
	const calls = [];
	const origEnrich = TE.enrichHTML;
	TE.enrichHTML = async function (content, options) {
		const t = performance.now();
		const r = await origEnrich.call(this, content, options);
		calls.push({ ms: Math.round(performance.now() - t), len: content?.length ?? 0, start: String(content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 60), links: (String(content).match(/@(UUID|Compendium|Embed|[A-Za-z]+)\[/g) ?? []).join(" ") });
		return r;
	};
	// Track compendium document/index fetches during the render
	const fetches = [];
	const CC = foundry.documents.collections.CompendiumCollection;
	const wrap = (key) => {
		const orig = CC.prototype[key];
		CC.prototype[key] = async function (...args) {
			const t = performance.now();
			const r = await orig.apply(this, args);
			fetches.push({ op: key, pack: this.collection, ms: Math.round(performance.now() - t) });
			return r;
		};
		return () => (CC.prototype[key] = orig);
	};
	const unwraps = ["getIndex", "getDocument", "getDocuments"].map(wrap);
	const origFromUuid = globalThis.fromUuid;
	const uuids = [];
	globalThis.fromUuid = async function (uuid, opts) {
		const t = performance.now();
		const r = await origFromUuid(uuid, opts);
		uuids.push({ uuid, ms: Math.round(performance.now() - t) });
		return r;
	};

	const sheet = new (CONFIG.Actor.sheetClasses["Player Character"]["dnd4e.ActorSheet4e"].cls)({ document: actor });
	const t0 = performance.now();
	try {
		await sheet.render({ force: true });
	} finally {
		TE.enrichHTML = origEnrich;
		unwraps.forEach((u) => u());
		globalThis.fromUuid = origFromUuid;
	}
	const total = Math.round(performance.now() - t0);
	await sheet.close({ animate: false });
	calls.sort((a, b) => b.ms - a.ms);
	const result = { info, total, slowestEnrich: calls.slice(0, 6), fetches, uuids: uuids.sort((a, b) => b.ms - a.ms).slice(0, 10) };
	console.log(result);
	console.log(JSON.stringify(result));
})();
