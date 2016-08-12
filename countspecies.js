var SpeciesCounter = {};

SpeciesCounter.init = function(map, dt) { 
    this.map = map;
    this.counts = {};
    this.t0 = Date.now();
    this.species = [];
    this.dt = dt || 1000;
    this.paused = false;

    this.sample(0);
    this.go();
}

SpeciesCounter.go = function() {
    this.paused = true;

    var self = this;
    setTimeout(function() {
        if (this.paused) return;
        self.sample();
        self.go(); 
    }, this.dt)
}

SpeciesCounter.sample = function(t) {
    if (typeof t === 'undefined') t = Date.now() - this.t0;
    var counts = {};
    for (var s in this.map.species) {
        if (this.species.indexOf(s) === -1) this.species.push(s);
        counts[s] = 0;
    }
    this.map.forEach(function(coords, cell) {
        counts[cell.species.id] += 1;
    })

    this.counts[t] = counts;
}

SpeciesCounter.summarize = function() {
    var self = this;
    var delimiter = '\t';
    console.log(['t', this.species.join(delimiter)].join(delimiter))
    for (var t in this.counts) {
        var countString = this.species.map(function(s) {
            if (!(s in self.counts[t])) return '';
            return self.counts[t][s];
        }).join(delimiter)
        console.log([t, countString].join(delimiter));
    }
}


