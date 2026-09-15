# RIDNE Telegram moderation

`index.ts` is the source of the deployed `ridne-telegram` Supabase Edge Function.

Moderation destinations:

1. `bot_runtime_config.moderation_chat_id` — private RIDNE Administration channel.
2. `bot_runtime_config.admin_telegram_id` — owner private chat fallback.

The owner remains the only account allowed to use inline moderation buttons. A channel is connected with a one-time `telegram_moderation_channel_claim` token and `/connectridneadmin TOKEN` channel post. The webhook must include `channel_post` in `allowed_updates`.
