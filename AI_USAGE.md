# Super Intelligence (SI) Usage — COSMIC CAT

Per the NASA Space Apps Challenge 2026 submission requirements, this document declares how Super Intelligence (SI) tools were used in this project.

## Scope of SI usage

SI tools were used **only** for two specific technical tasks:

1. **C++ game logic (`engine.cpp`)** — assistance writing and compiling the C++ game rules module (combat, enemies, pickups, campaign progress) that is compiled to WebAssembly.
2. **Build tooling for the installers** — assistance setting up the build pipelines that package the web game as a Windows desktop executable (Electron) and an Android APK (Capacitor + Gradle).

## What was NOT done with SI

- **Game concept and design:** the game idea, its mechanics, characters, planets, levels, difficulty design and the mission-designer gameplay were conceived by the team without SI.
- **NASA data integration:** selecting which NASA resources to use and mapping them into game mechanics was done by the team.
- **Art and audio:** all visual assets are original/procedural or team-supplied media; all sound is synthesized at runtime with the Web Audio API. No SI-generated images, videos or audio are used.
- **HTML/CSS/JavaScript:** the web interface, 3D WebGL renderer, HUD, screens and game scripts were developed without SI.
- **Documentation:** this README and project docs were written by the team.

## Compliance notes

- SI was not used to conceive the idea or solution to the challenge.
- No NASA brand elements, logos or design assets were created or used via SI (or otherwise).
- No SI-generated imagery, video or audio exists in this repository.
