# Probability Telemetry - D6 Luck Tracker

A Foundry VTT v14 module for tracking **individual d6 results** by user and date. It is built for the same basic job as Simple d20 Stats, but reworked around d6 pools and the Probability Processor visual language.

## What it tracks

- Every individual d6 result found in normal Foundry roll chat messages.
- Results grouped by user and local calendar date.
- Distribution of faces 1 through 6.
- Total d6 rolled.
- Mean, median, mode, and deviation from the expected d6 mean of 3.5.
- Total 1s and total 6s.
- Who rolled the most 1s and the most 6s in the selected date window.

## Interface

Open the Token controls on the left side of Foundry and click the **bar chart** tool named **Probability Telemetry // D6 Archive**.

The console provides:

- SUBJECT selector
- SCAN FROM / SCAN TO date range
- D6 distribution chart
- Expected 16.7% frequency reference line
- Summary telemetry
- GM pause/resume control
- Export, import, per-user purge, and full archive purge controls

## Settings

World settings are available for:

- Recording or ignoring hidden/private rolls
- Allowing players to view GM telemetry
- Including GM users in leader readouts
- Pausing all new data acquisition

## IMPORTANT: Probability Processor macro integration

Normal Foundry roll chat messages are tracked automatically.

The custom Probability Processor macro evaluates a Roll directly and then posts a cosmetic telemetry ChatMessage. Because that final message does not carry the actual Roll object, the module cannot discover those d6s from chat alone.

After the Roll is evaluated, call the module API:

```js
await game.modules.get("probability-telemetry")?.api?.recordRoll?.(roll);
```

The API records the already-evaluated d6 results; it does not roll again.

Other available API helpers:

```js
// Open the telemetry console
game.modules.get("probability-telemetry")?.api?.open();

// Record an already-evaluated Foundry Roll
await game.modules.get("probability-telemetry")?.api?.recordRoll?.(roll);

// Record known d6 values directly
await game.modules.get("probability-telemetry")?.api?.recordValues?.([6, 4, 2, 1]);
```

## Install from Foundry

After the first GitHub release is published, install the module in Foundry using this manifest URL:

```text
https://github.com/Underhand4676/LiTMConversion/releases/latest/download/module.json
```

## Publishing releases

This repository includes a GitHub Actions workflow. To publish a new Foundry release:

1. Update `version` in `module.json`.
2. Update the version in the `download` URL in `module.json`.
3. Commit and push those changes.
4. Create and push a matching tag, for example `v0.1.0`.
5. GitHub Actions creates the release and attaches both `module.json` and the installable module ZIP.

The tag version must match the version in `module.json`; the release workflow checks this automatically.

## Manual installation

1. Shut down the Foundry world.
2. Place the `probability-telemetry` folder inside your Foundry user-data `Data/modules/` directory.
3. Start Foundry.
4. Enable **Probability Telemetry - D6 Luck Tracker** in the world's Manage Modules window.
5. Reload the world.

## Data storage

Telemetry is stored in each Foundry User document under the module flag:

`flags.probability-telemetry.d6Stats`

Dates use `YYYY-MM-DD` keys so date-range sorting is stable.

## Repository

Source and releases: https://github.com/Underhand4676/LiTMConversion

## Credit

The feature concept was based on Simple d20 Stats by Yosoy-Ed and Nolat, licensed under MIT. See `THIRD_PARTY_NOTICES.md` and `LICENSE`.
