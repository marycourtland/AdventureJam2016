// EXAMPLE:
//
// var ruleset = new RuleSet({
//  stateMap: {
//      0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
//      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9] // the 0.9 means it's a 90% chance of getting a 1.
//  },
//  weights: [
//      [1, 2, 1],
//      [2, 0, 2],
//      [1, 2, 1]
//   ]
//  })
//
//  ruleset.transform(0, [[1,1,1],[0,0,0],[0,0,0]]) => 1


module.exports = RuleSet = function(ruleParams) {
    ruleParams = ruleParams || {};

    this.stateMap = ruleParams.stateMap || {};

    // TODO: this should really be a coordmap...
    this.weights = indexWeights(ruleParams.weights || [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ]);
}

RuleSet.prototype = {};

RuleSet.prototype.transform = function(state, neighbors) {
    // If we try to transform anything unknown, things will just stay constant.
    if (!(state in this.stateMap)) { return state; }

    var sum = deepWeightedSum(neighbors, this.weights);

    if (sum >= this.stateMap[state].length) { return state; }

    return this.probabilisticState(this.stateMap[state][sum]);
}

// Input 0.3 for a 30% chance at getting a 1 (versus a 0)
RuleSet.prototype.probabilisticState = function(state) {
   if (state === 0 || state === 1) return state;
   return Math.random() < state ? 1 : 0;
}

// neighbors should be a coord-map, like:
// [{coords:{x:0,y:0}, value:'whatever}, {coords:{x:1,y:1}, value:'whatever'}, ... ]
function deepWeightedSum(neighbors, weights) {
    var sum = 0;

    neighbors.forEach(function(neighbor) {
        var coords = neighbor.coords;
        sum += neighbor.value * weights[coords.x][coords.y];
    })

    return sum;
}


// This is janky.
// Turns a nested array into a fake nested array, so that you can
// access things like weights[-1][-1]
function indexWeights(deepArray) {
    console.assert(deepArray.length === 3); // sanity check
    console.assert(deepArray[0].length === 3);

    // ugh, ugh, ugh. Fake array.
    var range = [-1, 0, 1];
    var output = {};
    range.forEach(function(i) {
        output[i] = {};
        range.forEach(function(j) {
            output[i][j] = deepArray[i+1][j+1];
        })
    })

    return output;
}
