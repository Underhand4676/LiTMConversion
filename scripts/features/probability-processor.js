// LiTM Conversion // Probability Processor
// Reusable implementation of the branded d6 processor used by the Star Wars sheet.

export async function openProbabilityProcessor({
  initialPool = "",
  initialCut = "",
  detailed = false,
  actor = null,
  onRollCommitted = null
} = {}) {
  // ---------------------------------------------------------
  // PALETTE
  // ---------------------------------------------------------

  const COLOR = {
    background: "#0d1416",
    backgroundDeep: "#090e10",
    panel: "#111a1c",
    panelWarm: "#171611",

    steel: "#465b5e",
    steelDim: "#2b3b3e",

    cyan: "#77bec4",
    cyanBright: "#93d5d9",
    cyanDim: "#587b7f",

    ivory: "#ddd8c8",
    ivoryBright: "#f3efe2",
    ivoryDim: "#aaa797",

    green: "#8fc7a0",
    greenDim: "#547660",
    greenDark: "#101914",

    amber: "#d4aa63",
    amberDim: "#8a7044",
    amberDark: "#19160f",

    orange: "#c87d55",
    red: "#c95f63"
  };


  // ---------------------------------------------------------
  // BRANDED ERROR DIALOG
  // ---------------------------------------------------------

  async function showSystemError(message, code = "ERR-01") {
    await foundry.applications.api.DialogV2.prompt({
      window: {
        title: "SYSTEM FAULT // PROBABILITY ARRAY"
      },

      content: `
        <div style="
          padding:16px;
          background:linear-gradient(135deg, #171312 0%, #241917 100%);
          border:2px solid #9b5e4a;
          box-shadow:inset 0 0 0 2px #0d0908;
          color:#f1ded8;
          font-family:monospace;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            border-bottom:1px solid #704438;
            padding-bottom:8px;
            margin-bottom:12px;
          ">

            <span style="
              color:#e18768;
              font-size:12px;
              font-weight:bold;
              letter-spacing:2px;
            ">
              ⚠ PROCESS INTERRUPTED
            </span>

            <span style="
              color:#a3786d;
              font-size:9px;
              letter-spacing:1px;
            ">
              ${code}
            </span>

          </div>

          <div style="
            background:#100c0b;
            border-left:4px solid #b36750;
            padding:10px 12px;
            color:#f1c9bd;
            font-size:11px;
            letter-spacing:1px;
            line-height:1.5;
          ">
            ${message}
          </div>

          <div style="
            margin-top:10px;
            padding-top:7px;
            border-top:1px solid #3d2924;
            color:#8a6860;
            font-size:9px;
            letter-spacing:1px;
          ">
            INPUT REJECTED // CORRECT PARAMETERS AND RETRANSMIT
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


  // ---------------------------------------------------------
  // PRELOADED CHECK POOL
  // ---------------------------------------------------------

  const parsedInitialPool = Math.floor(Number(initialPool));
  const initialPoolValue =
    Number.isFinite(parsedInitialPool) && parsedInitialPool >= 0
      ? String(parsedInitialPool)
      : "";

  const parsedInitialCut = Math.floor(Number(initialCut));
  const initialCutValue =
    Number.isFinite(parsedInitialCut) && parsedInitialCut >= 0
      ? String(parsedInitialCut)
      : "";


  // ---------------------------------------------------------
  // INPUT WINDOW
  // ---------------------------------------------------------

  const result = await foundry.applications.api.DialogV2.input({
    window: {
      title: "PROBABILITY PROCESSOR // MK VI"
    },

    content: `
      <div style="
        padding:16px;

        background:
          repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.012) 0px,
            rgba(255,255,255,0.012) 1px,
            transparent 1px,
            transparent 4px
          ),
          linear-gradient(
            135deg,
            ${COLOR.background} 0%,
            #151d1f 100%
          );

        border:2px solid ${COLOR.steel};
        box-shadow:inset 0 0 0 2px ${COLOR.backgroundDeep};

        color:${COLOR.ivory};
        font-family:monospace;
      ">

        <!-- HEADER -->
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          border-bottom:1px solid ${COLOR.steel};
          padding-bottom:8px;
          margin-bottom:14px;
        ">

          <div style="
            font-size:13px;
            font-weight:bold;
            letter-spacing:2px;
            color:${COLOR.cyanBright};
          ">
            ◈ PROBABILITY ARRAY
          </div>

          <div style="
            font-size:9px;
            letter-spacing:1px;
            color:${COLOR.ivoryDim};
          ">
            SYS/PRB-MKVI
          </div>

        </div>


        <!-- INPUT GRID -->
        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        ">


          <!-- CHECK POOL -->
          <div style="
            background:${COLOR.backgroundDeep};
            border:1px solid ${COLOR.steelDim};
            padding:10px;
          ">

            <div style="
              font-size:10px;
              letter-spacing:2px;
              color:${COLOR.cyan};
              margin-bottom:5px;
            ">
              CHECK POOL
            </div>

            <input
              name="diceCount"
              type="text"
              inputmode="numeric"
              value="${initialPoolValue}"
              autofocus

              oninput="
                this.value = this.value.replace(/[^0-9]/g, '');
              "

              style="
                width:100%;
                box-sizing:border-box;
                background:${COLOR.panel};
                color:${COLOR.ivoryBright};
                border:1px solid ${COLOR.steel};
                border-bottom:2px solid ${COLOR.cyan};
                padding:8px;
                font-size:18px;
                font-family:monospace;
                text-align:center;
              "
            >

          </div>


          <!-- CUT -->
          <div style="
            background:${COLOR.backgroundDeep};
            border:1px solid #514733;
            padding:10px;
          ">

            <div style="
              font-size:10px;
              letter-spacing:2px;
              color:${COLOR.amber};
              margin-bottom:5px;
            ">
              CUT
            </div>

            <input
              name="cut"
              type="text"
              inputmode="numeric"
              value="${initialCutValue}"

              oninput="
                this.value = this.value.replace(/[^0-9]/g, '');
              "

              style="
                width:100%;
                box-sizing:border-box;
                background:${COLOR.panelWarm};
                color:#eee2c5;
                border:1px solid #665a39;
                border-bottom:2px solid ${COLOR.amberDim};
                padding:8px;
                font-size:18px;
                font-family:monospace;
                text-align:center;
              "
            >

          </div>

        </div>


        <!-- STATUS LINE -->
        <div style="
          margin-top:12px;
          padding-top:8px;
          border-top:1px solid ${COLOR.steelDim};
          font-size:9px;
          letter-spacing:1px;
          color:${COLOR.ivoryDim};
        ">
          ${detailed
            ? "DETAILED TELEMETRY // POWER YIELD ANALYSIS ENABLED"
            : "CUT DEGRADES HIGHEST RETURNS FIRST"}
        </div>

      </div>
    `,

    ok: {
      label: "RUN SOLUTION",
      icon: "fa-solid fa-crosshairs"
    },

    modal: true
  });

  if (!result) return;


  // ---------------------------------------------------------
  // INPUT VALIDATION
  // ---------------------------------------------------------

  const diceCount = Math.floor(Number(result.diceCount));

  const cutCount = result.cut === ""
    ? 0
    : Math.floor(Number(result.cut));


  if (
    !Number.isFinite(diceCount) ||
    diceCount < 1 ||
    diceCount > 100
  ) {
    await showSystemError(
      "CHECK POOL MUST CONTAIN BETWEEN 1 AND 100 RETURNS.",
      "ERR-POOL-01"
    );

    return;
  }


  if (
    !Number.isFinite(cutCount) ||
    cutCount < 0
  ) {
    await showSystemError(
      "CUT VALUE MUST BE ZERO OR GREATER.",
      "ERR-CUT-02"
    );

    return;
  }


  if (cutCount > diceCount) {
    await showSystemError(
      "CUT CANNOT EXCEED THE CHECK POOL.",
      "ERR-CUT-03"
    );

    return;
  }


  // ---------------------------------------------------------
  // GENERATE RETURNS
  // ---------------------------------------------------------

  const roll = await new Roll(`${diceCount}d6`).evaluate();



  // ---------------------------------------------------------
  // COMMIT SOURCE TAGS
  //
  // Only runs after a valid roll has actually been generated.
  // Closing/canceling the processor leaves sheet selections untouched.
  // ---------------------------------------------------------

  if (typeof onRollCommitted === "function") {
    await onRollCommitted({
      actor,
      roll,
      diceCount,
      cutCount
    });
  }


  // ---------------------------------------------------------
  // SORT RETURNS // HIGH TO LOW
  // ---------------------------------------------------------

  const rolledDice = roll.dice[0].results
    .map(r => r.result)
    .sort((a, b) => b - a);


  // ---------------------------------------------------------
  // APPLY CUT
  // ---------------------------------------------------------

  const removedDice = rolledDice.slice(0, cutCount);
  const remainingDice = rolledDice.slice(cutCount);


  // Detailed Roll derives Power only from VALID returns after Cut.
  // Each surviving 4, 5, or 6 contributes one Power.
  const powerCount = detailed
    ? remainingDice.filter(value => value >= 4).length
    : 0;


  // ---------------------------------------------------------
  // DETERMINE OUTCOME
  // ---------------------------------------------------------

  const checkDie = remainingDice.length
    ? remainingDice[0]
    : null;


  let outcome = "NO VALID RETURN";
  let outcomeColor = COLOR.ivoryDim;
  let outcomeBorder = COLOR.steel;


  if (checkDie === 6) {
    outcome = "SUCCESS";
    outcomeColor = COLOR.green;
    outcomeBorder = COLOR.greenDim;
  }

  else if (checkDie >= 4) {
    outcome = "SUCCESS WITH CONSEQUENCES";
    outcomeColor = COLOR.amber;
    outcomeBorder = COLOR.amberDim;
  }

  else if (checkDie >= 2) {
    outcome = "CONSEQUENCES";
    outcomeColor = COLOR.orange;
    outcomeBorder = "#8d5439";
  }

  else if (checkDie === 1) {
    outcome = "DISASTER";
    outcomeColor = COLOR.red;
    outcomeBorder = "#8e4145";
  }


  // ---------------------------------------------------------
  // DISPLAY HELPERS
  // ---------------------------------------------------------

  function activeDie(value) {
    const isPowerReturn = detailed && value >= 4;

    const dieBorder = isPowerReturn
      ? COLOR.amber
      : "#728487";

    const dieBottomBorder = isPowerReturn
      ? COLOR.amber
      : COLOR.cyan;

    const dieColor = isPowerReturn
      ? "#fff0c9"
      : COLOR.ivoryBright;

    const dieBackground = isPowerReturn
      ? "#1b1810"
      : "#151d1e";

    const dieGlow = isPowerReturn
      ? "0 0 7px rgba(212,170,99,0.32)"
      : "0 0 3px rgba(0,0,0,0.4)";

    return `
      <div style="
        display:inline-flex;
        align-items:center;
        justify-content:center;

        width:36px;
        height:36px;

        margin:3px;

        background:${dieBackground};
        border:1px solid ${dieBorder};
        border-bottom:2px solid ${dieBottomBorder};

        box-shadow:
          inset 0 0 6px ${COLOR.backgroundDeep},
          ${dieGlow};

        color:${dieColor};

        font-family:monospace;
        font-size:20px;
        font-weight:bold;
      ">
        ${value}
      </div>
    `;
  }

  function cutDie(value) {
    return `
      <div style="
        display:inline-flex;
        align-items:center;
        justify-content:center;

        width:28px;
        height:28px;

        margin:2px;

        background:${COLOR.panelWarm};
        border:1px solid ${COLOR.amberDim};

        color:#d8c59a;

        font-family:monospace;
        font-size:14px;

        opacity:0.9;
      ">
        ${value}
      </div>
    `;
  }


  // ---------------------------------------------------------
  // BUILD VALID RETURNS
  // ---------------------------------------------------------

  const activeDisplay = remainingDice.length
    ? remainingDice
        .map(activeDie)
        .join("")

    : `
      <div style="
        color:${COLOR.ivoryDim};
        font-size:11px;
        letter-spacing:2px;
        padding:8px 0;
      ">
        // NO VALID RETURNS
      </div>
    `;


  const cutDisplay = removedDice.length
    ? removedDice
        .map(cutDie)
        .join("")

    : "";


  // ---------------------------------------------------------
  // INTERFERENCE / SIGNAL STATUS
  // ---------------------------------------------------------

  const interferenceDisplay = cutCount > 0
    ? `
        <div style="
          background:${COLOR.amberDark};
          border-left:3px solid ${COLOR.amberDim};
          padding:8px 10px;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:5px;
          ">

            <span style="
              color:${COLOR.amber};
              font-size:9px;
              font-weight:bold;
              letter-spacing:2px;
            ">
              INTERFERENCE // CUT
            </span>

            <span style="
              color:#ad9568;
              font-size:9px;
            ">
              SIGNAL DEGRADED
            </span>

          </div>

          <div>
            ${cutDisplay}
          </div>

        </div>
      `

    : `
        <div style="
          background:${COLOR.greenDark};
          border-left:3px solid ${COLOR.greenDim};
          padding:6px 10px;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
          ">

            <span style="
              color:${COLOR.green};
              font-size:9px;
              font-weight:bold;
              letter-spacing:2px;
            ">
              SIGNAL INTEGRITY // NOMINAL
            </span>

            <span style="
              color:#829a87;
              font-size:9px;
              text-align:right;
            ">
              CHANNEL CLEAR
            </span>

          </div>

        </div>
      `;


  // ---------------------------------------------------------
  // OUTCOME PROJECTION
  // ---------------------------------------------------------

  const outcomeDisplay = checkDie !== null
    ? `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;

          background:${COLOR.backgroundDeep};

          border-left:4px solid ${outcomeBorder};

          padding:10px 12px;
          margin-bottom:10px;
        ">

          <div style="
            padding-right:10px;
          ">

            <div style="
              color:${COLOR.cyan};
              font-size:9px;
              font-weight:bold;
              letter-spacing:2px;
              margin-bottom:5px;
            ">
              OUTCOME PROJECTION
            </div>

            <div style="
              color:${outcomeColor};
              font-size:14px;
              font-weight:bold;
              letter-spacing:1px;
              line-height:1.25;
            ">
              ${outcome}
            </div>

            ${detailed ? `
              <div style="
                display:flex;
                align-items:baseline;
                gap:7px;
                margin-top:7px;
                padding-top:6px;
                border-top:1px solid ${COLOR.steelDim};
              ">
                <span style="
                  color:${COLOR.cyanDim};
                  font-size:8px;
                  font-weight:bold;
                  letter-spacing:1.5px;
                ">
                  POWER YIELD
                </span>

                <span style="
                  color:${COLOR.amber};
                  font-size:12px;
                  font-weight:bold;
                  letter-spacing:1px;
                ">
                  // ${powerCount}
                </span>
              </div>
            ` : ""}

          </div>


          <div style="
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;

            min-width:46px;
            width:46px;
            height:46px;

            background:#151b1c;

            border:2px solid ${outcomeColor};

            box-shadow:
              inset 0 0 8px rgba(0,0,0,0.6),
              0 0 7px ${outcomeColor};
          ">

            <div style="
              color:${COLOR.ivoryDim};
              font-size:7px;
              letter-spacing:1px;
            ">
              CHECK
            </div>

            <div style="
              color:${COLOR.ivoryBright};
              font-size:24px;
              font-weight:bold;
              line-height:24px;
            ">
              ${checkDie}
            </div>

          </div>

        </div>
      `

    : `
        <div style="
          background:${COLOR.backgroundDeep};
          border-left:4px solid ${COLOR.steel};
          padding:10px 12px;
          margin-bottom:10px;
        ">

          <div style="
            color:${COLOR.cyan};
            font-size:9px;
            font-weight:bold;
            letter-spacing:2px;
            margin-bottom:5px;
          ">
            OUTCOME PROJECTION
          </div>

          <div style="
            color:${COLOR.ivoryDim};
            font-size:13px;
            font-weight:bold;
            letter-spacing:1px;
          ">
            NO VALID RETURN
          </div>

          ${detailed ? `
            <div style="
              margin-top:7px;
              padding-top:6px;
              border-top:1px solid ${COLOR.steelDim};
              color:${COLOR.cyanDim};
              font-size:8px;
              font-weight:bold;
              letter-spacing:1.5px;
            ">
              POWER YIELD <span style="color:${COLOR.amber};">// 0</span>
            </div>
          ` : ""}

        </div>
      `;


  // ---------------------------------------------------------
  // TELEMETRY CARD
  // ---------------------------------------------------------

  const content = `
    <div style="
      background:
        repeating-linear-gradient(
          0deg,
          rgba(255,255,255,0.012) 0px,
          rgba(255,255,255,0.012) 1px,
          transparent 1px,
          transparent 4px
        ),
        linear-gradient(
          145deg,
          ${COLOR.background},
          ${COLOR.backgroundDeep}
        );

      border:1px solid ${COLOR.steel};

      padding:12px;

      font-family:monospace;
      color:${COLOR.ivory};

      box-shadow:
        inset 0 0 18px rgba(0,0,0,0.58);
    ">


      <!-- HEADER -->
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;

        padding-bottom:7px;
        margin-bottom:10px;

        border-bottom:1px solid ${COLOR.steelDim};
      ">

        <span style="
          color:${COLOR.cyanBright};
          font-size:12px;
          font-weight:bold;
          letter-spacing:2px;
        ">
          ◈ ${detailed ? "DETAILED " : ""}PROBABILITY TELEMETRY
        </span>

        <span style="
          color:${COLOR.ivoryDim};
          font-size:9px;
        ">
          POOL ${diceCount} // CUT ${cutCount}
        </span>

      </div>


      <!-- OUTCOME PROJECTION -->
      ${outcomeDisplay}


      <!-- VALID RETURNS -->
      <div style="
        background:#0b1112;
        border-left:3px solid ${COLOR.steel};
        padding:10px;
        margin-bottom:10px;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:9px;
        ">

          <span style="
            color:${COLOR.cyan};
            font-size:11px;
            font-weight:bold;
            letter-spacing:2px;
          ">
            VALID RETURNS
          </span>

          <span style="
            color:${COLOR.ivoryDim};
            font-size:9px;
          ">
            ${remainingDice.length} REMAIN
          </span>

        </div>

        <div>
          ${activeDisplay}
        </div>

      </div>


      <!-- INTERFERENCE / SIGNAL STATUS -->
      ${interferenceDisplay}


      <!-- FOOTER -->
      <div style="
        border-top:1px solid ${COLOR.steelDim};

        margin-top:9px;
        padding-top:7px;

        color:#707c78;

        font-size:9px;
        letter-spacing:1px;
      ">
        PROBABILITY SOLUTION // LOCK CONFIRMED
      </div>

    </div>
  `;


  // ---------------------------------------------------------
  // TRANSMIT TO CHAT
  //
  // Attaching the evaluated Roll lets LiTM Conversion see it,
  // and Dice So Nice handles the physical dice once.
  // ---------------------------------------------------------

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(actor ? { actor } : {}),
    rolls: [roll],
    content
  });
}
