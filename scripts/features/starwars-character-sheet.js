import { openProbabilityProcessor } from "./probability-processor.js";

const MODULE_ID = "litm-conversion";
const SYSTEM_ID = "mist-engine-fvtt";
const CHARACTER_TYPE = "litm-character";

const CONSUMABLE_MARKER = "__LITM_CONVERSION_CONSUMABLE__";
const GEAR_CAPACITY = 4;
const CONSUMABLE_CAPACITY = 2;
const HIDDEN_CARD_TYPES = new Set(["quintessences", "fellowships"]);


const LIVING_STANDARD_FLAG = "livingStandard";

const LIVING_STANDARDS = {
  destitute: { label: "Destitute", spend: "ᖬ10" },
  poor:      { label: "Poor",      spend: "ᖬ40" },
  average:   { label: "Average",   spend: "ᖬ200" },
  wealthy:   { label: "Wealthy",   spend: "ᖬ1,000" },
  rich:      { label: "Rich",      spend: "ᖬ5,000" }
};


const CURRENT_CREDITS_FLAG = "currentCredits";

function getCurrentCredits(actor) {
  const raw = Number(actor?.getFlag(MODULE_ID, CURRENT_CREDITS_FLAG) ?? 0);

  if (!Number.isFinite(raw)) return 0;

  return Math.max(0, Math.trunc(raw));
}

function formatCredits(value) {
  const amount = Math.max(0, Math.trunc(Number(value) || 0));
  return `ᖬ${amount.toLocaleString("en-US")}`;
}

function canModifyCredits(actor) {
  return Boolean(game.user.isGM || actor?.isOwner);
}

async function showFinancialFault(message) {
  await foundry.applications.api.DialogV2.prompt({
    window: {
      title: "FINANCIAL ACCESS FAULT // REPUBLIC INTELLIGENCE"
    },

    content: `
      <div style="
        padding:16px;
        background:linear-gradient(135deg,#171312 0%,#231916 100%);
        border:1px solid #9b5e4a;
        box-shadow:inset 0 0 0 1px #0d0908;
        color:#f1ded8;
        font-family:monospace;
      ">
        <div style="
          color:#e18768;
          font-size:11px;
          font-weight:bold;
          letter-spacing:2px;
          padding-bottom:8px;
          margin-bottom:10px;
          border-bottom:1px solid #704438;
        ">
          LEDGER MODIFICATION REJECTED
        </div>

        <div style="
          border-left:3px solid #b36750;
          padding:8px 11px;
          color:#f1c9bd;
          font-size:10px;
          letter-spacing:.7px;
          line-height:1.5;
        ">
          ${escapeHtml(message)}
        </div>

        <div style="
          margin-top:10px;
          color:#86665d;
          font-size:8px;
          letter-spacing:1.1px;
        ">
          BANK RELAY CLOSED // NO ACCOUNT DATA ALTERED
        </div>
      </div>
    `,

    ok: {
      label: "ACKNOWLEDGE",
      icon: "fa-solid fa-triangle-exclamation"
    },

    modal: true
  });
}

