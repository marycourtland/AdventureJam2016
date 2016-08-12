var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [];

// TESTING ONLY
speciesData.push({
    id: 'blue',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'red',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'green',
    symbol: '~',
    color: '#5F4F29',
});

// REAL SPECIES
speciesData.push({
    id: 'blank',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'neutralized',
    symbol: 'x',
    color: '#422121',
});

speciesData.push({
    id: 'magic',
    symbol: '&#8960;',
    color: '#4C24A3',
    forceNeighborIteration: true,
    rules: {
        default: GrowthRules.magic,
        ruts: [
            {
                rut_id: 'magic',
                timeToIteration: 100,
                forceNeighborIteration: true,
                rules: GrowthRules.absoluteActivation
            }
        ]
    }
});

speciesData.push({
    id: 'grass',
    symbol: '&#8756;',
    color: '#46CF46', 
    rules: {
        default: GrowthRules.plants,
        conditional: [
            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ],
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ]
    }
});

speciesData.push({
    id: 'flowers',
    symbol: '&#9880;',
    color: '#E46511',
    rules: {
        default: GrowthRules.plants,
        conditional: [
            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ],
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ]
    }
});

speciesData.push({
    id: 'trees',
    symbol: '&psi;',
    color: '#174925',
    speed: 200,
    passable: true,
    rules: {
        default: GrowthRules.plants,
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ],
        conditional: [
            // the presence of grass catalyzes tree growth
            {
                species_id: 'grass',
                min_neighbors: 4,
                rules: GrowthRules.plantsCatalyzed
            },

            // tree growth stabilizes when the trees are old
            {
                species_id: 'trees',
                min_age: 3,
                rules: GrowthRules.plantsStable
            },

            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ]
    }
});

// Pine trees - SAME RULES ETC AS THE OTHER TREES
// Just separated out for some interest/variety
speciesData.push({
    id: 'trees2',
    symbol: '&psi;',
    color: '#174925',
    speed: 200,
    passable: true,
    rules: {
        default: GrowthRules.plants,
        conditionalnope: [
            // the presence of grass catalyzes tree growth
            {
                species_id: 'grass',
                min_neighbors: 4,
                rules: GrowthRules.plantsCatalyzed
            },

            // tree growth stabilizes when the trees are old
            {
                species_id: 'trees2',
                min_age: 3,
                rules: GrowthRules.plantsStable
            },

            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ]
    }
});


