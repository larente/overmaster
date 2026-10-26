# Overmaster: free to play, villains to unlock (plan, October 2026)

## Decisions so far (26 October 2026)
1. The game is free. The Lich and the Ancient Dragon are free villains.
2. The Demon Prince, Archmage, Vampire Lord and Death Knight cost **$2.99 CAD each**, or **all four for $7.99** (the Dark Court bundle).
3. Payments go through **Stripe** directly. Alex is the seller, so sales tax is Alex's to handle (see "Money and tax").
4. Players sign in with **Google**, with email as a backup. A signed-in player's saves and unlocks follow them to every device.
5. Later content comes in bundles, for example a Paladin pack: a new class and five new heroes.
6. Each villain gets features of its own, so a paid villain plays differently, not just looks different.

## What players see
- **Anyone can play without an account**, with the two free villains. Saves stay in the browser, as they do now.
- **The villain picker shows all six.** The four paid ones carry a small lock and price. Picking one still shows everything about it: its story, its powers, and a short list of what's different about playing it. The button that would start the campaign becomes **Unlock for $2.99**, with **Get all four for $7.99** under it.
- **Buying:** if the player isn't signed in, the sign-in window opens first ("so your unlock follows you to any device"). Then Stripe's own checkout page opens; Apple Pay and Google Pay work there. After paying, they land back in the game, the lock is gone, and a toast says thank you.
- **Fair bundle price:** a player who already owns some villains pays only for the rest, up to $7.99. Owning one, the other three cost $7.99. Owning two, the last two cost $5.98.
- **A Shop entry on the title screen** lists every unlock, what the player owns, and a **Restore purchases** button for when an unlock hasn't shown up yet.
- **Campaigns already started keep working**, even if the player later signs out. Locks only apply to new campaigns.
- **The Claude preview has everything unlocked.** So does any copy of the site without the store switched on, so nothing changes for testers until the store is ready.

**Open question: try before you buy?** Let anyone play a paid villain through the first week of a campaign, then ask them to unlock it to continue. That's usually the strongest reason to buy: they've already felt how it plays. Recommended, but your call.

## What makes each villain worth playing
Today the villains differ in their final fight, in their minions' perks and in their story. That's not enough to sell. Each villain now gets a **signature**: a rule on the map that changes how you play the Dark Tower, plus a short research branch only it can use. The free villains get signatures too, because they're the free sample that shows what the paid ones are like.

| Villain | Signature on the map | Its own research (3 picks) | In the final fight (already built) |
|---|---|---|---|
| **Lich** (free) | **Harvest of Bones.** When one of your bands is wiped out, some of the fallen rise as skeletons at your nearest lair the next night. **The Phylactery** is hidden somewhere on the map: if the heroes don't find and break it before the finale, the Lich rises again at full strength once. | Grave Tithe (graveyards on the map give ore and cheap skeletons) · Bone Legion (bigger skeleton bands) · Second Phylactery (a decoy the heroes may chase) | Soul Rend, Call Servants, Phylactery |
| **Ancient Dragon** (free) | **The Hoard.** Gold left in the tower's purse is the dragon's hoard: the bigger it is, the more HP the dragon has at the finale, but the heroes carry it all off if they win. Spend it on monsters, or let it pile up? **Wing Over:** once a week the dragon flies out and burns one spot you can see: a hero camp, a mine, or a band of the wilds. | Kobold Tunnels (kobolds dig faster in hills) · Scorched Earth (burned ground stays burned and slows the heroes) · Drake Roost (an exclusive lair of young drakes) | Fire Breath, Frightful Presence |
| **Demon Prince** ($2.99) | **Rifts.** Instead of building lairs over days, the Prince tears a rift open overnight anywhere his imps have seen, for gold and a sacrifice (a band or a minion). Rifts spawn fiends every night and spread **corruption** to the ground around them: corrupted ground slows and wears down the heroes and makes demons hit harder. Millbrook's Temple can cleanse it, so the town you also run pushes back. | Pact of Ash (sacrifice a band for gold on the spot) · Burning Roads (corruption spreads along roads) · Gate of the Ninth Pit (one great rift that releases a pit lord) | Fire Aura, Hellfire, Call Servants |
| **Archmage** ($2.99) | **Mana and map spells.** Her clay servants tap ley-line crystals for mana, a fourth resource. Mana pays for one spell a day: **Scry** (see an area), **Teleport** (send a band to any of your lairs at once), **Illusion** (a fake band that pulls the heroes off their route for a day), **Time Stop** (the heroes lose a day; once a week). Research is her strength: it costs a third less and she can run more at once. She keeps fewer lairs, but her animated-armor bands are tougher. | Ley Mastery (more mana) · Mirror Bands (illusions can fight) · Grand Library (a fourth research slot) | Meteor Swarm, Blink, Mirror Image, Time Stop |
| **Vampire Lord** ($2.99) | **The Night Court.** Send thralls into Millbrook in disguise. Each one quietly drains a little of the town's gold to the tower every night and can stall a building. The heroes may unmask them, which gives you a big story moment and costs you the thrall. **Blood Moon:** once a week, one night where every band moves twice as far and heals fully. **Bats** scout the fog without minions. A band that beats a hero drinks and gains a level. | Red Court (charm a hero so they skip a fight) · Bloodline (an exclusive lair of vampire spawn) · Eternal Night (the finale happens at night: double regeneration) | Charm, Call Servants, Regeneration |
| **Death Knight** ($2.99) | **The Black Legion.** Bands can join one great host under the Death Knight's banner. The Legion gains ranks (I to V) as it wins or survives fights, and takes orders: Hold a site, March a road, or Raid Millbrook's farms to cut the town's income. **The Challenge:** once a week the Death Knight rides out and challenges one hero to a duel. If the hero wins, they get big XP and the Death Knight starts the finale wounded. If he wins, that hero is out for two days. | Honor Guard (a bigger guard in the finale) · Dread Banners (the Legion frightens bands of the wilds into joining) · Oath of Ruin (raids burn a Millbrook building back a level) | Hellfire Orb, Lord of the Damned |