async function modifyCurrentCredits(sheet) {
  if (!canModifyCredits(sheet.actor)) return;

  const current = getCurrentCredits(sheet.actor);

  let result;
  try {
    result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: "REPUBLIC INTELLIGENCE // FINANCIAL LEDGER ACCESS"
      },

      content: `
        <div style="
          padding:16px;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(126,198,207,.018) 0px,
              rgba(126,198,207,.018) 1px,
              transparent 1px,
              transparent 4px
            ),
            linear-gradient(145deg,#0b1417,#111b1e);
          border:1px solid #49686e;
          box-shadow:inset 0 0 20px rgba(0,0,0,.55);
          color:#dbe8e8;
          font-family:monospace;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            padding-bottom:10px;
            margin-bottom:13px;
            border-bottom:1px solid #30484d;
          ">
            <div>
              <div style="
                color:#8ed0d5;
                font-size:11px;
                font-weight:700;
                letter-spacing:1.8px;
              ">
                ◈ COVERT FINANCIAL INTERCEPT
              </div>

              <div style="
                margin-top:4px;
                color:#668085;
                font-size:8px;
                letter-spacing:1px;
              ">
                CIVILIAN BANK NODE // CREDENTIAL SPOOF ACTIVE
              </div>
            </div>

            <div style="
              color:#b9a574;
              font-size:8px;
              letter-spacing:1px;
              text-align:right;
            ">
              RI/FIN-LEDGER
            </div>
          </div>


          <!-- EDITABLE VERIFIED BALANCE -->
          <label style="
            display:grid;
            grid-template-columns:1fr auto;
            align-items:end;
            gap:12px;
            padding:10px 11px;
            margin-bottom:12px;
            background:#091114;
            border-left:3px solid #b79b5f;
          ">

            <div>
              <div style="
                color:#708b90;
                font-size:8px;
                letter-spacing:1.4px;
                margin-bottom:5px;
              ">
                VERIFIED ACCOUNT BALANCE
              </div>

              <span style="
                display:grid;
                grid-template-columns:auto 1fr;
                align-items:center;
                max-width:230px;
                background:#081114;
                border:1px solid #45646a;
                border-left:2px solid #b79b5f;
              ">
                <span style="
                  padding-left:9px;
                  color:#d6bc7a;
                  font-size:17px;
                  font-weight:700;
                ">
                  ᖬ
                </span>

                <input
                  name="balance"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  value="${current}"
                  style="
                    width:100%;
                    box-sizing:border-box;
                    margin:0;
                    background:transparent;
                    color:#f0eee5;
                    border:0;
                    padding:8px;
                    font-family:monospace;
                    font-size:18px;
                    font-weight:700;
                    text-align:right;
                    outline:none;
                  "
                >
              </span>
            </div>

            <div style="
              color:#6d7d7f;
              font-size:7px;
              letter-spacing:1px;
              text-align:right;
            ">
              LEDGER SYNCED<br>
              DIRECT EDIT ENABLED
            </div>

          </label>


          <!-- TRANSACTION VALUE -->
          <label style="
            display:grid;
            grid-template-columns:145px 1fr;
            align-items:center;
            gap:10px;
          ">
            <span style="
              color:#79979b;
              font-size:8px;
              font-weight:700;
              letter-spacing:1.3px;
            ">
              CREDIT VALUE
            </span>

            <span style="
              display:grid;
              grid-template-columns:auto 1fr;
              align-items:center;
              background:#081114;
              border:1px solid #45646a;
              border-left:2px solid #6f9399;
            ">
              <span style="
                padding-left:9px;
                color:#8ea9ad;
                font-size:15px;
                font-weight:700;
              ">
                ᖬ
              </span>

              <input
                name="amount"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                value=""
                placeholder="0"
                autofocus
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:0;
                  background:transparent;
                  color:#f0eee5;
                  border:0;
                  padding:8px;
                  font-family:monospace;
                  font-size:15px;
                  text-align:right;
                  outline:none;
                "
              >
            </span>
          </label>


          <div style="
            margin-top:13px;
            padding-top:8px;
            border-top:1px solid #263b40;
            color:#5f777b;
            font-size:8px;
            letter-spacing:1px;
            line-height:1.45;
          ">
            EDIT THE VERIFIED BALANCE DIRECTLY OR ENTER A TRANSACTION VALUE.
            BLANK TRANSACTION VALUES ARE INTERPRETED AS ZERO.
          </div>

          <div style="
            margin-top:6px;
            color:#536a6e;
            font-size:7px;
            letter-spacing:1px;
          ">
            ROUTE MASKED // REPUBLIC INTELLIGENCE CLEARANCE ACCEPTED
          </div>

        </div>
      `,

      buttons: [
        {
          action: "inject",
          label: "CREDIT INJECTION",
          icon: "fa-solid fa-plus",
          default: true,
          callback: (_event, button) => ({
            operation: "add",
            balance: button.form.elements.balance.value,
            amount: button.form.elements.amount.value
          })
        },
        {
          action: "extract",
          label: "DEBIT EXTRACTION",
          icon: "fa-solid fa-minus",
          callback: (_event, button) => ({
            operation: "subtract",
            balance: button.form.elements.balance.value,
            amount: button.form.elements.amount.value
          })
        }
      ],

      rejectClose: false,
      modal: true
    });
  } catch (_error) {
    return;
  }

  if (!result) return;

  // The displayed balance is always pre-filled, but if the user clears it,
  // treat that as zero instead of throwing an error. The transaction field is
  // intentionally blank by default and blank also means zero.
  const balanceText = String(result.balance ?? "").trim();
  const amountText = String(result.amount ?? "").trim();

  const baseBalance = balanceText === "" ? 0 : Number(balanceText);
  const amount = amountText === "" ? 0 : Number(amountText);

  if (
    !Number.isFinite(baseBalance) ||
    baseBalance < 0 ||
    !Number.isInteger(baseBalance)
  ) {
    await showFinancialFault(
      "VERIFIED ACCOUNT BALANCE MUST BE A WHOLE NUMBER OF ZERO OR GREATER."
    );
    return;
  }

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isInteger(amount)
  ) {
    await showFinancialFault(
      "CREDIT VALUE MUST BE A WHOLE NUMBER OF ZERO OR GREATER."
    );
    return;
  }

  let updated = baseBalance;

  if (result.operation === "add") {
    updated = baseBalance + amount;
  }

  else if (result.operation === "subtract") {
    if (amount > baseBalance) {
      await showFinancialFault(
        `DEBIT EXTRACTION OF ${formatCredits(amount)} EXCEEDS TARGET BALANCE OF ${formatCredits(baseBalance)}.`
      );
      return;
    }

    updated = baseBalance - amount;
  }

  await sheet.actor.setFlag(
    MODULE_ID,
    CURRENT_CREDITS_FLAG,
    Math.trunc(updated)
  );

  sheet.render({ force: true });
}

