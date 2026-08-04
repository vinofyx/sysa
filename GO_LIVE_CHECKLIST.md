# Go-Live Checklist

## Sai Yadadri Seva Ashram Platform

Ordered by dependency — items near the top block items below them. Check each box against a **real deployment**, not this build environment (which intentionally has no live database, Razorpay keys, Cloudinary account, or SMTP credentials — see KNOWN_LIMITATIONS.md).

---

## 1. Credentials & Third-Party Accounts (blocking — nothing else works without these)

- [ ] **Razorpay merchant account approved** (KYC complete) — pending per `documentation/16-Assumptions-and-Dependencies.md` D-01 as of the last documentation review. This is the single longest-lead-time dependency; start it first.
- [ ] Razorpay live-mode `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` obtained and set in production `.env`
- [ ] Razorpay webhook configured (see DEPLOYMENT_GUIDE.md §7) and `RAZORPAY_WEBHOOK_SECRET` set
- [ ] Cloudinary account created, `CLOUDINARY_*` set
- [ ] SMTP provider configured (SES/SendGrid/other), `SMTP_*` + `EMAIL_FROM` set, sender domain verified/SPF-DKIM configured so receipt/notification emails don't land in spam
- [ ] Production domain purchased/pointed at the deployment, TLS certificate issued

## 2. Database

- [ ] Production MySQL 8.0+ instance provisioned (managed service or the `docker-compose.yml` `mysql` container with a real, non-default password), `utf8mb4`/`utf8mb4_0900_ai_ci` confirmed (see [MYSQL_MIGRATION_REPORT.md](MYSQL_MIGRATION_REPORT.md))
- [ ] `npm run prisma:deploy` run against production — **this is the first time these migrations will ever touch a real database** in this project's history; watch the output carefully and have a rollback plan (see DEPLOYMENT_GUIDE.md §9)
- [ ] `npm run prisma:seed` run — creates the RBAC roles/permissions and bootstrap Super Admin
- [ ] Bootstrap Super Admin password changed immediately after first login (do not leave the seed-script default in place)
- [ ] Database backup schedule configured (not part of this codebase — an infrastructure/ops decision for whoever hosts the production database)

## 3. Secrets

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` generated fresh for production (32+ random characters each, **not** reused from any development environment)
- [ ] Confirmed no `.env` file with real values has been committed to git (`git log --all --full-history -- '*.env'` should show nothing but `.env.example`)
- [ ] Secrets stored in your platform's secret manager (not plaintext files on a shared server) where your hosting choice supports it

## 4. Payment Flow — End-to-End Verification (cannot be done in this build environment)

- [ ] One full test-mode donation: initiate → Razorpay Checkout opens → complete payment with a Razorpay test card → success page shows correct amount/category → receipt PDF generated → receipt email received → `/admin/donations` shows the transaction as `completed` with the correct Razorpay order/payment IDs
- [ ] One deliberately-failed test payment (Razorpay provides test cards that simulate failure) → failure page shows → **Retry Payment** button successfully reopens Checkout against the same order and can be completed
- [ ] Webhook delivery confirmed via Razorpay Dashboard's webhook log (should show `200` responses)
- [ ] One real ₹1 **live-mode** transaction (after switching from test to live keys) to confirm live-mode credentials work end-to-end, before advertising the donation feature publicly
- [ ] Donor OTP login tested: request code → real email arrives → verify code → donation history shows past donations with working receipt-download links

## 5. Content

- [ ] All CMS content populated by the client: Home welcome message + impact stats, About/History/Vision/Mission/Founder/Treasurer text, full Managing Committee roster with photos, Activities & Services, Hero Banners, at least a few Testimonials, Donation Categories with real descriptions, Bank/UPI details, Social Links, Navigation menus, Contact info (address/phone/email/hours/map coordinates)
- [ ] **Privacy Policy, Terms & Conditions, Refund Policy, Disclaimer** — real legal text supplied by the client and published via `/admin/content/legal`. These currently show a "Coming Soon" placeholder and **must not go live displaying that placeholder** — this is a real legal-risk item, not cosmetic.
- [ ] At least one Gallery album, a handful of published Events/News posts, so the site doesn't look empty on launch day
- [ ] Telugu translations of any client-supplied content (the _application UI_ is 100% translated — verified in QA_REPORT.md — but CMS _content_ like the About text is whatever the client enters per-locale, and is their responsibility to supply bilingually)

## 6. Compliance / Financial

- [ ] Confirm with the client/their auditor whether 80G tax-exemption certification exists and is current — if so, the receipt PDF template (`services/receipt-pdf.service.ts`) currently deliberately omits an 80G number (documented as unverified) and would need updating to include it once confirmed
- [ ] Confirm the registration number and address shown in the receipt PDF and footer are current and correct
- [ ] Decide on a reconciliation process: who checks the Razorpay Dashboard's settlement reports against `/admin/donations` periodically (the application has no automated bank-settlement reconciliation — it tracks payment capture, not fund settlement to the NGO's bank account, which is a separate Razorpay-side process)

## 7. Infrastructure

- [ ] Domain DNS pointed at the production host
- [ ] TLS certificate installed and auto-renewal configured (Let's Encrypt via certbot, or CDN-managed)
- [ ] Nginx (or CDN) health-checked, `/api/v1/webhooks/` route confirmed to have request buffering disabled (already configured in `infrastructure/nginx/conf.d/default.conf` — just confirm it's the config actually deployed)
- [ ] Server monitoring/alerting configured for the API and web processes (PM2's `pm2 monit`/`pm2 logs`, or your container platform's equivalent) — this codebase logs structured JSON via Winston but does not itself ship logs anywhere; wire that up to whatever log aggregation your hosting uses
- [ ] Confirm `NODE_ENV=production` is actually set in the deployed environment (verbose error messages in API responses are gated on this — see SECURITY_REPORT.md §12/error-handler)

## 8. Final Verification (repeat from a real production URL, not localhost)

- [ ] `npm run lint && npm run typecheck && npm run build` all pass on the exact commit being deployed
- [ ] Walk every public page in both `/en` and `/te`
- [ ] Log in as each of a few representative roles (Super Admin, Content Manager, Finance Manager) and confirm the sidebar/permissions match expectations
- [ ] Submit the Contact form, Volunteer registration, and Event registration forms once each and confirm they appear correctly in the admin panel
- [ ] Confirm `robots.txt` and `sitemap.xml` resolve correctly at the production domain and the sitemap references the right domain
- [ ] Run a Lighthouse/PageSpeed pass on the homepage and donation page against the live production URL (not previously done — this environment can't produce a meaningful Lighthouse score without live content and a real network)

## 9. Post-Launch (first week)

- [ ] Monitor the Razorpay Dashboard and `/admin/donations` daily for the first week for any payment discrepancies
- [ ] Monitor server error logs for any unexpected 500s
- [ ] Confirm donation receipt emails are actually landing in donors' inboxes (not spam) — check with a real external email address, not just an internal test account
- [ ] Schedule the follow-up hardening items from SECURITY_REPORT.md §15 (accepted risks) for a future maintenance window: file-upload magic-byte verification, nonce-based CSP
