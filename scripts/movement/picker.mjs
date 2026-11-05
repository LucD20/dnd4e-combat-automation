import { MODULE_ID, SOCKET } from "../constants.mjs";
import { F, L, log } from "../utils.mjs";
import { reachable, rectAt, pointOf, key } from "./reach.mjs";

/*
 * Click-to-move: highlights the squares a token can reach, shows the path under the cursor, and
 * moves the token when a highlighted square is clicked. Esc or a right click skips.
 *
 * A bar above the hotbar says what is being chosen. It sits between the left controls and the
 * sidebar/chat, shrinking with the window (text is cut with "…", the buttons stay on the right).
 *
 * Only one picker is open at a time; further requests wait in a queue.
 */

const COLORS = { shift: 0x1e88e5, push: 0xef6c00, pull: 0xef6c00, slide: 0xef6c00 };
const ICONS = { shift: "fa-shoe-prints", push: "fa-arrow-right-from-bracket", pull: "fa-arrow-right-to-bracket", slide: "fa-arrows-up-down-left-right" };

let queue = Promise.resolve();
let active = null;

/**
 * Let the user choose where `token` goes.
 * @param {object} opts
 * @param {Token}  opts.token
 * @param {"shift"|"push"|"pull"|"slide"} opts.mode
 * @param {number} opts.squares
 * @param {Token}  [opts.source]   Who pushes/pulls (and from whose point of view enemies are counted)
 * @param {string} [opts.power]    Name of the power, shown in the bar
 * @param {object} [opts.moveOptions]  Extra flags passed with the movement (forced, countMovement)
 * @returns {Promise<{moved: boolean, squares: number}>}
 */
export function pickMovement(opts) {
	const run = queue.then(() => openPicker(opts));
	queue = run.catch(() => {});
	return run;
}

export function isPicking() {
	return !!active;
}

