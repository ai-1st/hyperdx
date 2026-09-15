import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import * as config from '@/config';
import { findUserById } from '@/controllers/user';
import type { UserDocument } from '@/models/user';
import User from '@/models/user';

import logger from './logger';
import { buildOidcStrategy } from './passport-oidc';

passport.serializeUser(function (user, done) {
  done(null, (user as any)._id);
});

passport.deserializeUser(function (id: string, done) {
  findUserById(id)
    .then(user => {
      if (user == null) {
        // The session outlived the user, e.g. the account was deleted. That is
        // not a server fault, and reporting it as one turned every request
        // still carrying the cookie into a 500, public routes included, so the
        // browser could not even reach the login page. `false` is passport's
        // "no such user" signal: the request continues unauthenticated.
        return done(null, false);
      }
      done(null, user as UserDocument);
    })
    .catch(done);
});

// Use local passport strategy via passport-local-mongoose plugin
const passportLocalMongooseAuthenticate = (User as any).authenticate();

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
    },
    async function (username, password, done) {
      try {
        const { user, error } = await passportLocalMongooseAuthenticate(
          username,
          password,
        );
        if (error) {
          logger.info({
            message: `Login for "${username}" failed, ${error}"`,
            type: 'user_login',
            authType: 'password',
          });
        }
        return done(null, user, error);
      } catch (err) {
        logger.error({ err, username }, 'Login failed with error');
        return done(err);
      }
    },
  ),
);

// Register the OIDC/SSO strategy only when configured, so the stock image is
// unchanged (password-only) until the OIDC_* env vars are set.
if (config.OIDC_ENABLED) {
  try {
    passport.use('oidc', buildOidcStrategy());
    logger.info('OIDC SSO strategy enabled');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize OIDC SSO strategy');
  }
}

export default passport;
