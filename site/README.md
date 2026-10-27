# Overmaster: putting the alpha online

This folder is the whole website. It works in two modes:

- **Without accounts.** Upload the folder as it is. Anyone can play, saves stay in each player's browser, and players can export a save to a file.
- **With accounts.** Connect a free Supabase project (about 15 minutes). Players sign in with Google or email, keep their saves in the cloud and continue on any device. Feedback and automatic error reports land in a table you can read.
- **With the shop.** Add Stripe (step 6) to sell the paid villains. Without it, every villain is unlocked.

What's in the folder:

| File | What it is |
|---|---|
| `index.html` | The game |
| `config.js` | The only file you edit: your Supabase address and key |
| `vendor/` | three.js (3D graphics) and the Supabase sign-in library |
| `supabase/schema.sql` | The database setup you paste into Supabase |
| `supabase/functions/` (in the repository) | The shop's two server functions, pasted into Supabase |
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

## Step 5: Google sign-in

Players sign in with Google first, with email as a backup.

1. In the [Google Cloud console](https://console.cloud.google.com), create a project. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**) and fill in the app name (Overmaster), your support email and, before launch, links to your privacy policy and terms.
2. Under **Clients** (or **Credentials → Create credentials → OAuth client ID**), create a **Web application** client.
3. In Supabase, open **Authentication → Sign In / Providers → Google**. Supabase shows a **Callback URL**: paste it into the Google client's **Authorized redirect URIs**. Then paste Google's **client ID** and **client secret** into Supabase and turn Google on.
4. In `config.js`, set `googleSignIn: true` and push (or upload) the site again.

While Google's consent screen is in **Testing**, only the test users you list can sign in. Publish it (**Audience → Publish app**) when you're ready for everyone. Basic sign-in (name and email) doesn't need Google's full app review, but Google may check your app name and logo.

## Step 6: The shop (Stripe)

The shop sells the four paid villains ($2.99 CAD each, or $7.99 for all four). Two small server functions do the work: `checkout` opens Stripe's payment page, and `stripe-webhook` hears back from Stripe and unlocks the villains. Everything below starts in Stripe's **test mode**, where only test cards work and no real money moves.

**A. The database.** In Supabase, open **SQL Editor**, paste the whole of `supabase/schema.sql` again and click **Run**. It's safe to re-run, and it adds the `entitlements` (unlocks) and `purchases` tables.

**B. Stripe.**
1. Sign up at [stripe.com](https://dashboard.stripe.com/register). You can test before activating the account.
2. Make sure you're in a **sandbox** (test mode): the dashboard says so at the top.
3. Open **Developers → API keys** and copy the **Secret key** (it starts with `sk_test_`). Keep it secret: it goes into Supabase only, never into `config.js` or GitHub.

**C. The two functions.** In Supabase, open **Edge Functions**:
1. Select **Deploy a new function → Via Editor**. Name it `checkout`, replace the sample code with the whole of `supabase/functions/checkout/index.ts` from the repository, and select **Deploy function**.
2. Do the same for `stripe-webhook`, with `supabase/functions/stripe-webhook/index.ts`.
3. Open each function's settings and **turn off JWT verification** (the toggle is called *Verify JWT* or *Enforce JWT verification*). Both functions check who's calling themselves: `checkout` asks Supabase who's signed in, and `stripe-webhook` checks Stripe's signature.
4. Open **Edge Functions → Secrets** and add:
   - `STRIPE_SECRET_KEY`: the `sk_test_…` key from Stripe.
   - `SITE_URLS`: your game's address, for example `https://overmaster.example.workers.dev`. Add any other addresses it runs at, separated by commas.

**D. The webhook.**
1. In Stripe, open **Workbench → Webhooks** (or **Developers → Webhooks**) and select **Create an event destination**.
2. Choose **Your account**, and for the payload choose **Snapshot** (not Thin).
3. Select these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` and `charge.refunded`.
4. Choose **Webhook endpoint** and enter `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`. Use your project address, the same one as in `config.js`.
5. Reveal the **Signing secret** (it starts with `whsec_`) and add it in Supabase as one more secret: `STRIPE_WEBHOOK_SECRET`.

**E. Switch the shop on.** In `config.js`, set `store: true` and push. The four paid villains now show a lock and a price, and the title screen has a **Shop**.

**F. Try it.** Sign in, pick the Vampire Lord and select **Unlock**. On Stripe's page, pay with the test card `4242 4242 4242 4242`, any future date, any CVC and any postcode. You land back in the game and the lock comes off within a few seconds. In Supabase, `select * from sales;` lists the purchase. To test a refund, refund the payment in Stripe: the unlock is taken back.

**G. Going live.**
1. Activate your Stripe account: your identity, a bank account, and a website that shows what you sell, your refund policy, terms and how to reach you.
2. Repeat B to D in live mode: a live secret key (`sk_live_…`), and a live webhook with its own signing secret. Replace both secrets in Supabase.
3. Taxes are yours to handle, since you're the seller. To have Stripe Tax calculate and add sales tax at checkout, turn on Stripe Tax in Stripe, then add the secret `STRIPE_TAX` with the value `on`. Talk to an accountant about GST/HST, BC PST, and VAT on sales abroad.

**Codes for giveaways and beta testers.** Players redeem codes in their account window (**Redeem a code**), from the Shop, or by opening a link like `https://your-game-address/?redeem=OVM-7KQ2-XH9D`. If they aren't signed in yet, the link asks them to sign in first and keeps the code. Codes only need Supabase (step 1 and part A above), not Stripe. Until Stripe is set up, the paid villains show their locks and a player who tries to buy one is told the shop isn't taking payments yet and pointed to codes.

**The admin's codes panel (0.31).** Make yourself an admin and you can make and manage codes inside the game, with no SQL. Sign in to the game once (so your account exists), then run this in the SQL Editor with the email you signed in with:

```sql
insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
```

Open the game, then your account window: a **Codes** button appears. It makes random single-use codes (up to 200 at a time) or one shared code you choose with a limit on how many players can use it, for all four villains or one, with a label and an optional expiry date. It gives you each code with its link to copy, and lists your recent codes, how often each was used, by whom, and a switch to turn one off.

Or make them in the SQL Editor:

```sql
-- 20 single-use codes for the Vampire Lord (one player each)
select * from make_codes(array['villain-vampire'], 20);

-- 50 codes for all four villains, with a label the player sees, expiring at New Year
select * from make_codes(array['bundle-dark-court'], 50, 1, 'Beta tester thank-you', '2027-01-01');

-- one code you choose, shared by up to 100 players
select make_code('BETA2026', array['bundle-dark-court'], 100, 'Overmaster beta');
```

- `make_codes` gives codes like `OVM-7KQ2-XH9D`. They're random enough that nobody can guess one, and a player who types ten wrong codes in an hour has to wait.
- Each player can redeem a code once. A player who already owns everything a code unlocks is told so, and the code isn't used up.
- `select * from code_report;` lists every code, how often it's been used, and by whom. To switch a code off: `update codes set active = false where code = 'BETA2026';` (codes are stored without dashes).
- The unlocks a code can give are `villain-demon`, `villain-archmage`, `villain-vampire`, `villain-deathknight` and `bundle-dark-court` (all four). New packs get added to `known_skus()` in `schema.sql` when they're made.

To unlock something for one player directly, without a code:

```sql
insert into public.entitlements (user_id, sku, source)
select id, 'villain-vampire', 'gift' from auth.users where email = 'player@example.com';
```

Stripe **promotion codes** (discounts at checkout) also work. Create them in Stripe under **Product catalog → Coupons**.

**If something goes wrong.** In Supabase, **Edge Functions → (function) → Logs** shows each call. In Stripe, open the webhook's **Event deliveries** to see whether Stripe reached it and what came back. A `400 Bad signature` means `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's secret: test mode and live mode have different secrets.

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
