const MODULE_ID = "litm-conversion";
const DECK_NAME = "Force Aspects";
const DECK_FLAG = "managedForceAspectDeck";
const HAND_NAME = "Force Aspect Hand";
const HAND_FLAG = "managedForceAspectHand";
const CARD_FLAG = "forceAspectKey";
const SOCKET_NAME = `module.${MODULE_ID}`;
const SOCKET_EVENT = "force-aspect-cinematic";
const CINEMATIC_REVEAL_DELAY = 3700;

const BACK_IMAGE = `modules/${MODULE_ID}/cards/force-aspects/force-aspects-back.png`;

const FORCE_ASPECTS = [
  {
    key: "compassion",
    side: "light",
    name: "Aspect of Compassion",
    keywords: "Kindness, Generosity, Boon.",
    text: "Plans set in motion are destined to bear fruit and even elements that are unaccounted for will twist in your favor. You may be on the receiving end of beneficial arrangements and have a higher chance of safely navigating dangerous situations."
  },
  {
    key: "courage",
    side: "light",
    name: "Aspect of Courage",
    keywords: "Determination, Decisiveness, Tenacity.",
    text: "You will find the strength required to hold to your convictions and move forward with your plans. You rise to face any struggles with speed and resolve."
  },
  {
    key: "harmony",
    side: "light",
    name: "Aspect of Harmony",
    keywords: "Fulfillment, Balance, Acceptance.",
    text: "You are overcome with a profound sense of peace and purpose as you find yourself totally in tune with the Force for an instant. As the influence of the Dark Side recedes, your actions gain greater benefits."
  },
  {
    key: "insight",
    side: "light",
    name: "Aspect of Insight",
    keywords: "Guidance, Wisdom, Direction.",
    text: "You may find information or clarity on details you may have missed, or never realized you needed. Secrets and alternate paths to a goal could reveal themselves."
  },
  {
    key: "resilience",
    side: "light",
    name: "Aspect of Resilience",
    keywords: "Focus, Protection, Willpower.",
    text: "Tasks requiring great concentration are much easier to complete. Your mind and body are honed against anything that would otherwise sway or harm you."
  },
  {
    key: "serenity",
    side: "light",
    name: "Aspect of Serenity",
    keywords: "Renewal, Tranquility, Foundations.",
    text: "You find reprieve from your struggles, whether in verbal arguments or in combat, and damaged relationships have a higher chance of being repaired. You may be rejuvenated and any unbalancing mental influences or emotions might dissipate."
  },
  {
    key: "change",
    side: "neutral",
    name: "Aspect of Change",
    keywords: "Reversal, Upheaval, Transformation.",
    text: "If your actions or situation is going well, they will immediately take a turn for the worse, and vice-versa. The change may be drastic or come suddenly, but a canny character may find the strength and will to adapt to their new circumstances."
  },
  {
    key: "destiny",
    side: "neutral",
    name: "Aspect of Destiny",
    keywords: "Drama, Suspense, Fate.",
    text: "Everything is about to become a bit unbelievable. The people and world around you will seem like players on a stage and may even fold you into the show. Whatever happens will have a lasting impact on your path forward."
  },
  {
    key: "finality",
    side: "neutral",
    name: "Aspect of Finality",
    keywords: "Inevitability, Consequence, Certainty.",
    text: "Your actions or the situation at large spirals towards its likely conclusion. Here, there are no second chances. Either steps are taken to assure your victory, or a new complication arises that places you in greater peril than before."
  },
  {
    key: "potential",
    side: "neutral",
    name: "Aspect of Potential",
    keywords: "Responsibility, Beginnings, Promise.",
    text: "You find yourself in need of assistance as the task you face calls for knowledge or skill beyond your capability. The task might also come with great responsibility. Regardless, there is real worth beyond the difficulties you face."
  },
  {
    key: "trial",
    side: "neutral",
    name: "Aspect of Trial",
    keywords: "Temptation, Reflection, Challenge.",
    text: "The stakes of your action rise dramatically, both by increasing the challenge presented and the potential reward. The test set by this Aspect should always be clearly daunting, but the reward should be enough to call a character to face it."
  },
  {
    key: "vision",
    side: "neutral",
    name: "Aspect of Vision",
    keywords: "Premonition, Illusion, Memory.",
    text: "You gain crucial insight from past experiences or events, or glimpse the future in a way that is immediately relevant should you be Force-Sensitive. In either case, some things are best undiscovered, and you may suffer backlash from their revelations."
  },
  {
    key: "deception",
    side: "dark",
    name: "Aspect of Deception",
    keywords: "Guile, Betrayal, Obfuscation.",
    text: "Whether you realize it or not, your actions are being used as an instrument of a higher power. Something greater than your character seeks to deceive them in order to maintain control. Only mistrust pervades this web of lies."
  },
  {
    key: "domination",
    side: "dark",
    name: "Aspect of Domination",
    keywords: "Subjugation, Selfishness, Control.",
    text: "Your actions take on a blunt, heavy-handed quality in an attempt to control the situation. While the power provided may be enough to tip the scales in your character's favor for a moment, collateral damage always occurs. Your actions may cause unintended damage or come at the expense of a companion's well-being."
  },
  {
    key: "fear",
    side: "dark",
    name: "Aspect of Fear",
    keywords: "Hesitation, Dread, Doubt.",
    text: "Your current situation becomes uncertain. Something about it sparks great trepidation, or the situation twists so as to invoke great fear or anxiety. The character's judgement may become clouded by the worst thoughts the galaxy can conjure."
  },
  {
    key: "hatred",
    side: "dark",
    name: "Aspect of Hatred",
    keywords: "Violence, Destruction, Misfortune.",
    text: "If your situation could descend into violence or all-encompassing peril, it will. Flaring tempers and rash actions overcome more rational or diplomatic approaches."
  },
  {
    key: "loss",
    side: "dark",
    name: "Aspect of Loss",
    keywords: "Sacrifice, Scarcity, Desperation.",
    text: "Something vital immediately leaves you; this absence may be temporary, but there is no telling how long it will last. Your character will be in great need, and they may be forced to do unthinkable things to achieve victory or survive another day."
  },
  {
    key: "passion",
    side: "dark",
    name: "Aspect of Passion",
    keywords: "Desire, Longing, Recklessness.",
    text: "Something that you hold dear or wish to possess is immediately entangled with looming disaster. Swift action is needed to win the day, but such hasty decisions can have lasting consequences for the character as emotion clouds their thoughts."
  }
];

