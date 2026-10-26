# Overmaster: putting the alpha online

This folder is the whole website. It works in two modes:

- **Without accounts.** Upload the folder as it is. Anyone can play, saves stay in each player's browser, and players can export a save to a file.
- **With accounts.** Connect a free Supabase project (about 15 minutes). Players can sign up, keep their saves in the cloud and continue on any device. Feedback and automatic error reports land in a table you can read.

What's in the folder:

| File | What it is |
|---|---|
| `index.html` | The game |
| `config.js` | The only file you edit: your Supabase address and key |
| `vendor/` | three.js (3D graphics) and the Supabase sign-in library |
| `supabase/schema.sql` | The database setup you paste into Supabase |
| `_headers` | Hosting settings for Cloudflare Pages |
| `netlify.toml` | The same settings for Netlify |
| `favicon.svg` | The browser-tab icon |

## Step 1: Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**. Pick any name and a database password (save it somewhere). For region, pick the one closest to your testers, such as **Canada (Central)**.
2. When the project is ready, open **SQL Editor**, click **New query**, paste the whole of `supabase/schema.sql`, and click **Run**. You should see "Success. No rows returned".
3. Open **Project Settings**:
   - Under **Data API**, copy the **Project URL**.
   - Under **API Keys**, copy the **publishable** key (it starts with `sb_publishable_`). Older projects call it the **anon public** key.
4. Open `config.js` in any text editor and paste the two values between the quotes:

   ```js
   supabaseUrl: 'https://abcdefghijkl.supabase.co',
   supabaseAnonKey: 'sb_publishable_...',
   ```

   Both values are meant to be public. The rules in `schema.sql` make sure each player can only see their own saves, and nobody can read feedback through the game.

## Step 2: Put the site online (Cloudflare Pages, free)

Cloudflare's free plan doesn't meter normal website traffic and allows 500 builds a month, so an alpha can't run it out. There are two ways to do it. Choose one from the start: Cloudflare can't switch a project from one way to the other later, so you'd make a new project instead.

### Option A (recommended): from GitHub, so every update goes live by itself

1. Put the game in a private GitHub repository (Claude can push it for you once GitHub is connected).
2. Put your Supabase values in `site/config.js` in the repository. They're public values, so committing them is fine.
3. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**, choose **GitHub**, allow access to the repository, then **Begin setup**.
4. Fill in:
   - **Project name:** `overmaster` (it becomes `https://overmaster.pages.dev`; if it's taken, try `overmaster-game`)
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `bash build.sh`
   - **Build output directory:** `dist/site`
5. Select **Save and Deploy**. From now on, every push to `main` publishes the game, and a push to any other branch makes a preview at its own address.

If Cloudflare made a **Worker** instead of a Pages project (its build settings show a deploy command, `npx wrangler deploy`), that works too: leave the build command as `bash build.sh` and the deploy command as `npx wrangler deploy`. `wrangler.jsonc` in the repository tells it to publish `dist/site`. The address ends in `.workers.dev` instead of `.pages.dev`.

### Option B: drag and drop the folder

1. Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up).
2. Open **Workers & Pages**, select **Create application**, then **Get started** next to **Drag and drop your files**.
3. Name the project. The name becomes the address, so `overmaster` gives `https://overmaster.pages.dev` (if that name is taken, try `overmaster-game`).
4. Drag this whole folder (or the zip it came in) into the upload area, then select **Deploy site**.
5. Open the address: you should see the title screen. You can add a domain you own later under the project's **Custom domains**.

**Other hosts work the same way.** On Netlify, go to **Sites → Add new site → Deploy manually** and drag the folder in (note that Netlify's free plan runs on monthly credits, and every upload uses some). GitHub Pages or your own web server: just upload the folder.

## Step 3: Tell Supabase where the game lives

In Supabase, open **Authentication → URL Configuration**:

1. Set **Site URL** to your game's address, for example `https://overmaster.pages.dev`.
2. Under **Redirect URLs**, add the same address. If you test locally, also add `http://localhost:8000`.

This is what makes the links in sign-up, magic-link and password-reset emails bring players back to the game.

## Step 4: Decide how sign-up emails work

Supabase's built-in email sender is meant for trying things out. It sends only a few emails per hour, and only to addresses on your own Supabase team, so most testers would never receive their confirmation link. Pick one:

- **Easiest for a small alpha:** in **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. Testers sign up with an email and password and play right away. "Email me a sign-in link" and "Forgot your password?" still need email, so they won't work for testers until you do the next option.
- **Best:** connect an email service under **Authentication → Emails → SMTP Settings**. Resend, Brevo, Postmark and SendGrid all have free tiers. Their docs have a "Supabase SMTP" page with the exact values to paste.

See [Supabase: Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) for details.

## Step 5 (optional): Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com), create a project, then **APIs & Services → Credentials → Create credentials → OAuth client ID** (type: Web application).
2. Supabase shows the **Callback URL** to paste into Google under **Authentication → Sign In / Providers → Google**. Paste Google's client ID and secret back into Supabase and turn Google on.
3. In `config.js`, set `googleSignIn: true`, and upload the folder again.

## Reading feedback and bug reports

Testers can send feedback from the title screen or the in-game **Menu**. The game also reports the first few errors in each session by itself.

- In Supabase, open **Table Editor → feedback**, or **SQL Editor** and run `select * from feedback_inbox;` for a tidy list, newest first.
- `kind` is `bug`, `balance`, `idea`, `other`, or `error` (automatic reports).
- `context` has the game version, screen size, browser and where the tester was in their campaign.
- If the tester attached their game, `save_state` holds it. To play their exact campaign: copy the `save_state` value into a file ending in `.json`, then in the game choose **Load game → Import a save file**.

## Updating the game

From GitHub (option A), updates go live on their own when the new version is pushed. With drag and drop (option B): when you get a new build, keep your `config.js` and replace everything else. In Cloudflare, open the project, select **Create a new deployment**, choose **Production**, and drag the folder in. Players' saves aren't affected. Saves from older builds are upgraded when they load.

## Trying it on your own computer

Sign-in needs the page to be served from a web address, not opened as a file. In this folder, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Good to know

- Each player keeps their three most recent campaigns as autosaves, plus six save slots. Cloud saves are about 100–300 KB each, well inside Supabase's free 500 MB.
- A free Supabase project pauses after a week with no activity. Sign-in and cloud saves stop until you open the project in the Supabase dashboard and select **Restore**. Steady testing keeps it awake.
- Anyone who can open the site can sign up and send feedback. That's fine for an alpha you share by link. If spam ever shows up, the game will need a CAPTCHA added before you turn one on in Supabase, since the sign-up form has to send it.
- To reset a tester's account, delete them under **Authentication → Users**. Their saves are deleted with them.
