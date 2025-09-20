const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser.js'),
        zlib: false,
        fs: false,
        tls: false,
        net: false,
        path: false,
        os: false,
        http: false,
        https: false,
        assert: false,
        url: false,
      };
      
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer'],
        })
      );
      
      return webpackConfig;
    },
  },
};