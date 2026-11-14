const CACHE='cosmic-cat-v5';
const CORE=['./','./index.html','./styles.css','./game.js','./renderer3d.js','./engine-data.js','./engine.wasm','./manifest.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// La página siempre se pide a la red (nunca una versión vieja); los demás
// archivos se sirven de caché y se refrescan en segundo plano (SWR).
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const req=event.request;
 let path='';
 try{path=new URL(req.url).pathname.toLowerCase();}catch(_){}
 const isDoc=req.mode==='navigate'||req.destination==='document'||path.endsWith('index.html');
 if(isDoc){
  event.respondWith(fetch(req).then(response=>{
   const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return response;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
  return;
 }
 event.respondWith(caches.match(req).then(hit=>{
  const refresh=fetch(req).then(response=>{
   if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
   return response;
  }).catch(()=>null);
  if(hit)return hit;
  return refresh.then(response=>response||caches.match('./index.html'));
 }));
});
