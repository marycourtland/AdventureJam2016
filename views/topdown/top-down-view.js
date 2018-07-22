var TopDownView  = module.exports = function(params) {
    if (!params.html.container) throw new Error('there should be a container for a view')
    this.params = params;
    this.renderers = [];
    this.html = params.html;
    this.size = params.size;
    this.dims = params.dims || {x:1, y:1}
    this.centerCoords = {x:0, y:0};
    this.zoom = 1;
    this.worldLayers = Object.keys(this.html).map((key) => this.html[key]).filter((html) => html.dataset.worldRelative == 'true');
    this.refresh();
}

TopDownView.prototype = {};

TopDownView.prototype.addRenderer = function(renderer) {
    this.renderers.push(renderer);
}

TopDownView.prototype.init = function() {
    window.addEventListener("resize", () => { this.onScreenResize() }, false);

    this.renderers.forEach((renderer) => {
        renderer.init(this, this.params);
    })
}

TopDownView.prototype.hidden = function(newHiddenState) {
    if (typeof newHiddenState == 'undefined') {
        return this.html.container.style.display == 'none';
    }
    else {
        this.html.container.style.display = newHiddenState ? 'none' : '';
    }
}

TopDownView.prototype.resizeLayers = function() {
    var w = this.size.x * this.dims.x + 'px';
    var h  = this.size.y * this.dims.y + 'px';

    this.worldLayers.forEach((html) => {
        html.style.width = w;
        html.style.height = h;

        // The canvas will clear itself when resized, so only do this when necessary
        if (html.tagName.toLowerCase() == 'canvas'
            && (w !== html.getAttribute('width') || h !== html.getAttribute('height'))
        ) {
            html.setAttribute('width', w);
            html.setAttribute('height', h);
        }
    })

    // todo: the static layers should resize to this.viewSize
}

TopDownView.prototype.refresh = function() {
    this.bbox = this.html.container.getBoundingClientRect();
    this.centerPx = {
        x: this.bbox.width / 2,
        y: this.bbox.height / 2
    }

    // in coords
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    }

    this.zoomFactor = 2;

    this.resizeLayers();
}

TopDownView.prototype.render = function() {
    this.renderers.forEach(function(renderer) {
        renderer.render();
    })
}

TopDownView.prototype.rerender = function() {
    this.refresh();
    this.renderers.forEach(function(renderer) {
        renderer.refresh();
    })
}

// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
TopDownView.prototype.getCoordsFromPixels = function(pixels, options) {
    options = options || {};
    if (options.absolute) {
        return {
            x: Math.floor((pixels.x - this.centerPx.x) / this.dims.x),
            y: Math.floor((pixels.y - this.centerPx.y) / this.dims.y)
        }
    }
    else {
        return {
            x: Math.floor((pixels.x) / this.dims.x),
            y: Math.floor((pixels.y) / this.dims.y)
        }
    }
}

TopDownView.prototype.getPixelsFromCoords = function(coords, options) {
    options = options || {};

    var pixels;
    if (options.absolute) {
        pixels = {
            x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
            y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
        }
    }
    else {
        pixels = {
            x: coords.x * this.dims.x,
            y: coords.y * this.dims.y
        }
    }

    switch(options.cellAnchor) {
        case 'middle':
            pixels.x += this.dims.x / 2;
            pixels.y += this.dims.y / 2;
            break;
        default:
            break;
    }

    return pixels;
};

TopDownView.prototype.positionHtml = function(html, coords, options) {
    var pixels = {
        x: this.centerPx.x - (this.centerCoords.x * this.dims.x),
        y: this.centerPx.y - (this.centerCoords.y * this.dims.y)
    }
    html.style.left = pixels.x + 'px';
    html.style.top = pixels.y + 'px';
}

TopDownView.prototype.recenter = function(coords) {
    var self = this;
    this.centerCoords.x = coords.x;
    this.centerCoords.y = coords.y;

    this.refresh();

    this.worldLayers.forEach((html) => {
        this.positionHtml(html);
    })

    this.renderers.forEach(function(renderer) {
        renderer.onRecenter(coords);
    })
    return this;
}

TopDownView.prototype.shiftView = function(dCoords) {
    this.recenter({
        x: this.centerCoords.x + dCoords.x,
        y: this.centerCoords.y + dCoords.y
    })
    return this;
}

// what is this point of this function??
TopDownView.prototype.rescale = function() {
    throw new Error('what is the point of this function')
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
TopDownView.prototype.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
TopDownView.prototype.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
TopDownView.prototype.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}

TopDownView.prototype.zoomOut = function() {
    this.zoom /= this.zoomFactor;
    this.dims.x /= this.zoomFactor;
    this.dims.y /= this.zoomFactor;
    this.params.window *= this.zoomFactor;
    this.rerender()
    return this;
}

TopDownView.prototype.zoomIn = function() {
    this.zoom *= this.zoomFactor;
    this.dims.x *= this.zoomFactor;
    this.dims.y *= this.zoomFactor;
    this.params.window /= this.zoomFactor;
    this.rerender()
    return this;
}

TopDownView.prototype.getWindowEdges = function() {
    return {
        north: this.centerCoords.y - this.viewSize.y/2,
        west: this.centerCoords.x - this.viewSize.x/2,
        south: this.centerCoords.y + this.viewSize.y/2,
        east: this.centerCoords.x + this.viewSize.x/2

    }
}

TopDownView.prototype.getDistanceFromWindowEdge = function(coords) {
    var distances = this.getWindowEdges();
    distances.east = distances.east - coords.x;
    distances.west = -distances.west + coords.x;
    distances.south = distances.south - coords.y;
    distances.north = -distances.north + coords.y;
    return distances;
}

var resizeTimeout;
TopDownView.prototype.onScreenResize = function() {
    if (!resizeTimeout) {
        resizeTimeout = setTimeout(() => {
            resizeTimeout = null;
            this.refresh();
            this.recenter(this.centerCoords);
        }, 60);
    }
} 
