'use strict';
function dictionaryKey(value){return String(value||'').toLowerCase().replace(/u:|ü|ǖ|ǘ|ǚ|ǜ/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s’'·-]/g,'').replace(/([a-zv])[1-5](?=[a-zv]|$)/g,'$1')}
function dictionarySearch(rows,query,limit=40){
 const q=dictionaryKey(query);if(!q)return {rows:[],total:0};
 const exact=[],prefix=[],rest=[];
 for(const row of rows){const [ch,trad,pin,en]=row;const p=dictionaryKey(pin);
  if(ch===query||trad===query||p===q)exact.push(row);
  else if(ch.startsWith(query)||trad.startsWith(query)||p.startsWith(q))prefix.push(row);
  else if(ch.includes(query)||trad.includes(query)||en.toLowerCase().includes(query.toLowerCase()))rest.push(row);
 }
 return {rows:[...exact,...prefix,...rest].slice(0,Math.min(limit,400)),total:exact.length+prefix.length+rest.length};
}
if(typeof module!=='undefined')module.exports={dictionaryKey,dictionarySearch};
if(typeof self!=='undefined'&&typeof self.postMessage==='function'){
 let pending;
 const load=()=>pending??=(fetch('./dictionary/cedict.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).catch(e=>{pending=null;throw e}));
 self.onmessage=async({data})=>{try{const rows=await load();self.postMessage({id:data.id,...dictionarySearch(rows,data.query,data.limit),count:rows.length})}catch(e){self.postMessage({id:data.id,error:true})}};
}