function openPicker({ token, mode, squares, source = null, power = "", moveOptions = {} }) {
	return new Promise((resolve) => {
		if (!canvas.ready || !token?.document || token.destroyed || canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return resolve({ moved: false, squares: 0 });
		const destinations = reachable(token, { mode, squares, source });
		if (!destinations.size) {
			ui.notifications.warn(F("Move.NoSquares", { name: token.name }));
			return resolve({ moved: false, squares: 0 });
		}
		const picker = new Picker({ token, mode, squares, source, power, destinations, moveOptions, resolve });
		active = picker;
		picker.open();
	});
}

class Picker {
	constructor(opts) {
		Object.assign(this, opts);
		this.hover = null;
		this.handlers = [];
		this.closed = false;
	}

	/* ---------------------------------------- */

	open() {
		this.layer = new PIXI.Container();
		this.layer.name = `${MODULE_ID}-move-picker`;
		this.layer.eventMode = "none";
		this.fill = new PIXI.Graphics();
		this.path = new PIXI.Graphics();
		this.layer.addChild(this.fill, this.path);
		canvas.interface.addChild(this.layer);
		this.drawSquares();
		this.openBar();
		this.listen();
		canvas.animatePan?.({ ...this.token.center, duration: 250 });
		log("move picker", this.mode, this.token.name, this.squares, `${this.destinations.size} squares`);
	}

	close(result) {
		if (this.closed) return;
		this.closed = true;
		for (const [target, type, fn, opts] of this.handlers) target.removeEventListener(type, fn, opts);
		this.layer?.destroy({ children: true });
		clearInterval(this.layoutTimer);
		window.removeEventListener("resize", this.layoutFn);
		this.bar?.remove();
		active = null;
		this.resolve(result);
	}

	/* ---------------------------------------- */
	/*  Drawing                                  */
	/* ---------------------------------------- */

	get size() {
		return { w: Math.max(1, Math.round(this.token.document.width)), h: Math.max(1, Math.round(this.token.document.height)) };
	}

	drawSquares() {
		const g = this.fill;
		const color = COLORS[this.mode];
		const s = canvas.grid.size;
		const cells = new Set();
		const { w, h } = this.size;
		for (const d of this.destinations.values()) {
			const r = rectAt(d.pos, w, h);
			for (let i = r.i0; i <= r.i1; i++) for (let j = r.j0; j <= r.j1; j++) cells.add(`${i},${j}`);
		}
		g.clear();
		for (const c of cells) {
			const [i, j] = c.split(",").map(Number);
			g.lineStyle(2, color, 0.9).beginFill(color, 0.22).drawRect(j * s + 2, i * s + 2, s - 4, s - 4).endFill();
		}
	}

	drawHover() {
		const g = this.path;
		g.clear();
		const d = this.hover;
		if (!d) return;
		const s = canvas.grid.size;
		const { w, h } = this.size;
		const color = COLORS[this.mode];
		const center = (p) => ({ x: (p.j + w / 2) * s, y: (p.i + h / 2) * s });
		const start = center({ i: Math.round(this.token.document.y / s), j: Math.round(this.token.document.x / s) });
		g.lineStyle(6, 0x000000, 0.5).moveTo(start.x, start.y);
		for (const p of d.path) g.lineTo(center(p).x, center(p).y);
		g.lineStyle(3, 0xffffff, 0.95).moveTo(start.x, start.y);
		for (const p of d.path) g.lineTo(center(p).x, center(p).y);
		for (const p of d.path) g.lineStyle(0).beginFill(0xffffff, 0.95).drawCircle(center(p).x, center(p).y, Math.max(4, s * 0.06)).endFill();
		g.lineStyle(4, color, 1).beginFill(color, 0.35).drawRect(d.pos.j * s + 3, d.pos.i * s + 3, w * s - 6, h * s - 6).endFill();
		this.setCount(d.steps);
	}

	/* ---------------------------------------- */
	/*  Input                                    */
	/* ---------------------------------------- */

	on(target, type, fn, opts) {
		target.addEventListener(type, fn, opts);
		this.handlers.push([target, type, fn, opts]);
	}

	destinationAt(ev) {
		const pt = canvas.canvasCoordinatesFromClient({ x: ev.clientX, y: ev.clientY });
		const s = canvas.grid.size;
		const cell = { i: Math.floor(pt.y / s), j: Math.floor(pt.x / s) };
		const exact = this.destinations.get(key(cell));
		if (exact) return exact;
		// Larger creatures: any destination whose footprint covers the cell (fewest steps first)
		const { w, h } = this.size;
		let best = null;
		for (const d of this.destinations.values()) {
			const r = rectAt(d.pos, w, h);
			if (cell.i < r.i0 || cell.i > r.i1 || cell.j < r.j0 || cell.j > r.j1) continue;
			if (!best || d.steps < best.steps) best = d;
		}
		return best;
	}

	listen() {
		const view = canvas.app.view;
		const capture = { capture: true };
		this.on(view, "pointermove", (ev) => {
			const d = this.destinationAt(ev);
			if (d !== this.hover) {
				this.hover = d;
				this.drawHover();
			}
		}, capture);
		this.on(view, "pointerdown", (ev) => {
			if (ev.button === 0) {
				const d = this.destinationAt(ev);
				if (!d) return;
				ev.preventDefault();
				ev.stopImmediatePropagation();
				this.choose(d);
			} else if (ev.button === 2) {
				this.rightDown = { x: ev.clientX, y: ev.clientY };
			}
		}, capture);
		this.on(view, "pointerup", (ev) => {
			if (ev.button !== 2 || !this.rightDown) return;
			const moved = Math.hypot(ev.clientX - this.rightDown.x, ev.clientY - this.rightDown.y);
			this.rightDown = null;
			if (moved < 6) this.close({ moved: false, squares: 0 }); // a right click (not a right-drag pan)
		}, capture);
		this.on(window, "keydown", (ev) => {
			if (ev.key !== "Escape") return;
			ev.preventDefault();
			ev.stopImmediatePropagation();
			this.close({ moved: false, squares: 0 });
		}, capture);
	}

	async choose(d) {
		if (this.busy) return;
		this.busy = true;
		const ok = await moveTokenAlong(this.token.document, d.path, this.moveOptions);
		this.close({ moved: ok, squares: d.steps });
	}

	/* ---------------------------------------- */
	/*  Bar                                      */
	/* ---------------------------------------- */

	openBar() {
		const bar = document.createElement("div");
		bar.id = `${MODULE_ID}-move-bar`;
		bar.className = `d4ea-move-bar ${this.mode}`;
		const what = F(`Move.Bar.${this.mode}`, { name: this.token.name, squares: this.squares });
		const power = this.power ? `<span class="d4ea-move-power">${foundry.utils.escapeHTML(this.power)}</span>` : "";
		bar.innerHTML = `
			<i class="fa-solid ${ICONS[this.mode]} d4ea-move-icon"></i>
			<div class="d4ea-move-text">${power}<span class="d4ea-move-what">${foundry.utils.escapeHTML(what)}</span>
				<span class="d4ea-move-hint">${L("Move.Hint")}</span></div>
			<span class="d4ea-move-count"></span>
			<button type="button" data-d4ea-move="skip"><i class="fa-solid fa-forward"></i> ${L("Move.Skip")}</button>`;
		bar.addEventListener("click", (ev) => {
			if (ev.target.closest("[data-d4ea-move='skip']")) this.close({ moved: false, squares: 0 });
		});
		document.body.append(bar);
		this.bar = bar;
		this.layoutFn = () => layoutBar(bar);
		window.addEventListener("resize", this.layoutFn);
		this.layoutTimer = setInterval(this.layoutFn, 300); // follows the sidebar opening/closing
		this.layoutFn();
	}

	setCount(steps) {
		const el = this.bar?.querySelector(".d4ea-move-count");
		if (el) el.textContent = steps ? F("Move.Count", { steps, squares: this.squares }) : "";
	}
}

/* -------------------------------------------- */
/*  Bar layout                                    */
/* -------------------------------------------- */

function visibleRect(id) {
	const el = document.getElementById(id);
	if (!el) return null;
	const r = el.getBoundingClientRect();
	if (!r.width || !r.height) return null;
	const style = getComputedStyle(el);
	if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
	return r;
}

/**
 * Place the bar right above the hotbar, between the left UI column and the sidebar / chat
 * notifications, and as wide as that gap allows (up to 640px).
 */
export function layoutBar(bar) {
	const vw = window.innerWidth, vh = window.innerHeight;
	const gap = 10;
	const hotbar = visibleRect("hotbar");
	let left = gap;
	const uiLeft = visibleRect("ui-left");
	if (uiLeft) left = Math.max(left, Math.min(uiLeft.right, vw * 0.35) + gap);
	let right = vw - gap;
	for (const id of ["sidebar", "ui-right"]) {
		const r = visibleRect(id);
		if (r && r.left > vw / 2) right = Math.min(right, r.left - gap);
	}
	const bottom = hotbar ? (vh - hotbar.top + 6) : 16;
	const notes = visibleRect("chat-notifications");
	if (notes && notes.left > vw / 2 && notes.top < vh - bottom) right = Math.min(right, notes.left - gap);

	const available = Math.max(220, right - left);
	const width = Math.min(640, available);
	const anchor = hotbar ? (hotbar.left + hotbar.right) / 2 : (left + right) / 2;
	const x = Math.min(Math.max(anchor - width / 2, left), Math.max(left, right - width));
	Object.assign(bar.style, { left: `${Math.round(x)}px`, width: `${Math.round(width)}px`, bottom: `${Math.round(bottom)}px` });
}

/* -------------------------------------------- */
/*  Moving                                        */
/* -------------------------------------------- */

/**
 * Move a token through the given squares as a shift (no opportunity attacks). Tokens the user
 * doesn't own are moved by the active GM.
 * @param {TokenDocument} tokenDoc
 * @param {{i, j}[]} path
 * @param {object} flags   { forced?: boolean, countMovement?: boolean }
 */
export async function moveTokenAlong(tokenDoc, path, flags = {}) {
	const waypoints = path.map((p) => ({ ...pointOf(p), action: "shift" }));
	if (tokenDoc.isOwner) return doMove(tokenDoc, waypoints, flags);
	if (!game.users.activeGM) {
		ui.notifications.warn(F("Warn.NoGM", { name: tokenDoc.name }));
		return false;
	}
	game.socket.emit(SOCKET, { op: "move", tokenUuid: tokenDoc.uuid, waypoints, flags });
	return true;
}

async function doMove(tokenDoc, waypoints, flags) {
	try {
		await tokenDoc.move(waypoints, {
			[MODULE_ID]: flags,
			constrainOptions: { ignoreCost: true },
			autoRotate: false,
		});
		return true;
	} catch (err) {
		console.error(`${MODULE_ID} | move failed`, err);
		return false;
	}
}

export async function handleMoveSocket(payload) {
	const tokenDoc = await fromUuid(payload.tokenUuid);
	if (tokenDoc) await doMove(tokenDoc, payload.waypoints, payload.flags ?? {});
}