let forceAspectCinematicQueue = Promise.resolve();
let forceAspectDrawInProgress = false;

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function preloadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

function removeExistingCinematic() {
  document
    .querySelectorAll(".litm-force-aspect-cinematic")
    .forEach(element => element.remove());
}

async function playForceAspectCinematic(packet) {
  if (!packet?.faceImage || !packet?.backImage) return;

  await Promise.allSettled([
    preloadImage(packet.faceImage),
    preloadImage(packet.backImage)
  ]);

  removeExistingCinematic();

  const overlay = document.createElement("div");
  overlay.className = [
    "litm-force-aspect-cinematic",
    `litm-force-aspect-cinematic-${packet.side ?? "neutral"}`
  ].join(" ");

  overlay.innerHTML = `
    <div class="litm-force-aspect-cinematic-backdrop"></div>
    <div class="litm-force-aspect-cinematic-stage">
      <div class="litm-force-aspect-shuffle-stack" aria-hidden="true">
        ${[1, 2, 3, 4, 5]
          .map(
            index => `
              <img
                class="litm-force-aspect-shuffle-card card-${index}"
                src="${packet.backImage}"
                alt=""
              >
            `
          )
          .join("")}
      </div>

      <div class="litm-force-aspect-selected-card">
        <div class="litm-force-aspect-selected-inner">
          <img
            class="litm-force-aspect-selected-face"
            src="${packet.backImage}"
            alt="Force Aspect card back"
          >
        </div>
      </div>
    </div>
  `;

  document.body.append(overlay);

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  )?.matches === true;

  try {
    requestAnimationFrame(() => overlay.classList.add("is-live"));

    const selectedInner = overlay.querySelector(
      ".litm-force-aspect-selected-inner"
    );
    const selectedFace = overlay.querySelector(
      ".litm-force-aspect-selected-face"
    );

    // The card which leaves the shuffle stack is always the physical back.
    // Force the source here as well as in the initial markup so no document
    // face state or stale browser image can expose the result early.
    if (selectedFace) {
      selectedFace.src = packet.backImage;
      selectedFace.alt = "Force Aspect card back";
    }

    if (reducedMotion) {
      await wait(350);
      overlay.classList.add("is-drawing");
      await wait(300);

      if (selectedFace) {
        selectedFace.src = packet.faceImage;
        selectedFace.alt = packet.name ?? "Force Aspect";
      }

      if (selectedInner) {
        selectedInner.style.transition = "none";
        selectedInner.style.transform = "scale(1.08)";
      }
      await wait(2600);
      overlay.classList.add("is-leaving");
      await wait(350);
      return;
    }

    // Uneven mechanical shuffle before one card kicks free of the stack.
    await wait(2250);

    // Reassert the back immediately before the selected card becomes visible.
    if (selectedFace) selectedFace.src = packet.backImage;
    overlay.classList.add("is-drawing");

    await wait(650);

    /*
     * One flip only. Use ordinary CSS transitions instead of the Web
     * Animations API. Cancelling a finished Web Animation can briefly restore
     * the element's underlying transform for one frame, which looked like a
     * second face reveal in Chromium. Here the card collapses once, swaps the
     * image while edge-on, expands once, and then remains completely static.
     */
    if (selectedInner) {
      selectedInner.style.transition = "none";
      selectedInner.style.transform = "scaleX(1) scale(1)";
      void selectedInner.offsetWidth;

      selectedInner.style.transition =
        "transform 330ms cubic-bezier(.42,.02,.72,.62)";
      selectedInner.style.transform = "scaleX(0.015) scale(1.08)";
      await wait(350);

      selectedInner.style.transition = "none";
      selectedInner.style.transform = "scaleX(0.015) scale(1.08)";
      void selectedInner.offsetWidth;
    }

    if (selectedFace) {
      selectedFace.src = packet.faceImage;
      selectedFace.alt = packet.name ?? "Force Aspect";
    }

    if (selectedInner) {
      // Force a layout flush after the image swap so the browser has a clean
      // edge-on starting state for the single reveal expansion.
      void selectedInner.offsetWidth;
      selectedInner.style.transition =
        "transform 420ms cubic-bezier(.18,.74,.25,1)";
      selectedInner.style.transform = "scaleX(1) scale(1.17)";
      await wait(440);

      // Freeze the revealed face. No animation is cancelled and no transform
      // is changed again until the entire overlay fades away.
      selectedInner.style.transition = "none";
      selectedInner.style.transform = "scaleX(1) scale(1.17)";
    }

    await wait(3000);
    overlay.classList.add("is-leaving");

    await wait(550);
  } finally {
    overlay.remove();
  }
}

