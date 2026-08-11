# SSL/TLS setup for sysa.in (Let's Encrypt via Certbot)

Run these on the VPS, in order, after DNS for `sysa.in` and `www.sysa.in` already
points at this server's IP (Certbot's HTTP-01 challenge fails otherwise).

## 1. First-time certificate issuance (one time only)

nginx refuses to start at all if `default.conf`'s `ssl_certificate` paths don't
exist yet — so for this first run only, swap in the HTTP-only bootstrap config:

```bash
cd /opt/sysa
cp infrastructure/nginx/conf.d/default.conf infrastructure/nginx/conf.d/default.conf.real
cp infrastructure/nginx/conf.d/default.conf.bootstrap infrastructure/nginx/conf.d/default.conf

mkdir -p infrastructure/certbot/conf infrastructure/certbot/www

docker compose up -d nginx api web
```

Now request the certificate (replace the email address):

```bash
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d sysa.in -d www.sysa.in \
  --email you@example.com --agree-tos --no-eff-email
```

If that succeeds, `infrastructure/certbot/conf/live/sysa.in/` will contain
`fullchain.pem` and `privkey.pem`. Now switch to the real, HTTPS-enabled config:

```bash
mv infrastructure/nginx/conf.d/default.conf.real infrastructure/nginx/conf.d/default.conf
docker compose restart nginx
```

Verify:
```bash
curl -I https://sysa.in/api/v1/health
```

## 2. Renewal (automatic — set up once)

Let's Encrypt certificates expire every 90 days. Add a cron job on the VPS
host (not inside a container) to renew and reload nginx:

```bash
# crontab -e
0 3 * * * cd /opt/sysa && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

## 3. If you'd rather use Cloudflare (or another CDN) for TLS instead

Skip all of the above. Point `sysa.in`'s DNS through Cloudflare with the
orange-cloud proxy enabled, and set Cloudflare's SSL mode to **Full (strict)**
if you also complete step 1 above, or **Full** if you don't (Cloudflare will
still terminate TLS for visitors either way; only the connection between
Cloudflare and this VPS is affected). In that case `default.conf` can stay
on plain HTTP (the original version, before this change) since Cloudflare is
doing the actual termination — this repo's nginx config works unmodified for
that scenario too.
