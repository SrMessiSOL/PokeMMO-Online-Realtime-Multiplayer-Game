import Phaser from "phaser";
import { onlinePlayers, room } from './SocketServer';

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";

let cursors, socketKey;
const SAVE_KEY = 'pokemmo-save-v1';

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

        this.spawnPointName = data.spawnPointName || 'Spawn Point';
        this.initialState = data.gameState || null;
    }

    create() {
        room.then((room) => room.onMessage((data) => {
                if (data.event === 'CURRENT_PLAYERS') {
                    console.log('CURRENT_PLAYERS');

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
                    console.log('PLAYER_JOINED');

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
                    console.log('PLAYER_LEFT');

                    if (onlinePlayers[data.sessionId]) {
                        onlinePlayers[data.sessionId].destroy();
                        delete onlinePlayers[data.sessionId];
                    }
                }
                if (data.event === 'PLAYER_MOVED') {
                    //console.log('PLAYER_MOVED');

                    // If player is in same map
                    if (this.mapName === onlinePlayers[data.sessionId].map) {

                        // If player isn't registered in this scene (map changing bug..)
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
                        // Start animation and set sprite position
                        onlinePlayers[data.sessionId].isWalking(data.position, data.x, data.y);
                    }
                }
                if (data.event === 'PLAYER_MOVEMENT_ENDED') {
                    // If player is in same map
                    if (this.mapName === onlinePlayers[data.sessionId].map) {

                        // If player isn't registered in this scene (map changing bug..)
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
                        // Stop animation & set sprite texture
                        onlinePlayers[data.sessionId].stopWalking(data.position)
                    }
                }
                if (data.event === 'PLAYER_CHANGED_MAP') {
                    console.log('PLAYER_CHANGED_MAP');

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
            })
        );


        this.map = this.make.tilemap({key: this.mapName});

        this.bootstrapInteractionState();

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
        const spawnPoint = this.resolveSpawnPoint();

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
            .text(16, 16, "Arrow keys to move\nSPACE/ENTER to interact\nPress \"D\" to show hitboxes", {
                font: "18px monospace",
                fill: "#000000",
                padding: {x: 20, y: 10},
                backgroundColor: "#ffffff"
            })
            .setScrollFactor(0)
            .setDepth(30);

        this.debugGraphics();

        this.movementTimer();

        this.renderQuestLog();
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

    bootstrapInteractionState() {
        const save = this.initialState || this.loadSaveState();
        this.gameState = save || {
            flags: {},
            objectives: ['Find the Town Guide near the spawn point.'],
            checkpoint: null,
            party: ['Misa'],
            lastMap: this.mapName,
            lastSpawnPoint: this.spawnPointName
        };
        this.dialogueActive = false;
        this.currentPromptText = '';

        this.interactionPrompt = this.add.text(16, 390, '', {
            font: '16px monospace',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0).setDepth(40).setVisible(false);

        this.questLogText = this.add.text(16, 72, '', {
            font: '14px monospace',
            fill: '#ffffff',
            backgroundColor: '#1a1a1a',
            padding: { x: 8, y: 6 }
        }).setScrollFactor(0).setDepth(40);
    }

    resolveSpawnPoint() {
        const checkpoint = this.gameState.checkpoint;
        if (checkpoint && checkpoint.map === this.mapName) {
            const checkpointSpawn = this.map.findObject('SpawnPoints', (obj) => obj.name === checkpoint.spawnPointName);
            if (checkpointSpawn) return checkpointSpawn;
        }

        return this.map.findObject('SpawnPoints', (obj) => obj.name === this.spawnPointName)
            || this.map.findObject('SpawnPoints', (obj) => obj.name === 'Spawn Point');
    }

    setPrompt(message = '') {
        this.currentPromptText = message;
        this.interactionPrompt.setText(message);
        this.interactionPrompt.setVisible(Boolean(message));
    }

    readProperty(obj, name, fallback = null) {
        const prop = obj.properties && obj.properties.find((property) => property.name === name);
        return prop ? prop.value : fallback;
    }

    isInsideObject(obj, x, y) {
        return y >= obj.y && y <= (obj.y + obj.height) && x >= obj.x && x <= (obj.x + obj.width);
    }

    hasFlag(flag) {
        return !flag || Boolean(this.gameState.flags[flag]);
    }

    setFlag(flag, value = true) {
        if (!flag) return;
        this.gameState.flags[flag] = value;
        this.persistSaveState();
    }

    addObjective(objective) {
        if (!objective || this.gameState.objectives.includes(objective)) return;
        this.gameState.objectives.push(objective);
        this.renderQuestLog();
        this.persistSaveState();
    }

    completeObjective(objective) {
        if (!objective) return;
        this.gameState.objectives = this.gameState.objectives.filter((item) => item !== objective);
        this.renderQuestLog();
        this.persistSaveState();
    }

    renderQuestLog() {
        const objectives = this.gameState.objectives.length
            ? this.gameState.objectives.map((objective, idx) => `${idx + 1}. ${objective}`).join('\n')
            : 'All current objectives completed.';
        this.questLogText.setText(`Objectives:\n${objectives}`);
    }

    runNpcInteraction(npc) {
        if (this.dialogueActive) return;
        const requiresFlag = this.readProperty(npc, 'requiresFlag');
        if (!this.hasFlag(requiresFlag)) {
            this.setPrompt('They seem busy. Complete current objective first.');
            return;
        }

        const dialogue = this.readProperty(npc, 'dialogue', '...');
        const lines = dialogue.split('|');
        this.dialogueActive = true;
        this.setPrompt(lines[0]);
        this.time.delayedCall(1800, () => {
            const nextLine = lines[1] || lines[0];
            this.setPrompt(nextLine);
            const setFlag = this.readProperty(npc, 'setsFlag');
            const addObjective = this.readProperty(npc, 'addObjective');
            const completeObjective = this.readProperty(npc, 'completeObjective');
            this.setFlag(setFlag);
            this.addObjective(addObjective);
            this.completeObjective(completeObjective);
            this.dialogueActive = false;
        });
    }

    runCheckpoint(checkpointObj) {
        const spawnPointName = this.readProperty(checkpointObj, 'spawnPointName', this.spawnPointName);
        this.gameState.checkpoint = {
            map: this.mapName,
            spawnPointName,
            x: this.player.x,
            y: this.player.y,
            party: this.gameState.party
        };
        this.persistSaveState();
        this.setPrompt('Checkpoint saved.');
    }

    transitionToMap(targetMap, targetSpawn, facing = 'front') {
        if (!targetMap || !this.cache.tilemap.exists(targetMap)) {
            this.setPrompt('This path is blocked.');
            return;
        }

        this.gameState.lastMap = targetMap;
        this.gameState.lastSpawnPoint = targetSpawn || 'Spawn Point';
        this.persistSaveState();

        room.then((room) => room.send('PLAYER_CHANGED_MAP', { map: targetMap }));
        this.scene.registry.destroy();
        this.scene.events.off();
        this.scene.scene.restart({
            map: targetMap,
            spawnPointName: targetSpawn || 'Spawn Point',
            playerTexturePosition: facing,
            gameState: this.gameState
        });
    }

    loadSaveState() {
        try {
            const raw = window.localStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    persistSaveState() {
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.gameState));
        } catch (err) {
            // no-op
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
