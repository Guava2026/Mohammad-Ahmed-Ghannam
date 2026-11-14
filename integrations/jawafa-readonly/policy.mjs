export const ALLOWED_ROLES = new Set(['owner','chairman','general_manager','procurement_manager','auditor']);
export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(value)) throw new Error('Invalid SQL identifier');
  return '['+value+']';
}
export function projection(value) {
  if (typeof value !== 'string') throw new Error('SQL columns not configured');
  const parts=value.split(',').map(x=>x.trim()).filter(Boolean);
  if (!parts.length || parts.length>24 || new Set(parts).size!==parts.length) throw new Error('Invalid SQL columns');
  return parts.map(identifier).join(', ');
}
export function makeSelect(schema,view,columns) {
  return 'SELECT TOP (@limit) '+projection(columns)+' FROM '+identifier(schema)+'.'+identifier(view);
}
export function allowed(company,uid) {
  if (!company || !uid || !Array.isArray(company.memberIds) || !company.memberIds.includes(uid)) return false;
  const role=company.ownerUid===uid?'owner':company.roles?.[uid];
  return ALLOWED_ROLES.has(role);
}
export function parseLimit(value) {
  const n=Number(value??10);
  if (!Number.isSafeInteger(n)||n<1||n>50) throw new Error('limit must be 1..50');
  return n;
}
export function trustsoftEndpoint(value) {
  if (!value) throw new Error('TrustSoft API endpoint not configured');
  const u=new URL(value);
  if (u.protocol!=='https:'||u.username||u.password||u.search||u.hash) throw new Error('Only clean HTTPS endpoint allowed');
  if (['localhost','127.0.0.1','::1'].includes(u.hostname)||/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(u.hostname)) throw new Error('Private endpoint not allowed');
  return u;
}

// Health probe must not serialize or return any recordset/financial values.
export function summarizeSqlRead(result) {
 if (result?.status !== 'LIVE') return {status:'BLOCKED', reason:result?.reason || 'SQL_NOT_AVAILABLE'};
 return {status:'LIVE', source:'SQL_READ_ONLY', recordAvailable:Number(result.count)>0};
}
