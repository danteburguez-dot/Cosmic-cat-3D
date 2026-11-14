# COSMIC CAT — Space Mission Design Game

NASA Space Apps Challenge 2026 (*The Next Frontier*) — Challenge: **[Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)**

COSMIC CAT is a 3D browser game (also packaged as a Windows EXE and an Android APK) where a cat astronaut explores an 8-planet solar system. It answers the challenge's core ask — *design, manage and simulate a complete space mission while balancing budget, power, mass and communications* — through its **Mission Designer mode**, layered on top of an action-exploration game loop.

## How it works

1. **Explore & fight** — free-roaming 3D levels across 8 planets, 10 levels each, with enemies, elites and bosses, procedural Web-Audio sound, minimap, radar and collectible rocket parts.
2. **Design a mission** (button `MISIÓN 🛰️` in the lobby) — a 5-step systems-engineering flow:
   - **CML 1** — choose a science objective (Earth, Universe, Sun, Mars).
   - **CML 2** — choose an orbit with real Δv references (LEO 9.4 km/s, polar 9.7, GEO 11.9, interplanetary 14.5) and a launch vehicle (launch segment).
   - **CML 3–4** — pick instruments (mass / power / cost trade study) and solar panels (space segment); live engineering bars check mass ≤ capacity, power, communications and budget ≤ $200M.
   - **Review** — point-design validation with fix suggestions; the 4 NASA mission segments (launch, space, ground, user) are verified.
   - **CML 5** — launch simulation rated ★1–3, and the game tells you which **real NASA mission your design resembles** (NISAR, Landsat, Webb, SPHEREx, MRO, Parker Solar Probe, CubeSat), mirroring NASA's official Webb telescope game.
3. A medal with your best design is saved to your profile.

## NASA data & resources used

- NASA — *Design and Develop Science Missions* (mission segments): https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
- NASA JPL — *Concept Maturity Levels (CML 1–4)*: https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299
- NASA GMAT — Δv and orbit references: https://software.nasa.gov/software/GSC-19468-1
- NASA GSFC — *Mission Design Lab* (study levels & disciplines): https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
- NASA Webb — *Build It Yourself* game (objective → instruments → launch → real-mission match): https://science.nasa.gov/mission/webb/game-build-it-yourself/

## Run it

- Web: open `index.html` with any static server (e.g. VS Code Live Server). Deployed demo: https://danteburguez-dot.github.io/Cosmic-cat-3D/
- Windows: download `windows-max.rar`, extract, run the EXE.
- Android: download `android-max.rar`, extract, install the APK.

## Technologies

HTML5, CSS3, vanilla JavaScript, WebGL (custom low-poly renderer), Canvas 2D, Web Audio API, C++ compiled to WebAssembly (game logic), Capacitor (Android), Electron (Windows).

## Super Intelligence (SI) usage

Declared in [`AI_USAGE.md`](AI_USAGE.md). No NASA brand elements, logos or mission insignia are used anywhere in the project.

## License

[MIT](LICENSE)
