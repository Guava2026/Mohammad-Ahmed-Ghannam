# DATABASE_CONNECTION_REPORT — 14 November 2026

**Status: BACKEND_IMPLEMENTED, PRODUCTION_CONNECTION_BLOCKED. Do not display LIVE.**

## Confirmed
- Backend source is merged into `main`: `integrations/jawafa-readonly/`, PR #3 merged 13 November 2026 (commit `9f8942916da431b33aa63a87b21484073d8c8873`).
- The backend validates Firebase ID tokens and company membership before any data route. SQL uses an approved named view with a separate credential configured only on the backend. `sa` must not be used for production queries.
- The SQL credentials stay on the server and never in the PWA, browser, Windows app, APK or GitHub.
- PR #6 adds an explicit client-side diagnostic that calls `GET /v1/sql/status`; the diagnostic returns an existence flag, **not financial row contents**.
- Earlier server inspection confirmed `JAWAFFASVR` online and SQL Server service running, with a manual local `sa` authentication success shown by the operator. This does not prove the gateway or read-only login is connected.

## Current blockers
- Remote Desktop Commander reported its monthly usage limit on 14 November 2026; no subsequent remote SQL query was performed.
- There is no confirmed deployed private HTTPS gateway URL.
- No verified, independently audited `SELECT`-only login or approved reporting view/schema is available to this gateway.
- Firebase Admin credentials and intended exact company ID have not been tested on the deployed gateway.
- TrustSoft camera/event API endpoint and vendor fields have not been verified.

## Architecture

Browser / Android / Windows -- Firebase ID token --> HTTPS reverse proxy --> gateway (127.0.0.1 Node)
-> Firebase Admin token + tenant authorisation -> SQL `SELECT` restricted to named view / TrustSoft approved HTTPS API.

## Production acceptance
1. Restore authorised host access via the provider's supported usage controls. Do not work around quotas.
2. Configure a dedicated SQL login with SELECT on approved reporting views only, deny write and impersonation privileges; verify login and record-source comparison.
3. Provision valid TLS and a private network path to the database; protect credentials with server-side secret management.
4. Verify tenant A access, tenant B denial, and anonymous denial against the real gateway, with request logs and no passwords in logs.
5. Verify vendor-authenticated TrustSoft API mapping and outage handling.
6. Set only the **public HTTPS origin** in `dashboard/one/gateway-config.js`. No secret or SA credential in code.
7. Only after evidence is captured may a deployment owner declare LIVE.

**No source financial records or production SQL permissions have been changed by this work.**
