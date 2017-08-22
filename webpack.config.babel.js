import path from 'path'
import webpack from 'webpack'

const WDS_PORT = 7000
const isProd = process.env.NODE_ENV === 'production'

const BASE_PLUGINS = [
  new webpack.optimize.OccurrenceOrderPlugin(),
]

export default {
  entry: [
    './src',
  ],
  output: {
    filename: 'js/bundle.js',
    path: path.resolve(__dirname, 'public'),
    publicPath: '/',
  },
  devServer: {
    contentBase: 'public/',
    host: '0.0.0.0',
    port: WDS_PORT,
    hot: true,
  },
  devtool: isProd ? false : 'source-map',
  plugins: isProd
    ? BASE_PLUGINS.concat([
      new webpack.optimize.UglifyJsPlugin({
        minimize: true,
        sourceMap: false,
        compressor: {
          warnings: false,
        },
        output: {
          comments: false,
        },
      }),
    ])
    : BASE_PLUGINS.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NamedModulesPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
    ]),
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
}
