# RIDNE Auth email production settings

These templates are the source of truth for hosted Supabase Auth email branding.

## Required URL configuration

- Site URL: `https://ridne.store`
- Allowed redirect URL: `https://ridne.store/account/`

The browser already requests `https://ridne.store/account/` through `emailRedirectTo`. If Supabase does not allow that redirect, it falls back to the configured Site URL. Never use localhost in production.

## Required sender configuration

Use custom SMTP from a verified `ridne.store` sending domain.

- Sender display name: `РІДНЕ`
- Preferred sender: `noreply@ridne.store` (only after the domain is verified by the SMTP provider)

Do not describe production public email delivery as active until a real external mailbox receives and opens both flows successfully.

## Hosted templates

### Confirm signup
- Subject: `Підтвердіть email — РІДНЕ`
- Body: `confirm-signup.html`

### Magic link / sign in
- Subject: `Вхід до РІДНЕ`
- Body: `magic-link.html`

Both templates intentionally use `{{ .ConfirmationURL }}` so Supabase signs and verifies the token. The redirect target is controlled by the application `emailRedirectTo` plus the Supabase allow list.
