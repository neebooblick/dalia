const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {dictionaryKey,dictionarySearch}=require('../assets/dictionary-worker.js');
const rows=JSON.parse(fs.readFileSync('assets/dictionary/cedict.json'));
assert(rows.length>120000);
for(const query of ['你好','nǐ hǎo','ni3 hao3','nihao'])assert(dictionarySearch(rows,query).rows.some(w=>w[0]==='你好'));
assert(dictionarySearch(rows,'電腦').rows.some(w=>w[0]==='电脑'));
assert.equal(dictionaryKey('lü4'),dictionaryKey('lv'));
assert.equal(dictionaryKey('lu:4'),dictionaryKey('lǜ'));
assert.equal(dictionarySearch(rows,'unlikely-query-9988').total,0);
assert.equal(dictionarySearch(rows,'').total,0);
assert(dictionarySearch(rows,'shi',40).rows.length<=40);
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('assets/dalia-data-v8.2.0.js','utf8')+';globalThis.additions=DICTIONARY_ADDITIONS;globalThis.words=WORD_DATA',c);
assert.equal(c.additions.length,11);assert.equal(new Set(c.words.map(w=>w[0])).size,c.words.length);
for(const w of c.additions){assert(w[3].includes(w[0]));assert(/[а-я]/i.test(w[2]));assert(/[а-я]/i.test(w[4]));}
assert.equal(c.words.find(w=>w[0]==='宿舍')[1],'sù shè');
console.log('PASS: full snapshot, Chinese/traditional/pinyin searches, tone normalization, empty/no results, limits, additions and pronunciation corrections');
