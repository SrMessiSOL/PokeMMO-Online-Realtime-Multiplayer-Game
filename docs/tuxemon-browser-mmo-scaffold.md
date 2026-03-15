# Tuxemon → Browser MMO Scaffold

This document provides a practical migration scaffold for evolving this Phaser + Colyseus prototype into a browser-first Pokémon-style MMO while reusing Tuxemon-compatible content formats.

## 1) Recommended project layout

```text
client/                      # Phaser rendering, UI, input, local prediction
server/                      # Colyseus rooms + HTTP API + persistence
shared/
  monsters/                  # Existing battle/game data modules
  schemas/                   # Canonical data contracts for import + validation
tools/
  import-tuxemon/            # Repeatable conversion scripts from Tuxemon data
```

This repository already has `client/`, `server/`, and `shared/`; add tooling and schemas incrementally.

## 2) Authoritative server boundaries

Keep all persistent and competitive state server-side:

- account/session ownership
- character name and profile mutations
- position saves at map transfer/checkpoints
- party, inventory, encounter outcomes
- battle resolution and rewards

Client should only own presentation concerns:

- rendering
- camera
- animation
- menu/UI state
- optional movement prediction

## 3) Transport split

Use two channels with clear responsibilities:

### HTTP API (account + CRUD)

- `POST /auth/register`
- `POST /auth/login`
- `GET /characters`
- `POST /characters`
- `POST /characters/:id/rename`

### Colyseus room messages (live world/battle)

- `move`
- `chat`
- `change_map`
- `start_encounter`
- `battle_action`

## 4) Database baseline

A PostgreSQL starter schema has been added at:

- `server/db/schema.sql`

It covers:

- accounts
- characters
- character_monsters
- inventory_items
- quest_flags

## 5) Data contracts for imported content

A baseline monster schema has been added at:

- `shared/schemas/monster.schema.json`

Use this schema as the normalized target shape for imported monster definitions.

## 6) Multi-source import workflow (Tuxemon + SolaMon)

A starter import script has been added at:

- `tools/import-tuxemon/importMonsters.js`

The script supports both source shapes:

- `--sourceType tuxemon`
- `--sourceType solamon`

and it:

1. reads source monster JSON files from a configurable input directory,
2. normalizes fields into one stable contract,
3. writes output JSON files into a shared target directory,
4. optionally prefixes imported IDs (`--idPrefix`) to avoid cross-repo collisions.

### Example usage

```bash
# Import Tuxemon monsters
node tools/import-tuxemon/importMonsters.js \
  --source /path/to/tuxemon/data/db/monster \
  --sourceType tuxemon \
  --target ./shared/data/monsters

# Import SolaMon monsters into the same target with an ID prefix
node tools/import-tuxemon/importMonsters.js \
  --source /path/to/solamon/monsters \
  --sourceType solamon \
  --idPrefix solamon \
  --target ./shared/data/monsters
```

## 7) Incremental roadmap for this repository

1. **Multiplayer world hardening**
   - validate movement on server room handlers
   - periodically persist player position
2. **Character/account API**
   - add HTTP auth and character routes
   - wire rename to immediate DB commit
3. **Content import**
   - import a small monster subset first (5–10 species) from Tuxemon
   - import selected SolaMon species next with `--idPrefix` to avoid collisions
   - add move/item importers next
4. **Battle authority**
   - execute all battle formulas server-side
   - return deterministic combat events to clients
5. **MMO systems**
   - chat moderation, trades, friends, PvP rules

## 8) Design principle to keep

Avoid porting desktop runtime assumptions (menu save, local-file authority, pygame-specific loops).

Port only reusable content assets and formulas, then run gameplay mutations through small server-authoritative commands that save immediately.
