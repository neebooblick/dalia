# Dictionary integration — 2026-11-02

- Added on-demand full CC-CEDICT search (125,346 articles, snapshot 2026-10-31).
- Searches simplified/traditional characters, pinyin with or without tones, and English senses. Existing Russian cards are searched separately and shown first. Russian full-dictionary translation is not supplied.
- Search runs in a worker; no full dictionary transfer on initial page load. Existing service worker caches the dataset after its first request.
- External articles prefill hanzi and pinyin in the existing card editor. Russian meaning and bilingual example are required for a training-ready card. Existing storage keys, study history and backup logic are unchanged.
- Six reviewed pinyin corrections: 宿舍, 抹布, 护发素, 相机, 理发师, 创可贴.
- Added eleven editorial Russian cards with examples, classified outside official HSK.
- Pronunciation audit: assets/dictionary/audit.json. Remaining differences include tone sandhi, neutral tones, and readings requiring review. This is not a completed semantic/HSK audit of all cards.
- FreeDict Russian data was evaluated but rejected: sampled articles included fragmented Russian phrases.
- Updates are explicit, reviewed snapshot releases. No unattended synchronization is enabled.

Validation: node tests/dictionary.cjs; syntax checks; browser search → add completed card → reload → retained card and no automatic learned mark.
