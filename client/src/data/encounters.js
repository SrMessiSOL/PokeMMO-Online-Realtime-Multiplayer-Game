import TUXEMON_MONSTERS from "./tuxemon/monsters.json";

const MAP_ENCOUNTER_TIERS = {
    town: { encounterRate: 0.08, minLevel: 2, maxLevel: 4, rarityShift: 0 },
    route1: { encounterRate: 0.16, minLevel: 3, maxLevel: 6, rarityShift: 6 },
    ashveld: { encounterRate: 0.18, minLevel: 5, maxLevel: 8, rarityShift: 12 },
    route2: { encounterRate: 0.2, minLevel: 7, maxLevel: 10, rarityShift: 18 },
    crysthaven: { encounterRate: 0.2, minLevel: 9, maxLevel: 13, rarityShift: 24 },
    pokemon_center_town: { encounterRate: 0, minLevel: 1, maxLevel: 1, rarityShift: 0 },
    pokemon_center_ashveld: { encounterRate: 0, minLevel: 1, maxLevel: 1, rarityShift: 0 },
    pokemon_center_crysthaven: { encounterRate: 0, minLevel: 1, maxLevel: 1, rarityShift: 0 }
};

const MONSTER_IDS = (Array.isArray(TUXEMON_MONSTERS) ? TUXEMON_MONSTERS : [])
    .map((entry) => Number(entry.id))
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);

function buildPool({ minLevel, maxLevel, rarityShift }) {
    if (!MONSTER_IDS.length) {
        return [];
    }

    const offset = Math.max(0, rarityShift % MONSTER_IDS.length);
    const rotated = [...MONSTER_IDS.slice(offset), ...MONSTER_IDS.slice(0, offset)];
    const selected = rotated.slice(0, 6);

    return selected.map((pokemonId, index) => ({
        pokemonId,
        minLevel,
        maxLevel,
        weight: Math.max(5, 40 - (index * 6))
    }));
}

export const ROUTE_ENCOUNTERS = Object.entries(MAP_ENCOUNTER_TIERS).reduce((acc, [mapId, config]) => {
    acc[mapId] = {
        encounterRate: config.encounterRate,
        pokemonPool: buildPool(config)
    };
    return acc;
}, {});
