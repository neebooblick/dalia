'use strict';
const $=(id)=>document.getElementById(id);
const escapeHTML=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyOf=(s)=>String(s??'').normalize('NFKC').trim();
const searchKey=(s)=>String(s??'').toLocaleLowerCase().replace(/[üǖǘǚǜ]/g,'v').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s·’']/g,'').trim();
const pinyinSearchKey=s=>searchKey(s).replace(/([a-zv])[1-5](?=[a-zv]|$)/g,'$1');
// Compare each field separately: joining fields used to create false matches across boundaries.
// Keep pinyin tone-insensitive (including number-style tones), and rank headwords first.
const wordSearchCache=new WeakMap();
function wordSearchFields(w){
 let fields=wordSearchCache.get(w);
 if(!fields){
  fields={ch:searchKey(w.ch),pinyin:pinyinSearchKey(w.pinyin),meaning:searchKey(w.meaning),cn:searchKey(w.cn),ru:searchKey(w.ru)};
  wordSearchCache.set(w,fields);
 }
 return fields;
}
function searchScore(w,q){
 if(!q)return 0;
 const f=wordSearchFields(w),p=pinyinSearchKey(q);
 if(f.ch===q||f.pinyin===p)return 0;
 if(f.ch.startsWith(q)||f.pinyin.startsWith(p))return 1;
 if(f.meaning===q)return 2;
 if(f.meaning.startsWith(q))return 3;
 if(f.ch.includes(q)||f.pinyin.includes(p)||f.meaning.includes(q))return 4;
 if(f.cn.includes(q)||f.ru.includes(q))return 5;
 return Infinity;
}
const searchMatches=(w,q)=>searchScore(w,q)!==Infinity;
const isHanzi=(s)=>/^[\u3400-\u9fff\uf900-\ufaff]+$/u.test(s);
const unique=(list)=>[...new Set((Array.isArray(list)?list:[]).map(keyOf).filter(Boolean))];
const dayString=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const STORE='dalia_state_v7'; /* совместимое хранилище */
const LEGACY_SNAPSHOT='dalia_state_v7_before74';
try { const previous=localStorage.getItem(STORE);if(previous&&!localStorage.getItem(LEGACY_SNAPSHOT))localStorage.setItem(LEGACY_SNAPSHOT,previous) } catch(_) {}
const OLD_QUOTE_KEYS=["千里之行，始于足下。","不积跬步，无以至千里。","学无止境。","熟能生巧。","一分耕耘，一分收获。","失败是成功之母。","世上无难事，只怕有心人。","有志者事竟成。","温故而知新。","三人行，必有我师焉。","学而不思则罔，思而不学则殆。","坚持就是胜利。","百闻不如一见。","三思而后行。","欲速则不达。","滴水穿石。","铁杵磨成针。","天道酬勤。","笨鸟先飞。","勤能补拙。","温故知新。","活到老，学到老。","不耻下问。","举一反三。","实事求是。","言而有信。","说到做到。","知足常乐。","苦尽甘来。","先苦后甜。","水滴石穿。","日积月累。","循序渐进。","脚踏实地。","自强不息。","厚积薄发。","精益求精。","今天的努力，是明天的底气。","慢一点，也是在向前走。","每天进步一点点。","别急，成长需要时间。","你的坚持，会慢慢开花。","先开始，再变得更好。","小小的改变，也有力量。","把今天过好，就是进步。","不要低估自己的潜力。","再试一次，也许就成功了。","努力不一定很快，但不会白费。","行动比等待更有力量。","今天学会一个字，也值得开心。","梦想从脚下开始。","给自己一点耐心。","不怕路远，只怕不走。","每一次练习，都在积累力量。","把困难当成练习。","坚持让普通的日子闪光。","你可以从现在重新开始。","别和别人比，和昨天的自己比。","每一次错误，都藏着答案。","走自己的路，也能看到风景。","把好奇心带在身边。","认真生活，慢慢发光。","勇气不是不怕，而是继续。","新的一天，新的可能。","今天开始，永远不晚。","你走过的路，都算数。","不要因为慢，就停止。","学习是送给未来的礼物。","努力的人，总会遇见改变。","一页一页读，一步一步走。","让目标清楚，让脚步坚定。","不懂就问，不会就练。","明天的你，会感谢今天的自己。","别让一次失败定义你。","慢慢来，也是一种智慧。","从一件小事开始改变。","好习惯来自每天的选择。","你比想象中更有韧性。","每个清晨，都能重新出发。","给梦想一个具体的计划。","把大目标拆成小步骤。","先做好眼前的事。","时间会看见你的努力。","不要害怕问为什么。","好奇是学习的开始。","让进步成为日常。","把每一天都当成机会。"];
const normQuote=q=>String(q||'').replace(/[。！!?，,\s]/g,'');
const remapOldQuotes=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(i=>OLD_QUOTE_KEYS[i]).filter(Boolean).map(text=>QUOTE_DATA.findIndex(q=>normQuote(q[0])===normQuote(text))).filter(i=>i>=0))];
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const PRACTICE_LEVELS=['1','2','3','4','5','6','additional','custom'];
const DEFAULT_PRACTICE_LEVELS=['1','2','3','4','5','6','additional','custom'];
const validPracticeLevels=(value)=>Array.isArray(value)?PRACTICE_LEVELS.filter(x=>value.includes(x)||(x==='additional'&&['1','2','3','4','5','6','custom'].every(y=>value.includes(y)))||(/^[1-6]$/.test(x)&&value.includes('reference'))):[...DEFAULT_PRACTICE_LEVELS];
const initial=()=>({custom:[],drafts:[],hidden:[],learned:[],autoLearned:[],favorites:[],quoteFavorites:[],srs:{},daily:{},quizTotals:{correct:0,wrong:0},quoteSchema:2,ttsRate:1,ttsVolume:.85,uiSounds:true,ttsVoiceURI:'',writingGuideMode:'memory',writingStats:{},skillStats:{},studyDays:{},pinyinPreference:'adaptive',wisdomShowPinyin:true,version:7,practiceLevels:[...DEFAULT_PRACTICE_LEVELS]});
const approxPinyin=ch=>{const n=ch.codePointAt(0);return n>=0x4e00&&n<=0x9fff?PINYIN_MAP[n-0x4e00]||'':''};
const WISDOM_ONLY_KEYS=new Set([...QUOTE_DATA,...SAYING_CARD_DATA].map(q=>[...String(q[0])].filter(c=>isHanzi(c)).join('')));
const referenceRows=new Set(REFERENCE_HANZI_DATA),additionalRows=new Set(ADDITIONAL_WORD_DATA),hskRows=new Set(HSK_WORD_DATA),builtins=new Map();
for(const raw of [...WORD_DATA,...ADDITIONAL_WORD_DATA,...REFERENCE_HANZI_DATA,...HSK_WORD_DATA]){
 const ch=keyOf(raw[0]);
 if(WISDOM_ONLY_KEYS.has([...ch].filter(c=>isHanzi(c)).join('')))continue;
 const origin=hskRows.has(raw)?'hsk':referenceRows.has(raw)?'reference':additionalRows.has(raw)?'additional':'builtin';
 if(!builtins.has(ch)&&validWord({ch,pinyin:raw[1],meaning:raw[2],cn:raw[3],ru:raw[4],origin}))
  builtins.set(ch,{ch,pinyin:raw[1],meaning:raw[2],cn:raw[3],ru:raw[4],level:Number(raw[5]),origin});
}
function validWord(w){
 if(!w||!isHanzi(keyOf(w.ch)))return false;
 const cleanText=x=>typeof x==='string'&&x.trim()&&!/^(?:—|нет перевода|неизвестно|undefined|null|перевод не найден|пример не найден|translation unavailable)$/i.test(x.trim());
 const noHskExample=w.origin==='hsk'&&!w.cn&&!w.ru;
 if(!cleanText(w.pinyin)||!cleanText(w.meaning)||(!noHskExample&&(!cleanText(w.cn)||!cleanText(w.ru))))return false;
 const readings=w.pinyin.trim().match(/[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]+/g)||[];
 const pinyinValid=/^[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ\s·'’-]+$/.test(w.pinyin);
 if(readings.length!==[...keyOf(w.ch)].length||!pinyinValid||!/[А-Яа-яЁё]/.test(w.meaning))return false;
 if(noHskExample)return true;
 const sentenceHan=[...w.cn].filter(c=>isHanzi(c)).join('');
 return /[А-Яа-яЁё]/.test(w.ru)&&isHanzi(sentenceHan)&&(w.cn.includes(keyOf(w.ch))||(w.origin==='saying'&&sentenceHan.includes(keyOf(w.ch))));
}
function normalizeWord(w,origin='custom'){
  if(Array.isArray(w))return {ch:keyOf(w[0]),pinyin:String(w[1]||'').trim(),meaning:String(w[2]||'').trim(),cn:String(w[3]||'').trim(),ru:String(w[4]||'').trim(),level:'custom',origin};
  return {ch:keyOf(w?.ch),pinyin:String(w?.pinyin||'').trim(),meaning:String(w?.meaning||'').trim(),cn:String(w?.cn||'').trim(),ru:String(w?.ru||'').trim(),level:'custom',origin};
}
function cleanPhotoDrafts(items){
 const result=new Map();for(const raw of Array.isArray(items)?items:[]){const w=normalizeWord(raw,'photo');if(isHanzi(w.ch)&&[...w.ch].length<=12)result.set(w.ch,w)}return [...result.values()].slice(-250);
}
function ownHiddenOnly(hidden,custom){
 const own=new Set((Array.isArray(custom)?custom:[]).map(w=>keyOf(w.ch)));
 return unique(Array.isArray(hidden)?hidden:[]).filter(ch=>own.has(ch));
}
// Per-character handwriting history is optional in older versions and belongs to the same backup.
function cleanWritingStats(value){
 const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const [ch,x] of Object.entries(value)){
  if(!isHanzi(ch)||[...ch].length!==1||!x||typeof x!=='object')continue;
  const num=(k)=>Math.max(0,Math.min(100000,Math.floor(Number(x[k])||0)));
  out[ch]={attempts:num('attempts'),completed:num('completed'),mistakes:num('mistakes'),hints:num('hints'),clean:num('clean'),streak:Math.min(30,num('streak')),score:Math.min(15,Math.max(0,Number(x.score)||0)),last:typeof x.last==='string'?x.last:''};
 }
 return out;
}
function writingStat(ch){return state.writingStats[ch]??={attempts:0,completed:0,mistakes:0,hints:0,clean:0,streak:0,score:0,last:''}}
function recordWritingEvent(ch,kind){
 const stat=writingStat(ch);
 if(kind==='mistake'){stat.mistakes++;stat.score=Math.min(15,stat.score+1.1);stat.streak=0}
 if(kind==='hint'){stat.hints++;stat.score=Math.min(15,stat.score+1.65);stat.streak=0}
 stat.last=dayString();save({quiet:true});
}
function recordWritingFinish(ch,{mistakes=0,hints=0,success=false,engaged=false}={}){
 if(!engaged&&!success)return null;
 const stat=writingStat(ch);stat.attempts++;
 if(success){
  stat.completed++;
  if(!mistakes&&!hints){stat.clean++;stat.streak=Math.min(30,stat.streak+1);stat.score=Math.max(0,stat.score-2.2)}
  else stat.streak=0;
 }else{stat.streak=0;stat.score=Math.min(15,stat.score+1.3)}
 stat.last=dayString();save({quiet:true});return stat;
}
function writingDifficulty(ch){
 const s=state.writingStats[ch];if(!s)return 0;
 // Recent confident, hint-free handwriting gradually removes difficulty.
 return Math.max(0,Math.min(15,Number(s.score)||0));
}
// Dalia 7.8 · passive, independent knowledge memory. Legacy SRS remains untouched for backups.
const SKILLS=['recognition','recall','listening','writing','translation'];
function cleanSkillStats(raw){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 const cap=(v,max=100000)=>Math.min(max,Math.max(0,Math.floor(Number(v)||0)));
 for(const [ch,parts] of Object.entries(raw)){
  if(!isHanzi(ch)||[...ch].length>28||!parts||typeof parts!=='object')continue;
  const clean={};for(const k of SKILLS){const v=parts[k];if(!v||typeof v!=='object')continue;
   clean[k]={attempts:cap(v.attempts),correct:cap(v.correct),errors:cap(v.errors),hints:cap(v.hints),streak:cap(v.streak,200),interval:cap(v.interval,365),next:/^\d{4}-\d{2}-\d{2}$/.test(v.next||'')?v.next:'',last:/^\d{4}-\d{2}-\d{2}$/.test(v.last||'')?v.last:''};
  }
  if(Object.keys(clean).length)out[ch]=clean;
 }
 return out;
}
// Three successful, unaided recalls spaced across days; same-day repetitions never farm mastery.
// After round 1 wait 1 day; after round 2 wait 3 days. Errors set progress back.
// Existing manually marked and legacy learned cards stay intact on migration.
const STUDY_DAYS_REQUIRED=3;
const STUDY_INTERVAL_DAYS=[1,3];
function cleanStudyDays(raw){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 let count=0;
 for(const [ch,days] of Object.entries(raw)){
  if(++count>10000)break;
  if(!isHanzi(ch)||[...ch].length>28||!Array.isArray(days))continue;
  const valid=[...new Set(days.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(-STUDY_DAYS_REQUIRED);
  if(valid.length)out[ch]=valid;
 }
 return out;
}
function studyDaysCount(ch){return Math.min(STUDY_DAYS_REQUIRED,state.studyDays?.[ch]?.length||0)}
function nextStudyDate(ch){
 const days=state.studyDays?.[ch]||[];
 if(!days.length||days.length>=STUDY_DAYS_REQUIRED)return '';
 const last=days[days.length-1],d=new Date(last+'T12:00:00');
 if(!Number.isFinite(d.getTime()))return '';
 d.setDate(d.getDate()+STUDY_INTERVAL_DAYS[Math.min(days.length-1,STUDY_INTERVAL_DAYS.length-1)]);
 return dayString(d);
}
function noteSuccessfulStudyDay(ch){
 if(state.learned.includes(ch))return false;
 const today=dayString(),days=state.studyDays[ch]||[],next=nextStudyDate(ch);
 if(days.includes(today)||(next&&today<next))return false;
 state.studyDays[ch]=[...days,today].slice(-STUDY_DAYS_REQUIRED);
 if(state.studyDays[ch].length>=STUDY_DAYS_REQUIRED){
  state.learned.push(ch);state.autoLearned??=[];state.autoLearned.push(ch);
  markActivity('learn');return true;
 }
 return false;
}
function noteFailedStudy(ch){
 // Manual and legacy learned marks are intentional; only automatic mastery is reversible.
 const automated=state.autoLearned?.includes(ch);
 if(state.learned.includes(ch)&&!automated)return false;
 if(automated){
  state.autoLearned=state.autoLearned.filter(c=>c!==ch);
  state.learned=state.learned.filter(c=>c!==ch);
 }
 const days=state.studyDays[ch]||[];
 if(days.length)state.studyDays[ch]=days.slice(0,automated?-2:-1);
 return automated||days.length>0;
}
function clearLearnedMark(ch){
 state.learned=state.learned.filter(c=>c!==ch);
 state.autoLearned=state.autoLearned.filter(c=>c!==ch);
 // Removing the badge keeps earlier practice evidence, but requires one more spaced success.
 if(studyDaysCount(ch)>=STUDY_DAYS_REQUIRED)state.studyDays[ch]=state.studyDays[ch].slice(0,2);
}
function resetStudyDays(ch){if(state.studyDays)delete state.studyDays[ch];state.autoLearned=state.autoLearned.filter(c=>c!==ch)}
function skillEntry(ch,skill){state.skillStats[ch]??={};return state.skillStats[ch][skill]??={attempts:0,correct:0,errors:0,hints:0,streak:0,interval:0,next:'',last:''}}
function skillDue(ch,skill){const e=state.skillStats[ch]?.[skill];if(e?.next)return e.next<=dayString();if(skill==='recognition')return dueNowLegacy(ch);return false}
function dueNowLegacy(ch){const s=state.srs[ch];if(!s||!s.next)return state.learned.includes(ch);return s.next<=dayString()}
function bestSkill(ch,skill){return state.skillStats[ch]?.[skill]||null}
function skillMastered(ch,skill){const e=bestSkill(ch,skill);return !!(e&&e.correct>=3&&e.streak>=2&&e.interval>=6)}
function canHidePinyin(ch){return state.pinyinPreference!=='always'&&skillMastered(ch,'recognition')}
function adaptiveWeight(ch,skill){const s=bestSkill(ch,skill);
 if(!s)return skill==='recognition'&&dueNowLegacy(ch)?7:3.1;
 const due=s.next&&s.next<=dayString();const overdue=s.next&&s.next<dayString();
 return Math.max(.3,(due?7:overdue?9:1)+(overdue?2:0)+Math.min(5,s.errors)*.5+(s.hints?1:0)+(s.correct===0?1.5:0)-(s.streak>=3?1.3:0));
}
function recordSkill(ch,skill,{correct=false,hint=false,assisted=false}={}){
 if(!SKILLS.includes(skill)||!isHanzi(ch))return null;
 const e=skillEntry(ch,skill);e.attempts++;
 if(correct&&!hint&&!assisted){const spaced=!!(e.last&&e.last<dayString());e.correct++;if(!e.last||spaced){e.streak++;e.interval=e.interval?Math.min(180,Math.max(1,Math.ceil(e.interval*(1.65+Math.min(4,e.streak)*.16)))):1}else{e.streak=Math.max(1,e.streak);e.interval=Math.max(1,e.interval)}}
 else{e.errors++;if(hint||assisted)e.hints++;e.streak=0;e.interval=0}
 const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+e.interval);
 e.last=dayString();e.next=dayString(d);
 if(correct&&!hint&&!assisted){state.quizTotals.correct++;markActivity('correct');noteSuccessfulStudyDay(ch)}
 else{state.quizTotals.wrong++;markActivity('wrong');noteFailedStudy(ch)}
 save({quiet:true});return e;
}
function skillSchedule(ch){const all=Object.values(state.skillStats[ch]||{}).filter(v=>v&&v.next);if(!all.length)return null;return all.map(v=>v.next).sort()[0]}
function todayReview(ch){const next=nextStudyDate(ch);if(!state.learned.includes(ch)&&next)return next<=dayString();const skill=state.skillStats[ch];if(skill&&Object.keys(skill).length)return Object.values(skill).some(x=>x.next&&x.next<=dayString())||(!skill.recognition&&dueNowLegacy(ch));return dueNowLegacy(ch)}

function migrateState(){
  const exists=readJSON(STORE,null);if(exists&&typeof exists==='object'&&!Array.isArray(exists)){const s={...initial(),...exists};s.practiceLevels=validPracticeLevels(s.practiceLevels);s.custom=Array.isArray(s.custom)?s.custom:[];s.drafts=cleanPhotoDrafts(s.drafts);s.hidden=unique(s.hidden);s.learned=unique(s.learned);s.autoLearned=unique(s.autoLearned).filter(ch=>s.learned.includes(ch));s.favorites=unique(s.favorites);s.quoteFavorites=(Number(s.quoteSchema)===2?(Array.isArray(s.quoteFavorites)?s.quoteFavorites:[]):remapOldQuotes(s.quoteFavorites)).filter(i=>Number.isInteger(i)&&i>=0&&i<QUOTE_DATA.length);s.quoteSchema=2;s.srs=s.srs&&typeof s.srs==='object'&&!Array.isArray(s.srs)?s.srs:{};s.writingGuideMode=s.writingGuideMode==='trace'?'trace':'memory';s.writingStats=cleanWritingStats(s.writingStats);s.skillStats=cleanSkillStats(s.skillStats);s.studyDays=cleanStudyDays(s.studyDays);s.pinyinPreference=['adaptive','always'].includes(s.pinyinPreference)?s.pinyinPreference:'adaptive';s.wisdomShowPinyin=s.wisdomShowPinyin!==false;s.daily=s.daily&&typeof s.daily==='object'&&!Array.isArray(s.daily)?s.daily:{};s.quizTotals=s.quizTotals&&typeof s.quizTotals==='object'&&!Array.isArray(s.quizTotals)?s.quizTotals:{correct:0,wrong:0};return s}
  const s=initial();s.learned=unique(readJSON('hanzi_learned',[]));s.favorites=unique(readJSON('hanzi_favs',[]));
  const photo=readJSON('hanzi_photo_words_v3',[]);for(const raw of Array.isArray(photo)?photo:[]){const w=normalizeWord(raw,'photo');if(!isHanzi(w.ch)||builtins.has(w.ch)||s.custom.some(x=>x.ch===w.ch))continue;if(validWord(w))s.custom.push(w);else {} /* неполные карточки удалены */}
  const old=readJSON('hanzi_activity_v6',{});if(old&&typeof old==='object'){for(const [k,v] of Object.entries(old)){if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object'){s.daily[k]={learn:Math.max(0,Number(v.learn)||0),correct:Math.max(0,Number(v.correct)||0),wrong:Math.max(0,Number(v.wrong)||0)};s.quizTotals.correct+=s.daily[k].correct;s.quizTotals.wrong+=s.daily[k].wrong}}}
  return s;
}

// Dalia 8.0.4 — whisper-soft tactile sound design. No external audio assets.
let daliaAudioContext=null,daliaAudioLast=0;
function daliaAudio(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  if(!daliaAudioContext)daliaAudioContext=new AC({latencyHint:'interactive'});
  if(daliaAudioContext.state==='suspended')daliaAudioContext.resume().catch(()=>{});
  return daliaAudioContext;
 }catch(_){return null}
}
function daliaNote(ctx,{freq=440,when=0,duration=.22,peak=.012,attack=.012,shape='sine',cutoff=2300,detune=0,pan=0}={}){
 try{
  const t=ctx.currentTime+Math.max(.005,when);
  const oscillator=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  oscillator.type=shape;oscillator.frequency.setValueAtTime(freq,t);oscillator.detune.value=detune;
  filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.35;
  gain.gain.setValueAtTime(0,t);
  gain.gain.linearRampToValueAtTime(peak,t+attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(.00001,peak*.24),t+Math.max(attack+.03,duration*.58));
  gain.gain.exponentialRampToValueAtTime(.00001,t+duration);
  oscillator.connect(filter);filter.connect(gain);
  if(ctx.createStereoPanner){const panner=ctx.createStereoPanner();panner.pan.value=pan;gain.connect(panner);panner.connect(ctx.destination)}
  else gain.connect(ctx.destination);
  oscillator.start(t);oscillator.stop(t+duration+.025);
  oscillator.onended=()=>{try{oscillator.disconnect();filter.disconnect();gain.disconnect()}catch(_){}};
 }catch(_){}
}
// Gentle variation: each gesture has a tiny family of related, consonant sounds.
// Cycling (rather than pure randomness) avoids an unexpectedly loud or dissonant note.
const daliaSoundSteps={tap:0,choice:0,navigate:0,success:0,error:0,orb:0};
function daliaSfx(kind='tap'){
 if(kind!=='orb')return; // Only the interactive sphere plays a UI sound.
 const ctx=daliaAudio();if(!ctx)return;
 const now=performance.now();
 if(kind!=='orb'&&now-daliaAudioLast<105)return;
 if(kind!=='orb')daliaAudioLast=now;
 if(!(kind in daliaSoundSteps))kind='tap';
 const variation=daliaSoundSteps[kind]++%4;
 // All notes come from a bright pentatonic palette. Keep amplitude and duration
 // nearly identical between variants; variation is in pitch and spacing only.
 if(kind==='orb'){
  const chords=[
   [523.25,659.25,783.99,1046.5],
   [587.33,783.99,880.00,1174.66],
   [659.25,783.99,987.77,1318.51],
   [523.25,783.99,880.00,1046.5]
  ];
  const notes=chords[variation];
  const delay=[0,.13,.28,.46];
  const level=[.0056,.0038,.0025,.00125];
  notes.forEach((freq,i)=>daliaNote(ctx,{
   freq,when:delay[i],duration:1.04+(i===1?.14:0)-i*.045,
   peak:level[i],attack:.10+i*.014,cutoff:1100+i*80,
   pan:[-.12,.12,.18,-.08][i]
  }));
  return;
 }
 const palette={
  tap:[659.25,783.99,698.46,880.00],
  choice:[783.99,880.00,659.25,987.77],
  navigate:[659.25,783.99,880.00,698.46],
  success:[783.99,880.00,987.77,783.99],
  error:[523.25,587.33,659.25,587.33]
 };
 const freq=palette[kind][variation];
 if(kind==='success'){
  daliaNote(ctx,{freq,when:0,duration:.19,peak:.0027,attack:.042,cutoff:1050});
  daliaNote(ctx,{freq:freq*1.25,when:.078,duration:.22,peak:.0016,attack:.052,cutoff:1150});
 }else if(kind==='navigate'){
  daliaNote(ctx,{freq,duration:.18,peak:.0023,attack:.045,cutoff:1050});
  daliaNote(ctx,{freq:freq*1.25,when:.075,duration:.18,peak:.0012,attack:.050,cutoff:1100});
 }else if(kind==='error'){
  // An error is a quiet acknowledgement, not a sad or descending melody.
  daliaNote(ctx,{freq,duration:.19,peak:.0019,attack:.045,cutoff:900});
 }else if(kind==='choice'){
  daliaNote(ctx,{freq,duration:.15,peak:.0022,attack:.036,cutoff:1100});
 }else{
  daliaNote(ctx,{freq,duration:.13,peak:.0018,attack:.032,cutoff:1000});
 }
}
let state=migrateState();state.practiceLevels=validPracticeLevels(state.practiceLevels);state.writingGuideMode=state.writingGuideMode==='trace'?'trace':'memory';state.writingStats=cleanWritingStats(state.writingStats);state.skillStats=cleanSkillStats(state.skillStats);state.autoLearned=unique(state.autoLearned).filter(ch=>state.learned.includes(ch));state.custom=state.custom.map(x=>normalizeWord(x,x?.origin||'custom')).filter(x=>validWord(x)&&(!builtins.has(x.ch)||builtins.get(x.ch).origin==='reference'));state.drafts=cleanPhotoDrafts(state.drafts);state.hidden=[];let displayLimit=48,page='learn',level='all',wordType='all',mode='meaning',dueOnly=false,question=null,previousQuestion=null,answered=false,scan=null,activeQuoteIndex=Math.floor(Math.random()*100),quoteFavoritesOnly=false,wordStack=[],currentWord=null,toastTimer=null,previewURL=null;
// Wisdom entries are intentionally isolated from the dictionary, training and random cards.
function isWisdomOnly(w){
 return w.origin==='saying'||WISDOM_ONLY_KEYS.has([...String(w.ch)].filter(c=>isHanzi(c)).join(''));
}
const visibleBuiltins=new Map([...builtins].filter(([,w])=>!isWisdomOnly(w)));
function wordsMap(){
 const m=new Map(visibleBuiltins);
 for(const raw of state.custom){
  const w=normalizeWord(raw,raw.origin||'custom');
  if(state.hidden.includes(w.ch)||isWisdomOnly(w))continue;
  if(validWord(w)&&(!m.has(w.ch)||m.get(w.ch).origin==='reference'))m.set(w.ch,w);
 }
 return m;
}
function lookup(ch){
 const key=keyOf(ch),base=builtins.get(key);
 const raw=state.custom.find(x=>keyOf(x.ch)===key);
 if(!raw||state.hidden.includes(key)||(base&&base.origin!=='reference'))return base;
 const w=normalizeWord(raw,raw.origin||'custom');
 return validWord(w)&&!isWisdomOnly(w)?w:base;
}
const SNAPSHOT_KEY='dalia_restore_points_v1';
const BACKUP_LAST_KEY='dalia_backup_last_requested_v1';
let storageFailure=false;
function verifyStorage(){try{const raw=localStorage.getItem(STORE);return !!raw&&JSON.parse(raw)?.version===7}catch(_){return false}}
function validateBackup(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.custom))throw Error('Файл не содержит данных Dalia.');
 for(const field of ['learned','autoLearned','favorites','hidden','drafts','quoteFavorites'])if(data[field]!==undefined&&!Array.isArray(data[field]))throw Error('Повреждён раздел '+field+'.');
 for(const field of ['srs','daily','writingStats','skillStats','studyDays'])if(data[field]!==undefined&&(!data[field]||typeof data[field]!=='object'||Array.isArray(data[field])))throw Error('Повреждён раздел '+field+'.');
 if(data.custom.length>10000||data.drafts?.length>10000)throw Error('Слишком много карточек в файле.');
 return data;
}
function safeMergeBackup(data){
 validateBackup(data);
 const previous=JSON.stringify(state);
 try{mergeBackup(data);if(!save())throw Error('Не удалось записать данные в браузер. Текущий прогресс не изменён.');return true}
 catch(err){state=JSON.parse(previous);updateStats();throw err}
}
function readSnapshots(){const v=readJSON(SNAPSHOT_KEY,[]);return Array.isArray(v)?v.filter(x=>x&&typeof x.date==='string'&&x.data&&typeof x.data==='object').slice(-5):[]}
function checkpointState(label='Автоматическая копия',{force=false}={}){
 try{
  const raw=localStorage.getItem(STORE);if(!raw)return;
  const previous=JSON.parse(raw);if(!previous||typeof previous!=='object'||!Array.isArray(previous.custom))return;
  let points=readSnapshots(),today=dayString();
  if(!force&&points.some(p=>p.date===today&&p.label==='Начало дня'))return;
  points.push({date:today,label:force?label:'Начало дня',created:new Date().toISOString(),data:previous});
  // Keep last 5 checkpoints and fall back gracefully if quota is tight.
  for(let count=0;count<5;count++){
   try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(points.slice(-5+count)));return}catch(_){continue}
  }
 }catch(_){}
}
function restoreCheckpoint(point){
 if(!point||!point.data||!Array.isArray(point.data.custom))return;
 if(!confirm('Объединить сохранённый прогресс с текущим? Новые карточки не будут удалены.'))return;
 try{checkpointState('Перед восстановлением',{force:true});safeMergeBackup(point.data);closeModal();renderWords();toast('Точка восстановления объединена с текущими данными.','good')}
 catch(err){toast('Не удалось восстановить: '+err.message,'bad')}
}

