# Meta Developer Account — Migration Guide
**From:** vusalashivakumar@gmail.com (personal Facebook account)  
**To:** adminctrlchecks@gmail.com (new business Facebook account)

One Meta app covers all three: **Facebook + Instagram + WhatsApp**. You only need one App ID and App Secret.

---

## PART 1 — Create a Facebook Account for adminctrlchecks

Meta Developer accounts are linked to a **Facebook profile**, not directly to a Gmail. You need a Facebook account for the new Gmail.

1. Go to [https://www.facebook.com](https://www.facebook.com)
2. Click **"Create new account"**
3. Use `adminctrlchecks@gmail.com` as the email
4. Complete sign-up (name, birthday, etc.)
5. Verify the email when Facebook sends a confirmation

> If a Facebook account already exists for this email, just log into it.

---

## PART 2 — Set Up Meta Developer Account

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Sign in with the Facebook account you just created
3. Click **"Get Started"** (top right)
4. Accept the Meta Platform Policies
5. Complete developer registration (takes ~1 minute)

---

## PART 3 — Create a New Meta App

1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Other"** → click **Next**
4. Select **"Business"** → click **Next**
5. Fill in:
   - **App name:** `CtrlChecks`
   - **App contact email:** `adminctrlchecks@gmail.com`
   - **Business portfolio:** leave blank (or link your Business Manager if you have one)
6. Click **"Create app"**
7. Complete any security verification if prompted

---

## PART 4 — Add Facebook Login Product

1. On the App Dashboard, scroll down to **"Add products to your app"**
2. Find **"Facebook Login"** → click **"Set up"**
3. Select **"Web"** when asked what platform
4. For **"Site URL"**, enter: `https://www.ctrlchecks.ai`
5. Click **Save** → click **Continue** through the quickstart until you're back on the dashboard

Now configure the redirect URIs:

6. In the left sidebar, go to **Facebook Login → Settings**
7. Under **"Valid OAuth Redirect URIs"**, add all of these (one per line):
   ```
   https://worker.ctrlchecks.ai/api/oauth/facebook/callback
   https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
   https://www.ctrlchecks.ai/auth/facebook/callback
   http://localhost:3001/api/oauth/facebook/callback
   http://localhost:3001/api/credential-connections/oauth/callback
   ```
8. Click **"Save changes"**

---

## PART 5 — Add Instagram Product

1. Go back to **Add Products** (left sidebar → "+ Add Product")
2. Find **"Instagram"** → click **"Set up"**
3. In **Instagram → API setup with Instagram Login**, click **Set up**
4. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   https://www.ctrlchecks.ai/auth/instagram/callback
   https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
   http://localhost:3001/api/oauth/instagram/callback
   ```
5. Click **"Save changes"**

---

## PART 6 — Add WhatsApp Product

1. Go to **Add Products** again
2. Find **"WhatsApp"** → click **"Set up"**
3. If prompted for a **Business Portfolio**, click **"Create new"** or link an existing one
4. The WhatsApp setup will create a test phone number automatically — this is fine for now
5. Note: Full WhatsApp Business API requires a verified business. The test number works for development.

Under **WhatsApp → Configuration**, set the callback URL:
```
https://worker.ctrlchecks.ai/api/oauth/whatsapp/callback
```

---

## PART 7 — Get App ID and App Secret

1. In the left sidebar, click **App settings → Basic**
2. You will see:
   - **App ID** — copy this
   - **App Secret** — click **"Show"**, enter your Facebook password, copy it
3. Also note your **App Mode** (top of dashboard) — it will say **Development**. This is fine for now. Users must be added as testers to use the app in Development mode.

**Your new credentials:**
- `META_APP_ID` = `<your new App ID>`
- `META_APP_SECRET` = `<your new App Secret>`

---

## PART 8 — Add Test Users (Development Mode)

While in Development mode, only users explicitly added as testers can connect via OAuth.

1. Go to **Roles → Test Users** (left sidebar)
2. Click **"Add"** and add:
   - `adminctrlchecks@gmail.com` Facebook account
   - Your own Facebook account (`vusalashivakumar@gmail.com`)
   - Any other test accounts

> When you're ready to go live, you'll submit the app for **App Review** (a separate process). For now, Development mode is fine for testing.

---

## PART 9 — Update Server .env

Share the new App ID and App Secret here and I'll update the server. Or run this in the Hostinger terminal yourself:

```bash
sed -i 's|^META_APP_ID=.*|META_APP_ID=<paste new App ID>|' /opt/ctrlchecks-worker/.env
sed -i 's|^META_APP_SECRET=.*|META_APP_SECRET=<paste new App Secret>|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
systemctl is-active ctrlchecks-worker
echo DONE
```

---

## PART 10 — Verify

1. Go to `https://www.ctrlchecks.ai/connections`
2. Click **"Connect Facebook"** — should open Facebook OAuth without errors
3. Click **"Connect Instagram"** — should open Instagram OAuth
4. If both work, Meta migration is complete

---

## PART 11 — Clean Up Old App (Do Last)

Only after verifying the new app works:

1. Sign into [https://developers.facebook.com](https://developers.facebook.com) with your **old** Facebook account (`vusalashivakumar@gmail.com`)
2. Find the old CtrlChecks Meta app
3. Go to **App settings → Advanced** → scroll to bottom → **Delete App**

---

## Summary Checklist

- [ ] Facebook account created for adminctrlchecks@gmail.com
- [ ] Meta Developer account registered
- [ ] New Meta app created (`CtrlChecks`)
- [ ] Facebook Login product added with redirect URIs
- [ ] Instagram product added with redirect URIs
- [ ] WhatsApp product added
- [ ] App ID and App Secret copied
- [ ] `META_APP_ID` updated in server `.env`
- [ ] `META_APP_SECRET` updated in server `.env`
- [ ] Worker restarted
- [ ] Facebook OAuth test passed
- [ ] Instagram OAuth test passed
- [ ] Old Meta app deleted

---

**Next guide:** `03-GITHUB-MIGRATION.md`
