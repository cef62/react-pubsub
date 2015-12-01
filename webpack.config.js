'use strict';

var webpack = require('webpack');

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
  new webpack.optimize.CommonsChunkPlugin({
    name: "global",
    chunks: ["main"], // important because elsewise it would use "vendor" too
    minChunks: Infinity
  })
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
      exclude: /node_modules/
    }]
  },
  output: {
    library: 'react-pubsub',
    libraryTarget: 'umd'
  },
  plugins: plugins,
  resolve: {
    extensions: ['', '.js']
  }
};
