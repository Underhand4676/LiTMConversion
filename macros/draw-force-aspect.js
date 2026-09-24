// LiTM Conversion // Draw Force Aspect
// Shuffles the managed deck, broadcasts the cinematic reveal, posts the
// result publicly in chat, then recalls that exact card to the source deck.

const api = game.modules.get("litm-conversion")?.api?.forceAspectDeck;

if (!api?.draw) {
  return ui.notifications.error(
    "LiTM Conversion // Force Aspect draw is unavailable."
  );
}

await api.draw();