function createCreditsModifyButton(sheet) {
  if (!canModifyCredits(sheet.actor)) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "litm-sw-credits-modify";
  button.title = "Modify current credits";
  button.setAttribute("aria-label", "Modify current credits");
  button.innerHTML = `
    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
    <span>MODIFY</span>
  `;

  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    await modifyCurrentCredits(sheet);
  });

  return button;
}

function getLivingStandard(actor) {
  const stored = String(
    actor?.getFlag(MODULE_ID, LIVING_STANDARD_FLAG) ?? "average"
  ).toLowerCase();

  const key = Object.hasOwn(LIVING_STANDARDS, stored)
    ? stored
    : "average";

  return {
    key,
    ...LIVING_STANDARDS[key]
  };
}

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
  // deliberate hover. Foundry's normal tooltip delay is 500ms; use 750ms here
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
    }, 750);
  });

  element.addEventListener("pointerleave", deactivateOwnTooltip);
  element.addEventListener("pointerdown", deactivateOwnTooltip);
  element.addEventListener("contextmenu", deactivateOwnTooltip);
}

function enhanceBurnControls(root) {
  // Presentation only.
  //
  // The parent .burn-indicator and its native data-action stay completely
  // untouched. The icon is drawn as inline SVG so it does not depend on
  // Font Awesome glyph fonts, which were rendering as a missing-glyph box.
  for (const burn of root.querySelectorAll(".burn-indicator[data-action]")) {
    burn.classList.add("litm-sw-burn-control");
    burn.dataset.tooltipText = "Queue this tag to burn for extra power.";
    burn.dataset.tooltipDirection = "UP";
    burn.setAttribute("aria-label", "Queue tag to burn for extra power");

    const stockIcon = burn.querySelector(".burn-icon");
    const existingIcon = burn.querySelector(".litm-sw-burn-svg");
    const wasQueued = Boolean(
      stockIcon?.classList.contains("to-burn") ||
      existingIcon?.classList.contains("to-burn")
    );

    const svgNS = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNS, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.classList.add("litm-sw-burn-svg");
    if (wasQueued) icon.classList.add("to-burn");

    const outer = document.createElementNS(svgNS, "path");
    outer.setAttribute(
      "d",
      "M13.5 2.5c.4 2.3-.3 3.8-1.6 5.2-1.2-2.1-2.9-3.5-4.2-4.2.2 2.6-.7 4.5-2.1 6.1C4.3 11 3.5 12.8 3.5 15a8.5 8.5 0 0 0 17 0c0-4.8-2.8-8.7-7-12.5Z"
    );

    const inner = document.createElementNS(svgNS, "path");
    inner.setAttribute(
      "d",
      "M12.3 20.2c-2.2 0-4-1.6-4-3.8 0-1.7 1-3 2.2-4.2.1 1.1.5 2 1.3 2.7.7-.8 1.1-1.8 1-3 1.7 1.2 3.5 2.8 3.5 4.7 0 2-1.8 3.6-4 3.6Z"
    );
    inner.classList.add("litm-sw-burn-svg-core");

    icon.append(outer, inner);

    // Preserve the native clickable wrapper and its data-action. Only replace
    // the visual child.
    burn.replaceChildren(icon);
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


function enhanceLivingStandardUi(sheet) {
  const root = sheet.element;
  if (!root) return;

  root.querySelectorAll(".litm-sw-living-standard").forEach(element => element.remove());

  const standard = getLivingStandard(sheet.actor);
  const credits = getCurrentCredits(sheet.actor);
  const header = root.querySelector(".sheet-header");
  if (!header) return;

  if (sheet.actor.system.editMode) {
    const identity =
      header.querySelector(".col-character-name.edit-mode") ??
      header.querySelector(".col-compact-identity.edit-mode");

    if (!identity) return;

    const control = document.createElement("div");
    control.className = "litm-sw-living-standard litm-sw-living-standard-edit";

    const standardLabel = document.createElement("label");
    standardLabel.className = "litm-sw-living-standard-label";
    standardLabel.textContent = "LIVING STANDARD";

    const select = document.createElement("select");
    select.className = "litm-sw-living-standard-select";
    select.setAttribute("aria-label", "Living Standard");

    for (const [key, entry] of Object.entries(LIVING_STANDARDS)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = entry.label;
      option.selected = key === standard.key;
      select.append(option);
    }

    select.addEventListener("change", async event => {
      const value = String(event.currentTarget.value ?? "average");
      if (!Object.hasOwn(LIVING_STANDARDS, value)) return;

      await sheet.actor.setFlag(MODULE_ID, LIVING_STANDARD_FLAG, value);
    });

    const creditsLabel = document.createElement("span");
    creditsLabel.className = "litm-sw-living-standard-label";
    creditsLabel.textContent = "CURRENT CREDITS";

    const creditsControl = document.createElement("div");
    creditsControl.className = "litm-sw-credits-control";

    const creditsValue = document.createElement("span");
    creditsValue.className = "litm-sw-credits-value";
    creditsValue.textContent = formatCredits(credits);

    creditsControl.append(creditsValue);

    const modifyButton = createCreditsModifyButton(sheet);
    if (modifyButton) creditsControl.append(modifyButton);

    control.append(
      standardLabel,
      select,
      creditsLabel,
      creditsControl
    );

    // Full sheet: keep the economic profile immediately above the custom
    // background controls so it reads as part of the character record.
    const backgroundControls = identity.querySelector(".grid.grid-4col");
    if (backgroundControls) {
      identity.insertBefore(control, backgroundControls);
    } else {
      identity.append(control);
    }

    return;
  }

  // Locked mode: present Living Standard and Credits as dossier metadata.
  const identity =
    header.querySelector(".character-name-container") ??
    header.querySelector(".col-compact-identity");

  if (!identity) return;

  const dossier = document.createElement("div");
  dossier.className = "litm-sw-living-standard litm-sw-living-standard-dossier";

  const standardRow = document.createElement("div");
  standardRow.className = "litm-sw-dossier-row";

  const standardLabel = document.createElement("span");
  standardLabel.className = "litm-sw-living-standard-dossier-label";
  standardLabel.textContent = "LIVING STANDARD";

  const standardValue = document.createElement("span");
  standardValue.className = "litm-sw-living-standard-dossier-value";
  standardValue.textContent =
    `${standard.label.toUpperCase()} // SPEND LEVEL ${standard.spend}`;

  standardRow.append(standardLabel, standardValue);


  const creditsRow = document.createElement("div");
  creditsRow.className = "litm-sw-dossier-row litm-sw-dossier-row-credits";

  const creditsLabel = document.createElement("span");
  creditsLabel.className = "litm-sw-living-standard-dossier-label";
  creditsLabel.textContent = "CURRENT CREDITS";

  const creditsRight = document.createElement("span");
  creditsRight.className = "litm-sw-dossier-credit-cluster";

  const creditsValue = document.createElement("span");
  creditsValue.className = "litm-sw-living-standard-dossier-value litm-sw-current-credits";
  creditsValue.textContent = formatCredits(credits);

  creditsRight.append(creditsValue);

  const modifyButton = createCreditsModifyButton(sheet);
  if (modifyButton) creditsRight.append(modifyButton);

  creditsRow.append(creditsLabel, creditsRight);

  dossier.append(standardRow, creditsRow);
  identity.append(dossier);
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

let cachedMistDiceRollApp = null;

async function getMistDiceRollAppClass() {
  if (cachedMistDiceRollApp) return cachedMistDiceRollApp;

  const route = foundry.utils.getRoute(
    `systems/${SYSTEM_ID}/module/apps/dice-roll-app.mjs`
  );

  const module = await import(route);
  cachedMistDiceRollApp = module.DiceRollApp;

  if (!cachedMistDiceRollApp) {
    throw new Error("Mist Engine DiceRollApp could not be loaded.");
  }

  return cachedMistDiceRollApp;
}

function calculateProbabilityInputs(selectedTags) {
  let dicePool = 0;
  let cut = 0;

  for (const tag of Array.from(selectedTags ?? [])) {
    // Selected Weakness Tags hinder the roll rather than adding a d6.
    if (tag?.weakness) {
      cut += 1;
      continue;
    }

    // Every other selected tag contributes one d6. A tag queued to burn
    // contributes two dice total instead of one.
    dicePool += tag?.toBurn ? 2 : 1;
  }

  return { dicePool, cut };
}

async function launchStarWarsProbabilityRoll(sheet, {
  rollType = "quick",
  detailed = false
} = {}) {
  const actor = sheet.actor;
  if (!actor) return;

  const DiceRollApp = await getMistDiceRollAppClass();

  // Use Mist Engine's own preparation layer so the processor sees exactly the
  // tags the base roller would have seen.
  const nativeRollApp = DiceRollApp.getInstance({
    actor,
    type: rollType
  });

  nativeRollApp.updateTagsAndStatuses(false);

  const { dicePool, cut } = calculateProbabilityInputs(
    nativeRollApp.selectedTags
  );

  await openProbabilityProcessor({
    actor,
    initialPool: dicePool,
    initialCut: cut,
    detailed,

    // Nothing is consumed by merely opening/canceling the processor.
    // After RUN SOLUTION actually generates a roll, Mist Engine's own cleanup
    // deselects used tags and converts queued burns into burned/struck tags.
    onRollCommitted: async () => {
      nativeRollApp.updateTagsAndStatuses(false);
      await nativeRollApp.resetTags();
    }
  });
}

async function handleStarWarsQuickRoll(event, target) {
  event.preventDefault();

  await launchStarWarsProbabilityRoll(this, {
    rollType: "quick",
    detailed: false
  });
}

async function handleStarWarsDetailedRoll(event, target) {
  event.preventDefault();

  await launchStarWarsProbabilityRoll(this, {
    rollType: "detailed",
    detailed: true
  });
}


async function handleStarWarsReactionRoll(event, target) {
  event.preventDefault();

  await launchStarWarsProbabilityRoll(this, {
    rollType: "reaction",
    detailed: false
  });
}

function sacrificeOutcomePresentation({
  outcome,
  levelLabel,
  lessenedLabel
}) {
  if (outcome === "miracle") {
    return {
      code: "MIRACLE",
      threshold: "10+",
      color: "#8fc7a0",
      border: "#547660",
      objective: "OBJECTIVE STATUS // ACHIEVED",
      consequence: `CONSEQUENCE LOAD // REDUCED ONE LEVEL`,
      transition: `${levelLabel} → ${lessenedLabel}`,
      text: game.i18n.localize("MIST_ENGINE.SACRIFICE.MiracleText")
    };
  }

  if (outcome === "fate") {
    return {
      code: "FATE",
      threshold: "7–9",
      color: "#d4aa63",
      border: "#8a7044",
      objective: "OBJECTIVE STATUS // ACHIEVED",
      consequence: "CONSEQUENCE LOAD // FULL",
      transition: levelLabel,
      text: game.i18n.localize("MIST_ENGINE.SACRIFICE.FateText")
    };
  }

  return {
    code: "IN VAIN",
    threshold: "6−",
    color: "#c95f63",
    border: "#8e4145",
    objective: "OBJECTIVE STATUS // FAILED",
    consequence: "CONSEQUENCE LOAD // FULL",
    transition: levelLabel,
    text: game.i18n.localize("MIST_ENGINE.SACRIFICE.InVainText")
  };
}

async function handleStarWarsSacrificeRoll(event, target) {
  event.preventDefault();

  const actor = this.actor;
  if (!actor) return;

  const levels = ["painful", "scarring", "grave"];

  const content = `
    <div style="
      padding:16px;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(126,198,207,.018) 0px,
          rgba(126,198,207,.018) 1px,
          transparent 1px,
          transparent 4px
        ),
        linear-gradient(145deg,#0b1417,#111b1e);
      border:1px solid #49686e;
      box-shadow:inset 0 0 20px rgba(0,0,0,.55);
      color:#dbe8e8;
      font-family:monospace;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        padding-bottom:10px;
        margin-bottom:13px;
        border-bottom:1px solid #30484d;
      ">
        <div>
          <div style="
            color:#8ed0d5;
            font-size:11px;
            font-weight:700;
            letter-spacing:1.8px;
          ">
            ◈ EXTREME COMMITMENT PROTOCOL
          </div>

          <div style="
            margin-top:4px;
            color:#6f8589;
            font-size:8px;
            letter-spacing:1px;
            line-height:1.45;
          ">
            REPUBLIC INTELLIGENCE // SACRIFICE AUTHORIZATION
          </div>
        </div>

        <div style="
          color:#c5a96f;
          font-size:8px;
          letter-spacing:1px;
          text-align:right;
        ">
          RI/OPS-SAC
        </div>
      </div>


      <div style="
        padding:9px 11px;
        margin-bottom:12px;
        background:#091114;
        border-left:3px solid #b46c5d;
        color:#bfcacc;
        font-size:9px;
        letter-spacing:.6px;
        line-height:1.5;
      ">
        COMMIT A SACRIFICE TO FORCE AN IMMEDIATE OUTCOME.
        CONSEQUENCE EXPOSURE IS DETERMINED BY THE SELECTED COMMITMENT LEVEL.
      </div>


      <div style="
        display:grid;
        grid-template-columns:145px 1fr;
        gap:10px;
        align-items:center;
        margin-bottom:10px;
      ">
        <span style="
          color:#78979b;
          font-size:8px;
          font-weight:700;
          letter-spacing:1.3px;
        ">
          COMMITMENT LEVEL
        </span>

        <select name="level" style="
          width:100%;
          box-sizing:border-box;
          background:#0a1518;
          color:#e6eeee;
          border:1px solid #45646a;
          border-left:2px solid #b46c5d;
          border-radius:0;
          padding:7px 8px;
          font-family:monospace;
          font-size:10px;
        ">
          ${levels.map(level => `
            <option value="${level}">
              ${game.i18n.localize(`MIST_ENGINE.SACRIFICE.Levels.${level}`)}
            </option>
          `).join("")}
        </select>
      </div>


      <div style="
        display:grid;
        grid-template-columns:145px 1fr;
        gap:10px;
        align-items:center;
      ">
        <span style="
          color:#78979b;
          font-size:8px;
          font-weight:700;
          letter-spacing:1.3px;
        ">
          TACTICAL MODIFIER
        </span>

        <input
          name="modifier"
          type="number"
          step="1"
          value="0"
          style="
            width:100%;
            box-sizing:border-box;
            margin:0;
            background:#081114;
            color:#f0eee5;
            border:1px solid #45646a;
            border-left:2px solid #8ea9ad;
            padding:8px;
            font-family:monospace;
            font-size:14px;
            text-align:right;
          "
        >
      </div>


      <div style="
        margin-top:13px;
        padding-top:8px;
        border-top:1px solid #263b40;
        color:#5f777b;
        font-size:8px;
        letter-spacing:1px;
      ">
        AUTHORIZATION ROUTE // HIGH-RISK EXECUTION CHANNEL OPEN
      </div>

    </div>
  `;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: {
      title: "REPUBLIC INTELLIGENCE // SACRIFICE AUTHORIZATION",
      icon: "fa-solid fa-heart-crack"
    },

    classes: [
      "mist-engine",
      "dialog",
      "sacrifice-roll-dialog",
      "litm-sw-sacrifice-dialog"
    ],

    content,

    ok: {
      label: "EXECUTE SACRIFICE",
      icon: "fa-solid fa-triangle-exclamation",
      callback: (_event, button) => ({
        level: button.form.elements.level.value,
        modifier: parseInt(button.form.elements.modifier.value) || 0
      })
    },

    rejectClose: false,
    modal: true
  });

  if (!result) return;


  // ---------------------------------------------------------
  // ORIGINAL MIST ENGINE SACRIFICE MECHANICS
  // ---------------------------------------------------------

  let formula = "2d6";

  if (result.modifier > 0) {
    formula += ` + ${result.modifier}`;
  }

  else if (result.modifier < 0) {
    formula += ` - ${Math.abs(result.modifier)}`;
  }

  const roll = new Roll(formula, actor.getRollData());
  await roll.evaluate();

  let outcome = "invain";

  if (roll.total >= 10) {
    outcome = "miracle";
  }

  else if (roll.total >= 7) {
    outcome = "fate";
  }

  const lessened = {
    grave: "scarring",
    scarring: "painful",
    painful: "none"
  }[result.level];

  const levelLabel =
    game.i18n.localize(`MIST_ENGINE.SACRIFICE.Levels.${result.level}`);

  const lessenedLabel =
    game.i18n.localize(`MIST_ENGINE.SACRIFICE.Levels.${lessened}`);

  const display = sacrificeOutcomePresentation({
    outcome,
    levelLabel,
    lessenedLabel
  });

  const rollHtml = await roll.render();


  // ---------------------------------------------------------
  // SACRIFICE TELEMETRY CARD
  // ---------------------------------------------------------

  const chatContent = `
    <div style="
      background:
        repeating-linear-gradient(
          0deg,
          rgba(255,255,255,.012) 0px,
          rgba(255,255,255,.012) 1px,
          transparent 1px,
          transparent 4px
        ),
        linear-gradient(145deg,#0d1416,#090e10);
      border:1px solid #465b5e;
      padding:12px;
      color:#ddd8c8;
      font-family:monospace;
      box-shadow:inset 0 0 18px rgba(0,0,0,.58);
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
        padding-bottom:8px;
        margin-bottom:10px;
        border-bottom:1px solid #2b3b3e;
      ">
        <div>
          <div style="
            color:#93d5d9;
            font-size:11px;
            font-weight:bold;
            letter-spacing:1.8px;
          ">
            ◈ SACRIFICE TELEMETRY
          </div>

          <div style="
            margin-top:3px;
            color:#6f8589;
            font-size:8px;
            letter-spacing:1px;
          ">
            EXTREME COMMITMENT // ${String(levelLabel).toUpperCase()}
          </div>
        </div>

        <div style="
          color:#aaa797;
          font-size:8px;
          letter-spacing:1px;
          text-align:right;
        ">
          2D6 ${result.modifier >= 0 ? "+" : "−"} ${Math.abs(result.modifier)}
        </div>
      </div>


      <div style="
        margin-bottom:10px;
        padding:7px;
        background:#0a1112;
        border-left:3px solid #465b5e;
      ">
        ${rollHtml}
      </div>


      <div style="
        background:#090e10;
        border-left:4px solid ${display.border};
        padding:10px 11px;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:baseline;
          gap:12px;
          margin-bottom:8px;
        ">
          <span style="
            color:${display.color};
            font-size:13px;
            font-weight:bold;
            letter-spacing:1px;
          ">
            RESULT CODE // ${display.code}
          </span>

          <span style="
            color:#aaa797;
            font-size:9px;
            font-weight:bold;
          ">
            ${display.threshold} // TOTAL ${roll.total}
          </span>
        </div>


        <div style="
          display:grid;
          gap:5px;
          padding:7px 8px;
          background:#101719;
          border:1px solid #27383b;
        ">
          <div style="
            color:#cfd7d4;
            font-size:9px;
            letter-spacing:.7px;
          ">
            ${display.objective}
          </div>

          <div style="
            color:#cfd7d4;
            font-size:9px;
            letter-spacing:.7px;
          ">
            ${display.consequence}
          </div>

          <div style="
            color:${display.color};
            font-size:9px;
            font-weight:bold;
            letter-spacing:.6px;
          ">
            COMMITMENT PROFILE // ${String(display.transition).toUpperCase()}
          </div>
        </div>


        <div style="
          margin-top:8px;
          color:#9fa9a7;
          font-size:9px;
          line-height:1.45;
        ">
          ${display.text}
        </div>

      </div>


      <div style="
        margin-top:9px;
        padding-top:7px;
        border-top:1px solid #2b3b3e;
        color:#687673;
        font-size:8px;
        letter-spacing:1px;
      ">
        SACRIFICE RESOLUTION // COMMITMENT LOCKED
      </div>

    </div>
  `;


  // Attach the evaluated Roll to the chat message rather than manually asking
  // Dice So Nice to animate it. That preserves one physical roll animation and
  // lets LiTM Conversion's d6 telemetry see the sacrifice dice as well.
  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: chatContent
  });
}

