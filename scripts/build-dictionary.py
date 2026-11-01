#!/usr/bin/env python3
"""Convert a CC-CEDICT gzip snapshot to data for dalia, without touching study state.
Usage: python scripts/build-dictionary.py /path/cedict.gz
Release: https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
"""
import gzip,re,json,sys,hashlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1];out=root/'assets/dictionary';out.mkdir(exist_ok=True)
def tone(s):
 m=re.fullmatch(r'([a-zA-ZüÜ:]+)([1-5])',s)
 if not m:return s
 v=m[1].lower().replace('u:','ü');n=int(m[2]);
 if n==5:return v
 pos=next((v.index(c) for c in ['a','e'] if c in v), -1)
 if pos<0:pos=v.index('o') if 'ou' in v else max((i for i,c in enumerate(v) if c in 'iouü'),default=-1)
 if pos>=0:v=v[:pos]+{'a':'āáǎà','e':'ēéěè','i':'īíǐì','o':'ōóǒò','u':'ūúǔù','ü':'ǖǘǚǜ'}[v[pos]][n-1]+v[pos+1:]
 return v
rows=[];readings={};date='';license=''
for line in gzip.open(sys.argv[1],'rt'):
 if line.startswith('#! date='):date=line.strip().split('=',1)[1]
 if line.startswith('#! license='):license=line.strip().split('=',1)[1]
 m=re.match(r'(\S+) (\S+) \[([^]]+)\] /(.+)/',line)
 if not m:continue
 trad,ch,pin,en=m.groups();py=' '.join(tone(s) for s in pin.split())
 rows.append([ch,trad,py,en.replace('/','; ')])
 readings.setdefault(ch,set()).add(py)
assert license=='https://creativecommons.org/licenses/by-sa/4.0/', 'Review upstream license before importing'
blob=json.dumps(rows,ensure_ascii=False,separators=(',',':'));(out/'cedict.json').write_text(blob)
(out/'readings.json').write_text(json.dumps({k:sorted(v) for k,v in readings.items()},ensure_ascii=False,separators=(',',':')))
meta={'count':len(rows),'date':date,'license':license,'sha256':hashlib.sha256(blob.encode()).hexdigest(),'source':'https://www.mdbg.net/chinese/dictionary?page=cc-cedict'}
(out/'meta.json').write_text(json.dumps(meta,indent=2));print(meta)
