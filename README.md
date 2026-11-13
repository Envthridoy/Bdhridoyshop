# BdHridoyShop — Full-Stack E-Commerce Source Code

## Included Features
- Full Bangladesh e-commerce storefront (bKash, Nagad, Rocket, Mastercard/Visa, Cash on Delivery)
- Protected Admin Panel (/admin) with Products, Orders, Resellers, Promo Codes & Newsletter Subscribers
- Reseller Channel (/reseller) with Wholesale pricing, referral tracking, dropship orders & payouts
- Daraz / Amazon / External Store product link importer + affiliate/direct buy buttons
- Ads & Pixels manager (Meta Pixel, Google Ads/GA4, TikTok Pixel, Campaign URL builder)
- Site Design Customizer (live theme colors, logo, hero banner, offers, sidebar & footer)
- Admin-only source code archive downloader

## Quick Start (Node.js / Render / Railway / Local)
1. Copy `.env.example` to `.env` and set your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Run `npm install`
3. Development: `npm run dev` (runs on port 3000)
4. Production: `npm run build` then `npm start`

## Deploying to Netlify
Do NOT drag-and-drop only the `dist/` folder (static-only hosting has no /api server).
Instead, deploy the full project folder via GitHub or Netlify CLI:
- `netlify.toml` and `netlify/functions/api.ts` automatically configure `/api/*` serverless endpoints.
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Netlify -> Site Configuration -> Environment Variables.
