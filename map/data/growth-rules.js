var GrowthRules = module.exports = {
    magic: {
        id: 'magic',
        stateMap: {
            0: [0.001, 0.2, 0.1, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // mostly used with ruts?
    magicCrazy: {
        id: 'magicCrazy',
        stateMap: {
            0: [0.5, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },
    absoluteActivation: {
        id: 'absoluteActivation',
        stateMap: {
            0: [0, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1],
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    trees: {
        id: 'trees',
        stateMap: {
            0: [0, 0, 0, 0, 0.4, 0.4, 0.6, 0.6, 1, 1, 1, 1],
            1: [0.6, 0.7, 0.8, 0.9, 1,   1,   1,   1,   1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    // When trees are old enough, they become stable - less likely to grow, slightly likely to die
    treesStable: {
        id: 'treesStable',
        stateMap: {
            0: [  0,   0,   0, 0,   0, 0.1, 0.1, 1, 1, 1, 1,    1],
            1: [0.8, 0.9, 0.9, 1,   1,   1,   1, 1, 1, 1, 1, 0.95]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plants: {
        id: 'plants',
        stateMap: {
            0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plantsCatalyzed: {
        id: 'plantsCatalyzed',
        stateMap: {
            0: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },
    plantsDying: {
        id: 'plantsDying',
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 1, 1, 1, 1]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },
    completeDeath: {
        id: 'completeDeath',
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }
}
