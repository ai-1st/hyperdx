<p align="center">
  <a href="https://hyperdx.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./.github/images/logo_dark.png#gh-dark-mode-only">
      <img alt="hyperdx logo" src="./.github/images/logo_light.png#gh-light-mode-only">
    </picture>
  </a>
</p>

---

# HyperDX with OpenID Connect (OIDC) Single Sign-On (SSO)

> **This is a community fork of [HyperDX](https://github.com/hyperdxio/hyperdx) that adds optional
> OpenID Connect (OIDC) Single Sign-On (SSO) login to self-hosted HyperDX** — so you can sign in to
> your open-source [ClickStack](https://clickhouse.com/use-cases/observability) (ClickHouse +
> HyperDX + OpenTelemetry) observability UI with your existing identity provider, without an
> enterprise license. Everything else is unchanged from upstream (full upstream README below).

## Self-hosted HyperDX SSO: OIDC / OpenID Connect single sign-on

Self-hosted, open-source **HyperDX** ships with local email/password login only — native SSO is a
paid enterprise feature. **This fork adds standards-based OpenID Connect (OIDC) single sign-on (SSO)
authentication** as an opt-in login option *alongside* the built-in password auth, so teams can log
in to their observability dashboards through a central identity provider (IdP) and single sign-on
portal.

**Compatible with any OpenID Connect / OAuth 2.0 identity provider**, including:
**OneLogin**, **Okta**, **Microsoft Entra ID (Azure AD / Azure Active Directory)**, **Auth0**,
**Keycloak**, **Google Workspace**, **Ping Identity (PingFederate / PingOne)**, **JumpCloud**,
**Authentik**, **Authelia**, and other OIDC / SSO providers. (SSO here is implemented over the
**OpenID Connect** protocol — a modern alternative to SAML; SAML is not included.)

### What this SSO fork adds

- 🔐 **OIDC / OpenID Connect single sign-on (SSO)** login for self-hosted HyperDX, built on
  [Passport.js](https://www.passportjs.org/) (`passport-openidconnect`) — Authorization Code flow.
- 👥 **Just-in-time (JIT) user provisioning** — first SSO login auto-creates the user and adds them
  to the team (no manual user setup); access is gated by your IdP's app/role assignment.
- 🔑 **`client_secret_basic` token-endpoint authentication** (configurable) — works with strict
  providers like OneLogin that reject `client_secret_post`.
- 🧩 **Additive & env-gated** — SSO turns on only when the `OIDC_*` environment variables are set;
  with them unset the image behaves exactly like upstream HyperDX (password login). Same Docker
  image, same ClickStack Helm chart — just point `hyperdx.image` at this build.
- 🛡️ Optional **email-domain allowlist** for defense-in-depth on top of IdP role assignment.

### Enabling SSO (environment variables)

Set these on the HyperDX API/app container to enable OpenID Connect SSO (example values for
OneLogin; works for Okta, Azure AD, Auth0, Keycloak, etc. — just swap the issuer/endpoints):

```bash
OIDC_ISSUER=https://<your-tenant>.onelogin.com/oidc/2
OIDC_AUTHORIZATION_URL=https://<your-tenant>.onelogin.com/oidc/2/auth
OIDC_TOKEN_URL=https://<your-tenant>.onelogin.com/oidc/2/token
OIDC_USERINFO_URL=https://<your-tenant>.onelogin.com/oidc/2/me
OIDC_CLIENT_ID=<oidc-app-client-id>
OIDC_CLIENT_SECRET=<oidc-app-client-secret>      # store in a secret manager, never in git
OIDC_CALLBACK_URL=https://<your-hyperdx-host>/api/auth/sso/callback
OIDC_SCOPE="openid profile email"
OIDC_TOKEN_AUTH_METHOD=client_secret_basic       # or client_secret_post
# OIDC_ALLOWED_EMAIL_DOMAINS=example.com,corp.example.com   # optional allowlist
```

In your IdP, register an **OpenID Connect** application with the redirect / callback URL
`https://<your-hyperdx-host>/api/auth/sso/callback`, scopes `openid profile email`, and assign the
users/groups who should have access. A **"Sign in with SSO"** button then appears on the HyperDX
login page, and `/api/login/sso` can be used as the IdP-initiated login URL.

**Keywords:** HyperDX SSO, HyperDX OIDC, HyperDX OpenID Connect, self-hosted HyperDX single sign-on,
ClickStack SSO, ClickHouse observability SSO, OpenTelemetry observability single sign-on, OneLogin
HyperDX, Okta HyperDX, Azure AD / Entra ID HyperDX, Auth0 HyperDX, Keycloak HyperDX, Passport.js
OIDC login, JIT user provisioning, enterprise SSO without license.

---

# HyperDX

[HyperDX](https://hyperdx.io), a core component of
[ClickStack](https://clickhouse.com/use-cases/observability), helps engineers
quickly figure out why production is broken by making it easy to search &
visualize logs and traces on top of any ClickHouse cluster (imagine Kibana, for
ClickHouse).

<p align="center">
  <a href="https://clickhouse.com/docs/use-cases/observability/clickstack/overview">Documentation</a> • <a href="https://hyperdx.io/discord">Chat on Discord</a>  • <a href="https://play.hyperdx.io/search">Live Demo</a>  • <a href="https://github.com/hyperdxio/hyperdx/issues/new">Bug Reports</a> • <a href="./CONTRIBUTING.md">Contributing</a> • <a href="https://clickhouse.com/use-cases/observability">Website</a>
</p>

- 🕵️ Correlate/search logs, metrics, session replays and traces all in one place
- 📝 Schema agnostic, works on top of your existing ClickHouse schema
- 🔥 Blazing fast searches & visualizations optimized for ClickHouse
- 🔍 Intuitive full-text search and property search syntax (ex. `level:err`),
  SQL optional!
- 📊 Analyze trends in anomalies with event deltas
- 🔔 Set up alerts in just a few clicks
- 📈 Dashboard high cardinality events without a complex query language
- `{` Native JSON string querying
- ⚡ Live tail logs and traces to always get the freshest events
- 🔭 OpenTelemetry supported out of the box
- ⏱️ Monitor health and performance from HTTP requests to DB queries (APM)

<br/>
<img alt="Search logs and traces all in one place" src="./.github/images/search_splash.png" title="Search logs and traces all in one place">

## Spinning Up HyperDX

HyperDX can be deployed as part of ClickStack, which includes ClickHouse,
HyperDX, OpenTelemetry Collector and MongoDB.

```bash
docker run -p 8080:8080 -p 4317:4317 -p 4318:4318 docker.hyperdx.io/hyperdx/hyperdx-all-in-one
```

Afterwards, you can visit http://localhost:8080 to access the HyperDX UI.

If you already have an existing ClickHouse instance, want to use a single
container locally, or are looking for production deployment instructions, you
can view the different deployment options in our
[deployment docs](https://clickhouse.com/docs/use-cases/observability/clickstack/deployment).

> If your server is behind a firewall, you'll need to open/forward port 8080,
> 8000 and 4318 on your firewall for the UI, API and OTel collector
> respectively.

> We recommend at least 4GB of RAM and 2 cores for testing.

### Hosted ClickHouse Cloud

You can also deploy HyperDX with ClickHouse Cloud, you can
[sign up for free](https://console.clickhouse.cloud/signUp) and get started in
just minutes.

## Instrumenting Your App

To get logs, metrics, traces, session replay, etc into HyperDX, you'll need to
instrument your app to collect and send telemetry data over to your HyperDX
instance.

We provide a set of SDKs and integration options to make it easier to get
started with HyperDX, such as
[Browser](https://clickhouse.com/docs/use-cases/observability/clickstack/sdks/browser),
[Node.js](https://clickhouse.com/docs/use-cases/observability/clickstack/sdks/nodejs),
and
[Python](https://clickhouse.com/docs/use-cases/observability/clickstack/sdks/python)

You can find the full list in
[our docs](https://clickhouse.com/docs/use-cases/observability/clickstack).

**OpenTelemetry**

Additionally, HyperDX is compatible with
[OpenTelemetry](https://opentelemetry.io/), a vendor-neutral standard for
instrumenting your application backed by CNCF. Supported languages/platforms
include:

- Kubernetes
- Javascript
- Python
- Java
- Go
- Ruby
- PHP
- .NET
- Elixir
- Rust

(Full list [here](https://opentelemetry.io/docs/instrumentation/))

Once HyperDX is running, you can point your OpenTelemetry SDK to the
OpenTelemetry collector spun up at `http://localhost:4318`.

## Contributing

We welcome all contributions! There's many ways to contribute to the project,
including but not limited to:

- Opening a PR ([Contribution Guide](./CONTRIBUTING.md))
- [Submitting feature requests or bugs](https://github.com/hyperdxio/hyperdx/issues/new)
- Improving our product or contribution documentation
- Voting on [open issues](https://github.com/hyperdxio/hyperdx/issues) or
  contributing use cases to a feature request

## Motivation

Our mission is to help engineers ship reliable software. To enable that, we
believe every engineer needs to be able to easily leverage production telemetry
to quickly solve burning production issues.

However, in our experience, the existing tools we've used tend to fall short in
a few ways:

1. They're expensive, and the pricing has failed to scale with TBs of telemetry
   becoming the norm, leading to teams aggressively cutting the amount of data
   they can collect.
2. They're hard to use, requiring full-time SREs to set up, and domain experts
   to use confidently.
3. They requiring hopping from tool to tool (logs, session replay, APM,
   exceptions, etc.) to stitch together the clues yourself.

We hope you give HyperDX in ClickStack a try and let us know how we're doing!

## Contact

- [Open an Issue](https://github.com/hyperdxio/hyperdx/issues/new)
- [Discord](https://discord.gg/FErRRKU78j)
- [Email](mailto:support@hyperdx.io)

## HyperDX Usage Data

HyperDX collects anonymized usage data for open source deployments. This data
supports our mission for observability to be available to any team and helps
support our open source product run in a variety of different environments.
While we hope you will continue to support our mission in this way, you may opt
out of usage data collection by setting the `USAGE_STATS_ENABLED` environment
variable to `false`. Thank you for supporting the development of HyperDX!

## License

[MIT](/LICENSE)
