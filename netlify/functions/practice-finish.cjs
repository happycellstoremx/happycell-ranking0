const {phase,respond,parse,db,uuid}=require('../lib/server.cjs');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return respond(405,{error:'Método no permitido'});
 if(phase()!=='upcoming')return respond(403,{error:'El periodo de práctica compartida ha terminado'});
 let d;try{d=parse(event)}catch(e){return respond(400,{error:'Solicitud inválida'})}
 if(!uuid.test(d.participantId||'')||!Number.isInteger(d.level)||d.level<0||d.level>50||
 !Number.isInteger(d.points)||d.points<0||d.points>500000||
 typeof d.alias!=='string'||!/^[\p{L}\p{N} _.-]{2,22}$/u.test(d.alias.trim()))
 return respond(400,{error:'Datos de práctica inválidos'});
 try{
  const data=await db('rpc/hc_record_practice',{method:'POST',body:{p_player_id:d.participantId,p_alias:d.alias.trim(),p_level:d.level,p_points:d.points},returnRecords:true});
  return respond(200,{recorded:true,status:'practice',data});
 }catch(e){console.error('Guardar práctica',String(e));return respond(503,{error:'No se pudo guardar el récord en línea'})}
};
