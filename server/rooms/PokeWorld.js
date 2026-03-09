const colyseus = require('colyseus');
const {
  SPECIES,
  MOVES,
  getLearnedMoves,
  pickEncounter,
  createDeterministicRng,
  calculateMonsterStats,
  calculateDamage,
  calculateCaptureChance,
  calculateXpGain,
  xpForLevel
} = require('../../shared/monsters');

const players = {};
const battleStates = {};

function buildMonster(speciesId, level) {
  const species = SPECIES[speciesId];
  const stats = calculateMonsterStats(species, level);

  return {
    speciesId,
    level,
    stats,
    hp: stats.hp,
    moves: getLearnedMoves(speciesId, level),
    xp: xpForLevel(level)
  };
}

function sendBattleState(player) {
  const battle = battleStates[player.sessionId];
  if (!battle) {
    return;
  }

  player.send('BATTLE_UPDATE', {
    playerMonster: battle.playerMonster,
    wildMonster: battle.wildMonster,
    battleLog: battle.battleLog,
    availableMoves: battle.playerMonster.moves.map((moveId) => MOVES[moveId])
  });
}

exports.PokeWorld = class extends colyseus.Room {
  onCreate() {
    this.onMessage('PLAYER_MOVED', (player, data) => {
      players[player.sessionId].x = data.x;
      players[player.sessionId].y = data.y;

      this.broadcast('PLAYER_MOVED', {
        ...players[player.sessionId],
        position: data.position
      }, { except: player });
    });

    this.onMessage('PLAYER_MOVEMENT_ENDED', (player, data) => {
      this.broadcast('PLAYER_MOVEMENT_ENDED', {
        sessionId: player.sessionId,
        map: players[player.sessionId].map,
        position: data.position
      }, { except: player });
    });

    this.onMessage('PLAYER_CHANGED_MAP', (player, data) => {
      players[player.sessionId].map = data.map;

      player.send('CURRENT_PLAYERS', { players });

      this.broadcast('PLAYER_CHANGED_MAP', {
        sessionId: player.sessionId,
        map: players[player.sessionId].map,
        x: 300,
        y: 75,
        players
      });
    });

    this.onMessage('REQUEST_ENCOUNTER', (player, data) => {
      const rng = createDeterministicRng(`${player.sessionId}:${data.map}:${data.zone}:${data.seed}`);
      const encounter = pickEncounter(data.map, data.zone, rng);

      if (!encounter) {
        player.send('BATTLE_ERROR', { message: 'No encounter table found for this zone.' });
        return;
      }

      battleStates[player.sessionId] = {
        map: data.map,
        zone: data.zone,
        turn: 1,
        rng,
        playerMonster: players[player.sessionId].party[0],
        wildMonster: buildMonster(encounter.speciesId, encounter.level),
        battleLog: [`A wild ${SPECIES[encounter.speciesId].name} appeared!`]
      };

      player.send('ENCOUNTER_STARTED', {
        map: data.map,
        zone: data.zone,
        species: SPECIES[encounter.speciesId],
        wildMonster: battleStates[player.sessionId].wildMonster,
        playerMonster: battleStates[player.sessionId].playerMonster
      });
      sendBattleState(player);
    });

    this.onMessage('BATTLE_ACTION', (player, data) => {
      const battle = battleStates[player.sessionId];
      if (!battle) {
        player.send('BATTLE_ERROR', { message: 'No active battle for player.' });
        return;
      }

      if (data.action === 'capture') {
        const isCaptured = calculateCaptureChance({
          maxHp: battle.wildMonster.stats.hp,
          currentHp: battle.wildMonster.hp,
          catchRate: SPECIES[battle.wildMonster.speciesId].catchRate,
          rngValue: battle.rng()
        });

        battle.battleLog = [
          `${SPECIES[battle.playerMonster.speciesId].name} threw a capsule...`,
          isCaptured ? `${SPECIES[battle.wildMonster.speciesId].name} was captured!` : `${SPECIES[battle.wildMonster.speciesId].name} broke free!`
        ];

        if (isCaptured) {
          player.send('BATTLE_ENDED', {
            result: 'captured',
            capturedSpeciesId: battle.wildMonster.speciesId
          });
          delete battleStates[player.sessionId];
          return;
        }
      } else if (data.action === 'move') {
        const move = MOVES[data.moveId];
        if (!move || !battle.playerMonster.moves.includes(data.moveId)) {
          player.send('BATTLE_ERROR', { message: 'Invalid move.' });
          return;
        }

        const hitRoll = battle.rng() * 100;
        if (hitRoll <= move.accuracy) {
          const damage = calculateDamage({
            attacker: battle.playerMonster,
            defender: battle.wildMonster,
            move,
            rngValue: battle.rng()
          });

          battle.wildMonster.hp = Math.max(0, battle.wildMonster.hp - damage);
          battle.battleLog = [`${SPECIES[battle.playerMonster.speciesId].name} used ${move.name} for ${damage} damage.`];
        } else {
          battle.battleLog = [`${SPECIES[battle.playerMonster.speciesId].name}'s ${move.name} missed!`];
        }

        if (battle.wildMonster.hp <= 0) {
          const wildSpecies = SPECIES[battle.wildMonster.speciesId];
          const xpGain = calculateXpGain(wildSpecies.baseXpYield, battle.wildMonster.level);
          battle.playerMonster.xp += xpGain;
          battle.battleLog.push(`${wildSpecies.name} fainted. ${SPECIES[battle.playerMonster.speciesId].name} gained ${xpGain} XP.`);
          player.send('BATTLE_ENDED', { result: 'won', xpGain });
          delete battleStates[player.sessionId];
          return;
        }
      }

      const wildMoveId = battle.wildMonster.moves[0];
      const wildMove = MOVES[wildMoveId];
      const wildHitRoll = battle.rng() * 100;

      if (wildHitRoll <= wildMove.accuracy) {
        const wildDamage = calculateDamage({
          attacker: battle.wildMonster,
          defender: battle.playerMonster,
          move: wildMove,
          rngValue: battle.rng()
        });
        battle.playerMonster.hp = Math.max(0, battle.playerMonster.hp - wildDamage);
        battle.battleLog.push(`Wild ${SPECIES[battle.wildMonster.speciesId].name} used ${wildMove.name} for ${wildDamage} damage.`);
      } else {
        battle.battleLog.push(`Wild ${SPECIES[battle.wildMonster.speciesId].name}'s ${wildMove.name} missed!`);
      }

      if (battle.playerMonster.hp <= 0) {
        player.send('BATTLE_ENDED', { result: 'lost' });
        battle.playerMonster.hp = battle.playerMonster.stats.hp;
        delete battleStates[player.sessionId];
        return;
      }

      sendBattleState(player);
    });
  }

  onJoin(player) {
    players[player.sessionId] = {
      sessionId: player.sessionId,
      map: 'town',
      x: 352,
      y: 1216,
      party: [buildMonster('floxling', 5)]
    };

    setTimeout(() => player.send('CURRENT_PLAYERS', { players }), 500);
    this.broadcast('PLAYER_JOINED', { ...players[player.sessionId] }, { except: player });
  }

  onLeave(player) {
    this.broadcast('PLAYER_LEFT', { sessionId: player.sessionId, map: players[player.sessionId].map });
    delete battleStates[player.sessionId];
    delete players[player.sessionId];
  }
};
