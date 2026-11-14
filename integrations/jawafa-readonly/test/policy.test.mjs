import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSelect,allowed,parseLimit,trustsoftEndpoint,summarizeSqlRead} from '../policy.mjs';
test('only fixed, quoted identifiers are allowed',()=>{
 assert.equal(makeSelect('dbo','v_Jawafa_Approved','Id, CreatedAt'),'SELECT TOP (@limit) [Id], [CreatedAt] FROM [dbo].[v_Jawafa_Approved]');
 assert.throws(()=>makeSelect('dbo','orders; DROP TABLE x','Id'));
 assert.throws(()=>makeSelect('dbo','safe','*'));
});
test('bound maximum rows',()=>{assert.equal(parseLimit('5'),5);for(const x of ['0','51','NaN','2.5'])assert.throws(()=>parseLimit(x));});
test('tenant role authorization',()=>{const c={ownerUid:'u1',memberIds:['u1','u2','u3'],roles:{u2:'auditor',u3:'employee'}};assert.equal(allowed(c,'u1'),true);assert.equal(allowed(c,'u2'),true);assert.equal(allowed(c,'u3'),false);assert.equal(allowed(c,'stranger'),false);});
test('TrustSoft requires HTTPS public endpoint with no URL credentials',()=>{assert.equal(trustsoftEndpoint('https://api.example.com/status').hostname,'api.example.com');for(const u of ['http://api.example.com','https://127.0.0.1/status','https://user:pass@example.com/x','https://10.0.0.1/x'])assert.throws(()=>trustsoftEndpoint(u));});

test('SQL diagnostic never exposes source row contents', () => {
  const result=summarizeSqlRead({status:'LIVE',count:1,recordset:[{accountNumber:'PRIVATE',balance:9999}],rows:[{hidden:'PRIVATE'}]});
  assert.deepEqual(result,{status:'LIVE',source:'SQL_READ_ONLY',recordAvailable:true});
  assert(!JSON.stringify(result).includes('PRIVATE'));
  assert.deepEqual(summarizeSqlRead({status:'BLOCKED',reason:'SQL_NOT_CONFIGURED'}),{status:'BLOCKED',reason:'SQL_NOT_CONFIGURED'});
});
