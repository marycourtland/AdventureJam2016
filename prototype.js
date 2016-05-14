var Map = require('./map');

var game = {};
game.size = {x:50, y:50}; // cells
game.cellDims = {x:10, y:10}; // pixels

function initGame() {
    boardElement = document.getElementById('game');

    Map.init(game.size, game.cellDims, boardElement);
}

window.onload = initGame;
