'use strict';
const START=Date.parse('2026-11-09T08:00:00Z');
const END=Date.parse('2026-11-16T08:00:00Z');
function phase(){const t=Date.now();return t<START?'upcoming':t>=END?'finished':'active'}
function respond(status,obj){return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(obj)}}
function parse(event){if((event.body||'').length>5000)throw Error('Petición demasiado grande');return JSON.parse(event.body||'{}')}
function config(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!url.startsWith('https://'))throw Error('Falta configurar Supabase en Netlify');return {url:url.replace(/\/$/,''),key};}
async function db(path,{method='GET',body,returnRecords=false}={}){
 const {url,key}=config();
 const headers={'apikey':key,'Content-Type':'application/json','Accept':'application/json',Prefer:returnRecords?'return=representation':'return=minimal'};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const res=await fetch(url+'/rest/v1/'+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const txt=await res.text();let data;try{data=JSON.parse(txt)}catch(e){data=txt}
 if(!res.ok){console.error('Supabase',res.status,typeof data==='object'?data.code:'');throw Error('Base de datos no disponible')}
 return data;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
module.exports={START,END,phase,respond,parse,db,uuid};
