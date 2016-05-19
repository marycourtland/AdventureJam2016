module.exports = SpriteData = {};

SpriteData.player = {
    name: 'player',
    url: 'images/player.png',
    frame_size: {x: 80,  y:180},
    frame_origin: {x: 40, y:90},

    frames: {
        'n': {x: 0, y:0},
        's': {x: 1, y:0},
        'w': {x: 2, y:0},
        'e': {x: 3, y:0},
    }
}
