# airbnb-india.com — deploy the bot to an Oracle Cloud Free VPS

This makes the Telegram bot run **24/7 without your PC**, on Oracle Cloud's
free forever tier. It still pushes to the same GitHub repo, so EdgeOne Pages
keeps auto-redeploying exactly like before.

## 1. Create the free VM (once, ~10 min)

1. Sign up / log in at **https://cloud.oracle.com** (free tier, needs a card for
   identity but you are not charged).
2. **Create a VM instance** (Compute → Instances → Create instance):
   - Image: **Ubuntu 22.04 or 24.04**
   - Shape: default free ARM or AMD micro (1–2 OCPU / 1–6 GB RAM is plenty)
   - Upload an **SSH public key** (or use Cloud Shell). Save your private key.
3. Note the instance **Public IP**.

## 2. Generate a GitHub Personal Access Token (once)

The bot must `git push` to update EdgeOne. Create a token with **repo** scope:

- github.com → **Settings** → **Developer settings** → **Personal access tokens**
  → **Tokens (classic)** → **Generate new token**
- Scope: `repo` (or fine-grained: read+write Contents on the `airbnbindia` repo)
- Copy the token — you'll paste it into the script once.

## 3. Run the bootstrap script (one command)

SSH into the VM:

```bash
ssh -i ~/.ssh/your-key ubuntu@<PUBLIC_IP>
sudo bash -c 'cd /root && curl -sL -o setup-oracle-vps.sh https://raw.githubusercontent.com/ydvkk05-bot/airbnbindia/main/deploy/setup-oracle-vps.sh && bash setup-oracle-vps.sh'
```

The script will:
- install Node.js 20 + git
- clone `ydvkk05-bot/airbnbindia` to `/opt/airbnbindia`
- ask for your **BOT_TOKEN**, **ADMIN_ID**, and **GitHub PAT**
- write `.env` (chmod 600, never committed to git)
- register the bot as a **systemd service** (`airbnb-bot`) that starts on boot
  and restarts automatically if it ever crashes.

## 4. Verify

```bash
systemctl status airbnb-bot      # should say "active (running)"
journalctl -u airbnb-bot -f      # live logs
```

Then send the bot any command (`/list`, `/delete`, `/listbnb …`). The bot
regenerates the site, `git push`es, and EdgeOne redeploys — same as before,
but now the PC can be off.

## Useful commands

| What | Command |
|---|---|
| View logs | `journalctl -u airbnb-bot -f` |
| Restart bot | `sudo systemctl restart airbnb-bot` |
| Stop bot | `sudo systemctl stop airbnb-bot` |
| Update bot code | `cd /opt/airbnbindia && sudo git pull && sudo systemctl restart airbnb-bot` |

## Notes

- The `.env` (with BOT_TOKEN + PAT) lives only on the VM; it is gitignored and
  is **not** in the repo.
- The GitHub PAT is stored in `/root/.git-credentials` on the VM. If it leaks,
  revoke it on GitHub and re-run the script.
- The VM's system time zone is UTC by default; listings use UTC timestamps —
  harmless for the site.