Each signature is about one build of work, tested with the campaign simulator for balance. **Suggested order:** the Vampire Lord first, because draining the heroes' town that you also run is the clearest example of what makes Overmaster different. Then the Lich and the Dragon (the free sample), then the Death Knight, the Archmage and the Demon Prince.

## Bundles and future packs
- Every unlock is a product in one catalog. A bundle is a product that grants several unlocks (the Dark Court grants four).
- **Hero packs** use the same system. A Paladin pack would add a new class (heavy armour, Lay on Hands, Smite, a protective aura) and five paladins, one for each race, with pixel art, portraits, talking heads and voices. Suggested price $3.99. Pack heroes show in the party picker with a small lock, like the villains.
- Further ideas in the same shape: new villains, a second map biome, a hero class per pack.

## How it works
- **Database (Supabase):** two new tables. `entitlements` lists what each player has unlocked; players can read their own rows but never write them. `purchases` is a log of every Stripe checkout. Only the server writes to either.
- **Two small server functions (Supabase Edge Functions):**
  - `checkout`: the game calls it when a signed-in player clicks Unlock. It checks the product and the price on the server (the game never sends a price), works out the fair bundle price, and opens a Stripe Checkout page.
  - `stripe-webhook`: Stripe calls it when a payment succeeds. It checks Stripe's signature, then writes the unlocks. It removes them again if you refund the payment in Stripe.
- **In the game:** a signed-in player's unlocks are read when they sign in and remembered in the browser, so they keep working offline. The store only switches on when `config.js` says `store: true` and accounts are set up. Until then, everything is unlocked.
- **Gifts and promo codes:** you can unlock anything for anyone with one line of SQL in Supabase (for testers, streamers or support), and Stripe promotion codes work at checkout.
- **Steam, later:** Steam requires purchases in a Steam game to go through Steam, so on Steam the villains would be DLC. The game checks ownership the same way, with Steam as another source of unlocks.
- **Cheating:** it's a browser game, so a determined player can unlock things on their own computer by editing the code. Cloud saves and the unlock list are safe on the server. That's normal for small web games and not worth fighting at this price.

## Money and tax
- **Stripe's fee** on a Canadian card is about 2.9% + 30¢, so roughly 39¢ of a $2.99 sale and 53¢ of a $7.99 bundle. International cards cost a little more.
- **Taxes, since you're the seller.** This is information to check with an accountant, not advice:
  - GST/HST: registration isn't required until taxable sales pass $30,000 over four quarters (the small-supplier rule).
  - BC PST applies to software. A BC seller with $10,000 or less in yearly retail sales and no established business premises can be exempt; check whether that covers you.
  - EU and UK VAT on digital sales to their residents applies from the first sale for sellers outside those regions.
  - Stripe Tax can calculate and collect these taxes for about 0.5% a sale, but registering and filing stay with you. It's one switch in the checkout function.
- **Before taking real money**, Stripe asks for your identity, a bank account and a website with a refund policy, terms and contact details. Google's sign-in screen asks for a privacy policy link. I can draft simple versions of these pages for you to review.

## Build steps
1. **Store foundation, in test mode** (in progress): tables, the two functions, locks, the Shop, the unlock flow and Google-first sign-in. It's tested with Stripe's test cards, so no real money moves.
2. **Your setup:** Supabase, Google sign-in and a Stripe account in test mode, following `site/README.md`. Then one test purchase together.
3. **Villain signatures**, one build at a time, starting with the Vampire Lord.
4. **Launch:** policy pages, Stripe live keys, and ideally your own domain (about $15 a year), so the sign-in and checkout pages show your name.
