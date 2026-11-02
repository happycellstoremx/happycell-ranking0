const {phase,respond,parse,db,uuid}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return respond(405,{error:'Método no permitido'});
 if(phase()!=='active')return respond(403,{error:'El concurso ya terminó o no ha comenzado.'});
 let d;try{d=parse(event)}catch(e){return respond(400,{error:'JSON inválido'})}
 if(!uuid.test(d.runId||'')||!Number.isInteger(d.level)||d.level<0||d.level>100||
   !Number.isInteger(d.points)||d.points<0||d.points>500000||
   typeof d.alias!=='string'||d.alias.trim().length<2||d.alias.trim().length>22)
   return respond(400,{error:'Datos de puntuación inválidos'});
 try{
   const result=await db('rpc/hc_finish_run',{method:'POST',body:{p_run_id:d.runId,p_alias:d.alias.trim(),p_level:d.level,p_points:d.points},returnRecords:true});
   return respond(200,{recorded:true,status:'pending',result});
 }catch(e){return respond(422,{error:'No se pudo validar o registrar esta partida. Comprueba que no se haya enviado antes.'})}
};
