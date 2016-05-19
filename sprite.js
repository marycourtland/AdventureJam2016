// warning, messy code

module.exports = Sprite = function(data) {
    this.data = data;
    this.scale = 1;

    // determine total image size
    this.size = {x:0, y:0};
    for (var frame in this.data.frames) {
        var f = this.data.frames[frame];
        this.size.x = Math.max(this.size.x, f.x);
        this.size.y = Math.max(this.size.y, f.y);
    }
    this.size.x += 1;
    this.size.y += 1;
    this.size.x *= this.data.frame_size.x;
    this.size.y *= this.data.frame_size.y;

    // position of sprite in the game
    this.position = {x:0, y:0}

    this.init();
}

Sprite.prototype = {};

Sprite.prototype.init = function() {
    this.html = document.createElement('div');
    this.html.setAttribute('id', 'sprite-' + this.data.name);
    this.html.setAttribute('class', 'sprite');
    this.html.style.backgroundImage = 'url("' + this.data.url + '")';
    this.frame = Object.keys(this.data.frames)[0];
    this.refresh();
    return this;
}


Sprite.prototype.refresh = function() {
    this.refreshScale();
    this.refreshFrame();
    this.refreshPosition();
    return this;
}

Sprite.prototype.refreshScale = function() {
    // size of the background, including all frames
    var bgSize = {
        x: this.size.x * this.scale,
        y: this.size.y * this.scale
    }

    // size of the sprite's html element (width, height)
    var spriteSize = {
        x: this.data.frame_size.x * this.scale,
        y: this.data.frame_size.y * this.scale
    }


    // set html
    this.html.style.backgroundSize = bgSize.x + 'px ' + bgSize.y + 'px';

    this.html.style.width = spriteSize.x + 'px';
    this.html.style.height = spriteSize.y + 'px';
    
    return this;
}

Sprite.prototype.refreshFrame = function() {
    // position of the background (to get the proper frame)
    var bgPos = {
        x: -this.data.frame_size.x * this.data.frames[this.frame].x * this.scale,
        y: -this.data.frame_size.y * this.data.frames[this.frame].y * this.scale
    }

    this.html.style.backgroundPosition = bgPos.x + 'px ' + bgPos.y + 'px';

    return this;
}

Sprite.prototype.refreshPosition = function() {

    // adjust the sprite until its origin is lined up with its position
    var posOffset = {
        x: -this.data.frame_origin.x * this.scale,
        y: -this.data.frame_origin.y * this.scale
    }

    this.html.style.left = (posOffset.x + this.position.x) + 'px';
    this.html.style.top = (posOffset.y + this.position.y) + 'px';

    return this;
}

Sprite.prototype.setFrame = function(frame) {
    console.assert(frame in this.data.frames, 'Sprite sheet does not contain frame "' + frame + '"')
    if (this.frame === frame) return this; // no need to redo stuff
    this.frame = frame;
    this.refreshFrame();
    return this;
}

Sprite.prototype.scaleBy = function(factor) {
    this.scale *= factor;
    this.refreshScale();
    return this;
}

Sprite.prototype.scaleTo = function(size) {
    // scales by size.y, since scale is scalar
    this.scale = size.y / this.data.frame_size.y ;
    this.refreshScale();
    return this;
}

Sprite.prototype.place = function(container) {
    container.appendChild(this.html);
    return this;
}

Sprite.prototype.move = function(change) {
    this.position.x += change.x;
    this.position.y += change.y;
    this.refreshPosition();
    return this;
}

Sprite.prototype.moveTo = function(position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.refreshPosition();
    return this;
}
