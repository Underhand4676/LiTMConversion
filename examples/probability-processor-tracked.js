// =========================================================
// PROBABILITY PROCESSOR // MK VI
// =========================================================


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
            color:#8b6257;
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
          color:#75564e;
          font-size:8px;
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
        linear-gradient(135deg, #10171c 0%, #182229 100%);
      border:2px solid #4b8790;
      box-shadow:inset 0 0 0 2px #0a0f12;
      color:#d9eef0;
      font-family:monospace;
    ">

      <!-- HEADER -->
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        border-bottom:1px solid #4b8790;
        padding-bottom:8px;
        margin-bottom:14px;
      ">

        <div style="
          font-size:13px;
          font-weight:bold;
          letter-spacing:2px;
          color:#7fd3dc;
        ">
          ◈ PROBABILITY ARRAY
        </div>

        <div style="
          font-size:9px;
          letter-spacing:1px;
          color:#829da2;
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
          background:#0b1115;
          border:1px solid #3b5f66;
          padding:10px;
        ">

          <div style="
            font-size:10px;
            letter-spacing:2px;
            color:#749ba1;
            margin-bottom:5px;
          ">
            CHECK POOL
          </div>

          <input
            name="diceCount"
            type="text"
            inputmode="numeric"
            value=""
            autofocus

            oninput="
              this.value = this.value.replace(/[^0-9]/g, '');
            "

            style="
              width:100%;
              box-sizing:border-box;
              background:#172126;
              color:#e6fbff;
              border:1px solid #579ca6;
              padding:8px;
              font-size:18px;
              font-family:monospace;
              text-align:center;
            "
          >

        </div>


        <!-- CUT -->
        <div style="
          background:#0b1115;
          border:1px solid #665b3b;
          padding:10px;
        ">

          <div style="
            font-size:10px;
            letter-spacing:2px;
            color:#b5a46c;
            margin-bottom:5px;
          ">
            CUT
          </div>

          <input
            name="cut"
            type="text"
            inputmode="numeric"
            value=""

            oninput="
              this.value = this.value.replace(/[^0-9]/g, '');
            "

            style="
              width:100%;
              box-sizing:border-box;
              background:#211f17;
              color:#fff0b5;
              border:1px solid #a69354;
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
        border-top:1px solid #26383e;
        font-size:9px;
        letter-spacing:1px;
        color:#657b80;
      ">
        CUT DEGRADES HIGHEST RETURNS FIRST
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

// Blank cut is treated as zero.
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
// PROBABILITY TELEMETRY // RECORD THIS D6 POOL
// ---------------------------------------------------------

await game.modules.get("litm-conversion")?.api?.diceTelemetry?.recordRoll?.(roll);


// ---------------------------------------------------------
// DICE SO NICE // 3D PROJECTION
// ---------------------------------------------------------

if (game.dice3d?.showForRoll) {
  await game.dice3d.showForRoll(
    roll,
    game.user,
    true,
    null,
    false
  );
}


// ---------------------------------------------------------
// SORT RETURNS // HIGH TO LOW
// ---------------------------------------------------------

const rolledDice = roll.dice[0].results
  .map(r => r.result)
  .sort((a, b) => b - a);


// ---------------------------------------------------------
// APPLY CUT
//
// Results are already sorted HIGH → LOW.
// Cut removes from the front of the array.
// ---------------------------------------------------------

const removedDice = rolledDice.slice(0, cutCount);
const remainingDice = rolledDice.slice(cutCount);


// ---------------------------------------------------------
// DETERMINE OUTCOME
// ---------------------------------------------------------

const checkDie = remainingDice.length
  ? remainingDice[0]
  : null;


let outcome = "NO VALID RETURN";
let outcomeColor = "#71858a";
let outcomeBorder = "#526a6f";


if (checkDie === 6) {
  outcome = "SUCCESS";
  outcomeColor = "#76e6d1";
  outcomeBorder = "#54bbaa";
}

else if (checkDie >= 4) {
  outcome = "SUCCESS WITH CONSEQUENCES";
  outcomeColor = "#ffb347";
  outcomeBorder = "#b8752c";
}

else if (checkDie >= 2) {
  outcome = "CONSEQUENCES";
  outcomeColor = "#ff784f";
  outcomeBorder = "#b94b32";
}

else if (checkDie === 1) {
  outcome = "DISASTER";
  outcomeColor = "#ff4e59";
  outcomeBorder = "#b52f38";
}


// ---------------------------------------------------------
// DISPLAY HELPERS
// ---------------------------------------------------------

function activeDie(value) {
  return `
    <div style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:36px;
      height:36px;
      margin:3px;
      background:#17272c;
      border:2px solid #65bac4;
      box-shadow:
        inset 0 0 6px #0a1215,
        0 0 3px #315d63;
      color:#e9fdff;
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
      background:#211f17;
      border:1px solid #8d7a43;
      color:#bbaa74;
      font-family:monospace;
      font-size:14px;
      opacity:0.8;
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
      color:#71858a;
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

  : `
    <span style="
      color:#746f5d;
      font-size:10px;
      letter-spacing:1px;
    ">
      NONE
    </span>
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
        background:#0b1216;
        border-left:4px solid ${outcomeBorder};
        padding:10px 12px;
        margin-bottom:10px;
      ">

        <div style="
          padding-right:10px;
        ">
          <div style="
            color:#8de2eb;
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
        </div>

        <div style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          min-width:46px;
          width:46px;
          height:46px;
          background:#131d21;
          border:2px solid ${outcomeColor};
          box-shadow:0 0 7px ${outcomeColor};
        ">

          <div style="
            color:#7a9499;
            font-size:6px;
            letter-spacing:1px;
          ">
            CHECK
          </div>

          <div style="
            color:#ffffff;
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
        background:#0b1216;
        border-left:4px solid #526a6f;
        padding:10px 12px;
        margin-bottom:10px;
      ">

        <div style="
          color:#8de2eb;
          font-size:9px;
          font-weight:bold;
          letter-spacing:2px;
          margin-bottom:5px;
        ">
          OUTCOME PROJECTION
        </div>

        <div style="
          color:#71858a;
          font-size:13px;
          font-weight:bold;
          letter-spacing:1px;
        ">
          NO VALID RETURN
        </div>

      </div>
    `;


// ---------------------------------------------------------
// TELEMETRY CARD
// ---------------------------------------------------------

const content = `
  <div style="
    background:
      linear-gradient(
        135deg,
        #10171c,
        #172229
      );
    border:2px solid #466f76;
    padding:12px;
    font-family:monospace;
    color:#d9eef0;
    box-shadow:
      inset 0 0 0 2px #090e11;
  ">


    <!-- HEADER -->
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding-bottom:7px;
      margin-bottom:10px;
      border-bottom:1px solid #36545a;
    ">

      <span style="
        color:#75c9d2;
        font-size:12px;
        font-weight:bold;
        letter-spacing:2px;
      ">
        ◈ PROBABILITY TELEMETRY
      </span>

      <span style="
        color:#667f84;
        font-size:9px;
      ">
        POOL ${diceCount} // CUT ${cutCount}
      </span>

    </div>


    <!-- OUTCOME PROJECTION -->
    ${outcomeDisplay}


    <!-- VALID RETURNS -->
    <div style="
      background:#0a1115;
      border-left:4px solid #65bac4;
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
          color:#8de2eb;
          font-size:11px;
          font-weight:bold;
          letter-spacing:2px;
        ">
          VALID RETURNS
        </span>

        <span style="
          color:#718d92;
          font-size:9px;
        ">
          ${remainingDice.length} REMAIN
        </span>

      </div>

      <div>
        ${activeDisplay}
      </div>

    </div>


    <!-- CUT RETURNS -->
    <div style="
      background:#14130f;
      border-left:3px solid #8d7a43;
      padding:8px 10px;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:5px;
      ">

        <span style="
          color:#a99760;
          font-size:9px;
          font-weight:bold;
          letter-spacing:2px;
        ">
          INTERFERENCE // PURGED
        </span>

        <span style="
          color:#756d55;
          font-size:8px;
        ">
          CUT FROM CHECK POOL
        </span>

      </div>

      <div>
        ${cutDisplay}
      </div>

    </div>


    <!-- FOOTER -->
    <div style="
      border-top:1px solid #26383e;
      margin-top:9px;
      padding-top:6px;
      color:#526a6f;
      font-size:8px;
      letter-spacing:1px;
    ">
      RETURN SEQUENCE // HIGH → LOW
    </div>

  </div>
`;


// ---------------------------------------------------------
// TRANSMIT TO CHAT
// ---------------------------------------------------------

await ChatMessage.create({
  user: game.user.id,
  speaker: ChatMessage.getSpeaker(),
  content
});