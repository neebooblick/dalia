import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('assets/language-choice-v1.js','utf8');
function run(path,saved,blocked=false){
 const nodes=[];let redirect;
 function node(tag){const n={tag,children:[],events:{},append(...items){this.children.push(...items);},prepend(x){this.children.unshift(x);},setAttribute(){},addEventListener(e,f){this.events[e]=f;},showModal(){this.open=true;},close(){this.open=false;},remove(){this.removed=true;}};nodes.push(n);return n;}
 const body=node('body');const values=new Map(saved?[['dalia_study_language_v1',saved]]:[]);
 const document={body,currentScript:{src:'https://example.test/dalia/assets/language-choice-v1.js'},createElement:node,addEventListener(){},getElementById(){return null;}};
 vm.runInNewContext(source,{document,URL,location:{pathname:path,search:'',hash:'',replace(x){redirect=x;}},localStorage:{getItem(k){if(blocked)throw Error();return values.get(k);},setItem(k,v){if(blocked)throw Error();values.set(k,v);}},MutationObserver:class{observe(){}}});
 return {nodes,body,values,redirect};
}
let r=run('/dalia/');assert.equal(r.body.children[0].open,true);
r.nodes.find(n=>n.tag==='a'&&n.children[0].textContent==='Английский').events.click({preventDefault(){}});
assert.equal(r.values.get('dalia_study_language_v1'),'en');
assert.equal(run('/dalia/','en').redirect,'https://example.test/dalia/english/');
assert.equal(run('/dalia/','zh').redirect,undefined);
assert.equal(run('/dalia/english/','en').redirect,undefined);
assert.equal(run('/dalia/',undefined,true).body.children[0].open,true);
const handlers={};const cached=[];
vm.runInNewContext(readFileSync('sw.js','utf8'),{URL,self:{registration:{scope:'https://example.test/dalia/'},location:{origin:'https://example.test'},addEventListener(t,f){handlers[t]=f;}},fetch:async()=>{throw Error('offline');},caches:{match:async key=>{cached.push(key);return {ok:true};}},Response});
for(const path of ['english/','index.html','privacy.html']){
 let response;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/dalia/'+path},respondWith(p){response=p;}});await response;
}
assert.equal(cached[0],'https://example.test/dalia/english/');assert.equal(cached[1],'https://example.test/dalia/index.html');assert.equal(cached[2].url,'https://example.test/dalia/privacy.html');
console.log('PASS: first visit, language persistence, redirect, blocked storage, offline page isolation');
