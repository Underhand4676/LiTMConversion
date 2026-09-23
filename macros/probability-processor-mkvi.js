// LiTM Conversion // Probability Processor launcher
// This macro is automatically provisioned into the world Macro directory.
// It calls the copy of the processor baked into the module.

const api = game.modules.get("litm-conversion")?.api?.probabilityProcessor;

if (!api?.open) {
  return ui.notifications.error(
    "LiTM Conversion // Probability Processor is unavailable."
  );
}

await api.open();
