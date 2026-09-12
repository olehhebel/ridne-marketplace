# RIDNE Project Memory

## 2026-09-11 — Launch monetization decision

- RIDNE will **not monetize the first 50 product-listing applications** submitted through the Telegram bot.
- The launch phase is configuration-driven: `launch_free_listing_limit = 50`, `launch_free_listing_used` tracks accepted applications, and `monetization_mode = launch_free`.
- Applications #1–50 are accepted with `listing_payment_status = free_launch` and go to moderation without payment.
- Application #51 and later must **not** trigger Telegram Stars or any automatic payment flow. New listing submissions should pause and tell the seller that the next placement model is being prepared.
- After the first 50 applications, monetization must be decided separately before enabling paid placement. No payment provider, tariff, price, or bank destination is approved yet.
- The previously implemented Telegram Stars pricing (25 / 75 / 150 Stars) is deprecated for the current launch phase and must not be presented to users.
- Future monetization should be configurable so the payment model can change without rebuilding the seller/product flow.

## Telegram seller UX decision

- The bot must not stop after sharing the Telegram contact or location/oblast.
- After seller contact is confirmed, continue directly into product creation.
- Prefer button-driven input throughout the seller flow: producer type → oblast → product category → product type → unit → price → available quantity → storage → photo/skip → submission.
- Avoid asking sellers to type repetitive structured data when it can be selected with buttons.
- During the launch-free phase, show the remaining free application count where useful.

## Moderation and publication

- Seller verification and product moderation remain required.
- `free_launch`, `paid`, and `legacy` listing states may be eligible for publication, provided the seller is verified, the category is allowed, and the product is approved.
- Free launch applications must never bypass moderation.

## 2026-09-12 — Web marketplace rebuild

- Replace explanatory homepage with discovery, category controls, national location filter, promotional placements and real inventory lookup.
- Five-step onboarding: buyer/seller → up to five categories → oblast/locality → personal/producer details → confirmed email.
- Producer types: craft workshop, farm, family production. Business status is self-declared and never grants verification.
- Email destination confirmed through connected Gmail profile: doctorgebel@gmail.com. Never include passwords or login links in admin notices.
- Demonstration product cards and all 20 animated sample reviews MUST remain visibly labelled as fictional examples and excluded from ratings, Product review schema and checkout.
- Supabase Auth production SMTP/redirect configuration and Resend sender secrets still require activation and delivery verification; see backend/web/README.md.
