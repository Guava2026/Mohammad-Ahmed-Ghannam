// Read-only JAWAFA ONE gateway. Run behind a private HTTPS reverse proxy; never on GitHub Pages.
import http from 'node:http';
import {allowed,makeSelect,parseLimit,trustsoftEndpoint,summarizeSqlRead} from './policy.mjs';
const port=Number(process.env.PORT||8080);
const companyId=process.env.JAWAFA_COMPANY_ID;
const allowedOrigin=process.env.JAWAFA_ALLOWED_ORIGIN;
if (!companyId||!allowedOrigin||new URL(allowedOrigin).protocol!=='https:') throw new Error('Company ID and HTTPS allowed origin required');
const sqlConfigured=!!(process.env.JAWAFA_SQL_SERVER&&process.env.JAWAFA_SQL_DATABASE&&process.env.JAWAFA_SQL_USER&&process.env.JAWAFA_SQL_PASSWORD&&process.env.JAWAFA_SQL_VIEW&&process.env.JAWAFA_SQL_COLUMNS);
const trustConfigured=!!(process.env.TRUSTSOFT_STATUS_URL&&process.env.TRUSTSOFT_API_TOKEN);
let auth,db,sql;
async function services() {
 if (auth) return;
 const {getApps,initializeApp,applicationDefault}=await import('firebase-admin/app');
 const {getAuth}=await import('firebase-admin/auth');
 const {getFirestore}=await import('firebase-admin/firestore');
 if (!getApps().length) initializeApp({credential:applicationDefault()});
 auth=getAuth();db=getFirestore();
}
function reply(res,status,data) {
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin','access-control-allow-origin':allowedOrigin});
 res.end(JSON.stringify(data));
}
async function readSql(limit) {
 if (!sqlConfigured) return {status:'BLOCKED',reason:'SQL_NOT_CONFIGURED'};
 sql??=(await import('mssql')).default;
 const statement=makeSelect(process.env.JAWAFA_SQL_SCHEMA||'dbo',process.env.JAWAFA_SQL_VIEW,process.env.JAWAFA_SQL_COLUMNS);
 const config={server:process.env.JAWAFA_SQL_SERVER,port:Number(process.env.JAWAFA_SQL_PORT||1433),database:process.env.JAWAFA_SQL_DATABASE,user:process.env.JAWAFA_SQL_USER,password:process.env.JAWAFA_SQL_PASSWORD,options:{encrypt:true,trustServerCertificate:false,readOnlyIntent:true},pool:{max:2,min:0,idleTimeoutMillis:10000},connectionTimeout:5000,requestTimeout:5000};
 const pool=new sql.ConnectionPool(config);
 try {
  await pool.connect();
  const result=await pool.request().input('limit',sql.Int,limit).query(statement);
  return {status:'LIVE',source:'SQL_READ_ONLY',count:result.recordset.length,rows:result.recordset};
 } finally {await pool.close();}
}
// Return only a connectivity marker to the browser, never financial SQL rows.
async function readSqlStatus() {
 const result=await readSql(1);
 if (result.status!=='LIVE') return result;
 return {...summarizeSqlRead(result),checkedAt:new Date().toISOString()};
}
async function readTrustsoft() {
 if (!trustConfigured) return {status:'BLOCKED',reason:'TRUSTSOFT_NOT_CONFIGURED'};
 const endpoint=trustsoftEndpoint(process.env.TRUSTSOFT_STATUS_URL);
 const response=await fetch(endpoint,{redirect:'error',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.TRUSTSOFT_API_TOKEN,accept:'application/json'}});
 if (!response.ok) throw new Error('TrustSoft upstream error');
 const raw=await response.text();
 if (raw.length>100000) throw new Error('TrustSoft response too large');
 const data=JSON.parse(raw);
 return {status:'LIVE',source:'TRUSTSOFT_API',online:typeof data.online==='boolean'?data.online:null,cameraCount:Number.isSafeInteger(data.cameraCount)?data.cameraCount:null,eventCount:Number.isSafeInteger(data.eventCount)?data.eventCount:null,checkedAt:new Date().toISOString()};
}
const server=http.createServer(async(req,res)=>{
 try {
  if (req.headers.origin&&req.headers.origin!==allowedOrigin) return reply(res,403,{error:'ORIGIN_DENIED'});
  if (req.method==='OPTIONS') {res.writeHead(204,{'access-control-allow-origin':allowedOrigin,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'authorization, content-type','vary':'Origin','access-control-max-age':'600'});res.end();return;}
  if (req.method!=='GET') return reply(res,405,{error:'METHOD_NOT_ALLOWED'});
  if (req.url==='/health') return reply(res,200,{status:'READY',sqlConfigured,trustConfigured});
  if (!req.url.startsWith('/v1/')) return reply(res,404,{error:'NOT_FOUND'});
  if (!req.headers.authorization?.startsWith('Bearer ')) return reply(res,401,{error:'AUTH_REQUIRED'});
  await services();
  const identity=await auth.verifyIdToken(req.headers.authorization.slice(7),true);
  const company=await db.doc('companies/'+companyId).get();
  if (!company.exists||!allowed(company.data(),identity.uid)) return reply(res,403,{error:'COMPANY_ACCESS_DENIED'});
  const url=new URL(req.url,'http://localhost');
  if (url.searchParams.get('companyId')!==companyId) return reply(res,403,{error:'COMPANY_MISMATCH'});
  if (url.pathname==='/v1/sql/status') return reply(res,200,await readSqlStatus());
  if (url.pathname==='/v1/sql/records') return reply(res,200,await readSql(parseLimit(url.searchParams.get('limit'))));
  if (url.pathname==='/v1/trustsoft/status') return reply(res,200,await readTrustsoft());
  return reply(res,404,{error:'NOT_FOUND'});
 } catch(e) {
  console.error('Gateway request failed',e.name);
  return reply(res,/Invalid SQL|limit must|Only clean HTTPS|Private endpoint/.test(e.message)?400:503,{status:'BLOCKED',error:'REQUEST_FAILED'});
 }
});
server.listen(port,'127.0.0.1',()=>console.log('JAWAFA read-only gateway listening on loopback '+port));
