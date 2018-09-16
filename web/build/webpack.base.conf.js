var path = require('path')
var utils = require('./utils')
var config = require('../config')
var vueLoaderConfig = require('./vue-loader.conf')
var VueLoaderPlugin = require('vue-loader/lib/plugin')


function resolve(dir) {
  return path.join(__dirname, '../..', dir)
}

module.exports = {
  entry: {
    app: './web/src/main.ts'
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production' ?
      config.build.assetsPublicPath :
      config.dev.assetsPublicPath
  },
  resolve: {
    extensions: [
      '.ts', '.js', '.vue', '.json'
    ],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': resolve('web/src')
    }
  },
  module: {
    rules: [{
      test: /\.ts$/,
      enforce: 'pre',
      loader: 'tslint-loader'
    }, {
      test: /\.ts$/,
      exclude: /node_modules|vue\/src/,
      use: [{
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }, {
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/]
        }
      }]
    }, {
      test: /\.vue$/,
      loader: 'vue-loader',
      options: vueLoaderConfig
    }, {
      test: /\.js$/,
      loader: 'babel-loader',
      include: [resolve('src'), resolve('test')]
    }, {
      test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
      loader: 'url-loader',
      options: {
        limit: 10000,
        name: utils.assetsPath('img/[name].[hash:7].[ext]')
      }
    }, {
      test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
      loader: 'url-loader',
      options: {
        limit: 10000,
        name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
      }
    }]
  },
  plugins: [
    // Add webpack plugins in this section which are shared among 
    // development and deployment configuration
    new VueLoaderPlugin(),
  ]
}