function queueForceAspectCinematic(packet) {
  forceAspectCinematicQueue = forceAspectCinematicQueue
    .catch(() => undefined)
    .then(() => playForceAspectCinematic(packet));

  return forceAspectCinematicQueue;
}

function broadcastForceAspectCinematic(card, aspect, requestId) {
  const packet = {
    type: SOCKET_EVENT,
    requestId,
    senderId: game.user.id,
    aspectKey: aspect.key,
    name: aspect.name,
    side: aspect.side,
    faceImage:
      card.faces?.[card.face ?? 0]?.img ??
      imageForAspect(aspect),
    backImage: BACK_IMAGE
  };

  game.socket.emit(SOCKET_NAME, packet);

  // Module socket broadcasts are intended for the other connected clients.
  // Play the exact same presentation locally as well.
  return queueForceAspectCinematic(packet);
}

function imageForAspect(aspect) {
  return `modules/${MODULE_ID}/cards/force-aspects/aspect-of-${aspect.key}.png`;
}

function cardDescription(aspect) {
  return `<p><strong>${aspect.keywords}</strong> ${aspect.text}</p>`;
}

function cardData(aspect, sort) {
  const img = imageForAspect(aspect);
  const description = cardDescription(aspect);

  return {
    name: aspect.name,
    type: "base",
    suit: aspect.side,
    value: sort + 1,
    description,
    back: {
      name: "Force Aspects Back",
      img: BACK_IMAGE,
      text: ""
    },
    faces: [
      {
        name: aspect.name,
        img,
        text: description
      }
    ],
    face: null,
    drawn: false,
    sort: sort * 100000,
    flags: {
      [MODULE_ID]: {
        [CARD_FLAG]: aspect.key,
        forceAspectSide: aspect.side
      }
    }
  };
}

