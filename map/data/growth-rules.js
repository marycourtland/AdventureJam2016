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
        ],
        description: "spreads irregularily"
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
        ],
        description: "spreads rapidly"
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
        ],
        description: "spreads rapidly"
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
        ],
        description: "grows steadily"
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
        ],
        description: "stabilizes its growth"
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
        ],
        description: "grows steadily"
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
        ],
        description: "grows rapidly"
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
        ],
        description: "dies off"
    },
    completeDeath: {
        id: 'completeDeath',
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        description: "is eradicated"
    }
}
