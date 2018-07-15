// Index of which sprites to show for each species.

var SpeciesSprites = module.exports = {};

// test species 
SpeciesSprites['blue'] =  { id: 'blue' }
SpeciesSprites['red'] =   { id: 'red' }
SpeciesSprites['green'] = { id: 'green' }


// actual species
SpeciesSprites['blank'] = {
    id: 'dirt'
}

SpeciesSprites['dirt'] = {
    id: 'dirt'
}

SpeciesSprites['neutralized'] = {
    id: ['neutralizer1', 'neutralizer2', 'neutralizer3'],
    fade: true
}

SpeciesSprites['magic'] = {
    id: 'magic',
    fade: true
}

SpeciesSprites['grass'] = {
    id: 'grass'
}

SpeciesSprites['flowers'] = {
    id: 'flower',
    fade: true
}

SpeciesSprites['trees'] = {
    id: ['tree1', 'tree8', 'tree11'],
    fade: true
}

SpeciesSprites['trees2'] = {
    id: ['tree2', 'tree13'],
    fade: true
}
