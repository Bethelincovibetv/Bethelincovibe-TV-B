# Bethelincovibe TV — Complete Technical & Business Documentation

> Generated from the actual codebase and live backend schema. Everything below reflects what is
> implemented today. Where a feature is partial, it is explicitly marked **PARTIAL** or **MISSING**.

---

## 1. Project Overview

**Project name:** Bethelincovibe TV (app title: "Bethelincovibe TV" — Nigerian business media + tools platform).

**Purpose:** A hybrid business media platform and SME toolkit for Nigerian (primarily Lagos)
entrepreneurs. It combines:
- an AI-assisted blog/news magazine,
- a business/product directory,
- monetisation tools for small businesses (sales page generator, ads, boosts, leads),
- an internal wallet economy (credits in Naira, ₦),
- community (forum), learning (courses), and an AI business coach.

**Target audience:**
- Nigerian small/medium business owners and solo entrepreneurs (primary).
- Consumers searching for local businesses/products (secondary, directory traffic).
- Advertisers/affiliates (tertiary; both internal ad buyers and external developers via the ad API).

**Business model (all revenue paths implemented in code):**
1. **Wallet credits** — users top up via Paystack (`paystack-init` / `paystack-verify`), then spend
   credits inside the platform.
2. **Business Boost** — paid featured placement for a business listing for N days (`activate_business_boost`).
3. **Guest/business blog submissions** — paid AI-written promotional article (`business_blog_fee`).
4. **Sales Page Generator** — paid per page (`sales_page_price`, with optional `sales_page_first_free`).
5. **Self-serve ads** — users buy ad slots priced at `ad_cost_per_day`; admin approves/rejects (refund on reject).
6. **Third-party ad networks** — AdSense, Adsterra, Monetag, Start.io head/body code injected site-wide.
7. **Amazon affiliate** — product feed with auto-appended affiliate tag.
8. **Paid courses** — Learning Hub enrolments deducted from wallet (`enroll_in_course`).
9. **External ad network API** — developer API keys (`ad_api_keys`) let 3rd-party sites embed our ads.

**Cost/engagement side (credits spent by the platform):**
- Daily login reward (`daily_login_credits`), referral signup bonus, referral purchase %,
  and ad-click rewards (`ad_click_reward_naira`) paid to users for clicking ads.

**Core features:** blog + AI autoblogger, business/product directory, wallet, referrals, forum,
learning hub, AI coach (chat + live voice/video), inventory manager, sales page generator + leads +
analytics, ad platform (internal + external API), push notifications (OneSignal), PWA, admin suite,
feature-flag system, SEO/OG prerendering, RSS + sitemap.

**Current development status:** Production-leaning MVP+, actively iterated. All listed features
have working implementations. Known rough edges are listed in §14.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18.3 + TypeScript 5.8, Vite 5.4 (`@vitejs/plugin-react-swc`) |
| Routing | react-router-dom 6.30 (BrowserRouter) |
| Styling | Tailwind CSS 3.4 + `tailwindcss-animate` + `@tailwindcss/typography`, shadcn/ui (Radix primitives) |
| State/server cache | @tanstack/react-query 5, React Context (Auth, FeatureFlags), local component state |
| Backend | Lovable Cloud (Supabase): Postgres + PostgREST Data API + Deno Edge Functions |
| Database | Postgres (Supabase managed), `pg_cron` + `pg_net` extensions used |
| Auth | Supabase Auth (email + password), roles in `user_roles` w/ `has_role()` SECURITY DEFINER |
| Storage | Supabase Storage — 9 public buckets (see §11) |
| Hosting | Vercel (SPA + crawler rewrites in `vercel.json`); Lovable preview/publish |
| Charts | recharts 2.15 |
| Editor | TipTap 3 (`RichTextEditor`) |
| PDF/eBook | jsPDF 4 (+ html2canvas available) |
| Misc libs | zod, react-hook-form + @hookform/resolvers, date-fns, sonner (toasts), lucide-react, embla-carousel, cmdk, vaul, canvas-confetti, next-themes |
| Testing | vitest 3 + @testing-library/react + jsdom; Playwright 1.57 configured |

**APIs / third-party integrations**
- **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) via `supabase/functions/_shared/ai.ts` — used by AI blogger, business coach, inventory insights, sales page copy, startup calculator.
- **Google Gemini** — `GEMINI_API_KEY`; Gemini Live API ephemeral tokens (`gemini-live-token`) for the live voice/video coach; Gemini 2.5 Flash for sales copy.
- **Pexels API** — stock imagery (`sales-page-pexels`, AI blogger cover picker).
- **OneSignal** — web push (`onesignal-send` + `public/OneSignalSDKWorker.js` + `OneSignalInit`).
- **Paystack** — wallet top-ups (`paystack-init`, `paystack-verify`).
- **Google News RSS** — real-time headline sourcing for the autoblogger.
- **YouTube** — oEmbed + search scraping for autoblog video matching; embeds in courses/TV/sales pages.
- **Google Analytics** (`ga_measurement_id`), **Google AdSense**, **Adsterra**, **Monetag**, **Start.io**, **Amazon Associates**.
- **Web Push (VAPID)** — legacy `send-push` / `notify-new-posts` path, superseded by OneSignal.

**Deployment process**
1. Frontend builds with `vite build`; deployed by Lovable publish and/or Vercel.
2. `vercel.json` rewrites: crawler user-agents on `/`, `/blog/:slug`, `/businesses/:slug`, `/u/:username`,
   `/sales/:slug` → `og-prerender` edge function; `/sitemap.xml` → `sitemap`; `/rss.xml` and `/feed` → `rss`;
   everything else → `/index.html` (SPA fallback, no 404 on refresh).
3. Edge functions deploy automatically with the project (`supabase/config.toml` holds only `project_id`;
   no per-function `verify_jwt` overrides are declared).
4. Database changes ship as SQL migrations under `supabase/migrations/`.

---

## 3. Database

Postgres, schema `public`. All tables have RLS enabled. Standard columns `id uuid pk default gen_random_uuid()`,
`created_at timestamptz not null default now()`, and where noted `updated_at` maintained by the
`update_updated_at_column()` trigger.

### 3.1 Tables

**profiles** — one row per auth user (created by `handle_new_user`).
Columns: `id`, `user_id uuid → auth.users`, `email`, `display_name`, `username` (unique-ish, generated by
`generate_username`), `avatar_url`, `bio`, `whatsapp`, `social_links jsonb`, `is_public bool`,
`services jsonb`, `background_url`, `background_template`, `referral_code` (unique 8-char),
`referred_by uuid`, `onesignal_player_id`, `created_at`, `updated_at`.
RLS: 5 policies; public read of public profiles, self-update; DELETE denied.

**user_roles** — `id`, `user_id → auth.users`, `role app_role` (`admin|moderator|user`), unique(user_id, role).
Read by `has_role()`; UPDATE denied. **Never store roles on profiles.**

**wallets** — `id`, `user_id` (unique), `balance numeric`, `currency text` (NGN), timestamps.
**wallet_transactions** — `id`, `user_id`, `amount numeric` (signed), `type text`
(`topup|deduct|daily_reward|referral_signup|referral_purchase|ad_click_reward|transfer_in|transfer_out|admin_credit|admin_debit`),
`description`, `reference_id uuid`, `created_at`. Trigger `notify_wallet_transaction_change` fires a
notification + push on every row.

**daily_reward_claims** — `user_id`, `claim_date date`, `amount`; unique per user/day. INSERT/UPDATE/DELETE denied to clients (written by `claim_daily_reward`).

**referrals** — `referrer_id`, `referred_user_id` (unique), `signup_bonus_amount`, `purchase_bonus_total`, `purchase_credited bool`.

**categories** — `name`, `slug`, `description`, `type text` (`blog` | `business`), timestamps. Used by blog and directory.

**blog_posts** — `title`, `slug`, `content` (HTML), `excerpt`, `featured_image`, `category_id → categories`,
`author_id → auth.users`, `published bool`, `published_at`, `push_notified bool`, `is_featured bool`, timestamps.
RLS: published posts public; admin full CRUD. Trigger `notify_blog_post_published` → OneSignal broadcast.

