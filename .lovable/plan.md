# Implementation Plan

Six related workstreams. I'll ship in this order so each piece can be tested in isolation.

## 1. OneSignal push fix (highest priority — currently broken)

The "Tap to copy URL" message is the Chrome generic notification shown when the OneSignal payload is empty/malformed or the service worker can't decrypt it. Fix:

- Load OneSignal SDK synchronously in `<head>` (drop `defer`) so `OneSignalDeferred` is ready before init.
- Rewrite `OneSignalInit.tsx`: `autoResubscribe: true`, `notifyButton.enable: false`, set `serviceWorkerPath: /OneSignalSDKWorker.js`, set `serviceWorkerParam.scope: /`. Use a custom slidedown for prompt.
- Subscribe via `OneSignal.User.PushSubscription.optIn()` on user accept. Persist `OneSignal.User.PushSubscription.id` to `profiles.onesignal_player_id` on `change` event. Skip prompt when `Notification.permission !== "default"`.
- `onesignal-send` edge function: always send `headings`, `contents`, `url`, `web_url`, `chrome_web_icon` (site logo from settings), `chrome_web_image`, `target_channel: "push"`. Broadcast uses `included_segments: ["All"]`; targeted uses `include_aliases: { external_id: [...] }` falling back to `include_subscription_ids`.
- Add admin "Send test notification" button on Admin → Notifications.

## 2. Sales page templates (6 designs + admin management)

- New `sales_page_templates` table seeded with 6 rows (`key`, `name`, `description`, `enabled`, `is_premium`, `premium_price`, `is_default`, `preview_thumbnail`).
- Add `template_key` column to `sales_pages`.
- New `TemplatePicker` step at top of `SalesPageEditor` showing thumbnail cards (Lagos Bold, Clean Pro, Fire Sale, Premium Gold, Trust Builder, Story Seller). Only enabled templates show.
- `SalesPage.tsx` renders one of 6 template components from `src/components/sales-templates/` — each fully responsive with its own palette/typography.
- AI prompt in `sales-page-generate` tailored to the chosen template tone.
- New admin page `AdminSalesTemplates.tsx`: toggle enabled/premium, set default, preview.

## 3. Featured listing duration fix

- Boost packages already exist via `site_settings.boost_packages`. Seed/replace with 1/3/7/14/30/90 day defaults if missing.
- `BoostBusiness.tsx` already lets users pick a package — verify total-cost confirmation and wallet deduction work (they do).
- Add SQL pg_cron job to (a) expire boosts past `boosted_until` and (b) send "expires in 24h" + "expired" pushes via `onesignal-send`. Add `boost_warning_sent` flag on `suppliers` to avoid duplicate warnings.
- Admin: new "Active Boosts" tab in `AdminBusinesses` with extend/cancel actions.
- Countdown badge on user's business cards in `UserBusinesses`.

## 4. Lead capture

- New `sales_page_leads` table: `id, sales_page_id, user_id (owner), name, phone, email, message, status (new|contacted|converted|rejected), created_at`. RLS so owners/admins manage; anyone can insert.
- `sales_pages.lead_capture_enabled` boolean default true; `site_settings.leads_enabled_global` master toggle.
- Public sales page: prominent "I Am Interested" button → modal form. Hidden when either toggle is off.
- DB trigger sends push to owner on new lead.
- New `UserLeads.tsx` route at `/dashboard/leads`: filter by page, mark status, delete, CSV export, click-to-call/WhatsApp.
- Editor: "Enable Lead Capture" switch (default on).
- Admin: `AdminLeads.tsx` to view/delete/export all leads; master toggle in `AdminSettings`; per-page toggle column in `AdminSalesPages`.

## 5. Sales page analytics

- Reuse existing `sales_page_events` (already records views/clicks). Extend insert to capture `device` (mobile/desktop) and `source` (utm/referrer).
- New `SalesPageAnalytics.tsx` route per page: KPI cards (views all-time/7d/30d with % change arrows), unique visitors, leads count, conversion %, WhatsApp/call/share click totals, line chart views, bar chart leads, donut traffic sources & device split, best day/hour.
- New `SalesPagesOverview.tsx` in user dashboard: totals, top performer, conversion leader, ranked table, combined views line chart, quick action buttons.
- Charts use Recharts with purple brand token; supabase realtime subscription for live updates.

## 6. Admin sales page management

- Rewrite `AdminSalesPages.tsx`: show creator (name/username/email), product, date, views, leads count, status, lead toggle, template. Search + filters (user, date range, status, template). Actions: preview, activate/deactivate, delete, edit (link to editor), per-page lead toggle.

## Technical notes
- Migrations: `sales_page_templates`, `sales_page_leads`, columns on `sales_pages` (`template_key`, `lead_capture_enabled`), column on `suppliers` (`boost_warning_sent`), `site_settings` seeds (`leads_enabled_global`, `boost_packages` defaults, `site_logo_url`), triggers (`notify_lead_received`, `expire_boosts_and_notify`).
- pg_cron hourly job for boost expiry/warnings.
- Charts: install `recharts` (likely already present — confirm).
- All new tables get GRANTs + RLS as required.
- Nothing existing/working is removed; OneSignal init is rewritten in place.

I will start with OneSignal (since it blocks lead/boost pushes), then templates + leads (shared editor changes), then analytics + admin views.