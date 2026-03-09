import Phaser from "phaser";
import { onlinePlayers, room } from './SocketServer';

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";

let cursors, socketKey;

export class Scene2 extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    init(data) {
        // Map data
        this.mapName = data.map;

        // Player Texture starter position
        this.playerTexturePosition = data.playerTexturePosition;

        // Set container
        this.container = [];
    }

    create() {
        const logEvent = (tag, message, payload) => {
            console.log(`[SYNC:${tag}] ${message}`, payload || '');
        };

        const clearOnlinePlayerRef = (sessionId) => {
            const player = onlinePlayers[sessionId];

            if (!player) {
                return;
            }

            if (player.scene) {
                player.scene = null;
            }

            if (player.active !== false) {
                player.destroy();
            }

            delete onlinePlayers[sessionId];
        };

        const upsertOnlinePlayer = (payload) => {
            if (!payload || !payload.sessionId) {
                return null;
            }

            const existingPlayer = onlinePlayers[payload.sessionId];

            if (existingPlayer) {
                existingPlayer.map = payload.map;

                if (!existingPlayer.scene || existingPlayer.scene !== this) {
                    clearOnlinePlayerRef(payload.sessionId);
                } else {
                    if (typeof payload.x === 'number') {
                        existingPlayer.x = payload.x;
                    }

                    if (typeof payload.y === 'number') {
                        existingPlayer.y = payload.y;
                    }

                    return existingPlayer;
                }
            }

            onlinePlayers[payload.sessionId] = new OnlinePlayer({
                scene: this,
                playerId: payload.sessionId,
                key: payload.sessionId,
                map: payload.map,
                x: payload.x,
                y: payload.y
            });

            return onlinePlayers[payload.sessionId];
        };

        room.then((room) => room.onMessage((data) => {
                if (!data || !data.event) {
                    logEvent('INVALID', 'Missing event payload, skipping message.', data);
                    return;
                }

                if (data.event === 'CURRENT_PLAYERS') {
                    logEvent('CURRENT_PLAYERS', 'Processing current players snapshot.');

                    if (!data.players) {
                        return;
                    }

                    Object.keys(data.players).forEach(playerId => {
                        let player = data.players[playerId];

                        if (playerId !== room.sessionId) {
                            upsertOnlinePlayer(player);
                        }
                    })
                }
                if (data.event === 'PLAYER_JOINED') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_JOINED', 'Missing sessionId, skipping join event.', data);
                        return;
                    }

                    logEvent('PLAYER_JOINED', `Player joined: ${data.sessionId}`);

                    upsertOnlinePlayer(data);
                }
                if (data.event === 'PLAYER_LEFT') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_LEFT', 'Missing sessionId, skipping left event.', data);
                        return;
                    }

                    logEvent('PLAYER_LEFT', `Player left: ${data.sessionId}`);

                    if (onlinePlayers[data.sessionId]) {
                        clearOnlinePlayerRef(data.sessionId);
                    }
                }
                if (data.event === 'PLAYER_MOVED') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_MOVED', 'Missing sessionId, skipping movement event.', data);
                        return;
                    }

                    const movedPlayer = onlinePlayers[data.sessionId];

                    if (!movedPlayer) {
                        logEvent('PLAYER_MOVED', `Unknown player ${data.sessionId}, waiting for snapshot/join.`);
                        return;
                    }

                    // If player is in same map
                    if (this.mapName === movedPlayer.map) {

                        const currentPlayer = upsertOnlinePlayer(data);

                        if (!currentPlayer) {
                            return;
                        }

                        // Start animation and set sprite position
                        currentPlayer.isWalking(data.position, data.x, data.y);
                    }
                }
                if (data.event === 'PLAYER_MOVEMENT_ENDED') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_MOVEMENT_ENDED', 'Missing sessionId, skipping movement ended event.', data);
                        return;
                    }

                    const endedPlayer = onlinePlayers[data.sessionId];

                    if (!endedPlayer) {
                        logEvent('PLAYER_MOVEMENT_ENDED', `Unknown player ${data.sessionId}, waiting for snapshot/join.`);
                        return;
                    }

                    // If player is in same map
                    if (this.mapName === endedPlayer.map) {

                        const currentPlayer = upsertOnlinePlayer(data);

                        if (!currentPlayer) {
                            return;
                        }

                        // Stop animation & set sprite texture
                        currentPlayer.stopWalking(data.position)
                    }
                }
                if (data.event === 'PLAYER_CHANGED_MAP') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_CHANGED_MAP', 'Missing sessionId, skipping map change event.', data);
                        return;
                    }

                    logEvent('PLAYER_CHANGED_MAP', `Player changed map: ${data.sessionId}`);

                    if (onlinePlayers[data.sessionId]) {
                        clearOnlinePlayerRef(data.sessionId);
                    }

                    if (data.map === this.mapName) {
                        upsertOnlinePlayer(data);
                    }
                }
            })
        );


        this.map = this.make.tilemap({key: this.mapName});

        console.log("this.mapName",this.mapName);
        console.log("this.map",this.map);


        // Set current map Bounds
        this.scene.scene.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
        // Phaser's cache (i.e. the name you used in preload)
        const tileset = this.map.addTilesetImage("tuxmon-sample-32px-extruded", "TilesTown");

        // Parameters: layer name (or index) from Tiled, tileset, x, y
        this.belowLayer = this.map.createLayer("Below Player", tileset, 0, 0);
        this.worldLayer = this.map.createLayer("World", tileset, 0, 0);
        this.grassLayer = this.map.createLayer("Grass", tileset, 0, 0);
        this.aboveLayer = this.map.createLayer("Above Player", tileset, 0, 0);

        this.worldLayer.setCollisionByProperty({collides: true});

        // By default, everything gets depth sorted on the screen in the order we created things. Here, we
        // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
        // Higher depths will sit on top of lower depth objects.
        this.aboveLayer.setDepth(10);

        // Get spawn point from tiled map
        const spawnPoint = this.map.findObject("SpawnPoints", obj => obj.name === "Spawn Point");

        // Set player
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

        // Help text that has a "fixed" position on the screen
        this.add
            .text(16, 16, "Arrow keys to move\nPress \"D\" to show hitboxes", {
                font: "18px monospace",
                fill: "#000000",
                padding: {x: 20, y: 10},
                backgroundColor: "#ffffff"
            })
            .setScrollFactor(0)
            .setDepth(30);

        this.debugGraphics();

        this.movementTimer();
    }

    update(time, delta) {
        // Loop the player update method
        this.player.update(time, delta);

        // console.log('PlayerX: ' + this.player.x);
        // console.log('PlayerY: ' + this.player.y);

        // Horizontal movement
        if (cursors.left.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send(
                         "PLAYER_MOVED",{
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
                    room.then((room) => room.send(
                         "PLAYER_MOVED",{
                        position: 'right',
                        x: this.player.x,
                        y: this.player.y
                    }))
                }
                socketKey = false;
            }
        }

        // Vertical movement
        if (cursors.up.isDown) {
            if (socketKey) {
                if (this.player.isMoved()) {
                    room.then((room) => room.send(
                        "PLAYER_MOVED",{
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
                    room.then((room) => room.send(
                         "PLAYER_MOVED",{
                        position: 'front',
                        x: this.player.x,
                        y: this.player.y
                    }))
                }
                socketKey = false;
            }
        }

        // Horizontal movement ended
        if (Phaser.Input.Keyboard.JustUp(cursors.left) === true) {
            room.then((room) => room.send( "PLAYER_MOVEMENT_ENDED",{ position: 'left'}))
        } else if (Phaser.Input.Keyboard.JustUp(cursors.right) === true) {
            room.then((room) => room.send( "PLAYER_MOVEMENT_ENDED",{ position: 'right'}))
        }

        // Vertical movement ended
        if (Phaser.Input.Keyboard.JustUp(cursors.up) === true) {
            room.then((room) => room.send( "PLAYER_MOVEMENT_ENDED", {position: 'back'}))
        } else if (Phaser.Input.Keyboard.JustUp(cursors.down) === true) {
            room.then((room) => room.send( "PLAYER_MOVEMENT_ENDED", {position: 'front'}))
        }
    }

    movementTimer() {
        setInterval(() => {
            socketKey = true;
        }, 50)
    }

    debugGraphics() {
        // Debug graphics
        this.input.keyboard.once("keydown_D", event => {
            // Turn on physics debugging to show player's hitbox
            this.physics.world.createDebugGraphic();

            // Create worldLayer collision graphic above the player, but below the help text
            const graphics = this.add
                .graphics()
                .setAlpha(0.75)
                .setDepth(20);
            this.worldLayer.renderDebug(graphics, {
                tileColor: null, // Color of non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
                faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
            });
        });
    }
}
