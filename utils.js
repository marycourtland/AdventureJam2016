module.exports = Utils = {};

Utils.dirs = { 
    'n': {x: 0, y: -1},
    's': {x: 0, y: 1},
    'w': {x: -1, y:0},
    'e': {x: 1, y:0}
}

Utils.randomChoice = function(array) {
    if (typeof array === 'object') array = Object.keys(array);
    return array[Math.floor(Math.random() * array.length)];
}