function save({quiet=false}={}){checkpointState();state.practiceLevels=validPracticeLevels(state.practiceLevels);state.writingGuideMode=state.writingGuideMode==='trace'?'trace':'memory';state.writingStats=cleanWritingStats(state.writingStats);state.skillStats=cleanSkillStats(state.skillStats);state.studyDays=cleanStudyDays(state.studyDays);state.drafts=cleanPhotoDrafts(state.drafts);state.custom=[...new Map(state.custom.map(x=>[keyOf(x.ch),x])).values()].filter(w=>validWord(normalizeWord(w))&&(!builtins.has(w.ch)||builtins.get(w.ch).origin==='reference'));state.hidden=ownHiddenOnly(state.hidden,state.custom);state.favorites=unique(state.favorites);state.learned=unique(state.learned);state.autoLearned=unique(state.autoLearned).filter(ch=>state.learned.includes(ch));try{const payload=JSON.stringify(state);localStorage.setItem(STORE,payload);if(localStorage.getItem(STORE)!==payload)throw Error('Проверка записи не прошла');storageFailure=false;updateStats();return true}catch(e){if(!storageFailure||!quiet)toast('Прогресс не сохранился! Проверь место в браузере и скачай резервную копию в настройках.','bad');storageFailure=true;updateStats();return false}}
function stats(){
 const words=wordsMap(),learnedKeys=new Set(state.learned),favoriteKeys=new Set(state.favorites);
 let learned=0,due=0,favorites=0;
 for(const ch of words.keys()){
  if(learnedKeys.has(ch))learned++;
  if(favoriteKeys.has(ch))favorites++;
  if(dueNow(ch))due++;
 }
 return {total:words.size,learned,due,favorites,correct:Math.max(0,Number(state.quizTotals.correct)||0),wrong:Math.max(0,Number(state.quizTotals.wrong)||0)}
}
function updateStats(){const s=stats();for(const [id,count] of [['learned',s.learned],['due',s.due],['favorite',s.favorites]]){const el=$('collection-count-'+id);if(el)el.textContent=count}if(typeof renderCollectionDrawer==='function'&&activeCollection)renderCollectionDrawer()}
function markActivity(type){const d=dayString();state.daily[d]??={learn:0,correct:0,wrong:0};state.daily[d][type]=(Number(state.daily[d][type])||0)+1}
function dueNow(ch){return todayReview(ch)}
function reviewInterval(ch,rating){
 const s=state.srs[ch]||{};const old=Math.max(0,Number(s.interval)||0);
 if(rating==='again')return 0;
 if(rating==='hard')return Math.max(1,Math.round(old*1.15)||1);
 if(rating==='easy')return old?Math.min(365,Math.ceil(old*3.1)):5;
 return old?Math.min(365,Math.ceil(old*2.1)):3;
}
function recordReview(ch,rating){
 if(!['again','hard','good','easy'].includes(rating))return null;
 const today=dayString();const old=state.srs[ch]||{repetitions:0,interval:0,errors:0};
 const s={...old},interval=reviewInterval(ch,rating);
 s.repetitions=rating==='again'?0:(Math.max(0,Number(s.repetitions)||0)+1);
 s.interval=interval;s.errors=Math.max(0,Number(s.errors)||0)+(rating==='again'?1:0);
 s.last=today;s.lastRating=rating;
 const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+interval);s.next=dayString(d);state.srs[ch]=s;
 state.quizTotals[rating==='again'?'wrong':'correct']++;
 markActivity(rating==='again'?'wrong':'correct');
 if(rating==='good'||rating==='easy')noteSuccessfulStudyDay(ch);else noteFailedStudy(ch);
 save();return s;
}
function recordAnswer(ch,correct){return recordReview(ch,correct?'good':'again')}
function toast(text,kind=''){const t=$('toast');t.textContent=text;t.className=`toast ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),3300)}
function stopSpeech(){try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch(_){}}
let closeWritingSession=null;function navigate(p){if(!['learn','practice','photo','motivation'].includes(p))return;if(p!==page)stopSpeech();if(p!=='practice'&&closeWritingSession)closeWritingSession();page=p;const hero=document.querySelector('.hero');if(hero)hero.classList.toggle('hidden',p!=='learn');document.querySelectorAll('.page').forEach(el=>el.classList.toggle('hidden',el.id!==`page-${p}`));document.querySelectorAll('[data-page]').forEach(btn=>{const active=btn.dataset.page===p;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});if(p==='learn')renderWords();if(p==='practice')renderPractice();if(p==='photo')renderDrafts();if(p==='motivation'){activeQuoteIndex=randomWisdomIndex(activeQuoteIndex);renderMotivation();}window.scrollTo({top:0,behavior:'instant'});if(p==='practice')scrollPracticeIntoView()}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
function makeBtn(label,cls,callback){const btn=document.createElement('button');btn.type='button';btn.className=cls;btn.textContent=label;btn.addEventListener('click',callback);return btn}
function openCardQuickActions(ch){
 const w=lookup(ch);if(!w)return;
 const wrap=document.createElement('div');wrap.className='quick-card-actions';
 const note=document.createElement('p');note.className='tiny muted';note.textContent=w.ch+' · '+w.meaning;wrap.append(note);
 wrap.append(makeBtn('Открыть карточку','soft wide',()=>openWord(ch)));
 wrap.append(makeBtn(state.favorites.includes(ch)?'♥ Убрать из избранного':'♡ В избранное','primary wide',()=>{toggleFavorite(ch);renderWords();closeModal();toast(state.favorites.includes(ch)?'Добавлено в избранное.':'Убрано из избранного.','good')}));
 wrap.append(makeBtn('↻ Повторить в практике','ghost wide',()=>{closeModal();navigate('practice');const found=availablePractice().some(w=>w.ch===ch);if(!found){toast('Карточка не входит в выбранные уровни практики.');return}practiceNextOverride=ch;newQuestion()}));
 showModal('Быстрые действия',wrap);
}
function installCardLongPress(el,ch){ /* Долгое нажатие больше не открывает меню. */ }
let practiceNextOverride=null;
function renderWords(){const query=searchKey($('word-search').value);const all=[...wordsMap().values()];const arr=all.filter(w=>{const filter=level==='all'||(level==='custom'?(w.origin==='custom'||w.origin==='photo'):level==='additional'?w.origin==='additional':level==='favorite'?state.favorites.includes(w.ch):level==='learned'?state.learned.includes(w.ch):level==='due'?dueNow(w.ch):((w.origin==='builtin'||w.origin==='reference'||w.origin==='hsk')&&String(w.level)===level));return filter&&(wordType==='all'||(wordType==='character'?[...w.ch].length===1:[...w.ch].length>1))&&searchMatches(w,query)});if(query)arr.sort((a,b)=>searchScore(a,query)-searchScore(b,query));$('word-count').textContent=`${arr.length} из ${all.length}`;
const viewNames={learned:'Изученные карточки',due:'К повторению',favorite:'Избранные карточки'};
const view=$('catalog-view-label');
view.classList.toggle('hidden',!viewNames[level]);
if(viewNames[level]){view.replaceChildren();const caption=document.createElement('span');caption.textContent=`${viewNames[level]} · ${arr.length}`;const clear=makeBtn('Все слова ×','catalog-clear',()=>selectCatalogFilter('all',{resetSearch:true,resetType:true}));view.append(caption,clear)}
$('favorite-hint').classList.toggle('hidden',level!=='favorite');$('word-grid').replaceChildren();$('more-words').classList.toggle('hidden',arr.length<=displayLimit);$('more-words').textContent='Показать ещё';if(!arr.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=query?'По этому запросу карточки не найдены. Попробуй изменить поиск.':level==='learned'?'Пока нет изученных карточек. Продолжай практиковаться или отметь нужные слова вручную.':level==='due'?'Сейчас нет карточек к повторению. Они появятся здесь, когда придёт время.':level==='favorite'?'В избранном пока пусто. Добавляй карточки нажатием на сердечко.':'По этим условиям пока ничего нет. Попробуй другой фильтр.';$('word-grid').append(empty);return}
for(const [index,w] of arr.slice(0,displayLimit).entries()){const el=document.createElement('article');el.className='word-card';el.style.setProperty('--reveal-index',Math.min(14,Math.max(0,index)));el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`${w.ch}, ${w.meaning}. Открыть карточку`);el.innerHTML=`<div class="tag">${w.origin==='additional'?'Уровень '+w.level+' · вне HSK':w.origin==='hsk'?(w.level?'HSK '+w.level:'Другие слова · вне уровней HSK'):(w.origin==='builtin'||w.origin==='reference')?((w.origin==='reference'?'≈ HSK ':'HSK ')+w.level+(w.origin==='reference'?' · знак':'')):'✦ добавлен'}</div><div class="glyph">${escapeHTML(w.ch)}</div><div class="pin">${canHidePinyin(w.ch)?"✦ пиньинь скрыт":escapeHTML(w.pinyin)}</div><div class="meaning">${escapeHTML(w.meaning)}</div>${state.learned.includes(w.ch)?'<div class="done">✓ изучено</div>':''}`;installCardLongPress(el,w.ch);el.addEventListener('click',()=>openWord(w.ch));el.addEventListener('keydown',e=>{if(e.target!==el)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();openWord(w.ch)}});if(level==='favorite'){
  const remove=makeBtn('× Убрать','favorite-remove',e=>{e.stopPropagation();removeFavorite(w.ch)});
  remove.setAttribute('aria-label',`Убрать «${w.ch}» из избранного`);
  remove.title='Убрать из избранного, не удаляя слово';
  el.append(remove);
}else{
  const favorite=state.favorites.includes(w.ch);
  const star=makeBtn(favorite?'♥':'♡','star'+(favorite?' active':''),e=>{e.stopPropagation();toggleFavorite(w.ch);const isFavorite=state.favorites.includes(w.ch);star.textContent=isFavorite?'♥':'♡';star.classList.toggle('active',isFavorite);star.setAttribute('aria-label',isFavorite?`Убрать «${w.ch}» из избранного`:`Добавить «${w.ch}» в избранное`);star.title=isFavorite?'Убрать из избранного':'Добавить в избранное'});
  star.setAttribute('aria-label',favorite?`Убрать «${w.ch}» из избранного`:`Добавить «${w.ch}» в избранное`);
  star.title=favorite?'Убрать из избранного':'Добавить в избранное';
  el.append(star);
}
$('word-grid').append(el)}}
document.querySelectorAll('[data-type]').forEach(btn=>btn.addEventListener('click',()=>{wordType=btn.dataset.type;displayLimit=48;document.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('active',x===btn));renderWords()}));$('word-search').addEventListener('input',()=>{displayLimit=48;renderWords()});$('more-words').addEventListener('click',()=>{displayLimit+=48;renderWords()});function selectCatalogFilter(nextLevel,{resetSearch=false,resetType=false}={}){
 level=nextLevel;displayLimit=48;
 if(resetSearch)$('word-search').value='';
 if(resetType){wordType='all';document.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('active',x.dataset.type==='all'))}
 document.querySelectorAll('[data-level]').forEach(x=>{const active=x.dataset.level===level;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});
 renderWords();
}
document.querySelectorAll('[data-level]').forEach(btn=>btn.addEventListener('click',()=>selectCatalogFilter(btn.dataset.level)));
function toggleFavorite(ch){state.favorites=state.favorites.includes(ch)?state.favorites.filter(c=>c!==ch):[...state.favorites,ch];save()}
function removeFavorite(ch){
 if(!state.favorites.includes(ch))return;
 state.favorites=state.favorites.filter(c=>c!==ch);
 save();renderWords();
 toast(`«${ch}» убрано из избранного. Карточка и прогресс сохранены.`, 'good');
}
const overlay=$('modal-overlay');let modalReturnFocus=null;
overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','modal-title');
$('toast').setAttribute('role','status');$('toast').setAttribute('aria-live','polite');
function showModal(title,body){
 if(overlay.classList.contains('hidden'))modalReturnFocus=document.activeElement;
 closeHanziPeek({restoreFocus:false});$('modal-title').textContent=title;$('modal-body').replaceChildren();
 $('modal-next-random').classList.add('hidden');$('modal-next-random').onclick=null;
 if(typeof body==='string')$('modal-body').innerHTML=body;else $('modal-body').append(body);
 $('modal-body').scrollTop=0;
 overlay.classList.remove('hidden');document.body.style.overflow='hidden';
 requestAnimationFrame(()=>$('modal-close').focus({preventScroll:true}));
}
function closeModal(){
 if(overlay.classList.contains('hidden'))return;
 closeHanziPeek({restoreFocus:false});stopSpeech();overlay.classList.add('hidden');document.body.style.overflow='';wordStack=[];currentWord=null;
 const oldFocus=modalReturnFocus;modalReturnFocus=null;
 if(oldFocus&&oldFocus.isConnected&&typeof oldFocus.focus==='function')requestAnimationFrame(()=>oldFocus.focus({preventScroll:true}));
}
$('modal-close').addEventListener('click',closeModal);
overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});
document.addEventListener('keydown',e=>{
 if(overlay.classList.contains('hidden'))return;
 if(e.key==='Escape'){e.preventDefault();if(!closeHanziPeek())closeModal();return}
 if(e.key!=='Tab')return;
 const focusables=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
 if(!focusables.length){e.preventDefault();return}
 const first=focusables[0],last=focusables[focusables.length-1];
 if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus()}
});
const CHINESE_GIRL_NAMES=/xiaoxiao|xiaoyi|xiaohan|xiaomeng|xiaoqiu|xiaoxuan|xiaoyan|ting.?ting|hui.?hui|mei.?jia|sin.?ji|lili|lily|female|女性|女声|晓晓|晓伊|晓涵|晓梦|婷婷|慧慧|美佳/i;
let ttsAvailableVoices=[];
function refreshChineseVoices(){
 if(!('speechSynthesis' in window))return [];
 ttsAvailableVoices=speechSynthesis.getVoices().filter(v=>/^zh(?:[-_]|$)/i.test(v.lang));
 return ttsAvailableVoices;
}
function voicePriority(v){
 let score=0;
 if(/^zh[-_]CN/i.test(v.lang))score+=20;
 if(CHINESE_GIRL_NAMES.test(v.name))score+=100;
 if(/microsoft|google|enhanced|premium|natural|neural/i.test(v.name))score+=6;
 if(v.localService)score+=2;
 return score;
}
function chosenChineseVoice(){
 const voices=refreshChineseVoices();
 // Always use the highest-ranked available Chinese voice.
 return [...voices].sort((a,b)=>voicePriority(b)-voicePriority(a))[0]||null;
}
function speak(text,{preview=false,slow=false,onStart=null,onError=null,requireChineseVoice=false}={}){
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
  toast('Озвучка не поддерживается этим браузером.','bad');onError?.('unsupported');return false;
 }
 const voice=chosenChineseVoice();
 if(requireChineseVoice&&Number(state.ttsVolume??.85)<=0){onError?.('muted');return false}
 if(requireChineseVoice&&!voice){onError?.('no-voice');return false}
 const utter=new SpeechSynthesisUtterance(String(text));utter.lang='zh-CN';
 const sentence=/[。！？!?，,]/.test(text)||[...String(text)].length>6;
 // Both single characters and example sentences respect the selected speaking speed.
 // A sentence needs a little more time between syllables to sound clear.
 const configuredRate=Math.max(.68,Math.min(1.25,Number(state.ttsRate)||1));
 const rateMultiplier=sentence?(configuredRate<1?.78:.94):.88;
 utter.rate=Math.max(.45,Math.min(1.25,configuredRate*rateMultiplier*(slow?.77:1)));
 utter.pitch=1;utter.volume=Math.min(1,Math.max(0,Number(state.ttsVolume??.85)));if(voice)utter.voice=voice;
 else if(!preview)toast('Китайский голос не найден: добавь голос китайского языка в настройках устройства.');
 if(typeof onStart==='function')utter.onstart=()=>onStart();
 utter.onerror=e=>{if(typeof onError==='function')onError(e?.error||'playback');else if(e?.error!=='interrupted'&&e?.error!=='canceled')toast('Не удалось воспроизвести звук.','bad')};
 try{speechSynthesis.cancel();speechSynthesis.speak(utter);return true}
 catch(_){onError?.('playback');if(!onError)toast('Не удалось воспроизвести звук.','bad');return false}
}
try{if('speechSynthesis' in window)speechSynthesis.addEventListener('voiceschanged',()=>{refreshChineseVoices();const sel=$('settings-voice-select');if(sel)fillVoiceSelect(sel);if(mode==='listening'&&$('listening-unavailable')&&!$('page-practice').classList.contains('hidden')&&chosenChineseVoice())newQuestion()})}catch(_){}
function fillVoiceSelect(sel){
 const voices=refreshChineseVoices(),current=chosenChineseVoice();sel.replaceChildren();
 if(!voices.length){const opt=new Option('Китайские голоса не найдены','');sel.add(opt);sel.disabled=true;return}
 sel.disabled=false;
 const auto=new Option('Автоматически · приятный голос','');sel.add(auto);
 for(const v of [...voices].sort((a,b)=>voicePriority(b)-voicePriority(a)).filter((v,i)=>i<2||v.voiceURI===state.ttsVoiceURI)){const label=`${v.name} · ${v.lang}${CHINESE_GIRL_NAMES.test(v.name)?' ♀':''}`;sel.add(new Option(label,v.voiceURI))}
 sel.value=state.ttsVoiceURI&&voices.some(v=>v.voiceURI===state.ttsVoiceURI)?state.ttsVoiceURI:'';
 sel.title=current?'Сейчас: '+current.name:'Выбери китайский голос';
}

// Target highlights are applied to the entire word, even when it has several Hanzi.
function interactiveSentence(cn,targetWord=''){
 const div=document.createElement('span');div.className='cn interactive-sentence';
 const chars=[...cn], target=[...targetWord], marked=new Array(chars.length).fill(false);
 const starts=new Set(),ends=new Set();
 if(target.length){
  for(let i=0;i<=chars.length-target.length;i++){
   if(target.every((c,j)=>chars[i+j]===c)){
    starts.add(i);ends.add(i+target.length-1);
    for(let j=0;j<target.length;j++)marked[i+j]=true;
   }
  }
 }
 chars.forEach((ch,i)=>{
  if(isHanzi(ch)){
   const b=makeBtn(ch,'hanzi-token',()=>{
    if(!lookup(ch)&&!builtins.has(ch)){
     toast('Для этого иероглифа пока нет проверенной карточки.');return;
    }
    if(!overlay.classList.contains('hidden')&&currentWord){
     openHanziPeek(ch,b); // The current card remains mounted and visible.
    }else openWord(ch);
   });
   b.addEventListener('click',e=>e.stopPropagation());
   if(marked[i]){
    b.classList.add('is-target');
    if(starts.has(i))b.classList.add('target-start');
    if(ends.has(i))b.classList.add('target-end');
   }
   b.title=marked[i]?`Изучаемое слово: ${targetWord} · открыть иероглиф ${ch}`:`Открыть карточку «${ch}»`;
   b.setAttribute('aria-label',marked[i]?`Изучаемое слово ${targetWord}, иероглиф ${ch}. Открыть карточку`:`Открыть иероглиф ${ch}`);
   div.append(b);
  }else if(/[。！？!?，,、；;：:）】」』”’]/u.test(ch)){
   // Keep the sentence-final punctuation attached to the previous character.
   const previous=div.lastChild;
   if(previous?.nodeType===1&&(previous.classList.contains('hanzi-token')||previous.classList.contains('hanzi-punct-group'))){
    let group=previous;
    if(!group.classList.contains('hanzi-punct-group')){
     group=document.createElement('span');group.className='hanzi-punct-group';
     div.replaceChild(group,previous);group.append(previous);
    }
    group.append(document.createTextNode(ch));
   }else div.append(document.createTextNode(ch));
  }else div.append(document.createTextNode(ch));
 });
 return div;
}
let peekReturnFocus=null;
function closeHanziPeek({restoreFocus=true}={}){
 const peek=$('modal-body').querySelector('.hanzi-peek');
 if(!peek)return false;
 peek.remove();
 const old=peekReturnFocus;peekReturnFocus=null;
 if(restoreFocus&&old&&old.isConnected)old.focus({preventScroll:true});
 return true;
}
function openHanziPeek(ch,trigger){
 const w=lookup(ch);if(!w)return toast('В словаре пока нет такого иероглифа.');
 let peek=$('modal-body').querySelector('.hanzi-peek');
 if(peek&&peek.dataset.word===ch){closeHanziPeek();return}
 if(!peek){peek=document.createElement('section');peek.className='hanzi-peek hanzi-peek-compact';peek.setAttribute('role','region');peek.setAttribute('aria-label','Краткий перевод иероглифа');peekReturnFocus=trigger}
 const source=trigger.closest('.sentence-panel');
 if(source&&!source.closest('.hanzi-peek'))source.insertAdjacentElement('afterend',peek);
 else if(!peek.isConnected)$('modal-body').append(peek);
 peek.dataset.word=ch;peek.replaceChildren();
 const top=document.createElement('div');top.className='hanzi-peek-top';
 const glyph=document.createElement('strong');glyph.className='hanzi-peek-glyph';glyph.textContent=w.ch;
 const description=document.createElement('div');description.className='hanzi-peek-description';
 const pin=document.createElement('div');pin.className='hanzi-peek-pinyin';pin.textContent=w.pinyin;
 const meaning=document.createElement('div');meaning.className='hanzi-peek-meaning';meaning.textContent=w.meaning;
 description.append(pin,meaning);
 const close=makeBtn('×','hanzi-peek-close',()=>closeHanziPeek());close.setAttribute('aria-label','Закрыть подсказку');
 top.append(glyph,description,close);peek.append(top);
 const actions=document.createElement('div');actions.className='hanzi-peek-actions';
 actions.append(makeBtn('♫ Послушать','soft',()=>speak(w.ch)));
 const study=makeBtn('', 'study-toggle',()=>{
  if(state.learned.includes(ch)){clearLearnedMark(ch);toast('Ручная отметка «Изучено» снята.')}else{state.learned.push(ch);markActivity('learn');toast('Иероглиф отмечен как изученный.','good')}
  save();renderWords();setStudy();
 });
 function setStudy(){const known=state.learned.includes(ch);study.textContent=known?'✓ Изучено':'＋ Изучить';study.className='study-toggle '+(known?'is-learned':'is-not-learned');study.setAttribute('aria-pressed',String(known))}
 setStudy();actions.append(study);peek.append(actions);
 peek.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
 requestAnimationFrame(()=>close.focus({preventScroll:true}));
}
const MORE_MEANINGS={
 '会':[['huì','уметь; мочь','我会说中文。','Я умею говорить по-китайски.'],['huì','собрание; встреча','我们明天开会。','Завтра у нас собрание.']],
 '行':[['xíng','подходить; можно','这样行吗？','Так подойдёт?'],['háng','ряд; сфера деятельности','他在银行工作。','Он работает в банке.']],
 '还':[['hái','ещё; по-прежнему','我还在学习。','Я всё ещё учусь.'],['huán','возвращать','我明天还书。','Я завтра верну книгу.']],
 '长':[['cháng','длинный','这条路很长。','Эта дорога длинная.'],['zhǎng','расти; старший','孩子长大了。','Ребёнок вырос.']],
 '重':[['zhòng','тяжёлый; важный','这个箱子很重。','Этот чемодан тяжёлый.'],['chóng','повторно','请重新说一遍。','Пожалуйста, скажи ещё раз.']],
 '得':[['dé','получать','我得到了礼物。','Я получил подарок.'],['děi','нужно; придётся','我得走了。','Мне пора уходить.'],['de','частица перед дополнением степени','他说得很好。','Он хорошо говорит.']],
 '好':[['hǎo','хороший','今天天气很好。','Сегодня хорошая погода.'],['hào','любить; увлекаться','他很好学。','Он очень любит учиться.']],
 '乐':[['lè','радость; веселье','他很快乐。','Он очень счастлив.'],['yuè','музыка (в сложных словах)','我喜欢音乐。','Я люблю музыку.']],
 '觉':[['jué','чувствовать; осознавать','我觉得很好。','Я думаю, это хорошо.'],['jiào','сон (в слове 睡觉)','我要睡觉了。','Я собираюсь спать.']],
 '过':[['guò','проходить; пересекать','我们过马路。','Мы переходим дорогу.'],['guo','частица опыта','我去过北京。','Я бывал в Пекине.']],
 '打':[['dǎ','бить; играть (в игры)','我想打篮球。','Я хочу поиграть в баскетбол.'],['dǎ','звонить; набирать','我给你打电话。','Я тебе позвоню.']],
 '上':[['shàng','верх; наверху','书在桌子上。','Книга на столе.'],['shàng','посещать (занятия)','我今天上课。','Сегодня у меня занятия.']],
 '看':[['kàn','смотреть; читать','我在看书。','Я читаю книгу.'],['kān','присматривать; охранять','他看门。','Он сторожит вход.']]
};
function renderMoreMeanings(w){
 const variants=MORE_MEANINGS[w.ch];if(!variants)return null;
 const details=document.createElement('details');details.className='word-senses';
 const summary=document.createElement('summary');summary.textContent='Другие значения и чтения';details.append(summary);
 for(const [pin,meaning,cn,ru]of variants){
  const row=document.createElement('div');row.className='word-sense-row';
  const definition=document.createElement('p');definition.textContent=pin+' · '+meaning;
  const example=document.createElement('p');example.className='word-sense-cn';example.textContent=cn;
  const translation=document.createElement('p');translation.className='tiny muted';translation.textContent=ru;
  const play=makeBtn('♫','ghost word-sense-play',()=>speak(cn));play.setAttribute('aria-label','Произнести '+cn);
  row.append(definition,play,example,translation);details.append(row);
 }
 return details;
}

const CONFUSABLE_HANZI_GROUPS=['未末','土士','日目','人入','己已巳','大太犬','千干','牛午','口囗','木本','白百','天夫','王玉','刀力','左右','今令','田由甲申','乌鸟','问间','晴睛','休体','买卖','再在','很跟','喝渴','请清情晴','找我','坐座'];
function relatedHanzi(ch){
 if([...ch].length!==1)return [];
 const group=CONFUSABLE_HANZI_GROUPS.find(g=>[...g].includes(ch));
 if(!group)return [];
 return [...group].filter(other=>other!==ch&&!!lookup(other)).slice(0,5);
}

/* Feedback from settings only. Never include local learning progress or browser data. */
function wordReportText(word,kind,details){
 const ch=keyOf(word);
 const w=ch?lookup(ch):null;
 const lines=['## Сообщение об ошибке в dalia','- Тип: '+kind];
 if(ch)lines.push('- Слово или иероглиф: '+ch);
 if(w)lines.push('- Пиньинь: '+w.pinyin,'- Значение: '+w.meaning,'- Пример: '+w.cn,'- Перевод примера: '+w.ru);
 lines.push('','## Описание',details.trim(),'','---','Сообщено через https://daliastudy.ru/. Без персональных данных и прогресса обучения.');
 return lines.join('\n');
}
function wordReportUrl(word,kind,details){
 const params=new URLSearchParams();
 const ch=keyOf(word);
 params.set('title','Ошибка в dalia'+(ch?' — '+ch:'')+': '+kind);
 params.set('body',wordReportText(ch,kind,details));
 return 'https://github.com/neebooblick/dalia/issues/new?'+params.toString();
}
function openWordReport(){
 const form=document.createElement('form');
 form.className='word-report-form';
 const intro=document.createElement('p');intro.className='tiny muted';
 intro.textContent='Нашёл неточность в словаре или неполадку на сайте? Опиши её — это поможет улучшить dalia.';
 const labelWord=document.createElement('label');labelWord.htmlFor='word-report-word';labelWord.textContent='Слово или иероглиф (необязательно)';
 const word=document.createElement('input');word.type='text';word.id='word-report-word';word.className='field';
 word.maxLength=40;word.placeholder='Например, 你好';
 const labelKind=document.createElement('label');labelKind.htmlFor='word-report-kind';labelKind.textContent='Что нужно исправить?';
 const kind=document.createElement('select');kind.id='word-report-kind';kind.className='field';kind.required=true;
 for(const [value,caption] of [
  ['','Выбери тип ошибки'],
  ['Неверный перевод','Неверный перевод'],
  ['Ошибка в пиньине','Ошибка в пиньине'],
  ['Ошибка в китайском примере','Ошибка в китайском примере'],
  ['Ошибка в переводе примера','Ошибка в переводе примера'],
  ['Ошибка в работе сайта','Ошибка в работе сайта'],
  ['Другая ошибка','Другое']
 ]){const option=new Option(caption,value);option.disabled=!value;option.selected=!value;kind.append(option)}
 const labelDetails=document.createElement('label');labelDetails.htmlFor='word-report-details';labelDetails.textContent='Что не так?';
 const details=document.createElement('textarea');details.id='word-report-details';details.className='field';details.rows=4;details.required=true;details.minLength=5;details.maxLength=1000;
 details.placeholder='Опиши проблему или предложи правильный вариант.';
 const notice=document.createElement('p');notice.className='tiny muted word-report-notice';
 notice.textContent='Обращение откроется на GitHub. Для публикации нужен аккаунт и подтверждение отправки. Сообщение будет общедоступным — не указывай личные данные.';
 const actions=document.createElement('div');actions.className='word-report-buttons';
 const send=makeBtn('Продолжить на GitHub ↗','primary',()=>{
  if(!form.reportValidity())return;
  window.open(wordReportUrl(word.value,kind.value,details.value),'_blank','noopener,noreferrer');
 });
 const copy=makeBtn('Скопировать обращение','soft',async()=>{
  if(!form.reportValidity())return;
  const body=wordReportText(word.value,kind.value,details.value);
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(body);
   toast('Текст обращения скопирован.','good');
  }catch(_){
   const temp=document.createElement('textarea');temp.value=body;
   temp.style.cssText='position:fixed;left:-10000px;top:0';
   document.body.append(temp);temp.select();
   const ok=document.execCommand('copy');temp.remove();
   toast(ok?'Текст обращения скопирован.':'Не удалось скопировать: попробуй открыть GitHub.',ok?'good':'bad');
  }
 });
 actions.append(send,copy);
 const back=makeBtn('← Назад к настройкам','word-report-back',openSettings);
 form.addEventListener('submit',e=>{e.preventDefault();send.click()});
 form.append(intro,labelWord,word,labelKind,kind,labelDetails,details,notice,actions,back);
 showModal('Сообщить об ошибке',form);
}

function openWord(ch,fromSentence=false,randomSession=false){const w=lookup(ch);if(!w)return toast('Карточки пока нет в словаре.');currentWord=ch;const box=document.createElement('div');if(randomSession)box.classList.add('random-word-card');box.innerHTML=`<div class="big-glyph">${escapeHTML(w.ch)}</div><div class="modal-pin">${escapeHTML(w.pinyin)}</div><div class="modal-meaning">${escapeHTML(w.meaning)}</div>`;if(canHidePinyin(ch)){const pin=box.querySelector(".modal-pin");pin.classList.add("hidden");const show=makeBtn("Показать пиньинь","ghost pinyin-reveal",()=>{pin.classList.remove("hidden");show.remove()});pin.after(show)}if(w.cn&&w.ru){const sentence=document.createElement('div');sentence.className='sentence-panel';sentence.append(interactiveSentence(w.cn,w.ch));const ru=document.createElement('div');ru.className='ru';ru.textContent=w.ru;sentence.append(ru);box.append(sentence)}else{const note=document.createElement('p');note.className='tiny muted';note.textContent='Учебный пример для этой карточки пока не добавлен.';box.append(note)}const additionalSenses=renderMoreMeanings(w);if(additionalSenses)box.append(additionalSenses);
 const similar=relatedHanzi(w.ch);
 if(similar.length){const section=document.createElement('section');section.className='similar-hanzi';const label=document.createElement('div');label.className='eyebrow';label.textContent='Легко перепутать';section.append(label);const items=document.createElement('div');items.className='similar-hanzi-items';for(const other of similar){const entry=lookup(other);const b=makeBtn(`${other} · ${entry.meaning}`,'ghost similar-hanzi-btn',()=>{wordStack.push(ch);openWord(other,true)});b.title=entry.pinyin;items.append(b)}section.append(items);box.append(section)}if(w.origin==='reference'){const caveat=document.createElement('details');caveat.className='reference-disclosure';const summary=document.createElement('summary');summary.textContent='Об уровне и чтении иероглифа';const info=document.createElement('p');info.textContent='Это справочное значение отдельного знака. В сложных словах чтение и смысл могут отличаться; предложение показывает употребление всего выражения. Уровень HSK ориентировочный, а не официальный.';caveat.append(summary,info);box.append(caveat)}if(EXTRA_EXAMPLES[w.ch]){const more=document.createElement('div');more.className='more-examples';const label=document.createElement('div');label.className='eyebrow';label.textContent='Другие примеры';more.append(label);for(const [cn,ruText] of EXTRA_EXAMPLES[w.ch]){const part=document.createElement('div');part.className='sentence-panel';part.append(interactiveSentence(cn,w.ch));const r=document.createElement('div');r.className='ru';r.textContent=ruText;part.append(r);part.append(makeBtn('♫ Произнести','ghost',()=>speak(cn)));more.append(part)}box.append(more)}const hint=document.createElement('p');hint.className='tiny muted';hint.textContent='Нажми на знак в примере — увидишь краткий перевод и сможешь его озвучить.';box.append(hint);const actions=document.createElement('div');actions.className='fullrow'+(randomSession?' random-word-actions':'');
 actions.append(makeBtn('♫ Слово','soft',()=>speak(w.ch)),makeBtn('♫ Пример','soft',()=>speak(w.cn)));
 let justMarkedHere=false;
 const learnedButton=makeBtn('', 'study-toggle',()=>{
  if(state.learned.includes(ch)){
   clearLearnedMark(ch);
   if(justMarkedHere){const d=state.daily[dayString()];if(d&&Number(d.learn)>0)d.learn--;justMarkedHere=false}
   toast('Отметка «Изучено» снята.','good');
  }else{
   state.learned.push(ch);markActivity('learn');justMarkedHere=true;
   toast('Отмечено как изученное. Повторное нажатие снимет отметку.','good');
  }
  save();renderWords();refreshLearnedButton();
 });
 function refreshLearnedButton(){
  const learned=state.learned.includes(ch);
  learnedButton.textContent=learned?'✓ Изучено':'＋ Изучить';
  learnedButton.className='study-toggle '+(learned?'is-learned':'is-not-learned');
  learnedButton.setAttribute('aria-pressed',String(learned));
  learnedButton.title=learned?'Нажми, чтобы снять отметку «Изучено»':'Отметить карточку как изученную';
 }
 refreshLearnedButton();actions.append(learnedButton);box.append(actions);const controls=document.createElement('div');controls.className='fullrow'+(randomSession?' random-word-controls':'');controls.append(makeBtn(state.favorites.includes(ch)?'♥ Убрать из избранного':'♡ В избранное','ghost',()=>{
 const wasFavorite=state.favorites.includes(ch);
 if(wasFavorite){removeFavorite(ch);if(level==='favorite'){closeModal();return}}
 else{toggleFavorite(ch);renderWords()}
 openWord(ch,false,randomSession);
}));if(w.origin==='custom'||w.origin==='photo'){
 controls.append(makeBtn('✎ Изменить','soft',()=>openEditor(w)));

 controls.append(makeBtn('Удалить','danger',()=>{
  if(!confirm(`Удалить иероглиф «${ch}» из каталога?`))return;
  downloadJSON(`dalia-before-delete-${dayString()}.json`,{app:'dalia',version:7,created:new Date().toISOString(),data:state});
  state.custom=state.custom.filter(x=>x.ch!==ch);state.hidden=state.hidden.filter(x=>x!==ch);
  state.learned=state.learned.filter(x=>x!==ch);state.favorites=state.favorites.filter(x=>x!==ch);resetStudyDays(ch);
  delete state.srs[ch];delete state.skillStats[ch];delete state.writingStats[ch];save();closeModal();renderWords();toast('Иероглиф удалён.');
 }));
}box.append(controls);
 /* Случайная карточка: переход закреплён в шапке модального окна, не в длинном тексте. */
 if(fromSentence||wordStack.length)box.append(makeBtn('← Назад к предыдущему','ghost wide',()=>{const prev=wordStack.pop();if(prev)openWord(prev)}));showModal(`${(w.origin==='additional'?'Вне HSK · уровень '+w.level:w.origin==='hsk'?(w.level?'HSK '+w.level:'Вне уровней HSK'):w.origin==='builtin'?'HSK '+w.level:w.origin==='reference'?'≈ HSK '+w.level:'Личный каталог')} · ${w.ch}`,box);
 if(randomSession){
  const nextButton=$('modal-next-random');nextButton.classList.remove('hidden');
  nextButton.onclick=()=>{const pool=[...wordsMap().values()].filter(item=>item.ch!==ch);if(!pool.length)return toast('Других карточек пока нет.');openWord(pick(pool).ch,false,true)};
 }
}
function wordForm(w,onSubmit,submitText='Сохранить карточку',allowDraft=false){
 const form=document.createElement('form');form.className='formgrid';
 const fields=[['ch','Слово или иероглиф','text'],['pinyin','Пиньинь','text'],['meaning','Значение на русском','text'],['cn','Предложение на китайском','textarea'],['ru','Перевод предложения на русский','textarea']];
 const inputs={};for(const [k,label,type] of fields){const wrap=document.createElement('div');if(k==='cn'||k==='ru')wrap.className='full';const lbl=document.createElement('label');lbl.textContent=label;const el=document.createElement(type==='textarea'?'textarea':'input');el.id='dalia-word-'+k;lbl.htmlFor=el.id;el.className='field';el.value=w[k]||'';el.required=k==='ch'||!allowDraft;if(k==='ch')el.maxLength=12;wrap.append(lbl,el);form.append(wrap);inputs[k]=el}
 const status=document.createElement('div');status.className='note full';status.textContent='Введите слово или иероглиф. При наличии данных Dalia предложит перевод и пример; пиньинь проверь и введи вручную. Если данных не хватает, символ всё равно можно сохранить в черновики и дополнить позже.';form.append(status);
 const auto=makeBtn('✦ Автозаполнить','soft',()=>fill());auto.classList.add('full');form.append(auto);
 let seq=0;
 async function fill(){const n=++seq,ch=keyOf(inputs.ch.value);if(!isHanzi(ch)){status.textContent='Введите китайское слово или иероглиф.';return}
 const local=builtins.get(ch)||state.custom.find(x=>x.ch===ch);
 if(local){for(const k of ['pinyin','meaning','cn','ru'])if(!inputs[k].value.trim())inputs[k].value=local[k]||'';status.textContent='✓ Данные найдены во встроенном каталоге. Если символ уже есть, повторно добавить его нельзя.';return}
 const example=findExample(ch,'');if(example){if(!inputs.cn.value.trim())inputs.cn.value=example.cn;if(!inputs.ru.value.trim())inputs.ru.value=example.ru||''}
 if(!inputs.pinyin.value.trim()&&[...ch].length===1){const suggestion=approxPinyin(ch);if(suggestion)inputs.pinyin.value=suggestion;}
 status.textContent='✦ Получаю недостающие переводы онлайн…';auto.disabled=true;
 const errors=[];const tasks=[];
 if(!inputs.meaning.value.trim())tasks.push(translateOnline(ch).then(v=>{if(n===seq&&!inputs.meaning.value.trim())inputs.meaning.value=v}).catch(e=>{if(n===seq)errors.push('значение: '+e.message)}));
 if(inputs.cn.value.trim()&&!inputs.ru.value.trim())tasks.push(translateOnline(inputs.cn.value.trim()).then(v=>{if(n===seq&&!inputs.ru.value.trim())inputs.ru.value=v}).catch(e=>{if(n===seq)errors.push('предложение: '+e.message)}));
 await Promise.all(tasks);if(n!==seq)return;
 auto.disabled=false;
 if(!inputs.cn.value.trim())errors.push('нет подходящего контекстного предложения — его нужно указать вручную');
 if(!inputs.pinyin.value.trim())errors.push('не удалось определить пиньинь');
 status.textContent=errors.length?'Часть данных пока не найдена: '+errors.join('; ')+'. Можно сохранить символ на уточнение.':'Проверь данные перед сохранением. Если каких-то полей не хватает, запись попадёт в черновики.';
 }
 inputs.ch.addEventListener('input',()=>{seq++;auto.disabled=false;status.textContent='Нажми «Автозаполнить» или подожди: поиск начнётся автоматически.';clearTimeout(inputs.ch._autoTimer);inputs.ch._autoTimer=setTimeout(()=>{if(isHanzi(keyOf(inputs.ch.value)))fill()},450)});
 const footer=document.createElement('div');footer.className='fullrow full';const cancel=makeBtn('Отмена','ghost',closeModal),submit=document.createElement('button');submit.className='primary';submit.textContent=submitText;submit.type='submit';footer.append(cancel,submit);form.append(footer);
 form.addEventListener('submit',e=>{e.preventDefault();const x=normalizeWord(Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.value])));if(!isHanzi(x.ch))return toast('Введите китайский иероглиф или слово.','bad');if(!validWord(x)&&!allowDraft)return toast('Для готовой учебной карточки нужны корректные пиньинь, перевод и пример с переводом.','bad');onSubmit(x)});
 return form
}
function addNewWord(prefill={}){showModal('Добавить слово или иероглиф',wordForm(prefill,w=>{
 if(builtins.has(w.ch)||state.custom.some(x=>x.ch===w.ch)){toast('Такое слово уже есть в каталоге — дубликат не добавлен.','bad');return}
 const complete=validWord(w);
 state.drafts=state.drafts.filter(x=>x.ch!==w.ch);
 if(complete)state.custom.push(w);else state.drafts.push({...w,origin:'photo'});
 if(!save())return;
 closeModal();renderWords();renderDrafts();
 if(complete)toast(`✦ ${w.ch} добавлен в каталог.`,'good');
 else{navigate('photo');$('photo-drafts')?.scrollIntoView({behavior:'smooth',block:'start'});toast(`✦ ${w.ch} сохранён для уточнения. Можно дополнить позже.`,'good')}
},'Сохранить',true))}
function openEditor(w){showModal(`Редактировать ${w.ch}`,wordForm(w,x=>{if(x.ch!==w.ch&&(builtins.has(x.ch)||state.custom.some(i=>i.ch===x.ch))){toast('Нельзя заменить на уже существующий символ.','bad');return}const index=state.custom.findIndex(i=>i.ch===w.ch);if(index<0)return;state.custom[index]={...x,origin:w.origin||'custom'};if(x.ch!==w.ch){state.learned=state.learned.map(c=>c===w.ch?x.ch:c);state.autoLearned=state.autoLearned.map(c=>c===w.ch?x.ch:c);state.favorites=state.favorites.map(c=>c===w.ch?x.ch:c);if(state.srs[w.ch]){state.srs[x.ch]=state.srs[w.ch];delete state.srs[w.ch]}if(state.skillStats[w.ch]){state.skillStats[x.ch]=state.skillStats[w.ch];delete state.skillStats[w.ch]}if(state.studyDays[w.ch]){state.studyDays[x.ch]=state.studyDays[w.ch];delete state.studyDays[w.ch]}if(state.writingStats[w.ch]){state.writingStats[x.ch]=state.writingStats[w.ch];delete state.writingStats[w.ch]}}save();renderWords();openWord(x.ch);toast('Карточка обновлена.','good')},'Сохранить изменения'))}
$('manual-open').addEventListener('click',()=>addNewWord());
function pick(pool){return pool[Math.floor(Math.random()*pool.length)]}function pickWeighted(pool){
 const weights=pool.map(w=>{
  const review=state.srs[w.ch]||{};
  const overdue=review.next&&review.next<dayString()?2.5:0;
  const due=dueNow(w.ch)?4:0;
  const errors=Math.min(5,Number(review.errors)||0)*.55;
  const newWord=state.learned.includes(w.ch)?0:1;
  const handwriting=mode==='writing'&&[...w.ch].length===1?Math.min(9,writingDifficulty(w.ch)*.85):0;
  const skill=mode==='meaning'?'recognition':mode==='reverse'?'recall':mode==='listening'?'listening':'writing';
  return Math.max(.15,1+due+overdue+errors+newWord+handwriting+adaptiveWeight(w.ch,skill)*1.25);
 });
 let roll=Math.random()*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i]}
 return pool[pool.length-1];
}
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}

function selectedPracticeWords(){const chosen=new Set(state.practiceLevels);return [...wordsMap().values()].filter(w=>chosen.has(w.origin==='builtin'||w.origin==='reference'||w.origin==='hsk'?(Number(w.level)>=1&&Number(w.level)<=6?String(w.level):'additional'):w.origin==='additional'?'additional':'custom'))}
function availablePractice(){const selected=selectedPracticeWords();return dueOnly?selected.filter(w=>dueNow(w.ch)):selected}
// Skill-specific adaptive selection for ordinary practice, without guided sessions.
const skillForMode=m=>m==='meaning'?'recognition':m==='reverse'?'recall':m==='listening'?'listening':m==='translate'?'translation':'writing';
function pickWithSkill(pool,skill){
 const weights=pool.map(w=>adaptiveWeight(w.ch,skill)+(state.learned.includes(w.ch)?0:1));let sum=weights.reduce((a,b)=>a+b,0),n=Math.random()*sum;
 for(let i=0;i<pool.length;i++){n-=weights[i];if(n<=0)return pool[i]}return pool.at(-1);
}
function guidedPracticeScroll(target){
 if(!target)return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!target.isConnected)return;
  const offset=(document.querySelector('.topbar')?.getBoundingClientRect().height||70)+16;
  const y=Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset);
  window.scrollTo({top:y,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }));
}
function advanceQuestion(){newQuestion();guidedPracticeScroll($('quiz-area'))}
function renderPractice(){
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
 $('practice-pool').textContent=`Только к повторению: ${dueOnly?'вкл.':'выкл.'}`;
 document.querySelectorAll('[data-practice-level]').forEach(b=>{const active=state.practiceLevels.includes(b.dataset.practiceLevel);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 const count=availablePractice().length,total=selectedPracticeWords().length;
 $('practice-level-status').textContent=state.practiceLevels.length===0?'Не выбран ни один уровень. Выбери HSK или «Свои слова».':`${count} карточек для практики${dueOnly?` · всего: ${total}`:''} · ${state.practiceLevels.map(l=>/^[1-6]$/.test(l)?'HSK '+l:l==='additional'?'Другие слова':'Свои слова').join(' + ')}`;
 newQuestion();
}
function nextQuestion(){advanceQuestion()}
function renderSentenceTranslation(area,w){
 const guide=document.createElement('div');guide.className='tiny muted';guide.textContent='Пиши китайскими иероглифами. Пробелы и знаки препинания не влияют на оценку. Для части заданий принимаются несколько вариантов.';area.append(guide);
 const prompt=document.createElement('div');prompt.className='translation-prompt';prompt.textContent=w.ru;area.append(prompt);
 const input=document.createElement('textarea');input.className='field translation-input';input.rows=2;input.maxLength=600;input.autocomplete='off';input.spellcheck=false;input.lang='zh-CN';input.setAttribute('aria-label','Перевод предложения на китайский');input.placeholder='Например: 我今天很忙';area.append(input);
 const feedback=document.createElement('div');feedback.className='feedback translation-feedback';feedback.id='translation-feedback';feedback.setAttribute('aria-live','polite');input.setAttribute('aria-describedby',feedback.id);area.append(feedback);
 const examples=document.createElement('div');examples.className='translation-examples';area.append(examples);
 const actions=document.createElement('div');actions.className='row translation-actions';area.append(actions);
 let hinted=false,finished=false,hadError=false,unconfirmed=false,compared=false;
 const showFeedback=(text,status='')=>{feedback.textContent=text;feedback.classList.toggle('good',status==='good');feedback.classList.toggle('bad',status==='bad');input.setAttribute('aria-invalid',String(status==='bad'))};
 const showExamples=()=>{
  examples.replaceChildren();
  const title=document.createElement('p');title.className='tiny muted';title.textContent='Один из вариантов перевода';examples.append(title,interactiveSentence(w.cn,w.ch));
  const variants=DaliaTranslation.variants(w).filter(s=>DaliaTranslation.normalize(s)!==DaliaTranslation.normalize(w.cn));
  if(variants.length){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');summary.textContent='Другие допустимые варианты';for(const s of variants){const item=document.createElement('li');item.lang='zh-CN';item.textContent=s;list.append(item)}details.append(summary,list);examples.append(details)}
  const note=DaliaTranslation.check(w,w.cn).note;
  if(note){const explanation=document.createElement('p');explanation.className='tiny muted';explanation.textContent=note;examples.append(explanation)}
  examples.append(makeBtn('♫ Прослушать пример','ghost',()=>speak(w.cn)));
 };
 const finish=(correct,reveal=false)=>{
  if(finished)return;finished=true;input.disabled=true;actions.replaceChildren();
  // An unrecognised answer is not evidence of a mistake. Revealing after it
  // permits self-comparison without recording either success or failure.
  const neutral=unconfirmed&&(reveal||hinted)&&!hadError;
  if(!neutral)recordSkill(w.ch,'translation',{correct:correct&&!hadError,hint:hinted||reveal,assisted:hadError});
  showFeedback(neutral?(correct?'Этот вариант подходит. После сравнения ответ оставлен без оценки.':'Сравни свой перевод с примером. Ответ оставлен без оценки.'):reveal?'Посмотри пример и попробуй похожее задание позже.':hinted?'Верно. В этот раз ты воспользовался подсказкой.':hadError?'Верно, ты исправил ошибку. Это слово ещё встретится в повторении.':'Верно! Этот вариант подходит.',correct?'good':'');
  showExamples();actions.append(makeBtn('Следующее предложение →','primary',()=>advanceQuestion()));
 };
 const check=()=>{
  if(finished)return;
  const result=DaliaTranslation.check(w,input.value);
  if(result.status==='correct'){finish(true);return}
  if(result.status==='incorrect')hadError=true;
  if(result.status==='unknown')unconfirmed=true;
  showFeedback(result.message,result.status==='incorrect'?'bad':'');
  checkButton.textContent='Проверить ещё раз';input.focus({preventScroll:true});
 };
 const checkButton=makeBtn('Проверить','primary',check);actions.append(checkButton);
 actions.append(makeBtn('Подсказка','ghost',()=>{if(finished)return;hinted=true;showFeedback('Начало одного из вариантов: '+[...w.cn].slice(0,2).join('')+'…')}));
 actions.append(makeBtn('Показать ответ','ghost',()=>finish(false,true)));
 actions.append(makeBtn('Сравнить с примером','ghost',()=>{
  if(finished)return;
  compared=true;hinted=true;showExamples();
  showFeedback('Сравни слова и их порядок. Если твой вариант тоже верен, пропусти задание без оценки. Можно продолжить с опорой на пример.');
 }));
 actions.append(makeBtn('Пропустить без оценки','ghost',()=>{if(finished)return;finished=true;advanceQuestion()}));
 input.addEventListener('input',()=>{if(finished)return;showFeedback('');if(!compared)examples.replaceChildren()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();check()}});
 input.focus({preventScroll:true});
}
function newQuestion(){
 stopSpeech();
 if(closeWritingSession)closeWritingSession();
 const area=$('quiz-area');area.replaceChildren();area.classList.remove('quiz-answered');
 let pool=availablePractice();
 if(mode==='translate')pool=pool.filter(w=>w.cn&&w.ru);
 if(!pool.length){area.innerHTML='<div class="empty">'+(mode==='translate'?'В выбранных уровнях пока нет предложений для перевода. Выбери другие уровни.':'Нет карточек для выбранных уровней. Можно отключить фильтр повторения.')+'</div>';return}
 const lengths=new Map();
 if(mode==='listening')for(const w of wordsMap().values()){
  const n=[...w.ch].length;lengths.set(n,(lengths.get(n)||0)+1);
 }
 const eligible=mode==='writing'?pool.filter(w=>[...w.ch].length===1):mode==='listening'?pool.filter(w=>(lengths.get([...w.ch].length)||0)>=2):pool;
 const candidates=eligible.length>1?eligible.filter(w=>w.ch!==previousQuestion):eligible;
 question=practiceNextOverride&&eligible.some(w=>w.ch===practiceNextOverride)?eligible.find(w=>w.ch===practiceNextOverride):candidates.length?pickWithSkill(candidates,skillForMode(mode)):null;practiceNextOverride=null;
 if(question)previousQuestion=question.ch;answered=false;
 if(!question){area.innerHTML='<div class="empty">'+(mode==='listening'?'Недостаточно слов одинаковой длины для вариантов ответа. Выбери другие уровни.':'Для написания выбери отдельный иероглиф.')+'</div>';return}
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
 const guide=document.createElement('div');guide.className='tiny muted';guide.textContent=mode==='meaning'?'Выбери перевод китайского слова':mode==='reverse'?'Вспомни и введи слово по-китайски':mode==='listening'?'Слушай слово, не глядя на иероглифы':mode==='translate'?'Переведи русское предложение на китайский':'Напиши иероглиф без подсказок или по трафарету';area.append(guide);
 if(mode==='translate'){renderSentenceTranslation(area,question);return}
 if(mode==='writing'){renderWriting(area,question);return}
 const head=document.createElement('div');head.className='question-glyph';
 if(mode==='meaning'){head.textContent=question.ch;if(canHidePinyin(question.ch)){const n=document.createElement('small');n.className='question-pinyin-note';n.textContent='Пиньинь появится после ответа';head.append(n)}}
 else if(mode==='reverse'){head.textContent=question.meaning;head.classList.add('recall-heading')}
 else{head.classList.add('listen-heading');head.textContent='♫';}
 area.append(head);
 const feedback=document.createElement('div');feedback.className='feedback';const entrySection=document.createElement('div');area.append(entrySection,feedback);
 let audioPlays=0,usedHint=false,locked=false;
 let answerChoices=[];let chosenWrongWord=null;
 let listeningAudioReady=mode!=='listening';let listeningGrid=null;let listeningHelper=null;
 const playForListening=(slow=false)=>{
  if(mode!=='listening')return speak(question.ch,{slow});
  audioPlays++;
  const started=speak(question.ch,{
   slow,requireChineseVoice:true,
   onStart:()=>{
    if(answered||mode!=='listening')return;
    listeningAudioReady=true;
    if(listeningGrid)listeningGrid.querySelectorAll('button').forEach(b=>b.disabled=false);
    if(listeningHelper)listeningHelper.textContent='Выбери написание услышанного слова. Повторное прослушивание не считается ошибкой.';
   },
   onError:error=>{
    if(answered||mode!=='listening')return;
    if(!listeningAudioReady){
     if(listeningHelper)listeningHelper.textContent=error==='no-voice'?'Китайский голос пока не найден. Попробуй снова или выбери другой режим.':error==='muted'?'Громкость голоса 0%. Увеличь её в настройках, чтобы пройти упражнение.':'Звук не начался. Нажми «Прослушать слово» ещё раз; ответ не будет засчитан без звука.';
     if(listeningGrid)listeningGrid.querySelectorAll('button').forEach(b=>b.disabled=true);
    }
   }
  });
  if(!started&&!listeningAudioReady&&listeningHelper)listeningHelper.textContent='Не удалось включить звук. Сначала проверь доступность китайского голоса.';
  return started;
 };
 const speakQuestion=()=>playForListening(false);
 if(mode==='listening'){
  if(!chosenChineseVoice()){
   const unavailable=document.createElement('div');unavailable.id='listening-unavailable';unavailable.className='listening-unavailable';
   unavailable.innerHTML='<div class="listening-unavailable-symbol" aria-hidden="true">♫</div><h3>Нужен китайский голос</h3><p>На этом устройстве пока нет доступной китайской озвучки. Dalia не будет оценивать аудирование без звука.</p>';
   unavailable.append(makeBtn('Проверить снова','primary',newQuestion),makeBtn('Перейти к переводу','ghost',()=>{mode='meaning';renderPractice()}));
   area.replaceChildren(unavailable);return;
  }
  const listenActions=document.createElement('div');listenActions.className='listen-actions';
  listenActions.append(makeBtn('♫ Прослушать слово','primary',speakQuestion),makeBtn('Медленнее','soft',()=>playForListening(true)));
  const helper=document.createElement('p');helper.className='tiny muted';helper.setAttribute('aria-live','polite');helper.textContent='Нажми «Прослушать слово», затем выбери ответ.';
  listeningHelper=helper;entrySection.append(listenActions,helper);
  // Choices unlock only when the browser confirms speech actually started.
 }
 function answerSummary(correct,{selfReveal=false,guess=''}={}){
  if(answered)return;answered=true;locked=true;area.classList.add('quiz-answered');
  entrySection.querySelectorAll('button,input').forEach(x=>x.disabled=true);
  if(mode==='listening')head.textContent=question.ch;
  const skill=skillForMode(mode),effective=correct&&!selfReveal&&!usedHint;
  if(mode!=='listening'||listeningAudioReady)recordSkill(question.ch,skill,{correct:effective,hint:selfReveal||usedHint});
  const result=document.createElement('section');result.className='answer-summary '+(effective?'answer-is-correct':'answer-is-wrong');result.setAttribute('aria-live','polite');
  const header=document.createElement('div');header.className='answer-summary-head';const mark=document.createElement('span');mark.className='answer-mark';mark.textContent=effective?'✓':'↗';
  const status=document.createElement('div');status.className='answer-status';status.textContent=selfReveal?'Ответ открыт':effective?'Верно':'Разберём ответ';header.append(mark,status);result.append(header);
  
  if(guess&&!effective){const tried=document.createElement('p');tried.className='answer-typed';tried.textContent='Твой ответ: '+guess;result.append(tried)}
  const definition=document.createElement('div');definition.className='answer-definition';definition.innerHTML=`<div class="answer-hanzi">${escapeHTML(question.ch)}</div><div class="answer-pinyin">${escapeHTML(question.pinyin)}</div><div class="answer-meaning">${escapeHTML(question.meaning)}</div>`;result.append(definition);
  if(question.cn&&question.ru){const example=document.createElement('div');example.className='answer-example';
   const top=document.createElement('div');top.className='answer-overline';top.textContent='В предложении';
   const chinese=document.createElement('div');chinese.className='answer-example-cn';chinese.append(interactiveSentence(question.cn,question.ch));
   const translation=document.createElement('div');translation.className='answer-example-ru';translation.textContent=question.ru;
   example.append(top,chinese,translation);result.append(example);
  }else{const note=document.createElement('p');note.className='tiny muted';note.textContent='Учебный пример для этой карточки пока не добавлен.';result.append(note)}
  // После ответа разбор доступен по нажатию на любой вариант: ничего не раскрывается заранее.
  if(answerChoices.length>1){
   const review=document.createElement('section');review.className='answer-choice-review';
   const reviewTitle=document.createElement('h3');reviewTitle.className='answer-review-title';reviewTitle.textContent='Разбор вариантов';
   const reviewHint=document.createElement('p');reviewHint.className='answer-review-hint';reviewHint.textContent='Выбери вариант — появится карточка с переводом и произношением.';
   const choiceGrid=document.createElement('div');choiceGrid.className='answer-review-grid';
   const reveal=document.createElement('div');reveal.className='answer-choice-reveal';reveal.setAttribute('aria-live','polite');reveal.hidden=true;
   const buttons=[];let activeChoice='';
   for(const word of answerChoices){
    const label=mode==='meaning'?word.meaning:word.ch;
    const btn=makeBtn(label,'answer-review-choice',()=>{
     const isSame=activeChoice===word.ch;activeChoice=isSame?'':word.ch;
     for(const b of buttons){const selected=b.dataset.word===activeChoice;b.classList.toggle('is-active',selected);b.setAttribute('aria-expanded',String(selected))}
     reveal.replaceChildren();reveal.hidden=isSame;
     if(isSame)return;
     const card=document.createElement('div');card.className='answer-choice-card';
     const eyebrow=document.createElement('div');eyebrow.className='answer-choice-card-kicker';eyebrow.textContent=word.ch===question.ch?'✓ Правильный вариант':chosenWrongWord&&word.ch===chosenWrongWord.ch?'Твой ответ':'Другой вариант';
     const hanzi=document.createElement('div');hanzi.className='answer-choice-card-hanzi';hanzi.textContent=word.ch;
     const pinyin=document.createElement('div');pinyin.className='answer-choice-card-pinyin';pinyin.textContent=word.pinyin;
     const meaning=document.createElement('div');meaning.className='answer-choice-card-meaning';meaning.textContent=word.meaning;
     const speakBtn=makeBtn('♫ Прослушать','soft answer-choice-card-audio',()=>speak(word.ch));
     const textBlock=document.createElement('div');textBlock.className='answer-choice-card-content';textBlock.append(eyebrow,hanzi,pinyin,meaning);
     card.append(textBlock,speakBtn);reveal.append(card);
    });
    btn.dataset.word=word.ch;btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Показать перевод: '+label);btn.setAttribute('aria-controls','answer-choice-reveal');
    if(word.ch===question.ch)btn.classList.add('is-correct');
    if(chosenWrongWord&&word.ch===chosenWrongWord.ch)btn.classList.add('is-wrong');
    choiceGrid.append(btn);buttons.push(btn);
   }
   reveal.id='answer-choice-reveal';review.append(reviewTitle,reviewHint,choiceGrid,reveal);result.append(review);
  }
  const audio=document.createElement('div');audio.className='answer-audio';audio.append(makeBtn('♫ Слово','soft',()=>speak(question.ch)),makeBtn('♫ Предложение','soft',()=>speak(question.cn)));result.append(audio);
  const next=makeBtn('Следующее слово →','primary next-practice',advanceQuestion);result.append(next);
  const info=document.createElement('p');info.className='answer-automatic';info.textContent=mode==='listening'&&!listeningAudioReady?'Без воспроизведения результат не записан — попробуй позже.':effective?'✓ Верный ответ учтён. Следующее повторение Dalia назначит сама.':'✦ Это слово ещё встретится в упражнениях — ничего отмечать не нужно.';result.append(info);
  feedback.replaceChildren(result);guidedPracticeScroll(result);
 }
 if(mode==='reverse'){
  const recall=document.createElement('div');recall.className='recall-area';const input=document.createElement('input');input.className='field recall-input';input.type='text';input.lang='zh-CN';input.placeholder='Напиши иероглифы…';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label','Ответ на китайском');
  const check=makeBtn('Проверить','primary',()=>{const value=input.value.trim();if(!value){toast('Введи ответ или открой подсказку.');return}answerSummary(value.replace(/\s/g,'')===question.ch.replace(/\s/g,''),{guess:value})});
  const reveal=makeBtn('Посмотреть ответ','ghost',()=>answerSummary(false,{selfReveal:true}));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();check.click()}});
  const buttons=document.createElement('div');buttons.className='recall-actions';buttons.append(check,reveal);
  const caption=document.createElement('p');caption.className='tiny muted';caption.textContent='Подсказка доступна, но Dalia учтёт её при следующем повторении.';
  recall.append(input,buttons,caption);entrySection.append(recall);if(!window.matchMedia('(pointer:coarse)').matches)requestAnimationFrame(()=>input.focus({preventScroll:true}));return;
 }
 // Avoid ambiguous multiple-choice answers. Every distractor must have a distinct display.
 const labelFor=w=>mode==='meaning'?w.meaning:w.ch;
 const used=new Set([labelFor(question)]);
 // In listening mode every choice must have the same number of Hanzi as the answer.
 // Prefer the selected levels; supplement from the dictionary only if needed.
 const sameLength=w=>[...w.ch].length===[...question.ch].length;
 const selectedDistractors=pool.filter(w=>w.ch!==question.ch&&(mode!=='listening'||sameLength(w)));
 const fallbackDistractors=mode==='listening'?[...wordsMap().values()].filter(w=>w.ch!==question.ch&&sameLength(w)):[];
 const options=[];
 const distractorPool=[...new Map([...selectedDistractors,...fallbackDistractors].map(w=>[w.ch,w])).values()];
 const toneSignature=pin=>String(pin||'').normalize('NFD').match(/[\u0300-\u036f]/g)?.join('')||'';
 const pinyinDistance=(a,b)=>{
  const x=pinyinSearchKey(a.pinyin),y=pinyinSearchKey(b.pinyin);
  let previous=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){const current=[i];for(let j=1;j<=y.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(x[i-1]===y[j-1]?0:1));previous=current}
  return previous[y.length];
 };
 const ranked=mode==='listening'?distractorPool.map(w=>({w,score:pinyinDistance(question,w)+(.12*(toneSignature(question.pinyin)!==toneSignature(w.pinyin)?1:0))+Math.random()*.22})).sort((a,b)=>a.score-b.score).map(x=>x.w):shuffle(distractorPool);
 for(const w of ranked){
  const key=labelFor(w);if(used.has(key))continue;
  used.add(key);options.push(w);if(options.length>=3)break;
 }
 const choices=shuffle([question,...options]);answerChoices=choices;const grid=document.createElement('div');grid.className='options';entrySection.append(grid);
 if(mode==='listening')listeningGrid=grid;
 for(const w of choices){const btn=makeBtn(labelFor(w),'option',()=>{
  if(locked||mode==='listening'&&!listeningAudioReady)return;
  const ok=w.ch===question.ch;
  grid.querySelectorAll('button').forEach(b=>{if(b.textContent===labelFor(question))b.classList.add('correct')});
  if(!ok){btn.classList.add('wrong');chosenWrongWord=w}daliaSfx(ok?'success':'error');answerSummary(ok);
 });if(mode==='listening'&&!listeningAudioReady)btn.disabled=true;grid.append(btn)}
 if(mode==='listening'){
  const reveal=makeBtn('Посмотреть написание','ghost listen-reveal',()=>answerSummary(false,{selfReveal:true}));entrySection.append(reveal);
  // A blocked autoplay does not award points; user can press play deliberately.
 }
}

const strokeScript='https://cdn.jsdelivr.net/npm/hanzi-writer@3/dist/hanzi-writer.min.js';
let strokeLibraryPromise=null;
function loadStrokeLibrary(){if(window.HanziWriter)return Promise.resolve(window.HanziWriter);if(strokeLibraryPromise)return strokeLibraryPromise;strokeLibraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=strokeScript;script.onload=()=>window.HanziWriter?resolve(window.HanziWriter):reject(Error('Библиотека письма не загрузилась'));script.onerror=()=>reject(Error('Нет доступа к библиотеке Hanzi Writer. Нужен интернет.'));document.head.append(script)}).catch(e=>{strokeLibraryPromise=null;throw e});return strokeLibraryPromise}
// Stroke data is shared by the practice canvas and the optional animation overlay.
// A failed request is not cached so a later attempt can retry.
const strokeDataCache=new Map();
function fetchStrokeData(char){
 if(!strokeDataCache.has(char))strokeDataCache.set(char,fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`)
  .then(r=>{if(!r.ok)throw Error('Для этого иероглифа нет доступных данных о чертах');return r.json()})
  .catch(e=>{strokeDataCache.delete(char);throw e}));
 return strokeDataCache.get(char)
}
function renderWriting(area,w){
 const meaning=document.createElement('div');meaning.className='question-glyph writing-meaning';meaning.textContent=w.meaning;area.append(meaning);
 const selector=document.createElement('div');selector.className='writing-mode-selector';selector.setAttribute('role','group');selector.setAttribute('aria-label','Режим написания');area.append(selector);
 const note=document.createElement('p');note.className='writing-mode-note';area.append(note);
 const wrap=document.createElement('div');wrap.className='canvas-wrap writing-canvas';
 const target=document.createElement('div');target.className='writing-draw-target';wrap.append(target);area.append(wrap);
 const status=document.createElement('div');status.className='note writing-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Подготавливаю поле для письма…';area.append(status);
 const insight=document.createElement('p');insight.className='writing-insight';area.append(insight);
 const example=document.createElement('div');example.className='writing-example hidden';const exampleCn=document.createElement('div');exampleCn.className='cn';exampleCn.append(interactiveSentence(w.cn,w.ch));const exampleRu=document.createElement('div');exampleRu.textContent=w.ru;example.append(exampleCn,exampleRu);area.append(example);
 const actions=document.createElement('div');actions.className='writing-actions';actions.setAttribute('aria-label','Управление тренировкой написания');area.append(actions);
 const setActions=(layout,...buttons)=>{actions.dataset.layout=layout;actions.replaceChildren(...buttons)};
 const setStatus=(text,kind='')=>{status.className='note writing-status'+(kind?' is-'+kind:'');status.textContent=text};
 let writer=null,HW=null,done=false,alive=true,preview=null,previewGeneration=0,quizGeneration=0;
 let attempt={mistakes:0,hints:0,strokes:0,engaged:false,recorded:false,usedTrace:false,autoHintStrokes:new Set()};
 const stillHere=()=>alive&&area.isConnected&&question?.ch===w.ch&&mode==='writing';
 const dropPreview=(immediate=false)=>{
  previewGeneration++;const old=preview;preview=null;if(!old)return;
  if(immediate){old.remove();return}
  old.classList.add('is-fading');old.addEventListener('transitionend',()=>old.remove(),{once:true});
  setTimeout(()=>old.remove(),1200);
 };
 const logHint=()=>{if(!stillHere()||done)return;attempt.engaged=true;attempt.hints++;recordWritingEvent(w.ch,'hint');refreshInsight()};
 const refreshInsight=()=>{
  const s=state.writingStats[w.ch];
  if(!s?.attempts&&!s?.hints&&!s?.mistakes){insight.textContent='Dalia запомнит трудные знаки и предложит их снова.';return}
  insight.textContent=writingDifficulty(w.ch)>=3?'✦ Этот знак в персональной тренировке: он будет встречаться чаще.':'✦ Dalia учитывает твоё написание и подбирает повторения.';
 };
 const finalize=(success)=>{
  if(attempt.recorded)return;attempt.recorded=true;
  recordWritingFinish(w.ch,{...attempt,success});
  if(success){
   const rating=attempt.mistakes>=3?'again':(attempt.hints||attempt.mistakes||attempt.usedTrace)?'hard':'good';
   recordSkill(w.ch,'writing',{correct:rating!=='again',assisted:!!(attempt.hints||attempt.mistakes||attempt.usedTrace)});
  }else if(attempt.engaged)recordSkill(w.ch,'writing',{correct:false,assisted:!!attempt.hints});
  refreshInsight();
 };
 const teardown=()=>{
  if(!alive)return;
  if(!done&&attempt.engaged)finalize(false);
  alive=false;quizGeneration++;dropPreview(true);
  if(writer&&typeof writer.cancelQuiz==='function')writer.cancelQuiz();
  if(closeWritingSession===teardown)closeWritingSession=null;
 };
 closeWritingSession=teardown;
 const goNext=()=>{teardown();advanceQuestion()};
 const renderModes=()=>{
  selector.replaceChildren();
  for(const [id,label] of [['memory','Без трафарета'],['trace','По трафарету']]){
   const btn=makeBtn(label,state.writingGuideMode===id?'writing-mode-button active':'writing-mode-button',()=>{
    if(state.writingGuideMode===id||done)return;
    // Switching the guide changes only the outline: restarting quiz() here
    // would clear strokes already drawn by the learner.
    state.writingGuideMode=id;save({quiet:true});renderModes();
    if(writer){
     if(id==='trace'){
      writer.showOutline({duration:0});
      if(!attempt.usedTrace){attempt.usedTrace=true;logHint()}
     }else writer.hideOutline({duration:0});
     setStatus(id==='trace'?'Обводи контур. Уже написанные черты сохраняются.':'Продолжай писать по памяти — уже написанные черты на месте.');
    }
   });
   btn.dataset.writingGuide=id;btn.setAttribute('aria-pressed',String(state.writingGuideMode===id));btn.disabled=done;selector.append(btn);
  }
  note.textContent=state.writingGuideMode==='trace'?'Обводи розовый контур на тёмном поле. Dalia поможет соблюдать порядок черт.':'Вспоминай форму самостоятельно. Контур можно включить в любой момент.';
 };
 const finish=()=>{
  if(done||!stillHere())return;
  done=true;answered=true;dropPreview(true);example.classList.remove('hidden');finalize(true);renderModes();
  setStatus(`✓ ${w.ch} · ${w.pinyin}. Иероглиф написан!`,'success');
  const summary=attempt.mistakes||attempt.hints||attempt.usedTrace?'Подсказки и трудные штрихи учтены — знак появится для тренировки раньше.':'Отлично! Ты справился без подсказок.';
  const msg=document.createElement('p');msg.className='writing-finish-note';msg.textContent=summary;status.after(msg);
  setActions('finished',makeBtn('Следующий иероглиф →','primary',goNext));
 };
 const begin=()=>{
  if(!writer||!stillHere()||done)return;
  quizGeneration++;const generation=quizGeneration;
  dropPreview(true);example.classList.add('hidden');
  if(typeof writer.cancelQuiz==='function')writer.cancelQuiz();
  const trace=state.writingGuideMode==='trace';
  if(trace){writer.showOutline({duration:0});if(!attempt.usedTrace){attempt.usedTrace=true;logHint()}}
  else writer.hideOutline({duration:0});
  setStatus(trace?'Обводи контур по порядку черт.':'Рисуй по памяти. Если захочешь, включи трафарет.');
  writer.quiz({showHintAfterMisses:2,
   onMistake:d=>{
    if(!stillHere()||done||quizGeneration!==generation)return;
    attempt.engaged=true;attempt.mistakes++;recordWritingEvent(w.ch,'mistake');
    // Hanzi Writer reveals a stroke hint after two misses on that stroke.
    if(Number(d?.mistakesOnStroke)>=2&&!attempt.autoHintStrokes.has(d.strokeNum)){
     attempt.autoHintStrokes.add(d.strokeNum);logHint();
    }
    setStatus('Попробуй провести черту ещё раз — Dalia подскажет направление.');refreshInsight();
   },
   onCorrectStroke:d=>{if(!stillHere()||done||quizGeneration!==generation)return;attempt.engaged=true;attempt.strokes++;setStatus(`✓ Черта ${Number(d?.strokeNum??0)+1} готова. Продолжай!`)},
   onComplete:()=>{if(stillHere()&&quizGeneration===generation)finish()}
  });
  setActions('practice',makeBtn('Показать порядок черт','soft',animate),makeBtn('Начать заново','ghost',()=>{
   if(!stillHere())return;
   // Restarting is not treated as a declared mistake, but observed mistakes are kept.
   begin();
  }),makeBtn('Другой иероглиф →','ghost',goNext));
 };
 const animate=()=>{
  if(!writer||!HW||!stillHere()||done)return;
  logHint();
  // Demonstration is a transparent layer that never steals pen or touch input.
  dropPreview(true);
  const layer=document.createElement('div');layer.className='writing-preview';layer.setAttribute('aria-hidden','true');
  const previewTarget=document.createElement('div');previewTarget.className='writing-preview-target';layer.append(previewTarget);wrap.append(layer);
  preview=layer;const generation=++previewGeneration;
  setStatus('Показываю порядок черт. Можешь начать писать прямо сейчас.');
  const fade=()=>{if(stillHere()&&preview===layer&&previewGeneration===generation)dropPreview(false)};
  let demoWriter=null;
  demoWriter=HW.create(previewTarget,w.ch,{width:330,height:330,padding:16,showCharacter:false,showOutline:false,
   strokeColor:'#ffd5ec',outlineColor:'#986d92',highlightColor:'#ffe4f2',drawingColor:'#ffb5df',strokeAnimationSpeed:1.1,
   charDataLoader:(char,onLoad,onError)=>{fetchStrokeData(char).then(onLoad).catch(onError)},
   onLoadCharDataSuccess:()=>{
    if(!stillHere()||preview!==layer||previewGeneration!==generation)return;
    const svg=layer.querySelector('svg');if(svg)svg.setAttribute('aria-hidden','true');
    if(demoWriter)demoWriter.animateCharacter({onComplete:()=>{if(stillHere()&&preview===layer&&previewGeneration===generation){setStatus('Теперь попробуй написать самостоятельно.');fade()}}});
   },
   onLoadCharDataError:()=>{if(stillHere()&&preview===layer){dropPreview(true);setStatus('Не удалось показать анимацию. Можно продолжить писать самостоятельно.')}}
  });
 };
 wrap.addEventListener('pointerdown',()=>{
  if(!preview||!stillHere())return;
  preview.classList.add('is-user-drawing');dropPreview(false);
  if(!done)setStatus(state.writingGuideMode==='trace'?'Продолжай обводить контур.':'Продолжай писать самостоятельно.');
 },{capture:true});
 renderModes();refreshInsight();
 loadStrokeLibrary().then(Library=>{
  if(!stillHere())return;HW=Library;
  writer=HW.create(target,w.ch,{width:330,height:330,padding:16,showCharacter:false,showOutline:false,
   strokeColor:'#ffcee8',outlineColor:'#956b91',highlightColor:'#ffe2f1',drawingColor:'#ffa6d4',drawingWidth:24,strokeAnimationSpeed:1.1,
   charDataLoader:(char,onLoad,onError)=>{fetchStrokeData(char).then(onLoad).catch(onError)},
   onLoadCharDataSuccess:()=>{if(stillHere())begin()},
   onLoadCharDataError:()=>{if(stillHere()){setStatus('Нет данных о чертах для этого иероглифа.');setActions('finished',makeBtn('Другой иероглиф →','primary',goNext))}}
  });
 }).catch(e=>{if(stillHere()){setStatus('Не удалось загрузить написание: '+e.message+' Нужен интернет.');setActions('finished',makeBtn('Повторить загрузку','soft',()=>renderPractice()))}});
}