**blog_comments** — `post_id → blog_posts`, `user_id`, `content`, `rating int`, timestamps. Public read; author/admin delete.

**favorites** — `user_id`, `post_id → blog_posts`. Own-row CRUD; UPDATE denied.

**autoblog_schedule** — `enabled`, `interval_hours`, `keywords`, `category_id`, `last_run_at`, `mode`,
`posts_per_run`, `auto_approve`. Admin-only.
**autoblog_categories** — join table `schedule_id → autoblog_schedule`, `category_id`.

**suppliers** (the *business* listing table) — `name`, `slug`, `category_id → categories`, `description`,
`phone`, `address`, `website`, `logo_url`, `cover_url`, `cover_template`, `social_links jsonb`,
`services jsonb`, `featured bool`, `active bool`, `submitted_by uuid`, `status text`
(`pending|approved|rejected`), `rejection_reason`, `boosted_until timestamptz`, `boost_warning_sent bool`, timestamps.
Triggers: `suppliers_auto_approve` (honours `feature_business_auto_approve`), `notify_supplier_approved` (push).
RLS: 6 policies — approved+active public, owner CRUD on own, admin full.

**supplier_images** — gallery for a supplier: `supplier_id`, `image_url`, `caption`, `display_order`.

**directory_products** — the *simple product* listing style: `user_id`, `name`, `slug`, `description`,
`price`, `currency`, `condition`, `stock`, `location`, `whatsapp`, `phone`, `category_id`, `images jsonb`,
`cover_image`, `views_count`, `active`, `featured`, timestamps.

**business_boosts** — `business_id → suppliers`, `user_id`, `package_key`, `duration_days`, `amount`,
`status` (`active|expired`), `starts_at`, `ends_at`.

**business_events** — analytics for listings: `business_id`, `type` (view/click/etc), `visitor_hash`, `referrer`.
**business_messages** — inbound inquiries: `business_id`, `service_title`, `sender_user_id`, `sender_name`,
`sender_email`, `sender_phone`, `message`, `is_read`. Trigger `notify_business_message_received`.

**guest_blog_submissions** — paid promo article requests: `user_id`, `business_name`, `description`,
`banner_url`, `website`, `contact_*`, `category_id`, `status`
(`pending_payment|paid|generating|review|approved|published|rejected`), `cost_credits`,
`generated_post_id`, `rejection_reason`, `admin_notes`.
**guest_submission_photos** — `submission_id`, `image_url`, `caption`, `display_order`.

**sales_pages** — `user_id`, `business_id`, `slug` (unique public URL), `product_name`,
`product_description`, `price`, `currency`, `contact_whatsapp|phone|email`, `product_image_url`,
`image_source`, `headline`, `subheadline`, `problem`, `solution`, `benefits jsonb`, `social_proof jsonb`,
`urgency`, `cta_text`, `seo_title`, `seo_description`, `og_image_url`, `countdown_ends_at`,
`views_count`, `clicks_count`, `active`, `status`, `youtube_video_url`, `gallery_image_urls jsonb`,
`template_key`, `lead_capture_enabled`, timestamps.
**sales_page_events** — `sales_page_id`, `type` (`view|click|...`), `visitor_hash`, `referrer`, `device`, `source`.
Trigger `notify_sales_page_viewed`.
**sales_page_leads** — `sales_page_id`, `user_id` (owner), `name`, `phone`, `email`, `message`, `status`, timestamps.
Trigger `notify_sales_page_lead` → in-app + push.
**sales_page_templates** — `key`, `name`, `description`, `enabled`, `is_premium`, `premium_price`,
`is_default`, `preview_thumbnail`, `accent_color`, `display_order`.

**user_ads** — `user_id`, `title`, `description`, `image_url`, `target_url`, `duration_days`,
`cost_amount`, `status` (`pending|active|rejected`), `ggd_ad_id`, `ggd_response jsonb`,
`rejection_reason`, `starts_at`, `ends_at`, `approved_at`, `approved_by`, `impressions bigint`,
`clicks bigint`, `source`, `external_origin`, `placement`.
Trigger `notify_ad_status_change`.
**ad_events** — `ad_id → user_ads`, `event_type`, `page_path`, `referrer`, `origin`, `user_agent`.
**ad_click_earnings** — reward ledger: `user_id`, `amount`, `page_path`, `ad_slot`.
**ad_api_keys** — external developer keys: `label`, `key_prefix`, `key_hash` (sha256), `scopes jsonb`,
`active`, `created_by`, `last_used_at`.

**forum_posts** — `user_id`, `kind` (`question|discussion`), `category`, `title`, `content`,
`replies_count`, `likes_count`, timestamps. Trigger `notify_forum_post_created`.
**forum_replies** — `post_id`, `user_id`, `content`, `likes_count`. Triggers `forum_reply_count_trg`,
`notify_forum_reply_received`.
**forum_votes** — `user_id`, `target_type` (`post|reply`), `target_id`. Trigger `forum_vote_count_trg`.

**courses** — `title`, `description`, `thumbnail_url`, `video_url`, `youtube_url`, `instructor_name`,
`category`, `price_naira`, `duration_minutes`, `published`, `display_order`, `created_by`.
**course_enrollments** — `course_id`, `user_id`, `amount_paid`.

**inventory_products** — `user_id`, `name`, `sku`, `stock`, `cost_price`, `sell_price`, `low_stock_threshold`.
**inventory_customers** — `user_id`, `name`, `phone`, `whatsapp`, `email`, `notes`.
**inventory_sales** — `user_id`, `product_id`, `customer_id`, `qty`, `unit_price`, `total`, `note`, `sold_at`.
Trigger `decrement_stock_on_sale`.
**inventory_expenses** — `user_id`, `category`, `amount`, `note`, `spent_at`.
All four: strict `user_id = auth.uid()` single ALL policy.

**coach_conversations** — `user_id`, `title`, `business_context jsonb`.
**coach_messages** — `conversation_id`, `role`, `content`.
**coach_tasks** — `user_id`, `conversation_id`, `title`, `notes`, `status`, `progress int`.

**user_notifications** — in-app bell feed: `user_id`, `title`, `body`, `url`, `type`, `is_read`.
**push_notifications** — admin broadcast log: `title`, `body`, `url`, `sent_at`, `sent_by`, `recipient_count`.
Trigger `fanout_push_notification` inserts a `user_notifications` row for every profile.
**push_subscriptions** — legacy VAPID web-push endpoints: `user_id`, `endpoint`, `p256dh`, `auth`.

**site_settings** — global key/value config (see §3.5 for the live key list). Admin write; public read.
**site_jingles** — `title`, `audio_url`, `volume`, `active`. Trigger `jingles_single_active` enforces one active.
**hero_slides** — `title`, `subtitle`, `image_url`, `link_url`, `link_text`, `display_order`, `active`.
**tv_videos** — `title`, `youtube_url`, `description`, `placement`, `display_order`, `active`.
**custom_code_injections** — `name`, `route_pattern`, `location` (head/body), `code`, `active`, `display_order`.
**amazon_products** — `asin` (unique), `title`, `image_url`, `price`, `description`, `category`,
`marketplace`, `active`, `display_order`.
**affiliate_links** — `label`, `url`, `keywords text[]`, `description`, `active`.
**contact_submissions** — `name`, `email`, `subject`, `message`, `read`.
**email_subscribers** — `email`, `subscribed_at`, `active`, `unsubscribe_token uuid`.

### 3.2 Relationships (FKs actually declared)
`ad_events.ad_id → user_ads.id`; `autoblog_categories.schedule_id → autoblog_schedule.id`;
`autoblog_schedule.category_id → categories.id`; `blog_comments.post_id → blog_posts.id`;
`blog_posts.author_id → auth.users.id`, `blog_posts.category_id → categories.id`;
`business_boosts.business_id → suppliers.id`; `business_events.business_id → suppliers.id`;
`coach_messages.conversation_id → coach_conversations.id`; `coach_tasks.conversation_id → coach_conversations.id`;
`directory_products.category_id → categories.id`; `favorites.post_id → blog_posts.id`;
`guest_submission_photos.submission_id → guest_blog_submissions.id`;
`inventory_sales.product_id → inventory_products.id`, `.customer_id → inventory_customers.id`;
`profiles.user_id → auth.users.id`; `push_notifications.sent_by → auth.users.id`;
`push_subscriptions.user_id → auth.users.id`; `supplier_images.supplier_id → suppliers.id`;
`suppliers.category_id → categories.id`; `user_roles.user_id → auth.users.id`.

