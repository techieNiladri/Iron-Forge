const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, configFromEnvironment, validateWorkout } = require('../ironforge-backend/app.cjs');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const requestId='33333333-3333-4333-8333-333333333333';
const config={url:'http://127.0.0.1:54321',key:'sb_publishable_synthetic_test_only'};
let rows=[], calls=0, logs=[], sequence=1, failDb=false, server, origin;
function makeClient(url,key,options){
 const token=options.global.headers.Authorization.slice(7), owner=token==='valid-a'?A:B;
 return {auth:{async getUser(){calls++;return token==='outage'?{data:{},error:{status:503}}:token.startsWith('valid-')?{data:{user:{id:owner}},error:null}:{data:{},error:{status:401}};}},from(){
  let op='read', input, eq=[], beforeId, limit=51;
  const query={select(){return query},eq(k,v){eq.push([k,v]);return query},lt(k,v){beforeId=Number(v);return query},order(){return query},limit(n){limit=n;return query},insert(v){op='insert';input=v;return query},delete(){op='delete';return query},single(){return execute(true)},then(resolve,reject){return execute(false).then(resolve,reject)}};
  async function execute(single){
   if(failDb)return {data:null,error:{code:'08006',message:'private database detail must never escape'}};
   let matched=rows.filter(row=>eq.every(([k,v])=>row[k]===v)&&(!beforeId||row.id<beforeId));
   if(op==='insert'){
    if(rows.some(r=>r.user_id===input.user_id&&r.client_request_id===input.client_request_id))return{data:null,error:{code:'23505'}};
    const row={...input,id:sequence++,created_at:new Date().toISOString()};rows.push(row);return{data:row,error:null};
   }
   if(op==='delete')rows=rows.filter(r=>!matched.includes(r));
   matched.sort((a,b)=>b.id-a.id);matched=matched.slice(0,limit);
   return{data:single?matched[0]:matched,error:null};
  }
  return query;
 }};
}
before(async()=>{server=createApp({config,makeClient,logger:{error(...args){logs.push(args)}}}).listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));origin=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
async function request(route,{token='valid-a',method='GET',body}={}){const response=await fetch(origin+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});return{response,data:await response.json()};}
const input=()=>({exercise:'Deadlift',weight:12.5,reps:8,sets:3,client_request_id:requestId});
test('Configuration rejected missing, privileged and non-local HTTP settings',()=>{
 assert.throws(()=>configFromEnvironment({}));
 assert.throws(()=>configFromEnvironment({SUPABASE_URL:config.url,SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'}));
 assert.throws(()=>configFromEnvironment({SUPABASE_URL:'http://example.test',SUPABASE_PUBLISHABLE_KEY:config.key}));
 assert.deepEqual(configFromEnvironment({SUPABASE_URL:config.url,SUPABASE_PUBLISHABLE_KEY:config.key}),config);
});
test('Strict validation preserved decimals/zero and rejected partial numbers, owner overrides and unsafe values',()=>{
 assert.equal(validateWorkout({...input(),weight:0}).weight,0);
 for(const bad of [{weight:'12abc'},{weight:1.234},{reps:1.5},{sets:0},{weight:-1},{exercise:' '},{exercise:'x'.repeat(121)},{user_id:B},{id:1},{client_request_id:'invalid'}])assert.equal(validateWorkout({...input(),...bad}),null);
});
test('Unauthenticated and invalid requests failed closed; API responses were not cacheable',async()=>{
 const prior=calls;const missing=await request('/api/workouts',{token:null});assert.equal(missing.response.status,401);assert.equal(calls,prior);
 assert.equal((await request('/api/workouts',{token:'invalid'})).response.status,401);
 assert.equal((await request('/api/workouts',{token:'outage'})).response.status,503);
 assert.match(missing.response.headers.get('cache-control'),/no-store/);
 assert.equal(missing.response.headers.get('access-control-allow-origin'),null);
 assert.equal((await request('/api/config')).data.supabasePublishableKey,config.key);
});
test('Create/list/delete were owner scoped and retry-safe',async()=>{
 let r=await request('/api/workouts',{method:'POST',body:input()});assert.equal(r.response.status,201);const id=r.data.workout.id;
 assert.equal((await request('/api/workouts',{method:'POST',body:input()})).response.status,200);assert.equal(rows.length,1);
 assert.equal((await request('/api/workouts',{method:'POST',body:{...input(),reps:9}})).response.status,409);
 assert.equal((await request('/api/workouts',{token:'valid-b'})).data.workouts.length,0);
 assert.equal((await request('/api/workouts/'+id,{token:'valid-b',method:'DELETE'})).response.status,404);assert.equal(rows.length,1);
 assert.equal((await request('/api/workouts/'+id,{method:'DELETE'})).response.status,200);assert.equal(rows.length,0);
});
test('Malformed JSON, oversized bodies and bad IDs/cursors were handled safely',async()=>{
 assert.equal((await request('/api/workouts',{method:'POST',body:'{'})).response.status,400);
 assert.equal((await request('/api/workouts',{method:'POST',body:{...input(),exercise:'x'.repeat(9000)}})).response.status,413);
 assert.equal((await request('/api/workouts/1abc',{method:'DELETE'})).response.status,400);
 assert.equal((await request('/api/workouts?before=1abc')).response.status,400);
 assert.equal((await request('/api/workouts?before=9999999999')).response.status,400);
 assert.equal((await request('/api/workouts?before=1&before=2')).response.status,400);
});
test('Database failures did not disclose database details, credentials or tokens',async()=>{
 failDb=true;const r=await request('/api/workouts');failDb=false;
 assert.equal(r.response.status,503);assert.ok(!JSON.stringify(r.data).includes('private database'));
 assert.ok(!JSON.stringify(logs).includes('valid-a'));assert.ok(!JSON.stringify(logs).includes('private database'));
});
