import Phaser from "phaser";
import { onlinePlayers, room } from "./SocketServer";

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";

let cursors;
let socketKey;

export class Scene2 extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    init(data) {
        this.mapName = data.map;
        this.playerTexturePosition = data.playerTexturePosition;
        this.returnPosition = data.returnPosition;
        this.container = [];
        this.inEncounter = false;
        this.lastEncounterTile = null;
    }

    create() {
        room.then((roomInstance) =>
            roomInstance.onMessage((data) => {
                if (data.event === "CURRENT_PLAYERS") {
                    Object.keys(data.players).forEach((playerId) => {
                        const player = data.players[playerId];

                        if (playerId !== roomInstance.sessionId) {
                            onlinePlayers[player.sessionId] = new OnlinePlayer({
                                scene: this,
                                playerId: player.sessionId,
                                key: player.sessionId,
                                map: player.map,
                                x: player.x,
                                y: player.y
                            });
                        }
                    });
                }

                if (data.event === "PLAYER_JOINED" && !onlinePlayers[data.sessionId]) {
                    onlinePlayers[data.sessionId] = new OnlinePlayer({
                        scene: this,
                        playerId: data.sessionId,
                        key: data.sessionId,
                        map: data.map,
                        x: data.x,
                        y: data.y
                    });
                }

                if (data.event === "PLAYER_LEFT" && onlinePlayers[data.sessionId]) {
                    onlinePlayers[data.sessionId].destroy();
                    delete onlinePlayers[data.sessionId];
                }

                if (data.event === "PLAYER_MOVED" && onlinePlayers[data.sessionId]) {
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

                if (data.event === "PLAYER_MOVEMENT_ENDED" && onlinePlayers[data.sessionId]) {
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

                        onlinePlayers[data.sessionId].stopWalking(data.position);
                    }
                }

                if (data.event === "PLAYER_CHANGED_MAP" && onlinePlayers[data.sessionId]) {
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
            })
        );

        this.map = this.make.tilemap({ key: this.mapName });
        this.scene.scene.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        const tileset = this.map.addTilesetImage("tuxmon-sample-32px-extruded", "TilesTown");

        this.belowLayer = this.map.createLayer("Below Player", tileset, 0, 0);
        this.worldLayer = this.map.createLayer("World", tileset, 0, 0);
        this.grassLayer = this.map.createLayer("Grass", tileset, 0, 0);
        this.aboveLayer = this.map.createLayer("Above Player", tileset, 0, 0);

        this.worldLayer.setCollisionByProperty({ collides: true });
        this.aboveLayer.setDepth(10);

        const spawnPoint = this.map.findObject("SpawnPoints", (obj) => obj.name === "Spawn Point");
        const playerStart = this.returnPosition || { x: spawnPoint.x, y: spawnPoint.y };

        this.player = new Player({
            scene: this,
            worldLayer: this.worldLayer,
            key: "player",
            x: playerStart.x,
            y: playerStart.y
        });

        const camera = this.cameras.main;
        camera.startFollow(this.player);
        camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        cursors = this.input.keyboard.createCursorKeys();

        this.add
            .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
                font: "18px monospace",
                fill: "#000000",
                padding: { x: 20, y: 10 },
                backgroundColor: "#ffffff"
            })
            .setScrollFactor(0)
            .setDepth(30);

        this.debugGraphics();
        this.movementTimer();
    }

    update(time, delta) {
        if (this.inEncounter) {
            return;
        }

        this.player.update(time, delta);
        this.checkForEncounter();

        if (cursors.left.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "left",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
                }
                socketKey = false;
            }
        } else if (cursors.right.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "right",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
                }
                socketKey = false;
            }
        }

        if (cursors.up.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "back",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
                }
                socketKey = false;
            }
        } else if (cursors.down.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "front",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
                }
                socketKey = false;
            }
        }

        if (Phaser.Input.Keyboard.JustUp(cursors.left) === true) {
            room.then((roomInstance) => roomInstance.send("PLAYER_MOVEMENT_ENDED", { position: "left" }));
        } else if (Phaser.Input.Keyboard.JustUp(cursors.right) === true) {
            room.then((roomInstance) => roomInstance.send("PLAYER_MOVEMENT_ENDED", { position: "right" }));
        }

        if (Phaser.Input.Keyboard.JustUp(cursors.up) === true) {
            room.then((roomInstance) => roomInstance.send("PLAYER_MOVEMENT_ENDED", { position: "back" }));
        } else if (Phaser.Input.Keyboard.JustUp(cursors.down) === true) {
            room.then((roomInstance) => roomInstance.send("PLAYER_MOVEMENT_ENDED", { position: "front" }));
        }
    }

    checkForEncounter() {
        if (!this.grassLayer) {
            return;
        }

        const tile = this.grassLayer.getTileAtWorldXY(this.player.x, this.player.y, true);

        if (!tile || tile.index === -1) {
            this.lastEncounterTile = null;
            return;
        }

        const tilePosition = `${tile.x}:${tile.y}`;
        if (this.lastEncounterTile === tilePosition) {
            return;
        }
        this.lastEncounterTile = tilePosition;

        const encounterEnabled = tile.properties?.encounter !== false;
        if (encounterEnabled && Phaser.Math.Between(1, 100) <= 18) {
            this.startEncounter();
        }
    }

    startEncounter() {
        if (this.inEncounter) {
            return;
        }

        this.inEncounter = true;
        this.player.body.setVelocity(0, 0);

        this.scene.start("encounterScene", {
            returnData: {
                map: this.mapName,
                x: this.player.x,
                y: this.player.y,
                playerTexturePosition: this.playerTexturePosition
            }
        });
    }

    movementTimer() {
        setInterval(() => {
            socketKey = true;
        }, 50);
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