Several logical relations are intentionally **not** FK-constrained (e.g. `sales_pages.user_id`,
`business_messages.business_id`, `forum_replies.post_id`) — client code joins these manually
(`AdminSalesPages` fetches owner profiles in a second query for this exact reason).

### 3.3 RLS policy patterns
- **Public content** (`blog_posts`, `suppliers`, `amazon_products`, `hero_slides`, `tv_videos`,
  `courses`, `sales_pages`, `directory_products`, `affiliate_links`): `SELECT` allowed when
  `published/active/approved = true`, `OR has_role(auth.uid(),'admin')`.
- **Own-row tables** (`inventory_*`, `coach_*`, `favorites`, `user_notifications`, `wallets`,
  `wallet_transactions`, `sales_pages`, `user_ads`, `guest_blog_submissions`): `auth.uid() = user_id`.
- **Admin-only tables** (`ad_api_keys`, `autoblog_schedule`, `push_notifications`, `site_settings` writes,
  `custom_code_injections`, `contact_submissions` reads): `has_role(auth.uid(),'admin')`.
- **Append-only analytics** (`ad_events`, `business_events`, `sales_page_events`): anonymous INSERT
  allowed, UPDATE/DELETE denied, SELECT restricted to owner/admin.
- **Ledger tables** (`daily_reward_claims`): all client writes denied; only SECURITY DEFINER functions write.

### 3.4 Triggers (live)
`update_updated_at_column` on: affiliate_links, amazon_products, autoblog_schedule, blog_comments,
blog_posts, categories, coach_conversations, coach_tasks, courses, custom_code_injections,
directory_products, guest_blog_submissions, hero_slides, inventory_products, profiles,
sales_page_leads, sales_page_templates, sales_pages, site_jingles, site_settings, suppliers,
tv_videos, user_ads, wallets.

Business triggers: `trg_notify_blog_post_published`, `trg_notify_business_message_received`,
`trg_notify_forum_post_created`, `forum_replies_count`, `trg_notify_forum_reply_received`,
`forum_votes_count`, `trg_decrement_stock_on_sale`, `trg_fanout_push_notification`,
`trg_notify_sales_page_viewed`, `trg_notify_lead`, `trg_jingles_single_active`,
`trg_notify_supplier_approved`, `trg_suppliers_auto_approve`, `trg_notify_ad_status`,
`trg_notify_wallet_transaction_change`.

### 3.5 Database functions (SECURITY DEFINER unless noted)
| Function | Purpose |
|---|---|
| `has_role(uuid, app_role)` | Role check used by every admin policy. Stable, definer, avoids RLS recursion. |
| `handle_new_user()` | On auth signup: generates referral code + username, creates `profiles` + `wallets`, grants admin to two hard-coded emails, records referral & pays signup bonus. |
| `generate_username(email)` | Unique slug from email local-part. |
| `is_feature_enabled(key)` | Reads `site_settings.feature_<key>`; defaults true. |
| `topup_wallet` / `deduct_wallet` | Credit/debit with ledger row; `deduct_wallet` locks the row and returns false on insufficient funds. |
| `admin_adjust_wallet` | Admin manual credit/debit. |
| `transfer_wallet(email, amount, note)` | P2P transfer, min ₦100 / max ₦500,000, notifies recipient. |
| `claim_daily_reward(user)` | One claim per UTC day, amount from `daily_login_credits`. |
| `credit_ad_click(page, slot)` | Pays `ad_click_reward_naira` with `ad_click_cooldown_seconds` throttle. |
| `credit_referral_purchase(user, amount)` | Pays referrer `referral_purchase_pct` once. |
| `activate_business_boost(...)` | Feature-gated, ownership-checked, wallet-charged; extends `boosted_until` and sets `featured`. |
| `expire_business_boosts()` | Hourly cron: 24h warning push + expiry push, unsets featured, marks boosts expired. |
| `create_sales_page(payload jsonb)` | Charges `sales_page_price` unless first page and `sales_page_first_free`; builds slug; inserts row. |
| `enroll_in_course(course_id)` | Charges wallet if priced, prevents double enrolment. |
| `approve_user_ad` / `reject_user_ad` | Admin-only; approve sets active window, reject refunds wallet. |
| `record_ad_click(ad_id)` | Increments clicks, returns target URL (used by `ad-click` redirect). |
| `serve_random_ad(placement)` | Returns one eligible active ad, increments impressions. |
| `verify_ad_api_key(key)` | SHA-256 hash lookup for external API auth. |
| `broadcast_notification(title, body, url)` | Admin fan-out of in-app notifications; returns count. |
| `send_push_via_onesignal` / `send_push_to_user_via_onesignal` | `pg_net` POST to the `onesignal-send` function (broadcast / targeted). Swallow errors. |
| `lookup_user_by_email(email)` | Auth-required user lookup for wallet transfers. |
| `suppliers_auto_approve`, `jingles_single_active`, `decrement_stock_on_sale`, `forum_*_trg`, `notify_*` | Trigger bodies described in §3.4. |

**Views:** none defined.
**Indexes:** primary keys on every table plus unique constraints on `profiles.username`,
`profiles.referral_code`, `wallets.user_id`, `daily_reward_claims(user_id, claim_date)`,
`referrals.referred_user_id`, `amazon_products.asin`, `user_roles(user_id, role)`, and slug columns
(`blog_posts.slug`, `suppliers.slug`, `sales_pages.slug`). No extra performance indexes are declared —
see §14.

### 3.6 Cron jobs (`pg_cron`)
- `expire-business-boosts-hourly` — `0 * * * *` → `SELECT public.expire_business_boosts();`
- `auto-blog-scheduler-every-15min` — `*/15 * * * *` → `net.http_post` to the `auto-blog-scheduler` edge
  function (`{async:true}`); each schedule row still enforces its own `interval_hours`.

### 3.7 site_settings keys (live)
`ad_auto_approve`, `ad_click_cooldown_seconds`, `ad_click_reward_naira`, `ad_cost_per_day`, `ad_footer`,
`ad_header`, `ad_in_article`, `ad_rotation_style`, `ad_watermark_text`, `adsense_body`, `adsense_head`,
`adsterra_body`, `adsterra_head`, `adsterra_show_blog_top`, `adsterra_show_directory`,
`adsterra_show_forum`, `adsterra_show_home_bottom`, `adsterra_show_home_top`, `adsterra_show_learn`,
`adsterra_show_sales_directory`, `ai_cover_image_enabled`, `ai_interactive_ads_enabled`, `ai_provider`,
`boost_packages` (JSON array of {key,label,days,price}), `business_blog_fee`, `directory_listing_style`
(`product` | `business`), `feature_*` flags, `ga_measurement_id`, `gemini_api_key`,
`leads_enabled_global`, `monetag_head`, `notification_template`, `onesignal_app_id`,
`onesignal_custom_message`, `onesignal_enabled`, `onesignal_prompt_style`, `paystack_public_key`,
`paystack_secret_key`, `referral_signup_bonus`, `sales_page_first_free`, `sales_page_price`,
`site_logo_url`, `social_facebook|instagram|linkedin|pinterest|reddit|snapchat|telegram|threads|tiktok|whatsapp|x|youtube`,
`startio_body`, `whatsapp_community_url`.
Also read by code but not yet seeded: `daily_login_credits`, `referral_purchase_pct`.

> ⚠️ `paystack_secret_key` and `gemini_api_key` are currently stored as rows in `site_settings`, which is
> publicly readable. See §14 / §12.

---

## 4. Authentication & User Roles

**Provider:** Supabase Auth, email + password only. No social providers are configured today.

**Registration flow** (`/register`, `src/pages/Register.tsx` → `AuthContext.signUp`)
1. `supabase.auth.signUp({ email, password, options: { data: { display_name, referred_by_code? }, emailRedirectTo: window.location.origin } })`.
2. `handle_new_user()` trigger creates the `profiles` row (username generated from the email),
   the `wallets` row at 0, a unique `referral_code`, links `referred_by` if an invite code was passed,
   grants `admin` when the email is `bethelgoodgift3@gmail.com` or `bethelincovibetv@gmail.com`,
   and pays the referrer `referral_signup_bonus` (ledger + notification).
