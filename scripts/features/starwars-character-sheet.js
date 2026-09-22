const MODULE_ID = "litm-conversion";
const SYSTEM_ID = "mist-engine-fvtt";
const CHARACTER_TYPE = "litm-character";

/**
 * Register an alternate Hero sheet which inherits the Mist Engine sheet
 * wholesale and changes only its visual identity.
 *
 * Keeping the system sheet as the superclass means all actions, drag/drop,
 * tabs, item editing, roll buttons, theme kit behavior, and future compatible
 * system logic remain the system's own implementation.
 */
Hooks.once("init", async () => {
  if (game.system?.id !== SYSTEM_ID) return;

  try {
    const fullRoute = foundry.utils.getRoute(
      `systems/${SYSTEM_ID}/module/sheets/litm-character-sheet.mjs`
    );
    const compactRoute = foundry.utils.getRoute(
      `systems/${SYSTEM_ID}/module/sheets/litm-character-compact-sheet.mjs`
    );

    const [fullModule, compactModule] = await Promise.all([
      import(fullRoute),
      import(compactRoute)
    ]);

    const BaseFullSheet = fullModule.MistEngineLegendInTheMistCharacterSheet;
    const BaseCompactSheet = compactModule.MistEngineCompactCharacterSheet;

    if (!BaseFullSheet || !BaseCompactSheet) {
      throw new Error("Mist Engine character sheet classes were not found.");
    }

    class LiTMStarWarsCharacterSheet extends BaseFullSheet {
      static DEFAULT_OPTIONS = {
        classes: ["litm-conversion-starwars-sheet"],
        position: {
          width: 1100,
          height: 800
        }
      };

      static ALTERNATE_LAYOUT = {
        id: `${MODULE_ID}.LiTMStarWarsCompactCharacterSheet`,
        icon: "fa-solid fa-compress",
        label: "Switch to compact Star Wars sheet"
      };

      /**
       * Preserve the original custom-background feature. When no custom actor
       * background is selected, the module stylesheet supplies its own neutral
       * sci-fi backdrop instead of the system's parchment/forest texture.
       */
      _applyCustomBackground() {
        const el = this.element.querySelector?.(".window-content") ?? this.element;
        const customBackground = this.actor.system.customBackground;

        el.classList.toggle(
          "litm-conversion-has-custom-background",
          Boolean(customBackground)
        );

        if (customBackground) {
          el.style.setProperty("background-image", `url("${customBackground}")`);
        } else {
          el.style.removeProperty("background-image");
        }
      }
    }

    class LiTMStarWarsCompactCharacterSheet extends BaseCompactSheet {
      static DEFAULT_OPTIONS = {
        classes: [
          "litm-conversion-starwars-sheet",
          "litm-conversion-starwars-compact"
        ],
        position: {
          width: 820
        }
      };

      static ALTERNATE_LAYOUT = {
        id: `${MODULE_ID}.LiTMStarWarsCharacterSheet`,
        icon: "fa-solid fa-expand",
        label: "Switch to full Star Wars sheet"
      };
    }

    foundry.documents.collections.Actors.registerSheet(
      MODULE_ID,
      LiTMStarWarsCharacterSheet,
      {
        makeDefault: false,
        types: [CHARACTER_TYPE],
        label: "LiTM Conversion // Star Wars"
      }
    );

    foundry.documents.collections.Actors.registerSheet(
      MODULE_ID,
      LiTMStarWarsCompactCharacterSheet,
      {
        makeDefault: false,
        types: [CHARACTER_TYPE],
        label: "LiTM Conversion // Star Wars (Compact)"
      }
    );

    console.log(`${MODULE_ID} | Star Wars character sheets registered`);
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to register Star Wars character sheet`, error);
  }
});
