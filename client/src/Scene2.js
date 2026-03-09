import Phaser from "phaser";
import { onlinePlayers, room } from "./SocketServer";

import OnlinePlayer from "./OnlinePlayer";
import Player from "./Player";

let cursors;
let socketKey;
const { SPECIES, MOVES } = require('../../shared/monsters');

let cursors, socketKey;
const SAVE_KEY = 'pokemmo-save-v1';

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
        this.container = [];

        this.spawnPointName = data.spawnPointName || 'Spawn Point';
        this.initialState = data.gameState || null;
        this.inBattle = false;
        this.battleState = null;
        this.encounterSeed = 0;
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
                if (data.event === 'PLAYER_JOINED') {
                    if (!data.sessionId) {
                        logEvent('PLAYER_JOINED', 'Missing sessionId, skipping join event.', data);
                        return;

                if (data.event === "PLAYER_LEFT" && onlinePlayers[data.sessionId]) {
                    onlinePlayers[data.sessionId].destroy();
                    delete onlinePlayers[data.sessionId];
                }

                if (data.event === "PLAYER_MOVED" && onlinePlayers[data.sessionId]) {
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

                        onlinePlayers[data.sessionId].stopWalking(data.position);
                    }
                }

                if (data.event === "PLAYER_CHANGED_MAP" && onlinePlayers[data.sessionId]) {
                    onlinePlayers[data.sessionId].destroy();
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

        this.map = this.make.tilemap({ key: this.mapName });
        this.scene.scene.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

                if (data.event === 'ENCOUNTER_STARTED') {
                    this.inBattle = true;
                    this.battleState = data;
                    this.renderBattleText(`Encounter: ${SPECIES[data.wildMonster.speciesId].name} Lv${data.wildMonster.level}`);
                }

        this.bootstrapInteractionState();

        console.log("this.mapName",this.mapName);
        console.log("this.map",this.map);
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

        this.worldLayer.setCollisionByProperty({ collides: true });
        this.aboveLayer.setDepth(10);

        const spawnPoint = this.map.findObject("SpawnPoints", (obj) => obj.name === "Spawn Point");
        const playerStart = this.returnPosition || { x: spawnPoint.x, y: spawnPoint.y };
        this.worldLayer.setCollisionByProperty({collides: true});
        this.aboveLayer.setDepth(10);

        // Get spawn point from tiled map
        const spawnPoint = this.resolveSpawnPoint();
        const spawnPoint = this.map.findObject("SpawnPoints", obj => obj.name === "Spawn Point");

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
            .text(16, 16, "Arrow keys to move\nSPACE/ENTER to interact\nPress \"D\" to show hitboxes", {
            .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
            .text(16, 16, "Arrow keys to move\nPress D for hitboxes\nPress E for encounter\nPress A to attack\nPress C to capture", {
                font: "18px monospace",
                fill: "#000000",
                padding: { x: 20, y: 10 },
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

        this.renderQuestLog();
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
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "right",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
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
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "back",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
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
                    room.then((roomInstance) =>
                        roomInstance.send("PLAYER_MOVED", {
                            position: "front",
                            x: this.player.x,
                            y: this.player.y
                        })
                    );
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

    renderBattleText(text) {
        if (this.battleText) {
            this.battleText.setText(text);
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
