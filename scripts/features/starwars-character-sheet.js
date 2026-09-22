const MODULE_ID = "litm-conversion";
const SYSTEM_ID = "mist-engine-fvtt";
const CHARACTER_TYPE = "litm-character";

const CONSUMABLE_MARKER = "__LITM_CONVERSION_CONSUMABLE__";
const GEAR_CAPACITY = 4;
const CONSUMABLE_CAPACITY = 2;
const HIDDEN_CARD_TYPES = new Set(["quintessences", "fellowships"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function prepareStarWarsContext(context) {
  const slots = buildBackpackSlots(context.backpack);
  context.backpackGearSlots = slots.gearSlots;
  context.backpackConsumableSlots = slots.consumableSlots;
  context.backpackGearCount = slots.gearCount;
  context.backpackConsumableCount = slots.consumableCount;
  context.backpackOverflowCount = slots.overflowCount;

  // These two stock singleton cards are intentionally omitted from the Star
  // Wars sheet only. Their data remains on the Actor and reappears unchanged if
  // the user switches back to a stock Mist Engine sheet.
  context.mainCards = Array.from(context.mainCards ?? [])
    .filter(card => !HIDDEN_CARD_TYPES.has(card.type));
  context.otherCards = Array.from(context.otherCards ?? [])
    .filter(card => !HIDDEN_CARD_TYPES.has(card.type));

  return context;
}

function newBackpackEntry(name, category) {
  return {
    name,
    selected: false,
    burned: false,
    toBurn: false,
    planned: false,
    expiring: false,
    expired: false,
    question: category === "consumable" ? CONSUMABLE_MARKER : ""
  };
}

async function promptForNewBackpackItem(category) {
  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: category === "consumable" ? "CONSUMABLE SLOT" : "BACKPACK SLOT"
      },
      content: `
        <div style="font-family:monospace;padding:7px 2px 10px;color:#d9eef0;">
          <div style="color:${category === "consumable" ? "#d2ad6f" : "#8fd7df"};font-size:10px;font-weight:700;letter-spacing:.13em;margin-bottom:8px;">
            ${category === "consumable" ? "SINGLE-USE LOADOUT" : "GENERAL EQUIPMENT"}
          </div>
          <input name="itemName" type="text" autofocus placeholder="Item designation"
            style="width:100%;box-sizing:border-box;background:#091216;color:#e9f3f4;border:1px solid #44666d;padding:8px;font-family:monospace;">
        </div>
      `,
      ok: {
        label: "LOAD SLOT",
        callback: (_event, button) => button.form.elements.itemName.value
      },
      modal: true
    });

    return String(result ?? "").trim();
  } catch (_error) {
    return "";
  }
}

async function handleCreateBackpackSlotItem(event, target) {
  event.preventDefault();
  event.stopPropagation();

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

  const itemName = await promptForNewBackpackItem(category);
  if (!itemName) return;

  this._saveScrollPositions?.();
  await backpack.update({
    "system.items": [
      ...(backpack.system.items ?? []),
      newBackpackEntry(itemName, category)
    ]
  });
}

async function handleEditBackpackSlot(event, target) {
  event.preventDefault();
  event.stopPropagation();

  const backpack = this.actor.items.get(target.dataset.itemId);
  if (!backpack) return;

  const category = target.dataset.category === "consumable" ? "consumable" : "gear";
  const entryIndex = Number(target.dataset.entryIndex);
  const entries = foundry.utils.deepClone(Array.from(backpack.system.items ?? []));
  const existing = Number.isInteger(entryIndex) && entryIndex >= 0 && entryIndex < entries.length
    ? entries[entryIndex]
    : null;

  // Empty numbered slots use the exact same control: click the slot number and
  // load an item without ever unlocking the character sheet.
  if (!existing || !isFilledBackpackEntry(existing)) {
    return handleCreateBackpackSlotItem.call(this, event, target);
  }

  let result;
  try {
    result = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: category === "consumable" ? "EDIT CONSUMABLE SLOT" : "EDIT BACKPACK SLOT"
      },
      content: `
        <div style="font-family:monospace;padding:7px 2px 10px;color:#d9eef0;">
          <div style="color:${category === "consumable" ? "#d2ad6f" : "#8fd7df"};font-size:10px;font-weight:700;letter-spacing:.13em;margin-bottom:8px;">
            ${category === "consumable" ? "SINGLE-USE LOADOUT" : "GENERAL EQUIPMENT"}
          </div>
          <label style="display:block;color:#81999e;font-size:9px;letter-spacing:.09em;margin-bottom:4px;">ITEM DESIGNATION</label>
          <input name="itemName" type="text" autofocus value="${escapeHtml(existing.name)}"
            style="width:100%;box-sizing:border-box;background:#091216;color:#e9f3f4;border:1px solid #44666d;padding:8px;font-family:monospace;">
          <label style="display:flex;align-items:center;gap:7px;margin-top:11px;padding:7px 8px;border-left:2px solid #a85f52;background:rgba(168,95,82,.08);color:#d7aaa2;font-size:9px;letter-spacing:.08em;">
            <input name="removeItem" type="checkbox" style="margin:0;">
            REMOVE ITEM FROM SLOT
          </label>
        </div>
      `,
      ok: {
        label: "COMMIT SLOT",
        callback: (_event, button) => ({
          name: button.form.elements.itemName.value,
          remove: Boolean(button.form.elements.removeItem.checked)
        })
      },
      modal: true
    });
  } catch (_error) {
    return;
  }

  if (!result) return;

  this._saveScrollPositions?.();

  if (result.remove) {
    entries.splice(entryIndex, 1);
    await backpack.update({ "system.items": entries });
    return;
  }

  const itemName = String(result.name ?? "").trim();
  if (!itemName) return;

  entries[entryIndex] = {
    ...existing,
    name: itemName,
    question: category === "consumable" ? CONSUMABLE_MARKER : ""
  };

  await backpack.update({ "system.items": entries });
}

