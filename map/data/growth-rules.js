module.exports = GrowthRules = {
    magic: {
        stateMap: {
            0: [0.001, 0.1, 0, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // When plants are old enough, they become stable - less likely to grow, slightly likely to die
    plantsStable: {
        stateMap: {
            0: [  0,   0,   0, 0,   0, 0.1, 0.1, 1, 1, 1, 1,    1],
            1: [0.9, 0.9, 0.8, 1,   1,   1,   1, 1, 1, 1, 1, 0.95]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plants: {
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
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }
}
