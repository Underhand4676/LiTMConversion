const MODULE_ID = "litm-conversion";
const FLAG_KEY = "d6Stats";
const EXPECTED_MEAN = 3.5;
const EXPECTED_FACE_PERCENT = 100 / 6;

let telemetryApp = null;
let recordQueue = Promise.resolve();

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

// ============================================================================
// DATA HELPERS
// ============================================================================

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateKey(key) {
  const [y, m, d] = String(key).split("-");
  if (!y || !m || !d) return key;
  return `${m}/${d}/${y}`;
}

function emptyDay() {
  return {
    totalRolls: 0,
    diceRolls: new Array(6).fill(0)
  };
}

function normalizeDay(day = {}) {
  const diceRolls = Array.isArray(day.diceRolls)
    ? day.diceRolls.slice(0, 6).map(n => Number(n) || 0)
    : [];

  while (diceRolls.length < 6) diceRolls.push(0);

  return {
    totalRolls: Number(day.totalRolls) || diceRolls.reduce((a, b) => a + b, 0),
    diceRolls
  };
}

function getUserData(user) {
  const raw = user?.getFlag(MODULE_ID, FLAG_KEY) ?? {};
  const data = foundry.utils.deepClone(raw);

  for (const [date, day] of Object.entries(data)) {
    data[date] = normalizeDay(day);
  }

  return data;
}

function messageIsHidden(message) {
  const whispers = Array.from(message.whisper ?? []);
  return Boolean(message.blind || whispers.length);
}

function extractD6Results(roll) {
  if (!roll) return [];

  const values = [];
  for (const die of roll.dice ?? []) {
    if (Number(die.faces) !== 6) continue;

    for (const result of die.results ?? []) {
      const value = Number(result.result);
      if (Number.isInteger(value) && value >= 1 && value <= 6) values.push(value);
    }
  }

  return values;
}


function extractD6ResultsFromSerializedRoll(rollData) {
  if (!rollData) return [];

  const values = [];
  const terms = Array.from(rollData.terms ?? []);

  for (const term of terms) {
    if (Number(term?.faces) !== 6) continue;

    for (const result of term?.results ?? []) {
      const value = Number(result?.result);
      if (Number.isInteger(value) && value >= 1 && value <= 6) {
        values.push(value);
      }
    }
  }

  return values;
}

function extractD6ResultsFromMessage(message) {
  const values = [];

  // Normal Foundry path: hydrated Roll instances.
  if (message?.rolls?.length) {
    for (const roll of message.rolls) {
      values.push(...extractD6Results(roll));
    }
    return values;
  }

  // Fallback for custom roll-bearing messages if a hook fires before the
  // message's Roll objects are fully hydrated on a given client.
  for (const rollData of message?._source?.rolls ?? []) {
    values.push(...extractD6ResultsFromSerializedRoll(rollData));
  }

  return values;
}

async function saveValues(values, user = game.user) {
  if (!user || !values?.length) return 0;
  if (game.settings.get(MODULE_ID, "paused")) return 0;

  const key = localDateKey();
  const data = getUserData(user);
  const day = normalizeDay(data[key] ?? emptyDay());

  for (const value of values) {
    if (!Number.isInteger(value) || value < 1 || value > 6) continue;
    day.diceRolls[value - 1] += 1;
    day.totalRolls += 1;
  }

  data[key] = day;
  await user.setFlag(MODULE_ID, FLAG_KEY, data);

  if (telemetryApp?.rendered) telemetryApp.render({ force: true });
  return values.length;
}

function queueValues(values, user = game.user) {
  const safeValues = Array.from(values ?? []);
  recordQueue = recordQueue
    .then(() => saveValues(safeValues, user))
    .catch(error => {
      console.error(`${MODULE_ID} | Failed to store d6 telemetry`, error);
      return 0;
    });

  return recordQueue;
}

async function recordRoll(roll, options = {}) {
  const user = options.user ?? game.user;
  const values = extractD6Results(roll);
  if (!values.length) return 0;
  return queueValues(values, user);
}

async function recordValues(values, options = {}) {
  const user = options.user ?? game.user;
  return queueValues(values, user);
}

function aggregateRange(data, startKey, endKey) {
  const counts = new Array(6).fill(0);
  let total = 0;

  for (const [date, rawDay] of Object.entries(data ?? {})) {
    if (date < startKey || date > endKey) continue;
    const day = normalizeDay(rawDay);
    total += day.totalRolls;
    for (let i = 0; i < 6; i++) counts[i] += day.diceRolls[i] ?? 0;
  }

  return { total, counts };
}

