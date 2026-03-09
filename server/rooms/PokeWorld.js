const fs = require('fs');
const path = require('path');
const colyseus = require('colyseus');

const PROFILE_STORE_PATH = path.join(__dirname, '..', 'data', 'playerProfiles.json');

const clone = (value) => JSON.parse(JSON.stringify(value));

const getDefaultParty = () => ([
    {
        monsterId: 'starter-embercub',
        level: 5,
        hp: 35,
        maxHp: 35,
        status: 'normal',
        moves: [
            { moveId: 'tackle', power: 10 },
            { moveId: 'growl', power: 0 },
            { moveId: 'ember', power: 14 },
            { moveId: 'quick-attack', power: 12 }
        ]
    }
]);

const getDefaultInventory = () => ({
    captureItems: {
        basic_ball: 5
    },
    healingItems: {
        potion: 3
    }
});

const getDefaultProgress = () => ({
    defeatedEncounters: [],
    mapCheckpoints: ['town_spawn']
});

const getDefaultProfile = (sessionId, profileId) => ({
    sessionId,
    profileId,
    map: 'town',
    x: 352,
    y: 1216,
    party: getDefaultParty(),
    inventory: getDefaultInventory(),
    progress: getDefaultProgress(),
    inEncounter: false,
    activeMonsterIndex: 0
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

exports.PokeWorld = class extends colyseus.Room {
    onCreate() {
        console.log('ON CREATE');

        this.players = {};
        this.battles = new Map();
        this.profiles = this.loadProfiles();

        this.onMessage('PLAYER_MOVED', (player, data = {}) => {
            if (!this.players[player.sessionId]) {
                return;
            }

            const x = Number(data.x);
            const y = Number(data.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                player.send('ACTION_REJECTED', { reason: 'Invalid movement payload.' });
                return;
            }

            this.players[player.sessionId].x = x;
            this.players[player.sessionId].y = y;

            this.broadcastPublicDelta(player, {
                type: 'movement',
                x,
                y,
                position: data.position
            });
        });

        this.onMessage('PLAYER_MOVEMENT_ENDED', (player, data = {}) => {
            const state = this.players[player.sessionId];
            if (!state) {
                return;
            }

            this.broadcastPublicDelta(player, {
                type: 'movement-ended',
                map: state.map,
                position: data.position
            });
        });

        this.onMessage('PLAYER_CHANGED_MAP', (player, data = {}) => {
            const state = this.players[player.sessionId];
            if (!state || typeof data.map !== 'string' || !data.map.trim()) {
                player.send('ACTION_REJECTED', { reason: 'Invalid map change payload.' });
                return;
            }

            state.map = data.map.trim();
            state.progress.mapCheckpoints = Array.from(
                new Set([...state.progress.mapCheckpoints, state.map])
            );

            player.send('CURRENT_PLAYERS', { players: this.getPublicPlayersSnapshot() });
            this.broadcastPublicDelta(player, {
                type: 'map-changed',
                map: state.map,
                x: 300,
                y: 75
            });
        });

        this.onMessage('START_ENCOUNTER', (player, data = {}) => this.startEncounter(player, data));
        this.onMessage('CHOOSE_MOVE', (player, data = {}) => this.chooseMove(player, data));
        this.onMessage('SWITCH_MONSTER', (player, data = {}) => this.switchMonster(player, data));
        this.onMessage('USE_ITEM', (player, data = {}) => this.useItem(player, data));
        this.onMessage('RUN_FROM_ENCOUNTER', (player) => this.runFromEncounter(player));
        this.onMessage('CAPTURE_ATTEMPT', (player, data = {}) => this.captureAttempt(player, data));
    }

    onJoin(player, options = {}) {
        console.log('ON JOIN');

        const profileId = this.resolveProfileId(player, options);
        const profile = this.restoreProfile(profileId, player.sessionId);

        this.players[player.sessionId] = profile;

        setTimeout(() => player.send('CURRENT_PLAYERS', { players: this.getPublicPlayersSnapshot() }), 250);
        player.send('PLAYER_PROFILE', { profile: this.getPrivateState(profile) });

        this.broadcast('PLAYER_JOINED', this.getPublicState(profile), { except: player });
    }

    onLeave(player) {
        console.log('ON LEAVE');

        const state = this.players[player.sessionId];
        if (!state) {
            return;
        }

        this.persistProfile(state);
        this.battles.delete(player.sessionId);

        this.broadcast('PLAYER_LEFT', {
            sessionId: player.sessionId,
            map: state.map
        });

        delete this.players[player.sessionId];
    }

    onDispose() {
        console.log('ON DISPOSE');
        Object.values(this.players).forEach((playerState) => this.persistProfile(playerState));
    }

    startEncounter(player, data) {
        const state = this.players[player.sessionId];
        if (!state) return;

        if (this.battles.has(player.sessionId)) {
            player.send('ACTION_REJECTED', { reason: 'Encounter already active.' });
            return;
        }

        const encounterId = typeof data.encounterId === 'string' && data.encounterId.trim()
            ? data.encounterId.trim()
            : `wild-${Date.now()}`;

        const wildMonster = {
            monsterId: data.monsterId || 'wild-slime',
            level: clamp(Number(data.level) || 3, 1, 100),
            hp: clamp(Number(data.hp) || 24, 1, 999),
            maxHp: clamp(Number(data.maxHp) || Number(data.hp) || 24, 1, 999),
            status: 'normal'
        };

        this.battles.set(player.sessionId, {
            encounterId,
            wildMonster
        });

        state.inEncounter = true;

        player.send('ENCOUNTER_STARTED', {
            encounterId,
            wildMonster: clone(wildMonster),
            party: clone(state.party),
            activeMonsterIndex: state.activeMonsterIndex
        });

        this.broadcastPublicDelta(player, {
            type: 'encounter-started',
            inEncounter: true
        });
    }

    chooseMove(player, data) {
        const state = this.players[player.sessionId];
        const battle = this.battles.get(player.sessionId);

        if (!state || !battle) {
            player.send('ACTION_REJECTED', { reason: 'No active encounter.' });
            return;
        }

        const activeMonster = state.party[state.activeMonsterIndex];
        if (!activeMonster || activeMonster.hp <= 0) {
            player.send('ACTION_REJECTED', { reason: 'Active monster cannot battle.' });
            return;
        }

        const move = activeMonster.moves.find((entry) => entry.moveId === data.moveId);
        if (!move) {
            player.send('ACTION_REJECTED', { reason: 'Move is not available.' });
            return;
        }

        const damage = clamp(Number(move.power) || 5, 1, 50);
        battle.wildMonster.hp = clamp(battle.wildMonster.hp - damage, 0, battle.wildMonster.maxHp);

        player.send('BATTLE_UPDATE', {
            type: 'move',
            moveId: move.moveId,
            damage,
            wildMonster: clone(battle.wildMonster)
        });

        if (battle.wildMonster.hp === 0) {
            this.finishEncounter(player, battle.encounterId, true);
        }
    }

    switchMonster(player, data) {
        const state = this.players[player.sessionId];
        const battle = this.battles.get(player.sessionId);
        if (!state || !battle) {
            player.send('ACTION_REJECTED', { reason: 'No active encounter to switch in.' });
            return;
        }

        const monsterIndex = Number(data.monsterIndex);
        if (!Number.isInteger(monsterIndex) || monsterIndex < 0 || monsterIndex >= state.party.length) {
            player.send('ACTION_REJECTED', { reason: 'Invalid party index.' });
            return;
        }

        if (state.party[monsterIndex].hp <= 0) {
            player.send('ACTION_REJECTED', { reason: 'Cannot switch to a fainted monster.' });
            return;
        }

        state.activeMonsterIndex = monsterIndex;
        player.send('BATTLE_UPDATE', {
            type: 'switch',
            activeMonsterIndex: state.activeMonsterIndex,
            activeMonster: clone(state.party[state.activeMonsterIndex])
        });
    }

    useItem(player, data) {
        const state = this.players[player.sessionId];
        const battle = this.battles.get(player.sessionId);
        if (!state || !battle) {
            player.send('ACTION_REJECTED', { reason: 'No active encounter for item use.' });
            return;
        }

        const itemId = typeof data.itemId === 'string' ? data.itemId : '';
        const targetIndex = Number.isInteger(data.monsterIndex) ? data.monsterIndex : state.activeMonsterIndex;

        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= state.party.length) {
            player.send('ACTION_REJECTED', { reason: 'Invalid item target.' });
            return;
        }

        if (!state.inventory.healingItems[itemId] || state.inventory.healingItems[itemId] <= 0) {
            player.send('ACTION_REJECTED', { reason: 'Healing item unavailable.' });
            return;
        }

        const monster = state.party[targetIndex];
        const healedAmount = 20;
        const beforeHp = monster.hp;
        monster.hp = clamp(monster.hp + healedAmount, 0, monster.maxHp);

        state.inventory.healingItems[itemId] -= 1;

        player.send('BATTLE_UPDATE', {
            type: 'item-used',
            itemId,
            monsterIndex: targetIndex,
            recovered: monster.hp - beforeHp,
            monster: clone(monster),
            inventory: clone(state.inventory)
        });
    }

    runFromEncounter(player) {
        const battle = this.battles.get(player.sessionId);
        if (!battle) {
            player.send('ACTION_REJECTED', { reason: 'No encounter to run from.' });
            return;
        }

        this.finishEncounter(player, battle.encounterId, false, 'ran');
    }

    captureAttempt(player, data) {
        const state = this.players[player.sessionId];
        const battle = this.battles.get(player.sessionId);
        if (!state || !battle) {
            player.send('ACTION_REJECTED', { reason: 'No active encounter to capture from.' });
            return;
        }

        const itemId = typeof data.itemId === 'string' ? data.itemId : 'basic_ball';
        if (!state.inventory.captureItems[itemId] || state.inventory.captureItems[itemId] <= 0) {
            player.send('ACTION_REJECTED', { reason: 'Capture item unavailable.' });
            return;
        }

        state.inventory.captureItems[itemId] -= 1;

        const hpRatio = battle.wildMonster.hp / battle.wildMonster.maxHp;
        const captureSucceeded = Math.random() > hpRatio;

        if (captureSucceeded) {
            state.party.push({
                monsterId: battle.wildMonster.monsterId,
                level: battle.wildMonster.level,
                hp: battle.wildMonster.maxHp,
                maxHp: battle.wildMonster.maxHp,
                status: 'normal',
                moves: [{ moveId: 'tackle', power: 10 }]
            });

            this.finishEncounter(player, battle.encounterId, true, 'captured');
        } else {
            player.send('BATTLE_UPDATE', {
                type: 'capture-failed',
                itemId,
                wildMonster: clone(battle.wildMonster),
                inventory: clone(state.inventory)
            });
        }
    }

    finishEncounter(player, encounterId, won, outcome = 'defeated') {
        const state = this.players[player.sessionId];
        if (!state) return;

        state.inEncounter = false;

        if (won) {
            state.progress.defeatedEncounters = Array.from(
                new Set([...state.progress.defeatedEncounters, encounterId])
            );
        }

        this.battles.delete(player.sessionId);

        player.send('ENCOUNTER_FINISHED', {
            encounterId,
            won,
            outcome,
            profile: this.getPrivateState(state)
        });

        this.broadcastPublicDelta(player, {
            type: 'encounter-finished',
            inEncounter: false
        });
    }

    resolveProfileId(player, options) {
        if (options && typeof options.profileId === 'string' && options.profileId.trim()) {
            return options.profileId.trim();
        }

        if (options && typeof options.username === 'string' && options.username.trim()) {
            return options.username.trim();
        }

        return player.sessionId;
    }

    restoreProfile(profileId, sessionId) {
        const saved = this.profiles[profileId];
        const profile = saved ? clone(saved) : getDefaultProfile(sessionId, profileId);

        profile.profileId = profileId;
        profile.sessionId = sessionId;
        profile.party = Array.isArray(profile.party) && profile.party.length ? profile.party : getDefaultParty();
        profile.inventory = profile.inventory || getDefaultInventory();
        profile.inventory.captureItems = profile.inventory.captureItems || {};
        profile.inventory.healingItems = profile.inventory.healingItems || {};
        profile.progress = profile.progress || getDefaultProgress();
        profile.progress.defeatedEncounters = Array.isArray(profile.progress.defeatedEncounters)
            ? profile.progress.defeatedEncounters
            : [];
        profile.progress.mapCheckpoints = Array.isArray(profile.progress.mapCheckpoints)
            ? profile.progress.mapCheckpoints
            : [];
        profile.activeMonsterIndex = clamp(Number(profile.activeMonsterIndex) || 0, 0, profile.party.length - 1);
        profile.inEncounter = false;

        return profile;
    }

    persistProfile(profile) {
        this.profiles[profile.profileId] = {
            profileId: profile.profileId,
            map: profile.map,
            x: profile.x,
            y: profile.y,
            party: clone(profile.party),
            inventory: clone(profile.inventory),
            progress: clone(profile.progress),
            activeMonsterIndex: profile.activeMonsterIndex
        };

        this.saveProfiles();
    }

    loadProfiles() {
        try {
            if (!fs.existsSync(PROFILE_STORE_PATH)) {
                return {};
            }

            const raw = fs.readFileSync(PROFILE_STORE_PATH, 'utf8');
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.error('Failed to load player profiles:', error);
            return {};
        }
    }

    saveProfiles() {
        try {
            fs.mkdirSync(path.dirname(PROFILE_STORE_PATH), { recursive: true });
            fs.writeFileSync(PROFILE_STORE_PATH, JSON.stringify(this.profiles, null, 2));
        } catch (error) {
            console.error('Failed to persist player profiles:', error);
        }
    }

    getPublicPlayersSnapshot() {
        return Object.values(this.players).map((profile) => this.getPublicState(profile));
    }

    getPublicState(profile) {
        return {
            sessionId: profile.sessionId,
            map: profile.map,
            x: profile.x,
            y: profile.y,
            inEncounter: Boolean(profile.inEncounter),
            activeMonsterLevel: profile.party[profile.activeMonsterIndex]?.level || 1,
            checkpointCount: profile.progress.mapCheckpoints.length
        };
    }

    getPrivateState(profile) {
        return {
            profileId: profile.profileId,
            map: profile.map,
            x: profile.x,
            y: profile.y,
            party: clone(profile.party),
            inventory: clone(profile.inventory),
            progress: clone(profile.progress),
            activeMonsterIndex: profile.activeMonsterIndex,
            inEncounter: profile.inEncounter
        };
    }

    broadcastPublicDelta(player, delta) {
        this.broadcast('PLAYER_STATE_DELTA', {
            sessionId: player.sessionId,
            delta
        }, { except: player });
    }
};
