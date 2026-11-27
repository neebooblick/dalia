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
const sentenceNorm=s=>norm(s).replace(/\s*([,;:])\s*/g,'$1 ').replace(/\s+/g,' ').trim();
const orderNorm=s=>norm(s).replace(/[,;:]/g,'').replace(/\s+/g,' ').trim();
const matches=(q,answer)=>q.answers.some(x=>q.type==='order'?orderNorm(x)===orderNorm(answer):q.type?sentenceNorm(x)===sentenceNorm(answer):norm(x)===norm(answer));
const taskLabels={translate:'Перевод',correct:'Исправление ошибки',order:'Порядок слов',rewrite:'Преобразование предложения'};
const instructions={translate:'Переведи на английский. Напиши ответ целиком.',correct:'Найди грамматическую ошибку и напиши исправленное предложение целиком.',order:'Нажимай на слова в правильном порядке. Знаки препинания не нужны. Чтобы вернуть слово, нажми на него в собранном предложении.',rewrite:'Перепиши предложение по условию. Напиши ответ целиком.'};
let level='all',category='all',query='',current=null,tab='rule',session=null,mixedSize=10;
const headersById={be:['Кто?','Утверждение / отрицание','Вопрос'], 'present-simple':['Тип предложения','I / you / we / they','He / she / it'], 'present-cont':['Тип предложения','Пример 1','Пример 2'], 'past-simple':['Тип предложения','Обычный глагол','Неправильный глагол'], 'past-cont':['Тип предложения','Was','Were / другой пример'], 'present-perfect':['Тип предложения','Have','Has'], 'perfect-cont':['Тип предложения','Have been','Has been'], there:['Число / форма','Пример','Вопрос / пример'], articles:['Артикль','Пример','Когда используется'], pronouns:['Кто? / Кого?','Чей? + предмет','Чей? без предмета'], plural:['Слово → форма','Правило','Перевод'], prepositions:['Предлог','Время','Место'], irregular:['V1 · начальная','V2 · прошедшая','V3 · третья форма'], future:['Конструкция','Пример','Когда используется'], quantifiers:['Слово','Пример','Значение'], comparison:['Обычная','Сравнительная','Превосходная'], modals:['Конструкция','Пример / значение','Значение / пример'], 'word-order':['Тип предложения','Пример','Порядок слов'], conditionals:['Тип','Схема','Пример'], passive:['Время','Схема','Пример'], gerund:['После чего','Форма','Пример'], relative:['Слово','Пример','Что обозначает'], 'past-perfect':['Тип предложения','Пример','Смысл'], reported:['Изменение','Прямая речь','Косвенная речь'], third:['Тип условия','Условие','Результат'], inversion:['Начало предложения','Пример','Перевод'], hedging:['Конструкция','Пример','Значение'], cleft:['Тип','Пример','Перевод'], concession:['Конструкция','Пример','Значение']};
const answerText=v=>v==='—'?'Без артикля (—)':v;
const filled=q=>q.type?q.answers[0]:q.prompt.replace('___',q.answers[0]==='—'?'':q.answers[0]).replace(/ {2,}/g,' ');
function scroll(){root.scrollIntoView({block:'start',behavior:'auto'})}
function title(parent,heading,caption){parent.append(node('h2','grammar-title',heading));if(caption)parent.append(node('p','grammar-subtitle',caption))}
function catalogItems(){let q=norm(query);return lessons.filter(t=>(level==='all'||t.level===level)&&(category==='all'||t.category===category)&&(!q||norm([t.title,t.subtitle,t.category,t.rule,t.level].join(' ')).includes(q)))}
function renderCatalog(){
 current=null;session=null;root.replaceChildren();
 let intro=node('div','grammar-intro');intro.append(node('div','grammar-kicker','DALIA · ENGLISH'),node('h2','grammar-title','Грамматика'),node('p','grammar-subtitle','Выбери тему и изучай в три шага: правило, примеры с переводом, короткая тренировка с разными типами заданий.'));root.append(intro);
 let filters=node('div','grammar-filters'),chips=node('div','grammar-levels');
 for(let v of ['all',...levels]){let b=button(v==='all'?'Все':v,'grammar-chip'+(level===v?' active':''),()=>{level=v;renderCatalog()});b.setAttribute('aria-pressed',String(level===v));chips.append(b)}
 filters.append(node('p','grammar-filter-label','1. Выбери уровень'),chips,node('p','grammar-filter-label','2. Найди нужную тему'));let controls=node('div','grammar-controls'),search=node('input','search');search.type='search';search.placeholder='Найти правило…';search.value=query;search.setAttribute('aria-label','Поиск правила');
 let select=node('select','field');select.setAttribute('aria-label','Категория грамматики');for(let v of ['all',...new Set(lessons.map(x=>x.category))]){let o=node('option','',v==='all'?'Все темы':v);o.value=v;select.append(o)}select.value=category;controls.append(search,select);filters.append(controls);root.append(filters);
 let grid=node('div','grammar-grid'),count=node('div','tiny muted'),mixed=button('Начать смешанную тренировку →','primary grammar-mixed',()=>{let source=catalogItems();if(source.length){current=null;start(source,true,null,mixedSize)}}),setup=node('div','grammar-mix-setup'),sizes=node('div','grammar-size-options'),info=node('p','grammar-subtitle');setup.append(node('strong','','Хочешь проверить себя по нескольким темам?'),node('p','grammar-subtitle','Задания будут только из тем, которые подходят под выбранные фильтры.'),node('p','grammar-filter-label','Количество заданий'),sizes,info,mixed);root.append(setup,count,grid);
 function renderSizes(total){sizes.replaceChildren();let allowed=[5,10,20].filter(n=>n<=total);if(total&&(!allowed.length||total<20&&!allowed.includes(total)))allowed.push(total);if(!allowed.includes(mixedSize))mixedSize=allowed.find(n=>n>=mixedSize)||allowed[allowed.length-1]||10;for(let n of allowed){let b=button(String(n),'grammar-chip'+(mixedSize===n?' active':''),()=>{mixedSize=n;renderSizes(total)});b.setAttribute('aria-pressed',String(mixedSize===n));sizes.append(b)}info.textContent=total?'Доступно '+total+' заданий по выбранным темам.':'Нет заданий: измени фильтры.'}
 function populate(){let source=catalogItems();grid.replaceChildren();count.textContent=source.length+' из '+lessons.length+' тем';mixed.disabled=!source.length;renderSizes(source.reduce((sum,t)=>sum+t.questions.length,0));for(let t of source){let b=button('','grammar-lesson-card',()=>{current=t;tab='rule';session=null;renderLesson();scroll()});let top=node('div','grammar-card-top');top.append(node('span','grammar-level',t.level),node('span','tiny muted',t.category));b.append(top,node('strong','grammar-card-title',t.title),node('span','grammar-card-sub',t.subtitle),node('span','grammar-card-bottom','Открыть урок · '+t.questions.length+' заданий →'));grid.append(b)}if(!source.length)grid.append(node('p','empty','Ничего не найдено. Измени фильтры или поиск.'))}
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
 body.append(node('h3','grammar-section-heading','Когда и как использовать'),node('p','grammar-rule',current.rule));
 let table=node('table','grammar-table');let headers=headersById[current.id]||['Форма','Пример','Пояснение'];
 let head=node('thead'),hr=node('tr');for(let x of headers){let th=node('th','',x);th.scope='col';hr.append(th)}head.append(hr);let tb=node('tbody');for(let row of current.table){let tr=node('tr');for(let x of row)tr.append(node('td','',x));tb.append(tr)}table.append(head,tb);let wrap=node('div','grammar-table-wrap');wrap.append(table);body.append(wrap);
 let note=node('div','grammar-note');note.append(node('strong','','Частые ошибки и важные нюансы'),node('p','',current.note));body.append(note);
 if(/\bV[123]\b|\bAux\b|\bWh\b|\bS \+/.test([current.rule,...current.table.flat(),current.note].join(' '))){let legend=node('p','grammar-legend','V1 — начальная форма (go), V2 — прошедшая (went), V3 — третья форма (gone). S — подлежащее, V — глагол, O — дополнение, Aux — вспомогательный глагол, Wh — вопросительное слово.');body.append(legend)}
 }else{body.append(node('h3','grammar-section-heading','Посмотри, как это работает'),node('p','grammar-subtitle','Прочитай предложение, его перевод и объяснение. Нажми на значок звука, чтобы услышать английский пример.'));for(let [en,ru,why] of current.examples){let box=node('div','grammar-example');let line=node('div','grammar-example-line');line.append(node('strong','',en),button('♫','english-inline-audio',()=>{if(typeof speak==='function')speak(en)}));box.append(line,node('p','',ru));if(why){let exp=node('div','grammar-example-explanation');exp.append(node('span','grammar-example-label','Почему именно так?'),node('p','',why));box.append(exp)}body.append(box)}}
 if(tab==='rule')body.append(button('Посмотреть примеры →','primary grammar-start',()=>{tab='examples';renderLesson();scroll()}),button(session?'Продолжить тренировку':'Сразу к тренировке','ghost grammar-start',()=>{if(session){tab='practice';renderSession();scroll()}else start([current],false)}));else body.append(button(session?'Продолжить тренировку →':'Начать тренировку →','primary grammar-start',()=>{if(session){tab='practice';renderSession();scroll()}else start([current],false)}))
}
function start(source,mixed,items=null,limit=mixedSize){let questions=items||source.flatMap(t=>t.questions.map(q=>({t,q})));if(!questions.length)return;if(mixed&&!items){let pools=shuffle(source).map(t=>shuffle(t.questions.map(q=>({t,q}))));questions=[];while(questions.length<limit&&pools.some(p=>p.length)){for(let p of pools){if(p.length&&questions.length<limit)questions.push(p.pop())}}}session={mixed,source,limit,items:shuffle(questions),index:0,results:[],answer:null,locked:false};tab='practice';renderSession();scroll()}
function renderSession(){
 if(!session)return;
 root.replaceChildren();header(root);let lead=node('div','grammar-intro');title(lead,session.mixed?'Смешанная грамматика':session.source[0].title,session.mixed?'Правила из выбранных тем':session.source[0].subtitle);root.append(lead);
 if(!session.mixed){let tabs=node('div','grammar-tabs');for(let [k,label] of [['rule','Правило'],['examples','Примеры'],['practice','Тренировка']]){let b=button(label,'grammar-tab'+(k==='practice'?' active':''),()=>{if(k==='practice')return;tab=k;renderLesson()});b.setAttribute('aria-pressed',String(k==='practice'));tabs.append(b)}root.append(tabs)}
 let panel=node('div','grammar-panel grammar-session');root.append(panel);
 if(session.index>=session.items.length){
 let correct=session.results.filter(x=>x.outcome==='correct').length,missed=session.results.filter(x=>x.outcome==='wrong').length,skipped=session.results.filter(x=>x.outcome==='skip').length,revealed=session.results.filter(x=>x.outcome==='reveal').length;title(panel,'Тренировка завершена','Правильных ответов: '+correct+' из '+session.items.length);let stats=node('div','grammar-result-stats');for(let [label,n] of [['Верно',correct],['Ошибки',missed],['Пропущено',skipped],['Ответ показан',revealed]]){let x=node('div','grammar-stat');x.append(node('strong','',String(n)),node('span','tiny muted',label));stats.append(x)}panel.append(stats);
 if(missed||skipped||revealed){panel.append(node('h3','grammar-section-heading','Разбери сложные задания'));for(let r of session.results.filter(x=>x.outcome!=='correct')){let e=node('div','grammar-example');e.append(node('strong','',filled(r.item.q)),node('p','',r.outcome==='wrong'?'Твой ответ: '+answerText(r.answer):r.outcome==='skip'?'Задание пропущено':'Ответ был показан'),node('p','',(r.item.q.type&&r.item.q.type!=='order'?'Допустимые варианты: ':'Правильный ответ: ')+r.item.q.answers.map(answerText).join(' / ')),node('p','',r.item.q.why));panel.append(e)}let wrong=session.results.filter(x=>x.outcome!=='correct').map(x=>x.item);panel.append(button('Повторить сложные задания','primary grammar-start',()=>start(session.source,session.mixed,wrong,session.limit)))}
 panel.append(button('Пройти заново','soft grammar-start',()=>start(session.source,session.mixed,null,session.limit)),button('Все правила','ghost grammar-start',back));return
 }
 let item=session.items[session.index],q=item.q,isOrder=q.type==='order',isSentence=!!q.type&&!isOrder;
 let meta=node('div','grammar-task-meta');meta.append(node('span','grammar-level',item.t.level),node('span','tiny muted',(session.index+1)+' из '+session.items.length));panel.append(meta);let track=node('div','grammar-progress'),bar=node('div','grammar-progress-fill');bar.style.width=(session.index/session.items.length*100)+'%';track.append(bar);panel.append(track);
 if(q.type)panel.append(node('span','grammar-task-kind',taskLabels[q.type]));
 panel.append(node('p','grammar-instruction',instructions[q.type]||(q.wrong.length?'Выбери вариант, который подходит вместо пропуска.':'Впиши только пропущенное слово или выражение.')));
 if(!isOrder)panel.append(node('h3','grammar-question',q.prompt));
 let feedback=node('div','grammar-feedback');feedback.setAttribute('role','status');let actions=node('div','grammar-practice-actions'),choices=node('div','grammar-options'),inputs=[],input=null,check=null;let options=session.options,wordButtons=[],orderArea=null;
 if(isOrder){
 if(!session.wordBank){session.wordBank=shuffle(q.words.map((word,i)=>({word:word.replace(/[,;:]$/,''),i})));if(session.wordBank.length>1&&orderNorm(session.wordBank.map(x=>x.word).join(' '))===orderNorm(q.words.join(' ')))session.wordBank.push(session.wordBank.shift())}
 if(!session.wordOrder)session.wordOrder=[];
 orderArea=node('div','grammar-order-answer');orderArea.setAttribute('aria-label','Собранное предложение');let bank=node('div','grammar-word-bank');bank.setAttribute('aria-label','Доступные слова');
 const selection=()=>session.wordOrder.map(i=>session.wordBank.find(x=>x.i===i).word).join(' ');
 check=button('Проверить','primary',()=>{if(session.wordOrder.length===q.words.length)submit(selection())});
 let reset=button('Очистить','ghost grammar-order-reset',()=>{if(!session.locked){session.wordOrder=[];renderWords()}});
 function renderWords(){orderArea.replaceChildren();bank.replaceChildren();if(!session.wordOrder.length)orderArea.append(node('span','grammar-order-placeholder','Здесь будет твоё предложение'));for(let i of session.wordOrder){let word=session.wordBank.find(x=>x.i===i).word;let b=button(word,'grammar-word selected',()=>{if(!session.locked){session.wordOrder=session.wordOrder.filter(x=>x!==i);renderWords()}});b.disabled=session.locked;orderArea.append(b)}
 for(let token of session.wordBank){let b=button(token.word,'grammar-word',()=>{if(!session.locked&&!session.wordOrder.includes(token.i)){session.wordOrder.push(token.i);renderWords()}});b.disabled=session.locked||session.wordOrder.includes(token.i);bank.append(b)}
 check.disabled=session.locked||session.wordOrder.length!==q.words.length;reset.disabled=session.locked||!session.wordOrder.length;
 wordButtons=[...orderArea.children,...bank.children,reset];
 }
 panel.append(orderArea,bank,reset);actions.append(check);renderWords();
 }else if(q.wrong.length){
 if(!options){options=shuffle([q.answers[0],...q.wrong]);session.options=options}
 for(let choice of options){let b=button(answerText(choice),'option grammar-option',()=>submit(choice));inputs.push([b,choice]);choices.append(b)}panel.append(choices)
 }else{input=node(isSentence?'textarea':'input','field grammar-input'+(isSentence?' grammar-sentence-input':''));input.lang='en';input.autocomplete='off';input.autocapitalize='none';input.spellcheck=false;input.placeholder=isSentence?'Напиши по-английски…':'Твой ответ';input.setAttribute('aria-label','Ответ');input.value=session.draft||'';if(isSentence)input.rows=3;panel.append(input);check=button('Проверить','primary',()=>{if(input.value.trim())submit(input.value)});input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&(!isSentence||!e.shiftKey)){e.preventDefault();if(input.value.trim())submit(input.value)}};actions.append(check)}
 let show=button('Показать ответ','ghost',()=>submit('',true)),skip=button('Пропустить','ghost',()=>advance('skip'));actions.append(show,skip);panel.append(feedback,actions);if(input){check.disabled=!input.value.trim();input.oninput=()=>{session.draft=input.value;check.disabled=!input.value.trim()}}
 function paint(outcome,answer){
 for(let [b,v] of inputs){b.disabled=true;if(matches(q,v))b.classList.add('correct');else if(norm(v)===norm(answer))b.classList.add('wrong')}
 if(input){input.value=answer;input.disabled=true}if(isOrder)for(let b of wordButtons)b.disabled=true;
 feedback.replaceChildren();feedback.append(node('strong',outcome==='correct'?'grammar-good':outcome==='wrong'?'grammar-bad':'',outcome==='correct'?'Правильно!':outcome==='wrong'?(isSentence?'Ответ не совпал с образцом':'Не совсем.'):'Ответ показан'),node('p','grammar-correct-sentence',filled(q)),node('p','',(isSentence?'Допустимые варианты: ':'Правильный ответ: ')+q.answers.map(answerText).join(' / ')),node('p','','Почему: '+q.why));if(isSentence&&outcome==='wrong')feedback.append(node('p','grammar-match-note','Проверка сравнивает ответ с известными вариантами. Другой грамматически верный перевод может не распознаться. Сравни свой ответ с образцом.'));if(session.mixed)feedback.append(node('p','grammar-task-topic','Тема: '+item.t.title+' · '+item.t.subtitle));
 actions.replaceChildren(button(session.index===session.items.length-1?'Завершить':'Следующее задание →','primary grammar-start',()=>advance(outcome)));
 }
 function submit(answer,reveal=false){if(session.locked)return;let outcome=reveal?'reveal':matches(q,answer)?'correct':'wrong';session.locked=true;session.answer={outcome,answer};paint(outcome,answer)}
 function advance(outcome){session.results.push({item,outcome,answer:session.answer?.answer||''});session.index++;session.locked=false;session.answer=null;session.options=null;session.wordBank=null;session.wordOrder=null;session.draft='';renderSession();scroll()}
 if(session.locked&&session.answer)paint(session.answer.outcome,session.answer.answer)
}
window.daliaGrammarOpen=()=>{if(current){if(tab==='practice'&&session)renderSession();else renderLesson()}else if(session)renderSession();else renderCatalog()};
})();
