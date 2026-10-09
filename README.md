# BlockDr

A Minecraft-style block world in your browser, made for building wooden houses (with a bit of Sims 4 charm).

## Play
Serve the folder with any static server and open it in a browser:

    python3 -m http.server 8000   # then visit http://localhost:8000

(`index.html` uses ES modules, so opening the file directly won't work.)

## Features
- Procedural terrain with forests (oak, birch, dark oak) - chop the trees for wood
- 23 building blocks: log/plank variants, glass, bricks, roof shingles, wool, bookshelf, lamp...
- Press **H** to auto-build a furnished starter cabin, then redecorate it
- Build mode (double-tap Space to fly), day/night cycle, little Sims with plumbobs wandering around
- Your builds are saved automatically in the browser (localStorage)

## Controls
WASD move - Space jump (double-tap = fly) - Shift sprint/descend - Left click break - Right click place -
1-9 / wheel hotbar - B all blocks - H cabin - T day/night - R respawn
