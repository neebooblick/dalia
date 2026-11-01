import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, relative, sep } from 'node:path';
import { webkit, devices } from 'playwright';

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
const browser=await webkit.launch({headless:true});
const results=[];
async function test(name,fn,options={}){
 const context=await browser.newContext(options.mobile?{...devices['iPhone 13'],viewport:{width:options.width||390,height:options.height||844},serviceWorkers:'allow'}:{viewport:{width:1440,height:900},serviceWorkers:'allow'});
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
  const validity=await page.locator('.word-report-form').evaluate(form=>({
   valid:form.checkValidity(),
   controls:[...form.querySelectorAll('input,select,textarea')].map(el=>({
    id:el.id,value:el.value,required:el.required,valid:el.validity.valid,
    validityMessage:el.validationMessage
   }))
  }));
  assert.ok(validity.valid,'Generic issue form unexpectedly invalid: '+JSON.stringify(validity));
  await page.evaluate(()=>{window.open=url=>{window.__lastReportUrl=url;return {}}});
  await page.getByRole('button',{name:'Продолжить на GitHub'}).click();
  const rawUrl=await page.evaluate(()=>window.__lastReportUrl);
  assert.ok(rawUrl,'GitHub issue link not opened, validity '+JSON.stringify(validity));
  const url=new URL(rawUrl);
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

 await test('Mobile Safari tab navigation and no horizontal overflow',async page=>{
  const nav=page.locator('.mobile-nav');
  assert.ok(await nav.isVisible());
  const tabs=[['practice','#page-practice'],['photo','#page-photo'],['motivation','#page-motivation'],['learn','#page-learn']];
  for(const [p,target] of tabs){
   await nav.locator('[data-page="'+p+'"]').click();
   assert.ok(await page.locator(target).isVisible(),p+' did not become visible');
   const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(dimensions.width<=dimensions.viewport+2,p+' horizontal overflow '+JSON.stringify(dimensions));
  }
 },{mobile:true});
 await test('Mobile Safari preferences, scrolling and feedback form',async page=>{
  await page.locator('#settings-open').click();
  await page.locator('.settings-report-button').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.settings-report-button').isVisible());
  await page.locator('.settings-report-button').click();
  await page.locator('#word-report-kind').selectOption('Ошибка в работе сайта');
  await page.locator('#word-report-details').fill('Пример ошибки в мобильной версии.');
  assert.ok(await page.locator('#word-report-details').isVisible());
  await page.getByRole('button',{name:'Назад к настройкам'}).click();
  assert.ok(await page.locator('.settings-panel').isVisible());
  const dims=await page.evaluate(()=>{const m=document.querySelector('.modal').getBoundingClientRect();return{left:m.left,right:m.right,vw:innerWidth,top:m.top,bottom:m.bottom,vh:innerHeight}});
  assert.ok(dims.left>=-2&&dims.right<=dims.vw+2&&dims.bottom<=dims.vh+3&&dims.top>=-2,'Modal off-screen: '+JSON.stringify(dims));
 },{mobile:true});
 await test('Mobile Safari word card buttons and saved progress',async page=>{
  await page.locator('.word-card').first().click();
  const ch=await page.locator('#modal-body .big-glyph').innerText();
  assert.ok(await page.locator('.study-toggle').isVisible());
  await page.locator('.study-toggle').click();
  assert.ok((await getState(page)).learned.includes(ch));
  await page.locator('#modal-close').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.word-card').first().waitFor();
  assert.ok((await getState(page)).learned.includes(ch));
 },{mobile:true});
 await test('Mobile Safari quiz answer, feedback and next',async page=>{
  await page.locator('.mobile-nav [data-page="practice"]').click();
  await page.locator('#quiz-area .option').first().click();
  await page.locator('#quiz-area .answer-summary').waitFor();
  await page.locator('#quiz-area .next-practice').click();
  assert.ok(await page.locator('#quiz-area .option').first().isVisible());
 },{mobile:true});
 await test('Mobile Safari listening does not autoplay',async page=>{
  await page.locator('.mobile-nav [data-page="practice"]').click();
  await page.locator('[data-mode="listening"]').click();
  if(await page.locator('#listening-unavailable').count())return;
  const choices=page.locator('#quiz-area .option');
  assert.ok(await choices.count()>0);
  assert.ok(await choices.first().isDisabled(),'Listening choices enabled without a play gesture');
  assert.ok(await page.getByRole('button',{name:/Прослушать слово/}).count()>0);
 },{mobile:true});
 await test('Mobile Safari handwriting field renders',async page=>{
  await page.locator('.mobile-nav [data-page="practice"]').click();
  await page.locator('[data-mode="writing"]').click();
  await page.locator('.writing-draw-target').waitFor();
  const bounds=await page.locator('.writing-draw-target').boundingBox();
  assert.ok(bounds?.width>160,'Writing target missing or zero width');
 },{mobile:true});
 await test('Small iPhone WebKit 320px layout',async page=>{
  const outer=await page.evaluate(()=>({w:document.documentElement.scrollWidth,inner:innerWidth}));
  assert.ok(outer.w<=outer.inner+2,'Horizontal scrolling: '+JSON.stringify(outer));
  await page.locator('.word-card').first().click();
  const modal=await page.locator('.modal').boundingBox();
  assert.ok(modal&&modal.x>=-2&&modal.x+modal.width<=320+2,'Card extends off-screen '+JSON.stringify(modal));
 },{mobile:true,width:320,height:700});
 await test('Large iPhone WebKit 430px layout',async page=>{
  await page.locator('#settings-open').click();
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,w:innerWidth,modal:document.querySelector('.modal').getBoundingClientRect().toJSON()}));
  assert.ok(dims.scroll<=dims.w+2&&dims.modal.right<=dims.w+2,'Settings overflow at 430px: '+JSON.stringify(dims));
 },{mobile:true,width:430,height:932});
}finally{await browser.close();await new Promise(r=>server.close(r))}
const failures=results.filter(r=>r.status==='FAIL');
console.log('SAFARI_WEBKIT_RESULT:'+JSON.stringify({engine:'WebKit (Playwright)',checkedAt:new Date().toISOString(),local,passed:results.length-failures.length,failed:failures.length,results}));
if(failures.length)process.exitCode=1;
