# Deploying RCMExcel

How to put the site on the internet on one server, with HTTPS, a database, scheduled jobs and
backups. It is written for a DigitalOcean server in Bangalore (closest to learners in India), but
the same steps work on any Ubuntu server with Docker.

**What has been tested:** the whole stack (database, migrations, build, app, Caddy, scheduler,
seed, backup and restore, refusing to start on missing settings) was built and run with
`deploy/deploy.sh` on a test machine, using `localhost` instead of a real domain. **What has not:**
a real domain and Let's Encrypt certificate, a managed database, real email delivery, and the
`apt-get` step in the Dockerfile (the test machine could not reach Debian's servers). Do one
rehearsal on a staging address before launch.

## 1. What you need to buy

| Item | Recommended | Approximate cost (check current prices) |
|---|---|---|
| Server | DigitalOcean Droplet, Bangalore (BLR1), Ubuntu 24.04, 2 GB RAM / 1 vCPU, with weekly backups | about $12 + $2.40 a month |
| Database | DigitalOcean Managed PostgreSQL 16, Bangalore, smallest plan | about $15 a month |
| Off-server backup copies | DigitalOcean Spaces (optional but recommended) | about $5 a month |
| Domain | Any registrar; see below | about ₹900–1,000 a year for `.in`, about $8–12 a year for `.com` |
| Email sending | Resend (free tier to start) or Amazon SES (Mumbai) | free to start |

That is roughly **$34 a month**. The cheaper option is to run PostgreSQL on the same server
(`COMPOSE_PROFILES=localdb`), at roughly **$21 a month** with daily server backups. It is fine
to start that way. A managed database gives you automatic daily backups, point-in-time recovery
and upgrades, and keeps the data safe if the server is lost.

Why not other hosts: Vercel limits request bodies to 4.5 MB (course uploads are up to 25 MB),
and its free plan is non-commercial. Render, Railway, Neon and Hetzner have no India region.
DigitalOcean's App Platform has no persistent disk for uploaded files.

**Domain registrars:** Cloudflare Registrar sells `.com` at cost (about $7.85 a year). Namecheap
sells `.in` for about $9.98 a year (about $11.98 to renew). GoDaddy India sells `.in` for about
₹899 a year. Whichever you choose, turn on auto-renew and two-step verification on the registrar
account.

> **Name check before you buy:** "Excel" is a Microsoft trademark, and Microsoft's trademark
> guidelines restrict using it in other companies' product, business and domain names. Ask a
> trademark lawyer, and search the IP India register, before buying the domain or printing
> anything with "RCMExcel" on it. The name is set in one place (`lib/brand.ts`), so changing it
> later is quick.

## 2. Create the server

1. Create a DigitalOcean account and turn on two-step verification.
2. **Create → Droplets:** region Bangalore, Ubuntu 24.04, Basic, 2 GB / 1 CPU. Add your SSH key
   (not a password). Tick **Backups**.
3. **Networking → Firewalls:** create a firewall allowing inbound TCP 22 (SSH), 80 and 443 only,
   and apply it to the Droplet.
4. Database, managed option: **Create → Databases → PostgreSQL 16**, Bangalore. Under **Trusted
   sources**, add the Droplet. Copy the connection string (it ends with `?sslmode=require`).

## 3. Point the domain at the server

At your registrar (or Cloudflare DNS), add:

| Type | Name | Value |
|---|---|---|
| A | `@` | the Droplet's IPv4 address |
| A | `www` | the same address |

If you use Cloudflare DNS, set both to **DNS only** (grey cloud) for the first deploy, so Caddy
can obtain the certificate. Visitors to `www.` are redirected to the main address.

## 4. Prepare the server (once)

SSH in as root, then:

```bash
# Updates and a 2 GB swap file (the build needs more memory than 2 GB at its peak)
apt-get update && apt-get -y upgrade
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sh

# The code. The repository is private: add a read-only deploy key on GitHub
# (repository Settings → Deploy keys) with this server's public key, then:
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 && cat ~/.ssh/id_ed25519.pub
git clone git@github.com:hotaro6754/rcms.git /opt/rcmexcel
cd /opt/rcmexcel
```

## 5. Settings

```bash
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
nano deploy/.env
```

Fill in at least:

- **The domain:** `SITE_DOMAIN`, `ACME_EMAIL`, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL`.
  The last two are the same `https://` address.
- **The database:** `DATABASE_URL`, one of:
  - the managed database's connection string;
  - for the database on this server: `COMPOSE_PROFILES=localdb`, a long `POSTGRES_PASSWORD`, and
    `DATABASE_URL=postgresql://rcmexcel:<that password>@127.0.0.1:5432/rcmexcel`.
- **The secrets:** `BETTER_AUTH_SECRET` and `CRON_SECRET`, each generated with `openssl rand -base64 32`.
- **Email:** `RESEND_API_KEY` and `EMAIL_FROM`. Without email, sign-up verification never
  arrives, so nobody can finish creating an account.

Leave `SITE_INDEXING=off` and the Razorpay keys empty for now. If a required setting is missing
or unsafe, the app refuses to start and says which one in its log; it never prints the values.

**Email set-up (Resend):** add your domain in Resend, then copy the DNS records it shows (SPF,
DKIM, and optionally DMARC) into your DNS. Wait until Resend shows the domain as verified, then
send from an address on it, e.g. `RCMExcel <no-reply@yourdomain>`.

## 6. First deploy

```bash
deploy/deploy.sh
```

This starts the database (if it runs on this server), applies the migrations, builds the app,
starts it with Caddy and the 15-minute scheduler, and waits until `/api/health` answers. The
first build takes several minutes. Then:

```bash
deploy/deploy.sh seed      # load the reference content once (safe to repeat; never overwrites)
```

Open `https://yourdomain`. The certificate is issued on the first visit after DNS has
propagated; if it is not ready, `docker compose -f deploy/docker-compose.yml logs caddy` says why.

**The first administrator:** go to `https://rcmexcel.com/sign-up` and sign up as
`admin@rcmexcel.com` with a password you choose (a password manager is best), then click the
verification link that arrives in that mailbox, so the mailbox from §5 must work first. Then run:

```bash
deploy/deploy.sh admin admin@rcmexcel.com
```

Sign in again: you will be asked to set up two-step verification before the admin area opens.
Grant other staff roles from **Administration → Users and roles**. Each grant needs a second
administrator to approve it.

**Staff accounts on the live site.** The `@rcmexcel.com` addresses in the README
(`admin@`, `director@`, `content@` and so on) are *local test accounts* with a public password.
They exist only on a developer's own computer: `dev:accounts` refuses to run on a live server,
and nothing seeds passwords there. On the live site every person signs up with their own
password and is given a role from the admin area. Suggested addresses:

| Address | Purpose |
|---|---|
| `admin@rcmexcel.com` | You, the Super Administrator. A real mailbox. |
| `support@rcmexcel.com` | Shown on the contact page; forward it to your inbox (an alias, not a login). |
| `no-reply@rcmexcel.com` | What the site sends email as. It never receives. |
| each team member's own address | Their personal login with the role they need. Do not share logins: the audit trail and the two-person approvals depend on each person having their own. |

A free Zoho plan has 5 mailboxes, so give mailboxes to people and use aliases for roles.

## 7. Backups

- **Database:** managed databases are backed up daily by DigitalOcean. Also run the backup
  script, which works for both database options and copies uploaded files too:

  ```bash
  crontab -e
  # add:
  15 2 * * *  /opt/rcmexcel/deploy/backup.sh >> /var/log/rcmexcel-backup.log 2>&1
  ```

  It writes `deploy/backups/db-<time>.dump` and `files-<time>.tar.gz`, and keeps 14 days
  (`BACKUP_KEEP_DAYS`).
- **Off the server:** a backup on the server is lost with the server. Copy `deploy/backups/` to
  Spaces (or any S3-compatible storage) nightly, e.g. with `rclone sync`.
- **Restore drill** (do it once before launch, then quarterly): create an empty database and
  run `pg_restore --no-owner -d <its URL> db-<time>.dump`. Point a test copy of the app at it and
  sign in. This exact procedure was tested on the test machine, and the restored database matched
  the original.

## 8. Updating the site

```bash
cd /opt/rcmexcel && git pull && deploy/deploy.sh
```

Migrations run before the new version starts. They only move forward: to undo a release, check
out the previous commit and deploy again. Only do that when the release added no migration;
otherwise restore the database backup taken before the release.

Useful commands:

- `deploy/deploy.sh logs`: the app log.
- `curl -s localhost:3000/api/health`: answers `{"status":"ok"}` when the app and database are up.
- `docker compose -f deploy/docker-compose.yml ps`: what is running.

## 9. Before telling anyone the address

- [ ] Legal pages (terms, privacy, refunds) reviewed by a lawyer and published from the website
      editor. The privacy policy names only kinds of provider; add the ones you chose.
- [ ] Contact page shows a monitored address.
- [ ] Sign up as a test learner on a phone: the email arrives, the course opens, a lesson completes.
- [ ] Restore drill done (§7).
- [ ] Uptime monitor (e.g. UptimeRobot, free) pointed at `https://yourdomain/api/health`.
- [ ] When you are happy for Google to list the site: set `SITE_INDEXING=on` in `deploy/.env`,
      run `deploy/deploy.sh`, then add the site in Google Search Console and submit
      `https://yourdomain/sitemap.xml`.
- [ ] Payments only after `docs/OPERATIONS.md` §6: Razorpay test mode end to end, then live keys.

The rest of running the platform (daily queues, staff changes, secret rotation, incidents) is in
`docs/OPERATIONS.md`.
