import { MODULE_ID } from "./constants.mjs";
import { setting, log } from "./utils.mjs";

/*
 * Character sheets enrich every power/feature description, and those descriptions link to the
 * compendiums (@UUID[Compendium...]). The first time a compendium is touched, Foundry fetches its
 * index from the server, which made the first sheet opened in a session take ~2s on Molten.
 * Loading the indexes in the background right after the game is ready removes that wait.
 */
export async function preloadCompendiumIndexes() {
	if (!setting("preloadIndexes")) return;
	const packs = game.packs.filter((p) => !p.indexed && ["Item", "JournalEntry", "Actor"].includes(p.documentName));
	if (!packs.length) return;
	const start = performance.now();
	// Wait for the UI to settle, then load a few at a time so we don't compete with the scene.
	await new Promise((r) => setTimeout(r, 1500));
	const queue = [...packs];
	const worker = async () => {
		while (queue.length) {
			const pack = queue.shift();
			try {
				await pack.getIndex();
			} catch (err) {
				console.warn(`${MODULE_ID} | could not index ${pack.collection}`, err);
			}
		}
	};
	await Promise.all([worker(), worker(), worker()]);
	log(`preloaded ${packs.length} compendium indexes in ${Math.round(performance.now() - start)} ms`);
}