function getManagedDeck() {
  return game.cards?.find(
    deck => deck.getFlag(MODULE_ID, DECK_FLAG) === true
  ) ?? null;
}


function getManagedHand() {
  return game.cards?.find(
    hand => hand.getFlag(MODULE_ID, HAND_FLAG) === true
  ) ?? null;
}

function gmOnlyOwnership() {
  const ownership = {
    default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
  };

  for (const user of game.users ?? []) {
    ownership[user.id] = user.isGM
      ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  }

  return ownership;
}

function getAspectForCard(card) {
  const key = card?.getFlag?.(MODULE_ID, CARD_FLAG);

  return (
    FORCE_ASPECTS.find(aspect => aspect.key === key) ??
    FORCE_ASPECTS.find(aspect => aspect.name === card?.name) ??
    null
  );
}

async function postForceAspectReveal(card) {
  const aspect = getAspectForCard(card);
  if (!aspect) return;

  const image =
    card.faces?.[card.face ?? 0]?.img ??
    imageForAspect(aspect);

  const content = `
    <div class="litm-force-aspect-reveal ${aspect.side}">
      <div class="litm-force-aspect-reveal-kicker">FORCE ASPECT // DRAW CONFIRMED</div>
      <div class="litm-force-aspect-reveal-name">${aspect.name}</div>
      <img
        class="litm-force-aspect-reveal-image"
        src="${image}"
        alt="${aspect.name}"
      >
    </div>
  `;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ user: game.user }),
    content,
    flags: {
      [MODULE_ID]: {
        forceAspectReveal: true,
        forceAspectKey: aspect.key
      }
    }
  });
}

async function ensureForceAspectHand() {
  if (!game.user.isGM) return getManagedHand();

  const CardsClass = CONFIG.Cards?.documentClass;

  if (!CardsClass) {
    throw new Error("Foundry Cards document class is unavailable.");
  }

  let hand = getManagedHand();

  const handData = {
    name: HAND_NAME,
    type: "hand",
    description:
      "Shared Force Aspect hand supplied by LiTM Conversion. " +
      "Cards drawn here are revealed publicly in chat.",
    img: BACK_IMAGE,
    displayCount: true,
    ownership: gmOnlyOwnership(),
    flags: {
      [MODULE_ID]: {
        [HAND_FLAG]: true,
        handVersion: "0.10.3"
      }
    }
  };

  if (!hand) {
    hand = await CardsClass.create(handData);

    if (!hand) {
      throw new Error("Foundry did not return a created Force Aspect hand.");
    }

    console.log(`${MODULE_ID} | Provisioned ${HAND_NAME}`);
    return hand;
  }

  await hand.update({
    name: handData.name,
    description: handData.description,
    img: handData.img,
    displayCount: handData.displayCount,
    ownership: handData.ownership,
    [`flags.${MODULE_ID}.${HAND_FLAG}`]: true,
    [`flags.${MODULE_ID}.handVersion`]: "0.10.3"
  });

  return hand;
}