function scrollPracticeIntoView(){
 if(window.innerWidth>760||$('page-practice').classList.contains('hidden'))return;
 requestAnimationFrame(()=>{
  const row=$('page-practice').querySelector('.mode-row');
  if(!row)return;
  const top=Math.max(0,window.scrollY+row.getBoundingClientRect().top-78);
  window.scrollTo({top,behavior:'instant'});
 });
}
document.addEventListener('focusin',e=>{
 const el=e.target;
 if(!(el instanceof HTMLElement)||!el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea,select'))return;
 document.body.classList.add('keyboard-focus');
 if(el.classList.contains('recall-input'))requestAnimationFrame(()=>el.scrollIntoView({block:'center',behavior:'instant'}));
});
document.addEventListener('focusout',()=>requestAnimationFrame(()=>{
 const el=document.activeElement;
 if(!(el instanceof HTMLElement)||!el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),textarea,select'))document.body.classList.remove('keyboard-focus');
}));
if(window.visualViewport){
 const syncViewport=()=>document.body.classList.toggle('viewport-keyboard',window.innerWidth<=760&&window.visualViewport.height<window.innerHeight*.76);
 window.visualViewport.addEventListener('resize',syncViewport);
}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{if(closeWritingSession)closeWritingSession();mode=btn.dataset.mode;renderPractice();scrollPracticeIntoView()}));$('practice-pool').addEventListener('click',()=>{dueOnly=!dueOnly;renderPractice()});
const levelContainer=document.querySelector('.practice-levels');if(levelContainer){const wrapper=document.createElement('details');wrapper.className='practice-level-disclosure';const summary=document.createElement('summary');summary.textContent='Уровни HSK · настроить';while(levelContainer.firstChild)wrapper.append(levelContainer.firstChild);wrapper.prepend(summary);levelContainer.append(wrapper);levelContainer.classList.add('is-collapsible')}
document.querySelectorAll('[data-practice-level]').forEach(btn=>btn.addEventListener('click',()=>{const l=btn.dataset.practiceLevel;const initialAll=DEFAULT_PRACTICE_LEVELS.every(x=>state.practiceLevels.includes(x))&&state.practiceLevels.length===DEFAULT_PRACTICE_LEVELS.length;state.practiceLevels=initialAll?[l]:state.practiceLevels.includes(l)?state.practiceLevels.filter(x=>x!==l):PRACTICE_LEVELS.filter(x=>state.practiceLevels.includes(x)||x===l);save({quiet:true});renderPractice()}));
$('practice-level-all').addEventListener('click',()=>{state.practiceLevels=[...DEFAULT_PRACTICE_LEVELS];save({quiet:true});renderPractice()});
function clearPhoto(){ocrJobId++;scan=null;$('photo-result').replaceChildren();$('photo-input').value='';$('photo-gallery-input').value='';$('ocr-preview').classList.add('hidden');if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}$('ocr-preview').removeAttribute('src')}
function scanCard(w,existing,selected){
 const card=document.createElement('div');card.className='scan-card';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.disabled=existing;checkbox.checked=existing?true:selected.has(w.ch);checkbox.setAttribute('aria-label',`Выбрать ${w.ch}`);
 if(!existing)checkbox.addEventListener('change',()=>{checkbox.checked?selected.add(w.ch):selected.delete(w.ch);renderScanAction()});else checkbox.title='Уже в каталоге';
 card.append(checkbox);const glyph=document.createElement('div');glyph.className='scan-glyph';glyph.textContent=w.ch;card.append(glyph);
 const detail=document.createElement('div');detail.className='detail';
 const heading=document.createElement('strong');heading.textContent=(w.pinyin||'Чтение уточняется')+' · '+(w.meaning||'Значение уточняется');detail.append(heading);
 const example=document.createElement('p');example.textContent=w.cn||'Пример пока не найден';detail.append(example);
 const translation=document.createElement('small');translation.textContent=w.ru||'Перевод примера пока не найден';detail.append(translation);
 if(!existing){
  const notice=document.createElement('div');notice.className='note'+(validWord(w)?' notice-good':'');notice.style.marginTop='11px';
  notice.textContent=w.reason||(validWord(w)?'✓ Можно сохранить в словарь. Проверь значение перед добавлением.':'Можно сохранить для уточнения. Неизвестные значения не подменяем догадками.');detail.append(notice);
  const details=document.createElement('details');details.className='scan-edit';
  const summary=document.createElement('summary');summary.textContent='✎ Изменить данные';details.append(summary);
  for(const [k,label] of [['pinyin','Пиньинь'],['meaning','Значение на русском'],['cn','Китайский пример'],['ru','Перевод примера']]){
   const lbl=document.createElement('div');lbl.className='label';lbl.textContent=label;
   const f=k==='cn'||k==='ru'?document.createElement('textarea'):document.createElement('input');f.className='field';f.value=w[k]||'';f.rows=2;
   f.addEventListener('input',()=>{w[k]=f.value.trim();heading.textContent=(w.pinyin||'Чтение уточняется')+' · '+(w.meaning||'Значение уточняется');example.textContent=w.cn||'Пример пока не найден';translation.textContent=w.ru||'Перевод примера пока не найден';renderScanAction()});
   details.append(lbl,f);
  }
  detail.append(details);
 }
 card.append(detail);return card;
}