3. The whole `/register` route is behind the `register` feature flag.

**Login flow** (`/login`) — `signInWithPassword`. Session persists in `localStorage`
(`src/integrations/supabase/client.ts`, `autoRefreshToken: true`).

**Email verification** — controlled by Supabase project auth settings; the app supplies
`emailRedirectTo` back to the site origin. No custom verification UI.

**Password reset** — `/forgot-password` calls `resetPasswordForEmail` with
`redirectTo: ${origin}/reset-password`; `/reset-password` sets the new password.

**Session/state** — `AuthContext` subscribes to `onAuthStateChange`, keeps `user`, `session`,
`loading`, `isAdmin`, `roleChecked`. Admin lookup is deferred with `setTimeout(...,0)` to avoid
deadlocking inside the auth callback.

**Roles** — enum `app_role`: `admin`, `moderator`, `user`. Stored only in `user_roles`.
`moderator` exists in the enum but has **no policies** using it yet (**PARTIAL**).

**Permissions matrix**
| Actor | Can |
|---|---|
| Anonymous | Browse blog, directory, product/business profiles, public sales pages, `/sales`, forum (read), learn (read), public profiles; submit contact form; subscribe email; trigger analytics events. |
| Authenticated | Everything anonymous + wallet, top-ups, transfers, listings, sales pages, leads, ads, forum posting/voting, comments, favourites, courses, inventory, coach, referrals. |
| Admin | All of the above + every `/admin` route, moderation, settings, feature flags, wallet adjustments, ad approval, broadcast push. |

**Access control mechanics** — Route level: `ProtectedAdminRoute` (renders spinner until
`roleChecked`, redirects anonymous to `/login` and non-admins to `/`) and `FeatureGate`
(redirects to `/` when the flag is off). Data level: RLS on every table. Function level:
SECURITY DEFINER RPCs re-check `auth.uid()` / `has_role`.

---

## 5. Platform Features (detailed)

### 5.1 Blog + AI Autoblogger
- **Public:** `/blog` (list, category filter via `/blog/category/:slug`, search), `/blog/:slug`.
  Post page renders TipTap HTML, `BlogReader` (browser `speechSynthesis` TTS + jsPDF eBook export with
  clickable back-links), `BlogShareButtons`, `BlogComments`, `RelatedPosts`, `FavoriteButton`,
  `AdsterraAd` above/below content, `RotatingBlogAd`, `BlogInlineInjections`, `AmazonProductGrid`.
- **Admin:** `/admin/posts` (TipTap editor, image upload to `blog-images`, publish toggle, featured flag),
  `/admin/blog-categories`, `/admin/blog-analytics`.
- **AI Blogger** (`/admin/ai-blogger` + `ai-blogger` function): fetches real Nigerian headlines from
  Google News RSS (last 7 days), optionally scoped to an admin-selected category via `CATEGORY_HINTS`;
  drafts the article through the Lovable AI Gateway; picks a Pexels cover with multi-query alt-text
  scoring; composes an SVG "magazine cover" overlay (base64-embedded photo, gradient scrim, brand chip,
  auto-sized title) uploaded to `blog-images`; finds a matching YouTube video via multi-query search +
  oEmbed verification + keyword scoring; inserts a `blog_posts` row (draft or auto-published).
- **Scheduling:** `autoblog_schedule` rows (`interval_hours`, `posts_per_run`, `mode`, `auto_approve`,
  category set) executed by the 15-minute cron → `auto-blog-scheduler`.
- **Distribution:** publish trigger → OneSignal broadcast; `rss` + `sitemap` functions; `og-prerender` for crawlers.

### 5.2 Business / Product Directory
Dual-mode, switched by `site_settings.directory_listing_style` and `useListingStyle()`:
- `product` (default) → `ProductDirectory` + `ListProduct` + `/products/:slug` (`directory_products`).
- `business` → `BusinessDirectory` + `ListBusiness` + `/businesses/:slug` (`suppliers`).
`/businesses` and `/businesses/list` route through `DirectoryRouter` / `ListingFormRouter` so only the
selected style is exposed. Category cards use custom flat SVG icons from `src/lib/categoryIcons.tsx`
(18 category-specific white glyphs on purple gradients) and link to `/businesses/category/:slug`
(businesses + related blog posts + "List Your Business Here" CTA).
Submissions land as `pending` unless `feature_business_auto_approve` is on. Owners manage listings at
`/dashboard/businesses`, edit at `/dashboard/businesses/:id/edit`, boost at `.../boost`.
Visitors message owners via `BusinessChatDialog` → `business_messages` → owner push + `/dashboard/messages`.

### 5.3 Wallet, Referrals & Rewards
Top-up: `paystack-init` (creates transaction, returns authorization URL) → user pays → `paystack-verify`
(server-side verify, `topup_wallet`, optional `credit_referral_purchase`). Spending goes through
`deduct_wallet` inside each feature RPC. P2P `transfer_wallet` via `TransferDialog`.
`DailyRewardClaim` calls `claim_daily_reward`. `AdClickTracker` + `credit_ad_click` pay for ad clicks
(with cooldown) and are surfaced at `/dashboard/ad-earnings` (flag `ad_earnings`).
`ReferralCard` shows the code/link; bonuses handled in `handle_new_user` and `credit_referral_purchase`.

### 5.4 Sales Page Generator
Editor `/dashboard/sales-pages/new|/:id/edit`: product details, `PhoneInput` (40 country codes, default
Nigeria) for WhatsApp/phone, image upload to `sales-pages` bucket or Pexels search
(`sales-page-pexels`), multi-image gallery, YouTube URL, AI copy via `sales-page-generate`
(Gemini 2.5 Flash, "40-year Nigerian copywriter" voice) producing headline/subheadline/problem/solution/
benefits/social proof/urgency/CTA/SEO, countdown, template choice, active toggle, lead-capture toggle.
Saving a new page calls `create_sales_page` (charges wallet unless first-free).
Public page `/sales/:slug` renders through `SalesPageTemplate` (Classic default + Lagos Bold, Clean Pro,
Fire Sale, Premium Gold, Trust Builder, Story Seller), mobile-first with sticky WhatsApp/Call/Email CTA,
`LeadCaptureModal`, countdown, gallery and video. Every view/click writes `sales_page_events`.
Owner analytics `/dashboard/sales-pages/:id/analytics` (recharts: time series, source pie, device split,
click breakdown, recent leads). Leads at `/dashboard/leads` (status changes, CSV export).
Public marketplace at `/sales`. Admin: `/admin/sales-pages`, `/admin/sales-templates`, `/admin/leads`,
plus `leads_enabled_global` master switch.

### 5.5 Advertising
- **Internal ads:** `/dashboard/ads` create ad (image → `ad-creatives`, target URL, duration, placement),
  wallet charged at `ad_cost_per_day`; admin approves (`approve_user_ad`) or rejects with refund
  (`reject_user_ad`); analytics `/dashboard/ads/:id/analytics`. Serving via `serve_random_ad` /
  `ad-server`; clicks via `ad-click` (logs + 302).
- **External network:** admin mints developer keys (`admin-create-ad-key`, plaintext shown once);
  third-party sites embed `ad-embed` JS or call `ad-server`; they can submit ads with
  `external-submit-ad` (land as pending).
- **Networks:** `AdSenseLoader`, `AdsterraLoader` + `AdsterraAd` (sandboxed iframe because Adsterra's
  `invoke.js` uses `document.write`), `ThirdPartyAdLoader` (Monetag head cached in `localStorage` and
  re-injected on first paint for verification, plus Start.io), per-page Adsterra placement switches.
- **Amazon affiliate:** `/admin/amazon` manages products with CSV/ASIN bulk import (upsert on `asin`);
  `AmazonProductGrid` renders on the homepage and blog posts with the affiliate tag auto-appended and an
  FTC disclosure.