async function drawForceAspect() {
  if (!game.user.isGM) {
    return ui.notifications.warn(
      "LiTM Conversion // Only a GM can draw a Force Aspect."
    );
  }

  if (forceAspectDrawInProgress) {
    return ui.notifications.warn(
      "LiTM Conversion // A Force Aspect reveal is already in progress on this client."
    );
  }

  let deck = getManagedDeck();
  let hand = getManagedHand();

  if ((!deck || !hand) && game.user.isGM) {
    deck = deck ?? await ensureForceAspectDeck();
    hand = hand ?? await ensureForceAspectHand();
  }

  if (!deck || !hand) {
    return ui.notifications.error(
      "LiTM Conversion // Force Aspect deck or hand is unavailable. Ask the GM to reload the world."
    );
  }

  const available =
    deck.availableCards?.length ??
    deck.cards.filter(card => !card.drawn).length;

  if (!available) {
    return ui.notifications.warn(
      "LiTM Conversion // No Force Aspect cards remain in the deck. Reset any outstanding cards first."
    );
  }

  forceAspectDrawInProgress = true;

  let drawnCard = null;
  const requestId = foundry.utils.randomID();

  try {
    // Randomize the real Foundry deck before drawing from the top. The visual
    // shuffle is synchronized separately so every connected player sees it.
    await deck.shuffle({
      chatNotification: false
    });

    const cards = await hand.draw(deck, 1, {
      how: CONST.CARD_DRAW_MODES.TOP,
      updateData: {
        face: 0
      }
    });

    drawnCard = cards?.[0] ?? null;

    if (!drawnCard) {
      throw new Error("Foundry did not return a drawn Force Aspect card.");
    }

    const aspect = getAspectForCard(drawnCard);

    if (!aspect) {
      throw new Error(
        `Drawn Force Aspect card ${drawnCard.name} has no managed Aspect data.`
      );
    }

    const animation = broadcastForceAspectCinematic(
      drawnCard,
      aspect,
      requestId
    );

    // Chat lands as the face flips, preserving a permanent result after the
    // cinematic card is dismissed and recalled to the source deck.
    await wait(CINEMATIC_REVEAL_DELAY);
    await postForceAspectReveal(drawnCard);

    await animation;

    return drawnCard;
  } catch (error) {
    console.error(`${MODULE_ID} | Force Aspect cinematic draw failed`, error);

    ui.notifications.error(
      "LiTM Conversion // Force Aspect reveal failed. Check permissions or the browser console."
    );

    return null;
  } finally {
    if (
      drawnCard &&
      drawnCard.parent?.documentName === "Cards" &&
      drawnCard.parent?.getFlag(MODULE_ID, HAND_FLAG) === true
    ) {
      try {
        // Card#recall returns this exact drawn card to its original deck. It
        // does not reset or disturb any other cards which may be elsewhere.
        await drawnCard.recall({
          chatNotification: false,
          updateData: {
            face: null
          }
        });
      } catch (recallError) {
        console.error(
          `${MODULE_ID} | Force Aspect card could not be recalled`,
          recallError
        );

        ui.notifications.warn(
          "LiTM Conversion // The revealed Force Aspect stayed in the hand because it could not be returned automatically."
        );
      }
    }

    forceAspectDrawInProgress = false;
  }
}

