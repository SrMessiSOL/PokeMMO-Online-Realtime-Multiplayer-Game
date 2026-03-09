import Phaser from "phaser";
import { onlinePlayers, room } from './SocketServer';

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";

const { SPECIES, MOVES } = require('../../shared/monsters');

let cursors, socketKey;

export class Scene2 extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    init(data) {
        this.mapName = data.map;
        this.playerTexturePosition = data.playerTexturePosition;
        this.container = [];
        this.inBattle = false;
        this.battleState = null;
        this.encounterSeed = 0;
    }

    create() {
        room.then((room) => room.onMessage((data) => {
                if (data.event === 'CURRENT_PLAYERS') {
                    Object.keys(data.players).forEach(playerId => {
                        let player = data.players[playerId];

                        if (playerId !== room.sessionId) {
                            onlinePlayers[player.sessionId] = new OnlinePlayer({
                                scene: this,
                                playerId: player.sessionId,
                                key: player.sessionId,
                                map: player.map,
                                x: player.x,
                                y: player.y
                            });
                        }
                    })
                }
                if (data.event === 'PLAYER_JOINED') {
                    if (!onlinePlayers[data.sessionId]) {
                        onlinePlayers[data.sessionId] = new OnlinePlayer({
                            scene: this,
                            playerId: data.sessionId,
                            key: data.sessionId,
                            map: data.map,
                            x: data.x,
                            y: data.y
                        });
                    }
                }
                if (data.event === 'PLAYER_LEFT') {
                    if (onlinePlayers[data.sessionId]) {
                        onlinePlayers[data.sessionId].destroy();
                        delete onlinePlayers[data.sessionId];
                    }
                }
                if (data.event === 'PLAYER_MOVED') {
                    if (this.mapName === onlinePlayers[data.sessionId].map) {
                        if (!onlinePlayers[data.sessionId].scene) {
                            onlinePlayers[data.sessionId] = new OnlinePlayer({
                                scene: this,
                                playerId: data.sessionId,
                                key: data.sessionId,
                                map: data.map,
                                x: data.x,
                                y: data.y
                            });
                        }
                        onlinePlayers[data.sessionId].isWalking(data.position, data.x, data.y);
                    }
                }
                if (data.event === 'PLAYER_MOVEMENT_ENDED') {
                    if (this.mapName === onlinePlayers[data.sessionId].map) {
                        if (!onlinePlayers[data.sessionId].scene) {
                            onlinePlayers[data.sessionId] = new OnlinePlayer({
                                scene: this,
                                playerId: data.sessionId,
                                key: data.sessionId,
                                map: data.map,
                                x: data.x,
                                y: data.y
                            });
                        }
                        onlinePlayers[data.sessionId].stopWalking(data.position)
                    }
                }
                if (data.event === 'PLAYER_CHANGED_MAP') {
                    if (onlinePlayers[data.sessionId]) {
                        onlinePlayers[data.sessionId].destroy();

                        if (data.map === this.mapName && !onlinePlayers[data.sessionId].scene) {
                            onlinePlayers[data.sessionId] = new OnlinePlayer({
                                scene: this,
                                playerId: data.sessionId,
                                key: data.sessionId,
                                map: data.map,
                                x: data.x,
                                y: data.y
                            });
                        }
                    }
                }

                if (data.event === 'ENCOUNTER_STARTED') {
                    this.inBattle = true;
                    this.battleState = data;
                    this.renderBattleText(`Encounter: ${SPECIES[data.wildMonster.speciesId].name} Lv${data.wildMonster.level}`);
                }

                if (data.event === 'BATTLE_UPDATE') {
                    this.inBattle = true;
                    this.battleState = {
                        ...this.battleState,
                        ...data
                    };

                    const moveNames = data.availableMoves.map((move) => move.name).join(', ');
                    this.renderBattleText(`${data.battleLog.join('\n')}\nMoves: ${moveNames}\n[A]ttack [C]apture [E]ncounter`);
                }

                if (data.event === 'BATTLE_ENDED') {
                    this.inBattle = false;
                    this.renderBattleText(`Battle ended: ${data.result}. Press E for next encounter.`);
                }

                if (data.event === 'BATTLE_ERROR') {
                    this.renderBattleText(`Battle error: ${data.message}`);
                }
            })
        );

        this.map = this.make.tilemap({key: this.mapName});
        this.scene.scene.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        const tileset = this.map.addTilesetImage("tuxmon-sample-32px-extruded", "TilesTown");

        this.belowLayer = this.map.createLayer("Below Player", tileset, 0, 0);
        this.worldLayer = this.map.createLayer("World", tileset, 0, 0);
        this.grassLayer = this.map.createLayer("Grass", tileset, 0, 0);
        this.aboveLayer = this.map.createLayer("Above Player", tileset, 0, 0);

        this.worldLayer.setCollisionByProperty({collides: true});
        this.aboveLayer.setDepth(10);

        const spawnPoint = this.map.findObject("SpawnPoints", obj => obj.name === "Spawn Point");

        this.player = new Player({
            scene: this,
            worldLayer: this.worldLayer,
            key: 'player',
            x: spawnPoint.x,
            y: spawnPoint.y
        });

        const camera = this.cameras.main;
        camera.startFollow(this.player);
        camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        cursors = this.input.keyboard.createCursorKeys();

        this.add
            .text(16, 16, "Arrow keys to move\nPress D for hitboxes\nPress E for encounter\nPress A to attack\nPress C to capture", {
                font: "18px monospace",
                fill: "#000000",
                padding: {x: 20, y: 10},
                backgroundColor: "#ffffff"
            })
            .setScrollFactor(0)
            .setDepth(30);

        this.battleText = this.add
            .text(16, 150, "No active battle.", {
                font: "16px monospace",
                fill: "#ffffff",
                padding: {x: 12, y: 8},
                backgroundColor: "#303030"
            })
            .setScrollFactor(0)
            .setDepth(30);

        this.input.keyboard.on('keydown_E', () => {
            this.encounterSeed += 1;
            room.then((room) => room.send('REQUEST_ENCOUNTER', {
                map: this.mapName,
                zone: this.mapName === 'town' ? 'outskirts_grass' : 'tall_grass_north',
                seed: this.encounterSeed
            }));
        });

        this.input.keyboard.on('keydown_A', () => {
            if (!this.inBattle || !this.battleState || !this.battleState.playerMonster) {
                return;
            }
            const firstMove = this.battleState.playerMonster.moves[0];
            if (!MOVES[firstMove]) {
                return;
            }
            room.then((room) => room.send('BATTLE_ACTION', { action: 'move', moveId: firstMove }));
        });

        this.input.keyboard.on('keydown_C', () => {
            if (!this.inBattle) {
                return;
            }
            room.then((room) => room.send('BATTLE_ACTION', { action: 'capture' }));
        });

        this.debugGraphics();
        this.movementTimer();
    }

    update(time, delta) {
        this.player.update(time, delta);

        if (cursors.left.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send("PLAYER_MOVED",{
                        position: 'left',
                        x: this.player.x,
                        y: this.player.y
                    }));
                }
                socketKey = false;
            }
        } else if (cursors.right.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send("PLAYER_MOVED",{
                        position: 'right',
                        x: this.player.x,
                        y: this.player.y
                    }))
                }
                socketKey = false;
            }
        }

        if (cursors.up.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send("PLAYER_MOVED",{
                        position: 'back',
                        x: this.player.x,
                        y: this.player.y
                    }))
                }
                socketKey = false;
            }
        } else if (cursors.down.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send("PLAYER_MOVED",{
                        position: 'front',
                        x: this.player.x,
                        y: this.player.y
                    }))
                }
                socketKey = false;
            }
        }

        if (Phaser.Input.Keyboard.JustUp(cursors.left) === true) {
            room.then((room) => room.send("PLAYER_MOVEMENT_ENDED",{ position: 'left'}))
        } else if (Phaser.Input.Keyboard.JustUp(cursors.right) === true) {
            room.then((room) => room.send("PLAYER_MOVEMENT_ENDED",{ position: 'right'}))
        }

        if (Phaser.Input.Keyboard.JustUp(cursors.up) === true) {
            room.then((room) => room.send("PLAYER_MOVEMENT_ENDED", {position: 'back'}))
        } else if (Phaser.Input.Keyboard.JustUp(cursors.down) === true) {
            room.then((room) => room.send("PLAYER_MOVEMENT_ENDED", {position: 'front'}))
        }
    }

    renderBattleText(text) {
        if (this.battleText) {
            this.battleText.setText(text);
        }
    }

    movementTimer() {
        setInterval(() => {
            socketKey = true;
        }, 50)
    }

    debugGraphics() {
        this.input.keyboard.once("keydown_D", () => {
            this.physics.world.createDebugGraphic();
            const graphics = this.add.graphics().setAlpha(0.75).setDepth(20);
            this.worldLayer.renderDebug(graphics, {
                tileColor: null,
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
                faceColor: new Phaser.Display.Color(40, 39, 37, 255)
            });
        });
    }
}
