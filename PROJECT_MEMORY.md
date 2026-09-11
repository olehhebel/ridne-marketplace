# RIDNE Project Memory

## 2026-09-11 — Telegram bot monetization decision

- Product listings submitted through the RIDNE Telegram bot are **not free**.
- Monetization must be built directly into the seller/product onboarding flow before a listing can be published.
- A seller may create a product draft while seller verification is still pending, but publication requires both seller verification and successful listing payment.
- Because paid listing placement is a digital service delivered inside Telegram, in-bot payment must use **Telegram Stars (XTR)**.
- Initial configurable listing tiers:
  - `basic` — 25 Stars / 30 days.
  - `boost` — 75 Stars / 30 days, higher catalog priority.
  - `top` — 150 Stars / 30 days, highest catalog priority.
- Pricing must remain configuration-driven so it can be changed without rewriting the bot logic.
- Telegram payment support must handle `pre_checkout_query`, `successful_payment`, payment charge IDs, and `/paysupport`.
- New unpaid listings must never appear in the public marketplace catalog.

## Telegram seller UX decision

- The bot should not stop after sharing Telegram contact/location.
- After seller contact is shared, continue directly into product creation.
- Prefer button-driven input throughout the seller flow: producer type → oblast → product category → product type → unit → price → available quantity → storage → photo/skip → listing tariff → Telegram Stars payment.
- Avoid asking sellers to type repetitive structured data when it can be selected with buttons.
