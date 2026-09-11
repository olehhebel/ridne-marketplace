# RIDNE marketplace backend

The production backend lives in the Supabase project `RIDNE` (`eu-central-1`).

## Telegram Edge Function

Function: `ridne-telegram`

The function implements:

- `/start` / `/menu` buyer-seller navigation
- seller onboarding and verification queue
- product submission wizard
- category risk gates
- product moderation
- approved-product catalog
- structured order requests
- support requests
- optional approved-product publishing to a Telegram channel

## Required secrets before Telegram activation

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BOT_USERNAME`
- `ADMIN_TELEGRAM_ID`
- optional `TELEGRAM_CHANNEL_ID`
- optional `SITE_URL` (defaults to `https://ridne.store`)

Never commit secret values to GitHub.

## Payment state

Online payments are intentionally disabled during the controlled pilot. The database includes orders, payment events, payouts and marketplace-fee fields, but no payment should be represented as successful until a real marketplace payment provider, seller settlement flow, refunds and legal/accounting model have been verified.

## Trust gates

The catalog only exposes approved products from verified sellers. High-risk categories such as meat, dairy, fish and eggs remain blocked until the applicable safety and permit requirements are confirmed.
