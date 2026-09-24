import { openProbabilityProcessor } from "./probability-processor.js";

const MODULE_ID = "litm-conversion";
const FOLDER_NAME = "LiTM Conversion";
const PROBABILITY_MACRO_NAME = "Probability Processor // MK VI";
const PROBABILITY_MACRO_FLAG = "managedProbabilityProcessor";
const FORCE_ASPECT_MACRO_NAME = "Draw Force Aspect";
const FORCE_ASPECT_MACRO_FLAG = "managedForceAspectDrawMacro";


function ownershipForPlayers(playerLevel) {
  const ownership = {
    default: playerLevel
  };

  for (const user of game.users ?? []) {
    ownership[user.id] = user.isGM
      ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      : playerLevel;
  }

  return ownership;
}

const PROBABILITY_MACRO_COMMAND = `
const api = game.modules.get("litm-conversion")?.api?.probabilityProcessor;

if (!api?.open) {
  return ui.notifications.error(
    "LiTM Conversion // Probability Processor is unavailable."
  );
}

await api.open();
`.trim();

async function getOrCreateMacroFolder() {
  let folder = game.folders.find(
    candidate =>
      candidate.type === "Macro" &&
      candidate.name === FOLDER_NAME
  );

  if (folder) return folder;

  folder = await Folder.create({
    name: FOLDER_NAME,
    type: "Macro",
    sorting: "a"
  });

  return folder;
}

async function ensureProbabilityProcessorMacro() {
  if (!game.user.isGM) return null;

  const folder = await getOrCreateMacroFolder();

  let macro = game.macros.find(
    candidate => candidate.getFlag(MODULE_ID, PROBABILITY_MACRO_FLAG) === true
  );

  const ownership = ownershipForPlayers(
    CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
  );

  const data = {
    name: PROBABILITY_MACRO_NAME,
    type: "script",
    scope: "global",
    command: PROBABILITY_MACRO_COMMAND,
    img: `modules/${MODULE_ID}/artwork/probability-telemetry.png`,
    folder: folder.id,
    ownership,
    flags: {
      [MODULE_ID]: {
        [PROBABILITY_MACRO_FLAG]: true
      }
    }
  };

  if (!macro) {
    macro = await Macro.create(data);
    console.log(`${MODULE_ID} | Provisioned ${PROBABILITY_MACRO_NAME}`);
    return macro;
  }

  const update = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "flags") continue;

    const current =
      key === "folder"
        ? macro.folder?.id ?? macro.folder ?? null
        : macro[key];

    if (current !== value) update[key] = value;
  }

  if (macro.getFlag(MODULE_ID, PROBABILITY_MACRO_FLAG) !== true) {
    update[`flags.${MODULE_ID}.${PROBABILITY_MACRO_FLAG}`] = true;
  }

  if (Object.keys(update).length) {
    await macro.update(update);
  }

  return macro;
}



const FORCE_ASPECT_MACRO_COMMAND = `
const api = game.modules.get("litm-conversion")?.api?.forceAspectDeck;

if (!api?.draw) {
  return ui.notifications.error(
    "LiTM Conversion // Force Aspect draw is unavailable."
  );
}

await api.draw();
`.trim();

async function ensureForceAspectDrawMacro() {
  if (!game.user.isGM) return null;

  const folder = await getOrCreateMacroFolder();

  let macro = game.macros.find(
    candidate =>
      candidate.getFlag(MODULE_ID, FORCE_ASPECT_MACRO_FLAG) === true
  );

  const ownership = ownershipForPlayers(
    CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
  );

  const data = {
    name: FORCE_ASPECT_MACRO_NAME,
    type: "script",
    scope: "global",
    command: FORCE_ASPECT_MACRO_COMMAND,
    img: `modules/${MODULE_ID}/cards/force-aspects/force-aspects-back.png`,
    folder: folder.id,
    ownership,
    flags: {
      [MODULE_ID]: {
        [FORCE_ASPECT_MACRO_FLAG]: true
      }
    }
  };

  if (!macro) {
    macro = await Macro.create(data);
    console.log(`${MODULE_ID} | Provisioned ${FORCE_ASPECT_MACRO_NAME}`);
    return macro;
  }

  const update = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "flags") continue;

    const current =
      key === "folder"
        ? macro.folder?.id ?? macro.folder ?? null
        : macro[key];

    if (current !== value) update[key] = value;
  }

  if (
    macro.getFlag(MODULE_ID, FORCE_ASPECT_MACRO_FLAG) !== true
  ) {
    update[`flags.${MODULE_ID}.${FORCE_ASPECT_MACRO_FLAG}`] = true;
  }

  if (Object.keys(update).length) {
    await macro.update(update);
  }

  return macro;
}

Hooks.once("ready", async () => {
  const module = game.modules.get(MODULE_ID);

  module.api ??= {};
  module.api.probabilityProcessor = {
    open: openProbabilityProcessor,
    restoreMacro: ensureProbabilityProcessorMacro
  };

  if (game.user.isGM) {
    try {
      await ensureProbabilityProcessorMacro();
      await ensureForceAspectDrawMacro();
    } catch (error) {
      console.error(
        `${MODULE_ID} | Failed to provision Probability Processor macro`,
        error
      );
    }
  }
});
