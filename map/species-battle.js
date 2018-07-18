// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'

var SpeciesBattle = module.exports = {
    peckingOrder: [
        // This is to break ties in case two species have the same strength.
        // sorted from low to high
        'blank',
        'grass',
        'trees2',
        'trees',
        'flowers',
        'magic',
        'neutralized'
    ],

    decide: function(species) {
        if (species.length === 0) return null;
        if (species.length === 1) return species[0];

        var self = this;
        species.sort(function(species1, species2) {
            // blanks shouldn't be dominant over other species
            if (species1.species.id == 'blank') return 1;
            if (species2.species.id == 'blank') return -1;

            if (species1.strength != species2.strength) {
                return species2.strength - species1.strength
            }
            else {
                return self.peckingOrder.indexOf(species2.species.id) - self.peckingOrder.indexOf(species1.species.id);
            }
        })

        //return ids[Math.floor(Math.random()*ids.length)];
        return species[0];
    }
}
