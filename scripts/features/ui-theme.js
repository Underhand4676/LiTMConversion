const MODULE_ID = "litm-conversion";

function getUserAccent(message) {
  const userId = message?.user?.id ?? message?.user ?? message?.author?.id;
  const user = game.users.get(userId) ?? message?.author ?? null;
  const color = user?.color;

  if (typeof color === "string" && color) return color;
  if (color?.css) return color.css;
  return "#7fd3dc";
}

// ---------------------------------------------------------------------------
// PAUSE OVERLAY
// ---------------------------------------------------------------------------

function getPauseElement(element = null) {
  if (element instanceof HTMLElement) return element;
  return document.getElementById("pause");
}

function stylePauseElement(element = null) {
  const pauseEl = getPauseElement(element);
  if (!(pauseEl instanceof HTMLElement)) return null;

  pauseEl.classList.add("litm-pause");

  const image = pauseEl.querySelector("img");
  if (image) {
    image.src = `modules/${MODULE_ID}/artwork/republic-symbol.png`;
    image.alt = "Operations Halted";
    image.classList.add("litm-pause-emblem");
  }

  const caption = pauseEl.querySelector("figcaption");
  if (caption) {
    caption.innerHTML = `
      <span class="litm-pause-title">OPERATIONS HALTED</span>
      <span class="litm-pause-subtitle">AWAITING RESUMPTION</span>
    `;
  }

  return pauseEl;
}

function syncPauseState(paused = game.paused) {
  const pauseEl = stylePauseElement();
  if (!pauseEl) return;

  const active = Boolean(paused);
  pauseEl.classList.toggle("litm-pause-active", active);
  pauseEl.classList.toggle("litm-pause-inactive", !active);
}

function syncAfterCore(paused = game.paused) {
  // Let Foundry complete its own GamePause render/update first, then apply
  // our explicit visibility state. Two animation frames avoids racing the
  // ApplicationV2 render transition on fast pause/unpause toggles.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => syncPauseState(paused));
  });
}

Hooks.on("renderGamePause", (_app, element) => {
  stylePauseElement(element);
  syncAfterCore(game.paused);
});

Hooks.on("pauseGame", (paused) => {
  syncAfterCore(paused);
});

Hooks.once("ready", () => {
  syncAfterCore(game.paused);
});

// ---------------------------------------------------------------------------
// CHAT MESSAGE THEME
// Foundry v14 provides the pending message as an HTMLElement.
// ---------------------------------------------------------------------------

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (!(html instanceof HTMLElement)) return;

  html.classList.add("litm-chat-message");
  html.style.setProperty("--litm-user-accent", getUserAccent(message));

  if (message.isRoll) html.classList.add("litm-roll-message");
  else html.classList.add("litm-text-message");
});


// ---------------------------------------------------------------------------
// THEMEBOOK / STORY THEME SHEET THEME
// ---------------------------------------------------------------------------

function resolveRenderedRoot(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];

  const appElement = app?.element;

  if (appElement instanceof HTMLElement) return appElement;
  if (appElement?.[0] instanceof HTMLElement) return appElement[0];

  return null;
}

function isThemebookSheet(app) {
  const documentType = (
    app?.document?.type ??
    app?.item?.type ??
    app?.object?.type ??
    ""
  ).toLowerCase();

  if (documentType === "themebook") return true;

  const title = String(app?.title ?? "").toLowerCase();
  if (title.includes("themebook") || title.includes("story theme")) return true;

  const classes = [
    ...(app?.options?.classes ?? []),
    ...(app?.constructor?.DEFAULT_OPTIONS?.classes ?? [])
  ].map(value => String(value).toLowerCase());

  return classes.some(value => value.includes("themebook"));
}

function styleThemebookSheet(app, html) {
  if (!isThemebookSheet(app)) return;

  const root = resolveRenderedRoot(app, html);
  if (!(root instanceof HTMLElement)) return;

  root.classList.add("litm-starwars-themebook-sheet");

  root.querySelector(".window-content")?.classList?.add("litm-starwars-themebook-sheet-content");
  root.querySelector(".window-header")?.classList?.add("litm-starwars-themebook-sheet-header");
}

Hooks.on("renderItemSheet", (app, html) => {
  styleThemebookSheet(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  styleThemebookSheet(app, element);
});
