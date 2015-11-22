
import request from 'request';
import fs from 'fs';
import rimraf from 'rimraf';
import appRoot from 'app-root-path';
import child_process from 'child_process';

export function checkIfBundleExists(res, path, verion, packageToCamelcase, callback) {
  fs.exists(path, exists => {
    if (!exists) {
      callback();
    }else {
      res.view('package',  {
        path: verion,
        name: packageToCamelcase,
        env: process.env.NODE_ENV
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
  return child_process.exec(`${appRoot.path}/node_modules/.bin/npm install ${name} --prefix ${config.prefix}`,
    error => {
      if (error !== null) {
        return res(Boom.badImplementation(`Server error: where was en error retrieving ${name} from npm`));
      }
      callback();
    });
}

export function buildWithWebpack(res, packageInstallPath, entry, packageToCamelcase, outPath, callback) {
  return child_process.exec(`${appRoot.path}/node_modules/.bin/webpack ${entry} --output-filename ${packageToCamelcase}.js -p  --context ${packageInstallPath} --output-library ${packageToCamelcase} --output-library-target var --output-path ${outPath}`,
    error => {
      if (error !== null) {
        return res(Boom.badImplementation(`Server error: where was en error retrieving ${name} from npm`));
      }
      callback();
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