var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [
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
        sprite: {id: 'neutralized'}
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
            default: GrowthRules.magic
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
            ]
        }
    },

    {
        id: 'trees',
        symbol: '&psi;',
        color: '#174925',
        sprite: {
            id: ['tree1', 'tree2', 'tree8', 'tree11', 'tree13'],
            fade: true
        },
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

]
