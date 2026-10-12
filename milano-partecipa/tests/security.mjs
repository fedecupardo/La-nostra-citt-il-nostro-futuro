// Isolated workerd tests: real password/session code, synthetic identities and files.
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(realpathSync('node_modules/drizzle-kit/bin.cjs'))('esbuild');
const result=await build({stdin:{contents:`import * as civic from './app/api/civic/route.ts';import * as auth from './app/api/auth/route.ts';export default {async fetch(req){const route=new URL(req.url).pathname==='/api/auth'?auth:civic;return req.method==='POST'?route.POST(req):route.GET(req)}}`,resolveDir:process.cwd(),sourcefile:'test-entry.ts'},bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers','node:crypto'],write:false});
const mf=new Miniflare({modules:true,script:result.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
const pass='Una password di prova 123!';
try{const db=await mf.getD1Database('DB');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){for(const s of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s.trim()).run();}
async function call(path,body,cookie='',extra={}){const r=await mf.dispatchFetch('https://test.local'+path,{method:body?'POST':'GET',headers:{Origin:'https://test.local',...(cookie?{Cookie:cookie}:{}),...extra,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||'',headers:r.headers};}
const api=(body,session)=>call('/api/civic',body,session);const auth=(body,session,extra)=>call('/api/auth',body,session,extra);
assert.equal((await api({action:'profile'})).status,400);
assert.equal((await auth({action:'register',email:'minor@example.test',password:pass,birth:'2015-01-01'})).status,400);
assert.equal((await auth({action:'register',email:'bad@example.test',password:'short',birth:'1980-01-01'})).status,400);
await db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?)").bind('legacy-owner','Mario','Rossi','owner@example.test','RSSMRA80A01F205X','1980-01-01','Via Prova 1 Milano','comitato','gestore','2026-01-01').run();
await db.prepare("INSERT INTO settings (key,value) VALUES ('owner','legacy-owner')").run();
assert.equal((await auth({action:'register',email:'owner@example.test',password:pass,birth:'1980-01-01'})).status,400);
assert.equal((await auth({action:'migrate',email:'owner@example.test',password:pass})).status,400);
const owner=await auth({action:'migrate',email:'owner@example.test',password:pass},'',{'oai-authenticated-user-id':'legacy-owner','oai-authenticated-user-email':'owner@example.test'});assert.equal(owner.status,200);assert.ok(owner.cookie);assert.match(owner.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
assert.equal((await api(null,owner.cookie)).data.user.id,'legacy-owner');
const citizen=await auth({action:'register',email:'citizen@example.test',password:pass,birth:'1980-01-01'});assert.equal(citizen.status,200);const uid=(await db.prepare("SELECT id FROM credentials WHERE email='citizen@example.test'").first()).id;
assert.equal((await auth({action:'login',email:'citizen@example.test',password:'Wrong Password 123!'})).status,400);
assert.equal((await api({action:'proposal',title:'Una proposta di prova',description:'Una descrizione abbastanza lunga per la proposta civica di prova.',category:'Ambiente',district:'Municipio 1',kind:'Idea',files:[]},owner.cookie)).status,400);
async function upload(session,scope){const f=new FormData();f.append('scope',scope);f.append('file',new File(['%PDF-1.4\n test fixture'],'test.pdf',{type:'application/pdf'}));const encoded=new Request('https://test.local/api/civic',{method:'POST',body:f});const r=await mf.dispatchFetch('https://test.local/api/civic',{method:'POST',headers:{Origin:'https://test.local',Cookie:session,'content-type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data.id;}
const front=await upload(citizen.cookie,'front'),back=await upload(citizen.cookie,'back');
assert.equal((await api({action:'profile',name:'Anna',surname:'Rossi',address:'Via Prova 2 Milano',cf:'RSSNNA80A01F205X',birth:'1980-01-01',front,back,setup:true},citizen.cookie)).status,200);
assert.equal((await api(null,citizen.cookie)).data.user.role,'cittadino');
assert.equal((await api({action:'verify',id:uid,verification:'verified'},citizen.cookie)).status,400);
assert.equal((await call('/api/civic?file='+front)).status,401);
assert.equal((await api({action:'verify',id:uid,verification:'verified'},owner.cookie)).status,200);
const f=await upload(owner.cookie,'proposal');const created=await api({action:'proposal',title:'Una proposta di prova',description:'Una descrizione abbastanza lunga per la proposta civica di prova.',category:'Ambiente',district:'Municipio 1',kind:'Idea',files:[f]},owner.cookie);assert.equal(created.status,200);const id=created.data.id;
assert.equal((await api(null,citizen.cookie)).data.proposals.some(p=>p.id===id),false);
assert.equal((await api({action:'moderate',id,status:'Pubblicata',note:'Documentazione controllata'},owner.cookie)).status,200);
assert.equal((await api({action:'vote',id},owner.cookie)).status,400);
assert.equal((await api({action:'vote',id},citizen.cookie)).status,200);assert.equal((await db.prepare('SELECT count(*) n FROM votes WHERE proposal=?').bind(id).first()).n,1);
await assert.rejects(db.prepare('INSERT INTO votes (user,proposal) VALUES (?,?)').bind(uid,id).run());
assert.equal((await api({action:'comment',id,body:'Una testimonianza di prova.'},citizen.cookie)).status,200);
assert.equal((await auth({action:'logout'},citizen.cookie)).status,200);assert.equal((await api(null,citizen.cookie)).data.auth,null);
const login=await auth({action:'login',email:'citizen@example.test',password:pass});assert.equal(login.status,200);
const reset=await auth({action:'recover',email:'citizen@example.test',password:pass+'2',recoveryCode:citizen.data.recoveryCode});assert.equal(reset.status,200);assert.equal((await api(null,login.cookie)).data.auth,null);
assert.equal((await auth({action:'recover',email:'citizen@example.test',password:pass+'3',recoveryCode:citizen.data.recoveryCode})).status,400);
assert.equal((await api({action:'deleteprofile'},reset.cookie)).status,200);assert.equal((await api(null,reset.cookie)).data.auth,null);assert.equal(await (await mf.getR2Bucket('BUCKET')).get(front),null);
const csrf=await mf.dispatchFetch('https://test.local/api/auth',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});assert.equal(csrf.status,400);
for(let i=0;i<10;i++)await auth({action:'login',email:'missing@example.test',password:'wrong'});assert.equal((await auth({action:'login',email:'missing@example.test',password:'wrong'})).status,429);
const stored=await db.prepare('SELECT password_hash,salt FROM credentials WHERE id=?').bind('legacy-owner').first();assert.notEqual(stored.password_hash,pass);assert.equal(stored.salt.length,64);
console.log('PASS: real scrypt in workerd; adult signup; safe legacy linking; local sessions and logout; CSRF; throttling; private files; roles; proposal workflow; votes; password recovery and session revocation; deletion.');
}finally{await mf.dispose();}
