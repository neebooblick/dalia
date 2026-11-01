import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, relative, sep } from 'node:path';
import { chromium } from 'playwright-core';

const root = process.cwd();
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8' };
const server = createServer(async (req,res)=>{
 try {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = resolve(root, '.'+ (pathname==='/'?'/index.html':pathname));
  const rel=relative(root,file);
  if(rel.startsWith('..'+sep)||rel==='..'||rel.startsWith('/')) {res.writeHead(403);res.end('Forbidden');return}
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(bytes);
 }catch(error){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port, local='http://127.0.0.1:'+port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
async function test(name,fn,options={}){
 const context=await browser.newContext({viewport:options.mobile?{width:options.width||390,height:844}:{width:1440,height:900},isMobile:!!options.mobile,hasTouch:!!options.mobile,deviceScaleFactor:options.mobile?2:1,serviceWorkers:'allow'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(local,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.word-card').first().waitFor({state:'attached',timeout:20000});
  await fn(page);
  assert.deepEqual(errors,[],'Unhandled JavaScript errors');
  results.push({name,status:'PASS'});
 }catch(error){
  results.push({name,status:'FAIL',error:String(error.stack||error).slice(0,1500),pageErrors:errors});
  try{await mkdir('test-results',{recursive:true}); await page.screenshot({path:'test-results/'+name.replace(/[^a-z0-9-]/gi,'-')+'.png',fullPage:true,timeout:8000})}catch(_){}
 }finally{await context.close()}
}
const getState=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('dalia_state_v7')||'{}'));
try{
 await test('Initial load and dictionary',async page=>{
  assert.ok(await page.locator('.word-card').count()>=24);
  assert.match(await page.locator('#word-count').innerText(),/\d+ из \d+/);
  assert.ok(await page.locator('.word-card .glyph').first().innerText());
 });
 await test('Search by Chinese and pinyin',async page=>{
  const search=page.locator('#word-search');
  await search.fill('你好');
  assert.ok(await page.locator('.word-card').count()>=1);
  await search.fill('ni hao');
  assert.ok(await page.locator('.word-card').count()>=1);
  await search.fill('невозможное_несуществующее_слово_123');
  assert.equal(await page.locator('.word-card').count(),0);
  await search.fill('');
  assert.ok(await page.locator('.word-card').count()>1);
 });
 await test('Catalog HSK filter',async page=>{
  await page.locator('[data-level="1"]').click();
  assert.match(await page.locator('#word-count').innerText(),/\d+ из \d+/);
  assert.ok(await page.locator('.word-card').count()>0);
 });
 await test('Mark learned and survive reload',async page=>{
  const ch=await page.locator('.word-card .glyph').first().innerText();
  await page.locator('.word-card').first().click();
  await page.locator('.study-toggle').click();
  assert.ok((await getState(page)).learned.includes(ch));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.word-card').first().waitFor();
  assert.ok((await getState(page)).learned.includes(ch));
  await page.locator('.word-card').first().click();
  assert.match(await page.locator('.study-toggle').innerText(),/Изучено/);
 });
 await test('Favorite persists and can be removed',async page=>{
  const ch=await page.locator('.word-card .glyph').first().innerText();
  await page.locator('.word-card').first().locator('button.star').click();
  assert.ok((await getState(page)).favorites.includes(ch));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.word-card').first().waitFor();
  assert.ok((await getState(page)).favorites.includes(ch));
  await page.locator('.word-card').first().locator('button.star').click();
  assert.ok(!(await getState(page)).favorites.includes(ch));
 });
 await test('Practice meaning and answer feedback',async page=>{
  await page.locator('[data-page="practice"]').first().click();
  await page.locator('#quiz-area .option').first().waitFor();
  await page.locator('#quiz-area .option').first().click();
  await page.locator('#quiz-area .answer-summary').waitFor();
  const state=await getState(page);
  assert.ok(state.quizTotals.correct+state.quizTotals.wrong>=1);
  await page.locator('#quiz-area .next-practice').click();
  await page.locator('#quiz-area .option').first().waitFor();
 });
 await test('Practice reverse answer reveal',async page=>{
  await page.locator('[data-page="practice"]').first().click();
  await page.locator('[data-mode="reverse"]').click();
  await page.locator('.recall-input').waitFor();
  await page.getByRole('button',{name:'Посмотреть ответ'}).click();
  await page.locator('#quiz-area .answer-summary').waitFor();
  assert.ok((await getState(page)).quizTotals.wrong>=1);
 });
 await test('Listening requires audio first',async page=>{
  await page.locator('[data-page="practice"]').first().click();
  await page.locator('[data-mode="listening"]').click();
  const unavailable=await page.locator('#listening-unavailable').count();
  if(unavailable){assert.match(await page.locator('#listening-unavailable').innerText(),/китайский голос/i);return}
  assert.ok(await page.getByRole('button',{name:/Прослушать слово/}).isVisible());
  const buttons=page.locator('#quiz-area .option');
  assert.ok(await buttons.count()>0);
  assert.ok(await buttons.first().isDisabled(),'Choice should not be enabled before speech start');
 });
 await test('Writing mode renders guidance or graceful failure',async page=>{
  await page.locator('[data-page="practice"]').first().click();
  await page.locator('[data-mode="writing"]').click();
  await page.locator('#quiz-area .writing-status').waitFor();
  assert.ok(await page.locator('#quiz-area .writing-draw-target').count()>0);
 });
 await test('Photo tab input',async page=>{
  await page.locator('[data-page="photo"]').first().click();
  assert.ok(await page.locator('#photo-gallery-input').count()===1);
  assert.ok(await page.locator('#photo-input').count()===1);
 });
 await test('Wisdom and settings',async page=>{
  await page.locator('[data-page="motivation"]').first().click();
  assert.ok(await page.locator('#page-motivation').isVisible());
  await page.locator('#settings-open').click();
  assert.ok(await page.locator('#modal-overlay').isVisible());
  assert.match(await page.locator('.settings-panel').innerText(),/резервн|копи|озвучиван/i);
  await page.locator('#modal-close').click();
  assert.ok(await page.locator('#modal-overlay').isHidden());
 });

 await test('Report only in settings and link prefilled with word',async page=>{
  await page.locator('.word-card').first().click();
  assert.equal(await page.getByRole('button',{name:'Сообщить об ошибке'}).count(),0);
  await page.locator('#modal-close').click();
  await page.locator('#settings-open').click();
  await page.getByRole('button',{name:'Сообщить об ошибке'}).click();
  assert.ok(await page.locator('#word-report-kind').isVisible());
  assert.ok(await page.locator('#word-report-word').isVisible());
  await page.locator('#word-report-word').fill('你好');
  await page.locator('#word-report-kind').selectOption('Ошибка в пиньине');
  await page.locator('#word-report-details').fill('Пожалуйста, проверьте чтение слова.');
  await page.evaluate(()=>{window.open=url=>{window.__lastReportUrl=url;return {}}});
  await page.getByRole('button',{name:'Продолжить на GitHub'}).click();
  const url=await page.evaluate(()=>window.__lastReportUrl);
  assert.ok(url?.startsWith('https://github.com/neebooblick/dalia/issues/new?'));
  const link=new URL(url);
  assert.ok(link.searchParams.get('title').includes('你好'));
  assert.ok(link.searchParams.get('body').includes('Пожалуйста, проверьте чтение слова.'));
  assert.ok(!link.searchParams.get('body').includes('dalia_state_v7'));
  await page.getByRole('button',{name:'Назад к настройкам'}).click();
  assert.ok(await page.locator('.settings-panel').isVisible());
 });
 await test('Generic site feedback and no practice report button',async page=>{
  await page.locator('[data-page="practice"]').first().click();
  await page.locator('#quiz-area .option').first().click();
  assert.equal(await page.getByRole('button',{name:'Нашёл ошибку в карточке?'}).count(),0);
  await page.locator('#settings-open').click();
  await page.getByRole('button',{name:'Сообщить об ошибке'}).click();
  await page.locator('#word-report-kind').selectOption('Ошибка в работе сайта');
  await page.locator('#word-report-details').fill('Кнопка на телефоне перекрывает текст.');
  await page.evaluate(()=>{window.open=url=>{window.__lastReportUrl=url;return {}}});
  await page.getByRole('button',{name:'Продолжить на GitHub'}).click();
  const url=new URL(await page.evaluate(()=>window.__lastReportUrl));
  assert.ok(url.searchParams.get('title').includes('Ошибка в работе сайта'));
  assert.ok(!url.searchParams.get('body').includes('Слово или иероглиф'));
 });
 await test('Settings report button layout desktop and mobile',async page=>{
  await page.locator('#settings-open').click();
  const details=await page.locator('.settings-feedback').evaluate(section=>{
   const button=section.querySelector('.settings-report-button');
   const br=button.getBoundingClientRect();
   const sr=section.getBoundingClientRect();
   const sc=getComputedStyle(section),bc=getComputedStyle(button);
   const contentWidth=sr.width-parseFloat(sc.paddingLeft)-parseFloat(sc.paddingRight);
   return {buttonWidth:br.width,contentWidth,buttonHeight:br.height,left:br.left,right:br.right,sectionLeft:sr.left,sectionRight:sr.right,display:bc.display,align:bc.alignItems,justify:bc.justifyContent};
  });
  assert.ok(Math.abs(details.buttonWidth-details.contentWidth)<3,'Report button not full-width: '+JSON.stringify(details));
  assert.ok(details.buttonHeight>=48,'Report button is too short: '+JSON.stringify(details));
  assert.equal(details.display,'flex');
  assert.equal(details.justify,'center');
  assert.ok(details.left>=details.sectionLeft-2&&details.right<=details.sectionRight+2);
 });
 await test('Mobile report button fits in settings',async page=>{
  await page.locator('#settings-open').click();
  const details=await page.locator('.settings-feedback').evaluate(section=>{
   const button=section.querySelector('.settings-report-button');
   const br=button.getBoundingClientRect(),sr=section.getBoundingClientRect();
   const cs=getComputedStyle(section);
   return {buttonWidth:br.width,available:sr.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),buttonHeight:br.height,left:br.left,right:br.right,viewport:innerWidth,sectionRight:sr.right};
  });
  assert.ok(Math.abs(details.buttonWidth-details.available)<3,'Mobile button width mismatch: '+JSON.stringify(details));
  assert.ok(details.buttonHeight>=48&&details.left>=-2&&details.right<=details.viewport+2,'Mobile button overflow: '+JSON.stringify(details));
 },{mobile:true});
 await test('Narrow screen label legibility',async page=>{
  const values=await page.evaluate(()=>{
   const nav=document.querySelector('.mobile-nav [data-page="learn"]');
   const meaning=document.querySelector('.word-card .meaning');
   return {navSize:parseFloat(getComputedStyle(nav).fontSize),meaningSize:parseFloat(getComputedStyle(meaning).fontSize),width:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(values.navSize>=11,'Navigation label too small: '+JSON.stringify(values));
  assert.ok(values.meaningSize>=12,'Card translation too small: '+JSON.stringify(values));
  assert.ok(values.width<=values.viewport+2,'New typography caused overflow');
 },{mobile:true});
 await test('320-pixel navigation and translation readability',async page=>{
  const x=await page.evaluate(()=>{
   const nav=document.querySelector('.mobile-nav [data-page="learn"]');
   const meaning=document.querySelector('.word-card .meaning');
   return {nav:parseFloat(getComputedStyle(nav).fontSize),meaning:parseFloat(getComputedStyle(meaning).fontSize),width:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(x.nav>=11&&x.meaning>=12&&x.width<=x.viewport+2,'Small phone typography: '+JSON.stringify(x));
 },{mobile:true,width:320});
 await test('Mobile UI and card interaction',async page=>{
  const size=await page.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.viewport+4,'Horizontal viewport overflow: '+JSON.stringify(size));
  assert.ok(await page.locator('.word-card').first().isVisible());
  await page.locator('.word-card').first().click();
  assert.ok(await page.locator('#modal-overlay').isVisible());
  const modal=await page.evaluate(()=>{const r=document.querySelector('.modal').getBoundingClientRect();return{left:r.left,right:r.right,viewport:innerWidth}});
  assert.ok(modal.left>=-2&&modal.right<=modal.viewport+2,'Modal out of mobile viewport: '+JSON.stringify(modal));
 },{mobile:true});
}finally{await browser.close();await new Promise(r=>server.close(r))}
const failures=results.filter(r=>r.status==='FAIL');
console.log(JSON.stringify({checkedAt:new Date().toISOString(),local,passed:results.length-failures.length,failed:failures.length,results},null,2));
if(failures.length)process.exitCode=1;
