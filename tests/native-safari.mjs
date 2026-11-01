import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { Builder, By, until } from 'selenium-webdriver';

const root=process.cwd();
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const rel=relative(root,path);
  if(rel==='..'||rel.startsWith('..'+sep))throw Error('Forbidden path');
  const content=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(content);
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const site='http://127.0.0.1:'+server.address().port+'/';
const results=[];
let driver;
const step=async(name,callback)=>{
 try{await callback();results.push({name,status:'PASS'})}
 catch(err){results.push({name,status:'FAIL',error:String(err.stack||err).slice(0,1800)})}
};
try{
 driver=await new Builder().forBrowser('safari').build();
 await driver.manage().setTimeouts({pageLoad:30000,script:20000,implicit:1500});
 await step('Actual macOS Safari launches dalia',async()=>{
  await driver.get(site);
  await driver.wait(until.elementLocated(By.css('.word-card')),15000);
  assert.ok((await driver.findElements(By.css('.word-card'))).length>20);
  assert.ok((await driver.getTitle()).toLowerCase().includes('dalia'));
 });
 await step('Actual Safari opens card and marks learned',async()=>{
  await driver.findElement(By.css('.word-card')).click();
  await driver.wait(until.elementLocated(By.css('.study-toggle')),7000);
  await driver.findElement(By.css('.study-toggle')).click();
  const learned=await driver.executeScript("return JSON.parse(localStorage.getItem('dalia_state_v7')||'{}').learned");
  assert.ok(Array.isArray(learned)&&learned.length>0);
  await driver.findElement(By.css('#modal-close')).click();
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('.word-card')),15000);
  const restored=await driver.executeScript("return JSON.parse(localStorage.getItem('dalia_state_v7')||'{}').learned");
  assert.ok(restored.length>0);
 });
 await step('Actual Safari quiz selection and next card',async()=>{
  const nav=await driver.findElement(By.css('.topnav [data-page="practice"]'));
  await nav.click();
  await driver.wait(until.elementLocated(By.css('#quiz-area .option')),15000);
  await driver.findElement(By.css('#quiz-area .option')).click();
  await driver.wait(until.elementLocated(By.css('#quiz-area .answer-summary')),7000);
  await driver.findElement(By.css('#quiz-area .next-practice')).click();
  assert.ok((await driver.findElements(By.css('#quiz-area .option'))).length>1);
 });
 await step('Actual Safari settings and feedback dialog',async()=>{
  await driver.findElement(By.css('#settings-open')).click();
  const report=await driver.findElement(By.css('.settings-report-button'));
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"})',report);
  await report.click();
  await driver.wait(until.elementLocated(By.css('#word-report-kind')),7000);
  assert.ok(await driver.findElement(By.css('#word-report-details')).isDisplayed());
  await driver.findElement(By.css('.word-report-back')).click();
  assert.ok(await driver.findElement(By.css('.settings-panel')).isDisplayed());
 });
 await step('Actual Safari screen width and modal geometry',async()=>{
  const data=await driver.executeScript('return {w:window.innerWidth,doc:document.documentElement.scrollWidth,modal:(()=>{const r=document.querySelector(".modal").getBoundingClientRect();return {left:r.left,right:r.right}})()}');
  assert.ok(data.doc<=data.w+2&&data.modal.left>=-2&&data.modal.right<=data.w+2,JSON.stringify(data));
 });
}finally{
 try{if(driver)await driver.quit()}catch(_){}
 await new Promise(r=>server.close(r));
}
const failures=results.filter(r=>r.status==='FAIL');
console.log('NATIVE_SAFARI_RESULT:'+JSON.stringify({browser:'Safari macOS WebDriver',checkedAt:new Date().toISOString(),passed:results.length-failures.length,failed:failures.length,results}));
if(failures.length)process.exitCode=1;
