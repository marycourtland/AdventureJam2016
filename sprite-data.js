module.exports = SpriteData = {};

SpriteData.character = {
    name: 'character',
    url: 'images/character.png',
    frame_size: {x: 80,  y:180},
    frame_origin: {x: 40, y:90},

    frames: {
        'up':    {x: 0, y:0},
        'down':  {x: 1, y:0},
        'left':  {x: 2, y:0},
        'right': {x: 3, y:0},
    }
}
