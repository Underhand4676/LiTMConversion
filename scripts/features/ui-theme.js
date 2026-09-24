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

  if (
    CONFIG.Actor?.typeLabels &&
    Object.prototype.hasOwnProperty.call(
      CONFIG.Actor.typeLabels,
      "litm-fellowship-themecard"
    )
  ) {
    CONFIG.Actor.typeLabels["litm-fellowship-themecard"] = "Crew Theme Card";
  }
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

      return (
        /answer\s*\/?\s*the\s*tag/i.test(text) ||
        /new\s*power\s*tag/i.test(text) ||
        /new\s*weakness\s*tag/i.test(text) ||
        /newpowertag/i.test(text) ||
        /newweaknesstag/i.test(text)
      );
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


function markThemebookDescriptionPanel(root) {
  if (!(root instanceof HTMLElement)) return;

  for (const panel of root.querySelectorAll(
    '[data-tab="description"], ' +
    '.tab.description, ' +
    '.description.tab, ' +
    '[data-tab*="description" i]'
  )) {
    panel.classList.add("litm-sw-themebook-description-panel");
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


function createThemebookSvgIcon(kind) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("litm-sw-themebook-svg-icon");

  const path = document.createElementNS(ns, "path");

  const paths = {
    trash:
      "M8 3h8l1 2h4v2H3V5h4l1-2Zm-2 6h12l-1 12H7L6 9Zm3 2v7h2v-7H9Zm4 0v7h2v-7h-2Z",

    close:
      "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z",

    minimize:
      "M5 11h14v2H5v-2Z",

    copy:
      "M8 3h11a2 2 0 0 1 2 2v11h-2V5H8V3Zm-3 5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm0 2v9h10v-9H5Z",

    controls:
      "M12 5.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm0 8.25A1.75 1.75 0 1 0 12 10a1.75 1.75 0 0 0 0 3.5Zm0 8.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z",

    popout:
      "M13 3h8v8h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H13V3ZM5 6h5v2H5v11h11v-5h2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
  };

  path.setAttribute("d", paths[kind] ?? paths.controls);
  svg.appendChild(path);

  return svg;
}

function replaceThemebookControlGlyph(control, kind) {
  if (!(control instanceof HTMLElement)) return;
  if (control.dataset.litmSvgIcon === kind) return;

  // Preserve useful accessibility text before replacing the visual child.
  const accessible =
    control.getAttribute("aria-label") ??
    control.getAttribute("title") ??
    control.dataset.tooltip ??
    "";

  const svg = createThemebookSvgIcon(kind);

  // Some Mist Engine controls apply Font Awesome directly to the clickable
  // element rather than to a child <i>. If those classes remain, Font
  // Awesome's ::before pseudo-element draws the old glyph next to our SVG.
  // Remove ONLY Font Awesome classes; keep all Foundry/Mist Engine action,
  // layout, and data attributes intact.
  for (const className of Array.from(control.classList)) {
    if (
      className === "fa" ||
      className === "fas" ||
      className === "far" ||
      className === "fab" ||
      className === "fa-solid" ||
      className === "fa-regular" ||
      className === "fa-brands" ||
      className.startsWith("fa-")
    ) {
      control.classList.remove(className);
    }
  }

  // Replacing only the visual contents preserves the original clickable
  // element, data-action, data-index, event listeners, and document mechanics.
  control.replaceChildren(svg);
  control.dataset.litmSvgIcon = kind;

  if (accessible && !control.getAttribute("aria-label")) {
    control.setAttribute("aria-label", accessible);
  }
}

function classifyThemebookHeaderControl(control) {
  const descriptor = [
    control.getAttribute("data-action"),
    control.getAttribute("aria-label"),
    control.getAttribute("title"),
    control.getAttribute("data-tooltip"),
    control.className,
    control.textContent
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/close|dismiss/.test(descriptor)) return "close";
  if (/minimi[sz]e|collapse/.test(descriptor)) return "minimize";
  if (/copy|duplicate|clone/.test(descriptor)) return "copy";
  if (/pop.?out|separate|new.?window/.test(descriptor)) return "popout";
  if (/control|menu|ellipsis|more|options/.test(descriptor)) return "controls";

  return null;
}

function enhanceThemebookIcons(root) {
  if (!(root instanceof HTMLElement)) return;

  // Exact Mist Engine Themebook controls from the system templates.
  for (const control of root.querySelectorAll(
    '[data-action="deletePowertag"], ' +
    '[data-action="deleteWeaknessTag"], ' +
    '[data-action="deleteSpecialImprovement"]'
  )) {
    replaceThemebookControlGlyph(control, "trash");
  }

  // ApplicationV2 header controls live in the same application root.
  // Keep Foundry's actual buttons and handlers; replace only the broken glyph.
  for (const control of root.querySelectorAll(
    ".window-header button, .window-header a, .window-header [role='button']"
  )) {
    const kind = classifyThemebookHeaderControl(control);
    if (kind) replaceThemebookControlGlyph(control, kind);
  }
}

function enhanceThemebookSheetUi(root) {
  if (!(root instanceof HTMLElement)) return;

  markThemebookDescriptionPanel(root);
  styleThemebookColumnHeadings(root);
  enhanceThemebookTagRows(root);
  classifyThemebookTextActions(root);
  enhanceThemebookIcons(root);
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



// ---------------------------------------------------------------------------
// THEME KIT SHEET THEME
// ---------------------------------------------------------------------------

function isThemeKitSheet(app) {
  const document =
    app?.document ??
    app?.item ??
    app?.object ??
    null;

  const type = String(document?.type ?? "").toLowerCase();
  const normalizedType = type.replace(/[\s_-]+/g, "");

  if (
    normalizedType === "themekit" ||
    normalizedType === "litmthemekit" ||
    (normalizedType.includes("theme") && normalizedType.includes("kit"))
  ) {
    return true;
  }

  const title = String(app?.title ?? "").toLowerCase();

  if (
    title.startsWith("theme kit:") ||
    title === "theme kit" ||
    title.includes("theme kit")
  ) {
    return true;
  }

  const classes = [
    ...(app?.options?.classes ?? []),
    ...(app?.constructor?.DEFAULT_OPTIONS?.classes ?? [])
  ]
    .map(value => String(value).toLowerCase())
    .join(" ");

  return /theme[\s_-]*kit|themekit/.test(classes);
}

function classifyThemeKitTabs(root) {
  if (!(root instanceof HTMLElement)) return;

  const labels = new Set([
    "power tags",
    "weakness tags",
    "special improvements",
    "quest",
    "description"
  ]);

  for (const element of root.querySelectorAll(
    "nav a, nav button, .tabs a, .tabs button, [data-tab]"
  )) {
    const text = String(element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!labels.has(text)) continue;

    element.classList.add("litm-sw-themekit-tab");

    if (text === "description") {
      element.classList.add("litm-sw-themekit-description-tab");
    }
  }
}

function classifyThemeKitActions(root) {
  if (!(root instanceof HTMLElement)) return;

  for (const element of root.querySelectorAll(
    "button, a, [role='button'], .clickable"
  )) {
    const text = String(element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    if (!text) continue;

    if (
      /ADD\s+POWER\s*TAG/.test(text) ||
      /ADD\s+POWERTAG/.test(text) ||
      /ADD\s+WEAKNESS\s*TAG/.test(text) ||
      /ADD\s+SPECIAL\s+IMPROVEMENT/.test(text)
    ) {
      element.classList.add(
        "litm-sw-themekit-action",
        "litm-sw-themekit-action-primary"
      );
      continue;
    }

    if (
      text === "IMPORT" ||
      text.endsWith(" IMPORT") ||
      text.includes("IMPORT ")
    ) {
      element.classList.add(
        "litm-sw-themekit-action",
        "litm-sw-themekit-action-secondary"
      );
    }
  }
}

function markThemeKitPanels(root) {
  if (!(root instanceof HTMLElement)) return;

  /*
   * Theme Kit tab buttons and tab CONTENT panels both use data-tab.
   * v0.8.0 treated every [data-tab] element as a content panel, which put
   * the 410px panel min-height on the tab buttons themselves.
   *
   * First strip panel classes from anything that is clearly a tab control,
   * then only mark genuine content containers.
   */
  for (const control of root.querySelectorAll(
    "nav [data-tab], " +
    "nav a, " +
    "nav button, " +
    ".tabs > [data-tab], " +
    ".tabs > a, " +
    ".tabs > button, " +
    '[role="tab"]'
  )) {
    control.classList.remove(
      "litm-sw-themekit-panel",
      "litm-sw-themekit-description-panel"
    );
  }

  for (const panel of root.querySelectorAll(
    ".tab, .sheet-body, .sheet-content, [data-tab]"
  )) {
    if (!(panel instanceof HTMLElement)) continue;

    if (
      panel.matches("a, button, [role='tab']") ||
      panel.closest("nav")
    ) {
      continue;
    }

    /*
     * A direct child of a .tabs navigation rail is also a tab selector even
     * if the system uses a div/span instead of a link or button.
     */
    if (panel.parentElement?.classList?.contains("tabs")) continue;

    panel.classList.add("litm-sw-themekit-panel");
  }

  for (const panel of root.querySelectorAll(
    '.tab.description, ' +
    '.description.tab, ' +
    '[data-tab="description"], ' +
    '[data-tab*="description" i]'
  )) {
    if (!(panel instanceof HTMLElement)) continue;

    if (
      panel.matches("a, button, [role='tab']") ||
      panel.closest("nav") ||
      panel.parentElement?.classList?.contains("tabs")
    ) {
      continue;
    }

    panel.classList.add("litm-sw-themekit-description-panel");
  }
}

function enhanceThemeKitSheetUi(root) {
  if (!(root instanceof HTMLElement)) return;

  markThemeKitPanels(root);

  // Theme Kits use the same native tag storage and several of the same field
  // structures as Themebooks, so reuse the safe presentation helpers while
  // leaving Mist Engine's actual controls and data attributes untouched.
  markThemebookDescriptionPanel(root);
  enhanceThemebookTagRows(root);
  enhanceThemebookIcons(root);

  classifyThemeKitTabs(root);
  classifyThemeKitActions(root);
}

function observeThemeKitSheet(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.litmThemeKitObserver === "true") return;

  root.dataset.litmThemeKitObserver = "true";

  const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.type === "childList")) return;

    requestAnimationFrame(() => enhanceThemeKitSheetUi(root));
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });
}

