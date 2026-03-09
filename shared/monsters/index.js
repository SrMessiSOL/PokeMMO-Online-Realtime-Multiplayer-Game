const { SPECIES } = require('./species');
const { MOVES } = require('./moves');
const { ENCOUNTER_TABLES } = require('./encounters');
const formulas = require('./formulas');

function getLearnedMoves(speciesId, level) {
  const species = SPECIES[speciesId];
  if (!species) {
    return [];
  }

  return Object.keys(species.learnset)
    .map((learnLevel) => Number(learnLevel))
    .filter((learnLevel) => learnLevel <= level)
    .sort((a, b) => a - b)
    .flatMap((learnLevel) => species.learnset[learnLevel])
    .slice(-4);
}

function pickEncounter(mapId, zoneId, rng) {
  const table = ENCOUNTER_TABLES[mapId] && ENCOUNTER_TABLES[mapId][zoneId];
  if (!table || table.length === 0) {
    return null;
  }

  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;

  for (let i = 0; i < table.length; i += 1) {
    const entry = table[i];
    roll -= entry.weight;
    if (roll <= 0 || i === table.length - 1) {
      const levelRange = entry.maxLevel - entry.minLevel + 1;
      const level = entry.minLevel + Math.floor(rng() * levelRange);
      return { speciesId: entry.speciesId, level };
    }
  }

  return null;
}

module.exports = {
  SPECIES,
  MOVES,
  ENCOUNTER_TABLES,
  getLearnedMoves,
  pickEncounter,
  ...formulas
};
