// Dalia 7.8.8 — offline app shell. External voice/handwriting tools are not cached or promised offline.
const CACHE='dalia-app-v8.4.8-settings-fix';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./assets/dalia-style-v8.2.0.css?v=8.4.5','./assets/dalia-data-v8.1.1.js','./assets/dalia-hsk-v1.js','./assets/dalia-translation-v1.js','./assets/dalia-app-v8.2.0.js?v=8.4.7','./assets/dalia-pilot-100-v1.js','./vocabulary-sources.html','./dictionary-sources.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dalia-app-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 const english=new URL('./english/',self.registration.scope);
 if(url.pathname===english.pathname.slice(0,-1)||url.pathname.startsWith(english.pathname))return;
 const fresh=request.mode==='navigate'||/\.(?:js|css|webmanifest)$/.test(url.pathname);
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(!fresh){const hit=await cache.match(request);if(hit)return hit}
  try{const response=await fetch(request,fresh?{cache:'no-cache'}:undefined);
   if(response.ok){cache.put(request,response.clone()).catch(()=>{});return response}
   if(response.status<500)return response;
   return await cache.match(request)||response
  }catch{return await cache.match(request)||Response.error()}
 })())
});
