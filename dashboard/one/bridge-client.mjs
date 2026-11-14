// Client-side probe only. Never accepts SQL credentials; never declares production acceptance.
export function validateGatewayOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('GATEWAY_NOT_CONFIGURED');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('INVALID_GATEWAY_ORIGIN');
  if (!url.hostname || /^(?:localhost$|.*\.localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[::1\]$)/i.test(url.hostname)) throw new Error('INVALID_GATEWAY_ORIGIN');
  return url.origin;
}

export async function probeGateway({origin, companyId, getIdToken, fetchImpl = fetch}) {
  const base = validateGatewayOrigin(origin); // Validate BEFORE requesting an ID token.
  if (typeof companyId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) throw new Error('INVALID_COMPANY_ID');
  if (typeof getIdToken !== 'function') throw new Error('AUTH_REQUIRED');
  const token = await getIdToken();
  if (typeof token !== 'string' || !token) throw new Error('AUTH_REQUIRED');
  const results = {};
  for (const [key, pathname, source] of [
    ['sql', '/v1/sql/records', 'SQL_READ_ONLY'],
    ['trustsoft', '/v1/trustsoft/status', 'TRUSTSOFT_API'],
  ]) {
    const url = new URL(pathname, base);
    url.searchParams.set('companyId', companyId);
    if (key === 'sql') url.searchParams.set('limit', '1');
    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: { authorization: 'Bearer ' + token, accept: 'application/json' },
      });
      if (!response.ok) {
        results[key] = { status: 'BLOCKED', httpStatus: response.status };
        continue;
      }
      const data = await response.json();
      if (data?.status === 'LIVE' && data.source === source) {
        // Gateway response is NOT independent verification of source integrity or production readiness.
        results[key] = { status: 'RESPONSE_OK_UNVERIFIED', count: key === 'sql' && Number.isSafeInteger(data.count) ? data.count : undefined,
          online: key === 'trustsoft' && typeof data.online === 'boolean' ? data.online : undefined };
      } else {
        results[key] = { status: 'BLOCKED', reason: typeof data?.reason === 'string' ? data.reason.slice(0, 100) : 'NOT_VERIFIED' };
      }
    } catch {
      results[key] = { status: 'UNREACHABLE' };
    }
  }
  return { checkedAt: new Date().toISOString(), companyId, ...results };
}
