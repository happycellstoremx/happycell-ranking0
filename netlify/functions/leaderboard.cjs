const {phase,respond,db}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='GET')return respond(405,{error:'Método no permitido'});
 try{
  const data=await db('hc_leaderboard?select=alias,level,points,status&order=level.desc,points.desc,updated_at.asc&limit=10');
  return respond(200,{state:phase(),records:data});
 }catch(e){return respond(503,{error:'Ranking no disponible',records:null})}
};