function wireProbabilityRollButtons(sheet) {
  const root = sheet.element;
  if (!root || sheet.actor?.system?.editMode) return;

  const quickButton = root.querySelector(
    'button.roll-button[data-action="clickRoll"][data-roll-type="quick"]'
  );

  if (quickButton) {
    quickButton.dataset.action = "litmProbabilityQuickRoll";
    quickButton.title = "Open Probability Processor";
  }

  const detailedButton = root.querySelector(
    'button.roll-button[data-action="clickRoll"][data-roll-type="detailed"]'
  );

  if (detailedButton) {
    detailedButton.dataset.action = "litmProbabilityDetailedRoll";
    detailedButton.title = "Open Detailed Probability Processor";
  }

  const reactionButton = root.querySelector(
    'button.roll-button[data-action="clickRoll"][data-roll-type="reaction"]'
  );

  if (reactionButton) {
    reactionButton.dataset.action = "litmProbabilityReactionRoll";
    reactionButton.title = "Open Probability Processor";
  }

  const sacrificeButton = root.querySelector(
    'button.roll-button[data-action="clickSacrificeRoll"]'
  );

  if (sacrificeButton) {
    sacrificeButton.dataset.action = "litmStarWarsSacrificeRoll";
    sacrificeButton.title = "Open Sacrifice Authorization";
  }
}

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
          litmProbabilityQuickRoll: handleStarWarsQuickRoll,
          litmProbabilityDetailedRoll: handleStarWarsDetailedRoll,
          litmProbabilityReactionRoll: handleStarWarsReactionRoll,
          litmStarWarsSacrificeRoll: handleStarWarsSacrificeRoll,
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
        enhanceLivingStandardUi(this);
        wireProbabilityRollButtons(this);
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
          litmProbabilityQuickRoll: handleStarWarsQuickRoll,
          litmProbabilityDetailedRoll: handleStarWarsDetailedRoll,
          litmProbabilityReactionRoll: handleStarWarsReactionRoll,
          litmStarWarsSacrificeRoll: handleStarWarsSacrificeRoll,
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
        enhanceLivingStandardUi(this);
        wireProbabilityRollButtons(this);
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
