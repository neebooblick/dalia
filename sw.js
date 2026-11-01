// Dalia 7.8.8 — offline app shell. External voice/handwriting/OCR tools are not cached or promised offline.
const CACHE='dalia-app-v8.1.8-pilot100-20261101';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./assets/dalia-style-v8.1.6.css','./assets/dalia-data-v8.1.1.js','./assets/dalia-app-v8.1.3.js','./assets/dalia-pilot-100-v1.js','./vocabulary-sources.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dalia-app-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html'))){const cloned=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',cloned)).catch(()=>{})}return response}).catch(async()=>await caches.match('./index.html')||Response.error()));return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(request,clone)).catch(()=>{})}return response})))
});
