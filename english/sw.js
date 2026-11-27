// English app only. Do not modify or purge the Chinese app's cache.
const CACHE='dalia-english-shell-v81';
const PREFIX='dalia-english-shell-';
const base=new URL(self.registration.scope);
const shell=['./','./index.html','./app.js?v=73','./blue.css?v=10','./grammar-data.js?v=6','./grammar.js?v=7','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'].map(path=>new URL(path,base).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(shell.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key)}await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==base.origin)return;
 if(req.mode==='navigate'&&url.pathname.startsWith(base.pathname)){
  event.respondWith((async()=>{let response;try{response=await fetch(req,{cache:'no-store'});if(response.status<500)return response}catch{}const cache=await caches.open(CACHE);return await cache.match(new URL('./',base).href)||await cache.match(new URL('./index.html',base).href)||response||Response.error()})());return
 }
 if(!shell.includes(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const fresh=/\.(?:js|css|webmanifest)$/.test(url.pathname);if(!fresh){const hit=await cache.match(req);if(hit)return hit}try{const response=await fetch(req,fresh?{cache:'no-cache'}:undefined);if(response.ok){cache.put(req,response.clone()).catch(()=>{});return response}if(response.status<500)return response;return await cache.match(req)||response}catch{return await cache.match(req)||Response.error()}})())
});
