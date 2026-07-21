# Storyboard

**Format:** 1920x1080  
**Audio:** macOS Damayanti Indonesian voiceover, no music bed for this pass  
**VO direction:** conversational Indonesian, dry confidence, community-sports context  
**Style basis:** DESIGN.md production capture colors, typography, and dashboard components

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| capture/assets/biawak-kol-horizontal.webp | Brand logo | Beat 1, Beat 5 | Opening and closing identity |
| capture/screenshots/scroll-000.png | Product screenshot | Beat 1, Beat 2 | Production dashboard and top leaderboard |
| capture/screenshots/scroll-100.png | Product screenshot | Beat 2 | Lower leaderboard / qualification zone |
| capture/assets/fandi.jpg | Player image | Beat 4 | MVP / player proof tile |
| capture/assets/koyok.jpg | Player image | Beat 4 | MVP / court context |
| capture/assets/ko-giri.jpg | Player image | Beat 4 | Player profile proof |
| capture/assets/bg-budi.jpg | Player image | Beat 4 | Player list proof |
| capture/assets/momot.jpg | Player image | Beat 4 | Award/player proof |
| capture/assets/favicon.svg | Icon | Beat 5 | Closing icon accent |

## Beat 1 - Receipts (0.00-4.80s)

**VO:** "Satu geng basket. Skor panas, debat lebih panas. Sekarang gak perlu adu ingatan. Biawak Kol yang pegang bukti."

**Concept:** Open on the production dashboard as evidence, not as a landing page. The table appears like a match record being brought into focus.

**Visual:** White canvas. The Biawak Kol logo pins the top-left. Production screenshot enters as a large cropped product panel, focused on the real leaderboard instead of the blank page area. The right side uses sharp local copy, "Kalah boleh. Ngeles jangan.", with compact proof chips for 11 games, 25 players, and 86 percent win rate. Fine green rule lines draw across the frame.

**Assets:** `capture/assets/biawak-kol-horizontal.webp`, `capture/screenshots/scroll-000.png`.

**Techniques:** SVG path drawing, CSS 3D panel depth, per-word kinetic typography.

**Transition:** Push slide left into Beat 2.

## Beat 2 - Live Leaderboard (4.80-12.60s)

**VO:** "Biawak Kol turns every game into a live July leaderboard. Eleven games recorded. Twenty five players tracked. Ko Yusin leads qualified win rate at eighty six percent."

**Concept:** The dashboard becomes a scoreboard. Real production numbers become the center of the frame while the leaderboard rows keep moving behind them.

**Visual:** Top stat cards animate in: 11 games, 25 players, Ko Yusin, 86 percent. A cropped leaderboard scroll moves behind them, with Ko Yusin highlighted in green and lower rows red-tinted as qualification context. Percentage chips tick upward.

**Assets:** `capture/screenshots/scroll-000.png`, `capture/screenshots/scroll-100.png`.

**Techniques:** counter animation, screenshot pan, row cascade.

**Transition:** Blur-through into Beat 3.

## Beat 3 - Record Flow (12.60-18.05s)

**VO:** "Record a match, pick the teams, save the winner, and the standings update by points, coefficient, and percentage."

**Concept:** Show the core workflow without needing a live interaction recording: a match moves from teams to saved result to updated metrics.

**Visual:** A green "Catat Game Baru" pill expands into a compact match form. Team A and Team B columns fill with player chips, a winner toggle snaps into place, then arrows draw into metric cards labeled Poin, Koef, Persentase.

**Assets:** app-derived UI panels, `capture/assets/favicon.svg`.

**Techniques:** SVG connector drawing, chip cascade, data-card counters.

**Transition:** Staggered block cover into Beat 4.

## Beat 4 - Community Proof (18.05-23.35s)

**VO:** "The same data powers M V P moments, history review, player lists, and shareable award visuals."

**Concept:** Move from table mechanics to community payoff. Player images become proof that the app is for real people and recurring game nights.

**Visual:** Five player-image cards fan across the left side with slow Ken Burns motion. On the right, four capability modules stack: MVP, Riwayat, Pemain, Share Award. Each module gets a small icon dot and a real data phrase.

**Assets:** `fandi.jpg`, `koyok.jpg`, `ko-giri.jpg`, `bg-budi.jpg`, `momot.jpg`.

**Techniques:** image Ken Burns, card fan, module cascade.

**Transition:** Gentle crossfade into Beat 5.

## Beat 5 - Close (23.35-28.70s)

**VO:** "Less spreadsheet. More proof. Biawak Kol keeps the games honest."

**Concept:** Resolve into a clean product promise: records over arguments.

**Visual:** White frame, centered brand logo, green CTA pill, and three final proof chips: Record, Rank, Reward. A subtle table grid fades underneath and a gold accent line draws below "keeps the games honest."

**Assets:** `capture/assets/biawak-kol-horizontal.webp`, `capture/assets/favicon.svg`.

**Techniques:** kinetic type, SVG underline draw, final logo pulse.

**Transition:** Final fade to white.

## Production Architecture

```
videos/biawak-kol-demo/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── narration.txt
├── narration.wav
├── transcript.json
└── capture/
    ├── screenshots/
    ├── assets/
    └── extracted/
```
