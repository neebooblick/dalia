import fs from 'node:fs';import vm from 'node:vm';
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/dalia-data-v8.2.0.js','utf8')+';globalThis.rows=[...WORD_DATA,...REFERENCE_HANZI_DATA];',context);
const readings=JSON.parse(fs.readFileSync('assets/dictionary/readings.json','utf8'));
const norm=s=>s.toLowerCase().replace(/[\s’'·-]/g,'').normalize('NFC');
const seen=new Set(),missing=[],mismatch=[];let matched=0;
for(const r of context.rows){if(seen.has(r[0]))continue;seen.add(r[0]);if(!readings[r[0]])missing.push(r[0]);else if(readings[r[0]].some(p=>norm(p)===norm(r[1])))matched++;else mismatch.push({ch:r[0],current:r[1],source:readings[r[0]]})}
const report={total:seen.size,pinyinMatched:matched,missing,mismatch,note:'Matches check pronunciation only, not Russian senses, examples or HSK. Tone sandhi and neutral tones require editorial review. No automatic corrections.'};
fs.writeFileSync('assets/dictionary/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