// Build an offline character index from the verified word/example collection.
// A contextual word gloss is explicitly labelled; it is NOT passed off as the character's literal meaning.
const PHOTO_CONTEXT_INDEX=new Map();
for(const w of builtins.values()){
 if(!w.cn||!w.ru)continue;
 for(const ch of [...new Set([...w.cn].filter(c=>isHanzi(c)))]){
  const item=PHOTO_CONTEXT_INDEX.get(ch)||{examples:[],word:null};
  if(item.examples.length<6&&!item.examples.some(x=>x.cn===w.cn))item.examples.push({cn:w.cn,ru:w.ru,origin:'словарь'});
  if(w.ch.includes(ch)&&w.ch!==ch&&(!item.word||w.ch.length<item.word.ch.length))item.word=w;
  PHOTO_CONTEXT_INDEX.set(ch,item);
 }
}
// Wisdom quotes are not used as photo examples outside the Wisdom tab.
function localPhotoData(ch,recognized=''){
 const exact=builtins.get(ch)||state.custom.find(w=>w.ch===ch);
 if(exact)return {...exact,reason:'✓ Данные найдены во встроенном словаре.'};
 const context=PHOTO_CONTEXT_INDEX.get(ch);
 const example=context?.examples.find(x=>x.cn.length<=36)||context?.examples[0]||findExample(ch,recognized);
 const related=context?.word;
 // The approximate reading is a lookup in the embedded pinyin table, not a generated guess.
 const pinyin=approxPinyin(ch);
 return {ch,pinyin,meaning:'',cn:example?.cn||'',ru:example?.ru||'',origin:'photo',reason:related?`Есть похожее слово «${related.ch}» (${related.meaning}). Это подсказка, а не точный перевод знака. Можно сохранить для уточнения.`:'Значение не подтверждено. Можно сохранить символ для уточнения.'};
}
async function translateOnline(text){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);
 try{const params=new URLSearchParams({q:text,langpair:'zh-CN|ru'});const response=await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`,{signal:controller.signal});if(!response.ok)throw Error(`Сервис перевода: HTTP ${response.status}`);const data=await response.json();if(Number(data?.responseStatus)!==200)throw Error(String(data?.responseDetails||'Сервис не дал ответа'));const result=String(data?.responseData?.translatedText||'').trim();if(!result||result===text||/[\u3400-\u9fff]/.test(result)||/NO QUERY|NOT TRANSLATED|INVALID LANGUAGE/i.test(result))throw Error('Сервис не смог подобрать проверяемый русский перевод');return result}
 finally{clearTimeout(timeout)}
}
function findExample(ch,recognized){
 const all=[...builtins.values()];const w=all.find(w=>w.cn.includes(ch)&&w.cn.length>=4);if(w)return {cn:w.cn,ru:w.ru,origin:'словарь'};
 const chunks=String(recognized||'').split(/[。！？!?；;\n]/).map(x=>x.trim()).filter(x=>x.includes(ch)&&x.length>3&&x.length<=90);if(chunks.length)return {cn:chunks[0]+'。',ru:'',origin:'с фото'};
 return null
}
async function enrichScan(news,recognized,isCurrent=()=>true){
 const unknown=news.filter(w=>!validWord(w));if(!unknown.length)return;
 let done=0;
 // All new characters get a lookup, not only the first eight.
 for(let batch=0;batch<unknown.length&&isCurrent();batch+=4){
  await Promise.all(unknown.slice(batch,batch+4).map(async w=>{
   const local=localPhotoData(w.ch,recognized);
   for(const k of ['pinyin','meaning','cn','ru'])if(!w[k]&&local[k])w[k]=local[k];
   if(!w.meaning){
    try{const translated=await translateOnline(w.ch);if(isCurrent()&&!w.meaning){w.meaning=translated;w.autoGenerated=true}}
    catch(_){/* A missing translation never blocks saving the recognized character. */}
   }
   // Do not invent a sentence just to satisfy the validator. An incomplete card remains a draft.
   if(w.cn&&!w.ru){try{const translated=await translateOnline(w.cn);if(isCurrent()&&!w.ru)w.ru=translated}catch(_){}}
   if(validWord(w))w.reason=w.autoGenerated?'Перевод получен онлайн. Проверь его перед изучением.':'✓ Данные найдены в словаре. Проверь перевод перед сохранением.';
   else w.reason='Не все данные удалось подтвердить. Символ можно сохранить в черновики, ничего не потеряется.';
   done++;const progress=$('ocr-enrichment-note');if(progress&&isCurrent())progress.textContent=`✦ Уточняю значения: ${done} / ${unknown.length}. Можно сохранять символы уже сейчас.`;
  }));
 }
}

function renderScanAction(){
 const b=$('scan-add');if(!b||!scan)return;
 const selected=scan.new.filter(w=>scan.selected.has(w.ch));const incomplete=selected.filter(w=>!validWord(w));
 b.disabled=!selected.length;b.textContent=`Сохранить выбранные (${selected.length}) ✦`;
 const status=$('scan-validation');if(status)status.textContent=!selected.length?'Выбери нужные символы.':incomplete.length?`Готовых карточек: ${selected.length-incomplete.length}. На уточнение: ${incomplete.length}. Все выбранные символы сохранятся.`:`Все ${selected.length} карточек готовы к сохранению.`;
}
function renderScan(){
 const r=$('photo-result');r.replaceChildren();if(!scan)return;
 const {existing,new:news,selected}=scan;
 const title=document.createElement('div');title.className='section-head';title.innerHTML=`<div><div class="eyebrow">Результат распознавания</div><h2>Найдено ${existing.length+news.length} <em>символов</em></h2><p>${news.length} новых · ${existing.length} уже есть в каталоге</p></div>`;r.append(title);
 if(news.length){const h=document.createElement('h3');h.textContent='✦ Новые символы';r.append(h);const tip=document.createElement('p');tip.className='muted tiny';tip.textContent='Готовые карточки попадут в словарь, остальные — в сохранённые черновики. При необходимости раскрой «Изменить данные».';r.append(tip);const list=document.createElement('div');list.className='scan-list';for(const w of news)list.append(scanCard(w,false,selected));r.append(list)}
 if(existing.length){const h=document.createElement('h3');h.textContent='✓ Уже есть в каталоге';r.append(h);const list=document.createElement('div');list.className='scan-list';for(const w of existing)list.append(scanCard(w,true,selected));r.append(list)}
 const status=document.createElement('p');status.className='tiny muted';status.id='scan-validation';r.append(status);
 const actions=document.createElement('div');actions.className='row';if(news.length){const add=makeBtn('Сохранить выбранные','primary',commitScan);add.id='scan-add';actions.append(add)}actions.append(makeBtn('Закрыть фото ×','ghost',clearPhoto));r.append(actions);renderScanAction();
}
function commitScan(){
 if(!scan)return;const selected=scan.new.filter(w=>scan.selected.has(w.ch));if(!selected.length)return toast('Выбери хотя бы один символ.','bad');
 let added=0,drafted=0;
 for(const raw of selected){const w=normalizeWord(raw,'photo');if(lookup(w.ch)||builtins.has(w.ch))continue;
  state.custom=state.custom.filter(x=>x.ch!==w.ch);state.drafts=state.drafts.filter(x=>x.ch!==w.ch);
  if(validWord(w)){state.custom.push(w);added++}else{state.drafts.push(w);drafted++}
 }
 save();renderWords();clearPhoto();renderDrafts();
 const result=$('photo-result');const card=document.createElement('div');card.className='note notice-good';card.textContent=`✦ Сохранено: ${added} в словарь${drafted?`, ${drafted} на уточнение`:''}. Ни один выбранный символ не потерян.`;result.append(card);
 const actions=document.createElement('div');actions.className='row';actions.style.marginTop='14px';
 if(added)actions.append(makeBtn('Открыть новые карточки →','primary',()=>{navigate('learn');level='custom';document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('active',x.dataset.level===level));renderWords()}));
 if(drafted)actions.append(makeBtn('Открыть черновики ↓','soft',()=>{$('photo-drafts')?.scrollIntoView({behavior:'smooth',block:'start'})}));
 actions.append(makeBtn('Закрыть','ghost',()=>result.replaceChildren()));result.append(actions);
}
// OCR worker is reused for subsequent photos; don't download/load Chinese language data on every scan.
let ocrWorkerPromise=null;
let ocrJobId=0;
function ocrStatus(message){const panel=$('photo-result');if(panel){panel.replaceChildren();const note=document.createElement('div');note.className='note';note.textContent=message;panel.append(note)}}
async function getOCRWorker(){
 if(!ocrWorkerPromise){
  ocrWorkerPromise=(async()=>{
   if(!window.Tesseract){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Не удалось загрузить модуль распознавания. Проверь интернет.'));document.head.append(script);
    });
   }
   const worker=await window.Tesseract.createWorker('chi_sim',1,{logger:m=>{
    if(m.status==='recognizing text'&&Number.isFinite(m.progress)){
     const panel=$('photo-result');const label=panel?.firstElementChild;
     if(label&&label.classList.contains('note')&&label.dataset.ocrProgress==='1')label.textContent=`✦ Распознаю китайский текст: ${Math.round(m.progress*100)}%`;
    }
   }});
   // Sparse text: works better for signs, screenshots, isolated characters than assuming a full page.
   try{await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'})}catch(_){}
   return worker;
  })().catch(err=>{ocrWorkerPromise=null;throw err});
 }
 return ocrWorkerPromise;
}
async function prepareOCRImage(file){
 // Browser handles orientation (including most phone EXIF metadata) while canvas limits giant photos.
 let bitmap=null, image=null, url=null;
 try{
  if(typeof createImageBitmap==='function'){
   try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){bitmap=null}
  }
  if(!bitmap){
   url=URL.createObjectURL(file);
   image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Не удалось прочитать фотографию.'));img.src=url});
  }
  const width=bitmap?bitmap.width:image.naturalWidth;
  const height=bitmap?bitmap.height:image.naturalHeight;
  if(!width||!height)throw Error('Пустое изображение.');
  // Shrink huge images to save memory; enlarge small screenshots to help recognize strokes.
  const longest=Math.max(width,height);
  const scale=longest>2200?2200/longest:longest<1000?Math.min(2,1400/longest):1;
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Обработка изображений недоступна в браузере.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap||image,0,0,canvas.width,canvas.height);
  return canvas;
 }finally{if(bitmap)bitmap.close();if(url)URL.revokeObjectURL(url)}
}
function panelContainsActiveEditor(){const panel=$('photo-result');return panel&&panel.contains(document.activeElement)&&['INPUT','TEXTAREA'].includes(document.activeElement.tagName)}
function recognizedHanzi(text){return unique([...String(text||'')].filter(isHanzi))}
async function startOCR(file){
 if(!file)return;
 if(!file.type.startsWith('image/'))return toast('Выбери изображение из галереи или сделай снимок.','bad');
 if(file.size>12*1024*1024)return toast('Фото слишком большое. Выбери изображение до 12 МБ.','bad');
 clearPhoto();const job=++ocrJobId;
 previewURL=URL.createObjectURL(file);$('ocr-preview').src=previewURL;$('ocr-preview').classList.remove('hidden');
 ocrStatus('✦ Подготавливаю фотографию…');
 try{
  const [worker,prepared]=await Promise.all([getOCRWorker(),prepareOCRImage(file)]);
  if(job!==ocrJobId)return;
  ocrStatus('✦ Распознаю китайский текст…');
  const progress=$('photo-result').firstElementChild;if(progress)progress.dataset.ocrProgress='1';
  let {data}=await worker.recognize(prepared);
  if(job!==ocrJobId)return;
  let chars=recognizedHanzi(data.text);
  // For photos where sparse-text recognition fails, try a second layout mode.
  if(chars.length===0){
   try{await worker.setParameters({tessedit_pageseg_mode:'3'});({data}=await worker.recognize(prepared));chars=recognizedHanzi(data.text)}
   finally{try{await worker.setParameters({tessedit_pageseg_mode:'11'})}catch(_){}}
  }
  if(job!==ocrJobId)return;
  if(!chars.length){
   const panel=$('photo-result');panel.innerHTML='<div class="note notice-bad">Не получилось распознать китайский текст. Попробуй обрезать фото до области с иероглифами, убрать блики или сделать более чёткий снимок.</div>';
   panel.append(makeBtn('Закрыть фото','ghost',clearPhoto));return;
  }
  const dictionary=wordsMap();
  const existing=chars.filter(ch=>dictionary.has(ch)||builtins.has(ch)).map(ch=>dictionary.get(ch)||builtins.get(ch));
  const news=chars.filter(ch=>!dictionary.has(ch)&&!builtins.has(ch)).map(ch=>{
   const draft=state.drafts.find(w=>w.ch===ch);
   return draft?{...localPhotoData(ch,String(data.text||'')),...draft}:localPhotoData(ch,String(data.text||''));
  });
  scan={existing,new:news,selected:new Set(news.map(w=>w.ch))};
  renderScan(); // Display recognized characters immediately; online translation is optional.
  if(news.length){
   const panel=$('photo-result');const info=document.createElement('div');info.className='note';info.id='ocr-enrichment-note';
   info.textContent='✦ Символы найдены. Уточняю данные в фоне; сохранить можно уже сейчас…';panel.prepend(info);
   // Online translation runs in the background; it cannot hold the results hostage.
   await enrichScan(news,String(data.text||''),()=>job===ocrJobId);
   if(job!==ocrJobId)return;
   const notice=$('ocr-enrichment-note');if(notice)notice.remove();
   if(!panelContainsActiveEditor())renderScan();else $('photo-result').addEventListener('focusout',()=>{if(job===ocrJobId&&!panelContainsActiveEditor())renderScan()},{once:true});
  }
 }catch(err){
  if(job!==ocrJobId)return;
  const panel=$('photo-result');panel.replaceChildren();
  const note=document.createElement('div');note.className='note notice-bad';note.textContent=`Ошибка обработки фото: ${err.message||'Не удалось распознать текст.'}`;
  panel.append(note,makeBtn('Попробовать ещё раз','ghost',()=>startOCR(file)));
 }
}
for(const inputId of ['photo-input','photo-gallery-input'])$(inputId).addEventListener('change',e=>{const file=e.target.files?.[0];if(file)startOCR(file)});
function renderDrafts(){
 const panel=$('photo-drafts');if(!panel)return;panel.replaceChildren();
 const drafts=cleanPhotoDrafts(state.drafts).filter(w=>!lookup(w.ch));if(!drafts.length)return;
 const heading=document.createElement('h3');heading.textContent=`Сохранённые для уточнения · ${drafts.length}`;panel.append(heading);
 const hint=document.createElement('p');hint.className='muted tiny';hint.textContent='Здесь хранятся неполные карточки из фото и ручного добавления. Их можно дополнить позже; в упражнения они попадут после проверки полей.';panel.append(hint);
 const list=document.createElement('div');list.className='scan-list';
 for(const draft of drafts){const row=document.createElement('div');row.className='scan-card';
  const glyph=document.createElement('div');glyph.className='scan-glyph';glyph.textContent=draft.ch;
  const info=document.createElement('div');info.className='detail';
  const name=document.createElement('strong');name.textContent=`${draft.pinyin||'Чтение уточняется'} · ${draft.meaning||'Значение уточняется'}`;info.append(name);
  const actions=document.createElement('div');actions.className='row';actions.style.marginTop='10px';
  actions.append(makeBtn('✎ Уточнить','soft',()=>{scan={existing:[],new:[{...draft}],selected:new Set([draft.ch])};renderScan();$('photo-result')?.scrollIntoView({behavior:'smooth',block:'start'})}));
  actions.append(makeBtn('Удалить','ghost',()=>{state.drafts=state.drafts.filter(x=>x.ch!==draft.ch);save();renderDrafts()}));
  info.append(actions);row.append(glyph,info);list.append(row);
 }
 panel.append(list);
}
const QUOTES=QUOTE_DATA.map((q,i)=>({id:i,cn:q[0],ru:q[1],kind:q[2],pinyin:q[3]}));
function quoteForDay(){const day=dayString();let n=0;for(const c of day)n=n*31+c.charCodeAt(0);return Math.abs(n)%QUOTES.length}
activeQuoteIndex=Math.floor(Math.random()*QUOTES.length);
function randomWisdomIndex(previous){if(QUOTES.length<=1)return 0;const n=Math.floor(Math.random()*(QUOTES.length-1));return n>=previous?n+1:n}
let quoteDisplayLimit=12,quoteCatalogOpen=false,quoteMeaningOpen=false;
const QUOTE_PAGE_SIZE=12;
const WISDOM_SIMPLE_MEANINGS=["Любое большое дело начинается с простого первого шага.","Большая цель достигается маленькими шагами, если делать их регулярно.","Учиться можно всю жизнь: всегда найдётся что-то новое.","Чем чаще тренируешься, тем лучше у тебя получается.","Сколько сил вложишь в дело, столько обычно и получишь.","Неудача может научить тому, что поможет победить в следующий раз.","Если очень стараться, даже сложная задача становится посильной.","Настойчивый человек чаще добивается того, что задумал.","Повторяя знакомое, можно понять то, чего раньше не замечал.","Полезному можно научиться у любого человека.","Мало запоминать факты: важно думать над ними и проверять свои мысли знаниями.","Увидеть самому надёжнее, чем много раз услышать от других.","Прежде чем действовать, подумай, к чему это приведёт.","Когда слишком торопишься, легко ошибиться и потерять время.","Маленькие усилия каждый день могут изменить очень многое.","Даже трудная задача решается, если терпеливо работать над ней.","Упорная работа со временем приносит плоды.","Если тебе сложнее, чем другим, начни раньше и потренируйся больше.","Усердие может помочь даже без особого таланта.","Возраст не мешает узнавать новое.","Не бойся спросить у человека, который знает ответ, даже если он младше тебя.","Поняв один пример, попробуй самостоятельно разобраться с похожими.","Если что-то пообещал, выполни это.","Радоваться жизни проще, когда умеешь ценить то, что уже есть.","После тяжёлого периода может наступить хороший.","Большие результаты появляются постепенно, когда делаешь понемногу каждый день.","Сложные вещи лучше осваивать по порядку, шаг за шагом.","Важно не только мечтать, но и делать что-то реальное.","Продолжай развиваться и не останавливайся на достигнутом.","Сначала накопи опыт и знания, а потом используй их в нужный момент.","Даже хорошую работу можно улучшить.","Время нельзя вернуть или купить, поэтому не стоит тратить его бездумно.","Дни проходят быстро, иногда быстрее, чем кажется.","Если всё откладывать в молодости, позже можно жалеть об упущенном времени.","Чтобы хорошо учиться, нужны терпение и постоянная работа.","Книги дают знания, а путешествия помогают увидеть жизнь своими глазами.","Наши поступки влияют на то, что мы получим потом.","Читая, почти всегда можно узнать что-нибудь полезное.","Знания нужны не только для запоминания, но и для применения в жизни.","Когда объясняешь другому, сам лучше разбираешься в теме.","Лучше записать важное, чем надеяться, что точно запомнишь.","Иногда ради цели приходится рискнуть и выйти из зоны комфорта.","Настоящее понимание приходит, когда пробуешь делать сам.","Даже после большого успеха можно двигаться дальше.","Если трудно, продолжай работать и не бросай.","Для результата важно заниматься регулярно.","Когда условия готовы, многое начинает получаться само собой.","Старательный человек не зря тратит силы: они со временем окупаются.","Лучше подготовиться заранее, чем потом разбираться с последствиями.","Проблему проще предотвратить, чем исправлять, когда она уже случилась.","Заранее замечай риски и старайся не допускать неприятностей.","Даже после ошибки не поздно исправить ситуацию и избежать новых потерь.","Ошибки дают опыт, если сделать из них выводы.","Помни прошлые ошибки, чтобы не повторять их в будущем.","Не спеши считать потерю бедой: позже всё может повернуться иначе.","Удача и неудача могут сменять друг друга, поэтому не стоит делать поспешных выводов.","После очень трудного периода положение может улучшиться.","Даже когда кажется, что выхода нет, неожиданно может появиться новый путь.","Иногда решение находится, когда подходишь к проблеме вплотную.","Не нужно паниковать заранее: по ходу дела может найтись выход.","Окружение влияет на твои привычки и поведение.","Не бывает людей, у которых совсем нет недостатков.","Каждый человек ошибается и имеет слабые стороны.","У каждого есть достоинства и недостатки, даже если на первый взгляд это не видно.","Каким бы сильным ты ни был, всегда найдётся кто-то опытнее.","Помощь нужна вовремя: далёкое решение не спасёт от срочной проблемы.","У разных людей хорошо получаются разные вещи.","Учись у других тому, что у них выходит лучше, и работай над своими слабостями.","Используй то, что у тебя получается хорошо, и учитывай свои ограничения.","Чтобы принимать хорошие решения, важно честно понимать свои сильные и слабые стороны.","Если понимаешь себя и соперника, легче подготовиться и не допустить ошибок.","Со стороны ситуацию иногда видно яснее, чем изнутри.","Не суди о споре, пока не выслушал обе стороны.","Хороший совет может быть неприятным, но всё равно полезным.","Неприятная правда иногда помогает больше, чем красивые слова.","Чем больше говоришь не подумав, тем выше шанс сказать лишнее.","Иногда лучше промолчать, чем говорить без пользы.","Обещай только то, что действительно собираешься сделать.","Важно, чтобы слова не расходились с делами.","Обещания человека, которому доверяют, очень ценны.","Не поступай с людьми так, как не хотел бы, чтобы поступали с тобой.","Попробуй представить себя на месте другого, прежде чем его судить.","Чтобы понять чужой поступок, посмотри на ситуацию глазами другого человека.","Помогать другим может быть приятно само по себе.","Не забывай доброту и старайся отвечать на неё благодарностью.","Если тебе помогли, постарайся тоже сделать что-то хорошее.","Доброе отношение к людям помогает строить хорошие отношения.","Когда в семье поддерживают друг друга, жить становится легче.","Сосед рядом иногда может помочь быстрее, чем родня далеко.","В трудностях становится видно, кто действительно рядом.","Чтобы узнать человека, нужно время.","Друзья помогают, когда ты далеко от дома.","Когда люди помогают друг другу, общий результат становится сильнее.","Вместе можно справиться с тем, что одному кажется невозможным.","Общая цель и совместные усилия помогают быстрее добиться результата.","Одного человека бывает недостаточно для большого дела.","Некоторые задачи не решить без участия других.","Несколько обычных людей вместе могут придумать отличное решение.","Если делать работу слишком быстро, качество часто страдает.","Главное — продолжать двигаться, пусть даже медленно.","Одним поступком можно решить сразу две задачи.","Говори прямо и открыто, что думаешь.","Всё настолько перепутано, что трудно понять, что происходит.","Посмотреть мельком — ещё не значит хорошо разобраться.","Когда постоянно сомневаешься и отвлекаешься, трудно довести дело до конца.","Что-то настолько необычное, что другого такого почти не найти.","Можно очень хотеть чего-то, но пока не иметь возможности это сделать.","О человеке или событии знают очень многие.","Когда полностью сосредоточен, меньше отвлекаешься и лучше работаешь.","Вокруг так много интересного, что трудно выбрать, на что смотреть.","Отдавать делу все силы и внимание.","Положение внезапно стало намного хуже.","Начинать новое дело часто труднее всего.","Не добавляй лишнего туда, где и так всё хорошо.","Бесполезно долго объяснять тому, кто не понимает или не хочет слушать.","Попытка ускорить развитие силой может только навредить.","После неприятного опыта человек может бояться даже безопасных вещей.","Так говорят об очень красивой женщине.","Так описывают человека с красивой осанкой и плавными движениями.","Так говорят о тонких, красивых чертах лица.","Человек сильно переживает и не может успокоиться.","В жизни бывают и счастливые, и тяжёлые моменты.","Вещь так нравится, что совсем не хочется с ней расставаться.","Одно действие приносит сразу два полезных результата.","Даже если уже допустил ошибку, можно исправить её последствия.","Человек знает слишком мало и поэтому думает, что мир устроен просто.","Вокруг такой беспорядок, что никто не может спокойно жить или работать.","Человек говорит вещи, которые не могут быть правдой одновременно.","Иногда нужно решительно идти вперёд, не оставляя себе пути назад.","Из-за страха можно принять обычную вещь за опасность.","Человек понимает вопрос глубоко, а не только снаружи.","Кто-то пугает других, прикрываясь силой более влиятельного человека.","Человек заранее продумал, что и как будет делать.","Человек закрывает глаза на очевидное и обманывает самого себя.","Небольшая последняя деталь может сделать работу по-настоящему удачной.","Скрытая правда рано или поздно становится известной.","Человек чувствует себя уверенно там, где ему всё знакомо и удобно.","Иногда ученик становится лучше своего учителя.","Важно помнить людей, которые помогли тебе добиться успеха.","Ситуация зашла так далеко, что выйти из неё теперь трудно.","Речь о мелочах, которые не имеют большого значения.","Человек остался один против всех и не получает поддержки.","Без помощи других бывает трудно добиться цели.","Так говорят о вещи, в которой не видно недостатков.","Особенно важна помощь, когда человеку действительно тяжело.","Чего-то настолько мало, что этого почти не заметно.","Нельзя рассчитывать только на удачу и ничего не делать.","Человек меняет мнение ради собственной выгоды.","Человек быстро добился заметного результата.","После победы не зазнавайся, а после поражения не опускай руки.","То, что уже хорошо, можно сделать ещё лучше.","Кто-то воспользовался случаем, чтобы забрать чужое.","Одного наказали, чтобы остальные испугались и не повторяли его поступок.","Человек заметно отличается от остальных своими способностями или видом.","Один человек своими действиями портит жизнь всей группе.","Не стоит бездумно вступать в борьбу, где силы слишком неравны.","Предлагаемой помощи слишком мало, чтобы решить большую проблему.","После удачи человек чувствует себя особенно уверенно и радостно.","Одни мечты не помогут, если не делать ничего для их исполнения.","Знать теорию мало: нужно ещё уметь применять её на практике.","Даже маленькие усилия работают, если повторять их достаточно долго.","Несколько людей объединились, чтобы вместе сделать что-то плохое.","Неосторожным действием можно предупредить противника о своих планах.","В отчаянии человек может пойти на рискованные поступки.","Кто-то помогает чужим людям во вред своим.","Человек очень быстро продвигается вперёд и добивается успеха.","Кто-то делает вид, что силён, хотя на самом деле это не так.","Ситуация стала очень опасной: всё может решиться в один момент.","Нельзя судить о целом, зная лишь маленькую его часть.","Человек действует очень точно и почти не ошибается.","Иногда приходится выбирать: получить всё сразу не получится.","Опытный человек лучше знает, как поступить в знакомой ситуации.","Так говорят о жестоком человеке, который не ценит чужую доброту.","Человеку так хорошо на новом месте, что он забыл о прежнем доме.","Даже после серьёзного провала можно вернуться и снова добиться успеха.","Человек делает вид, что сочувствует, хотя ему на самом деле всё равно.","Маленькая проблема, если её игнорировать, может привести к большой беде.","Ничто и никто не бывает идеальным.","Иногда лучше уступить в споре, чтобы сохранить отношения и найти выход.","Нельзя слепо действовать по инструкции, не замечая реальной ситуации.","Пока двое ссорятся, выгоду может получить кто-то третий.","Найти нужное среди огромного количества вещей почти невозможно.","Слова этого человека важны, поэтому к ним прислушиваются.","Человек сразу заметил главное и точно назвал проблему.","Кто-то наблюдает за чужими трудностями и не пытается помочь.","Человек сам пустил в свою жизнь того, кто может причинить вред.","Кто-то говорит приятные вещи, но втайне желает плохого.","Человек говорит, что любит что-то, но на деле этого боится.","Мало мечтать о результате — нужно что-то делать, чтобы его получить.","Правду трудно скрывать бесконечно.","Получив помощь, человек забыл о том, кто ему помог.","Человек всё время меняет мнение и не держится одного решения.","Кто-то сознательно называет ложь правдой и заставляет других соглашаться.","Ради большой цели человек готов долго терпеть трудности.","Люди вместе переживают трудный период и поддерживают друг друга.","Когда все работают сообща, сделать сложное становится проще.","Разные мнения помогают найти более удачное решение.","Хороший ученик много занимается и не стесняется задавать вопросы.","Человеку нравится учиться, и он не перестаёт узнавать новое.","Хороший учитель терпеливо объясняет и не устаёт помогать другим."];
function wisdomMeaning(q){return WISDOM_SIMPLE_MEANINGS[q.id]||q.ru;}
function wisdomWordList(q){const plain=q.cn.replace(/[^\u3400-\u9fff]/g,'');const pool=wordsMap();const candidates=[...pool.values()].filter(w=>w.ch!==plain&&[...w.ch].length>=2&&[...w.ch].length<=4&&plain.includes(w.ch)&&!w.ch.includes('，')&&w.origin!=='reference');candidates.sort((a,b)=>b.ch.length-a.ch.length||plain.indexOf(a.ch)-plain.indexOf(b.ch));const words=[];for(const w of candidates){if(!words.some(x=>x.ch.includes(w.ch)))words.push(w);if(words.length>=6)break}if(words.length<4){for(const ch of [...new Set([...plain])]){const w=pool.get(ch)||builtins.get(ch);if(w&&!words.some(x=>x.ch===ch)){words.push(w);if(words.length>=6)break}}}return words}
function renderQuote(){const q=QUOTES[activeQuoteIndex];if(!q)return;
 $('quote-cn').replaceChildren(interactiveSentence(q.cn));$('quote-pin').textContent=q.pinyin;$('quote-pin').classList.toggle('is-hidden',state.wisdomShowPinyin===false);
 $('quote-ru').textContent=q.ru;$('quote-eyebrow').textContent=q.kind.includes('成语')?'成语 · УСТОЙЧИВОЕ ВЫРАЖЕНИЕ':q.kind==='Пословица'?'中国谚语 · ПОСЛОВИЦА':'中国智慧 · ПОГОВОРКА';$('quote-position').textContent='СЛУЧАЙНОЕ ВЫРАЖЕНИЕ';
 const fav=state.quoteFavorites.includes(q.id),btn=$('quote-fav');btn.innerHTML=fav?'♥ <span>Сохранено</span>':'♡ <span>Сохранить</span>';btn.setAttribute('aria-pressed',String(fav));btn.setAttribute('aria-label',fav?'Убрать выражение из избранного':'Добавить выражение в избранное');
 const py=$('quote-toggle-pinyin');py.innerHTML=state.wisdomShowPinyin===false?'◉ <span>Показать пиньинь</span>':'◉ <span>Скрыть пиньинь</span>';py.setAttribute('aria-pressed',String(state.wisdomShowPinyin===false));
 quoteMeaningOpen=false;$('quote-meaning-text').textContent=wisdomMeaning(q);$('quote-meaning-text').classList.add('hidden');$('quote-meaning-toggle').setAttribute('aria-expanded','false');

}
function wisdomGo(){activeQuoteIndex=randomWisdomIndex(activeQuoteIndex);renderQuote()}
function renderQuotesList(){if(!quoteCatalogOpen)return;const term=searchKey($('quote-search').value);const items=QUOTES.filter(q=>(!quoteFavoritesOnly||state.quoteFavorites.includes(q.id))&&searchKey([q.cn,q.ru,q.pinyin].join(' ')).includes(term));const grid=$('quote-grid');grid.replaceChildren();
 let more=$('quote-more');if(!more){more=document.createElement('button');more.id='quote-more';more.className='soft quote-more';more.type='button';grid.insertAdjacentElement('afterend',more);more.addEventListener('click',()=>{quoteDisplayLimit+=QUOTE_PAGE_SIZE;renderQuotesList()})}
 more.classList.toggle('hidden',items.length<=quoteDisplayLimit);more.textContent='Показать ещё';
 if(!items.length){grid.innerHTML='<div class="empty">Ничего не найдено. Попробуй другой запрос.</div>';return}
 for(const q of items.slice(0,quoteDisplayLimit)){const card=document.createElement('div');card.className='quote-small';card.tabIndex=0;card.innerHTML=`<small>${state.quoteFavorites.includes(q.id)?'♥ · ':''}${escapeHTML(q.kind)}</small><h3>${escapeHTML(q.cn)}</h3><p>${escapeHTML(q.ru)}</p>`;const open=()=>{activeQuoteIndex=q.id;renderQuote();$('wisdom-feature').scrollIntoView({behavior:'smooth',block:'start'})};card.querySelector('h3').replaceChildren(interactiveSentence(q.cn));card.setAttribute('role','button');card.setAttribute('aria-label',`Открыть выражение: ${q.cn}`);card.onclick=open;card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}};
 if(quoteFavoritesOnly){card.classList.add('is-favorite-filter');const remove=makeBtn('× Убрать','favorite-remove',e=>{e.stopPropagation();state.quoteFavorites=state.quoteFavorites.filter(i=>i!==q.id);save();renderQuote();renderQuotesList();toast('Выражение убрано из избранного.','good')});remove.setAttribute('aria-label',`Убрать выражение «${q.cn}» из избранного`);card.append(remove)}grid.append(card)}
}
function renderMotivation(){renderQuote();renderQuotesList()}

$('quote-next').onclick=()=>wisdomGo();
$('quote-speak').onclick=()=>speak(QUOTES[activeQuoteIndex].cn);
$('quote-fav').onclick=()=>{const id=activeQuoteIndex;state.quoteFavorites=state.quoteFavorites.includes(id)?state.quoteFavorites.filter(i=>i!==id):[...state.quoteFavorites,id];save();renderQuote();renderQuotesList()};
$('quote-toggle-pinyin').onclick=()=>{state.wisdomShowPinyin=state.wisdomShowPinyin===false;save();renderQuote()};
$('quote-meaning-toggle').onclick=()=>{quoteMeaningOpen=!quoteMeaningOpen;$('quote-meaning-text').classList.toggle('hidden',!quoteMeaningOpen);$('quote-meaning-toggle').setAttribute('aria-expanded',String(quoteMeaningOpen))};
$('quote-catalog-toggle').onclick=()=>{quoteCatalogOpen=!quoteCatalogOpen;$('quote-catalog-body').classList.toggle('hidden',!quoteCatalogOpen);$('quote-catalog-toggle').setAttribute('aria-expanded',String(quoteCatalogOpen));if(quoteCatalogOpen)renderQuotesList()};
$('quote-search').oninput=()=>{quoteDisplayLimit=QUOTE_PAGE_SIZE;renderQuotesList()};
$('quote-filter-fav').onclick=()=>{quoteDisplayLimit=QUOTE_PAGE_SIZE;quoteFavoritesOnly=!quoteFavoritesOnly;$('quote-filter-fav').textContent=quoteFavoritesOnly?'Все выражения':'♡ Избранные';$('quote-filter-fav').setAttribute('aria-pressed',String(quoteFavoritesOnly));renderQuotesList()};
function downloadJSON(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),600)}
function openSettings(){
 const s=stats(),el=document.createElement('div');el.className='settings-panel';
 const introCard=document.createElement('div');introCard.className='settings-welcome';
 const kicker=document.createElement('span');kicker.className='settings-kicker';kicker.textContent='Твоё пространство';
 const intro=document.createElement('p');intro.className='settings-intro';intro.textContent='Учись в своём ритме. Прогресс сохраняется в этом браузере — сохрани резервную копию, если захочешь перенести его на другое устройство.';introCard.append(kicker,intro);el.append(introCard);
 const summary=document.createElement('div');summary.className='settings-metrics';
 for(const [value,label] of [[s.total,'В каталоге'],[s.learned,'Изучено'],[s.due,'К повторению'],[s.favorites,'В избранном']]){
  const metric=document.createElement('div');metric.className='settings-metric';
  const number=document.createElement('strong');number.textContent=String(value);
  const title=document.createElement('span');title.textContent=label;metric.append(number,title);summary.append(metric);
 }el.append(summary);
 const sound=document.createElement('section');sound.className='settings-section';
 const soundTitle=document.createElement('h3');soundTitle.textContent='Озвучивание';sound.append(soundTitle);
 const speed=document.createElement('div');speed.className='settings-speed';
 const label=document.createElement('span');label.className='settings-speed-label';label.textContent='Скорость речи';speed.append(label);
 const rate=document.createElement('div');rate.className='settings-speed-options';
 for(const value of [.85,1]){
  const btn=makeBtn(value===1?'Обычная':'Медленнее',Math.abs(Number(state.ttsRate||1)-value)<.1?'primary':'ghost',()=>{state.ttsRate=value;save();openSettings();speak('你好')});
  btn.setAttribute('aria-pressed',String(Math.abs(Number(state.ttsRate||1)-value)<.1));rate.append(btn)
 }speed.append(rate);sound.append(speed);
 const volume=document.createElement('div');volume.className='settings-volume';
 const volumeRow=document.createElement('div');volumeRow.className='settings-volume-head';
 const volumeTitle=document.createElement('label');volumeTitle.className='settings-speed-label';volumeTitle.textContent='Громкость голоса';volumeTitle.htmlFor='settings-volume';
 const volumeValue=document.createElement('strong');volumeValue.className='settings-volume-value';volumeValue.textContent=Math.round((state.ttsVolume??.85)*100)+'%';volumeRow.append(volumeTitle,volumeValue);
 const volumeRange=document.createElement('input');volumeRange.type='range';volumeRange.id='settings-volume';volumeRange.min='0';volumeRange.max='100';volumeRange.step='5';volumeRange.value=String(Math.round((state.ttsVolume??.85)*100));volumeRange.setAttribute('aria-label','Громкость китайского голоса');
 volumeRange.oninput=()=>{state.ttsVolume=Number(volumeRange.value)/100;volumeValue.textContent=volumeRange.value+'%';save({quiet:true})};
 volumeRange.onchange=()=>speak('你好，欢迎来到达莉娅。',{preview:true});
 volume.append(volumeRow,volumeRange);sound.append(volume);
 el.append(sound);
 const reading=document.createElement('section');reading.className='settings-section settings-reading';const readingTitle=document.createElement('h3');readingTitle.textContent='Карточки и чтение';reading.append(readingTitle);
 const pinPref=document.createElement('div');pinPref.className='settings-speed';const pinLabel=document.createElement('span');pinLabel.className='settings-speed-label';pinLabel.textContent='Пиньинь у освоенных слов';const pinButtons=document.createElement('div');pinButtons.className='settings-speed-options';for(const [val,label]of [['adaptive','Автоматически скрывать'],['always','Показывать всегда']]){const b=makeBtn(label,state.pinyinPreference===val?'primary':'ghost',()=>{state.pinyinPreference=val;save();openSettings();renderWords()});b.setAttribute('aria-pressed',String(state.pinyinPreference===val));pinButtons.append(b)}pinPref.append(pinLabel,pinButtons);reading.append(pinPref);
 const pinHint=document.createElement('p');pinHint.className='settings-section-hint';pinHint.textContent='Если скрывать автоматически, знакомые слова будут постепенно появляться без подсказки.';reading.append(pinHint);el.append(reading);
 const backup=document.createElement('section');backup.className='settings-section';
 const backupTitle=document.createElement('h3');backupTitle.textContent='Мой прогресс';backup.append(backupTitle);
 const backupHint=document.createElement('p');backupHint.className='settings-section-hint';backupHint.textContent='Прогресс сохраняется автоматически на этом устройстве, в твоём браузере. Чтобы перенести его или защитить от потери, сохрани файл.';backup.append(backupHint);
 const lastCopy=document.createElement('p');lastCopy.className='settings-section-hint';
 const lastRequested=readJSON(BACKUP_LAST_KEY,null);lastCopy.textContent=lastRequested?.date?'Последнее запрошенное скачивание: '+lastRequested.date+'. Проверь, что файл действительно сохранился.':'Резервная копия ещё не скачивалась в этом браузере.';backup.append(lastCopy);
 if(storageFailure){const warning=document.createElement('p');warning.className='note notice-bad';warning.textContent='Внимание: последнее сохранение не удалось. Скачай копию сейчас и проверь настройки браузера.';backup.append(warning)}
 const block=document.createElement('div');block.className='settings-backup-actions';
 const exportBtn=makeBtn('↓ Сохранить прогресс','primary',()=>{
 try{const now=new Date();const stamp=`${dayString(now)}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
 downloadJSON(`dalia-backup-${stamp}.json`,{app:'dalia',version:7,created:now.toISOString(),data:state});
 try{localStorage.setItem(BACKUP_LAST_KEY,JSON.stringify({date:now.toLocaleString('ru-RU')}))}catch(_){}
 lastCopy.textContent='Скачивание запрошено. Проверь папку загрузок и сохрани файл в надёжном месте.';toast('Скачивание резервной копии запрошено.','good')
 }catch(err){toast('Не удалось подготовить копию: '+err.message,'bad')}
 });
 const importLabel=document.createElement('label');importLabel.className='soft settings-import';importLabel.style.cursor='pointer';importLabel.textContent='↑ Восстановить прогресс';
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.style.display='none';
 input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{
 if(f.size>10*1024*1024)throw Error('Файл больше 10 МБ. Проверь, что выбрана копия Dalia.');
 const raw=JSON.parse(await f.text());if(raw.app!=='dalia'||!raw.data||!Array.isArray(raw.data.custom))throw Error('Неподдерживаемый формат резервной копии.');
 validateBackup(raw.data);
 const count=(raw.data.learned||[]).length,personal=raw.data.custom.length;
 if(!confirm(`Объединить резервную копию с текущими данными?\nВ файле: ${count} изученных слов и ${personal} личных карточек.\nТекущие данные останутся.`))return;
 checkpointState('Перед импортом',{force:true});safeMergeBackup(raw.data);closeModal();renderWords();toast('Резервная копия объединена. Дубликаты исключены.','good')
 }catch(e){toast(`Ошибка импорта: ${e.message}`,'bad')}finally{input.value=''}};
 importLabel.append(input);block.append(exportBtn,importLabel);backup.append(block);
 try{const snapshot=localStorage.getItem(LEGACY_SNAPSHOT);if(snapshot){
  const details=document.createElement('details');details.className='settings-legacy';
  const head=document.createElement('summary');head.textContent='Восстановление после обновления';details.append(head);
  const explain=document.createElement('p');explain.textContent='Если после обновления пропал прогресс, попробуй объединить его со старой копией. Текущие данные останутся.';details.append(explain);
  const recovery=makeBtn('↶ Объединить со старой копией','ghost',()=>{try{const data=JSON.parse(snapshot);if(!data||!Array.isArray(data.custom))throw Error('Формат старых данных не распознан');if(!confirm('Объединить сохранённую старую копию с текущими данными? Текущие данные не будут удалены.'))return;safeMergeBackup(data);closeModal();renderWords();toast('Старая копия объединена с текущими данными.','good')}catch(err){toast('Не удалось восстановить: '+err.message,'bad')}});
  details.append(recovery);backup.append(details);
 }}catch(_){}el.append(backup);
 const privacy=document.createElement('section');privacy.className='settings-section settings-privacy';
 const privacyTitle=document.createElement('h3');privacyTitle.textContent='Конфиденциальность';privacy.append(privacyTitle);
 const privacyInfo=document.createElement('p');privacyInfo.className='settings-section-hint';privacyInfo.textContent='Прогресс остаётся в браузере. Необязательная аналитика помогает улучшать сайт и включается только с твоего разрешения.';privacy.append(privacyInfo);
 const analyticsRow=document.createElement('label');analyticsRow.className='dalia-sfx-setting settings-analytics-row';const analyticsText=document.createElement('span');analyticsText.textContent='Разрешить анонимную статистику посещений';const analyticsToggle=document.createElement('input');analyticsToggle.type='checkbox';analyticsToggle.checked=localStorage.getItem('dalia_analytics_consent')==='yes';analyticsToggle.onchange=()=>{try{localStorage.setItem('dalia_analytics_consent',analyticsToggle.checked?'yes':'no')}catch(_){}if(analyticsToggle.checked)daliaEnableAnalytics();else toast('Сбор новых данных отключён. Для применения обнови страницу.','good')};analyticsRow.append(analyticsText,analyticsToggle);privacy.append(analyticsRow);
 const privacyLink=document.createElement('a');privacyLink.href='./privacy.html';privacyLink.textContent='Как используются данные';privacyLink.className='settings-privacy-link';privacy.append(privacyLink);el.append(privacy);
 const feedbackSection=document.createElement('section');feedbackSection.className='settings-section settings-feedback';
 const feedbackTitle=document.createElement('h3');feedbackTitle.textContent='Обратная связь';feedbackSection.append(feedbackTitle);
 const feedbackHint=document.createElement('p');feedbackHint.className='settings-section-hint';feedbackHint.textContent='Заметил ошибку в переводе, пиньине или работе сайта? Расскажи нам об этом.';feedbackSection.append(feedbackHint);
 feedbackSection.append(makeBtn('Сообщить об ошибке','soft settings-report-button',openWordReport));
 el.append(feedbackSection);
 const msg=document.createElement('p');msg.className='settings-footer';msg.textContent='Встроенные слова и иероглифы нельзя удалять. Свои карточки можно изменять или удалять.';el.append(msg);
 showModal('Настройки и данные',el)
}
function mergeBackup(data){if(Array.isArray(data.practiceLevels))state.practiceLevels=validPracticeLevels(data.practiceLevels);const oldTotals={correct:Number(state.quizTotals.correct)||0,wrong:Number(state.quizTotals.wrong)||0};const incomingTotals={correct:Number(data.quizTotals?.correct)||0,wrong:Number(data.quizTotals?.wrong)||0};const allCustom=[...state.custom,...data.custom];const seen=new Set([...builtins.keys()].filter(x=>builtins.get(x).origin==='builtin')),custom=[];for(const raw of allCustom){const w=normalizeWord(raw,raw.origin||'custom');if(!validWord(w)||seen.has(w.ch))continue;seen.add(w.ch);custom.push(w)}state.custom=custom;state.drafts=cleanPhotoDrafts([...(state.drafts||[]),...(Array.isArray(data.drafts)?data.drafts:[])]).filter(d=>!custom.some(w=>w.ch===d.ch));state.learned=unique([...state.learned,...(Array.isArray(data.learned)?data.learned:[])]);state.autoLearned=unique([...state.autoLearned,...(Array.isArray(data.autoLearned)?data.autoLearned:[])]).filter(ch=>state.learned.includes(ch));state.favorites=unique([...state.favorites,...(Array.isArray(data.favorites)?data.favorites:[])]);state.hidden=ownHiddenOnly([...state.hidden,...(Array.isArray(data.hidden)?data.hidden:[])],state.custom);state.quoteFavorites=[...new Set([...state.quoteFavorites,...(Number(data.quoteSchema)===2?(Array.isArray(data.quoteFavorites)?data.quoteFavorites:[]):remapOldQuotes(data.quoteFavorites))].filter(i=>Number.isInteger(i)&&i>=0&&i<QUOTES.length))];if(data.ttsRate&&[.75,.85,1,1.25].includes(Number(data.ttsRate)))state.ttsRate=Number(data.ttsRate);if(data.ttsVolume!==undefined&&Number.isFinite(Number(data.ttsVolume)))state.ttsVolume=Math.max(0,Math.min(1,Number(data.ttsVolume)));if(typeof data.ttsVoiceURI==='string'&&!state.ttsVoiceURI)state.ttsVoiceURI=data.ttsVoiceURI;if(data.pinyinPreference==='always')state.pinyinPreference='always';if(typeof data.wisdomShowPinyin==='boolean')state.wisdomShowPinyin=data.wisdomShowPinyin;if(data.skillStats&&typeof data.skillStats==='object'){const incoming=cleanSkillStats(data.skillStats);for(const [ch,skills]of Object.entries(incoming)){state.skillStats[ch]??={};for(const [kind,entry]of Object.entries(skills)){const old=state.skillStats[ch][kind];state.skillStats[ch][kind]=!old||Number(entry.attempts)>Number(old.attempts)?entry:old}}}if(data.studyDays&&typeof data.studyDays==='object'){const incoming=cleanStudyDays(data.studyDays);for(const [ch,days] of Object.entries(incoming)){state.studyDays[ch]=[...new Set([...(state.studyDays[ch]||[]),...days])].sort().slice(-STUDY_DAYS_REQUIRED)}}if(data.writingGuideMode==='trace'&&state.writingGuideMode!=='trace')state.writingGuideMode='trace';if(data.writingStats&&typeof data.writingStats==='object'){const incoming=cleanWritingStats(data.writingStats);for(const [ch,s] of Object.entries(incoming)){const old=state.writingStats[ch];if(!old){state.writingStats[ch]=s;continue}const merged={};for(const key of ['attempts','completed','mistakes','hints','clean','streak','score'])merged[key]=Math.max(Number(old[key])||0,Number(s[key])||0);merged.last=String(old.last||'')>=String(s.last||'')?old.last:s.last;state.writingStats[ch]=merged}}if(data.srs&&typeof data.srs==='object')for(const [ch,entry]of Object.entries(data.srs))if(isHanzi(ch)&&entry&&typeof entry==='object')state.srs[ch]=(!state.srs[ch]||String(entry.last||'')>=String(state.srs[ch].last||''))?{...state.srs[ch],...entry}:state.srs[ch];if(data.daily&&typeof data.daily==='object')for(const [day,entry]of Object.entries(data.daily))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&entry&&typeof entry==='object'){const old=state.daily[day]||{};state.daily[day]={learn:Math.max(Number(old.learn)||0,Number(entry.learn)||0),correct:Math.max(Number(old.correct)||0,Number(entry.correct)||0),wrong:Math.max(Number(old.wrong)||0,Number(entry.wrong)||0)}}const entries=Object.values(state.daily);state.quizTotals={correct:Math.max(oldTotals.correct,incomingTotals.correct,entries.reduce((n,x)=>n+(Number(x.correct)||0),0)),wrong:Math.max(oldTotals.wrong,incomingTotals.wrong,entries.reduce((n,x)=>n+(Number(x.wrong)||0),0))}}
$('settings-open').onclick=openSettings;