### 5.6 Community Forum
`/forum` — Q&A and Discussions, categories (🚀 Starting a Business, 📣 Marketing & Sales,
📋 Business Listings, 💰 Funding & Finance, 💬 General), search, Recent/Popular sorting.
`/forum/:id` — threaded replies, likes via `forum_votes` (counts maintained by triggers), success sound.
Browsing is public; posting requires login. New posts broadcast a push; replies notify the post owner.

### 5.7 Learning Hub
`/learn` — published `courses` grid with **Enroll & Watch** / **Enroll for ₦…** / **Watch** buttons
calling `enroll_in_course` (wallet charge for priced courses), YouTube/direct video playback, share
button (Web Share API with clipboard fallback), gated by the `learn` flag. Admin CRUD at `/admin/courses`
(thumbnails → `course-thumbnails`, videos → `course-videos`).

### 5.8 AI Business Coach
`/dashboard/coach` — chat backed by `business-coach` (Lovable AI Gateway, Lagos SME consultant system
prompt), persisted in `coach_conversations` / `coach_messages`, action items in `coach_tasks`.
`ListenButton` and `LiveVoiceButton` use browser `speechSynthesis` + `SpeechRecognition` (free).
"Go Live" opens `GeminiLiveDialog` — mic + camera bidirectional session using an ephemeral token from
`gemini-live-token`.

### 5.9 Inventory Manager
`/dashboard/inventory` — products (with labelled inputs for name/SKU/stock/cost/sell/low-stock),
customers, sales (auto stock decrement via trigger), expenses, and AI insights via `inventory-insights`.

### 5.10 Notifications
OneSignal SDK initialised in `index.html`; `OneSignalInit` handles StrictMode safety,
`OneSignal.login(user.id)` external-id binding, `PushSubscription.optIn()`, and persists the player id to
`profiles.onesignal_player_id`. `onesignal-send` supports modes `all | users | players | segments`.
Triggers push for: blog publish, forum post, forum reply, business inquiry, sales page view, new lead,
wallet credit/debit, ad approval/rejection, boost expiry warning/expiry, business approval, referral bonus.
In-app bell (`NotificationBell` + `user_notifications`). Admin composer, prompt-style setting
(Bell/Modal/Custom), subscriber list, and "send test to my device" at `/admin/notifications`.

### 5.11 Site chrome & extras
Hero slider, TV video frame (pauses auto-cycle while playing), background jingle (single active),
WhatsApp community banner, global search (`GlobalSearch`/`SiteSearch`), PWA install prompt + service
worker, custom code injections per route, Google Analytics, feature-flag admin, startup calculator
(`/tools/startup-calculator` + `startup-calculator` function).

---

## 6. Pages & Navigation

### Public (inside `PublicLayout`: Header + Footer + `MobileTabBar`)
| URL | Purpose | Key components / actions | Access |
|---|---|---|---|
| `/` | Homepage: hero slider, featured businesses, latest posts, TV, Amazon picks, email subscribe | `HeroSlider`, `FeaturedBusinessSlider`, `TVFrame`, `AmazonProductGrid`, `EmailSubscribeForm` | public |
| `/blog` | Blog list + search | post cards, category chips | flag `blog` |
| `/blog/category/:categorySlug` | Category-filtered blog | same | flag `blog` |
| `/blog/:slug` | Article | reader/TTS, eBook, comments, share, favourite, ads | flag `blog` |
| `/businesses` | Directory (style-routed) | `DirectoryRouter` | flag `businesses` |
| `/businesses/category/:slug` | Category page: businesses + related articles + CTA | category icon hero | flag `businesses` |
| `/businesses/list` | Create listing (style-routed) | `ListProduct` or `ListBusiness`, image upload, `PhoneInput` | flag `business_listing`, login |
| `/businesses/:slug` | Business profile | gallery, services, `BusinessChatDialog`, WhatsApp CTA | flag `businesses` |
| `/products` , `/products/:slug` | Product directory + detail | filters, WhatsApp order | flag `businesses` |
| `/suppliers`, `/suppliers/submit`, `/suppliers/:slug` | Legacy aliases of the directory routes | — | flag `businesses` |
| `/tools/startup-calculator` | Startup cost calculator | form + AI breakdown | flag `tools` |
| `/advertise` | Advertising sales page incl. banner-ad pitch → `/dashboard/ads` | CTA buttons | flag `advertise` |
| `/learn` | Learning Hub | course cards, enrol, share | flag `learn` |
| `/forum`, `/forum/:id` | Community | create post, reply, vote, search, filters | flag `forum` |
| `/sales` | Public sales-page marketplace | search, price filter, sort | public |
| `/u/:username` | Public profile: bio, services, socials, user's active sales pages | `ShareProfileButton` | public |
| `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/disclaimer` | Static/legal | contact form writes `contact_submissions` | public |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | forms | public (`register` flag) |
| `*` | `NotFound` | — | public |

### Standalone (no chrome)
| `/sales/:slug` | Public sales page | template render, lead modal, sticky CTA, countdown | public |

### User dashboard routes — see §8.
### Admin routes — see §7.

**Navigation surfaces:** desktop `Header` (nav + search + notification bell + auth menu),
`MobileTabBar` (Home, Blog, Businesses, Community, Dashboard/Profile), `Footer` (links +
`BrandSocialLinks` with 12 official social logos, visible on mobile too), admin sidebar + floating
bottom pill tab bar.

---

## 7. Admin Dashboard (`/admin`, `ProtectedAdminRoute` + `AdminLayout`)

`AdminLayout` is a pro mobile-app shell: grouped sidebar, safe-area top bar with page-context title and
back button on subpages, floating pill bottom-tab bar, and a search dropdown.

| Route | Feature |
|---|---|
| `/admin` | Dashboard: KPI tiles (posts, businesses, users, unread contacts — live counts), icon-grid quick actions, "Manage" list, time-based greeting |
| `/admin/posts` | Blog CRUD, TipTap editor, publish/feature toggles |
| `/admin/blog-categories` · `/admin/directory-categories` · `/admin/categories` | Taxonomy CRUD (typed) |
| `/admin/ai-blogger` | Trigger AI generation, category-scoped trend fetch, schedule config |
| `/admin/blog-analytics` | Post views/reads/engagement |
| `/admin/businesses` (`/admin/suppliers`) | Approve/reject/feature/delete listings, rejection reasons |
| `/admin/users` | User list, roles, wallet adjustments (`admin_adjust_wallet`) |
| `/admin/contacts` | Contact inbox, read/unread |
| `/admin/guest-blogs` | Review paid business-blog submissions → generate/publish/reject |
| `/admin/ads` | Approve/reject user ads (auto-refund), impressions/clicks, API keys |
| `/admin/sales-pages` | All users' sales pages: search, active/disabled filter, lead toggle column, edit, toggle, delete (owner profiles fetched separately) |
| `/admin/sales-templates` | Enable/disable templates, premium pricing, default template |
| `/admin/leads` | All leads across the platform |
| `/admin/courses` | Learning Hub CRUD + uploads |
| `/admin/videos` · `/admin/slides` · `/admin/jingles` | TV videos, hero slides, background jingle |
| `/admin/notifications` | Push composer (all/segment/individual), prompt style, subscriber list, send test |
| `/admin/amazon` | Amazon products, affiliate tag/marketplace, CSV/ASIN bulk import |
| `/admin/custom-code` | Route-scoped head/body code injections |
| `/admin/features` | Feature-flag switchboard (`FEATURE_META`, writes `feature_*` settings; realtime-propagated) |
| `/admin/settings` | Tabs incl. General, Ads (AdSense/Adsterra/Monetag/Start.io + placement switches), Social (12 networks + `directory_listing_style`), Payments (Paystack keys), Sales pricing, Leads master switch, OneSignal, GA |

**Moderation tools:** business approve/reject, ad approve/reject, guest blog review, comment delete
(admin policy), sales page disable/delete, forum post/reply delete (admin policies).

---

## 8. User Dashboard (`/dashboard`)

Mobile-app style header with greeting, wallet balance card and Top Up button, then a tile grid
(each tile respects its feature flag): My Profile, Wallet, Ad Earnings, AI Coach, Inventory,
Sales Pages, My Leads, Run Ad, Saved Blogs, Submit Business, My Businesses, Messages, Calculator,
Learning Hub, Community. Below: `ReferralCard`, stats row (saved posts, submissions, profile/username
status) and a "My Business Submissions" list with status badges
(`pending_payment|paid|generating|review|approved|published|rejected`).

