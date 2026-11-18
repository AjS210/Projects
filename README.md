# AjS210's Projects

| Project | What it contains |
| --- | --- |
| [Pentominoes — PentoLog](./Pentominoes/) | Play a 6 × 10 pentomino game, scan or import boards, and track your numbered solutions. Source, tests, and build instructions are in this folder. |
| [Emul8or](./Emul8or/) | An Android handheld-emulator project in the planning stage. Its research, roadmap, setup script, and license are in this folder. |

## Open PentoLog

[Open PentoLog](https://ajs210.github.io/Projects/Pentominoes/) on your phone or computer. The [6 × 10 reference catalogue](./Pentominoes/reference/isomer-design/) documents the 2,339 solution numbers and seven X-piece groups used to identify saved boards.

PentoLog uses the same browser-storage key as before. On the same browser and `ajs210.github.io` origin, moving to a different path does not require re-importing your collection. **Collection → Export** makes a backup.

## Working in the repository

Open the project folder you want and follow its README. For example, to run PentoLog's tests from a fresh clone:

```sh
cd Pentominoes
npm ci
npm test
```

The top-level [`docs/`](./docs/) is the **GitHub Pages publishing folder**, not a third project. PentoLog's Pages build only replaces `docs/Pentominoes/`. The site root forwards old root-style bookmarks to the app within the current site, including links to `#collection`. A repository rename changes the site URL itself.
