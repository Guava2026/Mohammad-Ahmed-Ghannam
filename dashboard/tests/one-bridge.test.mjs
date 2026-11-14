import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGatewayOrigin, probeGateway } from '../one/bridge-client.mjs';

test('HTTPS public root is required before obtaining token', async () => {
  for (const origin of ['http://api.example.com/', 'https://localhost/', 'https://127.0.0.1/', 'https://example.com/path', 'https://user:p@example.com/', 'https://example.com/?x=1']) {
    assert.throws(() => validateGatewayOrigin(origin));
  }
  let accessed = false;
  await assert.rejects(() => probeGateway({ origin: 'http://example.com', companyId: 'abc', getIdToken: async () => { accessed = true; return 'token'; } }));
  assert.equal(accessed, false);
});

test('probes both endpoints with authenticated token, one SQL row maximum and no credential in URL', async () => {
  const calls=[];
  const res = await probeGateway({origin:'https://bridge.example.com/',companyId:'company123',getIdToken:async()=> 'test.token',fetchImpl:async (url,opts)=>{
    calls.push({url,opts});
    return {ok:true,status:200,json:async()=>url.includes('/sql/')?{status:'LIVE',source:'SQL_READ_ONLY',recordAvailable:true}:{status:'LIVE',source:'TRUSTSOFT_API',online:true}};
  }});
  assert.equal(calls.length,2);
  assert.equal(res.sql.status,'RESPONSE_OK_UNVERIFIED');
  assert.equal(res.trustsoft.status,'RESPONSE_OK_UNVERIFIED');
  assert.equal('rows' in res.sql,false);
  assert.equal(res.sql.recordAvailable,true);
  assert(calls.every(c=>c.opts.method==='GET' && c.opts.redirect==='error' && c.opts.headers.authorization==='Bearer test.token' && !c.url.includes('test.token')));
  assert(calls[0].url.includes('/v1/sql/status'));
  assert.equal(calls[0].url.includes('limit='),false);
});

test('non-200 and blocked responses cannot become LIVE', async () => {
  const out=await probeGateway({origin:'https://api.example.org/',companyId:'c',getIdToken:async()=>'t',fetchImpl:async (url)=> url.includes('/sql/') ? {ok:false,status:403} : {ok:true,json:async()=>({status:'BLOCKED',reason:'TRUSTSOFT_NOT_CONFIGURED'})}});
  assert.equal(out.sql.status,'BLOCKED');assert.equal(out.sql.httpStatus,403);
  assert.equal(out.trustsoft.status,'BLOCKED');
});

test('missing company or token fails closed', async () => {
  await assert.rejects(()=>probeGateway({origin:'https://api.example.org/',companyId:'c/123',getIdToken:async()=> 't'}));
  await assert.rejects(()=>probeGateway({origin:'https://api.example.org/',companyId:'c',getIdToken:async()=> ''}));
});