function availableCrewThemecards(sheet) {
  const assignedUser = game.users.find(
    user => user.character?._id === sheet.actor.id && !user.isGM
  );

  if (assignedUser) {
    return game.actors.filter(actor =>
      actor.id !== sheet.actor.id &&
      actor.type === "litm-fellowship-themecard" &&
      actor.testUserPermission(assignedUser, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
  }

  return game.actors.filter(actor => actor.type === "litm-fellowship-themecard");
}

async function assignCrewThemecard(sheet) {
  const crewCards = availableCrewThemecards(sheet);

  if (!crewCards.length) {
    ui.notifications.warn("No Crew Theme Card is available to assign.");
    return;
  }

  let selected = crewCards[0];

  if (crewCards.length > 1) {
    const options = crewCards
      .map(actor => `<option value="${actor.id}">${escapeHtml(actor.name)}</option>`)
      .join("");

    let selectedId;
    try {
      selectedId = await foundry.applications.api.DialogV2.prompt({
        window: { title: "SELECT CREW THEME CARD" },
        content: `<select name="themecardId" style="width:100%;">${options}</select>`,
        ok: {
          label: "ASSIGN CREW",
          callback: (_event, button) => button.form.elements.themecardId.value
        }
      });
    } catch (_error) {
      return;
    }

    if (!selectedId) return;
    selected = game.actors.get(selectedId);
  }

  if (!selected) return;
  sheet.actorFellowshipThemecard = selected;
  await sheet.actor.update({ "system.actorSharedSingleThemecardId": selected.id });
}

async function createAndAssignCrewThemecard(sheet) {
  const assignedUser = game.users.find(
    user => user.character?._id === sheet.actor.id && !user.isGM
  );

  let newName;
  try {
    newName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "CREATE CREW THEME CARD" },
      content: `
        <div style="font-family:monospace;padding:6px 0;">
          <label style="display:block;margin-bottom:5px;">CREW NAME</label>
          <input name="themecardName" type="text" value="Crew" autofocus>
        </div>
      `,
      ok: {
        label: "CREATE CREW",
        callback: (_event, button) => button.form.elements.themecardName.value
      }
    });
  } catch (_error) {
    return;
  }

  newName = String(newName ?? "").trim();
  if (!newName) return;

  const actorData = {
    name: newName,
    type: "litm-fellowship-themecard"
  };

  if (assignedUser) {
    actorData.ownership = {
      [assignedUser.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    };
  }

  const created = await Actor.create(actorData);
  if (!created) return;

  sheet.actorFellowshipThemecard = created;
  await sheet.actor.update({ "system.actorSharedSingleThemecardId": created.id });
}

/**
 * Register alternate Hero sheets which inherit Mist Engine's own character
 * sheet classes and replace only presentation plus selected card renderers.
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
      `modules/${MODULE_ID}/templates/actor/parts/starwars-backpack-partial.hbs`,
      `modules/${MODULE_ID}/templates/actor/parts/starwars-crew-themecard.hbs`
    ]);

    class LiTMStarWarsCharacterSheet extends BaseFullSheet {
      static DEFAULT_OPTIONS = {
        classes: ["litm-conversion-starwars-sheet"],
        position: {
          width: 1100,
          height: 800
        },
        actions: {
          createLiTMBackpackSlotItem: handleCreateBackpackSlotItem,
          editLiTMBackpackSlot: handleEditBackpackSlot
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
        return prepareStarWarsContext(context);
      }

      async assignFellowshipThemecard() {
        return assignCrewThemecard(this);
      }

      async createAndAssignFellowshipThemecard() {
        return createAndAssignCrewThemecard(this);
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
          createLiTMBackpackSlotItem: handleCreateBackpackSlotItem,
          editLiTMBackpackSlot: handleEditBackpackSlot
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
        return prepareStarWarsContext(context);
      }

      async assignFellowshipThemecard() {
        return assignCrewThemecard(this);
      }

      async createAndAssignFellowshipThemecard() {
        return createAndAssignCrewThemecard(this);
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
