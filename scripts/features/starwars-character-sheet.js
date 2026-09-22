const MODULE_ID = "litm-conversion";
const SYSTEM_ID = "mist-engine-fvtt";
const CHARACTER_TYPE = "litm-character";

const CONSUMABLE_MARKER = "__LITM_CONVERSION_CONSUMABLE__";
const GEAR_CAPACITY = 4;
const CONSUMABLE_CAPACITY = 2;

function isFilledBackpackEntry(entry) {
  return Boolean(entry?.name && String(entry.name).trim().length);
}

function isConsumableEntry(entry) {
  return entry?.question === CONSUMABLE_MARKER;
}

function buildBackpackSlots(backpack) {
  const entries = Array.from(backpack?.system?.items ?? []);
  const filled = entries
    .map((storytag, index) => ({ storytag, index }))
    .filter(({ storytag }) => isFilledBackpackEntry(storytag));

  const explicitConsumables = filled.filter(({ storytag }) => isConsumableEntry(storytag));
  const unmarked = filled.filter(({ storytag }) => !isConsumableEntry(storytag));

  // Older backpacks predate the fixed-slot layout. Keep the first four entries
  // as general gear and display up to two legacy overflow entries as consumables.
  // No existing data is deleted or rewritten merely by opening this sheet.
  const gearEntries = unmarked.slice(0, GEAR_CAPACITY);
  const legacyConsumables = unmarked.slice(GEAR_CAPACITY);
  const consumableEntries = [
    ...explicitConsumables,
    ...legacyConsumables
  ].slice(0, CONSUMABLE_CAPACITY);

  const shownIndices = new Set([
    ...gearEntries.map(entry => entry.index),
    ...consumableEntries.map(entry => entry.index)
  ]);

  const toSlots = (items, capacity, category) =>
    Array.from({ length: capacity }, (_, slotIndex) => {
      const item = items[slotIndex] ?? null;
      return {
        occupied: Boolean(item),
        storytag: item?.storytag ?? null,
        index: item?.index ?? -1,
        slotNumber: slotIndex + 1,
        category
      };
    });

  return {
    gearSlots: toSlots(gearEntries, GEAR_CAPACITY, "gear"),
    consumableSlots: toSlots(consumableEntries, CONSUMABLE_CAPACITY, "consumable"),
    gearCount: gearEntries.length,
    consumableCount: consumableEntries.length,
    overflowCount: filled.filter(entry => !shownIndices.has(entry.index)).length
  };
}

function addBackpackContext(context) {
  const slots = buildBackpackSlots(context.backpack);
  context.backpackGearSlots = slots.gearSlots;
  context.backpackConsumableSlots = slots.consumableSlots;
  context.backpackGearCount = slots.gearCount;
  context.backpackConsumableCount = slots.consumableCount;
  context.backpackOverflowCount = slots.overflowCount;
  return context;
}

async function handleCreateBackpackSlotItem(event, target) {
  event.preventDefault();

  const backpack = this.actor.items.get(target.dataset.itemId);
  if (!backpack) return;

  const category = target.dataset.category === "consumable" ? "consumable" : "gear";
  const slots = buildBackpackSlots(backpack);
  const currentCount = category === "consumable" ? slots.consumableCount : slots.gearCount;
  const capacity = category === "consumable" ? CONSUMABLE_CAPACITY : GEAR_CAPACITY;

  if (currentCount >= capacity) {
    ui.notifications.warn(
      category === "consumable"
        ? "Consumable slots are full."
        : "Backpack gear slots are full."
    );
    return;
  }

  let itemName;
  try {
    itemName = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: category === "consumable" ? "Load Consumable" : "Load Backpack Slot"
      },
      content: `
        <div style="font-family:monospace;padding:4px 0 8px;">
          <label style="display:block;margin-bottom:6px;font-size:11px;letter-spacing:.08em;">
            ${category === "consumable" ? "CONSUMABLE / SINGLE-USE ITEM" : "GENERAL EQUIPMENT"}
          </label>
          <input name="itemName" type="text" autofocus placeholder="Item name">
        </div>
      `,
      ok: {
        label: "LOAD SLOT",
        callback: (_event, button) => button.form.elements.itemName.value
      },
      modal: true
    });
  } catch (_error) {
    return;
  }

  itemName = String(itemName ?? "").trim();
  if (!itemName) return;

  const next = {
    name: itemName,
    selected: false,
    burned: false,
    toBurn: false,
    planned: false,
    expiring: false,
    expired: false,
    question: category === "consumable" ? CONSUMABLE_MARKER : ""
  };

  await backpack.update({
    "system.items": [...(backpack.system.items ?? []), next]
  });
}

/**
 * Register alternate Hero sheets which inherit Mist Engine's own character
 * sheet classes and replace only presentation plus the backpack renderer.
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

    await foundry.applications.handlebars.loadTemplates([
      `modules/${MODULE_ID}/templates/actor/parts/starwars-card-dispatch.hbs`,
      `modules/${MODULE_ID}/templates/actor/parts/starwars-backpack-partial.hbs`
    ]);

    class LiTMStarWarsCharacterSheet extends BaseFullSheet {
      static DEFAULT_OPTIONS = {
        classes: ["litm-conversion-starwars-sheet"],
        position: {
          width: 1100,
          height: 800
        },
        actions: {
          createLiTMBackpackSlotItem: handleCreateBackpackSlotItem
        }
      };

      static PARTS = {
        ...BaseFullSheet.PARTS,
        character: {
          id: "character",
          template: `modules/${MODULE_ID}/templates/actor/parts/starwars-tab-main.hbs`,
          scrollable: [".scrollable"]
        },
        other: {
          id: "other",
          template: `modules/${MODULE_ID}/templates/actor/parts/starwars-tab-other.hbs`,
          scrollable: [".scrollable"]
        }
      };

      static ALTERNATE_LAYOUT = {
        id: `${MODULE_ID}.LiTMStarWarsCompactCharacterSheet`,
        icon: "fa-solid fa-compress",
        label: "Switch to compact Star Wars sheet"
      };

      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return addBackpackContext(context);
      }

      /** Preserve Mist Engine's actor-picked custom background option. */
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
        },
        actions: {
          createLiTMBackpackSlotItem: handleCreateBackpackSlotItem
        }
      };

      static PARTS = {
        ...BaseCompactSheet.PARTS,
        character: {
          id: "character",
          template: `modules/${MODULE_ID}/templates/actor/parts/starwars-tab-main.hbs`,
          scrollable: [".scrollable"]
        },
        other: {
          id: "other",
          template: `modules/${MODULE_ID}/templates/actor/parts/starwars-tab-other.hbs`,
          scrollable: [".scrollable"]
        }
      };

      static ALTERNATE_LAYOUT = {
        id: `${MODULE_ID}.LiTMStarWarsCharacterSheet`,
        icon: "fa-solid fa-expand",
        label: "Switch to full Star Wars sheet"
      };

      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return addBackpackContext(context);
      }
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
