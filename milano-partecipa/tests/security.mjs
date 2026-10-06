// Local isolated integration tests. Test identities are never compiled into the app.
import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(realpathSync('node_modules/drizzle-kit/bin.cjs'))('esbuild');
const result=await build({stdin:{contents:`import {GET,POST} from './app/api/civic/route.ts'; export default {async fetch(req){globalThis.testIdentity=req.headers.get('test-identity');return req.method==='POST'?POST(req):GET(req)}}`,resolveDir:process.cwd(),sourcefile:'test-entry.ts'},bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers'],write:false,plugins:[{name:'isolated-auth',setup(b){b.onResolve({filter:/chatgpt-auth/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export async function getChatGPTUser(){const id=globalThis.testIdentity;return id?{userId:id,email:id+'@example.test'}:null}` ,loader:'js'}));}}]});
const mf=new Miniflare({modules:true,script:result.outputFiles[0].text,compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET']});
try{const db=await mf.getD1Database('DB');const sql=readFileSync('drizzle/0000_curly_molecule_man.sql','utf8');for(const s of sql.split('--> statement-breakpoint'))await db.prepare(s.trim()).run();
async function call(id,body){const r=await mf.dispatchFetch('http://test.local/api/civic',{method:body?'POST':'GET',headers:{...(id?{'test-identity':id}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
assert.equal((await call(null,{action:'profile'})).status,400);
let p={action:'profile',name:'Mario',surname:'Rossi',address:'Via Prova 1, Milano',birth:'2015-01-01',cf:'RSSMRA80A01F205X',setup:true};assert.equal((await call('owner',p)).status,400);p.birth='1980-01-01';assert.equal((await call('owner',p)).status,200);
assert.equal((await call('owner',{action:'proposal',title:'Una proposta di prova',description:'Questa descrizione contiene abbastanza caratteri per una proposta.',category:'Ambiente',district:'Municipio 1',kind:'Idea',files:[]})).status,400);
async function file(id,scope){const f=new FormData();f.append('scope',scope);f.append('file',new File(['%PDF-1.4\n test fixture'], 'test.pdf',{type:'application/pdf'}));const encoded=new Request('http://test.local/api/civic',{method:'POST',body:f});const r=await mf.dispatchFetch('http://test.local/api/civic',{method:'POST',headers:{'test-identity':id,'content-type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});assert.equal(r.status,200);return (await r.json()).id;}
const front=await file('citizen','front'),back=await file('citizen','back');assert.equal((await call('citizen',{...p,setup:false,front,back})).status,200);assert.equal((await call('citizen',{action:'verify',id:'citizen',verification:'verified'})).status,400);
let privateRead=await mf.dispatchFetch('http://test.local/api/civic?file='+front,{headers:{'test-identity':'stranger'}});assert.equal(privateRead.status,403);
assert.equal((await call('owner',{action:'verify',id:'citizen',verification:'verified'})).status,200);
const attachment=await file('owner','proposal');const created=await call('owner',{action:'proposal',title:'Una proposta di prova',description:'Questa descrizione contiene abbastanza caratteri per una proposta.',category:'Ambiente',district:'Municipio 1',kind:'Idea',files:[attachment]});assert.equal(created.status,200);const id=created.data.id;
assert.equal((await call('citizen')).data.proposals.some(p=>p.id===id),false);
assert.equal((await call('owner',{action:'moderate',id,status:'Pubblicata',note:'Documentazione controllata'})).status,200);
assert.equal((await call('owner',{action:'vote',id})).status,400);
assert.equal((await call('citizen',{action:'vote',id})).status,200);assert.equal((await db.prepare('SELECT count(*) n FROM votes WHERE proposal=?').bind(id).first()).n,1);
await assert.rejects(db.prepare('INSERT INTO votes (user,proposal) VALUES (?,?)').bind('citizen',id).run());
assert.equal((await call('citizen',{action:'edit',id,title:'Modifica non autorizzata',description:'Tentativo di modifica di una proposta scritta da un altro cittadino.'})).status,400);
assert.equal((await call('citizen',{action:'comment',id,body:'Questa è una testimonianza di prova.'})).status,200);
assert.equal((await call('citizen',{action:'deleteprofile'})).status,200);
assert.equal((await db.prepare("SELECT count(*) n FROM votes WHERE user='citizen'").first()).n,0);assert.equal(await (await mf.getR2Bucket('BUCKET')).get(front),null);
console.log('PASS: registration age gate, identity review, private document isolation, mandatory attachment, visibility, owner authorization, unique votes, comments, account deletion and file cleanup.');
}finally{await mf.dispose();}
