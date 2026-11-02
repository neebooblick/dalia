/* dalia English edition. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const STORAGE = "dalia_english_state_v1";
const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const DAY = 86400000;
const dictionary = (Array.isArray(window.DALIA_EN_WORDS) ? window.DALIA_EN_WORDS : [])
 .filter(r => Array.isArray(r) && r.length === 5 && LEVELS.includes(r[0]) && r.every(x => typeof x === "string" && x.trim()))
 .map(r => ({level:r[0],en:r[1],ru:r[2],example:r[3],exampleRu:r[4],id:r[1].toLocaleLowerCase("en").trim()}));
const wordMap = new Map();
for (const w of dictionary) if (!wordMap.has(w.id)) wordMap.set(w.id,w);
const words = [...wordMap.values()];
const idSet = new Set(words.map(w=>w.id));
const today = (d=new Date()) => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function dayAfter(n) {const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return today(d);}
function defaultState(){return {version:1,favorites:[],learned:[],autoLearned:[],studyDays:{},review:{},totals:{correct:0,wrong:0},mode:"meaning",practiceLevel:"all"};}
function uniqIds(a){return [...new Set(Array.isArray(a)?a.filter(x=>typeof x==="string" && idSet.has(x)):[])];}
function safeDate(s){return typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(new Date(s+"T12:00:00").getTime());}
function sanitize(raw){
 const s=defaultState();if(!raw||typeof raw!=="object"||Array.isArray(raw))return s;
 s.favorites=uniqIds(raw.favorites);s.learned=uniqIds(raw.learned);
 s.autoLearned=uniqIds(raw.autoLearned).filter(x=>s.learned.includes(x));
 if(raw.studyDays && typeof raw.studyDays==="object" && !Array.isArray(raw.studyDays)) for(const [id,days] of Object.entries(raw.studyDays)){
  if(!idSet.has(id)||!Array.isArray(days))continue;
  const clean=[...new Set(days.filter(safeDate))].sort().slice(-3);if(clean.length)s.studyDays[id]=clean;
 }
 if(raw.review && typeof raw.review==="object" && !Array.isArray(raw.review)) for(const [id,v] of Object.entries(raw.review)){
  if(!idSet.has(id)||!v||typeof v!=="object")continue;
  const cap=(n,max)=>Number.isFinite(Number(n))?Math.max(0,Math.min(max,Math.floor(Number(n)))):0;
  s.review[id]={attempts:cap(v.attempts,100000),correct:cap(v.correct,100000),wrong:cap(v.wrong,100000),interval:cap(v.interval,365),next:safeDate(v.next)?v.next:"",last:safeDate(v.last)?v.last:""};
 }
 const capTotal=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(1000000,Math.floor(Number(n)))):0;
 s.totals={correct:capTotal(raw.totals?.correct),wrong:capTotal(raw.totals?.wrong)};
 if(["meaning","reverse","listening"].includes(raw.mode))s.mode=raw.mode;
 if(raw.practiceLevel==="all"||LEVELS.includes(raw.practiceLevel))s.practiceLevel=raw.practiceLevel;
 return s;
}
let state;
try{state=sanitize(JSON.parse(localStorage.getItem(STORAGE)||"null"));}catch(_){state=defaultState();}
let screen="words",filter="all",level="all",search="",limit=36,lastWord=null,phraseIndex=0;
let openWordId=null,previousFocus=null,toastTimer=null,previousQuizId="",currentQuiz=null;
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
const button=(label,cls,fn)=>{const el=make("button",cls,label);el.type="button";el.addEventListener("click",fn);return el;};
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify(state));return true;}
 catch(_){notify("Не удалось сохранить прогресс. Экспортируй резервную копию в настройках.");return false;}
}
function norm(v){return String(v||"").toLocaleLowerCase().replace(/ё/g,"е").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
function rank(w,q){
 if(!q)return 0;
 const a=norm(w.en),b=norm(w.ru),c=norm(w.example),d=norm(w.exampleRu);
 if(a===q)return 0;if(a.startsWith(q))return 1;if(b===q)return 2;if(b.startsWith(q))return 3;
 if(a.includes(q)||b.includes(q))return 4;
 if(c.includes(q)||d.includes(q))return 5;
 return Infinity;
}
const due=id=>{const r=state.review[id];if(r?.next)return r.next<=today();return state.learned.includes(id);};
function stats(){
 $("stat-total").textContent=words.length;
 $("stat-learned").textContent=state.learned.filter(id=>idSet.has(id)).length;
 $("stat-due").textContent=words.filter(w=>due(w.id)).length;
 $("stat-fav").textContent=state.favorites.length;
}
function notify(message){
 const t=$("toast");t.textContent=message;t.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true;},3600);
}
function speak(text,onStart){
 if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined"){
  notify("На этом устройстве недоступна озвучка.");return false;
 }
 try{
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="en-US";u.rate=.88;u.volume=1;
  const voices=window.speechSynthesis.getVoices();
  const voice=voices.find(v=>/^en[-_]/i.test(v.lang)) || voices.find(v=>/^en$/i.test(v.lang));
  if(voice)u.voice=voice;
  u.onstart=()=>{if(onStart)onStart();};
  u.onerror=()=>{notify("Не удалось воспроизвести слово. Проверь озвучку устройства.");};
  window.speechSynthesis.speak(u);return true;
 }catch(_){notify("Не удалось запустить озвучку.");return false;}
}
function renderWords(){
 const q=norm(search);
 const selected=words.filter(w=>(level==="all"||w.level===level)
  &&(filter==="all"||filter==="learned"&&state.learned.includes(w.id)||filter==="favorites"&&state.favorites.includes(w.id)||filter==="due"&&due(w.id))
  &&rank(w,q)!==Infinity);
 if(q)selected.sort((a,b)=>rank(a,q)-rank(b,q));
 $("catalog-count").textContent=selected.length+" из "+words.length+" слов";
 const grid=$("cards");grid.replaceChildren();
 if(!selected.length){grid.append(make("div","empty","Ничего не найдено. Попробуй другое слово или убери фильтр."));}
 for(const w of selected.slice(0,limit)){
  const card=make("article","word-card");
  const open=button("","word-open",()=>showWord(w.id));
  open.setAttribute("aria-label","Открыть "+w.en+", "+w.ru);
  open.append(make("span","card-level",w.level),make("span","card-word",w.en),make("span","card-meaning",w.ru));
  const actions=make("div","card-actions");
  actions.append(make("span","card-status",state.learned.includes(w.id)?"✓ изучено":""));
  const sound=button("♫","sound-btn",()=>speak(w.en));sound.setAttribute("aria-label","Прослушать "+w.en);
  const fav=state.favorites.includes(w.id);
  const heart=button(fav?"♥":"♡","heart"+(fav?" on":""),()=>{toggleFavorite(w.id);renderWords();});
  heart.setAttribute("aria-label",fav?"Убрать из избранного":"Добавить в избранное");
  actions.append(sound,heart);
  card.append(open,actions);grid.append(card);
 }
 $("more").hidden=selected.length<=limit;
 stats();
}
function toggleFavorite(id){
 if(!idSet.has(id))return;
 state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];
 save();stats();
}
function toggleLearned(id){
 if(!idSet.has(id))return;
 if(state.learned.includes(id)){
  state.learned=state.learned.filter(x=>x!==id);state.autoLearned=state.autoLearned.filter(x=>x!==id);
  if((state.studyDays[id]||[]).length>=3)state.studyDays[id]=state.studyDays[id].slice(0,2);
 }else state.learned=[...state.learned,id];
 save();renderWords();if(openWordId===id)showWord(id);
}
function noteStudy(id,correct){
 const t=today(),days=state.studyDays[id]||[];
 if(!correct){
  if(state.autoLearned.includes(id)){
   state.autoLearned=state.autoLearned.filter(x=>x!==id);
   state.learned=state.learned.filter(x=>x!==id);
  }
  if(days.length)state.studyDays[id]=days.slice(0,-1);
  return;
 }
 if(state.learned.includes(id) || days.includes(t))return;
 if(days.length){
  const last=new Date(days[days.length-1]+"T12:00:00");
  last.setDate(last.getDate()+(days.length===1?1:3));
  if(t<today(last))return;
 }
 const next=[...days,t].slice(-3);state.studyDays[id]=next;
 if(next.length===3){state.learned=uniqIds([...state.learned,id]);state.autoLearned=uniqIds([...state.autoLearned,id]);}
}
function record(id,correct){
 const r=state.review[id]||{attempts:0,correct:0,wrong:0,interval:0,next:"",last:""};
 r.attempts++;
 if(correct){r.correct++;const wasToday=r.last===today();r.interval=wasToday?Math.max(1,r.interval):Math.min(90,r.interval===0?1:Math.ceil(r.interval*2));r.next=dayAfter(r.interval);state.totals.correct++;noteStudy(id,true);}
 else{r.wrong++;r.interval=0;r.next=today();state.totals.wrong++;noteStudy(id,false);}
 r.last=today();state.review[id]=r;
 save();stats();
}
function showModal(title){
 previousFocus=document.activeElement;
 $("modal-title").textContent=title;$("modal-body").replaceChildren();
 $("overlay").hidden=false;document.body.style.overflow="hidden";$("modal-close").focus({preventScroll:true});
}
function closeModal(){
 $("overlay").hidden=true;document.body.style.overflow="";openWordId=null;
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
}
function showWord(id){
 const w=wordMap.get(id);if(!w)return;
 openWordId=id;showModal(w.en);
 const body=$("modal-body");
 const lev=make("div","detail-level",w.level+" · АНГЛИЙСКИЙ");
 const en=make("div","detail-word",w.en),ru=make("p","detail-meaning",w.ru);
 const example=make("div","detail-example");
 example.append(make("div","en",w.example),make("div","ru",w.exampleRu));
 const actions=make("div","detail-actions");
 actions.append(button("♫ Прослушать","button subtle",()=>speak(w.en)));
 actions.append(button(state.learned.includes(id)?"✓ Изучено · снять отметку":"✓ Изучить","button secondary",()=>toggleLearned(id)));
 actions.append(button(state.favorites.includes(id)?"♥ В избранном":"♡ В избранное","button secondary",()=>{
  toggleFavorite(id);showWord(id);renderWords();
 }));
 body.append(lev,en,ru,example,actions);
}
function navigate(to){
 if(!["words","practice","context","phrases"].includes(to))return;
 screen=to;
 for(const name of ["words","practice","context","phrases"])$("screen-"+name).hidden=name!==to;
 $("hero").hidden=to!=="words";
 document.querySelectorAll("[data-screen]").forEach(b=>{const active=b.dataset.screen===to;b.classList.toggle("is-active",active);b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
 if(to==="words")renderWords();if(to==="practice")newQuiz();if(to==="phrases")renderPhrases();
 window.scrollTo({top:0,behavior:"instant"});
}
function renderContext(){
 const raw=$("context-input").value.toLocaleLowerCase("en");
 const found=words.filter(w=>raw.includes(w.en.toLocaleLowerCase("en"))).slice(0,36);
 $("context-count").textContent=found.length?`${found.length} ${found.length===1?"слово найдено":"слов найдено"}`:"";
 const grid=$("context-results");grid.replaceChildren();
 if(!found.length){grid.append(make("div","empty","Подходящие слова появятся здесь."));return;}
 for(const w of found){const card=make("article","word-card");const open=button("","word-open",()=>showWord(w.id));open.append(make("span","card-level",w.level),make("span","card-word",w.en),make("span","card-meaning",w.ru));card.append(open);grid.append(card);}
}
function renderPhrases(){
 const examples=words.filter(w=>w.example&&w.exampleRu);if(!examples.length)return;
 phraseIndex=(phraseIndex+examples.length)%examples.length;const w=examples[phraseIndex];
 $("phrase-level").textContent=w.level+" · ПРИМЕР ИЗ СЛОВАРЯ";$("phrase-en").textContent=w.example;$("phrase-ru").textContent=w.exampleRu;$("phrase-speak").onclick=()=>speak(w.example);
 const grid=$("phrase-grid");grid.replaceChildren();
 for(const item of examples.slice(phraseIndex+1,phraseIndex+9)){const card=make("article","word-card phrase-card");card.append(make("span","card-level",item.level),make("span","phrase-en-small",item.example),make("span","card-meaning",item.exampleRu));grid.append(card);}
}
function scramble(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function practicePool(){
 return words.filter(w=>(state.practiceLevel==="all"||w.level===state.practiceLevel)&&(!$("due-only").checked||due(w.id)));
}
function questionChoices(w,kind,pool){
 const own=kind==="meaning"?w.ru:w.en;
 const alternatives=scramble(pool.filter(x=>x.id!==w.id)).slice(0,3).map(x=>kind==="meaning"?x.ru:x.en);
 const other=alternatives.length<3?scramble(words.filter(x=>x.id!==w.id&&!pool.some(z=>z.id===x.id))).slice(0,3-alternatives.length).map(x=>kind==="meaning"?x.ru:x.en):[];
 const unique=[...new Set([own,...alternatives,...other])];
 return scramble(unique.slice(0,4));
}
function showFeedback(w,correct,answer,picked,choiceButtons){
 const result=make("div","quiz-feedback "+(correct?"good":"bad"));
 const heading=make("strong","",correct?"Верно!":"Правильный ответ: "+answer);
 const context=make("div","",w.example+" — "+w.exampleRu);
 result.append(heading,context);
 const more=button("Следующая карточка →","button primary next-button",newQuiz);
 result.append(more);
 $("quiz").append(result);
 if(choiceButtons)for(const b of choiceButtons){
  b.disabled=true;
  if(b.textContent===answer)b.classList.add("correct");
  if(!correct && b.textContent===picked)b.classList.add("wrong");
 }
 more.focus({preventScroll:true});
}
function newQuiz(){
 const pool=practicePool(),area=$("quiz");area.replaceChildren();
 if(!pool.length){
  area.append(make("div","empty","В выбранной подборке пока нет слов. Попробуй другой уровень или отключи «Только к повторению»."));
  currentQuiz=null;return;
 }
 const candidates=pool.length>1?pool.filter(w=>w.id!==previousQuizId):pool;
 const w=candidates[Math.floor(Math.random()*candidates.length)]||pool[0];
 previousQuizId=w.id;const quizToken=Symbol("quiz");currentQuiz=quizToken;
 const mode=state.mode;
 area.append(make("div","quiz-step",mode==="meaning"?"Перевод · выбери значение":mode==="reverse"?"Вспомни английское слово":"Аудирование · только после прослушивания"));
 const prompt=make("div","quiz-prompt",mode==="meaning"?w.en:mode==="reverse"?w.ru:"♫");
 area.append(prompt);
 let finished=false;
 if(mode==="reverse"){
  const form=make("form","reverse-entry");
  const input=make("input","reverse-input");input.type="text";input.autocapitalize="none";input.autocomplete="off";input.spellcheck=false;input.placeholder="Напиши слово по-английски";input.setAttribute("aria-label","Напиши английское слово");
  const submit=make("button","button primary","Проверить");submit.type="submit";
  form.append(input,submit);area.append(form);
  const reveal=button("Показать ответ","button secondary",()=>{
   if(finished)return;finished=true;input.disabled=true;submit.disabled=true;reveal.disabled=true;record(w.id,false);showFeedback(w,false,w.en,"",null);
  });
  form.addEventListener("submit",e=>{
   e.preventDefault();if(finished||!input.value.trim())return;
   finished=true;const correct=norm(input.value)===norm(w.en);
   input.disabled=true;submit.disabled=true;reveal.disabled=true;
   input.style.borderColor=correct?"#72d99b":"#ff91a6";
   record(w.id,correct);showFeedback(w,correct,w.en,input.value,null);
  });
  area.append(reveal);return;
 }
 if(mode==="meaning"){
  area.append(make("p","quiz-hint","Выбери перевод. Не спеши — сначала вспомни ответ."));
  area.append(button("♫ Прослушать слово","button subtle listen-btn",()=>speak(w.en)));
 }else{
  area.append(make("p","quiz-hint","Сначала нажми «Прослушать». Ответы откроются после начала озвучивания."));
 }
 const grid=make("div","quiz-choices"),expected=mode==="meaning"?w.ru:w.en;
 const choices=questionChoices(w,mode,pool);
 const controls=[];
 for(const ch of choices){
  const option=button(ch,"quiz-choice",()=>{
   if(finished||currentQuiz!==quizToken)return;
   if(mode==="listening"&&!heard)return;
   finished=true;const ok=ch===expected;record(w.id,ok);showFeedback(w,ok,expected,ch,controls);
  });
  if(mode==="listening")option.disabled=true;
  controls.push(option);grid.append(option);
 }
 let heard=false;
 if(mode==="listening"){
  const listen=button("♫ Прослушать слово","button primary listen-btn",()=>{
   const token=quizToken;
   speak(w.en,()=>{if(currentQuiz!==token||finished)return;heard=true;for(const x of controls)x.disabled=false;});
  });
  area.append(listen);
 }
 area.append(grid);
}
function download(name,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function settings(){
 openWordId=null;showModal("Настройки и данные");
 const body=$("modal-body"),wrap=make("div","settings-copy");
 wrap.append(make("p","","Английская версия dalia хранит прогресс отдельно на этом устройстве."));
 wrap.append(make("h3","","Мой прогресс"));
 wrap.append(make("p","","Прогресс хранится в этом браузере. Чтобы перенести его на другое устройство, сохрани резервную копию."));
 const actions=make("div","settings-buttons");
 actions.append(button("↓ Сохранить копию","button primary",()=>{
  download("dalia-english-"+today()+".json",{app:"dalia-english",version:1,created:new Date().toISOString(),data:state});
  notify("Скачивание запрошено. Проверь сохранённый файл.");
 }));
 const label=make("label","button secondary","↑ Загрузить копию");
 const input=make("input","");input.type="file";input.accept=".json,application/json";
 input.addEventListener("change",async()=>{
  if(!input.files?.length)return;
  try{
   if(input.files[0].size>2000000)throw Error("Слишком большой файл.");
   const data=JSON.parse(await input.files[0].text());
   if(data?.app!=="dalia-english"||data?.version!==1||!data.data||typeof data.data!=="object")throw Error("Это не резервная копия dalia English.");
   if(!confirm("Объединить прогресс из резервной копии с текущим?"))return;
   const incoming=sanitize(data.data),merged=sanitize(state);
   merged.learned=uniqIds([...merged.learned,...incoming.learned]);
   merged.autoLearned=uniqIds([...merged.autoLearned,...incoming.autoLearned]).filter(x=>merged.learned.includes(x));
   merged.favorites=uniqIds([...merged.favorites,...incoming.favorites]);
   for(const [id,days] of Object.entries(incoming.studyDays))merged.studyDays[id]=[...new Set([...(merged.studyDays[id]||[]),...days])].sort().slice(-3);
   for(const [id,entry] of Object.entries(incoming.review)){
    const old=merged.review[id];if(!old||(entry.last||"")>(old.last||""))merged.review[id]=entry;
   }
   merged.totals={correct:Math.max(merged.totals.correct,incoming.totals.correct),wrong:Math.max(merged.totals.wrong,incoming.totals.wrong)};
   const previous=state;state=merged;
   if(!save()){state=previous;throw Error("Хранилище недоступно.");}
   closeModal();renderWords();if(screen==="practice")newQuiz();notify("Резервная копия объединена.");
  }catch(e){notify("Не удалось загрузить файл: "+(e.message||"неизвестная ошибка"));}
  finally{input.value="";}
 });
 label.append(input);actions.append(label);wrap.append(actions);
 wrap.append(make("p","setting-note","Автоматическое изучение: три успешных ответа в разные дни. Ручная кнопка «Изучить» тоже доступна."));
 wrap.append(make("h3","","О словаре"));
 wrap.append(make("p","","Стартовая подборка "+words.length+" слов A1–C2. Уровни ориентировочные; примеры и переводы подготовлены для первого выпуска. Внешняя регистрация не нужна."));
 body.append(wrap);
}
function init(){
 if(!words.length){notify("Словарь не загрузился. Обнови страницу.");return;}
 document.querySelectorAll("[data-screen]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.screen)));
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
 document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{
  filter=b.dataset.filter;limit=36;
  document.querySelectorAll("[data-filter]").forEach(x=>{x.classList.toggle("is-active",x===b);x.setAttribute("aria-pressed",String(x===b));});
  renderWords();
 }));
 $("search").addEventListener("input",e=>{search=e.target.value;limit=36;renderWords();});
 $("level").addEventListener("change",e=>{level=e.target.value;limit=36;renderWords();});
 $("more").addEventListener("click",()=>{limit+=36;renderWords();});
 $("random-word").addEventListener("click",()=>showWord(words[Math.floor(Math.random()*words.length)].id));
 $("context-find").addEventListener("click",renderContext);
 $("phrase-next").addEventListener("click",()=>{phraseIndex++;renderPhrases();});
 $("settings").addEventListener("click",settings);
 $("mobile-settings").addEventListener("click",settings);
 $("modal-close").addEventListener("click",closeModal);
 $("overlay").addEventListener("click",e=>{if(e.target===$("overlay"))closeModal();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("overlay").hidden)closeModal();});
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{
  state.mode=b.dataset.mode;save();
  document.querySelectorAll("[data-mode]").forEach(x=>{x.classList.toggle("is-active",x===b);x.setAttribute("aria-pressed",String(x===b));});
  newQuiz();
 }));
 document.querySelectorAll("[data-mode]").forEach(b=>{const a=b.dataset.mode===state.mode;b.classList.toggle("is-active",a);b.setAttribute("aria-pressed",String(a));});
 $("practice-level").value=state.practiceLevel;
 $("practice-level").addEventListener("change",e=>{state.practiceLevel=e.target.value;save();newQuiz();});
 $("due-only").addEventListener("change",newQuiz);
 stats();renderWords();
}
init();
})();
