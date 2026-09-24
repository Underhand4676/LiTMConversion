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

function childBranchWithin(ancestor, node) {
  if (!(ancestor instanceof HTMLElement) || !(node instanceof HTMLElement)) {
    return node;
  }

  let current = node;

  while (current.parentElement && current.parentElement !== ancestor) {
    current = current.parentElement;
  }

  return current;
}

function findTagPair(questionInput, root) {
  const placeholder = String(questionInput.getAttribute("placeholder") ?? "");

  const isPower = /power\s*tag\s*question/i.test(placeholder);
  const isWeakness = /weakness\s*(?:tag\s*)?question/i.test(placeholder);

  if (!isPower && !isWeakness) return null;

  // The stock Mist Engine Theme item currently renders each tag question and
  // its "Answer / The Tag" input in the same local row/container, but those
  // controls do not use the same classes/data attributes as the character
  // sheet. Walk upward until we find the matching tag input.
  let scope = questionInput.parentElement;

  for (let depth = 0; scope && scope !== root && depth < 8; depth += 1) {
    const tagInput = Array.from(
      scope.querySelectorAll('input, textarea')
    ).find(input => {
      if (input === questionInput) return false;

      const text = String(input.getAttribute("placeholder") ?? "");
      return /answer\s*\/?\s*the\s*tag/i.test(text);
    });

    if (tagInput instanceof HTMLElement) {
      return {
        questionInput,
        tagInput,
        scope,
        kind: isPower ? "power" : "weakness"
      };
    }

    scope = scope.parentElement;
  }

  return null;
}

function reorderThemebookTagPair(pair) {
  const { questionInput, tagInput, scope, kind } = pair;

  questionInput.setAttribute("placeholder", "Adjudication Note");
  questionInput.setAttribute("aria-label", "Adjudication Note");
  questionInput.classList.add(
    "litm-sw-themebook-note-field",
    `litm-sw-themebook-${kind}-note`
  );

  tagInput.setAttribute("placeholder", "Tag");
  tagInput.setAttribute("aria-label", "Tag");
  tagInput.classList.add(
    "litm-sw-themebook-tag-field",
    `litm-sw-themebook-${kind}-tag`
  );

  const questionBranch = childBranchWithin(scope, questionInput);
  const tagBranch = childBranchWithin(scope, tagInput);

  // The desired presentation is:
  //   TAG
  //   ADJUDICATION NOTE
  //
  // Only move existing DOM nodes. We deliberately do not recreate the inputs
  // or alter their names/data attributes, so Mist Engine keeps ownership of
  // all persistence and event handling.
  if (
    questionBranch instanceof HTMLElement &&
    tagBranch instanceof HTMLElement &&
    questionBranch !== tagBranch &&
    questionBranch.parentElement === scope &&
    tagBranch.parentElement === scope
  ) {
    scope.insertBefore(tagBranch, questionBranch);
  }

  else if (
    questionInput.parentElement &&
    questionInput.parentElement === tagInput.parentElement
  ) {
    questionInput.parentElement.insertBefore(tagInput, questionInput);
  }
}

function enhanceThemebookTagRows(root) {
  const questionInputs = Array.from(
    root.querySelectorAll('input[placeholder], textarea[placeholder]')
  ).filter(input => {
    const placeholder = String(input.getAttribute("placeholder") ?? "");

    return (
      /power\s*tag\s*question/i.test(placeholder) ||
      /weakness\s*(?:tag\s*)?question/i.test(placeholder)
    );
  });

  for (const questionInput of questionInputs) {
    const pair = findTagPair(questionInput, root);
    if (pair) reorderThemebookTagPair(pair);
  }
}

function styleThemebookColumnHeadings(root) {
  // v0.4.1 assumed these were TH/header-label elements. On the actual
  // Item -> Themes sheet they are ordinary layout elements. Match the exact
  // rendered text instead, then apply an explicit high-contrast class and
  // inline-important fallback so the original parchment stylesheet cannot
  // make them black again.
  for (const element of root.querySelectorAll(
    "div, span, label, p, a, th, td, strong"
  )) {
    const text = String(element.textContent ?? "").trim().toLowerCase();

    if (!["data", "options", "description"].includes(text)) continue;

    element.classList.add("litm-sw-themebook-column-heading");
    element.style.setProperty("color", "#a9dce1", "important");
    element.style.setProperty("font-family", "monospace", "important");
    element.style.setProperty("font-size", "10px", "important");
    element.style.setProperty("font-weight", "700", "important");
    element.style.setProperty("letter-spacing", "0.12em", "important");
    element.style.setProperty("text-transform", "uppercase", "important");
    element.style.setProperty("text-shadow", "none", "important");
  }
}

function classifyThemebookTextActions(root) {
  // Only the two large add bars should receive the amber action-button skin.
  // v0.4.0 styled *every* button/clickable element and that is what broke
  // Mist Engine's Font Awesome header controls and delete/trash controls.
  for (const element of root.querySelectorAll(
    "button, a, [role='button'], .clickable"
  )) {
    const text = String(element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    if (text.includes("POWER TAGS") || text.includes("WEAKNESS TAGS")) {
      element.classList.add("litm-sw-themebook-action-bar");
    }
  }
}

function enhanceThemebookSheetUi(root) {
  if (!(root instanceof HTMLElement)) return;

  styleThemebookColumnHeadings(root);
  enhanceThemebookTagRows(root);
  classifyThemebookTextActions(root);
}

function observeThemebookSheet(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.litmThemebookObserver === "true") return;

  root.dataset.litmThemebookObserver = "true";

  const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.type === "childList")) return;

    requestAnimationFrame(() => enhanceThemebookSheetUi(root));
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });
}

function styleThemebookSheet(app, html) {
  if (!isThemebookSheet(app)) return;

  const root = resolveRenderedRoot(app, html);
  if (!(root instanceof HTMLElement)) return;

  root.classList.add("litm-starwars-themebook-sheet");

  root.querySelector(".window-content")?.classList?.add("litm-starwars-themebook-sheet-content");
  root.querySelector(".window-header")?.classList?.add("litm-starwars-themebook-sheet-header");

  enhanceThemebookSheetUi(root);
  observeThemebookSheet(root);
}

Hooks.on("renderItemSheet", (app, html) => {
  styleThemebookSheet(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  styleThemebookSheet(app, element);
});
