(() => {
 'use strict';
 const key='dalia_study_language_v1';
 const script=document.currentScript || document.querySelector('script[src*="language-choice-v1.js"]');
 const base=new URL('../',script.src);
 const english=new URL('english/',base);
 const current=location.pathname.startsWith(english.pathname)?'en':'zh';
 let saved;try{saved=localStorage.getItem(key);}catch(_){}
 if(current==='zh'&&saved==='en'&&!location.hash&&!location.search){location.replace(english.href);return;}
 function remember(language){try{localStorage.setItem(key,language);}catch(_){}}
 function choices(){
  const group=document.createElement('div');group.className='dalia-language-options';
  for(const [language,label,note] of [['zh','Китайский','Иероглифы, пиньинь и практика'],['en','Английский','Слова, произношение и практика']]){
   const link=document.createElement('a');link.href=language==='en'?english.href:base.href;
   const title=document.createElement('strong');title.textContent=label;
   const small=document.createElement('span');small.textContent=note;link.append(title,small);
   if(saved&&language===current)link.setAttribute('aria-current','true');
   link.addEventListener('click',event=>{remember(language);if(language===current){event.preventDefault();dialog.close();dialog.remove();}});
   group.append(link);
  }return group;
 }
 const dialog=document.createElement('dialog');dialog.className='dalia-language-dialog';dialog.setAttribute('aria-labelledby','dalia-language-title');
 const title=document.createElement('h2');title.id='dalia-language-title';title.textContent='Какой язык изучаем?';
 const copy=document.createElement('p');copy.textContent='Выбери направление. Изменить его можно в настройках.';
 dialog.append(title,copy,choices());
 document.addEventListener('click',event=>{
  const link=event.target.closest('a.chinese-link');if(link)remember('zh');
 });
 function addSettingsChoice(){
  const heading=document.getElementById('modal-title');
  const body=document.getElementById('modal-body');
  if(!body||!heading?.textContent.startsWith('Настройки')||body.querySelector('.dalia-language-settings'))return;
  const section=document.createElement('section');section.className='dalia-language-settings';
  const h=document.createElement('h3');h.textContent='Язык обучения';section.append(h,choices());body.prepend(section);
 }
 new MutationObserver(addSettingsChoice).observe(document.body,{childList:true,subtree:true});
 if(current==='en'&&saved)remember('en');
 if(!saved){document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',()=>remember(current));}
})();
