'use strict';
(()=>{
 let worker,sequence=0,timer;
 function getWorker(){if(!worker)worker=new Worker('./assets/dictionary-worker.js');return worker}
 function openDictionary(){
  const box=document.createElement('div');box.className='dictionary-panel';
  box.innerHTML='<p class="muted">Русские карточки dalia и полный CC-CEDICT. Внешние статьи содержат английские значения.</p><label class="dictionary-label" for="dictionary-search">Найти слово</label><input id="dictionary-search" class="search" type="search" placeholder="你好, nǐ hǎo, ni3 hao3, привет…" autocomplete="off"><p class="tiny muted" id="dictionary-status" role="status" aria-live="polite"></p><div id="dictionary-results"></div><button class="ghost hidden" id="dictionary-more" type="button">Показать ещё</button><p class="dictionary-credit tiny muted">CC-CEDICT · MDBG и участники проекта · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="./dictionary-sources.html" target="_blank" rel="noopener">Источники и обновление</a></p>';
  showModal('Словарь',box);
  const input=box.querySelector('input'),status=box.querySelector('[role=status]'),list=box.querySelector('#dictionary-results'),more=box.querySelector('#dictionary-more');let limit=40;
  const current=()=>box.isConnected;
  function article(w,external=false){
   const el=document.createElement('article');el.className='dictionary-result';
   const title=document.createElement('h3');title.textContent=w.ch;
   const pin=document.createElement('p');pin.className='dictionary-pinyin';pin.textContent=w.pinyin;
   const meaning=document.createElement('p');meaning.textContent=w.meaning;
   const label=document.createElement('small');label.className='muted';label.textContent=external?'CC-CEDICT · значение на английском':'Карточка dalia · перевод на русском';
   el.append(label,title,pin,meaning);
   if(w.trad&&w.trad!==w.ch){const t=document.createElement('p');t.className='tiny muted';t.textContent='Традиционное написание: '+w.trad;el.append(t)}
   const actions=document.createElement('div');actions.className='dictionary-actions';
   actions.append(makeBtn('♫ Слушать','soft',()=>speak(w.ch)));
   const known=lookup(w.ch);
   actions.append(makeBtn(known?'Открыть карточку':'＋ Добавить в обучение','primary',()=>{
    if(known){openWord(w.ch);return}
    // Keep external English meanings out of the Russian training field.
    addNewWord({ch:w.ch,pinyin:w.pinyin,meaning:'',cn:'',ru:''});
    const note=document.createElement('p');note.className='tiny muted';note.textContent='CC-CEDICT: '+w.meaning+'. Добавь русский перевод и пример. Автоперевод нужно проверить перед сохранением.';
    document.querySelector('#modal-body')?.prepend(note);
   }));
   if(!known&&!isHanzi(w.ch)){actions.lastChild.disabled=true;actions.lastChild.textContent='Только словарная статья'}
   el.append(actions);return el;
  }
  function renderLocal(q){list.replaceChildren();const matches=[...wordsMap().values()].filter(w=>searchMatches(w,searchKey(q))).sort((a,b)=>Number(b.ch===q)-Number(a.ch===q));for(const w of matches.slice(0,q?limit:8))list.append(article(w));return matches.length}
  function search(){
   clearTimeout(timer);const id=++sequence,q=input.value.trim();const localCount=renderLocal(q);more.classList.add('hidden');
   if(!q){status.textContent='Введи слово. Поиск по-русски доступен в карточках dalia; по иероглифам и пиньиню — также в полном словаре.';return}
   if(/[а-яё]/i.test(q)){more.classList.toggle('hidden',localCount<=limit||limit>=400);status.textContent=localCount?'Найдено в dalia: '+localCount:'Русская карточка не найдена. Попробуй иероглифы или пиньинь.';return}
   status.textContent='Ищу в полном словаре… При первом поиске загружается база.';
   try{
    const w=getWorker();
    w.onmessage=({data})=>{if(!current()||data.id!==sequence)return;
     if(data.error){status.textContent='Не удалось загрузить словарь. Карточки dalia доступны. Проверь интернет и повтори поиск.';const retry=makeBtn('Повторить','soft',search);list.append(retry);return}
     for(const row of data.rows){list.append(article({ch:row[0],trad:row[1],pinyin:row[2],meaning:row[3]},true))}
     status.textContent='Карточки dalia: '+localCount+' · Статьи CC-CEDICT: '+data.total.toLocaleString('ru-RU');
     if(!localCount&&!data.total)status.textContent='Ничего не найдено. Попробуй другое написание или пиньинь.';
     more.classList.toggle('hidden',data.total<=limit||limit>=400);
    };
    w.onerror=()=>{if(current()){status.textContent='Словарь временно недоступен. Повтори поиск.'}w.terminate();worker=null};
    w.postMessage({id,query:q,limit});
   }catch(e){status.textContent='Не удалось открыть полный словарь в этом браузере. Поиск по карточкам dalia доступен.'}
  }
  input.oninput=()=>{++sequence;limit=40;clearTimeout(timer);timer=setTimeout(search,220)};
  more.onclick=()=>{limit+=40;search()};search();input.focus();
 }
 $('dictionary-open').addEventListener('click',openDictionary);
})();
