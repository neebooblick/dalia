// English app only. Do not modify or purge the Chinese app's cache.
const CACHE='dalia-english-shell-v73';
const PREFIX='dalia-english-shell-';
const base=new URL(self.registration.scope);
const shell=['./','./index.html','./app.js?v=69','./blue.css?v=7','./grammar-data.js?v=4','./grammar.js?v=5','./manifest.webmanifest','../icons/icon-192.png','../icons/icon-512.png'].map(path=>new URL(path,base).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(shell.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key)}await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==base.origin)return;
 if(req.mode==='navigate'&&url.pathname.startsWith(base.pathname)){
  event.respondWith((async()=>{let response;try{response=await fetch(req,{cache:'no-store'});if(response.status<500)return response}catch{}const cache=await caches.open(CACHE);return await cache.match(new URL('./',base).href)||await cache.match(new URL('./index.html',base).href)||response||Response.error()})());return
 }
 if(!shell.includes(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(req)||fetch(req)})())
});
