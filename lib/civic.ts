import { del, get, put } from '@vercel/blob';
import { db } from './mysql';
export { db } from './mysql';

export function bucket() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Missing Vercel Blob configuration: BLOB_READ_WRITE_TOKEN');
  }
  return {
    async get(key: string) {
      const result = await get(key, { access: 'private' });
      return result ? { body: result.stream } : null;
    },
    put(key: string, body: Uint8Array, options: { httpMetadata?: { contentType?: string } }) {
      return put(key, Buffer.from(body), {
        access: 'private',
        addRandomSuffix: false,
        contentType: options.httpMetadata?.contentType,
      });
    },
    delete(key: string) { return del(key); },
  };
}
export const categories=['Mobilità','Ambiente','Spazi pubblici','Sicurezza','Cultura e giovani'];
export const statuses=['Ricevuta','In revisione','Pubblicata','Presa in carico','Inviata al Comune','Respinta'];
export const roles=['cittadino','moderatore','admin','comitato'] as const;
export type StaffRole=(typeof roles)[number];
export function mysqlDateTime(date=new Date()){return date.toISOString().slice(0,23).replace('T',' ');}
export const samples=[
{id:'esempio-1',title:'Una ciclabile sicura tra Isola e Porta Garibaldi',description:'Proponiamo un collegamento ciclabile continuo e protetto tra il quartiere Isola e la stazione di Porta Garibaldi, con attraversamenti ben segnalati e spazi sicuri per chi si muove ogni giorno in bicicletta. Questo è un esempio illustrativo, non una segnalazione inviata da un cittadino.',category:'Mobilità',district:'Municipio 9',kind:'Idea',status:'Pubblicata'},
{id:'esempio-2',title:'Più alberi e ombra in piazza Dergano',description:'Una proposta per rendere la piazza più vivibile nei mesi estivi: nuove alberature, panchine e aree ombreggiate accessibili a tutte le età. Esempio illustrativo per esplorare la piattaforma.',category:'Ambiente',district:'Municipio 9',kind:'Richiesta',status:'Presa in carico'},
{id:'esempio-3',title:'Illuminazione dei percorsi lungo il Naviglio',description:'Chiediamo una ricognizione dei punti scarsamente illuminati lungo i percorsi pedonali del Naviglio Grande e un piano di miglioramento. Esempio illustrativo, privo di documentazione di un problema reale.',category:'Sicurezza',district:'Municipio 6',kind:'Segnalazione',status:'In revisione'},
{id:'esempio-4',title:'Una biblioteca di quartiere aperta anche la sera',description:'Estendere gli orari degli spazi studio permetterebbe a studenti e lavoratori di utilizzare la biblioteca anche dopo il lavoro. Proponiamo una sperimentazione settimanale. Esempio illustrativo.',category:'Cultura e giovani',district:'Municipio 3',kind:'Idea',status:'Pubblicata'},
{id:'esempio-5',title:'Marciapiedi accessibili per tutti a Porta Romana',description:'Un percorso senza barriere, con scivoli e attraversamenti accessibili, per facilitare gli spostamenti di persone con disabilità e famiglie con passeggini. Esempio illustrativo.',category:'Spazi pubblici',district:'Municipio 4',kind:'Richiesta',status:'Pubblicata'},
{id:'esempio-6',title:'Un giardino condiviso per il quartiere NoLo',description:'Trasformare uno spazio di quartiere in un piccolo giardino condiviso, con orti didattici e attività aperte ai residenti. Esempio illustrativo per mostrare il percorso di una proposta.',category:'Ambiente',district:'Municipio 2',kind:'Idea',status:'Inviata al Comune'}];
export async function seed(){ const d=db();await d.batch(samples.map(p=>d.prepare('INSERT IGNORE INTO proposals (id,author,title,description,category,district,kind,status,created,sample) VALUES (?,?,?,?,?,?,?,?,?,1)').bind(p.id,null,p.title,p.description,p.category,p.district,p.kind,p.status,'2026-10-01 09:00:00')));}
export function event(actor:string,target:string,action:string,note=''){return db().prepare('INSERT INTO events (id,actor,target,action,note,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,target,action,note,mysqlDateTime());}
export function adult(b:string,now=new Date()){if(!/^\d{4}-\d{2}-\d{2}$/.test(b))return false;const d=new Date(b+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==b)return false;let age=now.getUTCFullYear()-d.getUTCFullYear();if(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate()))age--;return age>=18&&age<=120;}
