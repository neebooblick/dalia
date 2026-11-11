const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('../assets/dalia-translation-v1.js');
const student={ch:'我',cn:'我是学生。',ru:'Я студент.'};
assert.equal(engine.check(student,' 我是 一个 学生！ ').status,'correct');
assert.equal(engine.check(student,'我是學生').status,'correct');
assert.equal(engine.check(student,'我不是学生').status,'incorrect');
assert.equal(engine.check(student,'我学生').status,'incorrect');
assert.equal(engine.check(student,'我是一名学生').status,'unknown');
assert.equal(engine.check(student,'wǒ shì xuéshēng').status,'input');
assert.equal(engine.check(student,'… 。 ').status,'empty');
assert.equal(engine.check({...student,ru:'Я не студент.'},'我是一个学生').status,'unknown');
assert.notEqual(engine.normalize('我有1.5元'),engine.normalize('我有15元'));
assert.notEqual(engine.check({cn:'我有两本书',ru:'У меня две книги.'},'我有三本书').status,'correct');
assert.equal(engine.check({cn:'我爱你。',ru:'Я люблю тебя.'},'你爱我').status,'incorrect');
assert.equal(engine.check({cn:'我每天学习中文。',ru:'Я каждый день изучаю китайский.'},'每天我学习中文').status,'correct');
assert.equal(engine.check({cn:'我每天学习中文。',ru:'Я каждый день изучаю китайский.'},'我学习每天中文').status,'unknown');
// Validate the catalogue against real data and ensure every stored variant works.
const data=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../assets/dalia-data-v8.1.1.js'),'utf8')+';globalThis.rows=WORD_DATA',data);
let expanded=0,alternatives=0;
for(const row of data.rows){const w={cn:row[3],ru:row[4]};if(!w.cn)continue;const variants=engine.variants(w);if(variants.length>1)expanded++;for(const answer of variants){assert.equal(engine.check(w,answer).status,'correct');alternatives+=answer!==w.cn?1:0}}
assert.ok(expanded>=30);
// Exercise the actual UI handler with a minimal DOM, including scoring and IME.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.listeners={};this.textContent='';this.value='';this.classList={toggle(){}}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,v){this.listeners[k]=v}
 focus(){}
}
function setup(){
 const area=new Element('div'),scores=[];let advances=0;
 const context=vm.createContext({document:{createElement:tag=>new Element(tag)},DaliaTranslation:engine,recordSkill:(...args)=>scores.push(args),makeBtn:(text,cls,fn)=>Object.assign(new Element('button'),{textContent:text,click:fn}),interactiveSentence:()=>new Element('span'),speak(){},advanceQuestion:()=>advances++});
 const source=fs.readFileSync(require.resolve('../assets/dalia-app-v8.2.0.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('function renderSentenceTranslation('),source.indexOf('\nfunction newQuestion()')),context);
 context.renderSentenceTranslation(area,student);
 const input=area.children.find(n=>n.tag==='textarea'),actions=area.children.at(-1),feedback=area.children.find(n=>n.id==='translation-feedback');
 const click=label=>{const b=actions.children.find(n=>n.textContent===label);assert.ok(b,label);b.click()};
 return {input,click,scores,feedback,advances:()=>advances};
}
let ui=setup();ui.input.value='我学生';ui.click('Проверить');assert.equal(ui.input.disabled,undefined);assert.equal(ui.scores.length,0);assert.match(ui.feedback.textContent,/нужно 是/);ui.input.value='我是学生';ui.click('Проверить ещё раз');assert.equal(ui.scores.length,1);assert.equal(ui.scores[0][2].assisted,true);
ui=setup();ui.input.value='我是一名学生';ui.click('Проверить');ui.click('Показать ответ');assert.equal(ui.scores.length,0);assert.match(ui.feedback.textContent,/без оценки/);
ui=setup();ui.input.value='我是一名学生';ui.click('Проверить');ui.click('Сравнить с примером');ui.input.value='我是学生';ui.click('Проверить ещё раз');assert.equal(ui.scores.length,0);
ui=setup();ui.input.value='我是一个学生';ui.click('Проверить');assert.equal(ui.scores.length,1);assert.equal(ui.scores[0][2].correct,true);assert.equal(ui.input.disabled,true);ui.input.listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(ui.scores.length,1);
ui=setup();ui.click('Подсказка');ui.input.value='我是学生';ui.click('Проверить');assert.equal(ui.scores[0][2].hint,true);
ui=setup();ui.input.value='我是一名学生';ui.click('Проверить');ui.click('Пропустить без оценки');assert.equal(ui.scores.length,0);assert.equal(ui.advances(),1);
ui=setup();ui.input.value='我是学生';ui.input.listeners.keydown({key:'Enter',isComposing:true,preventDefault(){throw Error('IME submission')}});assert.equal(ui.scores.length,0);
console.log(`PASS: translation validation and UI/scoring regressions; ${expanded} catalogue rows, ${alternatives} alternative answers.`);
