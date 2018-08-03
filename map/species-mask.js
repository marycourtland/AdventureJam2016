// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D

var masks = {
    true: 1,
    false: 0
}

var SpeciesMask = module.exports = function(species_id, min_age) {
    min_age = min_age || 0;
    return function(cell) {
        if (!cell || !cell.species) return masks[false];
        if (!cell.register[species_id]) return masks[false];
        //return masks[cell.species.id === species_id];
        return masks[cell.register[species_id].age > min_age]
    }
}