Sub-routes: `/dashboard/wallet` (balance, top-up, transfer, transaction history),
`/dashboard/ad-earnings`, `/dashboard/ads` (+ `/:id/analytics`), `/dashboard/coach`,
`/dashboard/inventory`, `/dashboard/sales-pages` (+ `/new`, `/:id/edit`, `/:id/analytics`),
`/dashboard/leads`, `/dashboard/favorites`, `/dashboard/businesses` (+ `/:id/edit`, `/:id/boost`),
`/dashboard/messages`, `/dashboard/profile-edit`, `/dashboard/submit-blog`.
`/dashboard` itself redirects anonymous users to `/login`.

---

## 9. Business Directory (detail)

- **Registration:** `/businesses/list`. Product mode collects name, description, price, currency,
  condition, stock, location, WhatsApp/phone (with country code), category, cover + gallery images.
  Business mode collects name, description, category, phone, address, website, logo/cover, socials,
  services (jsonb), gallery (`supplier_images`).
- **Profiles:** hero/cover, logo, description, services with `ServicePreviewDialog`, gallery, contact
  buttons (WhatsApp deep link built by `src/lib/phone.ts::waLink` so country codes decode correctly),
  message dialog, boosted badge.
- **Categories:** `categories` rows with `type='business'`, custom SVG icons, dedicated category pages.
- **Search & filters:** text search on name/description, category filter, featured/boosted first ordering;
  product mode adds price and condition filters.
- **Reviews:** **MISSING** for businesses/products. Ratings exist only on blog comments (`blog_comments.rating`).
- **Verification:** manual admin approval (`status`), optional auto-approve flag; no document/KYC verification.
- **SEO:** react-helmet-async titles/descriptions per page, slugs, `sitemap` edge function,
  `og-prerender` for crawler user-agents (Facebook, WhatsApp, LinkedIn, X, Telegram, Google, etc.),
  semantic markup and alt text, `robots.txt`, canonical SPA rewrites.

---

## 10. APIs (Supabase Edge Functions)

Base: `https://<project>.supabase.co/functions/v1/<name>`. All send CORS headers and handle `OPTIONS`.
Because `supabase/config.toml` declares no `verify_jwt` overrides, JWT verification defaults to on for
every function; public functions additionally work with the anon key supplied by the client/rewrite.

| Function | Method | Request | Response | Auth | Notes/Validation |
|---|---|---|---|---|---|
| `ad-click` | GET `?id=<ad_uuid>` | query param | 302 redirect to target | public | calls `record_ad_click`; missing/invalid id → error |
| `ad-server` | GET/POST `?placement=` | placement, optional `Bearer adv_…` | JSON ad `{id,title,description,image_url,target_url}` | public / API key | `serve_random_ad`, increments impressions |
| `ad-embed` | GET `?placement=&key=` | query | JS snippet (text/javascript) | public | renders rotating banner into host page |
| `external-submit-ad` | POST | `{title,description,image_url,target_url,...}` + `Authorization: <api key>` | `{success, ad_id}` | API key via `verify_ad_api_key` | ad created as `pending`, no wallet charge |
| `admin-create-ad-key` | POST | `{label, scopes}` | `{key}` (plaintext once) | admin JWT | stores sha256 hash |
| `ai-blogger` | POST | `{mode, topic?, categoryId?, keywords?, autoPublish?}` | `{post}` / trends array | admin JWT | Google News RSS + AI Gateway + Pexels + YouTube |
| `auto-blog-scheduler` | POST | `{async?:true}` | `{ran:n}` | service (cron) | iterates enabled `autoblog_schedule` rows respecting `interval_hours` |
| `business-coach` | POST | `{conversationId, message, businessContext}` | streamed/JSON assistant reply | user JWT | persists messages |
| `inventory-insights` | POST | `{}` | AI insight text | user JWT | reads caller's inventory under RLS |
| `gemini-live-token` | POST | `{}` | `{token}` ephemeral (30 min) | user JWT | never exposes `GEMINI_API_KEY` |
| `sales-page-generate` | POST | `{product_name, description, audience, price, tone}` | JSON copy blocks | user JWT | Gemini 2.5 Flash |
| `sales-page-pexels` | POST | `{query}` | `{photos:[…]}` (5, landscape) | user JWT | requires `PEXELS_API_KEY` |
| `paystack-init` | POST | `{amount}` | `{authorization_url, reference}` | user JWT | amount validated numeric/min |
| `paystack-verify` | POST | `{reference}` | `{success, amount}` | user JWT | verifies with Paystack, then `topup_wallet` (+ referral purchase credit) |
| `onesignal-send` | POST | `{mode:'all'\|'users'\|'players'\|'segments', user_ids?, title, message, url}` | OneSignal API response | service/admin | used by DB triggers via `pg_net` |
| `send-push` | POST | `{title, body, url}` | `{sent}` | admin | legacy VAPID web-push |
| `notify-new-posts` | POST | `{}` | `{sent}` | service | legacy: pushes unnotified published posts |
| `submit-ad` | POST | ad payload | `{success}` | user JWT | in-app ad purchase (wallet) |
| `submit-business-blog` | POST | submission payload | `{success, submission_id}` | user JWT | charges `business_blog_fee` |
| `startup-calculator` | POST | `{business_type, budget, …}` | AI cost breakdown | public/user | |
| `og-prerender` | GET `?type=blog\|business\|profile\|sales\|home&slug=&origin=` | query | HTML with OG/Twitter tags | public | used only by crawler rewrites |
| `sitemap` | GET | — | `application/xml` sitemap | public | mapped to `/sitemap.xml` |
| `rss` | GET `?origin=` | — | RSS 2.0 | public | mapped to `/rss.xml`, `/feed` |
| `tts` | POST | `{text}` | audio | user JWT | **legacy** — UI now uses browser `speechSynthesis` |

**RPCs (PostgREST `/rest/v1/rpc/...`)** — every function in §3.5 is callable from the client with the
user's JWT; each one re-validates `auth.uid()`/role internally.

---

## 11. Storage

All buckets are **public read** (URLs are unguessable-by-path only, not private):

| Bucket | Contents | Written by |
|---|---|---|
| `blog-images` | Post featured images, AI-generated SVG covers, inline editor images | admin, `ai-blogger` |
| `supplier-logos` | Business logos/covers | listing owners |
| `guest-submissions` | Business-blog submission banners/photos | submitters |
| `ad-creatives` | User ad images | ad buyers |
| `sales-pages` | Product images and gallery uploads | sales page owners |
| `slider-images` | Homepage hero slides | admin |
| `course-thumbnails`, `course-videos` | Learning Hub media | admin |
| `jingles` | Background audio | admin |

Access rules: reads are public (needed for OG images and crawlers); writes are governed by storage
policies restricting `INSERT`/`UPDATE`/`DELETE` to authenticated users (and admin-only for
admin buckets). Documents/PDFs are **not** stored — the eBook is generated client-side with jsPDF
and downloaded directly.

---

## 12. Security

- **Authentication:** Supabase Auth, JWT in `localStorage`, auto-refresh; no anonymous sign-ups.
- **Authorization:** roles isolated in `user_roles`, checked through the SECURITY DEFINER `has_role()`
  (prevents RLS recursion and privilege escalation via profile edits). UI guards are convenience only —
  the database is the enforcement boundary.
- **RLS:** enabled on all public tables; patterns documented in §3.3. Analytics tables are append-only.
  Ledger tables reject direct writes; only definer functions mutate balances, and `deduct_wallet` takes a
  `FOR UPDATE` row lock to prevent double-spend races.
- **Validation:** client-side zod + react-hook-form; server-side checks inside RPCs (login required,
  ownership, feature enabled, balance sufficient, transfer min/max, self-transfer blocked, duplicate
  enrolment/claim blocked).
- **Rate limiting / anti-spam:** ad-click reward cooldown (`ad_click_cooldown_seconds`), one daily
  reward per UTC day, one referral purchase credit per referred user, admin approval gates for
  businesses/ads/guest blogs, API keys hashed with SHA-256 and revocable (`active`).
