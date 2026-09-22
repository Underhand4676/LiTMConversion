const SYSTEM_ID = "mist-engine-fvtt";
const CHARACTER_TYPE = "litm-character";

function addThemeClass(node) {
  if (!(node instanceof HTMLElement)) return;
  node.classList.add("litm-starwars-character-sheet");
}

function hideKnownDecorativeArt(root) {
  if (!(root instanceof HTMLElement)) return;

  const decorativeTerms = [
    "birdskull",
    "bird-skull",
    "bird_skull",
    "flower",
    "flowers",
    "floral",
    "foliage",
    "vine-decoration",
    "leaf-decoration"
  ];

  for (const image of root.querySelectorAll("img[src]")) {
    const src = String(image.getAttribute("src") ?? "").toLowerCase();
    if (decorativeTerms.some(term => src.includes(term))) {
      image.classList.add("litm-sheet-decoration-hidden");
    }
  }

  for (const node of root.querySelectorAll(
    '[class*="flower"], [class*="floral"], [class*="birdskull"], [class*="bird-skull"], [class*="ornament"]'
  )) {
    node.classList.add("litm-sheet-decoration-hidden");
  }
}

function themeCharacterSheet(app, element) {
  if (game.system?.id !== SYSTEM_ID) return;

  const actor = app?.document ?? app?.actor ?? null;
  if (!actor || actor.documentName !== "Actor" || actor.type !== CHARACTER_TYPE) return;

  addThemeClass(element);
  addThemeClass(app?.element);
  addThemeClass(element?.closest?.(".application"));

  hideKnownDecorativeArt(element);
  if (app?.element && app.element !== element) hideKnownDecorativeArt(app.element);
}

Hooks.on("renderActorSheetV2", (app, element) => {
  themeCharacterSheet(app, element);
});

// Fallback for system sheets whose concrete ApplicationV2 class does not
// dispatch the generic ActorSheet hook in the expected way.
Hooks.on("renderApplicationV2", (app, element) => {
  themeCharacterSheet(app, element);
});
