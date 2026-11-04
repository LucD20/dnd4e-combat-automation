// Measures how long a character sheet takes to open, for every registered PC sheet
// (Fox's 4e Aesthetics and the default dnd4e sheet). Read-only: opens and closes sheets.
// Usage: in Foundry press F12 > Console, paste this whole file and press Enter.
(async () => {
	const actorName = "Grontar"; // change to any PC name
	const actor = game.actors.getName(actorName) ?? game.actors.find((a) => a.type === "Player Character");
	const classes = CONFIG.Actor.sheetClasses["Player Character"];
	const TE = foundry.applications.ux.TextEditor.implementation;
	const ItemCls = CONFIG.Item.documentClass;

	const stats = { enrich: 0, enrichCount: 0, chat: 0, chatCount: 0, rollData: 0, rollDataCount: 0 };
	const wrap = (obj, key, bucket, countKey) => {
		const orig = obj[key];
		obj[key] = function (...args) {
			const t = performance.now();
			const r = orig.apply(this, args);
			const done = () => { stats[bucket] += performance.now() - t; stats[countKey]++; };
			if (r instanceof Promise) return r.finally(done);
			done();
			return r;
		};
		return () => { obj[key] = orig; };
	};
	const unwrap = [
		wrap(TE, "enrichHTML", "enrich", "enrichCount"),
		wrap(ItemCls.prototype, "getChatData", "chat", "chatCount"),
		wrap(ItemCls.prototype, "getRollData", "rollData", "rollDataCount"),
	];

	const rows = [];
	try {
		for (const [id, cfg] of Object.entries(classes)) {
			for (const pass of [1, 2]) {
				for (const k of Object.keys(stats)) stats[k] = 0;
				const resBefore = performance.getEntriesByType("resource").length;
				const sheet = new cfg.cls({ document: actor });
				let ctxMs = 0;
				const origCtx = sheet._prepareContext.bind(sheet);
				sheet._prepareContext = async (o) => {
					const t = performance.now();
					const r = await origCtx(o);
					ctxMs = performance.now() - t;
					return r;
				};
				const t0 = performance.now();
				await sheet.render({ force: true });
				const total = performance.now() - t0;
				await sheet.close({ animate: false });
				rows.push({
					sheet: id, pass, totalMs: Math.round(total), contextMs: Math.round(ctxMs),
					enrichMs: Math.round(stats.enrich), enrichCalls: stats.enrichCount,
					chatDataMs: Math.round(stats.chat), rollDataCalls: stats.rollDataCount,
					newDownloads: performance.getEntriesByType("resource").length - resBefore,
				});
			}
		}
	} finally {
		unwrap.forEach((u) => u());
	}
	console.log(`Sheet timing for ${actor.name} (${actor.items.size} items)`);
	console.table(rows);
	console.log(JSON.stringify(rows));
})();
