// OIDC / SSO strategy (e.g. OneLogin). Self-contained and only wired up when
// config.OIDC_ENABLED is true (see utils/passport.ts + routers/api/root.ts), so
// the stock image behaves exactly like upstream (password-only) until the
// OIDC_* env vars are set. Users are JIT-provisioned into the team on first login,
// mirroring the existing invite flow (routers/api/root.ts -> /team/setup/:token).
import * as querystring from 'querystring';

import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';

import * as config from '@/config';
import { createTeam, getDefaultTeam } from '@/controllers/team';
import { createSsoUser, findUserByEmail } from '@/controllers/user';
import type { UserDocument } from '@/models/user';
import { setupTeamDefaults } from '@/setupDefaults';

import logger from './logger';

// Find-or-create a user for a verified SSO identity. Joins the existing
// (single) team; if none exists yet, bootstraps one + default sources, the same
// way password registration does for the first user.
export async function provisionSsoUser(
  email: string,
  name: string,
): Promise<UserDocument> {
  const normEmail = email.toLowerCase();

  const existing = await findUserByEmail(normEmail);
  if (existing != null) {
    return existing;
  }

  let team = await getDefaultTeam();
  if (team == null) {
    team = await createTeam({
      name: `${normEmail}'s Team`,
      collectorAuthenticationEnforced: true,
    });
    try {
      await setupTeamDefaults(team._id.toString());
    } catch (err) {
      logger.error(
        { err },
        'SSO: failed to set up team defaults for bootstrapped team',
      );
    }
  }

  const user = await createSsoUser({
    email: normEmail,
    name: name || normEmail,
    teamId: team._id,
  });
  logger.info(
    { email: normEmail, type: 'user_login', authType: 'oidc' },
    'SSO: provisioned new user',
  );
  return user;
}

function emailDomainAllowed(email: string): boolean {
  if (config.OIDC_ALLOWED_EMAIL_DOMAINS.length === 0) {
    return true;
  }
  const domain = email.split('@')[1]?.toLowerCase();
  return domain != null && config.OIDC_ALLOWED_EMAIL_DOMAINS.includes(domain);
}

// passport-openidconnect 0.1.x (via node-oauth) authenticates the token request by putting
// client_id/client_secret in the POST body (client_secret_post). Providers whose app is configured
// for client_secret_basic (e.g. OneLogin) reject that with `invalid_client`. Override the token
// request to send HTTP Basic and keep the creds out of the body. (No-op when OIDC_TOKEN_AUTH_METHOD
// is 'client_secret_post' — the library default is used.)
function applyClientSecretBasic(strategy: OpenIDConnectStrategy): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const oauth2 = (strategy as any)._oauth2;
  const basic =
    'Basic ' +
    Buffer.from(`${config.OIDC_CLIENT_ID}:${config.OIDC_CLIENT_SECRET}`).toString(
      'base64',
    );
  oauth2.getOAuthAccessToken = function (
    code: string,
    params: Record<string, any>,
    callback: (
      err: any,
      accessToken?: string,
      refreshToken?: string,
      results?: any,
    ) => void,
  ) {
    const p: Record<string, any> = params || {};
    const codeParam =
      p.grant_type === 'refresh_token' ? 'refresh_token' : 'code';
    p[codeParam] = code;
    const postData = querystring.stringify(p);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basic,
    };
    oauth2._request(
      'POST',
      oauth2._getAccessTokenUrl(),
      headers,
      postData,
      null,
      function (error: any, data: any) {
        if (error) return callback(error);
        let results: any;
        try {
          results = JSON.parse(data);
        } catch (e) {
          results = querystring.parse(data);
        }
        const accessToken = results.access_token;
        const refreshToken = results.refresh_token;
        delete results.refresh_token;
        callback(null, accessToken, refreshToken, results);
      },
    );
  };
}

export function buildOidcStrategy(): OpenIDConnectStrategy {
  const strategy = new OpenIDConnectStrategy(
    {
      issuer: config.OIDC_ISSUER,
      authorizationURL: config.OIDC_AUTHORIZATION_URL,
      tokenURL: config.OIDC_TOKEN_URL,
      userInfoURL: config.OIDC_USERINFO_URL,
      clientID: config.OIDC_CLIENT_ID,
      clientSecret: config.OIDC_CLIENT_SECRET,
      callbackURL: config.OIDC_CALLBACK_URL,
      scope: config.OIDC_SCOPE,
    },
    // Standard passport-openidconnect verify signature: (issuer, profile, cb).
    async function verify(
      _issuer: string,
      profile: any,
      cb: (err: any, user?: any, info?: any) => void,
    ) {
      try {
        const email: string = (
          profile?.emails?.[0]?.value ??
          profile?._json?.email ??
          ''
        ).toLowerCase();
        const name: string =
          profile?.displayName ?? profile?._json?.name ?? email;

        if (!email) {
          logger.warn('SSO login rejected: no email in OIDC profile');
          return cb(null, false, { message: 'No email in SSO profile' });
        }
        if (!emailDomainAllowed(email)) {
          logger.warn({ email }, 'SSO login rejected: email domain not allowed');
          return cb(null, false, { message: 'Email domain not allowed' });
        }

        const user = await provisionSsoUser(email, name);
        return cb(null, user);
      } catch (err) {
        logger.error({ err }, 'SSO verify failed');
        return cb(err);
      }
    },
  );

  if (config.OIDC_TOKEN_AUTH_METHOD === 'client_secret_basic') {
    applyClientSecretBasic(strategy);
  }

  return strategy;
}
