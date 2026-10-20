# Field Deployments

Six Bureau Obscura browser games about investigating anomalies, recovering sensory evidence, and returning with a field record. Each investigation has four endings shaped by the player's findings and recovery choices.

**Category:** Game · **Genres:** Investigation, puzzle, interactive fiction · **Platform:** Web browser

| Game | Assignment | Endings |
| --- | --- | --- |
| The Ninth Pane | A glasshouse contains an extra room | 4 |
| The Sand Map | A desert model controls the surrounding paths | 4 |
| The Third Exposure | An optical station preserves an unusual exposure | 4 |
| The Seventh Rinse | A wash cycle changes the evidence it carries | 4 |
| The Dry Tide | A coastal cistern holds an anomalous tide | 4 |
| The Rain Register | A weather installation repeats a recorded sequence | 4 |

## Play locally

Install Node.js 22 or newer and Python 3. No package installation is required.

```sh
git clone https://github.com/BureauObscura/Field-Deployments.git
cd Field-Deployments
npm run dev
```

Open [the game library](http://127.0.0.1:4188/?game=deployments). The launcher serves the five-game library on port 4188 and the original Ninth Pane on port 4177, matching the builds' local navigation. Stop both servers with Ctrl+C. If either port is in use, stop the earlier preview before starting this one.

Click scene markers to examine evidence. Use the notebook to compare observations, prepare a recovery, and operate the case's instrument. Hints, saved progress, optional sound, reduced motion, and keyboard controls are included. Local saves stay in the current browser and origin.

## Contents

- `deployments/`: the five-game library, game data, engine, interface, tests, and artwork.
- `ninth-pane/`: the original investigation with its engine, story, tests, and artwork.
- `source-assets/` within each project: 96 accepted native PNG originals in total.
- `dist/assets/` within each project: 96 delivered scene, clue, and library-card JPEGs, plus Bureau artwork and licensed fonts.
- `docs/image-provenance.json` within each project: image prompts, file hashes, dimensions, and production details. Some prompts describe the final edit rather than the initial generation.
- `backup-manifest.json`: source revisions and checksums for the exported project files.

The five-game library contains 30 location images, 60 distinct evidence photographs, and one Ninth Pane library card, all at native 1254 × 1254 resolution. The original Ninth Pane's five environment images retain their existing 1672 × 941 format. Native files and web builds are preserved byte-for-byte.

## Verify the backup

```sh
npm test
npm run check
```

The test suites cover game state, ending reachability, decisions, clues, account lifecycle behavior, and evidence views. The checks verify exported file hashes, native and web image provenance, game schemas, browser references, and Ninth Pane JavaScript syntax.

This repository is a public game-source and asset backup. It includes the browser account adapter; the production account service, customer data, credentials, private hosting records, and deployment infrastructure are not included. Localhost play uses the builds' existing local preview identity. The repository does not deploy or reconfigure bureauobscura.com.

## Fonts and attribution

IBM Plex Mono is included under the SIL Open Font License in each project's `dist/assets/brand/OFL-IBM-Plex-Mono.txt`. Generated game imagery is identified in the image provenance files. No project-wide open-source license has been added.
