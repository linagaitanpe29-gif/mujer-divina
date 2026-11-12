const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
let forward;
try { forward=require('../lib/whatsapp').reenviarEventoVerificado; } catch(e) { if(e.code!=='MODULE_NOT_FOUND')throw e; }
const event={event:'transaction.updated',data:{transaction:{id:'test-1',status:'APPROVED'}},signature:{checksum:'test-checksum',properties:['transaction.id']},timestamp:1};
test('sin configuración conserva comportamiento existente y no hace requests',async()=>{
 let requests=0;
 assert.equal(await forward(event,{url:'',fetcher:async()=>{requests++;}}),false);
 assert.equal(requests,0);
});
test('reenvía evento firmado completo y espera acuse',async()=>{
 let options;
 assert.equal(await forward(event,{url:'https://n8n.srv1197567.hstgr.cloud/webhook/md-wompi',fetcher:async(url,body)=>{options=body;return{ok:true};}}),true);
 assert.deepEqual(JSON.parse(options.body),event);
 assert.equal(options.method,'POST');
});
test('rechazo del destino propaga error para permitir reintento Wompi',async()=>{
 await assert.rejects(()=>forward(event,{url:'https://n8n.srv1197567.hstgr.cloud/webhook/md-wompi',fetcher:async()=>({ok:false})}),/acuse/);
});
test('no permite un destino inseguro o con credenciales en URL',async()=>{
 for(const url of ['http://example.com/webhook/md-wompi','https://user:pass@example.com/webhook/md-wompi']) {
  await assert.rejects(()=>forward(event,{url,fetcher:async()=>{throw Error('No debe llamar');}}),/URL/);
 }
});

function fixture(failFirst=false) {
 const state={paid:false,emails:0,relays:0};
 const module={exports:{}};
 const body={event:'transaction.updated',timestamp:1,data:{transaction:{id:'test-1',reference:'MD-TEST',status:'APPROVED',amount_in_cents:10000}},signature:{properties:['transaction.id','transaction.status','transaction.amount_in_cents']}};
 body.signature.checksum=crypto.createHash('sha256').update('test-1APPROVED10000'+'1'+'test-secret').digest('hex');
 const dependencies={
  crypto,
  '../lib/pedidos':{obtenerPedido:async()=>({estado:state.paid?'pagado':'pendiente'}),marcarPagado:async()=>{state.paid=true;return{datos:{}};}},
  '../lib/correos':{enviarVenta:async()=>{state.emails++;}},
  '../lib/whatsapp':{reenviarEventoVerificado:async()=>{state.relays++;if(failFirst&&state.relays===1)throw Error('Receptor caído');}}
 };
 vm.runInNewContext(fs.readFileSync(require.resolve('../api/wompi-webhook.js'),'utf8'),{module,require:key=>dependencies[key],process:{env:{WOMPI_EVENTS_SECRET:'test-secret'}},console:{log(){},warn(){},error(){}}});
 const call=async(payload=body)=>{
  const response={status(n){this.code=n;return this;},json(value){this.value=value;return this;}};
  await module.exports({method:'POST',body:payload},response);
  return response;
 };
 return{state,body,call};
}
test('webhook inválido nunca se reenvía',async()=>{
 const f=fixture();f.body.signature.checksum='invalid';
 assert.equal((await f.call()).code,401);
 assert.equal(f.state.relays,0);assert.equal(f.state.paid,false);
});
test('reintento ya pagado reenvía sin duplicar correo',async()=>{
 const f=fixture();
 assert.equal((await f.call()).code,200);assert.equal((await f.call()).code,200);
 assert.equal(f.state.emails,1);assert.equal(f.state.relays,2);
});
test('caída del receptor conserva venta y permite reintento sin duplicar correo',async()=>{
 const f=fixture(true);
 assert.equal((await f.call()).code,500);assert.equal(f.state.paid,true);assert.equal(f.state.emails,1);
 assert.equal((await f.call()).code,200);assert.equal(f.state.emails,1);assert.equal(f.state.relays,2);
});
