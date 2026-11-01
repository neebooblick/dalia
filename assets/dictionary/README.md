# CC-CEDICT in dalia
Source: https://www.mdbg.net/chinese/dictionary?page=cc-cedict
Authors: MDBG and CC-CEDICT editors/contributors; based on CEDICT,
Copyright (C) 1997, 1998 Paul Andrew Denisowski.
Data and adaptations here: Creative Commons Attribution-ShareAlike 4.0 International.
License: https://creativecommons.org/licenses/by-sa/4.0/
Legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode

Changes: conversion to JSON, numbered pinyin converted to tone marks,
sense separators converted to semicolons. No machine translation.
Rows: [simplified, traditional, pinyin, English definitions].
The separate readings index supports audit of the editorial Russian catalog.
These data licences apply to dictionary data, not user study progress.

Update: download the release gzip and run scripts/build-dictionary.py, then
node scripts/audit-dictionary.mjs. Review the diff and audit before publishing.
Existing Russian editorial cards take precedence. No imported data overwrites
localStorage, card identifiers, translations, examples, or study history.
