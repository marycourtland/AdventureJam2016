var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [
    // TESTING ONLY
    {
        id: 'blue',
        symbol: '~',
        color: '#5F4F29',
        sprite: {id: 'blue'}
    },
    {
        id: 'red',
        symbol: '~',
        color: '#5F4F29',
        sprite: {id: 'red'}
    },
    {
        id: 'green',
        symbol: '~',
        color: '#5F4F29',
        sprite: {id: 'green'}
    },

    // REAL SPECIES
    {
        id: 'blank',
        symbol: '~',
        color: '#5F4F29',
        sprite: {id: 'dirt'}
    },
    {
        id: 'neutralized',
        symbol: 'x',
        color: '#422121',
        sprite: {
            id: ['neutralizer1', 'neutralizer2', 'neutralizer3'],
            fade: true
        }
    },

    {
        id: 'magic',
        symbol: '&#8960;',
        color: '#4C24A3',
        sprite: {
            id: 'magic',
            fade: true
        },
        rules: {
            default: GrowthRules.magic,
            ruts: [
                {
                    rut_id: 'magic',
                    rules: GrowthRules.magicCrazy
                }
            ]
        }
    },

    {
        id: 'grass',
        symbol: '&#8756;',
        color: '#46CF46', 
        sprite: {id: 'grass'},
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
    },

    {
        id: 'flowers',
        symbol: '&#9880;',
        color: '#E46511',
        sprite: {
            id: 'flower',
            fade: true
        },
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
    },

    {
        id: 'trees',
        symbol: '&psi;',
        color: '#174925',
        sprite: {
            id: ['tree1', 'tree8', 'tree11', 'tree13'],
            fade: true
        },
        speed: 200,
        passable: false,
        rules: {
            default: GrowthRules.plants,
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
    },

    // Pine trees - SAME RULES ETC AS THE OTHER TREES
    // Just separated out for some interest/variety
    {
        id: 'trees2',
        symbol: '&psi;',
        color: '#174925',
        sprite: {
            id: ['tree2'],
            fade: true
        },
        speed: 200,
        passable: false,
        rules: {
            default: GrowthRules.plants,
            conditional: [
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
    },

]
