const {respond}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='GET')return respond(405,{error:'Método no permitido'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY;
 if(!url||!key)return respond(503,{error:'Canal Realtime sin configurar. Sigue funcionando el ranking por consultas.'});
 // Sólo publicar la llave publica, nunca la secreta.
 return respond(200,{url,publishableKey:key});
};
