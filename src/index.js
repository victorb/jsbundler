import Hapi from 'hapi';
import appRoot from 'app-root-path';
import Hoek from 'hoek';
import Boom from 'boom';
import http from 'http';
import winston from 'winston';
import {
  installNpmModules,
  requestNpmPackage,
  checkIfBundleExists,
  buildWithWebpack,
  deleteModules
} from './bundler';

const server = new Hapi.Server();
server.connection({ host: 'localhost', port: 3152 });

server.register(require('vision'), function (err) {
  Hoek.assert(!err, err);
  server.views({
    engines: {
      html: require('ejs')
    },
    isCached: process.env.NODE_ENV === 'production',
    path: `${appRoot.path}/templates`,
    compileOptions: {
      pretty: true
    }
  });
});

server.register(require('inert'), function(err){
  if (err) {
    throw err;
  }
});

const routes = [
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.view('index', {});
    }
  },
  {
    method: 'GET',
    path: '/favicon.ico',
    handler: {
      file: `${appRoot.path}/public/favicon.ico`
    }
  },
  {
    path: '/public/{p*}',
    method: 'GET',
    handler: {
      directory: {
        path: `${appRoot.path}/public`
      }
    }
  },
  {
    path: '/packages/{p*}',
    method: 'GET',
    handler: {
      directory: {
        path: `${appRoot.path}/packages`
      }
    }
  },
  {
    method: 'GET',
    path: '/package/{name}',
    handler: function (req, reply) {
      const packageName = req.params.name;
      const packageInstallPath = `${appRoot.path}/packages`;
      const packageToCamelcase = packageName.replace(/-([a-z])/g, g => g[1].toUpperCase());
      requestNpmPackage(reply, packageName, body => {
        const registryObject = body;
        const latestVersion = registryObject['dist-tags'].latest;
        const config = {
          prefix: `${packageInstallPath}/modules`
        };
        const bundlePath = `/packages/${packageName}/${latestVersion}/${packageToCamelcase}.js`;
        const existsPath = `${packageInstallPath}/${packageName}/${latestVersion}`;
        const entry = `${packageInstallPath}/modules/node_modules/${packageName}/${registryObject.versions[latestVersion].main}`;
        const outPath = `${packageInstallPath}/${packageName}/${latestVersion}`;
        const deletePath = `${packageInstallPath}/modules`;
        checkIfBundleExists(reply, existsPath, bundlePath, packageToCamelcase, () => {
          installNpmModules(reply, packageName, config, () => {
            buildWithWebpack(reply, packageInstallPath, entry, packageToCamelcase, outPath, () => {
              deleteModules(reply, deletePath, () => {
                reply.view('package',  {
                  path: bundlePath,
                  name: packageToCamelcase,
                  env: process.env.NODE_ENV
                });
              });
            });
          });
        });
      });
    }
  },
  {
    method: 'POST',
    path: '/package',
    handler: function (req, reply) {
      const packageName = req.payload.bundle_npm_package_input;
      const packageInstallPath = `${appRoot.path}/packages`;
      const packageToCamelcase = packageName.replace(/-([a-z])/g, g => g[1].toUpperCase());
      requestNpmPackage(reply, packageName, body => {
        const registryObject = body;
        const latestVersion = registryObject['dist-tags'].latest;
        const config = {
          prefix: `${packageInstallPath}/modules`
        };
        const bundlePath = `/packages/${packageName}/${latestVersion}/${packageToCamelcase}.js`;
        const existsPath = `${packageInstallPath}/${packageName}/${latestVersion}`;
        const entry = `${packageInstallPath}/modules/node_modules/${packageName}/${registryObject.versions[latestVersion].main}`;
        const outPath = `${packageInstallPath}/${packageName}/${latestVersion}`;
        const deletePath = `${packageInstallPath}/modules`;
        checkIfBundleExists(reply, existsPath, bundlePath, packageToCamelcase, () => {
          installNpmModules(reply, packageName, config, () => {
            buildWithWebpack(reply, packageInstallPath, entry, packageToCamelcase, outPath, () => {
              deleteModules(reply, deletePath, () => {
                reply.redirect(`package/${packageName}`,  {
                  path: bundlePath,
                  name: packageToCamelcase,
                  env: process.env.NODE_ENV
                });
              });
            });
          });
        });
      });
    }
  }
];

server.route(routes);

server.ext('onPreResponse', function(request, reply) {
  var response = request.response;

  if (response.isBoom) {
    var error = response;
    var ctx = {};

    var message = error.output.payload.message;
    var statusCode = error.output.statusCode || 500;
    ctx.code = statusCode;
    ctx.httpMessage = http.STATUS_CODES[statusCode].toLowerCase();
    switch (statusCode) {
      case 404:
        ctx.reason = 'page not found';
        break;
      case 403:
        ctx.reason = 'forbidden';
        break;
      case 500:
        ctx.reason = 'something went wrong';
        break;
      default:
        break;
    }

    if (process.env.NODE_ENV === 'dev') {
      winston.log('error', request.path, {error: error.output.payload.error});
    }

    if (ctx.reason) {
      // Use actual message if supplied
      ctx.reason = message || ctx.reason;
      return reply.view('error', ctx).code(statusCode);
    } else {
      ctx.reason = message.replace(/\s/gi, '+');
      reply.redirect(request.path + '?err=' + ctx.reason);
    }
  }
  return reply.continue();
});

server.start(function () {
  console.log('Server running at:', server.info.uri);
});