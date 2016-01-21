'use strict';

var webpack = require('webpack');
var path = require('path');

var reactExternal = {
  root: 'React',
  commonjs2: 'react',
  commonjs: 'react',
  amd: 'react'
};

var plugins = [
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }),
];

if (process.env.NODE_ENV === 'production') {
  plugins.push(
    new webpack.optimize.UglifyJsPlugin({
    compressor: {
      screw_ie8: true,
      warnings: false
    }}));
}

module.exports = {
  externals: {
    'react': reactExternal
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel-loader'],
      exclude: /node_modules/,
      include: path.join(__dirname, 'src')
    }]
  },
  output: {
    library: 'reactPubsub',
    libraryTarget: 'umd'
  },
  plugins: plugins,
  resolve: {
    extensions: ['', '.js']
  }
};
