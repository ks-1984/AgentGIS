const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'node_modules/cesium/Build/Cesium',
              to: 'cesium'
            }
          ]
        })
      ]
    },
    configure: (webpackConfig) => {
      // Add source map loader for cesium
      webpackConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        include: path.resolve(__dirname, 'node_modules/cesium/Source'),
        use: [{
          loader: 'source-map-loader'
        }]
      });

      // Cesium uses workers that need to be loaded
      webpackConfig.output.sourcePrefix = '';
      
      return webpackConfig;
    }
  }
};