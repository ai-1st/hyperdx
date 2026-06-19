const env = process.env;

// DEFAULTS
const DEFAULT_APP_TYPE = 'api';
const DEFAULT_EXPRESS_SESSION = 'hyperdx is cool 👋';
const DEFAULT_FRONTEND_URL = env.HYPERDX_APP_PORT
  ? `http://localhost:${env.HYPERDX_APP_PORT}`
  : '';

export const NODE_ENV = env.NODE_ENV as string;

export const APP_TYPE = (env.APP_TYPE || DEFAULT_APP_TYPE) as
  | 'api'
  | 'scheduled-task';
export const CODE_VERSION = env.CODE_VERSION ?? '';
export const EXPRESS_SESSION_SECRET = (env.EXPRESS_SESSION_SECRET ||
  DEFAULT_EXPRESS_SESSION) as string;
export const FRONTEND_URL = (env.FRONTEND_URL ||
  DEFAULT_FRONTEND_URL) as string;
const HYPERDX_IMAGE = env.HYPERDX_IMAGE;
export const IS_APP_IMAGE = HYPERDX_IMAGE === 'hyperdx';
export const IS_ALL_IN_ONE_IMAGE = HYPERDX_IMAGE === 'all-in-one-auth';
export const IS_LOCAL_IMAGE = HYPERDX_IMAGE === 'all-in-one-noauth';
// On Vercel preview deployments the API is inlined into the Next.js app and
// shares its origin, so we emit relative redirects (FRONTEND_URL there points
// at the production host). Everywhere else the API and app run on separate
// hosts, so absolute URLs anchored at FRONTEND_URL are required.
export const IS_INLINE_API = env.HDX_PREVIEW_INLINE_API === 'true';
export const FRONTEND_REDIRECT_BASE = IS_INLINE_API ? '' : FRONTEND_URL;
export const INGESTION_API_KEY = env.INGESTION_API_KEY ?? '';
export const HYPERDX_API_KEY = env.HYPERDX_API_KEY as string;

// ===== OIDC / SSO (e.g. OneLogin) =====
// Optional. SSO is enabled only when issuer + authz/token endpoints + client
// credentials + a callback URL are all present; otherwise the app behaves
// exactly like upstream (password auth only). passport-openidconnect has no
// discovery, so the endpoints are provided explicitly.
export const OIDC_ISSUER = (env.OIDC_ISSUER ?? '') as string;
export const OIDC_AUTHORIZATION_URL = (env.OIDC_AUTHORIZATION_URL ??
  '') as string;
export const OIDC_TOKEN_URL = (env.OIDC_TOKEN_URL ?? '') as string;
export const OIDC_USERINFO_URL = (env.OIDC_USERINFO_URL ?? '') as string;
export const OIDC_CLIENT_ID = (env.OIDC_CLIENT_ID ?? '') as string;
export const OIDC_CLIENT_SECRET = (env.OIDC_CLIENT_SECRET ?? '') as string;
// Where the IdP redirects the browser back to. Routed through the app's /api
// proxy to the API's /auth/sso/callback. Override if your external host differs.
export const OIDC_CALLBACK_URL = (env.OIDC_CALLBACK_URL ||
  (FRONTEND_URL ? `${FRONTEND_URL}/api/auth/sso/callback` : '')) as string;
export const OIDC_SCOPE = (env.OIDC_SCOPE ?? 'openid profile email') as string;
export const OIDC_BUTTON_LABEL = (env.OIDC_BUTTON_LABEL ??
  'Sign in with SSO') as string;
// How the client authenticates at the token endpoint. Default 'client_secret_basic' (HTTP Basic) —
// the OIDC-preferred method and what providers like OneLogin require. passport-openidconnect's
// underlying node-oauth otherwise sends creds in the POST body ('client_secret_post'), which a
// basic-configured app rejects with `invalid_client`. Set to 'client_secret_post' to use the library default.
export const OIDC_TOKEN_AUTH_METHOD = (env.OIDC_TOKEN_AUTH_METHOD ??
  'client_secret_basic') as 'client_secret_basic' | 'client_secret_post';
// Optional comma-separated allowlist; when set, only these email domains may SSO in.
export const OIDC_ALLOWED_EMAIL_DOMAINS = (env.OIDC_ALLOWED_EMAIL_DOMAINS ?? '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
export const OIDC_ENABLED = Boolean(
  OIDC_ISSUER &&
    OIDC_AUTHORIZATION_URL &&
    OIDC_TOKEN_URL &&
    OIDC_CLIENT_ID &&
    OIDC_CLIENT_SECRET &&
    OIDC_CALLBACK_URL,
);
export const HYPERDX_LOG_LEVEL = env.HYPERDX_LOG_LEVEL as string;
export const IS_CI = NODE_ENV === 'test';
export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';
export const MONGO_URI = env.MONGO_URI;
export const OTEL_SERVICE_NAME = env.OTEL_SERVICE_NAME as string;
export const PORT = Number.parseInt(env.PORT as string);
export const OPAMP_PORT = Number.parseInt(env.OPAMP_PORT as string);
export const USAGE_STATS_ENABLED = env.USAGE_STATS_ENABLED !== 'false';
export const RUN_SCHEDULED_TASKS_EXTERNALLY =
  env.RUN_SCHEDULED_TASKS_EXTERNALLY === 'true';

// Only for single container local deployments, disable authentication
export const IS_LOCAL_APP_MODE =
  env.IS_LOCAL_APP_MODE === 'DANGEROUSLY_is_local_app_mode💀';

// Only used to bootstrap empty instances
export const DEFAULT_CONNECTIONS = env.DEFAULT_CONNECTIONS;
export const DEFAULT_SOURCES = env.DEFAULT_SOURCES;

export const IS_PROMQL_ENABLED = env.ENABLE_PROMQL === 'true';

// FOR CI ONLY
export const CLICKHOUSE_HOST = env.CLICKHOUSE_HOST as string;
export const CLICKHOUSE_USER = env.CLICKHOUSE_USER as string;
export const CLICKHOUSE_PASSWORD = env.CLICKHOUSE_PASSWORD as string;

// AI Assistant
// Provider-agnostic configuration (preferred)
export const AI_PROVIDER = env.AI_PROVIDER as string; // 'anthropic' | 'openai'
export const AI_API_KEY = env.AI_API_KEY as string;
export const AI_BASE_URL = env.AI_BASE_URL as string;
export const AI_MODEL_NAME = env.AI_MODEL_NAME as string;
export const AI_REQUEST_HEADERS = env.AI_REQUEST_HEADERS as string;

// Legacy Anthropic-specific configuration (backward compatibility)
export const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY as string;
