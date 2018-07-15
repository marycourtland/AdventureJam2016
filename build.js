var browserify = require('browserify');
var fs = require("fs");


require.extensions['.txt'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};

process.on('uncaughtException', console.log)

browserify("./game.js")
  .transform("babelify", {
      presets: ["@babel/preset-env"],
      plugins: ["@babel/plugin-proposal-class-properties"]
    })
  .transform('brfs')
  .bundle()
  .pipe(fs.createWriteStream("game-bundled.js"));