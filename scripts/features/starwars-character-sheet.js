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
  return String(entry?.question ?? "").startsWith(CONSUMABLE_MARKER);
}

function getTagUsage(entry) {
  let value = String(entry?.question ?? "");

  // Backpack consumables use the beginning of the existing `question` field
  // as a category marker. Everything after the marker is the human-readable
  // adjudication note.
  if (value.startsWith(CONSUMABLE_MARKER)) {
    value = value.slice(CONSUMABLE_MARKER.length).replace(/^\s+/, "");
  }

  return value;
}

function setBackpackTagUsage(entry, usage) {
  const cleanUsage = String(usage ?? "").trim();
  if (isConsumableEntry(entry)) {
    return `${CONSUMABLE_MARKER}${cleanUsage ? `\n${cleanUsage}` : ""}`;
  }
  return cleanUsage;
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

  const existingUsage = getTagUsage(existing);

  entries[entryIndex] = {
    ...existing,
    name: itemName,
    question: category === "consumable"
      ? `${CONSUMABLE_MARKER}${existingUsage ? `\n${existingUsage}` : ""}`
      : existingUsage
  };

  await backpack.update({ "system.items": entries });
}


function resolveTagDocument(sheet, source, itemId) {
  if (source === "fellowship-themecard") {
    return sheet.actorFellowshipThemecard ?? null;
  }

  return sheet.actor.items.get(itemId) ?? null;
}

function entryAt(doc, arrayPath, index) {
  const array = foundry.utils.getProperty(doc, arrayPath);
  if (!Array.isArray(array)) return null;
  return array[index] ?? null;
}

async function updateTagUsage(sheet, {
  source = "",
  itemId = "",
  arrayPath,
  index,
  value,
  backpack = false
}) {
  const doc = resolveTagDocument(sheet, source, itemId);
  if (!doc) return;

  const array = foundry.utils.deepClone(
    Array.from(foundry.utils.getProperty(doc, arrayPath) ?? [])
  );

  if (!Number.isInteger(index) || index < 0 || index >= array.length) return;

  sheet._saveScrollPositions?.();

  if (backpack) {
    array[index].question = setBackpackTagUsage(array[index], value);
  } else {
    array[index].question = String(value ?? "").trim();
  }

  await doc.update({ [arrayPath]: array });

  if (source === "fellowship-themecard") {
    sheet.reloadFellowshipThemecard?.();
  }
}

function addUsageEditor(sheet, row, {
  source = "",
  itemId = "",
  arrayPath,
  index,
  entry,
  backpack = false
}) {
  if (!row || row.nextElementSibling?.classList?.contains("litm-sw-tag-usage-editor")) {
    return;
  }

  const editor = document.createElement("div");
  editor.className = `litm-sw-tag-usage-editor${backpack ? " backpack-usage" : ""}`;

  const label = document.createElement("div");
  label.className = "litm-sw-tag-usage-label";
  label.textContent = "USE / ADJUDICATION NOTE";

  const textarea = document.createElement("textarea");
  textarea.className = "litm-sw-tag-usage-input";
  textarea.rows = 2;
  textarea.placeholder = "When should this tag apply?";
  textarea.value = getTagUsage(entry);

  textarea.addEventListener("change", async event => {
    await updateTagUsage(sheet, {
      source,
      itemId,
      arrayPath,
      index,
      value: event.currentTarget.value,
      backpack
    });
  });

  editor.append(label, textarea);
  row.insertAdjacentElement("afterend", editor);
}

function applyUsageTooltip(element, usage) {
  if (!element) return;

  // The stock sheet uses the title attribute to say "right click to toggle burn
  // state." The Star Wars sheet instead shows the adjudication note after a
  // deliberate hover. Foundry's normal tooltip delay is 500ms; use 1000ms here
  // so these richer per-tag notes do not pop up while simply moving the mouse.
  element.removeAttribute("title");
  element.removeAttribute("data-tooltip");
  element.removeAttribute("data-tooltip-text");
  element.removeAttribute("data-tooltip-html");
  element.removeAttribute("data-tooltip-direction");

  const note = String(usage ?? "").trim() || "No adjudication note configured.";
  let timer = null;

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const deactivateOwnTooltip = () => {
    clearTimer();
    if (game.tooltip?.element === element) {
      game.tooltip.deactivate();
    }
  };

  element.addEventListener("pointerenter", () => {
    clearTimer();
    timer = window.setTimeout(() => {
      timer = null;
      if (!element.matches(":hover")) return;

      game.tooltip?.activate(element, {
        text: note,
        direction: "UP",
        cssClass: "litm-sw-tag-tooltip"
      });
    }, 1000);
  });

  element.addEventListener("pointerleave", deactivateOwnTooltip);
  element.addEventListener("pointerdown", deactivateOwnTooltip);
  element.addEventListener("contextmenu", deactivateOwnTooltip);
}

