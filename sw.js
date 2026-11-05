// Dalia 7.8.8 — offline app shell. External voice/handwriting/OCR tools are not cached or promised offline.
const CACHE='dalia-app-v8.4.0-hsk-6000';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./assets/dalia-style-v8.2.0.css','./assets/dalia-data-v8.1.1.js','./assets/dalia-hsk-v1.js','./assets/dalia-app-v8.2.0.js?v=8.2.0','./assets/dalia-pilot-100-v1.js','./vocabulary-sources.html','./dictionary-sources.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dalia-app-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  const key=request;
  event.respondWith(fetch(request).then(response=>{if(response.ok){const cloned=response.clone();caches.open(CACHE).then(cache=>cache.put(key,cloned)).catch(()=>{})}return response}).catch(async()=>await caches.match(key)||Response.error()));return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(request,clone)).catch(()=>{})}return response})))
});