async function ensureForceAspectDeck() {
  if (!game.user.isGM) return null;

  const CardsClass = CONFIG.Cards?.documentClass;

  if (!CardsClass) {
    throw new Error("Foundry Cards document class is unavailable.");
  }

  let deck = getManagedDeck();

  const deckData = {
    name: DECK_NAME,
    type: "deck",
    description:
      "A managed Force Aspect deck supplied by LiTM Conversion. " +
      "Each card face contains the full text of one Force Aspect.",
    img: BACK_IMAGE,
    displayCount: true,
    ownership: gmOnlyOwnership(),
    flags: {
      [MODULE_ID]: {
        [DECK_FLAG]: true,
        deckVersion: "0.10.4"
      }
    }
  };

  if (!deck) {
    deck = await CardsClass.create(deckData);

    if (!deck) {
      throw new Error("Foundry did not return a created Force Aspects deck.");
    }

    await deck.createEmbeddedDocuments(
      "Card",
      FORCE_ASPECTS.map(cardData)
    );

    console.log(`${MODULE_ID} | Provisioned ${DECK_NAME} deck`);
    return deck;
  }

  // Keep our managed deck's presentation current without disturbing drawn state.
  await deck.update({
    name: deckData.name,
    description: deckData.description,
    img: deckData.img,
    displayCount: deckData.displayCount,
    ownership: deckData.ownership,
    [`flags.${MODULE_ID}.${DECK_FLAG}`]: true,
    [`flags.${MODULE_ID}.deckVersion`]: "0.10.4"
  });

  const managedByKey = new Map(
    deck.cards
      .filter(card => card.getFlag(MODULE_ID, CARD_FLAG))
      .map(card => [card.getFlag(MODULE_ID, CARD_FLAG), card])
  );

  const creates = [];
  const updates = [];

  FORCE_ASPECTS.forEach((aspect, index) => {
    const desired = cardData(aspect, index);
    const existing = managedByKey.get(aspect.key);

    if (!existing) {
      creates.push(desired);
      return;
    }

    updates.push({
      _id: existing.id,
      name: desired.name,
      type: desired.type,
      suit: desired.suit,
      value: desired.value,
      description: desired.description,
      back: desired.back,
      faces: desired.faces,
      sort: desired.sort,
      [`flags.${MODULE_ID}.${CARD_FLAG}`]: aspect.key,
      [`flags.${MODULE_ID}.forceAspectSide`]: aspect.side
    });
  });

  if (updates.length) {
    await deck.updateEmbeddedDocuments("Card", updates);
  }

  if (creates.length) {
    await deck.createEmbeddedDocuments("Card", creates);
  }

  return deck;
}

Hooks.on("createCard", async (card, options, userId) => {
  // Database hooks fire on every connected client. Only the client that
  // initiated the draw should create the public reveal message.
  if (userId !== game.user.id) return;

  const hand = card.parent;

  if (
    !hand ||
    hand.documentName !== "Cards" ||
    hand.getFlag(MODULE_ID, HAND_FLAG) !== true
  ) {
    return;
  }

  if (!getAspectForCard(card)) return;

  // Cinematic macro draws reveal on the synchronized flip instead of the
  // instant the Card document is created in the hand.
  if (forceAspectDrawInProgress) return;

  try {
    await postForceAspectReveal(card);
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to reveal Force Aspect draw`, error);
  }
});

Hooks.once("ready", async () => {
  const module = game.modules.get(MODULE_ID);

  game.socket.on(SOCKET_NAME, packet => {
    if (packet?.type !== SOCKET_EVENT) return;

    // The sender already started its local animation directly.
    if (packet.senderId === game.user.id) return;

    queueForceAspectCinematic(packet);
  });

  module.api ??= {};
  module.api.forceAspectDeck = {
    restoreDeck: ensureForceAspectDeck,
    restoreHand: ensureForceAspectHand,
    draw: drawForceAspect,
    drawCinematic: drawForceAspect,
    getDeck: getManagedDeck,
    getHand: getManagedHand
  };

  if (!game.user.isGM) return;

  try {
    await ensureForceAspectDeck();
    await ensureForceAspectHand();
  } catch (error) {
    console.error(
      `${MODULE_ID} | Failed to provision Force Aspect card resources`,
      error
    );

    ui.notifications.error(
      "LiTM Conversion // Force Aspect deck or hand could not be provisioned. " +
      "Check the browser console for details."
    );
  }
});
