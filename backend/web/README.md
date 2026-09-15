# RIDNE web marketplace

The web uses the existing RIDNE Supabase project and keeps Telegram identities intact.

- `web_profiles` links a confirmed Supabase Auth identity to a marketplace identity.
- `complete_web_onboarding` is service-only and atomic; its identity/email must come from `auth.getUser`, never request-body identity claims.
- Public clients can only read their own web profile; they cannot edit verification, roles or order totals.
- `ridne-web` independently verifies access tokens for all browser mutations. Gateway `verify_jwt` is disabled because modern JWT signing keys are verified by `auth.getUser` inside the function.
- Products start as drafts. A separate atomic submission reserves one of the existing first 50 launch applications and puts the product in moderation. Blocked categories cannot be submitted.
- Uploaded originals remain private in `ridne-web-products`; moderators must publish an approved image derivative with the product.
- Notifications are queued once per confirmed web profile. Resend uses an idempotency key per notification and a database claim to prevent concurrent duplicate sends.
- Seller and product moderation is available to the verified owner account at `/admin/moderation/`.
- Web and Telegram submissions share one idempotent Telegram moderation queue. `moderation_chat_id` is preferred; the owner's private Telegram chat is the fallback.

## Activation requirements

1. Supabase Auth: set Site URL to `https://ridne.store` and allow redirect `https://ridne.store/account/`.
2. Configure production SMTP for Auth emails. Default Supabase SMTP only serves permitted team addresses and is not a public signup email service.
3. For admin registration notices, configure Edge secrets `RESEND_API_KEY` and `RIDNE_MAIL_FROM` using a verified sending domain. Recipient is fixed to `doctorgebel@gmail.com`.
4. Verify two real email flows: buyer registration and producer registration. Never auto-confirm real user email addresses to bypass setup.
5. Connect the owner to `@ridne_store_bot`, create the private `RIDNE Administration` channel, add the bot as an administrator, then publish the one-time `/connectridneadmin …` command in that channel.

Until these are configured, the UI retains form answers on email errors, and admin notices remain pending. Do not describe email delivery as active without a delivery receipt.

## QA

Database smoke tests must run in a transaction that rolls back all QA identities, profiles, products, notifications and launch counters. Cover duplicate onboarding, buyer/seller separation, one-to-five-category validation, pending seller verification, owner-only profile reads, and one-time launch reservations.

Source `schema.sql` records the intended schema. Applied hosted migrations are named `ridne_web_marketplace_onboarding`, `use_verified_identity_in_web_onboarding`, and `web_product_moderation_submissions`.

The moderation extension is applied as `unified_moderation_administration`.