- **Secrets:** service role key and API keys live only in edge-function env
  (`GEMINI_API_KEY`, `PEXELS_API_KEY`, `ONESIGNAL_REST_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …).
  Gemini Live uses short-lived ephemeral tokens so the browser never sees the API key.
- **Error handling:** `ErrorBoundary` around global services and route content, `sonner`/toast surface
  errors, edge functions return JSON `{error}` with CORS headers, push helpers swallow exceptions so a
  notification failure never rolls back a business transaction.
- **Known security gaps:** `paystack_secret_key` and `gemini_api_key` rows exist in the publicly readable
  `site_settings` table; the anon key is embedded in two SQL push helpers; admin bootstrap emails are
  hard-coded in `handle_new_user`. See §14.

---

## 13. Environment Variables

**Frontend (`.env`, auto-generated, safe/publishable):**
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Backend API base URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key for the browser client |
| `VITE_SUPABASE_PROJECT_ID` | Project reference used for tooling |

**Edge function secrets (server-side only, values never exposed):**
| Secret | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | Backend access from functions |
| `LOVABLE_API_KEY` | Lovable AI Gateway (coach, blogger, insights, copy) |
| `GEMINI_API_KEY` | Gemini Live ephemeral tokens + Gemini 2.5 Flash |
| `PEXELS_API_KEY` | Stock imagery search |
| `ONESIGNAL_REST_API_KEY` | Push delivery |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | *(referenced by legacy `notify-new-posts`; may be unset)* |

Paystack keys and the OneSignal App ID are stored in `site_settings` rather than env (see §14).

---

## 14. Current Issues

**Known bugs / risks**
1. `site_settings` is publicly readable but stores `paystack_secret_key` and `gemini_api_key` — move to
   edge-function secrets immediately.
2. The Supabase anon key is hard-coded inside `send_push_via_onesignal` / `send_push_to_user_via_onesignal`;
   key rotation will silently break every push trigger.
3. Admin bootstrap emails are hard-coded in `handle_new_user()`.
4. Runtime "Script error." appears in preview logs — cross-origin third-party ad/analytics scripts;
   opaque and unactionable without `crossorigin` attributes.
5. `notify_sales_page_viewed` fires a notification + push on **every** view event — noisy at scale and a
   throughput risk on popular pages.
6. `moderator` role exists in the enum but is never used by any policy.
7. Missing FKs on several logical relations (`sales_pages.user_id`, `business_messages.business_id`,
   `forum_replies.post_id`) force manual joins and allow orphans.
8. Two overlapping push systems (legacy VAPID `push_subscriptions`/`send-push` and OneSignal) — the
   legacy path is dead weight.
9. `directory_products` has nullable `active`/`stock`/`views_count` with no NOT NULL defaults enforced.

**Missing features**
- Business/product reviews & ratings; verified-badge/KYC flow.
- Moderator tooling, forum reporting/flagging, comment moderation queue.
- Withdrawals/payouts (wallet is spend-only after top-up; no cash-out path).
- Refunds beyond ad rejection; no invoice/receipt generation.
- Multi-language (a `LanguageSwitcher` component exists but no i18n layer).
- Email transactional layer (all notification is push/in-app).
- Automated tests: only a placeholder `src/test/example.test.ts`.

**Technical debt**
- Several pages exceed 500 lines (`AdminSettings`, `SalesPageEditor`, `BusinessInventory`) and should be
  decomposed.
- `src/integrations/supabase/types.ts` has been hand-edited in the past — always regenerate after migrations.
- Duplicated directory logic between `suppliers` and `directory_products` paths.
- `sitemap.xml` / `ads.txt` exist both at repo root and in `public/` — only `public/` ships.

**Performance**
- No secondary indexes on hot filter columns (`blog_posts.published/published_at`,
  `suppliers.status/active/category_id`, `sales_page_events.sales_page_id`, `forum_posts.category`).
- Event tables grow unbounded with no retention/rollup strategy.
- No route-level code splitting — every page is eagerly imported in `App.tsx`, inflating the initial bundle.
- Dashboard/admin pages issue multiple sequential Supabase queries where a single RPC would do.

---

## 15. Future Roadmap (recommended order)

1. **Security hardening:** move Paystack/Gemini keys out of `site_settings`; parameterise the anon key in
   push helpers; replace hard-coded admin emails with a seeded `user_roles` row.
2. **Indexes + retention:** add the indexes listed above; add a monthly rollup/purge for
   `*_events` tables.
3. **Notification throttling:** aggregate sales-page view pushes (daily digest) and add a per-user
   notification preferences table.
4. **Reviews & verification** for directory listings (ratings, review moderation, verified badge).
5. **Payouts:** withdrawal requests + admin approval + Paystack transfers.
6. **Code splitting** with `React.lazy` per route; decompose oversized pages.
7. **Moderator role** activation: forum/comment moderation policies and an admin moderation queue.
8. **Transactional email** (welcome, receipts, lead alerts) alongside push.
9. **Test coverage:** vitest unit tests for wallet math and Playwright flows for signup → top-up →
   create sales page → capture lead.
10. **Analytics depth:** funnel reporting for sales pages, cohort retention, revenue dashboard for admin.

---

## 16. File Structure

```
/
├─ index.html                  # SPA shell; OneSignal SDK init, meta/OG defaults
├─ vercel.json                 # crawler rewrites → og-prerender, sitemap/rss, SPA fallback
├─ vite.config.ts              # port 8080, @ alias, react-swc, lovable-tagger, dedupe
├─ tailwind.config.ts          # design tokens, typography/animate plugins
├─ package.json / tsconfig*.json / eslint.config.js / postcss.config.js
├─ vitest.config.ts / playwright.config.ts / playwright-fixture.ts
├─ public/
│  ├─ manifest.json            # PWA manifest
│  ├─ sw.js                    # service worker
│  ├─ OneSignalSDKWorker.js    # push worker
│  ├─ robots.txt, sitemap.xml, ads.txt, placeholder.svg
├─ src/
│  ├─ main.tsx                 # React root
│  ├─ App.tsx                  # providers, all routes, global services
│  ├─ index.css                # design tokens (HSL CSS vars) + base styles
│  ├─ components/              # feature + layout + ui components (see §17)
│  │  ├─ layout/               # PublicLayout, AdminLayout, Header, Footer, MobileTabBar
│  │  ├─ ui/                   # shadcn primitives (~45 files)
│  │  ├─ coach/                # GeminiLiveDialog, LiveVoiceButton
│  │  ├─ sales-templates/      # SalesPageTemplate, LeadCaptureModal
│  │  └─ wallet/               # TransferDialog
│  ├─ contexts/                # AuthContext, FeatureFlagsContext
│  ├─ hooks/                   # use-mobile, use-toast, useListingStyle
│  ├─ lib/                     # utils (cn), phone.ts (country codes + waLink), categoryIcons.tsx
│  ├─ integrations/supabase/   # client.ts + types.ts (AUTO-GENERATED — do not edit)
│  ├─ pages/                   # every public/user page
│  │  └─ admin/                # every admin page
│  └─ test/                    # vitest setup + example test
└─ supabase/
   ├─ config.toml              # project_id only
   ├─ migrations/              # ordered SQL migrations (source of truth for schema)
   └─ functions/               # 24 edge functions + _shared/ai.ts
```

---

## 17. Components (reusable)

**Layout:** `PublicLayout` (header/footer/outlet + mobile socials), `AdminLayout` (sidebar, contextual
top bar, floating tab bar, search), `Header`, `Footer`, `MobileTabBar`.

**Auth/guards:** `ProtectedAdminRoute`, `FeatureGate` (in FeatureFlagsContext), `ErrorBoundary`.

**Content:** `BlogReader` (browser TTS + jsPDF eBook), `BlogComments`, `BlogShareButtons`,
`BlogInlineInjections`, `RelatedPosts`, `FavoriteButton`, `RichTextEditor` (TipTap), `PageHero`,
`LegalPageLayout`, `HeroSlider`, `TVFrame`, `FeaturedBusinessSlider`, `AmazonProductGrid`.

**Directory/business:** `BusinessChatDialog`, `ServicePreviewDialog`, `ShareProfileButton`,
`categoryIcons.tsx` (18 custom flat SVG category icons).

**Sales:** `sales-templates/SalesPageTemplate` (7 templates), `sales-templates/LeadCaptureModal`.

**Coach:** `coach/GeminiLiveDialog` (mic+camera live session), `coach/LiveVoiceButton`, `ListenButton`.

**Ads/monetisation:** `AdSenseLoader`, `AdsterraLoader`, `AdsterraAd` (sandboxed iframe),
`ThirdPartyAdLoader` (Monetag + Start.io), `RotatingBlogAd`, `AdPlaceholder`, `AdClickTracker`.

**Notifications/engagement:** `OneSignalInit`, `NotificationBell`, `PushNotificationPrompt`,
`PWAInstallPrompt`, `DailyRewardClaim`, `ReferralCard`, `WhatsAppCommunityBanner`, `BackgroundJingle`,
`EmailSubscribeForm`.

**Utility:** `GlobalSearch`, `SiteSearch`, `ScrollToTop`, `GoogleAnalytics`, `CustomCodeInjector`,
`PhoneInput` (40-country selector, Nigeria default), `NavLink`, `LanguageSwitcher`,
`BrandSocialLinks` (12 official social logos), `wallet/TransferDialog`.

**UI primitives:** the standard shadcn set in `src/components/ui/` (button, card, dialog, table, tabs,
select, form, chart, sidebar, drawer, sonner, etc.).

---

## 18. State Management

- **Server state:** `@tanstack/react-query` (`QueryClient` at the app root) for admin lists, categories,
  analytics and directory queries — with query keys like `["admin-stats"]`, `["directory_listing_style"]`.
  Many older pages use `useEffect` + `useState` with direct Supabase calls instead (inconsistent; worth
  consolidating).
- **Auth state:** `AuthContext` — `user`, `session`, `loading`, `isAdmin`, `roleChecked`, plus
  `signUp/signIn/signOut/resetPassword`. Subscribes to `onAuthStateChange` and hydrates from `getSession`.
- **Feature flags:** `FeatureFlagsContext` — loads all `feature_*` rows from `site_settings`, defaults
  everything to **true**, and subscribes to a Supabase realtime channel on `site_settings` so admin
  toggles propagate to every open client instantly. Exposes `useFeatureFlags`, `useFeature`, `FeatureGate`.
- **Local/UI state:** component `useState`, react-hook-form for forms, `sonner`/`use-toast` for
  transient feedback, `localStorage` for the Supabase session and the cached Monetag head snippet.
- **URL state:** route params and query strings drive category/search filtering.

---

## 19. Complete Business Logic (end-to-end workflows)

**A. Signup → onboarding**
Register (optional `?ref=` code) → Supabase creates the auth user → `handle_new_user()` creates profile
(+ generated username + unique referral code), wallet at ₦0, links `referred_by`, grants admin for the
two bootstrap emails, and pays the referrer `referral_signup_bonus` (wallet + ledger + notification).
First dashboard visit: `DailyRewardClaim` calls `claim_daily_reward` (once per UTC day);
`OneSignalInit` binds the push subscription to the user id.

**B. Wallet top-up**
`/dashboard/wallet` → amount → `paystack-init` returns an authorization URL → user pays → return →
`paystack-verify` validates server-side with the Paystack secret, calls `topup_wallet` (balance +
ledger row) and `credit_referral_purchase` (one-time % to the referrer) → the
`notify_wallet_transaction_change` trigger creates an in-app notification and a push.

**C. Listing a business/product**
`/businesses/list` (form chosen by `directory_listing_style`) → images uploaded to storage → row inserted
as `pending` → `suppliers_auto_approve` may flip it to `approved` when the flag is on → otherwise admin
approves at `/admin/businesses` → `notify_supplier_approved` broadcasts a push → the listing appears in
the directory and its category page.

**D. Boosting**
`/dashboard/businesses/:id/boost` → pick a package from `boost_packages` → `activate_business_boost`
verifies the feature flag + ownership, calls `deduct_wallet`, inserts `business_boosts`, extends
`suppliers.boosted_until` and sets `featured` → hourly `expire_business_boosts()` sends a 24h warning,
then expires the boost and pushes a renewal prompt.

**E. Lead generation via sales page**
Create page in the editor (AI copy + Pexels/upload imagery + template) → `create_sales_page` charges the
wallet unless it's the user's first page and `sales_page_first_free` is on → public `/sales/:slug` logs a
`view` event (trigger notifies the owner) → visitor submits `LeadCaptureModal` → `sales_page_leads` row →
`notify_sales_page_lead` sends in-app + push → owner works the lead at `/dashboard/leads` (status +
CSV export) and reviews charts at `/dashboard/sales-pages/:id/analytics`.

**F. Advertising**
User creates an ad (`/dashboard/ads`), wallet charged `ad_cost_per_day × duration_days`, status `pending`
(or auto-approved when `ad_auto_approve`) → admin approves (`approve_user_ad` sets the active window) or
rejects (`reject_user_ad` refunds via `topup_wallet`) → `notify_ad_status_change` informs the user →
ads served by `serve_random_ad`/`ad-server` (impressions++) → clicks hit `ad-click`
(`record_ad_click`, 302 to target) → logged-in clickers may earn via `credit_ad_click` (cooldown-guarded)
→ owner analytics at `/dashboard/ads/:id/analytics`. External sites use hashed API keys with
`ad-embed`/`ad-server`/`external-submit-ad`.

**G. Content pipeline**
Cron (15 min) → `auto-blog-scheduler` → for each due `autoblog_schedule` row → `ai-blogger` →
Google News headlines (category-scoped) → AI draft → Pexels cover with title-overlay SVG → matched
YouTube embed → insert `blog_posts` (auto-publish optional) → `notify_blog_post_published` broadcasts a
push and marks `push_notified` → the post ships in `/rss.xml`, `/sitemap.xml`, and OG prerender.

**H. Paid guest business blog**
`/dashboard/submit-blog` → submission + photos + `business_blog_fee` charge → status flows
`pending_payment → paid → generating → review → approved/published` (or `rejected`) driven by
`/admin/guest-blogs` and `submit-business-blog`; the generated post id is stored on the submission.

**I. Community & learning**
Forum posting requires login; replies/votes update denormalised counts via triggers and notify the
thread owner. Courses: `enroll_in_course` charges the wallet for priced courses, prevents duplicates,
and unlocks playback.

**J. Admin operations**
Feature flags at `/admin/features` write `feature_<key>` rows → realtime channel updates every client →
`FeatureGate` hides routes and dashboard tiles instantly. Settings control monetisation codes, pricing,
socials, listing style, payment keys and OneSignal. Admin can adjust any wallet, broadcast notifications
(`broadcast_notification` + OneSignal), moderate every content type, and mint ad API keys.

---

## 20. Project Summary

Bethelincovibe TV is a React 18 + Vite + TypeScript SPA on Tailwind/shadcn, backed by Lovable Cloud
(Supabase Postgres, Auth, Storage, and 24 Deno edge functions), deployed on Vercel with crawler-aware
rewrites for social previews, RSS and sitemap. It serves Nigerian entrepreneurs with an AI-generated
business blog, a dual-mode directory (simple products or full business profiles, switchable by admin),
a Naira wallet economy funded by Paystack, and a set of monetisable SME tools: sales page generator with
lead capture and analytics, self-serve advertising with an external developer API, business boosting,
paid guest articles, courses, inventory management, an AI business coach (chat plus Gemini Live
voice/video), and a community forum.

Every feature is individually killable through a database-driven feature-flag system that propagates in
realtime. Security rests on Postgres RLS plus SECURITY DEFINER functions for all money movement, with
roles isolated in `user_roles` and checked by `has_role()`. Push notification coverage is broad and
trigger-driven through OneSignal.

To continue development: regenerate `src/integrations/supabase/types.ts` after every migration; never
edit `src/integrations/supabase/client.ts`, `types.ts` or `.env`; always pair `CREATE TABLE` with
`GRANT` + RLS policies; keep new colour/typography values as semantic tokens in `index.css` rather than
hardcoded Tailwind utilities; and start with the §14 security items (secrets currently in
`site_settings`) before adding new surface area.
