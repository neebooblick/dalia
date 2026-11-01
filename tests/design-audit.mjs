import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.json':'application/json;charset=utf-8','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(p==='/'?'/index.html':p));
  const rel=relative(root,file);
  if(rel==='..'||rel.startsWith('..'+sep))throw Error('Outside root');
  const value=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(value);
 }catch(_){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const audit=[];
const sample=async(page,id)=>{
 const report=await page.evaluate(()=>{
  const viewport={width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth};
  const all=[...document.querySelectorAll('*')];
  const visible=all.filter(el=>{const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight+40});
  const overflows=visible.filter(el=>{const r=el.getBoundingClientRect();return r.left< -5||r.right>innerWidth+5}).filter(el=>!['HTML','BODY'].includes(el.tagName)).slice(0,18).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:String(el.className).slice(0,65),text:el.textContent?.trim().slice(0,35),rect:[Math.round(r.left),Math.round(r.right)],w:Math.round(r.width)}});
  const relevant=visible.filter(el=>el.matches('button,a,input,select,textarea')).slice(0,140);
  const tiny=relevant.filter(el=>{const r=el.getBoundingClientRect();return r.height<32||r.width<28}).slice(0,20).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,text:el.textContent?.trim().slice(0,28),w:Math.round(r.width),h:Math.round(r.height),cls:String(el.className).slice(0,50)}});
  const modal=document.querySelector('.overlay:not(.hidden) .modal');
  const dialog=modal?{width:Math.round(modal.getBoundingClientRect().width),height:Math.round(modal.getBoundingClientRect().height),top:Math.round(modal.getBoundingClientRect().top),scrollHeight:modal.scrollHeight,clientHeight:modal.clientHeight,overflowY:getComputedStyle(modal).overflowY,bodyHeight:Math.round(document.querySelector('#modal-body').getBoundingClientRect().height)}:null;
  const headings=visible.filter(el=>['H1','H2','H3'].includes(el.tagName)).slice(0,10).map(el=>({tag:el.tagName,text:el.textContent?.trim().slice(0,70),size:getComputedStyle(el).fontSize}));
  return {viewport,overflows,tiny,dialog,headings};
 });
 const thumb=await page.screenshot({type:'jpeg',quality:60,fullPage:false});
 console.log('DALIA_AUDIT_IMAGE:'+id+':'+thumb.toString('base64'));
 audit.push({id,...report});
};
const scenes=[{name:'learn',go:async()=>{}},{name:'card',go:async page=>{await page.locator('.word-card').first().click()}},{name:'settings',go:async page=>{await page.locator('#settings-open').click()}},{name:'settings-bottom',go:async page=>{await page.locator('#settings-open').click();await page.locator('.settings-report-button').scrollIntoViewIfNeeded()}},{name:'feedback',go:async page=>{await page.locator('#settings-open').click();await page.getByRole('button',{name:'Сообщить об ошибке'}).click()}},{name:'practice',go:async page=>{await page.locator('[data-page="practice"]:visible').first().click()}},{name:'reverse',go:async page=>{await page.locator('[data-page="practice"]:visible').first().click();await page.locator('[data-mode="reverse"]').click()}},{name:'photo',go:async page=>{await page.locator('[data-page="photo"]:visible').first().click()}},{name:'wisdom',go:async page=>{await page.locator('[data-page="motivation"]:visible').first().click()}}];
try{
 for(const width of [320,390,768,1440]){
  for(const scene of scenes){
   if(width===320&&!['learn','card','settings','settings-bottom','practice'].includes(scene.name))continue;
   if(width===768&&!['learn','settings','practice'].includes(scene.name))continue;
   if(width===1440&&!['learn','settings','practice','wisdom'].includes(scene.name))continue;
   const context=await browser.newContext({viewport:{width,height:width<=390?844:900},deviceScaleFactor:1,isMobile:width<=390,hasTouch:width<=390});
   const page=await context.newPage();
   try{
    const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.locator('.word-card').first().waitFor({timeout:20000});
    await scene.go(page);
    await page.waitForTimeout(250);
    await sample(page,width+'-'+scene.name);
    if(errors.length)audit[audit.length-1].javascriptErrors=errors;
   }catch(e){audit.push({id:width+'-'+scene.name,error:String(e.stack||e).slice(0,1000)})}
   finally{await context.close()}
  }
 }
}finally{await browser.close();await new Promise(r=>server.close(r))}
console.log('DALIA_AUDIT_RESULT:'+JSON.stringify(audit));
