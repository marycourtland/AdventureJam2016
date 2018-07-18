# For the game prototype
browserify game -o game-bundled.js  -t [ babelify \
  --presets [ "@babel/preset-env"] \
  --plugins [ "@babel/plugin-proposal-class-properties" ] \
]
