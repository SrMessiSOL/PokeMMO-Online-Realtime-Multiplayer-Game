const SPECIES = {
  floxling: {
    id: 'floxling',
    name: 'Floxling',
    types: ['wood'],
    baseStats: {
      hp: 45,
      attack: 52,
      defense: 43,
      specialAttack: 50,
      specialDefense: 45,
      speed: 47
    },
    learnset: {
      1: ['nibble'],
      4: ['leaf_slice']
    },
    spriteKeys: {
      front: 'floxling_front',
      back: 'floxling_back',
      icon: 'floxling_icon'
    },
    catchRate: 190,
    baseXpYield: 62
  },
  cardinale: {
    id: 'cardinale',
    name: 'Cardinale',
    types: ['air'],
    baseStats: {
      hp: 42,
      attack: 48,
      defense: 39,
      specialAttack: 52,
      specialDefense: 41,
      speed: 61
    },
    learnset: {
      1: ['peck'],
      5: ['static_pulse']
    },
    spriteKeys: {
      front: 'cardinale_front',
      back: 'cardinale_back',
      icon: 'cardinale_icon'
    },
    catchRate: 170,
    baseXpYield: 64
  },
  metesaur: {
    id: 'metesaur',
    name: 'Metesaur',
    types: ['earth', 'water'],
    baseStats: {
      hp: 50,
      attack: 49,
      defense: 52,
      specialAttack: 44,
      specialDefense: 50,
      speed: 35
    },
    learnset: {
      1: ['nibble'],
      4: ['bubble_burst']
    },
    spriteKeys: {
      front: 'metesaur_front',
      back: 'metesaur_back',
      icon: 'metesaur_icon'
    },
    catchRate: 180,
    baseXpYield: 66
  }
};

module.exports = { SPECIES };