function styleThemeKitSheet(app, html) {
  if (!isThemeKitSheet(app)) return;

  const root = resolveRenderedRoot(app, html);
  if (!(root instanceof HTMLElement)) return;

  // Reuse the established Themebook dossier language, then layer Theme Kit
  // specific tabs and panel treatment over it.
  root.classList.add(
    "litm-starwars-themebook-sheet",
    "litm-starwars-themekit-sheet"
  );

  root.querySelector(".window-content")?.classList?.add(
    "litm-starwars-themebook-sheet-content",
    "litm-starwars-themekit-sheet-content"
  );

  root.querySelector(".window-header")?.classList?.add(
    "litm-starwars-themebook-sheet-header",
    "litm-starwars-themekit-sheet-header"
  );

  enhanceThemeKitSheetUi(root);
  observeThemeKitSheet(root);
}


function isCrewThemeCardSheet(app) {
  const actor =
    app?.actor ??
    app?.document ??
    app?.object ??
    null;

  const type = String(actor?.type ?? "").toLowerCase();

  if (type === "litm-fellowship-themecard") return true;

  const title = String(app?.title ?? "").toLowerCase();
  return title.includes("fellowship theme card");
}

function replaceCrewThemeCardCopy(root) {
  if (!(root instanceof HTMLElement)) return;

  const title = root.querySelector(".window-title");

  if (title) {
    title.textContent = String(title.textContent ?? "")
      .replace(/Fellowship Theme Card/gi, "Crew Theme Card");
  }

  for (const element of root.querySelectorAll("p, div, span, strong, label, th")) {
    const text = String(element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (
      text.startsWith("A Fellowship Theme Card is a shared resource") &&
      element.children.length === 0
    ) {
      element.textContent =
        "CREW DOSSIER // SHARED FIELD PROFILE. This record defines the tags and special improvements available to assigned personnel. Operational tag entries remain linked to the individual member dossiers.";
      element.classList.add("litm-sw-crew-dossier-copy");
      continue;
    }

    if (text === "Themebook" && element.children.length === 0) {
      element.textContent = "Crew Dossier";
      element.classList.add("litm-sw-crew-column-heading");
    }

    if (text === "Special Improvements" && element.children.length === 0) {
      element.classList.add("litm-sw-crew-column-heading");
    }
  }
}

function enhanceCrewThemeCardSheetUi(root) {
  if (!(root instanceof HTMLElement)) return;

  replaceCrewThemeCardCopy(root);
  enhanceThemebookTagRows(root);
  classifyThemebookTextActions(root);
}

function observeCrewThemeCardSheet(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.dataset.litmCrewThemeObserver === "true") return;

  root.dataset.litmCrewThemeObserver = "true";

  const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.type === "childList")) return;

    requestAnimationFrame(() => enhanceCrewThemeCardSheetUi(root));
  });

  observer.observe(root, {
    childList: true,
    subtree: true
  });
}

function styleCrewThemeCardSheet(app, html) {
  if (!isCrewThemeCardSheet(app)) return;

  const root = resolveRenderedRoot(app, html);
  if (!(root instanceof HTMLElement)) return;

  // Reuse the successful Themebook sci-fi surface language, then layer on
  // Crew-specific dossier treatment below.
  root.classList.add(
    "litm-starwars-themebook-sheet",
    "litm-starwars-crew-theme-sheet"
  );

  root.querySelector(".window-content")?.classList?.add(
    "litm-starwars-themebook-sheet-content",
    "litm-starwars-crew-theme-sheet-content"
  );

  root.querySelector(".window-header")?.classList?.add(
    "litm-starwars-themebook-sheet-header",
    "litm-starwars-crew-theme-sheet-header"
  );

  enhanceCrewThemeCardSheetUi(root);
  observeCrewThemeCardSheet(root);
}

Hooks.on("renderItemSheet", (app, html) => {
  styleThemebookSheet(app, html);
  styleThemeKitSheet(app, html);
});

Hooks.on("renderActorSheet", (app, html) => {
  styleCrewThemeCardSheet(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  styleThemebookSheet(app, element);
  styleThemeKitSheet(app, element);
  styleCrewThemeCardSheet(app, element);
});
