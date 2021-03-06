import path from 'path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
import { LicenseWebpackPlugin } from 'license-webpack-plugin'

const WDS_PORT = 8080
const isProd = process.env.NODE_ENV === 'production'
const cssProd = ExtractTextPlugin.extract({
  fallback: 'style-loader',
  use: ['css-loader', 'postcss-loader', 'sass-loader'],
})
const cssDev = ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
const cssConfig = isProd ? cssProd : cssDev

const BASE_PLUGINS = [
  new webpack.optimize.OccurrenceOrderPlugin(),
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    'window.jQuery': 'jquery',
    Popper: 'popper.js',
    Tether: 'tether',
    'window.Tether': 'tether',
    Alert: 'exports-loader?Alert!bootstrap/js/dist/alert',
    Button: 'exports-loader?Button!bootstrap/js/dist/button',
    Carousel: 'exports-loader?Carousel!bootstrap/js/dist/carousel',
    Collapse: 'exports-loader?Collapse!bootstrap/js/dist/collapse',
    Dropdown: 'exports-loader?Dropdown!bootstrap/js/dist/dropdown',
    Modal: 'exports-loader?Modal!bootstrap/js/dist/modal',
    Popover: 'exports-loader?Popover!bootstrap/js/dist/popover',
    Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/dist/scrollspy',
    Tab: 'exports-loader?Tab!bootstrap/js/dist/tab',
    Tooltip: 'exports-loader?Tooltip!bootstrap/js/dist/tooltip',
    Util: 'exports-loader?Util!bootstrap/js/dist/util',
  }),
  new HtmlWebpackPlugin({
    title: 'アイギス経験値計算機 | Aigis Exp Calculator',
    minify: {
      collapseWhitespace: isProd,
    },
    hash: true,
    template: './src/index.html',
  }),
  new ExtractTextPlugin({
    filename: 'assets/css/[name].css',
    disable: !isProd,
    allChunks: true,
  }),
]


export default {
  entry: {
    main: [
      './src/main.scss',
      './src/main.js',
    ],
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'assets/js/[name].bundle.js',
    publicPath: '/aigis-expcalc/',
    jsonpFunction: 'commons',
  },
  devServer: {
    contentBase: 'public/',
    host: '0.0.0.0',
    port: WDS_PORT,
    compress: true,
    hot: true,
    stats: 'errors-only',
    historyApiFallback: true,
  },
  devtool: isProd ? false : 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.scss$/,
        use: cssConfig,
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash:6].[ext]',
              outputPath: 'assets/images/',
            },
          },
          'image-webpack-loader',
        ],
      },
    ],
  },
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
      new LicenseWebpackPlugin({
        pattern: /^(.*)$/,
        filename: 'licenses.txt',
        perChunkOutput: false,
      }),
    ])
    : BASE_PLUGINS.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NamedModulesPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
    ]),
}
