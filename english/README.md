# dalia — English edition (pilot)

Separate English-language learning experience at /english/. The Chinese site at / is unchanged.

- 257 hand-curated English–Russian vocabulary items: A1 (76), A2 (76), B1 (40), B2 (35), C1 (20), C2 (10).
- Full word search in English and Russian, CEFR-like approximate level filters, favorites and learned words.
- Browser-based English speech synthesis; listening questions require a user press and actual speech start before allowing answers.
- Three practice modes: English→Russian multiple-choice; Russian→English typed answer; listening recognition.
- Spaced progress: three successful answers on different days, minimum gaps of 1 and 3 days; also manual "Изучить" action. Wrong answers reduce automatic progress.
- Backup export/import uses an app-specific format and localStorage key dalia_english_state_v1. **Never** reads or changes dalia_state_v7 from the Chinese site.
- Standalone HTML/CSS/JS, no account or paid tier, no third-party runtime dependency.
- Initial pilot: CEFR tags are editorial estimates, not official certification. Browser voice quality varies by device. No offline service worker is registered for this edition.
- Test via: node tests/english-e2e.mjs (requires playwright-core and Chromium). GitHub Actions run on PRs and changes to this edition.

Future extensions: richer vocabulary/usage senses, professionally verified IPA, grammar & phrasal verbs, editing corrections, full WebKit & real-device testing.
