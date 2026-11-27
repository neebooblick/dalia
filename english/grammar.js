/* English grammar: isolated, offline module. */
(function(){
'use strict';
const lessons=window.daliaGrammarLessons||[],root=document.getElementById('grammar-root');
if(!root)return;
const levels=['A1','A2','B1','B2','C1','C2'];
const node=(tag,cls='',value='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=value;return e};
const button=(value,cls,fn)=>{const b=node('button',cls,value);b.type='button';b.onclick=fn;return b};
const shuffle=items=>{let a=[...items];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’‘ʼ]/g,"'").trim().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
const matches=(q,answer)=>q.answers.some(x=>norm(x)===norm(answer));
let level='all',category='all',query='',current=null,tab='rule',session=null;
function scroll(){root.scrollIntoView({block:'start',behavior:'auto'})}
function title(parent,heading,caption){parent.append(node('h2','grammar-title',heading));if(caption)parent.append(node('p','grammar-subtitle',caption))}
function catalogItems(){let q=norm(query);return lessons.filter(t=>(level==='all'||t.level===level)&&(category==='all'||t.category===category)&&(!q||norm([t.title,t.subtitle,t.category,t.rule,t.level].join(' ')).includes(q)))}
function renderCatalog(){
 current=null;session=null;root.replaceChildren();
 let intro=node('div','grammar-intro');intro.append(node('div','grammar-kicker','DALIA · ENGLISH'),node('h2','grammar-title','Грамматика'),node('p','grammar-subtitle','Разберись в правилах, посмотри примеры и закрепи их на практике.'));root.append(intro);
 let filters=node('div','grammar-filters'),chips=node('div','grammar-levels');
 for(let v of ['all',...levels]){let b=button(v==='all'?'Все':v,'grammar-chip'+(level===v?' active':''),()=>{level=v;renderCatalog()});b.setAttribute('aria-pressed',String(level===v));chips.append(b)}
 filters.append(chips);let controls=node('div','grammar-controls'),search=node('input','search');search.type='search';search.placeholder='Найти правило…';search.value=query;search.setAttribute('aria-label','Поиск правила');
 let select=node('select','field');select.setAttribute('aria-label','Категория грамматики');for(let v of ['all',...new Set(lessons.map(x=>x.category))]){let o=node('option','',v==='all'?'Все темы':v);o.value=v;select.append(o)}select.value=category;controls.append(search,select);filters.append(controls);root.append(filters);
 let grid=node('div','grammar-grid'),count=node('div','tiny muted'),mixed=button('✧ Смешанная тренировка','primary grammar-mixed',()=>{let source=catalogItems();if(source.length){current=null;start(source,true)}});root.append(count,mixed,grid);
 function populate(){let source=catalogItems();grid.replaceChildren();count.textContent=source.length+' из '+lessons.length+' тем';mixed.disabled=!source.length;for(let t of source){let b=button('','grammar-lesson-card',()=>{current=t;tab='rule';session=null;renderLesson();scroll()});let top=node('div','grammar-card-top');top.append(node('span','grammar-level',t.level),node('span','tiny muted',t.category));b.append(top,node('strong','grammar-card-title',t.title),node('span','grammar-card-sub',t.subtitle),node('span','grammar-card-bottom','Правило · '+t.questions.length+' заданий →'));grid.append(b)}if(!source.length)grid.append(node('p','empty','Ничего не найдено. Измени фильтры или поиск.'))}
 search.oninput=()=>{query=search.value;populate()};select.onchange=()=>{category=select.value;populate()};populate()
}
function back(){session=null;current=null;renderCatalog();scroll()}
function header(parent){parent.append(button('← Все правила','ghost grammar-back',back))}
function renderLesson(){
 if(!current){renderCatalog();return}
 root.replaceChildren();header(root);
 let lead=node('div','grammar-intro');lead.append(node('span','grammar-level',current.level+' · '+current.category));title(lead,current.title,current.subtitle);root.append(lead);
 let tabs=node('div','grammar-tabs');for(let [key,label] of [['rule','Правило'],['examples','Примеры'],['practice','Тренировка']]){let b=button(label,'grammar-tab'+(tab===key?' active':''),()=>{if(key==='practice'){if(!session||session.mixed)start([current],false);else{tab='practice';renderSession()}}else{tab=key;renderLesson()}});b.setAttribute('aria-pressed',String(tab===key));tabs.append(b)}root.append(tabs);
 let body=node('div','grammar-panel');root.append(body);
 if(tab==='rule'){
 body.append(node('p','grammar-rule',current.rule));
 let table=node('table','grammar-table');let headers=current.id==='irregular'?['V1','V2','V3']:current.id==='pronouns'?['Подлежащее / объект','Перед существительным','Самостоятельно']:current.id==='comparison'?['Основа','Сравнительная','Превосходная']:['Форма / случай','Конструкция / пример','Пояснение / пример'];
 if(['be','present-simple','past-simple','present-cont','past-cont','present-perfect','perfect-cont','there'].includes(current.id))headers=['Форма','Пример','Пример'];
 let head=node('thead'),hr=node('tr');for(let x of headers){let th=node('th','',x);th.scope='col';hr.append(th)}head.append(hr);let tb=node('tbody');for(let row of current.table){let tr=node('tr');for(let x of row)tr.append(node('td','',x));tb.append(tr)}table.append(head,tb);let wrap=node('div','grammar-table-wrap');wrap.append(table);body.append(wrap);
 let note=node('div','grammar-note');note.append(node('strong','','Важно запомнить'),node('p','',current.note));body.append(note);
 }else{for(let [en,ru] of current.examples){let box=node('div','grammar-example');let line=node('div','grammar-example-line');line.append(node('strong','',en),button('♫','english-inline-audio',()=>{if(typeof speak==='function')speak(en)}));box.append(line,node('p','',ru));body.append(box)}}
 body.append(button('Начать тренировку →','primary grammar-start',()=>start([current],false)))
}
function start(source,mixed,items=null){let questions=items||source.flatMap(t=>t.questions.map(q=>({t,q})));if(!questions.length)return;session={mixed,source,items:shuffle(questions),index:0,results:[],answer:null,locked:false};tab='practice';renderSession();scroll()}
function renderSession(){
 if(!session)return;
 root.replaceChildren();header(root);let lead=node('div','grammar-intro');title(lead,session.mixed?'Смешанная грамматика':session.source[0].title,session.mixed?'Правила из выбранных тем':session.source[0].subtitle);root.append(lead);
 if(!session.mixed){let tabs=node('div','grammar-tabs');for(let [k,label] of [['rule','Правило'],['examples','Примеры'],['practice','Тренировка']]){let b=button(label,'grammar-tab'+(k==='practice'?' active':''),()=>{if(k==='practice')return;tab=k;renderLesson()});b.setAttribute('aria-pressed',String(k==='practice'));tabs.append(b)}root.append(tabs)}
 let panel=node('div','grammar-panel grammar-session');root.append(panel);
 if(session.index>=session.items.length){
 let correct=session.results.filter(x=>x.outcome==='correct').length,missed=session.results.filter(x=>x.outcome==='wrong').length,skipped=session.results.filter(x=>x.outcome==='skip').length;title(panel,'Тренировка завершена','Верно: '+correct+' · Ошибки: '+missed+' · Пропущено: '+skipped);
 if(missed){panel.append(node('p','grammar-subtitle','Разбери ошибки, затем попробуй их ещё раз.'));for(let r of session.results.filter(x=>x.outcome==='wrong')){let e=node('div','grammar-example');e.append(node('strong','',r.item.q.prompt.replace('___',r.item.q.answers[0])),node('p','',r.item.q.why));panel.append(e)}let wrong=session.results.filter(x=>x.outcome==='wrong').map(x=>x.item);panel.append(button('Повторить ошибки','primary grammar-start',()=>start(session.source,session.mixed,wrong)))}
 panel.append(button('Пройти заново','soft grammar-start',()=>start(session.source,session.mixed)),button('Все правила','ghost grammar-start',back));return
 }
 let item=session.items[session.index],q=item.q;
 let meta=node('div','grammar-task-meta');meta.append(node('span','grammar-level',item.t.level),node('span','tiny muted',(session.index+1)+' из '+session.items.length));panel.append(meta);
 panel.append(node('p','tiny muted',q.wrong.length?'Выбери правильную форму':'Впиши пропущенную форму'),node('h3','grammar-question',q.prompt));
 let feedback=node('div','grammar-feedback');feedback.setAttribute('role','status');let actions=node('div','grammar-practice-actions'),choices=node('div','grammar-options'),inputs=[],input=null,check=null;let options=session.options;
 if(q.wrong.length){
 if(!options){options=shuffle([q.answers[0],...q.wrong]);session.options=options}
 for(let choice of options){let b=button(choice,'option grammar-option',()=>submit(choice));inputs.push([b,choice]);choices.append(b)}panel.append(choices)
 }else{input=node('input','field grammar-input');input.lang='en';input.autocomplete='off';input.autocapitalize='none';input.spellcheck=false;input.placeholder='Твой ответ';input.setAttribute('aria-label','Ответ');panel.append(input);check=button('Проверить','primary',()=>{if(input.value.trim())submit(input.value)});input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();if(input.value.trim())submit(input.value)}};actions.append(check)}
 let show=button('Показать ответ','ghost',()=>submit('',true)),skip=button('Пропустить','ghost',()=>advance('skip'));actions.append(show,skip);panel.append(feedback,actions);
 function paint(outcome,answer){
 for(let [b,v] of inputs){b.disabled=true;if(matches(q,v))b.classList.add('correct');else if(norm(v)===norm(answer))b.classList.add('wrong')}
 if(input){input.value=answer;input.disabled=true}
 feedback.replaceChildren();feedback.append(node('strong',outcome==='correct'?'grammar-good':'grammar-bad',outcome==='correct'?'Правильно!':'Правильный ответ: '+q.answers.join(' / ')),node('p','',q.why));
 actions.replaceChildren(button(session.index===session.items.length-1?'Завершить':'Следующее задание →','primary grammar-start',()=>advance(outcome)));
 }
 function submit(answer,reveal=false){if(session.locked)return;let outcome=!reveal&&matches(q,answer)?'correct':'wrong';session.locked=true;session.answer={outcome,answer};paint(outcome,answer)}
 function advance(outcome){session.results.push({item,outcome});session.index++;session.locked=false;session.answer=null;session.options=null;renderSession();scroll()}
 if(session.locked&&session.answer)paint(session.answer.outcome,session.answer.answer)
}
window.daliaGrammarOpen=()=>{if(current){if(tab==='practice'&&session)renderSession();else renderLesson()}else if(session)renderSession();else renderCatalog()};
})();
