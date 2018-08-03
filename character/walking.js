var Walker = module.exports = function(char, getNextDir, onStep) {
    this.char = char;
    this.timeout = null;
    this.walking = false;
    this.getNextDir = getNextDir;
    this.onStep = typeof onStep === 'function' ? onStep : function() {};
}

Walker.prototype = {};

Walker.prototype.timeTillNextStep = function() {
    // 3-4 seconds, but once in a while stop for a bit
    var base = 60;
    if (Math.random() < 1/10) base = 160;
    return (base +  Math.random() * 20);
}

Walker.prototype.start = function() {
    this.walking = true;
    this.step();
}

Walker.prototype.stop = function() {
    window.clearTimeout(this.timeout);
    this.timeout = null;
    this.walking = false;
}

Walker.prototype.step = function() {
    if (!this.walking) return;
    
    var dir = this.getNextDir()
    this.char.move(dir);
    this.onStep(dir);

    var self = this;
    // window.clearTimeout(this.timeout);
    window.game.clock.schedule(this.timeTillNextStep(), function() {
        self.step();
    }, this.timeTillNextStep());
}
