"""Import Russian translations from a local Kaikki English JSONL dump.
Usage: python scripts/import_dictionary.py dump.jsonl.gz
Requires pip install wordfreq. Output is a candidate catalog for review.
"""
import argparse, gzip, json, re
from pathlib import Path
from wordfreq import top_n_list

p=argparse.ArgumentParser()
p.add_argument("dump")
p.add_argument("--limit",type=int,default=500)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
app=(root/"english/app.js").read_text()
existing={w[1].casefold() for w in json.JSONDecoder().raw_decode(app.split("const words=",1)[1])[0]}
rank={w:i for i,w in enumerate(top_n_list("en",10000)) if re.fullmatch("[a-z]+",w)}
found={}
opener=gzip.open if a.dump.endswith(".gz") else open
with opener(a.dump,"rt",encoding="utf-8") as f:
    for line in f:
        d=json.loads(line)
        w=d.get("word","")
        if d.get("lang_code")!="en" or w not in rank or w in existing:
            continue
        if d.get("pos") not in {"noun","verb","adj","adv"}:
            continue
        translations=[]
        for t in d.get("translations",[]):
            v=t.get("word","").strip()
            if t.get("code")=="ru" and re.fullmatch(r"[А-Яа-яЁё -]+",v) and v not in translations:
                translations.append(v)
        if not translations:
            continue
        ipa=next((s["ipa"] for s in d.get("sounds",[]) if s.get("ipa")),"")
        if w not in found:
            found[w]={"word":w,"translations":translations[:8],"pos":d["pos"],"ipa":ipa,"frequency_rank":rank[w],"source":"https://en.wiktionary.org/wiki/"+w,"reviewed":False}
rows=sorted(found.values(),key=lambda x:x["frequency_rank"])[:a.limit]
out=root/"english/dictionary-candidates.json"
out.write_text(json.dumps({"source":"English Wiktionary via Kaikki/Wiktextract","license":"CC BY-SA; see source entry for attribution and applicable terms","entries":rows},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"{len(rows)} candidates saved to {out}; review before publication")
