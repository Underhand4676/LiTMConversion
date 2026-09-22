const MODULE_ID = "litm-conversion";

function getUserAccent(message) {
  const userId = message?.user?.id ?? message?.user ?? message?.author?.id;
  const user = game.users.get(userId) ?? message?.author ?? null;
  const color = user?.color;

  if (typeof color === "string" && color) return color;
  if (color?.css) return color.css;
  return "#7fd3dc";
}

// ---------------------------------------------------------------------------
// PAUSE OVERLAY
// ---------------------------------------------------------------------------

Hooks.on("renderGamePause", (_app, element) => {
  const pauseEl = element ?? document.getElementById("pause");
  if (!(pauseEl instanceof HTMLElement)) return;

  pauseEl.classList.add("litm-pause");

  const image = pauseEl.querySelector("img");
  if (image) {
    image.src = `modules/${MODULE_ID}/artwork/republic-symbol.png`;
    image.alt = "Operations Halted";
    image.className = "litm-pause-emblem";
  }

  const caption = pauseEl.querySelector("figcaption");
  if (caption) {
    caption.innerHTML = `
      <span class="litm-pause-title">OPERATIONS HALTED</span>
      <span class="litm-pause-subtitle">AWAITING RESUMPTION</span>
    `;
  }
});

// ---------------------------------------------------------------------------
// CHAT MESSAGE THEME
// Foundry v14 provides the pending message as an HTMLElement.
// ---------------------------------------------------------------------------

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (!(html instanceof HTMLElement)) return;

  html.classList.add("litm-chat-message");
  html.style.setProperty("--litm-user-accent", getUserAccent(message));

  if (message.isRoll) html.classList.add("litm-roll-message");
  else html.classList.add("litm-text-message");
});