function enhanceBurnControls(root) {
  // IMPORTANT: Presentation only.
  //
  // Mist Engine already owns all tag mechanics:
  //   - click tag name -> select/deselect
  //   - right-click tag name -> burned/scratched state
  //   - click burn indicator -> queue/unqueue the tag to burn
  //
  // Earlier versions intercepted those events to draw a custom flame, which
  // accidentally broke the native behavior. Keep every native data-action and
  // listener intact and only decorate the existing burn icon.
  for (const burn of root.querySelectorAll(".burn-indicator[data-action]")) {
    burn.classList.add("litm-sw-burn-control");
    burn.dataset.tooltipText = "Queue this tag to burn for extra power.";
    burn.dataset.tooltipDirection = "UP";
    burn.setAttribute("aria-label", "Queue tag to burn for extra power");

    const icon = burn.querySelector(".burn-icon");
    if (!icon) continue;

    icon.classList.add("fa-solid", "fa-fire", "litm-sw-burn-flame");
  }
}


function enhanceTagUsageUi(sheet) {
  const root = sheet.element;
  if (!root) return;

  enhanceBurnControls(root);

  // Locked-mode power tags.
  for (const tag of root.querySelectorAll(".litm-pc-powertag.pt-selectable")) {
    const index = Number(tag.dataset.powertagIndex);
    const source = tag.dataset.source ?? "";
    const doc = resolveTagDocument(sheet, source, tag.dataset.itemId);
    const entry = doc ? entryAt(doc, "system.powertags", index) : null;
    applyUsageTooltip(tag, getTagUsage(entry));
  }

  // Locked-mode weakness tags.
  for (const tag of root.querySelectorAll(".litm-pc-weakness.wt-selectable")) {
    const index = Number(tag.dataset.weaknesstagIndex);
    const source = tag.dataset.source ?? "";
    const doc = resolveTagDocument(sheet, source, tag.dataset.itemId);
    const entry = doc ? entryAt(doc, "system.weaknesstags", index) : null;
    applyUsageTooltip(tag, getTagUsage(entry));
  }

  // Locked-mode backpack/story tags.
  for (const tag of root.querySelectorAll(".litm-pc-storytag.storytag-selectable")) {
    const index = Number(tag.dataset.index);
    const source = tag.dataset.source ?? "";
    const arrayPath = tag.dataset.key || "system.items";
    const doc = resolveTagDocument(sheet, source, tag.dataset.itemId);
    const entry = doc ? entryAt(doc, arrayPath, index) : null;
    applyUsageTooltip(tag, getTagUsage(entry));
  }

  if (!sheet.actor.system.editMode) return;

  // Unlocked-mode power tags: add a dedicated explanatory field under each tag.
  for (const row of root.querySelectorAll(".item-powertag-line")) {
    const nameInput = row.querySelector(
      '.themebook-entry-input[data-array="system.powertags"][data-key="name"]'
    );
    if (!nameInput) continue;

    const index = Number(nameInput.dataset.index);
    const source = nameInput.dataset.source ?? "";
    const itemId = nameInput.dataset.itemId ?? "";
    const doc = resolveTagDocument(sheet, source, itemId);
    const entry = doc ? entryAt(doc, "system.powertags", index) : null;
    if (!entry) continue;

    addUsageEditor(sheet, row, {
      source,
      itemId,
      arrayPath: "system.powertags",
      index,
      entry
    });
  }

  // Unlocked-mode weakness tags.
  for (const row of root.querySelectorAll(".item-weakness-line")) {
    const nameInput = row.querySelector(
      '.themebook-entry-input[data-array="system.weaknesstags"][data-key="name"]'
    );
    if (!nameInput) continue;

    const index = Number(nameInput.dataset.index);
    const source = nameInput.dataset.source ?? "";
    const itemId = nameInput.dataset.itemId ?? "";
    const doc = resolveTagDocument(sheet, source, itemId);
    const entry = doc ? entryAt(doc, "system.weaknesstags", index) : null;
    if (!entry) continue;

    addUsageEditor(sheet, row, {
      source,
      itemId,
      arrayPath: "system.weaknesstags",
      index,
      entry
    });
  }

  // Unlocked-mode story tags, including backpack equipment and consumables.
  for (const row of root.querySelectorAll(".item-storytag-line")) {
    const nameInput = row.querySelector(
      '.storytag-item-editable[type="text"]'
    );
    if (!nameInput) continue;

    const index = Number(nameInput.dataset.index);
    const source = nameInput.dataset.source ?? "";
    const itemId = nameInput.dataset.itemId ?? "";
    const arrayPath = nameInput.dataset.key || "system.items";
    const doc = resolveTagDocument(sheet, source, itemId);
    const entry = doc ? entryAt(doc, arrayPath, index) : null;
    if (!entry) continue;

    addUsageEditor(sheet, row, {
      source,
      itemId,
      arrayPath,
      index,
      entry,
      backpack: arrayPath === "system.items"
    });
  }
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
          ...BaseFullSheet.DEFAULT_OPTIONS.actions,
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

      _onRender(context, options) {
        super._onRender(context, options);
        enhanceTagUsageUi(this);
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
          ...BaseCompactSheet.DEFAULT_OPTIONS.actions,
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

      _onRender(context, options) {
        super._onRender(context, options);
        enhanceTagUsageUi(this);
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
