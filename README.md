# LiTM Conversion

LiTM Conversion is a Star Wars conversion layer for **Legend in the Mist / Mist Engine** on Foundry VTT v14. It keeps the tag-driven structure of Mist Engine, but changes the presentation and several core resolution tools to fit this campaign.

## What the Module Adds

- **Star Wars character sheets**
  - Full and compact Republic Intelligence dossier layouts
  - Wounded and Strained trackers
  - Force Polarity, including Fallen, Lost to the Dark, and Return to the Light
  - Living Standard and Current Credits
  - Fixed backpack and consumable slots
  - Portrait dossier support
  - Adjudication notes for tags and equipment
  - Crew presentation in place of Fellowship terminology
  - Themebook-only character construction, with Theme Kit selectors removed from the conversion sheets

- **d6 dice pool resolution**
  - The main conversion sheet uses a pool of d6s instead of the default LiTM roll flow
  - Power Tags add dice
  - Burned Power Tags contribute additional dice
  - Weakness Tags become Cut where the roll mode uses Cut
  - Cut removes the highest dice first
  - The highest surviving die determines the result

- **Converted roll modes**
  - Quick Roll
  - Detailed Roll with Power Yield
  - Reaction Roll with a 6d6 cap
  - Sacrifice using 3d6 and the highest individual die plus its modifier

- **Probability tools**
  - Probability Processor
  - Per-player d6 telemetry
  - Date-based roll history and statistics
  - Automatic recovery of the Probability Processor launcher macro

- **Force Aspects deck**
  - Adds the Force Aspects as a native Foundry Cards deck
  - Includes 18 Light, Neutral, and Dark Aspect cards
  - Uses the approved worn Sabacc-inspired card faces and matching back
  - The GM copy is restored automatically if the managed deck is missing
  - Creates a shared Force Aspect Hand for native Foundry card draws
  - Includes a Draw Force Aspect macro with a synchronized Sabacc-style shuffle and card-flip reveal
  - The cinematic reveal is broadcast to every connected player
  - The result is posted publicly in chat for permanent reference
  - The exact drawn card is automatically returned to the source deck after the reveal
  - Manual draws to the managed hand still reveal publicly in chat

- **Star Wars interface treatment**
  - Republic-styled chat
  - Republic pause overlay
  - Reskinned Themebooks
  - Crew Theme Cards
  - Dark dossier styling in place of the default parchment presentation where the conversion applies

## Main Differences from Default LiTM

The biggest rules change is the dice system. Core checks on the Star Wars character sheet use a **d6 dice pool** rather than the standard LiTM roller.

Detailed Rolls count surviving results of 4, 5, or 6 as Power after Cut is resolved. Reaction Rolls ignore Weakness Tags and cannot exceed 6d6. Sacrifice rolls 3d6 and resolves from the highest individual die plus the chosen modifier.

The character sheet also adds campaign-specific systems such as Wounded, Strained, Force Polarity, Living Standard, Current Credits, and the fixed loadout structure.

## Install / Update Manifest

```text
https://github.com/Underhand4676/LiTMConversion/releases/latest/download/module.json
```
