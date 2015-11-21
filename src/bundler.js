
const request = require('request');
const fs = require('fs');
const webpack = require('webpack');
const rimraf = require('rimraf');
const appRoot = require('app-root-path');
const child_process = require('child_process');

export function checkIfBundleExists(res, path, verion, packageToCamelcase, callback) {
  fs.exists(path, exists => {
    if (!exists) {
      callback();
    }else {
      res.view('package',  {
        path: verion,
        name: packageToCamelcase
      });
    }
  })
}

export function requestNpmPackage(res, packageName, callback) {
  request(`https://registry.npmjs.org/${packageName}`, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      return callback(JSON.parse(body));
    }else {
      return res(Boom.badImplementation(`npm packaging failed - ${error}`));
    }
  });
}

export function installNpmModules(res, name, config, callback) {
  return child_process.exec(`${appRoot.path}/bundler ${name} ${config.prefix}`, function (error, stdout, stderr) {
    if (error !== null) {
      return res(Boom.badImplementation(`Server error: where was en error retrieving ${name} from npm`));
    }
    callback();
  });
}

export function buildWithWebpack(res, packageInstallPath, entry, packageToCamelcase, outPath, callback) {
  console.log(packageInstallPath, entry, packageToCamelcase, outPath)
  const config = {
    context: packageInstallPath,
    entry: entry,
    output: {
      library: packageToCamelcase,
      libraryTarget: 'var',
      path: outPath
    },
    resolve: {
      extensions: [ '', '.js' ]
    },
    plugins: [
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.optimize.UglifyJsPlugin({
        compressor: {
          screw_ie8: true,
          warnings: false
        }
      })
    ]
  };
  webpack(config, (err) => {
    if (err) {
      return res(Boom.badImplementation(`Server error: Someone was probably building a library at the same time, try again! :D`));
    }else {
      callback();
    }
  });
}

export function deleteModules(res, path, callback) {
  rimraf(path, error => {
    if (error) {
      return res(Boom.badImplementation(`Server error: deleting the modules`));
    }
    callback();
  })
}