// Three calm, swipeable personal collections below the sphere. They reuse the existing progress stores.
let activeCollection=null,collectionReturnFocus=null,collectionDisplayLimit=36;
const collectionSkipped={learned:new Set(),due:new Set(),favorite:new Set()};
// Each card has its own independent seven-second undo window.
const collectionUndo=new Map();
function collectionUndoKey(which,ch){return which+'|'+ch}
function finishCollectionRemoval(which,ch){
 const key=collectionUndoKey(which,ch),item=collectionUndo.get(key);
 if(!item)return;
 clearTimeout(item.timer);clearTimeout(item.animationTimer);
 collectionUndo.delete(key);
 if(which==='learned'){clearLearnedMark(ch)}
 else if(which==='due')collectionSkipped.due.add(ch);
 else if(which==='favorite')state.favorites=state.favorites.filter(x=>x!==ch);
 save();updateStats();renderWords();
 if(activeCollection===which)renderCollectionDrawer();
}
function removeCollectionItemWithUndo(which,ch){
 if(!['learned','favorite','due'].includes(which))return;
 const key=collectionUndoKey(which,ch);
 if(collectionUndo.has(key))return;
 if(which==='learned'&&!state.learned.includes(ch))return;
 if(which==='favorite'&&!state.favorites.includes(ch))return;
 if(which==='due'&&(!dueNow(ch)||collectionSkipped.due.has(ch)))return;
 const item={which,ch,startedAt:Date.now(),timer:null,animationTimer:null,exiting:false};
 collectionUndo.set(key,item);
 item.timer=setTimeout(()=>finishCollectionRemoval(which,ch),7000);
 renderCollectionDrawer();
}
function undoCollectionRemoval(which,ch){
 const key=collectionUndoKey(which,ch),item=collectionUndo.get(key);
 if(!item||item.exiting)return;
 clearTimeout(item.timer);clearTimeout(item.animationTimer);collectionUndo.delete(key);renderCollectionDrawer();
}

