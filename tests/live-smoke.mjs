import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const site=process.env.DALIA_PUBLIC_URL || 'https://daliastudy.ru/';
const assets=['assets/dalia-style-v8.1.2.css','assets/dalia-data-v8.1.1.js','assets/dalia-app-v8.1.2.js'];
const outcome={site,checkedAt:new Date().toISOString(),http:[],browser:null};
const fetchWithTimeout=async url=>{
 const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'Cache-Control':'no-cache'}});
 const text=await res.text();return {status:res.status,bytes:Buffer.byteLength(text),text,finalUrl:res.url};
};
try{
 const root=await fetchWithTimeout(site);
 outcome.http.push({resource:'/',status:root.status,bytes:root.bytes,url:root.finalUrl});
 assert.equal(root.status,200,'Published homepage must return HTTP 200');
 assert.match(root.text,/dalia-app-v8\.1\.2\.js/,'Published HTML has not been updated yet');
 for(const path of assets){
  const url=new URL(path,site).href;
  const res=await fetchWithTimeout(url);
  outcome.http.push({resource:path,status:res.status,bytes:res.bytes});
  assert.equal(res.status,200,'Missing production asset: '+path);
  assert.ok(res.bytes>500,'Empty production asset: '+path);
 }
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  await page.locator('.word-card').first().waitFor({timeout:20000});
  assert.equal(errors.length,0,'Production browser JavaScript errors: '+errors.join(' | '));
  outcome.browser={loaded:true,wordCards:await page.locator('.word-card').count(),title:await page.title(),pageErrors:errors};
 }finally{await browser.close()}
 console.log('PRODUCTION SMOKE PASS\n'+JSON.stringify(outcome,null,2));
}catch(error){
 outcome.error=String(error.stack||error);
 console.error('PRODUCTION SMOKE FAILED\n'+JSON.stringify(outcome,null,2));
 process.exitCode=1;
}