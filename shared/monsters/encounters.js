const ENCOUNTER_TABLES = {
  town: {
    outskirts_grass: [
      { speciesId: 'floxling', minLevel: 2, maxLevel: 4, weight: 50 },
      { speciesId: 'cardinale', minLevel: 2, maxLevel: 5, weight: 30 },
      { speciesId: 'metesaur', minLevel: 3, maxLevel: 4, weight: 20 }
    ]
  },
  route1: {
    tall_grass_north: [
      { speciesId: 'floxling', minLevel: 3, maxLevel: 6, weight: 35 },
      { speciesId: 'cardinale', minLevel: 3, maxLevel: 6, weight: 35 },
      { speciesId: 'metesaur', minLevel: 4, maxLevel: 6, weight: 30 }
    ]
  }
};

module.exports = { ENCOUNTER_TABLES };
