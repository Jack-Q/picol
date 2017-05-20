var utils = require('./utils')
var config = require('../config')
var isProduction = process.env.NODE_ENV === 'production'

var cssLoaders = utils.cssLoaders({
  sourceMap: isProduction
    ? config.build.productionSourceMap
    : config.dev.cssSourceMap,
  extract: isProduction
});

var loaders = Object.assign({
  ts: 'vue-ts-loader',
}, cssLoaders);
module.exports = {
  esModule: true,
  loaders: loaders
}
