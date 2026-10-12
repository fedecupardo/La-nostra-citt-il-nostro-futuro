import {getLocalUser} from '@/lib/local-auth';
import {db} from '@/lib/civic';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=await getLocalUser(req);if(!u)return Response.json({comments:[]},{status:401});try{const r=await db().prepare('SELECT c.*,p.title FROM comments c JOIN proposals p ON p.id=c.proposal WHERE c.user=? ORDER BY c.created DESC').bind(u.userId).all();return Response.json({comments:r.results},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Commenti non disponibili'},{status:503});}}
