// Runs site/schema.sql in PGlite (Postgres compiled to WebAssembly) with stand-ins for Supabase's
// auth schema and roles, then tests the promo-code functions.
// Needs: npm i @electric-sql/pglite (anywhere on the module path). Run: node tools/test_codes_sql.mjs
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(process.env.PGLITE_FROM || import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  insert into auth.users values ('00000000-0000-4000-8000-000000000001', 'one@x.test'), ('00000000-0000-4000-8000-000000000002', 'two@x.test'),
    ('00000000-0000-4000-8000-000000000003', 'three@x.test'), ('00000000-0000-4000-8000-000000000004', 'four@x.test');
`);
const schema = fs.readFileSync(new URL('../site/schema.sql', import.meta.url), 'utf8');
await db.exec(schema); await db.exec(schema);   // safe to run twice
check(true, 'schema.sql runs, twice');
const U = n => `00000000-0000-4000-8000-00000000000${n}`;
const as = async n => db.exec(`select set_config('test.uid', '${n ? U(n) : ''}', false)`);
const redeem = async (n, code) => { await as(n); return (await db.query('select redeem_code($1) as r', [code])).rows[0].r; };
const owned = async n => (await db.query('select sku from entitlements where user_id = $1 order by sku', [U(n)])).rows.map(r => r.sku).join(',');

const codes = (await db.query(`select * from make_codes(array['villain-vampire'], 3)`)).rows.map(r => Object.values(r)[0]);
check(codes.length === 3 && codes.every(c => /^OVM-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(c)), 'make_codes gives OVM-XXXX-XXXX codes: ' + codes.join(' '));
let err = null; try { await db.query(`select * from make_codes(array['villain-vampyre'], 1)`); } catch (e) { err = e.message; }
check(/Unknown unlock "villain-vampyre"/.test(err || ''), 'a misspelled unlock is refused: ' + err);
let r = await redeem(0, codes[0]);
check(r.ok === false && /Sign in/.test(r.error), 'a guest is asked to sign in');
r = await redeem(1, ' ' + codes[0].toLowerCase().replace(/-/g, ' ') + ' ');
check(r.ok === true && r.unlocked.join() === 'villain-vampire', 'redeems typed in lower case with spaces');
check(await owned(1) === 'villain-vampire', 'the unlock is written');
check((await db.query(`select source, ref from entitlements where user_id = $1`, [U(1)])).rows[0].ref === 'code:' + codes[0].replace(/-/g, ''), 'it records which code');
r = await redeem(1, codes[0]);
check(r.ok === false && /already redeemed/.test(r.error), 'the same player cannot redeem twice');
r = await redeem(2, codes[0]);
check(r.ok === false && /used up/.test(r.error), 'a single-use code is used up');
const beta = (await db.query(`select make_code('beta-2026', array['bundle-dark-court'], 2, 'Overmaster beta') as k`)).rows[0].k;
check(beta === 'BETA2026', 'make_code stores BETA2026');
r = await redeem(1, 'Beta2026');
check(r.ok && r.unlocked.slice().sort().join() === 'villain-archmage,villain-deathknight,villain-demon' && r.label === 'Overmaster beta', 'a bundle code unlocks what is missing: ' + JSON.stringify(r));
r = await redeem(2, 'BETA-2026');
check(r.ok && r.unlocked.length === 4, 'second player gets all four');
r = await redeem(3, 'BETA2026');
check(!r.ok && /used up/.test(r.error), 'a 2-use code is used up after two players');
await db.exec(`insert into entitlements (user_id, sku, source) values ('${U(4)}', 'bundle-dark-court', 'gift')`);
r = await redeem(4, codes[1]);
check(!r.ok && /already own everything/.test(r.error), 'owning the bundle counts as owning the vampire; the code stays unused');
check((await db.query(`select uses from codes where code = $1`, [codes[1].replace(/-/g, '')])).rows[0].uses === 0, 'and its use is not spent');
await db.exec(`select make_code('OLDCODE1', array['villain-demon'], null, null, now() - interval '1 day')`);
r = await redeem(3, 'OLDCODE1');
check(!r.ok && /expired/.test(r.error), 'an expired code is refused');
await db.exec(`select make_code('OFFCODE1', array['villain-demon']); update codes set active = false where code = 'OFFCODE1'`);
r = await redeem(3, 'OFFCODE1');
check(!r.ok && /doesn't exist/.test(r.error), 'a switched-off code looks like no code');
err = null; try { await db.query(`select make_code('AB1', array['villain-demon'])`); } catch (e) { err = e.message; }
check(/at least 6/.test(err || ''), 'short custom codes are refused');
for (let i = 0; i < 8; i++) await redeem(3, 'WRONG' + i + 'XYZ');   // with OFFCODE1 that's 9 wrong
r = await redeem(3, 'WRONGLAST'); check(!r.ok && /doesn't exist/.test(r.error), 'tenth wrong code still answered');
r = await redeem(3, codes[2]);
check(!r.ok && /Too many/.test(r.error), 'after ten wrong codes in an hour, even a good code waits');
await db.exec(`update code_attempts set at = now() - interval '2 hours'`);
r = await redeem(3, codes[2]);
check(r.ok && r.unlocked.join() === 'villain-vampire', 'an hour later it works');
const rep = (await db.query(`select code, uses, max_uses, redeemed_by from code_report where code = 'BETA2026'`)).rows[0];
check(rep.uses === 2 && /one@x.test, two@x.test/.test(rep.redeemed_by), 'code_report lists who redeemed it');
// the SQL list of unlocks must match the game's catalog
const shop = fs.readFileSync(new URL('../shop.js', import.meta.url), 'utf8');
const inShop = [...shop.matchAll(/'((?:villain|bundle|heroes|pack)-[a-z-]+)':\s*\{/g)].map(m => m[1]).sort().join();
const inSql = (await db.query(`select array_to_string(array(select unnest(known_skus()) order by 1), ',') as k`)).rows[0].k;
check(inShop === inSql, 'known_skus() matches shop.js: ' + inSql);