function calculateStats(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) {
    return {
      mean: "0.00",
      median: "0",
      mode: "—",
      delta: "0.00",
      deltaClass: "neutral"
    };
  }

  const weighted = counts.reduce((sum, count, index) => sum + count * (index + 1), 0);
  const meanNumber = weighted / total;

  const valueAtPosition = position => {
    let running = 0;
    for (let i = 0; i < counts.length; i++) {
      running += counts[i];
      if (running >= position) return i + 1;
    }
    return 0;
  };

  let medianNumber;
  if (total % 2 === 1) {
    medianNumber = valueAtPosition((total + 1) / 2);
  } else {
    const a = valueAtPosition(total / 2);
    const b = valueAtPosition(total / 2 + 1);
    medianNumber = (a + b) / 2;
  }

  const maxCount = Math.max(...counts);
  const modes = counts
    .map((count, index) => count === maxCount ? index + 1 : null)
    .filter(value => value !== null);

  const delta = meanNumber - EXPECTED_MEAN;

  return {
    mean: meanNumber.toFixed(2),
    median: Number.isInteger(medianNumber) ? String(medianNumber) : medianNumber.toFixed(1),
    mode: modes.join(", "),
    delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`,
    deltaClass: delta > 0.005 ? "positive" : delta < -0.005 ? "negative" : "neutral"
  };
}

function buildBars(counts, total) {
  const percentages = counts.map(count => total ? (count / total) * 100 : 0);
  const maxPct = Math.max(EXPECTED_FACE_PERCENT, ...percentages);
  const scaleMax = Math.max(25, Math.ceil(maxPct / 5) * 5);
  const baselineHeight = Math.min(100, (EXPECTED_FACE_PERCENT / scaleMax) * 100);

  return counts.map((count, index) => {
    const percentage = percentages[index];
    return {
      face: index + 1,
      count,
      percentage: percentage.toFixed(1),
      height: Math.min(100, (percentage / scaleMax) * 100).toFixed(2),
      baselineHeight: baselineHeight.toFixed(2),
      cssClass: index === 0 ? "low" : index === 5 ? "high" : "normal"
    };
  });
}

function visibleUsers() {
  return game.users.contents
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function brandedConfirmContent(title, message) {
  return `
    <div style="
      padding:16px;
      background:linear-gradient(135deg,#171312 0%,#241917 100%);
      border:2px solid #9b5e4a;
      box-shadow:inset 0 0 0 2px #0d0908;
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
      ">${title}</div>
      <div style="
        border-left:4px solid #b36750;
        padding:9px 11px;
        color:#f1c9bd;
        font-size:10px;
        letter-spacing:1px;
        line-height:1.5;
      ">${message}</div>
    </div>`;
}

// ============================================================================
// APPLICATION
// ============================================================================

class ProbabilityTelemetryApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "probability-telemetry-window",
    classes: ["probability-telemetry"],
    position: {
      width: 820,
      height: 680
    },
    window: {
      title: "PROBABILITY TELEMETRY // D6 ARCHIVE",
      icon: "fa-solid fa-satellite-dish",
      resizable: true
    },
    actions: {
      togglePause: this.togglePause,
      resetAll: this.resetAll,
      exportUser: this.exportUser,
      importUser: this.importUser,
      deleteDate: this.deleteDate,
      deleteUser: this.deleteUser
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/probability-telemetry.hbs`,
      scrollable: [".pt-body"]
    }
  };

  constructor(options = {}) {
    super(options);
    this.selectedUserId = game.user.id;
    this.dateFrom = null;
    this.dateTo = null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const users = visibleUsers();

    let selectedUser = users.find(user => user.id === this.selectedUserId);
    if (!selectedUser) {
      selectedUser = users.find(user => user.id === game.user.id) ?? users[0] ?? game.user;
      this.selectedUserId = selectedUser.id;
    }

    const data = getUserData(selectedUser);

    // Only expose dates which actually contain recorded d6 results.
    // This makes the archive useful as a session/date browser instead of
    // forcing the user to remember calendar dates manually.
    const dates = Object.entries(data)
      .filter(([, day]) => normalizeDay(day).totalRolls > 0)
      .map(([date]) => date)
      .sort();

    const hasDates = dates.length > 0;

    if (hasDates) {
      if (!this.dateFrom || !dates.includes(this.dateFrom)) {
        this.dateFrom = dates[0];
      }

      if (!this.dateTo || !dates.includes(this.dateTo)) {
        this.dateTo = dates[dates.length - 1];
      }

      if (this.dateFrom > this.dateTo) {
        this.dateTo = this.dateFrom;
      }
    }

    else {
      this.dateFrom = null;
      this.dateTo = null;
    }

    const aggregate = hasDates
      ? aggregateRange(data, this.dateFrom, this.dateTo)
      : { total: 0, counts: new Array(6).fill(0) };
    const stats = calculateStats(aggregate.counts);
    const bars = buildBars(aggregate.counts, aggregate.total);
    const paused = game.settings.get(MODULE_ID, "paused");

    return foundry.utils.mergeObject(context, {
      moduleId: MODULE_ID,
      isGM: game.user.isGM,
      paused,
      acquisitionLabel: paused ? "ACQUISITION PAUSED" : "ACQUISITION ONLINE",
      selectedUserName: selectedUser.name,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        selected: user.id === selectedUser.id
      })),
      hasDates,
      dateFrom: this.dateFrom ?? "",
      dateTo: this.dateTo ?? "",
      dateFromOptions: dates.map(date => ({
        value: date,
        label: formatDateKey(date),
        selected: date === this.dateFrom
      })),
      dateToOptions: dates.map(date => ({
        value: date,
        label: formatDateKey(date),
        selected: date === this.dateTo
      })),
      fromLabel: this.dateFrom ? formatDateKey(this.dateFrom) : "NO DATA",
      toLabel: this.dateTo ? formatDateKey(this.dateTo) : "NO DATA",
      totalRolls: aggregate.total,
      bars,
      mean: stats.mean,
      median: stats.median,
      mode: stats.mode,
      delta: stats.delta,
      deltaClass: stats.deltaClass,
      totalOnes: aggregate.counts[0],
      totalSixes: aggregate.counts[5],
      expectedMean: EXPECTED_MEAN.toFixed(2),
      expectedFacePercent: EXPECTED_FACE_PERCENT.toFixed(1)
    }, { inplace: false });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    root.querySelector('[data-pt-field="user"]')?.addEventListener("change", event => {
      this.selectedUserId = event.currentTarget.value;
      this.dateFrom = null;
      this.dateTo = null;
      this.render({ force: true });
    });

    root.querySelector('[data-pt-field="from"]')?.addEventListener("change", event => {
      const value = event.currentTarget.value;
      if (!value) return;

      this.dateFrom = value;

      if (!this.dateTo || this.dateFrom > this.dateTo) {
        this.dateTo = this.dateFrom;
      }

      this.render({ force: true });
    });

    root.querySelector('[data-pt-field="to"]')?.addEventListener("change", event => {
      const value = event.currentTarget.value;
      if (!value) return;

      this.dateTo = value;

      if (!this.dateFrom || this.dateTo < this.dateFrom) {
        this.dateFrom = this.dateTo;
      }

      this.render({ force: true });
    });
  }

  static async togglePause() {
    if (!game.user.isGM) return;
    const current = game.settings.get(MODULE_ID, "paused");
    await game.settings.set(MODULE_ID, "paused", !current);
    this.render({ force: true });
  }

  static async resetAll() {
    if (!game.user.isGM) return;

    const confirmed = await DialogV2.confirm({
      window: { title: "ARCHIVE PURGE // CONFIRMATION" },
      content: brandedConfirmContent(
        "⚠ ARCHIVE PURGE REQUEST",
        "DELETE ALL RECORDED D6 TELEMETRY FOR EVERY USER? THIS OPERATION CANNOT BE UNDONE."
      ),
      yes: {
        label: "PURGE ARCHIVE",
        icon: "fa-solid fa-trash"
      },
      no: {
        label: "ABORT",
        icon: "fa-solid fa-xmark"
      },
      modal: true,
      rejectClose: false
    });

    if (!confirmed) return;

    for (const user of game.users.contents) {
      await user.unsetFlag(MODULE_ID, FLAG_KEY);
    }

    this.dateFrom = null;
    this.dateTo = null;
    this.render({ force: true });
  }

  static async exportUser() {
    if (!game.user.isGM) return;
    const user = game.users.get(this.selectedUserId);
    if (!user) return;

    const payload = {
      module: MODULE_ID,
      schema: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name
      },
      data: getUserData(user)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${user.name.replace(/[^a-z0-9_-]+/gi, "_")}-d6-telemetry.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  static async importUser() {
    if (!game.user.isGM) return;
    const user = game.users.get(this.selectedUserId);
    if (!user) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async event => {
      try {
        const file = event.target.files?.[0];
        if (!file) return;
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const incoming = parsed?.data ?? parsed;

        if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
          throw new Error("Invalid telemetry archive format.");
        }

        const normalized = {};
        for (const [date, day] of Object.entries(incoming)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          normalized[date] = normalizeDay(day);
        }

        await user.setFlag(MODULE_ID, FLAG_KEY, normalized);
        this.dateFrom = null;
        this.dateTo = null;
        this.render({ force: true });
      } catch (error) {
        console.error(`${MODULE_ID} | Import failed`, error);
        await DialogV2.prompt({
          window: { title: "SYSTEM FAULT // ARCHIVE IMPORT" },
          content: brandedConfirmContent(
            "⚠ IMPORT REJECTED",
            "THE SELECTED FILE COULD NOT BE READ AS A VALID D6 TELEMETRY ARCHIVE."
          ),
          ok: { label: "ACKNOWLEDGE", icon: "fa-solid fa-triangle-exclamation" },
          modal: true
        });
      } finally {
        input.remove();
      }
    }, { once: true });

    input.click();
  }

  static async deleteDate() {
    if (!game.user.isGM) return;

    const user = game.users.get(this.selectedUserId);
    if (!user) return;

    const data = getUserData(user);

    const dates = Object.entries(data)
      .filter(([, day]) => normalizeDay(day).totalRolls > 0)
      .map(([date]) => date)
      .sort();

    if (!dates.length) {
      await DialogV2.prompt({
        window: { title: "ARCHIVE NODE // NO DATA" },
        content: brandedConfirmContent(
          "NO RECORDED DATE NODES",
          `NO D6 TELEMETRY EXISTS FOR ${foundry.utils.escapeHTML(user.name).toUpperCase()}.`
        ),
        ok: {
          label: "ACKNOWLEDGE",
          icon: "fa-solid fa-check"
        },
        modal: true
      });

      return;
    }

    const defaultDate =
      dates.includes(this.dateTo)
        ? this.dateTo
        : dates[dates.length - 1];

    const result = await DialogV2.prompt({
      window: {
        title: "ARCHIVE NODE PURGE // DATE SELECT"
      },

      content: `
        <div style="
          padding:16px;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,.012) 0px,
              rgba(255,255,255,.012) 1px,
              transparent 1px,
              transparent 4px
            ),
            linear-gradient(145deg,#10181d,#0a1115);
          border:1px solid #5f493b;
          color:#d9eef0;
          font-family:monospace;
          box-shadow:inset 0 0 18px rgba(0,0,0,.55);
        ">

          <div style="
            color:#d28a66;
            font-size:11px;
            font-weight:bold;
            letter-spacing:1.8px;
            padding-bottom:8px;
            margin-bottom:11px;
            border-bottom:1px solid #554034;
          ">
            ⚠ DATE NODE PURGE
          </div>

          <div style="
            color:#81999d;
            font-size:8px;
            letter-spacing:1.1px;
            margin-bottom:6px;
          ">
            SUBJECT // ${foundry.utils.escapeHTML(user.name).toUpperCase()}
          </div>

          <select
            name="date"
            style="
              width:100%;
              box-sizing:border-box;
              height:32px;
              background:#0b1317;
              color:#e0e8e7;
              border:1px solid #665246;
              border-left:3px solid #b36750;
              border-radius:0;
              padding:5px 8px;
              font-family:monospace;
              font-size:11px;
            "
          >
            ${dates.map(date => {
              const count = normalizeDay(data[date]).totalRolls;
              const selected = date === defaultDate ? "selected" : "";

              return `
                <option value="${date}" ${selected}>
                  ${formatDateKey(date)} // ${count} D6 RECORDED
                </option>
              `;
            }).join("")}
          </select>

          <div style="
            margin-top:10px;
            color:#765f56;
            font-size:8px;
            letter-spacing:1px;
          ">
            ONLY THE SELECTED DATE NODE WILL BE REMOVED
          </div>

        </div>
      `,

      ok: {
        label: "PURGE DATE NODE",
        icon: "fa-solid fa-calendar-xmark",
        callback: (_event, button) => ({
          date: button.form.elements.date.value
        })
      },

      rejectClose: false,
      modal: true
    });

    if (!result?.date || !data[result.date]) return;

    const count = normalizeDay(data[result.date]).totalRolls;

    const confirmed = await DialogV2.confirm({
      window: {
        title: "DATE NODE PURGE // CONFIRMATION"
      },

      content: brandedConfirmContent(
        "⚠ CONFIRM DATE NODE PURGE",
        `DELETE ${count} RECORDED D6 FROM ${formatDateKey(result.date)} FOR ${foundry.utils.escapeHTML(user.name).toUpperCase()}?`
      ),

      yes: {
        label: "PURGE DATE",
        icon: "fa-solid fa-trash"
      },

      no: {
        label: "ABORT",
        icon: "fa-solid fa-xmark"
      },

      modal: true,
      rejectClose: false
    });

    if (!confirmed) return;

    delete data[result.date];

    if (Object.keys(data).length) {
      await user.setFlag(MODULE_ID, FLAG_KEY, data);
    } else {
      await user.unsetFlag(MODULE_ID, FLAG_KEY);
    }

    this.dateFrom = null;
    this.dateTo = null;
    this.render({ force: true });
  }

  static async deleteUser() {
    if (!game.user.isGM) return;
    const user = game.users.get(this.selectedUserId);
    if (!user) return;

    const confirmed = await DialogV2.confirm({
      window: { title: "SUBJECT ARCHIVE // CONFIRMATION" },
      content: brandedConfirmContent(
        "⚠ SUBJECT DATA PURGE",
        `DELETE ALL RECORDED D6 TELEMETRY FOR ${foundry.utils.escapeHTML(user.name).toUpperCase()}?`
      ),
      yes: { label: "PURGE SUBJECT", icon: "fa-solid fa-trash" },
      no: { label: "ABORT", icon: "fa-solid fa-xmark" },
      modal: true,
      rejectClose: false
    });

    if (!confirmed) return;

    await user.unsetFlag(MODULE_ID, FLAG_KEY);
    this.dateFrom = null;
    this.dateTo = null;
    this.render({ force: true });
  }
}

