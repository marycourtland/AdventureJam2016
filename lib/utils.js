window.Utils = {};

Utils.dirs = { 
    'n': {x: 0, y: -1},
    's': {x: 0, y: 1},
    'w': {x: -1, y:0},
    'e': {x: 1, y:0}
}

Utils.randomChoice = function(array) {
    if (!Utils.isArray(array) && typeof array === 'object') array = Object.keys(array);
    return array[Math.floor(Math.random() * array.length)];
}

Utils.isArray = function(array) {
    return array.constructor === [].constructor;
}

Utils.distance = function(coords1, coords2) {
    return Math.sqrt(
        Math.pow(coords1.x - coords2.x, 2) +
        Math.pow(coords1.y - coords2.y, 2)
    )
}
