const {phase,respond,parse,db,uuid}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return respond(405,{error:'Método no permitido'});
 if(phase()!=='active')return respond(403,{error:'Fuera de las fechas del concurso. Puedes jugar en modo práctica.'});
 let data;try{data=parse(event)}catch(e){return respond(400,{error:'Solicitud JSON inválida'});}
 if(typeof data.participantId!=='string'||!uuid.test(data.participantId))return respond(400,{error:'Jugador inválido'});
 try{
   const oneDayAgo=new Date(Date.now()-86400000).toISOString();
   const previous=await db('hc_runs?select=id&player_id=eq.'+encodeURIComponent(data.participantId)+'&started_at=gte.'+encodeURIComponent(oneDayAgo)+'&limit=31');
   if(previous.length>=30)return respond(429,{error:'Máximo de 30 partidas oficiales por día en este navegador'});
   const created=await db('hc_runs',{method:'POST',body:{player_id:data.participantId},returnRecords:true});
   const id=created?.[0]?.id;
   if(!id)return respond(503,{error:'No fue posible registrar la partida'});
   return respond(200,{runId:id});
 }catch(e){return respond(503,{error:'No se pudo iniciar el registro en línea. La partida puede continuar como práctica.'})}
};