const collectionNames={learned:'Изученные',due:'К повторению',favorite:'Избранное'};
const collectionDescriptions={learned:'Слова, которые ты уже знаешь. Они продолжат появляться в повторении.',due:'Карточки, которые пора повторить. Просмотр не меняет расписание.',favorite:'Сохранённые слова. Открой карточку или убери из избранного.'};
function collectionItems(which){
 const all=[...wordsMap().values()];
 return all.filter(w=>!collectionSkipped[which].has(w.ch)&&(which==='learned'?state.learned.includes(w.ch):which==='due'?dueNow(w.ch):state.favorites.includes(w.ch)));
}
function setCollection(which){
 const wasOpen=!!activeCollection;
 if(!wasOpen&&which)collectionReturnFocus=document.activeElement;
 activeCollection=activeCollection===which?null:which;
 collectionDisplayLimit=36;
 renderCollectionDrawer();
 if(activeCollection)requestAnimationFrame(()=>$('collection-drawer').focus({preventScroll:true}));
}
function renderCollectionDrawer(){
 const drawer=$('collection-drawer');if(!drawer)return;
 document.querySelectorAll('[data-collection]').forEach(btn=>{
  const selected=btn.dataset.collection===activeCollection;
  btn.classList.toggle('is-active',selected);btn.setAttribute('aria-expanded',String(selected));
 });
 const backdrop=$('collection-modal-backdrop');backdrop.classList.toggle('hidden',!activeCollection);backdrop.setAttribute('aria-hidden',String(!activeCollection));
 // Keep scroll position while removing an item, and do not touch the main catalog.
 const oldScroll=drawer.scrollTop;
 drawer.replaceChildren();
 if(!activeCollection){if(collectionReturnFocus?.isConnected)collectionReturnFocus.focus({preventScroll:true});return}
 const which=activeCollection,arr=collectionItems(which);
 const top=document.createElement('div');top.className='collection-drawer-heading';
 const info=document.createElement('div');const eyebrow=document.createElement('div');eyebrow.className='collection-drawer-eyebrow';eyebrow.textContent='ТВОЯ ПОДБОРКА';
 const title=document.createElement('h3');title.id='collection-modal-title';title.textContent=collectionNames[which];
 const description=document.createElement('p');description.textContent=collectionDescriptions[which];info.append(eyebrow,title,description);
 const close=makeBtn('×','collection-close',()=>setCollection(which));close.setAttribute('aria-label','Закрыть подборку');top.append(info,close);drawer.append(top);
 if(!arr.length){const empty=document.createElement('div');empty.className='collection-empty';empty.textContent=which==='learned'?'Здесь появятся изученные слова.':which==='favorite'?'Добавляй карточки в избранное — они появятся здесь.':'Сейчас нет слов к повторению.';drawer.append(empty);return}
 const status=document.createElement('p');status.className='collection-catalog-status';status.textContent=`${arr.length} карточек · показываем ${Math.min(collectionDisplayLimit,arr.length)}`;drawer.append(status);
 const grid=document.createElement('div');grid.className='collection-catalog-grid';
 for(const w of arr.slice(0,collectionDisplayLimit)){
  const card=document.createElement('article');card.className='collection-catalog-card';card.dataset.collectionWord=w.ch;
  if(collectionUndo.has(collectionUndoKey(which,w.ch)))card.classList.add('collection-card-pending');
  const glyph=document.createElement('div');glyph.className='collection-catalog-glyph';glyph.textContent=w.ch;
  const pin=document.createElement('div');pin.className='collection-catalog-pinyin';pin.textContent=canHidePinyin(w.ch)?'Пиньинь скрыт ✦':w.pinyin;
  if(canHidePinyin(w.ch)){const show=makeBtn('Показать пиньинь','collection-secondary',()=>{pin.textContent=w.pinyin;show.remove()});card.append(glyph,pin,show)}else card.append(glyph,pin);
  const meaning=document.createElement('div');meaning.className='collection-catalog-meaning';meaning.textContent=w.meaning;card.append(meaning);
  const actions=document.createElement('div');actions.className='collection-catalog-actions';
  actions.append(makeBtn('Открыть ↗','collection-primary',()=>openWord(w.ch)));
  const pending=collectionUndo.has(collectionUndoKey(which,w.ch));
  if(which==='favorite'||which==='learned'||which==='due'){
   const action=makeBtn(pending?'↶ Вернуть':which==='favorite'?'♡ Убрать':which==='learned'?'Убрать отметку':'Скрыть сейчас',pending?'collection-secondary collection-inline-undo':'collection-secondary',pending?()=>undoCollectionRemoval(which,w.ch):()=>removeCollectionItemWithUndo(which,w.ch));
   if(pending){
    const item=collectionUndo.get(collectionUndoKey(which,w.ch));
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','undo-fuse');svg.setAttribute('viewBox','0 0 100 40');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    const outline=document.createElementNS('http://www.w3.org/2000/svg','rect');
    outline.setAttribute('x','1.5');outline.setAttribute('y','1.5');outline.setAttribute('width','97');outline.setAttribute('height','37');outline.setAttribute('rx','9');outline.setAttribute('ry','9');outline.setAttribute('pathLength','100');
    svg.append(outline);action.append(svg);
    action.style.setProperty('--fuse-delay',(-Math.min(7,(Date.now()-item.startedAt)/1000))+'s');
   }
   actions.append(action);
  }
  card.append(actions);grid.append(card);
 }
 drawer.append(grid);
 if(arr.length>collectionDisplayLimit){drawer.append(makeBtn('Показать ещё ↓','soft collection-catalog-more',()=>{collectionDisplayLimit+=36;renderCollectionDrawer()}))}
 drawer.scrollTop=oldScroll;
}
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>setCollection(b.dataset.collection)));
$('collection-modal-backdrop').addEventListener('click',e=>{if(e.target===$('collection-modal-backdrop')&&activeCollection)setCollection(activeCollection)});
document.addEventListener('keydown',e=>{if(activeCollection&&e.key==='Escape'&&$('modal-overlay').classList.contains('hidden')){e.preventDefault();setCollection(activeCollection)}});
const heroCollections=document.querySelector('.collection-cases');
if(heroCollections){
 const heroActions=document.createElement('div');heroActions.className='hero-actions';
 heroActions.append(makeBtn('✦ Случайная карточка','hero-discover',()=>{
  const pool=[...wordsMap().values()];if(!pool.length)return toast('В словаре пока нет доступных карточек.');openWord(pick(pool).ch,false,true);
 }));
 heroCollections.after(heroActions);
}
const heroOrb=$('hero-orb');
if(heroOrb){
 let orbTimeout;
 heroOrb.addEventListener('click',()=>{
  daliaSfx('orb');
  heroOrb.classList.remove('is-blooming');void heroOrb.offsetWidth;heroOrb.classList.add('is-blooming');
  clearTimeout(orbTimeout);orbTimeout=setTimeout(()=>heroOrb.classList.remove('is-blooming'),1050);
 });
}
$('word-search').addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.value){e.target.value='';displayLimit=48;renderWords()}});
$('quote-search').addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.value){e.target.value='';renderQuotesList()}});

if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
save({quiet:true});renderWords();renderDrafts();updateStats();
