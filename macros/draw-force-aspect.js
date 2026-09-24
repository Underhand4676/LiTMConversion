const api = game.modules.get("litm-conversion")?.api?.forceAspectDeck;

if (!api?.draw) {
  return ui.notifications.error(
    "LiTM Conversion // Force Aspect draw is unavailable."
  );
}

await api.draw();
