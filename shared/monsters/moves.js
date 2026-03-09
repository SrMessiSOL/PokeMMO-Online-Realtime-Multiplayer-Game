const MOVES = {
  nibble: {
    id: 'nibble',
    name: 'Nibble',
    type: 'earth',
    power: 40,
    accuracy: 100,
    pp: 35,
    category: 'physical',
    effects: []
  },
  leaf_slice: {
    id: 'leaf_slice',
    name: 'Leaf Slice',
    type: 'wood',
    power: 45,
    accuracy: 100,
    pp: 25,
    category: 'physical',
    effects: ['high_crit']
  },
  bubble_burst: {
    id: 'bubble_burst',
    name: 'Bubble Burst',
    type: 'water',
    power: 40,
    accuracy: 100,
    pp: 30,
    category: 'special',
    effects: ['speed_down_10']
  },
  peck: {
    id: 'peck',
    name: 'Peck',
    type: 'air',
    power: 35,
    accuracy: 100,
    pp: 35,
    category: 'physical',
    effects: []
  },
  static_pulse: {
    id: 'static_pulse',
    name: 'Static Pulse',
    type: 'electric',
    power: 50,
    accuracy: 95,
    pp: 20,
    category: 'special',
    effects: ['paralyze_20']
  }
};

module.exports = { MOVES };