function openTelemetry() {
  if (!telemetryApp) telemetryApp = new ProbabilityTelemetryApp();
  telemetryApp.render({ force: true });
  return telemetryApp;
}

// ============================================================================
// SETTINGS + HOOKS
// ============================================================================

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "allowHiddenRolls", {
    name: "Probability Telemetry: Record hidden rolls",
    hint: "When disabled, private, blind, and self-only roll messages are ignored by the telemetry archive.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    restricted: true
  });



  game.settings.register(MODULE_ID, "paused", {
    name: "Probability Telemetry: Pause data acquisition",
    hint: "While enabled, new d6 results are not recorded. Existing telemetry is preserved.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    restricted: true
  });
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  module.api ??= {};
  module.api.diceTelemetry = {
    open: openTelemetry,
    recordRoll,
    recordValues,
    extractD6Results,
    extractD6ResultsFromMessage
  };

  console.log(`${MODULE_ID} | Probability Telemetry online`);
});

Hooks.on("getSceneControlButtons", controls => {
  const tokenControls = controls.tokens;
  if (!tokenControls?.tools) return;

  tokenControls.tools["litm-probability-telemetry"] = {
    name: "litm-probability-telemetry",
    title: "Probability Telemetry // D6 Archive",
    icon: "fa-solid fa-chart-column",
    order: Object.keys(tokenControls.tools).length,
    button: true,
    visible: true,
    onChange: () => openTelemetry()
  };
});

Hooks.on("createChatMessage", message => {
  if (game.settings.get(MODULE_ID, "paused")) return;
  if (!game.settings.get(MODULE_ID, "allowHiddenRolls") && messageIsHidden(message)) return;

  // Every connected client receives createChatMessage. Only the browser
  // belonging to the message author is allowed to write telemetry, preventing
  // duplicate records while making custom macro-created roll messages reliable.
  const authorId =
    message.author?.id ??
    message.user?.id ??
    message.user ??
    message._source?.user ??
    null;

  if (!authorId || authorId !== game.user.id) return;

  const values = extractD6ResultsFromMessage(message);
  if (!values.length) return;

  const author = game.users.get(authorId) ?? game.user;

  queueValues(values, author);
  console.debug(
    `${MODULE_ID} | Recorded ${values.length} d6 result(s) from chat message ${message.id}`
  );
});
