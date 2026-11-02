const {phase,respond,db}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='GET')return respond(405,{error:'Método no permitido'});
 try{
  const records=await db('hc_practice_leaderboard?select=alias,level,points&order=level.desc,points.desc,updated_at.asc&limit=10');
  return respond(200,{state:phase(),records});
 }catch(e){console.error('Ranking práctica',String(e));return respond(503,{error:'Ranking de práctica no disponible',records:null})}
};
