import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, relative, sep } from "node:path";
import { chromium } from "playwright-core";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  let path=decodeURIComponent(url.pathname);
  if(path.endsWith("/"))path+="index.html";
  const file=resolve(root,"."+path),rel=relative(root,file);
  if(rel===".."||rel.startsWith(".."+sep)||rel.startsWith("/")){res.writeHead(403);res.end();return;}
  const bytes=await readFile(file);
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-cache"});res.end(bytes);
 }catch(e){res.writeHead(404);res.end("Not found");}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const url="http://127.0.0.1:"+server.address().port+"/english/";
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
const results=[];
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("dalia_english_state_v1")||"null"));
async function test(name,fn,{mobile=false,width=390}={}){
 const context=await browser.newContext({viewport:{width:mobile?width:1440,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator(".word-card").first().waitFor({timeout:15000});
  await fn(page);
  assert.deepEqual(errors,[],"Unexpected JS exceptions");
  results.push({name,pass:true});
 }catch(e){results.push({name,pass:false,error:String(e.stack||e).slice(0,2300)});}
 finally{await context.close();}
}
try{
 await test("Dictionary and level coverage",async page=>{
  assert.equal(await page.locator("#stat-total").innerText(),"257");
  assert.equal(await page.locator(".word-card").count(),36);
  const data=await page.evaluate(()=>window.DALIA_EN_WORDS);
  assert.equal(data.length,257);
  assert.ok(["A1","A2","B1","B2","C1","C2"].every(l=>data.some(w=>w[0]===l)));
  const ids=data.map(x=>x[1].toLowerCase());
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(data.every(w=>w.length===5&&w.every(x=>x&&typeof x==="string")));
 });
 await test("Bilingual search and relevance",async page=>{
  const search=page.locator("#search");
  await search.fill("airport");
  assert.equal(await page.locator(".card-word").first().innerText(),"airport");
  await search.fill("аэропорт");
  assert.equal(await page.locator(".card-word").first().innerText(),"airport");
  await search.fill("дешевый");
  assert.equal(await page.locator(".card-word").first().innerText(),"cheap");
  await search.fill("gibberish_no_word_123");
  assert.equal(await page.locator(".word-card").count(),0);
  await search.fill("");
  await page.locator("#level").selectOption("A2");
  await search.fill("airport");
  assert.equal(await page.locator(".card-word").first().innerText(),"airport");
  await page.locator("#level").selectOption("A1");
  assert.equal(await page.locator(".word-card").count(),0);
 });
 await test("Card audio and learned mark persist",async page=>{
  await page.locator(".word-open").first().click();
  const title=await page.locator("#modal-title").innerText();
  await page.getByRole("button",{name:"✓ Изучить"}).click();
  assert.ok((await state(page)).learned.includes(title));
  await page.locator("#modal-close").click();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".word-card").first().waitFor();
  assert.ok((await state(page)).learned.includes(title));
  await page.locator("[data-filter=learned]").click();
  assert.equal(await page.locator(".word-card").count(),1);
  assert.equal(await page.locator(".card-word").first().innerText(),title);
 });
 await test("Favorite persists and can be removed",async page=>{
  const id=await page.locator(".card-word").first().innerText();
  await page.locator(".word-card .heart").first().click();
  assert.ok((await state(page)).favorites.includes(id));
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".word-card").first().waitFor();
  await page.locator("[data-filter=favorites]").click();
  assert.equal(await page.locator(".word-card").count(),1);
  await page.locator(".word-card .heart").first().click();
  assert.equal((await state(page)).favorites.length,0);
 });
 await test("Correct meaning answer and next question",async page=>{
  await page.locator("[data-screen=practice]").first().click();
  const prompt=await page.locator(".quiz-prompt").innerText();
  const translation=await page.evaluate(word=>window.DALIA_EN_WORDS.find(w=>w[1]===word)?.[2],prompt);
  assert.ok(translation);
  await page.locator(".quiz-choice").filter({hasText:translation}).first().click();
  assert.equal((await state(page)).totals.correct,1);
  await page.locator(".quiz-feedback.good").waitFor();
  await page.locator(".next-button").click();
  assert.equal(await page.locator(".quiz-feedback").count(),0);
 });
 await test("Reverse answer including wrong case",async page=>{
  await page.locator("[data-screen=practice]").first().click();
  await page.locator("[data-mode=reverse]").click();
  await page.locator(".reverse-input").fill("not-the-word-123");
  await page.getByRole("button",{name:"Проверить"}).click();
  assert.equal((await state(page)).totals.wrong,1);
  await page.locator(".quiz-feedback.bad").waitFor();
  await page.locator(".next-button").click();
  const ru=await page.locator(".quiz-prompt").innerText();
  const en=await page.evaluate(text=>window.DALIA_EN_WORDS.find(w=>w[2]===text)?.[1],ru);
  assert.ok(en);
  await page.locator(".reverse-input").fill(en.toUpperCase());
  await page.getByRole("button",{name:"Проверить"}).click();
  assert.equal((await state(page)).totals.correct,1);
 });
 await test("Listening has no automatic audio or answer access",async page=>{
  await page.locator("[data-screen=practice]").first().click();
  await page.locator("[data-mode=listening]").click();
  assert.ok(await page.locator(".quiz-choice").count()>=3);
  const buttons=page.locator(".quiz-choice");
  assert.ok(await buttons.first().isDisabled());
  assert.ok(await page.getByRole("button",{name:"♫ Прослушать слово"}).isVisible());
  assert.equal((await state(page)).totals.correct,0);
 });
 await test("Backup export and safe import; Chinese storage untouched",async page=>{
  await page.evaluate(()=>localStorage.setItem("dalia_state_v7",JSON.stringify({learned:["你好"]})));
  await page.locator("#settings").click();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"↓ Сохранить копию"}).click();
  const saved=await download;
  assert.match(saved.suggestedFilename(),/^dalia-english-/);
  page.on("dialog",dialog=>dialog.accept());
  const backup={app:"dalia-english",version:1,data:{favorites:["airport"],learned:["airport"],autoLearned:[],studyDays:{},review:{},totals:{correct:12,wrong:0}}};
  await page.locator('input[type="file"]').setInputFiles({name:"backup.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(backup))});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("dalia_english_state_v1"))?.learned?.includes("airport"));
  assert.ok((await state(page)).favorites.includes("airport"));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("dalia_state_v7")).learned[0]),"你好");
 });
 await test("Mobile screen no horizontal overflow, modal fits",async page=>{
  const x=await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,visual:visualViewport.width,scroll:document.documentElement.scrollWidth}));
  assert.ok(x.client<=322 && x.width<=322 && x.scroll<=x.client+2,JSON.stringify(x));
  await page.locator(".word-open").first().click();
  const rect=await page.locator(".modal").evaluate(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,vp:innerWidth}});
  assert.ok(rect.left>=-2&&rect.right<=rect.vp+2,JSON.stringify(rect));
  await page.locator("#modal-close").click({timeout:8000});
  await page.locator(".mobile-nav [data-screen=practice]").click();
  assert.ok(await page.locator("#screen-practice").isVisible());
 },{mobile:true,width:320});
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}
const failures=results.filter(r=>!r.pass);
console.log(JSON.stringify({passed:results.length-failures.length,failed:failures.length,results},null,2));
if(failures.length)process.exitCode=1;
