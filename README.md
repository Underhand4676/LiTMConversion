# LiTM Conversion

A Foundry VTT v14 conversion layer for **Legend in the Mist / Mist Engine**, built around a Star Wars campaign presentation and an alternate d6 dice-pool resolution system.

The module is designed to preserve the underlying Mist Engine character data and narrative tag structure while changing how the game is presented and, on the optional conversion sheet, how several rolls are resolved.

## At a Glance

- **Optional Star Wars character sheets** — Republic Intelligence dossier styling for full and compact LiTM character sheets without replacing the default system sheet.
- **d6 Probability Processor** — converts the custom sheet's primary roll flow into a dice pool. `Cut` removes the highest dice first and the highest surviving d6 determines the result.
- **Quick, Detailed, Reaction, and Sacrifice rolls** — purpose-built roll modes for the conversion rules, including native tag selection/burning where appropriate.
- **Wounded & Strained trackers** — persistent six-tier condition displays with compact controls and unstable indicator-light styling at higher tiers.
- **Force Polarity tracker** — optional Light/Dark polarity with Fallen, Lost to the Dark, and Return to the Light states.
- **Probability Telemetry** — records individual d6 results by player and date, with distribution and summary statistics.
- **Republic UI treatment** — themed chat messages, pause overlay, Themebook sheets, Crew Theme Cards, and related interface cleanup.
- **Character-sheet utilities** — Living Standard, Current Credits, fixed backpack/loadout slots, portrait dossier support, and adjudication notes for tags/items.
- **Macro recovery** — provisions the Probability Processor launcher macro into the world automatically.

## Notable Departures from Default LiTM

The optional conversion sheet intentionally changes several pieces of the default play flow:

- **Core checks use a d6 pool instead of the default LiTM roller.** Selected Power Tags add dice; queued burns contribute additional dice; selected Weakness Tags become Cut on the applicable roll modes.
- **Detailed rolls count surviving 4–6 results as Power** after Cut is applied.
- **Reaction rolls ignore Weakness Tags and cap the pool at 6d6.**
- **Sacrifice rolls use 3d6, taking the highest individual die plus the chosen modifier.**
- **Fellowship is presented as Crew** in the Star Wars sheet/UI.
- The conversion sheet adds campaign-specific systems such as **Wounded, Strained, Force Polarity, Living Standard, and Current Credits**.
- Some default presentation elements are hidden or repurposed on the Star Wars sheet, including the portrait/background treatment and selected fellowship/quintessence UI.

The original Mist Engine sheets remain available and are not made default by this module.

## Install / Update Manifest

```text
https://github.com/Underhand4676/LiTMConversion/releases/latest/download/module.json
```
