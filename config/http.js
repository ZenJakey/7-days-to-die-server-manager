/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For more information on configuration, check out:
 * https://sailsjs.com/config/http
 */

const morgan = require('morgan');

const {
  customLogger
} = require('./customLog');

/**
 * PASSPORT CONFIGURATION
 */

var passport = require('passport');
var SteamStrategy = require('passport-steam');
var DiscordStrategy = require('passport-discord').Strategy;
const Sentry = require('@sentry/node');

/**
 * Steam strategy config
 */

let steamAPIkey = process.env.API_KEY_STEAM;
passport.use(new SteamStrategy({
  returnURL: `${process.env.CSMM_HOSTNAME}/auth/steam/return`,
  realm: `${process.env.CSMM_HOSTNAME}`,
  apiKey: steamAPIkey
}, async function (identifier, profile, done) {
  try {
    let foundUser = await User.findOrCreate({
      steamId: profile._json.steamid
    }, {
      steamId: profile._json.steamid,
      username: profile._json.personaname
    });
    await User.update({
      id: foundUser.id
    }, {
      username: profile._json.personaname,
      avatar: profile._json.avatarfull
    });
    foundUser.steamProfile = profile;
    return done(null, foundUser);
  } catch (error) {
    sails.log.warn(`Error during steam auth!`);
    sails.log.error(error);
    Sentry.captureException(error);
    return done(new Error(`Error during steam auth. This should never happen. Please contact someone on the dev server`));
  }

}));

let discordScopes = ['identify', 'guilds'];

if (process.env.DISCORDCLIENTID && process.env.DISCORDCLIENTSECRET && process.env.CSMM_HOSTNAME) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORDCLIENTID,
    clientSecret: process.env.DISCORDCLIENTSECRET,
    callbackURL: `${process.env.CSMM_HOSTNAME}/auth/discord/return`,
    scope: discordScopes
  }, async function (accessToken, refreshToken, profile, cb) {
    try {
      return cb(null, profile);
    } catch (error) {
      sails.log.error(`Discord auth error! ${error}`);
    }
  }));

} else {
  console.log(`No Discord client ID and/or client secret given in dotenv. Discarding Discord passport configuration`);
}



passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (steamId, done) {
  User.findOne({
    steamId: steamId
  }, function (err, user) {
    sails.log.error(err);
    done(err, user);
  });
});

morgan.token('userId', function (req) {
  if (req.session) {
    return req.session.userId;
  } else {
    return undefined;
  }
});

morgan.token('serverId', function (req) {
  if (req.params && req.params.serverId) {
    return req.params.serverId;
  }

  if (req.query && req.query.serverId) {
    return req.query.serverId;
  }
});

morgan.token('playerId', function (req) {
  if (req.params && req.params.playerId) {
    return req.params.playerId;
  }

  if (req.query && req.query.playerId) {
    return req.query.playerId;
  }
});

function morganJson(tokens, req,res) {
  return JSON.stringify({
    'remote-address': tokens['remote-addr'](req, res),
    'time': tokens['date'](req, res, 'iso'),
    'method': tokens['method'](req, res),
    'url': tokens['url'](req, res),
    'http-version': tokens['http-version'](req, res),
    'status-code': tokens['status'](req, res),
    'content-length': tokens['res'](req, res, 'content-length'),
    'referrer': tokens['referrer'](req, res),
    'user-agent': tokens['user-agent'](req, res),
    'userId': tokens['userId'](req, res),
    'serverId': tokens['serverId'](req, res),
    'playerId': tokens['playerId'](req, res),
  });
}

const morganLogger = morgan(morganJson, {
  'stream': customLogger.stream,
  skip: () => {
    return !!process.env.IS_TEST;
  }
});

module.exports.http = {


  /****************************************************************************
   *                                                                           *
   * Sails/Express middleware to run for every HTTP request.                   *
   * (Only applies to HTTP requests -- not virtual WebSocket requests.)        *
   *                                                                           *
   * https://sailsjs.com/documentation/concepts/middleware                     *
   *                                                                           *
   ****************************************************************************/

  middleware: {

    passportInit: require('passport').initialize(),
    passportSession: require('passport').session(),
    xframe: require('lusca').xframe('SAMEORIGIN'),
    sentryRequest: Sentry.Handlers.requestHandler(),
    sentryError: Sentry.Handlers.errorHandler(),
    sentryTracing: Sentry.Handlers.tracingHandler(),
    morgan: morganLogger,

    /***************************************************************************
     *                                                                          *
     * The order in which middleware should be run for HTTP requests.           *
     * (This Sails app's routes are handled by the "router" middleware below.)  *
     *                                                                          *
     ***************************************************************************/

    order: [
      'sentryRequest',
      'sentryTracing',
      'sentryError',
      'cookieParser',
      'session',
      'passportInit',
      'passportSession',
      'xframe',
      'morgan',
      'bodyParser',
      'compress',
      'poweredBy',
      'router',
      'www',
      'favicon',
    ],


    /***************************************************************************
     *                                                                          *
     * The body parser that will handle incoming multipart HTTP requests.       *
     *                                                                          *
     * https://sailsjs.com/config/http#?customizing-the-body-parser             *
     *                                                                          *
     ***************************************************************************/

    // bodyParser: (function _configureBodyParser(){
    //   var skipper = require('skipper');
    //   var middlewareFn = skipper({ strict: true });
    //   return middlewareFn;
    // })(),

  },

};
