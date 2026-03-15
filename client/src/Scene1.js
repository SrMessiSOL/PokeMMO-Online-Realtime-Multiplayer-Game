import Phaser from "phaser";
import TownJSON from "./assets/tilemaps/town.json";
import AshveldJSON from "./assets/tilemaps/ashveld.json";
import CrysthavenJSON from "./assets/tilemaps/crysthaven.json";
import PokemonCenterAshveldJSON from "./assets/tilemaps/pokemon_center_ashveld.json";
import PokemonCenterCrysthavenJSON from "./assets/tilemaps/pokemon_center_crysthaven.json";
import PokemonCenterTownJSON from "./assets/tilemaps/pokemon_center_town.json";
import Route1JSON from "./assets/tilemaps/route1.json";
import Route2JSON from "./assets/tilemaps/route2.json";
import TilesTown from "./assets/tilesets/tuxmon-sample-32px-extruded.png";

import PlayersAtlasJSON from "./assets/atlas/players";
import PlayersAtlasPNG from "./assets/images/players/players.png";
import { getPlayerData, getPokemonSpriteEntries, initializeGameState } from "./state/gameState";
import { DEFAULT_CHARACTER_ID, PLAYER_CHARACTER_OPTIONS } from "./constants/playerCharacters";

export class Scene1 extends Phaser.Scene {
    constructor() {
        super("bootGame");
    }

    preload() {
        // Load Town
        this.load.image("TilesTown", TilesTown);
        this.load.tilemapTiledJSON("town", TownJSON);

        // Load Route1
        this.load.tilemapTiledJSON("route1", Route1JSON);
        this.load.tilemapTiledJSON("ashveld", AshveldJSON);
        this.load.tilemapTiledJSON("route2", Route2JSON);
        this.load.tilemapTiledJSON("crysthaven", CrysthavenJSON);
        this.load.tilemapTiledJSON("pokemon_center_town", PokemonCenterTownJSON);
        this.load.tilemapTiledJSON("pokemon_center_ashveld", PokemonCenterAshveldJSON);
        this.load.tilemapTiledJSON("pokemon_center_crysthaven", PokemonCenterCrysthavenJSON);

        // Load atlas
        this.load.atlas("players", PlayersAtlasPNG, PlayersAtlasJSON);
    }

    create() {
        this.loadingText = this.add.text(20, 20, "Loading game...", {
            fontFamily: "\"Press Start 2P\", monospace",
            fontSize: "12px",
            color: "#ffffff"
        });

        this.createAnimations();
        this.bootstrapGame();
    }

    async bootstrapGame() {
        this.loadingText.setText("Loading game...\nSyncing Kanto Pokédex");

        await Promise.all([
            initializeGameState(),
            waitForPixelFont()
        ]);

        const spriteEntries = getPokemonSpriteEntries().filter(({ key }) => !this.textures.exists(key));

        if (spriteEntries.length) {
            spriteEntries.forEach(({ key, url }) => {
                this.load.image(key, url);
            });

            this.loadingText.setText("Loading game...\nCaching battle sprites");
            this.load.once(Phaser.Loader.Events.COMPLETE, () => {
                this.startGame();
            });
            this.load.start();
            return;
        }

        this.startGame();
    }

    startGame() {
        this.loadingText.setText("Loading game...\nStarting");
        const player = getPlayerData();
        const characterId = player.characterId || DEFAULT_CHARACTER_ID;

        this.scene.start("playGame", {
            map: player.position.mapId,
            playerTexturePosition: player.position.facing,
            spawnPointName: "Spawn Point",
            playerPosition: {
                x: player.position.x,
                y: player.position.y
            },
            characterId,
            playerName: player.name,
            walletAddress: player.walletAddress || null,
            disableNpcs: true
        });
    }

    createAnimations() {
        PLAYER_CHARACTER_OPTIONS.forEach(({ id }) => {
            this.createCharacterAnimations(id);
        });
        // onlinePlayer animations
        this.anims.create({
            key: "onlinePlayer-left-walk", frames: this.anims.generateFrameNames("players", {
                start: 0,
                end: 3,
                zeroPad: 3,
                prefix: "bob_left_walk.",
                suffix: ".png"
            }), frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: "onlinePlayer-right-walk", frames: this.anims.generateFrameNames("players", {
                start: 0,
                end: 3,
                zeroPad: 3,
                prefix: "bob_right_walk.",
                suffix: ".png"
            }), frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: "onlinePlayer-front-walk", frames: this.anims.generateFrameNames("players", {
                start: 0,
                end: 3,
                zeroPad: 3,
                prefix: "bob_front_walk.",
                suffix: ".png"
            }), frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: "onlinePlayer-back-walk", frames: this.anims.generateFrameNames("players", {
                start: 0,
                end: 3,
                zeroPad: 3,
                prefix: "bob_back_walk.",
                suffix: ".png"
            }), frameRate: 10, repeat: -1
        });
    }
    createCharacterAnimations(characterId) {
        this.anims.create({
            key: `${characterId}-left-walk`,
            frames: this.anims.generateFrameNames("players", {
                prefix: `${characterId}_left_walk.`,
                start: 0,
                end: 3,
                zeroPad: 3,
                suffix: ".png"
            }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: `${characterId}-right-walk`,
            frames: this.anims.generateFrameNames("players", {
                prefix: `${characterId}_right_walk.`,
                start: 0,
                end: 3,
                zeroPad: 3,
                suffix: ".png"
            }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: `${characterId}-front-walk`,
            frames: this.anims.generateFrameNames("players", {
                prefix: `${characterId}_front_walk.`,
                start: 0,
                end: 3,
                zeroPad: 3,
                suffix: ".png"
            }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: `${characterId}-back-walk`,
            frames: this.anims.generateFrameNames("players", {
                prefix: `${characterId}_back_walk.`,
                start: 0,
                end: 3,
                zeroPad: 3,
                suffix: ".png"
            }),
            frameRate: 10,
            repeat: -1
        });
    }

}

function waitForPixelFont() {
    if (typeof document === "undefined" || !document.fonts) {
        return Promise.resolve();
    }

    return Promise.all([
        document.fonts.load("10px \"Press Start 2P\""),
        document.fonts.ready
    ]).catch(() => undefined);
}
