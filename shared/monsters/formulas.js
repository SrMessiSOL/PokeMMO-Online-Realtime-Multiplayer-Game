function normalizeSeed(seed) {
  if (typeof seed === 'number') {
    return seed >>> 0;
  }

  const seedString = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < seedString.length; i += 1) {
    hash ^= seedString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRng(seed) {
  let state = normalizeSeed(seed) || 0x6d2b79f5;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function calculateStat(base, level, isHp) {
  if (isHp) {
    return Math.floor((2 * base * level) / 100) + level + 10;
  }

  return Math.floor((2 * base * level) / 100) + 5;
}

function calculateMonsterStats(species, level) {
  return {
    hp: calculateStat(species.baseStats.hp, level, true),
    attack: calculateStat(species.baseStats.attack, level, false),
    defense: calculateStat(species.baseStats.defense, level, false),
    specialAttack: calculateStat(species.baseStats.specialAttack, level, false),
    specialDefense: calculateStat(species.baseStats.specialDefense, level, false),
    speed: calculateStat(species.baseStats.speed, level, false)
  };
}

function xpForLevel(level) {
  return level ** 3;
}

function calculateXpGain(baseXpYield, defeatedLevel) {
  return Math.max(1, Math.floor((baseXpYield * defeatedLevel) / 7));
}

function calculateCaptureChance({
  maxHp,
  currentHp,
  catchRate,
  ballBonus = 1,
  statusBonus = 1,
  rngValue
}) {
  const cappedCurrentHp = Math.max(1, currentHp);
  const hpFactor = ((3 * maxHp) - (2 * cappedCurrentHp)) / (3 * maxHp);
  const chance = Math.min(0.95, hpFactor * (catchRate / 255) * ballBonus * statusBonus);

  return rngValue < chance;
}

function calculateDamage({ attacker, defender, move, rngValue }) {
  const attackStat = move.category === 'special' ? attacker.specialAttack : attacker.attack;
  const defenseStat = move.category === 'special' ? defender.specialDefense : defender.defense;
  const baseDamage = (((2 * attacker.level) / 5 + 2) * move.power * (attackStat / Math.max(1, defenseStat))) / 50 + 2;
  const randomModifier = 0.85 + (0.15 * rngValue);

  return Math.max(1, Math.floor(baseDamage * randomModifier));
}

module.exports = {
  createDeterministicRng,
  calculateMonsterStats,
  xpForLevel,
  calculateXpGain,
  calculateCaptureChance,
  calculateDamage
};
