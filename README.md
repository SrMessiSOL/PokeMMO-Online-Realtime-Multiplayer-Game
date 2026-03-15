# Simple realtime platform game build with Phaser.io
**Simple realtime Pokemon game build with Phaser 3, Colyseus.io & Webpack 4.**

![PokeMMO](https://github.com/aaron5670/PokeMMO-Online-Realtime-Multiplayer-Game/blob/master/docs/images/PokeMMO.gif?raw=true)

### Features & ToDo
- [x] Multiple players can join the game
- [x] Maps are can be created/edited with [Tiled Map Editor](https://www.mapeditor.org/)
- [x] Multiple levels/maps
- [x] Door + world transitions driven by Tiled object layers/properties
- [x] NPC dialogue, scripted quest flags, and objective tracking
- [x] Save/load checkpoints for player and party state
- [ ] Pokémons added

## Playable progression path (demo)
1. Spawn in **town** and talk to the **Town Guide** (NPC object layer).
2. Use the north map transition to travel to **route1**.
3. Talk to the **Ranger** to complete the current quest objective.
4. Return to town and use the **checkpoint** to persist progress.
5. Door zones and map/world transitions all use Tiled object layers:
   - `Doors` with `targetMap`, `targetSpawnPoint`, `playerTexturePosition`, optional `requiresFlag`
   - `Worlds` with `targetMap`, `targetSpawnPoint`, `playerTexturePosition`
   - `NPCs` with `dialogue`, `setsFlag`, optional objective properties
   - `Checkpoints` with `spawnPointName`

## Controls
- **Arrow Keys**: Move
- **SPACE** (or **ENTER**): Interact with doors, NPCs, map transitions, checkpoints
- **D**: Toggle collision debug overlays

### How to install
```bash
# Clone this repository
git clone https://github.com/aaron5670/PokeMMO-Online-Realtime-Multiplayer-Game.git

# Go to the client folder and install all modules
cd client && npm install

# Go to the server folder and install all modules
cd ../server && npm install

# Start the server
node server.js

# Open a new terminal and navigate to the client folder and start the webpack server
cd client && npm start
```
After successfully install go to [http://localhost:8080](http://localhost:8080/).

### Browser MMO migration scaffold
- See `docs/tuxemon-browser-mmo-scaffold.md` for a practical migration plan, API/event boundaries, and import workflow for Tuxemon + SolaMon style content.
- PostgreSQL baseline schema is in `server/db/schema.sql`.
- Starter multi-source import tool (supports `--sourceType tuxemon|solamon`) is in `tools/import-tuxemon/importMonsters.js`.
