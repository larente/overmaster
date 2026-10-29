#!/usr/bin/env python3
"""Overmaster: make character sprites with PixelLab.

Run it in Terminal:
    python3 ~/Documents/bts-art/pixellab_gen.py test     # 7 characters to try the look
    python3 ~/Documents/bts-art/pixellab_gen.py all      # the whole cast
    python3 ~/Documents/bts-art/pixellab_gen.py brakka goblin   # just these
    python3 ~/Documents/bts-art/pixellab_gen.py --redo hydra    # make one again, replacing it
    python3 ~/Documents/bts-art/pixellab_gen.py portraits       # a bust portrait for everyone made so far
    python3 ~/Documents/bts-art/pixellab_gen.py portraits brakka goblin   # just these
    python3 ~/Documents/bts-art/pixellab_gen.py objects         # map buildings, landmarks and icons
    python3 ~/Documents/bts-art/pixellab_gen.py objects library tower-lich   # just these
    python3 ~/Documents/bts-art/pixellab_gen.py colossus drake hellhound irongolem werewolf rider   # each villain's own monster
    python3 ~/Documents/bts-art/pixellab_gen.py objects villain-lairs   # and their lairs
    python3 ~/Documents/bts-art/pixellab_gen.py objects defences   # Millbrook's walls and towers (0.30)
    python3 ~/Documents/bts-art/pixellab_gen.py talk            # talking portraits: mouth shapes for everyone who speaks, lip-sync for their lines
    python3 ~/Documents/bts-art/pixellab_gen.py talk ione pip   # just these heroes
    python3 ~/Documents/bts-art/pixellab_gen.py talk villains   # 0.31: the six villains (or: talk heroes, talk monsters)
    python3 ~/Documents/bts-art/pixellab_gen.py intro           # 0.34: the intro's storyteller and its 10 scenes (from intro.json)
    python3 ~/Documents/bts-art/pixellab_gen.py intro scenes    # just the scenes (or: intro storyteller, intro A G)

It reads your PixelLab token from pixellab-token.txt (or the .rtf TextEdit makes) in this folder and
never prints it. Each character's 8 directions are saved in out/<name>/. Progress goes to log.txt.
Only needs the Python that comes with macOS.
"""
import base64, json, os, re, ssl, subprocess, sys, tempfile, threading, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.pixellab.ai/v2'
OUT = os.path.join(HERE, 'out')
LOG = os.path.join(HERE, 'log.txt')
SIZE = 128                     # canvas size in pixels (128 costs the same as 96 on create-character-v3)
ENDPOINTS = ['/create-character-v3', '/create-character-with-8-directions', '/create-character-pro']
STYLE = dict(view='low top-down', outline='single color black outline', shading='medium shading', detail='medium detail')
WORKERS = 3

CAST = {
    # heroes
    'brakka': ('Brakka Stonejaw', 'burly human barbarian man, wild copper-red hair and braided red beard, fur cloak over brown leather armor, huge two-handed axe'),
    'thrain': ('Thrain Emberbeard', 'stocky dwarf berserker, dark auburn hair, long fiery orange braided beard, grey-brown leathers with brass fittings, heavy greataxe'),
    'grukka': ('Grukka Two-Teeth', 'scarred half-orc pit fighter man, grey-green skin, long black hair, two big lower tusks, rust-red fighting harness with chains, spiked maul'),
    'sylvaine': ('Sylvaine Thornwild', 'wild elf woman warrior, long pale golden hair, moss-green hide armor with leaf trim, tribal war paint, long spear'),
    'bramble': ('Bramble Hardfoot', 'small furious halfling man barbarian, messy brown hair, rust-orange tunic with tan trim, oversized hand axe'),
    'vex': ('Vex Nightbloom', 'slender elf woman rogue, long black hair, dark green fitted leather armor with olive trim, twin daggers'),
    'pip': ('Pip Thistledown', 'cheerful halfling man thief, curly ginger hair, olive-green jerkin with mustard trim, lockpicks on belt, short sword'),
    'sable': ('Sable Marrow', 'human woman rogue, brown skin, long black hair, charcoal and plum long coat with lavender trim, jeweled dagger'),
    'korra': ('Korra Blackgum', 'half-orc woman thief, green skin, dark brown hair, dark red-brown leathers, showy red cape, curved knife'),
    'nilsa': ('Nilsa Copperlock', 'dwarf woman trapsmith, braided copper hair, ochre work leathers with amber trim, tool belt, small crossbow'),
    'ione': ('Sister Ione', 'human woman cleric healer, honey-blonde hair, white robes with gold trim, holy symbol, light mace'),
    'durgan': ('Brother Durgan Ironpsalm', 'dwarf war priest, grey hair, big silver-white beard, cream robes over chainmail with gold trim, warhammer and hymnbook'),
    'wren': ('Mother Wren Applebough', 'older halfling woman priestess, grey-blonde bun, beige robes with bronze trim, wooden staff and donation box'),
    'aelith': ('Aelith Dawnsong', 'elf woman sun priestess, long pale gold hair, ivory robes with bright gold sun symbols, sun-disc staff'),
    'ushka': ('Ushka the Mender', 'half-orc woman monk healer, grey-green skin, black hair in a topknot, simple cream robes, prayer beads, heavy quarterstaff'),
    'orrin': ('Orrin Quill', 'old human wizard scholar, white hair and long white beard, deep blue robes with yellow trim, wooden staff, scroll'),
    'maelis': ('Maelis Vane', 'elf woman sorceress, long silver-lilac hair, deep purple robes with pale violet runes, glowing spellbook'),
    'tobias': ('Tobias Inkfoot', 'halfling man wizard, brown hair, teal robes with gold trim, satchel of books, short staff'),
    'esk': ('Esk Grimmbrew', 'dwarf runesmith wizard, dark brown hair and beard, brick-red robes with glowing orange runes, rune hammer'),
    'zarga': ('Zarga Bonereader', 'half-orc woman seer, grey-green skin, long black hair with bone beads, brown robes with bone-white trim, carved staff'),
    # monsters
    'goblin': ('Goblin', 'scrawny green goblin, big pointed ears, ragged leather, rusty short blade'),
    'wolf': ('Wolf', 'large grey wolf, snarling', 'dog'),
    'bandit': ('Bandit', 'human highway bandit, hood and face scarf, patched leather armor, short sword'),
    'skeleton': ('Skeleton', 'undead skeleton warrior, yellowed bones, rusted helmet, cracked round shield and old sword'),
    'orc': ('Orc Archer', 'muscular orc archer, dark green skin, crude iron armor, big recurve bow'),
    'ogre': ('Ogre', 'hulking ogre monster, grey-green warty skin, huge round pot belly, small bald head, jutting underbite with tusks, ragged hide loincloth, giant spiked wooden club'),
    'wraith': ('Wraith', 'hooded wraith of shadow and tattered black cloth, glowing pale eyes, no legs, trailing smoke'),
    'troll': ('Troll', 'hunched long-armed troll, mossy grey-green skin, long claws, stringy hair'),
    'giant': ('Hill Giant', 'hulking hill giant in furs, crude stone club, wild beard'),
    'dragon': ('Young Dragon', 'young red dragon, wings half spread', 'lion'),
    'vampire': ('Vampire', 'aristocratic vampire, pale skin, slicked black hair, high-collared black and crimson coat'),
    'hydra': ('Hydra', 'five-headed hydra beast, a huge scaly dark green swamp reptile standing on four thick clawed legs, no arms, five long serpent necks each ending in a snapping snake head, thick tail', 'lion'),
    'demon': ('Pit Demon', 'towering horned pit demon, red-black skin with burning cracks, bat wings, flaming whip'),
    'knight': ('Hollow Knight', 'empty suit of dark plate armor walking on its own, cold blue light inside the helmet, longsword and kite shield'),
    # each villain's own monster (0.24)
    'colossus': ('Bone Colossus', 'hulking giant made of hundreds of fused yellowed bones and skulls, rib-cage chest, massive bone fists, hunched and lumbering, green glow inside the ribs'),
    'drake': ('Drake', 'young copper-orange drake, a lean small dragon with leathery wings half spread, long tail, sharp horns, standing on four legs', 'lion'),
    'hellhound': ('Hellhound', 'huge black demonic hound with cracks of glowing orange fire in its skin, burning eyes, smoke rising from its back, snarling', 'dog'),
    'irongolem': ('Iron Golem', 'towering iron golem of riveted dark steel plates, glowing blue runes on the chest and arms, heavy square head with glowing slit eyes, huge fists'),
    'werewolf': ('Werewolf', 'hulking brown-grey werewolf standing on two legs, wolf head, long claws, torn trousers, muscular and hunched, feral yellow eyes'),
    'rider': ('Black Rider', 'cursed knight in black plate armor riding a black warhorse with glowing red eyes, long black lance, tattered dark cloak', 'horse'),
    # villains
    'villain-lich': ('The Lich', 'skeletal lich sorcerer-king, cracked iron crown, tattered black and violet royal robes, skull-topped staff, green fire in the eye sockets'),
    'villain-dragon': ('The Ashen Wyrm', 'enormous ancient dragon, ash-grey scales with glowing ember cracks, wings spread', 'lion'),
    'villain-demon': ('The Demon Prince', 'towering demon prince wreathed in fire, great curled horns, obsidian armor, flaming sword'),
    'villain-archmage': ('The Archmage', 'regal woman archmage, flowing midnight-blue robes covered in stars, floating spellbook, hands glowing with arcane light'),
    'villain-vampire': ('The Crimson Count', 'tall vampire lord, pale skin, black hair, crimson and black regal coat with high collar, cruel smile'),
    'villain-deathknight': ('The Oathbreaker', 'cursed death knight in black spiked plate armor, glowing red eyes in the helmet, huge greatsword'),
    # minions
    'thrall': ('Bone Thrall', 'small undead skeleton laborer with a pickaxe and a battered sack'),
    'kobold': ('Kobold', 'small scaly reddish kobold miner with a pick and a sack of gold coins'),
    'imp': ('Imp', 'small red winged imp, little horns and tail, mischievous grin'),
    'golem': ('Clay Servant', 'squat clay golem made of red-brown terracotta, smooth featureless clay body, bald clay head, no clothes, no hair, glowing blue runes carved into its chest, glowing eyes, holding a wooden mallet'),
    'ghoul': ('Thrall', 'pale hollow-eyed human servant in worn crimson and black livery, carrying a lantern'),
    'digger': ('Grave Digger', 'hooded hunchbacked grave digger with a spade and a lantern'),
}
TEST = ['brakka', 'vex', 'ione', 'orrin', 'goblin', 'thrall', 'villain-lich']

_lock = threading.Lock()
def log(*a):
    s = ' '.join(str(x) for x in a)
    with _lock:
        print(s, flush=True)
        with open(LOG, 'a') as f:
            f.write(time.strftime('%Y-%m-%d %H:%M:%S ') + s + '\n')


# ---------------- the token (never printed) ----------------
def rtf_text(raw):
    """plain text from an RTF file: drops header groups, control words and braces"""
    out, i, n, skip = [], 0, len(raw), []
    depth = 0
    while i < n:
        c = raw[i]
        if c == '{':
            depth += 1
            m = re.match(r'\{\\(\*|fonttbl|colortbl|stylesheet|info|expandedcolortbl)', raw[i:])
            skip.append(bool(m) or (skip[-1] if skip else False))
            i += 1; continue
        if c == '}':
            depth -= 1
            if skip: skip.pop()
            i += 1; continue
        if c == '\\':
            m = re.match(r"\\'([0-9a-fA-F]{2})", raw[i:])
            if m:
                if not (skip and skip[-1]): out.append(chr(int(m.group(1), 16)))
                i += 4; continue
            m = re.match(r'\\([a-zA-Z]+)(-?\d+)? ?', raw[i:])
            if m:
                if m.group(1) in ('par', 'line') and not (skip and skip[-1]): out.append('\n')
                i += len(m.group(0)); continue
            if i + 1 < n:
                if not (skip and skip[-1]) and raw[i + 1] in '\\{}': out.append(raw[i + 1])
                elif not (skip and skip[-1]) and raw[i + 1] == '\n': out.append('\n')
                i += 2; continue
        if not (skip and skip[-1]): out.append(c)
        i += 1
    return ''.join(out)

def read_token():
    for fn in sorted(os.listdir(HERE)):
        if not fn.lower().startswith('pixellab-token'):
            continue
        raw = open(os.path.join(HERE, fn), 'rb').read().decode('utf-8', 'replace')
        if raw.lstrip().startswith('{\\rtf'):
            raw = rtf_text(raw)
        cands = re.findall(r'[A-Za-z0-9][A-Za-z0-9_\-\.]{14,}[A-Za-z0-9]', raw)
        if cands:
            return max(cands, key=len)
    return None


# ---------------- HTTP (urllib, or curl if Python's certificates aren't set up) ----------------
USE_CURL = [False]
def http(method, url, body=None, token=None, timeout=180):
    if not url.startswith('http'):
        url = API + url
    headers = {'Accept': 'application/json', 'User-Agent': 'overmaster-art/1'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if not USE_CURL[0]:
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()
        except urllib.error.URLError as e:
            if 'CERTIFICATE' in str(e).upper() or isinstance(getattr(e, 'reason', None), ssl.SSLError):
                log('(Python has no web certificates here; using curl instead)')
                USE_CURL[0] = True
            else:
                raise
    return curl(method, url, data, headers, timeout)

def curl(method, url, data, headers, timeout):
    cfg = ['url = "%s"' % url, 'request = "%s"' % method, 'silent', 'show-error', 'max-time = %d' % timeout,
           'write-out = "\\n%{http_code}"']
    for k, v in headers.items():
        cfg.append('header = "%s: %s"' % (k, v))
    tmp = None
    if data is not None:
        fd, tmp = tempfile.mkstemp(suffix='.json'); os.write(fd, data); os.close(fd)
        cfg.append('data-binary = "@%s"' % tmp)
    try:
        p = subprocess.run(['curl', '-K', '-'], input='\n'.join(cfg).encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    finally:
        if tmp: os.remove(tmp)
    body, _, code = p.stdout.rpartition(b'\n')
    try:
        return int(code), body
    except ValueError:
        raise RuntimeError('curl failed: ' + p.stderr.decode()[:300])


# ---------------- reading PixelLab's API spec ----------------
def load_spec():
    path = os.path.join(HERE, 'openapi.json')
    try:
        code, b = http('GET', '/openapi.json')
        if code == 200:
            open(path, 'wb').write(b)
    except Exception as e:
        log('could not download the API spec:', e)
    return json.load(open(path)) if os.path.exists(path) else None

def deref(spec, s, depth=0):
    while isinstance(s, dict) and '$ref' in s and depth < 30:
        s = spec['components']['schemas'][s['$ref'].split('/')[-1]]; depth += 1
    return s if isinstance(s, dict) else {}

def concrete(spec, s):
    """the first non-null alternative of a schema"""
    s = deref(spec, s)
    for k in ('anyOf', 'oneOf', 'allOf'):
        for sub in s.get(k, []):
            d = deref(spec, sub)
            if d.get('type') != 'null':
                return concrete(spec, d)
    return s

def enum_of(spec, s):
    s = deref(spec, s)
    if 'enum' in s:
        return s['enum']
    if 'const' in s:
        return [s['const']]
    for k in ('anyOf', 'oneOf', 'allOf'):
        vals = []
        for sub in s.get(k, []):
            e = enum_of(spec, sub)
            if e:
                vals += e
        if vals:
            return vals
    return None

def pick(options, v):
    for o in options:
        if str(o).lower() == str(v).lower():
            return o
    for o in options:
        if str(o).lower().startswith(str(v).lower()) or str(v).lower().startswith(str(o).lower()):
            return o
    return None

def size_value(spec, s, want):
    c = concrete(spec, s)
    props = c.get('properties', {})
    if 'width' in props:
        def fit(p):
            d = concrete(spec, p)
            v = want
            if 'enum' in d: v = min(d['enum'], key=lambda x: abs(x - want))
            if 'maximum' in d: v = min(v, d['maximum'])
            if 'minimum' in d: v = max(v, d['minimum'])
            return int(v)
        return {'width': fit(props['width']), 'height': fit(props.get('height', props['width']))}
    e = enum_of(spec, s)
    if e:
        return min(e, key=lambda x: abs((x if isinstance(x, (int, float)) else 0) - want))
    v = want
    if 'maximum' in c: v = min(v, c['maximum'])
    if 'minimum' in c: v = max(v, c['minimum'])
    return int(v)

def build(spec, endpoint, want):
    op = spec['paths'][endpoint]['post']
    sch = deref(spec, op['requestBody']['content']['application/json']['schema'])
    props, req = sch.get('properties', {}), sch.get('required', [])
    body, notes = {}, []
    for k, v in want.items():
        if k not in props:
            continue
        if k == 'image_size':
            body[k] = size_value(spec, props[k], v); continue
        e = enum_of(spec, props[k])
        if e is not None and isinstance(v, str):
            m = pick(e, v)
            if m is None:
                notes.append('%s=%r not offered (%s)' % (k, v, ', '.join(map(str, e))[:200])); continue
            v = m
        body[k] = v
    missing = [r for r in req if r not in body]
    return body, missing, notes, sorted(props)


# ---------------- results ----------------
def find_images(obj, path=''):
    out = []
    if isinstance(obj, dict):
        b = obj.get('base64')
        if isinstance(b, str) and len(b) > 80:
            return [(path or 'image', b)]
        for k, v in obj.items():
            out += find_images(v, (path + '.' if path else '') + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out += find_images(v, '%s.%d' % (path, i))
    elif isinstance(obj, str) and obj.startswith('data:image'):
        out.append((path or 'image', obj))
    return out

def find_urls(obj, path=''):
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            out += find_urls(v, (path + '.' if path else '') + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out += find_urls(v, '%s.%d' % (path, i))
    elif isinstance(obj, str) and obj.startswith('http') and re.search(r'\.(png|webp|gif|zip)(\?|$)', obj):
        out.append((path, obj))
    return out

def find_key(obj, key):
    if isinstance(obj, dict):
        if obj.get(key) not in (None, ''):
            return obj[key]
        for v in obj.values():
            r = find_key(v, key)
            if r not in (None, ''):
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_key(v, key)
            if r not in (None, ''):
                return r
    return None

def strip(obj):
    if isinstance(obj, dict):
        return {k: ('<image>' if k == 'base64' and isinstance(v, str) else strip(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [strip(v) for v in obj]
    if isinstance(obj, str) and obj.startswith('data:image'):
        return '<image>'
    return obj

def safe(p):
    return re.sub(r'[^A-Za-z0-9_.-]+', '_', p).strip('._') or 'image'

def save_images(folder, found):
    n = 0
    for path, b in found:
        if b.startswith('data:'):
            b = b.split(',', 1)[1]
        raw = base64.b64decode(b)
        ext = 'gif' if raw[:3] == b'GIF' else 'webp' if raw[8:12] == b'WEBP' else 'png'
        open(os.path.join(folder, safe(path) + '.' + ext), 'wb').write(raw); n += 1
    return n

def save_json(folder, name, obj):
    with open(os.path.join(folder, name + '.json'), 'w') as f:
        json.dump(strip(obj), f, indent=1)


# ---------------- one character ----------------
REDO = [False]

def make(spec, tok, key):
    title, desc = CAST[key][0], CAST[key][1]
    template = CAST[key][2] if len(CAST[key]) > 2 else 'mannequin'
    folder = os.path.join(OUT, key); os.makedirs(folder, exist_ok=True)
    # already paid for on an earlier run: just collect the pictures
    prev = os.path.join(folder, 'submit.json')
    if os.path.exists(prev) and not REDO[0]:
        cid = find_key(json.load(open(prev)), 'character_id')
        if cid:
            n = collect(tok, folder, cid, key)
            if n:
                open(os.path.join(folder, 'done.txt'), 'w').write('collected\n')
                log('%s: collected %d images from the earlier run' % (key, n)); return 'ok', 0.0
    if REDO[0]:
        # keep the earlier pictures in previous/, in case the new ones are worse
        old = [f for f in os.listdir(folder) if f.endswith('.png')]
        if old:
            keep = os.path.join(folder, 'previous'); os.makedirs(keep, exist_ok=True)
            for f in old:
                os.replace(os.path.join(folder, f), os.path.join(keep, f))
    want = dict(description=desc, name=title, image_size=SIZE, no_background=True, template_id=template, **STYLE)
    for ep in ENDPOINTS:
        if ep not in spec.get('paths', {}):
            continue
        body, missing, notes, props = build(spec, ep, want)
        if missing:
            log('  %s: %s needs %s, trying the next way' % (key, ep, missing)); continue
        for nte in notes:
            log('  %s: %s' % (key, nte))
        log('%s: asking %s (%s)' % (key, ep, ', '.join('%s=%s' % (k, v if k != 'description' else '...') for k, v in body.items())))
        t_wait = time.time()
        while True:
            code, b = http('POST', ep, body, tok)
            if code != 429 or time.time() - t_wait > 90 * 60:
                break
            time.sleep(15)
        try:
            resp = json.loads(b or b'{}')
        except ValueError:
            resp = {'raw': b[:500].decode('utf-8', 'replace')}
        save_json(folder, 'submit', resp)
        if code in (401, 402):
            log('%s: STOP: %s %s' % (key, code, json.dumps(strip(resp))[:300])); return 'stop', 0.0
        if code >= 400:
            log('%s: %s refused (%s): %s' % (key, ep, code, json.dumps(strip(resp))[:700])); continue
        cost = float(find_key(resp, 'usd') or 0)
        jid = find_key(resp, 'background_job_id') or find_key(resp, 'job_id')
        final = resp
        if jid and not find_images(resp):
            t0 = time.time(); last = 0
            while time.time() - t0 < 25 * 60:
                time.sleep(5)
                code, b = http('GET', '/background-jobs/%s' % jid, None, tok)
                if code == 429:
                    continue
                try:
                    final = json.loads(b)
                except ValueError:
                    continue
                st = str(final.get('status', '')).lower()
                if st in ('completed', 'complete', 'succeeded', 'success', 'done', 'failed', 'error', 'cancelled'):
                    break
                if time.time() - last > 60:
                    last = time.time(); log('  %s: still working (%d min)' % (key, (time.time() - t0) // 60))
            save_json(folder, 'result', final)
            if str(final.get('status', '')).lower() in ('failed', 'error', 'cancelled'):
                log('%s: failed: %s' % (key, json.dumps(strip(final))[:600])); continue
            cost = cost or float(find_key(final, 'usd') or 0)
        n = save_images(folder, find_images(final))
        cid = find_key(final, 'character_id') or find_key(resp, 'character_id')
        if cid and not n:
            n = collect(tok, folder, cid, key)
        if n:
            open(os.path.join(folder, 'done.txt'), 'w').write(ep + '\n')
            log('%s: done, %d images ($%.3f)' % (key, n, cost)); return 'ok', cost
        log('%s: finished but no images found; saved the reply for Claude to look at' % key)
        return 'empty', cost
    log('%s: no way worked' % key)
    return 'fail', 0.0


def collect(tok, folder, cid, key):
    """download a character's direction images once PixelLab has them"""
    t0 = time.time()
    while time.time() - t0 < 15 * 60:
        code, b = http('GET', '/characters/%s' % cid, None, tok)
        if code == 200:
            d = json.loads(b); save_json(folder, 'character', d)
            st = str(d.get('status', 'completed')).lower()
            if st == 'failed':
                log('%s: PixelLab says this character failed' % key); return 0
            if d.get('rotation_urls'):
                n = save_images(folder, find_images(d))
                for path, url in find_urls(d.get('rotation_urls')):
                    c2, raw = http('GET', url, None, None)
                    if c2 == 200:
                        ext = url.split('?')[0].rsplit('.', 1)[-1]
                        open(os.path.join(folder, safe('rotation_urls.' + path) + '.' + ext), 'wb').write(raw); n += 1
                return n
        time.sleep(10)
    return 0


PORTRAIT_SIZE = 128   # 16, 32, 48, 64, 128 or 160
NO_PORTRAIT = {'hydra'}   # PixelLab's portrait tool expects one face; these keep a token cut from their sprite

def gens_left(tok):
    try:
        code, b = http('GET', '/balance', None, tok)
        return float(json.loads(b)['subscription']['generations'])
    except Exception:
        return None

def make_portrait(tok, key):
    """a bust portrait drawn from the character's front-facing sprite (PixelLab's character_to_portrait)"""
    folder = os.path.join(OUT, key)
    src, dst = os.path.join(folder, 'rotation_urls.south.png'), os.path.join(folder, 'portrait.png')
    if not os.path.exists(src):
        log('%s: no character yet, so no portrait' % key); return 'skip'
    if os.path.exists(dst) and not REDO[0]:
        return 'had'
    body = {'direction': 'character_to_portrait', 'view': STYLE['view'], 'result_size': PORTRAIT_SIZE,
            'image': {'type': 'base64', 'base64': base64.b64encode(open(src, 'rb').read()).decode(), 'format': 'png'}}
    log('%s: asking for a portrait' % key)
    t_wait = time.time()
    while True:
        code, b = http('POST', '/portrait-character-pro', body, tok)
        if code != 429 or time.time() - t_wait > 90 * 60:
            break
        time.sleep(15)
    try:
        resp = json.loads(b or b'{}')
    except ValueError:
        resp = {'raw': b[:300].decode('utf-8', 'replace')}
    save_json(folder, 'portrait-submit', resp)
    if code in (401, 402):
        log('%s: STOP: %s %s' % (key, code, json.dumps(strip(resp))[:300])); return 'stop'
    if code >= 400:
        log('%s: portrait refused (%s): %s' % (key, code, json.dumps(strip(resp))[:500])); return 'fail'
    jid = find_key(resp, 'background_job_id')
    final, t0, last = resp, time.time(), 0
    while jid and time.time() - t0 < 20 * 60:
        time.sleep(6)
        code, b = http('GET', '/background-jobs/%s' % jid, None, tok)
        if code != 200:
            continue
        try:
            final = json.loads(b)
        except ValueError:
            continue
        st = str(final.get('status', '')).lower()
        if st in ('completed', 'failed', 'error', 'cancelled'):
            break
        if time.time() - last > 60:
            last = time.time(); log('  %s: portrait still working (%d min)' % (key, (time.time() - t0) // 60))
    save_json(folder, 'portrait-result', final)
    if str(final.get('status', '')).lower() != 'completed':
        log('%s: portrait failed: %s' % (key, json.dumps(strip(final))[:400])); return 'fail'
    found = find_images(final)
    raw = None
    if found:
        b64 = found[0][1]
        raw = base64.b64decode(b64.split(',', 1)[1] if b64.startswith('data:') else b64)
    else:
        code, b = http('GET', '/portrait-character-pro/%s' % jid, None, tok)
        url = find_key(json.loads(b), 'download_url') if code == 200 else None
        if url:
            c2, raw = http('GET', url, None, None)
            raw = raw if c2 == 200 else None
    if not raw:
        log('%s: portrait finished but no picture found; saved the reply for Claude' % key); return 'empty'
    if os.path.exists(dst):
        keep = os.path.join(folder, 'previous'); os.makedirs(keep, exist_ok=True); os.replace(dst, os.path.join(keep, 'portrait.png'))
    open(dst, 'wb').write(raw)
    log('%s: portrait done' % key); return 'ok'

def portraits(tok, keys):
    keys = [k for k in keys if k not in NO_PORTRAIT and (REDO[0] or not os.path.exists(os.path.join(OUT, k, 'portrait.png')))]
    if not keys:
        log('Every character already has a portrait.'); return
    # the first one alone, to see what a portrait costs
    before = gens_left(tok)
    r = make_portrait(tok, keys[0]); results = {keys[0]: r}
    after = gens_left(tok)
    if before is not None and after is not None and r == 'ok':
        log('one portrait cost %g generations; %d more to go, about %g in all; %g left' % (before - after, len(keys) - 1, (before - after) * (len(keys) - 1), after))
    if r != 'stop':
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {k: ex.submit(make_portrait, tok, k) for k in keys[1:]}
            for k, f in futs.items():
                try:
                    results[k] = f.result()
                except Exception as e:
                    results[k] = 'error'; log('%s: error %s' % (k, e))
    log('portraits: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    log('generations left: %s' % gens_left(tok))
    log('All finished. Tell Claude in the chat.')

# map buildings, landmarks, objects and small icons: key -> (description, size in pixels)
OBJECTS = {
    # sites
    'town': ('small medieval walled market town, grey stone walls with round towers, red and blue tiled roofs, a windmill, cosy fantasy village', 256),
    'tower': ('the Dark Tower, a tall menacing black stone tower with iron spikes and glowing purple windows, an evil sorcerer citadel on a rocky base', 256),
    # the Dark Tower, one for each villain
    'tower-lich': ("the Lich's tower: a tall bone-white and black spire built of fused skulls and ribs, sickly green witch-fire burning in its windows and on its crown, on a rocky base", 256),
    'tower-dragon': ("the dragon's lair: a jagged black volcanic rock spire with a huge dragon skull over the cave gate, lava glowing in its cracks, smoke and embers, gold coins heaped at its foot", 256),
    'tower-demon': ("the Demon Prince's tower: a twisted obsidian spire crowned with two great curling horns, red hellfire pouring from its windows, chains and iron spikes, on cracked burning ground", 256),
    'tower-archmage': ("the Archmage's tower: a tall slender midnight-blue stone wizard tower with a starry domed observatory roof, glowing runestones floating around it, bright arcane windows", 256),
    'tower-vampire': ("the vampire's castle: a tall gothic keep of dark stone with pointed spires, crimson banners, red-lit stained-glass windows, bats circling, a spiked iron gate", 256),
    'tower-deathknight': ("the Oathbreaker's fortress: a grim black iron-plated keep with spiked battlements, tattered black banners, red glowing arrow slits, a giant sword driven into the rock by its gate", 256),
    # each villain's tower grows with research: tower-lich is stage 1, tower-lich-2 ... tower-lich-5 (optional, 24 pictures)
    'tower-lich-2': ("the Lich's tower of fused skulls and ribs with green witch-fire, taller, with a walled courtyard at its foot", 256),
    'tower-lich-3': ("the Lich's tower of fused skulls and ribs with green witch-fire, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-lich-4': ("the Lich's tower of fused skulls and ribs with green witch-fire, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-lich-5': ("the Lich's tower of fused skulls and ribs with green witch-fire, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'tower-dragon-2': ("the dragon's black volcanic spire with lava in its cracks and gold at its foot, taller, with a walled courtyard at its foot", 256),
    'tower-dragon-3': ("the dragon's black volcanic spire with lava in its cracks and gold at its foot, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-dragon-4': ("the dragon's black volcanic spire with lava in its cracks and gold at its foot, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-dragon-5': ("the dragon's black volcanic spire with lava in its cracks and gold at its foot, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'tower-demon-2': ("the Demon Prince's twisted obsidian spire with curling horns and hellfire, taller, with a walled courtyard at its foot", 256),
    'tower-demon-3': ("the Demon Prince's twisted obsidian spire with curling horns and hellfire, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-demon-4': ("the Demon Prince's twisted obsidian spire with curling horns and hellfire, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-demon-5': ("the Demon Prince's twisted obsidian spire with curling horns and hellfire, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'tower-archmage-2': ("the Archmage's midnight-blue wizard tower with an observatory dome and floating runestones, taller, with a walled courtyard at its foot", 256),
    'tower-archmage-3': ("the Archmage's midnight-blue wizard tower with an observatory dome and floating runestones, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-archmage-4': ("the Archmage's midnight-blue wizard tower with an observatory dome and floating runestones, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-archmage-5': ("the Archmage's midnight-blue wizard tower with an observatory dome and floating runestones, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'tower-vampire-2': ("the vampire's gothic castle of dark stone with crimson banners and red windows, taller, with a walled courtyard at its foot", 256),
    'tower-vampire-3': ("the vampire's gothic castle of dark stone with crimson banners and red windows, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-vampire-4': ("the vampire's gothic castle of dark stone with crimson banners and red windows, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-vampire-5': ("the vampire's gothic castle of dark stone with crimson banners and red windows, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'tower-deathknight-2': ("the Oathbreaker's black iron-plated keep with spiked battlements and a giant sword at the gate, taller, with a walled courtyard at its foot", 256),
    'tower-deathknight-3': ("the Oathbreaker's black iron-plated keep with spiked battlements and a giant sword at the gate, much larger, a citadel with outer walls, two smaller towers and a gatehouse", 256),
    'tower-deathknight-4': ("the Oathbreaker's black iron-plated keep with spiked battlements and a giant sword at the gate, a vast dark fortress with several towers, high walls and a bridge over a chasm", 256),
    'tower-deathknight-5': ("the Oathbreaker's black iron-plated keep with spiked battlements and a giant sword at the gate, an enormous throne-fortress towering into storm clouds, ringed by walls, spires and burning braziers", 256),
    'woods': ("hermit's glade: a small thatched cottage with a stone well and a ring of standing stones among a few trees", 192),
    'mine': ('old silver mine: a dark tunnel opening framed with heavy wooden beams, cut into a big grey rocky hillside, mine cart on rails coming out, a hanging lantern', 192),
    'crypt': ('sunken crypt: a mossy stone crypt half-sunk in swamp water, carved arch doorway with strange glowing runes', 192),
    'peaks': ("giant's overlook: a tall rocky crag with a stone lookout platform and a banner on top", 192),
    # lairs
    'warren': ('goblin warren: a burrow entrance under a thorny mound with crude wooden spikes, bones and a goblin banner', 160),
    'kennel': ('wolf den: a dark cave entrance in a big mossy boulder outcrop, gnawed bones and a skull scattered on the ground in front', 160),
    'hideout': ("bandits' hideout: a ramshackle wooden shack with a lookout platform, crates and a campfire", 160),
    'bonecrypt': ('bone crypt: a small grim stone mausoleum with skulls over the door and cracked tombstones', 160),
    'camp': ('orc war camp: hide tents behind a sharpened wooden palisade with crude red banners', 160),
    'den': ('ogre den: a muddy fighting pit ringed with sharpened logs and a crude hut of hides', 160),
    'barrow': ('haunted barrow: an ancient grass-covered grave mound with a stone doorway leaking ghostly blue light', 160),
    'fens': ('troll bog: a crude stilt hut over black swamp water with reeds and rotting logs', 160),
    'hold': ("giant's hold: a rough stone hall built from huge boulders with enormous wooden doors", 192),
    'keep': ('vampire manor: a dark gothic manor house with shuttered red-lit windows and a spiked iron fence', 192),
    'mire': ('hydra mire: a drowned grove of dead twisted trees standing in green stinking swamp water', 160),
    'roost': ('dragon roost: a jagged rocky crag heaped with gold coins and a big nest of bones', 192),
    'abyss': ('demon pit: a glowing red crack in scorched black ground with fire, brimstone and jagged rocks', 160),
    'building': ('construction site: wooden scaffolding, stacked lumber and stone blocks, a half-built wooden structure', 128),
    'library': ('the Forbidden Library: a small dark stone library tower with a domed roof, stained-glass windows glowing purple, stacks of old books and a reading lectern by the door', 160),
    'wrecked': ('destroyed ruins: collapsed charred wooden walls with no roof, broken beams lying in rubble and ash, glowing embers', 128),
    # Millbrook's buildings (0.19): the heroes' town, warm and friendly, the opposite of your tower
    't-market': ('village market stall: a striped red and cream awning over a wooden stall piled with crates of apples, cabbages and sacks of grain, a few coins on the counter', 128),
    't-sawmill': ('small village sawmill: a timber shed with a big round saw blade, stacked planks and logs beside it, a little water wheel on the side', 128),
    't-ironworks': ('village ironworks: a small stone furnace with a tall brick chimney and orange glow, a pile of iron ingots and a cart of grey ore', 128),
    't-smith': ('village blacksmith: an open timber forge with an anvil, glowing coals, swords and a shield hanging on the wall, a water barrel', 128),
    't-temple': ('small white stone village temple with a golden dome and a sun symbol over the door, two candles by the steps, warm light inside', 128),
    't-guild': ('mage guild: a slim blue stone tower with a pointed purple roof, star patterns, a glowing crystal at its tip, scrolls by the door', 128),
    't-yard': ('training yard: a fenced dirt square with straw practice dummies, a weapon rack with wooden swords and spears, an archery target', 128),
    't-tavern': ("village tavern: a cosy two-storey timber inn with a thatched roof, warm yellow windows, a hanging sign with a tankard, a bench outside", 128),
    # 0.20, the town views: each level of a building gets its own picture (t-market is level 1, t-market-2 level 2...)
    't-market-2': ('village market: three striped red and cream stalls side by side with bunting strung between them, crates of fruit, barrels and a wooden cart', 144),
    't-market-3': ('covered market hall: a long timber hall with an open arcade of wooden pillars and a red tiled roof, stalls and crates inside, a weathervane on top', 160),
    't-sawmill-2': ('village sawmill: a timber mill house with a big wooden water wheel on its side, stacks of planks and logs, a saw blade glinting through the door', 144),
    't-sawmill-3': ('large sawmill: a two-storey timber mill with two water wheels, a log ramp and towering stacks of cut planks', 160),
    't-ironworks-2': ('village ironworks: a stone furnace house with a tall brick chimney puffing smoke, orange glow at the door, piles of iron ingots', 144),
    't-ironworks-3': ('large ironworks: two stone furnaces glowing orange with tall chimneys, bellows, carts of grey ore and stacked iron bars', 160),
    't-smith-2': ('village blacksmith: a stone forge with a slate roof, glowing coals in the hearth, an anvil out front, racks of swords and shields', 144),
    't-smith-3': ("master armourer's forge: a large two-storey stone and timber smithy building with a slate roof and a tall smoking chimney, a wide open front with a glowing forge, suits of armour on stands and weapon racks outside, the whole building filling the picture", 160),
    't-temple-2': ('village temple: a white stone church with a golden dome and a bell tower, stained-glass windows, steps up to its open doors', 160),
    't-guild-2': ('mage guild: a tall slim blue stone tower with two purple pointed roofs, a big glowing crystal floating above the top, star patterns on the walls', 144),
    't-yard-2': ('training grounds: a wooden barracks hall with a banner beside a wide fenced dirt yard, several straw dummies, archery targets and weapon racks, seen from above, the whole yard filling the picture', 160),
    't-tavern-2': ('busy village inn: a large two-storey timber tavern with a thatched roof, glowing windows, a hanging tankard sign, tables and barrels outside', 160),
    't-board': ('village notice board: a small wooden board on two posts with a little shingled roof, paper notices and wanted posters pinned to it', 96),
    # Millbrook's hall grows as the town does: t-hall at first, then t-hall-2 ... t-hall-5
    't-hall': ('hamlet hall: a small timber meeting hall with a thatched roof, a wooden porch and a little bell on a post, a red banner by the door', 160),
    't-hall-2': ('village hall: a two-storey timber and stone hall with a red tiled roof, a small bell tower and a blue banner over the door', 176),
    't-hall-3': ('town hall: a stone town hall with red and blue roofs, a clock tower, banners and a little walled courtyard', 192),
    't-hall-4': ('city hall: a grand stone city hall with several wings, blue slate roofs, a tall clock tower and banners on the walls', 208),
    't-hall-5': ('capitol: a white stone castle palace with blue roofs and golden spires, high walls, flags flying from every tower', 224),
    # Millbrook's defences (0.30): the town builds them against your waves
    't-walls': ('a village palisade gate: a wooden gatehouse of sharpened logs with a short walkway on top, a stretch of log palisade on each side, a red banner over the gate', 176),
    't-walls-2': ('stone town walls: a sturdy grey stone gatehouse with an arched wooden gate and battlements, a stretch of stone wall on each side, blue banners', 176),
    't-walls-3': ('great town walls: a tall grey stone gatehouse with two round towers, a portcullis, battlements and flags, thick walls on each side', 192),
    't-watch': ('an archer tower: a small square wooden watchtower on stilts with a ladder, a roofed platform on top with a bow and a quiver of arrows', 128),
    't-watch-2': ('archer towers: a sturdy stone watchtower with a wooden roofed top, arrow slits, a red pennant and a rack of bows at its foot', 144),
    't-watch-3': ('a ring of archer towers: two tall stone watchtowers joined by a wooden walkway, arrow slits, banners and bundles of arrows', 160),
    't-ballista': ('a ballista: a huge wooden crossbow on a timber platform, aimed up, with a stack of giant iron-tipped bolts beside it', 128),
    't-ballista-2': ('a ballista tower: a squat stone tower with a huge wooden crossbow mounted on top and a pile of giant bolts', 144),
    't-arcane': ('an arcane defence tower: a slim blue stone tower with a glowing crystal on top crackling with blue fire, runes on its walls', 144),
    't-arcane-2': ('a great arcane tower: a tall blue stone tower with three floating crystals around its peak, blue fire and runes glowing', 160),
    't-bell': ('a temple bell: a big bronze bell hanging in a white stone arch with a little tiled roof, holy symbols carved on the stone, soft golden glow', 112),
    # the Dark Tower's works, raised by research
    't-library-2': ('the Forbidden Library with a new wing: a dark stone library with a domed roof and a second taller wing, purple stained-glass windows glowing, books piled at the door', 176),
    't-vigor': ('a small blood fountain: a black stone basin with dark red liquid bubbling, carved skulls around the rim', 112),
    't-vigor-2': ('a blood fountain: a tiered black stone fountain spilling dark red blood, carved skulls and bat wings, red glow', 128),
    't-vigor-3': ('a great blood fountain: a tall tiered black stone fountain gushing glowing red blood, a gargoyle on top, red mist around it', 144),
    't-raise': ('dark barracks: a long black timber hall with iron spikes on the roof, a rack of crude weapons and a war drum by the door, red torches', 160),
    't-dread': ('a black obelisk: a tall jagged black stone obelisk with glowing purple runes, swirling dark mist around its base', 112),
    't-ritual': ('a ritual altar: a black stone altar on a round dais with glowing red runes, candles and a curved dagger on top, a ring of standing stones', 128),
    't-masons': ("masons' yard: stacks of cut black stone blocks, a wooden crane with a pulley, chisels and a half-carved gargoyle", 144),
    't-hands': ('dark storehouse: a sturdy black timber storehouse with an iron-banded door, carts heaped with ore and gold, sacks and barrels', 144),
    't-treasury': ("the villain's treasury: an iron-bound vault door set in black rock with heaps of gold coins and jewels spilling out in front", 144),
    # resources: the raw spot, then the working site
    'dep-gold': ('gold deposit: a rocky outcrop with glittering gold veins', 128),
    'dep-lumber': ('a small stand of tall old trees ready to be cut', 128),
    'dep-ore': ('iron ore deposit: dark grey boulders with rusty red-brown ore veins', 128),
    'node-gold': ('small gold mine: timber-framed tunnel entrance in a rock with a mine cart full of gold nuggets', 128),
    'node-lumber': ('lumber camp: stacked logs, tree stumps and a chopping block with an axe', 128),
    'node-ore': ('ore mine: a rocky tunnel entrance with timber supports and a cart full of dark iron ore', 128),
    # each villain's own lair (0.24)
    'boneforge': ('bone forge: a dark stone furnace with a chimney of stacked skulls, glowing green fire inside, piles of bones and a huge half-built bone giant chained beside it', 160),
    'eyrie': ('drake eyrie: a tall jagged rock crag with big twig and bone nests on ledges, scorch marks, a few copper drake eggs', 160),
    'brimstone': ('brimstone kennels: smouldering black iron cages and pens on cracked red-glowing ground, sulphur smoke, gnawed bones', 160),
    'foundry': ('golem foundry: a large dark stone workshop building with a tall chimney, wide open doors showing a glowing blue rune circle and an anvil inside, iron golem parts and moulds stacked against the walls, the whole building', 160),
    'lodge': ('werewolf lodge: a dark wooden hunting lodge with wolf skulls over the door, claw marks on the walls, deep in a pine forest', 160),
    'stables': ('black stables: a long dark wooden stable building with a slate roof and a row of stall doors, black horses with glowing red eyes looking out, tattered black banners, the whole building', 160),
    # things on the map
    'chest': ('wooden treasure chest with iron bands, lid open, gold coins and gems inside', 96),
    'artifact': ('magic artifact: an ornate golden amulet floating above a small stone pedestal, magical glow', 96),
    'shrine': ('small healing shrine: a stone altar with a glowing blue crystal and candles', 112),
    'refugees': ('refugee camp: two patched tents, a campfire and bundles of belongings', 128),
    'omen': ('omen stone: a tall standing stone carved with a glowing purple sigil', 112),
    'stranger': ('a mysterious hooded stranger in a dark cloak standing beside a lantern post', 96),
    'pass': ('rope bridge over a narrow rocky gorge', 128),
    'captive': ('a wounded captive tied to a wooden post', 96),
    'riddle': ('riddle stone: a weathered stone tablet carved with glowing runes', 96),
    'tourney': ('jousting tournament: a striped pavilion tent, colourful pennants and a wooden tilt fence', 128),
    'pit': ('hidden pit trap: a hole in the ground partly covered with branches and leaves', 96),
    'rune': ('fire rune trap: a glowing red magic rune circle drawn on the ground', 96),
    'snare': ('snare trap: a rope loop on the ground tied to a bent sapling', 96),
    'quest': ('a parchment quest scroll with a red wax seal pinned to a small wooden signpost', 96),
    # small interface icons
    'hourglass': ('an ornate brass hourglass with glowing golden sand', 64),
    'lore': ('an old leather-bound spellbook glowing with purple magic', 64),
    'res-gold': ('a small pile of shiny gold coins', 64),
    'res-lumber': ('a stack of three cut wooden logs', 64),
    'res-ore': ('a pile of dark iron ore chunks with a few shiny flecks', 64),
}
OBJ_OUT = os.path.join(HERE, 'out-objects')

def make_object(tok, key):
    desc, size = OBJECTS[key]
    folder = os.path.join(OBJ_OUT, key); os.makedirs(folder, exist_ok=True)
    dst = os.path.join(folder, 'object.png')
    if os.path.exists(dst) and not REDO[0]:
        return 'had'
    body = {'description': desc, 'image_size': {'width': size, 'height': size}, 'view': 'high top-down',
            'outline': 'single color outline', 'shading': 'medium shading', 'detail': 'high detail' if size >= 128 else 'medium detail'}
    log('%s: asking for the object' % key)
    t_wait = time.time()
    while True:
        code, b = http('POST', '/map-objects', body, tok)
        if code != 429 or time.time() - t_wait > 90 * 60:
            break
        time.sleep(15)
    try:
        resp = json.loads(b or b'{}')
    except ValueError:
        resp = {'raw': b[:300].decode('utf-8', 'replace')}
    save_json(folder, 'submit', resp)
    if code in (401, 402):
        log('%s: STOP: %s %s' % (key, code, json.dumps(strip(resp))[:300])); return 'stop'
    if code >= 400:
        log('%s: refused (%s): %s' % (key, code, json.dumps(strip(resp))[:500])); return 'fail'
    oid = find_key(resp, 'object_id')
    t0, last, got = time.time(), 0, None
    while oid and time.time() - t0 < 15 * 60:
        time.sleep(5)
        code, b = http('GET', '/map-objects/%s' % oid, None, tok)
        if code == 200:
            try:
                got = json.loads(b)
            except ValueError:
                got = None
            if got and (find_key(got, 'download_url') or find_images(got)):
                break
        elif code == 410:
            log('%s: PixelLab says it failed: %s' % (key, b[:300].decode('utf-8', 'replace'))); return 'fail'
        if time.time() - last > 60:
            last = time.time(); log('  %s: still working (%d min)' % (key, (time.time() - t0) // 60))
    if not got:
        log('%s: timed out' % key); return 'fail'
    save_json(folder, 'result', got)
    found = find_images(got); raw = None
    if found:
        b64 = found[0][1]; raw = base64.b64decode(b64.split(',', 1)[1] if b64.startswith('data:') else b64)
    else:
        c2, raw = http('GET', find_key(got, 'download_url'), None, None)
        raw = raw if c2 == 200 else None
    if not raw:
        log('%s: finished but no picture; saved the reply for Claude' % key); return 'empty'
    if os.path.exists(dst):
        keep = os.path.join(folder, 'previous'); os.makedirs(keep, exist_ok=True); os.replace(dst, os.path.join(keep, 'object.png'))
    open(dst, 'wb').write(raw)
    log('%s: done' % key); return 'ok'

def objects(tok, keys):
    keys = [k for k in keys if REDO[0] or not os.path.exists(os.path.join(OBJ_OUT, k, 'object.png'))]
    if not keys:
        log('Every object is already made.'); return
    before = gens_left(tok)
    r = make_object(tok, keys[0]); results = {keys[0]: r}
    after = gens_left(tok)
    if before is not None and after is not None and r == 'ok':
        log('one object cost %g generations; %d more to go, about %g in all; %g left' % (before - after, len(keys) - 1, (before - after) * (len(keys) - 1), after))
    if r != 'stop':
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {k: ex.submit(make_object, tok, k) for k in keys[1:]}
            for k, f in futs.items():
                try:
                    results[k] = f.result()
                except Exception as e:
                    results[k] = 'error'; log('%s: error %s' % (k, e))
    log('objects: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    log('generations left: %s' % gens_left(tok))
    log('All finished. Tell Claude in the chat.')

# ---------------- talking portraits ----------------
TALK_VISEMES = 7

def make_talk(tok, key, lines, folder=None, mood='neutral'):
    """mouth shapes for one hero's portrait (paid once), then the lip-sync plan of each line (free).
    0.34: folder and mood let the intro's storyteller talk too (a second mood goes in talk-<mood>/)"""
    folder = folder or os.path.join(OUT, key); src = os.path.join(folder, 'portrait.png')
    talk = os.path.join(folder, 'talk' if mood == 'neutral' else 'talk-' + mood); os.makedirs(talk, exist_ok=True)
    if not os.path.exists(src):
        log('%s: no portrait yet, so it cannot talk' % key); return 'skip'
    order_file = os.path.join(talk, 'visemes.json')
    if not os.path.exists(order_file) or REDO[0]:
        body = {'portrait': {'type': 'base64', 'base64': base64.b64encode(open(src, 'rb').read()).decode(), 'format': 'png'},
                'mood': mood, 'viseme_count': TALK_VISEMES, 'no_background': True}
        log('%s: asking for mouth shapes' % key)
        t_wait = time.time()
        while True:
            code, b = http('POST', '/vocal-animation', body, tok)
            if code != 429 or time.time() - t_wait > 90 * 60: break
            time.sleep(15)
        try:
            resp = json.loads(b or b'{}')
        except ValueError:
            resp = {'raw': b[:300].decode('utf-8', 'replace')}
        if code in (401, 402):
            log('%s: STOP: %s %s' % (key, code, json.dumps(strip(resp))[:300])); return 'stop'
        if code >= 400:
            log('%s: mouth shapes refused (%s): %s' % (key, code, json.dumps(strip(resp))[:500])); return 'fail'
        jid = find_key(resp, 'background_job_id'); final = resp; t0 = time.time()
        while jid and time.time() - t0 < 20 * 60:
            time.sleep(10)
            code, b = http('GET', '/vocal-animation/%s' % jid, None, tok)
            if code != 200: continue
            try:
                final = json.loads(b)
            except ValueError:
                continue
            if str(final.get('status', '')).lower() in ('completed', 'failed', 'error'): break
        save_json(talk, 'result', final)
        vis = final.get('visemes') or {}
        if str(final.get('status', '')).lower() != 'completed' or not vis:
            log('%s: mouth shapes failed: %s' % (key, json.dumps(strip(final))[:400])); return 'fail'
        order = final.get('viseme_order') or final.get('completed_visemes') or list(vis)
        for vid, img in vis.items():
            b64 = img.get('base64') if isinstance(img, dict) else img
            if isinstance(b64, str) and b64.startswith('data:'): b64 = b64.split(',', 1)[1]
            open(os.path.join(talk, safe(vid) + '.png'), 'wb').write(base64.b64decode(b64))
        with open(order_file, 'w') as f:
            json.dump({'order': [o for o in order if o in vis] or list(vis), 'files': {v: safe(v) + '.png' for v in vis}}, f, indent=1)
        log('%s: %d mouth shapes' % (key, len(vis)))
    # the lip-sync plan for every line: which mouth, for how long, how far into the text (free)
    plans = {}
    for cat, text in lines.items():
        code, b = http('POST', '/lip-sync', {'text': text, 'viseme_count': TALK_VISEMES, 'frame_ms': 90, 'hold_ms': 0}, tok)
        if code == 200:
            d = json.loads(b); plans[cat] = {'text': text, 'order': d.get('viseme_order'), 'frames': d.get('frames')}
        else:
            log('%s/%s: lip-sync plan refused (%s)' % (key, cat, code))
    with open(os.path.join(talk, 'lines.json'), 'w') as f:
        json.dump(plans, f)
    log('%s: talking portrait ready (%d lines planned)' % (key, len(plans)))
    return 'ok'

def talk(tok, which):
    path = os.path.join(HERE, 'hero_lines.json')
    if not os.path.exists(path):
        sys.exit('hero_lines.json is missing. It goes next to this script.')
    data = json.load(open(path))
    # 0.31: the villains (their portraits are out/villain-<type>) and the monsters of the wilds talk too
    groups = {'heroes': {k: h for k, h in data['heroes'].items()},
              'villains': {v.get('key', 'villain-' + t): v for t, v in data.get('villains', {}).items()},
              'monsters': {t: m for t, m in data.get('monsters', {}).items()}}
    H = {}
    for g in groups.values(): H.update(g)
    keys = []
    for w in which or ['heroes', 'villains', 'monsters']:
        keys += list(groups[w]) if w in groups else [w]
    bad = [k for k in keys if k not in H]
    if bad:
        sys.exit('Unknown speakers: %s\nKnown: %s' % (', '.join(bad), ', '.join(H)))
    before = gens_left(tok); results = {}
    if keys:
        results[keys[0]] = make_talk(tok, keys[0], H[keys[0]]['lines'])
        after = gens_left(tok)
        if before is not None and after is not None and results[keys[0]] == 'ok':
            log('one talking portrait cost %g generations; %d more to go; %g left' % (before - after, len(keys) - 1, after))
    if len(keys) > 1 and results.get(keys[0]) != 'stop':
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {k: ex.submit(make_talk, tok, k, H[k]['lines']) for k in keys[1:]}
            for k, f in futs.items():
                try:
                    results[k] = f.result()
                except Exception as e:
                    results[k] = 'error'; log('%s: error %s' % (k, e))
    log('talking portraits: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    log('generations left: %s' % gens_left(tok))
    log('All finished. Tell Claude in the chat.')

# ---------------- the intro cinematic (0.34) ----------------
INTRO_OUT = os.path.join(HERE, 'out-intro')
INTRO_FLOOR = 40   # stop before PixelLab generations drop below this, so the game's own art can still be redone

def load_intro():
    for p in (os.path.join(HERE, 'intro.json'), os.path.join(HERE, 'intro', 'intro.json')):
        if os.path.exists(p):
            return json.load(open(p))
    sys.exit('intro.json is missing. It goes next to this script.')

def png_size(path):
    raw = open(path, 'rb').read(32)
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    return int.from_bytes(raw[16:20], 'big'), int.from_bytes(raw[20:24], 'big')

def b64img(path):
    return {'type': 'base64', 'base64': base64.b64encode(open(path, 'rb').read()).decode(), 'format': 'png'}

def pl_job(tok, path, body, label, poll='/background-jobs/%s', wait=20 * 60):
    """POST, then wait for the background job; returns (status, final reply)"""
    t_wait = time.time()
    while True:
        code, b = http('POST', path, body, tok)
        if code != 429 or time.time() - t_wait > 90 * 60:
            break
        time.sleep(15)
    try:
        resp = json.loads(b or b'{}')
    except ValueError:
        resp = {'raw': b[:300].decode('utf-8', 'replace')}
    if code in (401, 402):
        log('%s: STOP: %s %s' % (label, code, json.dumps(strip(resp))[:300])); return 'stop', resp
    if code >= 400:
        log('%s: refused (%s): %s' % (label, code, json.dumps(strip(resp))[:500])); return 'fail', resp
    jid = find_key(resp, 'background_job_id')
    if not jid:
        return 'ok', resp
    final, t0, last = resp, time.time(), time.time()
    while time.time() - t0 < wait:
        time.sleep(6)
        code, b = http('GET', poll % jid, None, tok)
        if code != 200:
            continue
        try:
            final = json.loads(b)
        except ValueError:
            continue
        st = str(final.get('status', '')).lower()
        if st in ('completed', 'failed', 'error', 'cancelled'):
            return ('ok' if st == 'completed' else 'fail'), final
        if time.time() - last > 60:
            last = time.time(); log('  %s: still working (%d min)' % (label, (time.time() - t0) // 60))
    return 'fail', final

def pl_images(final):
    """every picture in a reply, as PNG/WebP bytes, in order"""
    out = []
    for _, b64 in find_images(final):
        out.append(base64.b64decode(b64.split(',', 1)[1] if b64.startswith('data:') else b64))
    if not out:
        for _, url in find_urls(final):
            c2, raw = http('GET', url, None, None)
            if c2 == 200: out.append(raw)
    return out

def keep_old(dst):
    if os.path.exists(dst):
        keep = os.path.join(os.path.dirname(dst), 'previous'); os.makedirs(keep, exist_ok=True)
        os.replace(dst, os.path.join(keep, os.path.basename(dst)))

def intro_portrait(tok, data):
    """the storyteller's close-up: everything else of his is drawn from it"""
    folder = os.path.join(INTRO_OUT, 'storyteller'); os.makedirs(folder, exist_ok=True)
    dst = os.path.join(folder, 'portrait.png')
    if os.path.exists(dst) and not REDO[0]:
        return 'had'
    T = data['storyteller']; n = int(T.get('size', 256))
    body = {'description': T['look'], 'image_size': {'width': n, 'height': n}, 'no_background': True}
    log('storyteller: drawing his close-up')
    st, final = pl_job(tok, '/generate-image-v2', body, 'storyteller')
    save_json(folder, 'portrait-result', final)
    imgs = pl_images(final) if st == 'ok' else []
    if not imgs:
        return st if st == 'stop' else 'fail'
    keep_old(dst); open(dst, 'wb').write(imgs[0])
    log('storyteller: close-up done'); return 'ok'

def intro_scene(tok, data, sid):
    folder = os.path.join(INTRO_OUT, 'scenes'); os.makedirs(folder, exist_ok=True)
    dst = os.path.join(folder, sid + '.png')
    if os.path.exists(dst) and not REDO[0]:
        return 'had'
    S = data['scenes'][sid]; w, h = data.get('scene_size', [640, 360])
    body = {'description': '%s, %s' % (S['prompt'], data.get('scene_style', '')), 'image_size': {'width': w, 'height': h}, 'no_background': False}
    face = os.path.join(INTRO_OUT, 'storyteller', 'portrait.png')
    if os.path.exists(face):
        # the storyteller's close-up sets the pixel size, outline and shading of every scene, so they match; not its colours
        body['style_image'] = {'image': b64img(face), 'size': dict(zip(('width', 'height'), png_size(face) or (256, 256)))}
        body['style_options'] = {'color_palette': False, 'outline': True, 'detail': True, 'shading': True}
    refs = []
    for ref, use in S.get('refs', []):
        p = face if ref == 'storyteller' else os.path.join(HERE, ref)
        if os.path.exists(p) and png_size(p):
            w0, h0 = png_size(p)
            refs.append({'image': b64img(p), 'size': {'width': w0, 'height': h0}, 'usage_description': use[:500]})
        else:
            log('scene %s: no %s yet, so it goes without that reference' % (sid, ref))
    if refs:
        body['reference_images'] = refs[:4]
    log('scene %s (%s): asking' % (sid, S.get('name', sid)))
    st, final = pl_job(tok, '/generate-image-v2', body, 'scene ' + sid)
    save_json(folder, sid + '-result', final)
    imgs = pl_images(final) if st == 'ok' else []
    if not imgs:
        return st if st == 'stop' else 'fail'
    keep_old(dst); open(dst, 'wb').write(imgs[0])
    for i, raw in enumerate(imgs[1:], 2):
        open(os.path.join(folder, '%s-%d.png' % (sid, i)), 'wb').write(raw)
    log('scene %s: done' % sid); return 'ok'

def intro_moves(tok, data):
    """red eyes (an edit), then leaning in and blowing out the candle (animations), all from the close-up"""
    folder = os.path.join(INTRO_OUT, 'storyteller'); face = os.path.join(folder, 'portrait.png')
    if not os.path.exists(face):
        return {'moves': 'no close-up'}
    T = data['storyteller']; w, h = png_size(face) or (256, 256); res = {}
    eyes = os.path.join(folder, 'eyes.png')
    if os.path.exists(eyes) and not REDO[0]:
        res['eyes'] = 'had'
    else:
        log('storyteller: red eyes')
        st, final = pl_job(tok, '/edit-image-pixen', {'image': b64img(face), 'description': T['eyes'], 'width': w, 'height': h, 'no_background': True}, 'eyes')
        imgs = pl_images(final) if st == 'ok' else []
        if imgs:
            keep_old(eyes); open(eyes, 'wb').write(imgs[0]); res['eyes'] = 'ok'
        else:
            res['eyes'] = st if st == 'stop' else 'fail'
            if st == 'stop': return res
    for move, start in (('lean', face), ('blow', eyes if os.path.exists(eyes) else face)):
        mdir = os.path.join(folder, move)
        if os.path.isdir(mdir) and os.listdir(mdir) and not REDO[0]:
            res[move] = 'had'; continue
        frames = max(4, min(16, (524288 // (w * h)) // 2 * 2))
        log('storyteller: animating "%s" (%d frames)' % (move, frames))
        st, final = pl_job(tok, '/animate-with-text-v3', {'first_frame': b64img(start), 'action': T[move], 'frame_count': frames, 'no_background': True}, move)
        imgs = pl_images(final) if st == 'ok' else []
        if not imgs:
            res[move] = st if st == 'stop' else 'fail'
            if st == 'stop': return res
            continue
        if os.path.isdir(mdir):
            keep = os.path.join(folder, 'previous-' + move); os.makedirs(keep, exist_ok=True)
            for fn in os.listdir(mdir): os.replace(os.path.join(mdir, fn), os.path.join(keep, fn))
        os.makedirs(mdir, exist_ok=True)
        for i, raw in enumerate(imgs):
            open(os.path.join(mdir, '%02d.png' % i), 'wb').write(raw)
        res[move] = 'ok'
    return res

def intro(tok, which):
    """python3 pixellab_gen.py intro [storyteller] [scenes] [A B ...]: the storyteller and the scenes of the intro"""
    data = load_intro(); scenes = list(data['scenes'])
    which = which or ['storyteller', 'scenes']
    want_face = 'storyteller' in which
    want = scenes if 'scenes' in which else [w for w in which if w in scenes]
    bad = [w for w in which if w not in scenes and w not in ('storyteller', 'scenes')]
    if bad:
        sys.exit('Unknown intro parts: %s\nKnown: storyteller, scenes, %s' % (', '.join(bad), ', '.join(scenes)))
    os.makedirs(INTRO_OUT, exist_ok=True)
    before = gens_left(tok); results = {}
    log('--- %s: intro (%s) · %s generations left' % (time.strftime('%Y-%m-%d %H:%M'), ' '.join(which), before))
    def low():
        g = gens_left(tok)
        if g is not None and g < INTRO_FLOOR:
            log('Stopping: only %g PixelLab generations left (keeping %d in hand).' % (g, INTRO_FLOOR)); return True
        return False
    if want_face or not os.path.exists(os.path.join(INTRO_OUT, 'storyteller', 'portrait.png')):
        # the close-up comes first even for scenes alone: it sets their style
        results['storyteller'] = intro_portrait(tok, data)
        after = gens_left(tok)
        if before is not None and after is not None and results['storyteller'] == 'ok':
            log('his close-up cost %g generations; %g left' % (before - after, after))
        if results['storyteller'] == 'stop':
            want, want_face = [], False
    if want and not low():
        g0 = gens_left(tok)
        results['scene ' + want[0]] = intro_scene(tok, data, want[0])
        g1 = gens_left(tok)
        if g0 is not None and g1 is not None and results['scene ' + want[0]] == 'ok':
            log('one scene cost %g generations; %d more to go, about %g; %g left' % (g0 - g1, len(want) - 1, (g0 - g1) * (len(want) - 1), g1))
        if results['scene ' + want[0]] != 'stop' and len(want) > 1 and not low():
            with ThreadPoolExecutor(max_workers=WORKERS) as ex:
                futs = {sid: ex.submit(intro_scene, tok, data, sid) for sid in want[1:]}
                for sid, f in futs.items():
                    try:
                        results['scene ' + sid] = f.result()
                    except Exception as e:
                        results['scene ' + sid] = 'error'; log('scene %s: error %s' % (sid, e))
    if want_face and not low():
        results.update(intro_moves(tok, data))
        folder = os.path.join(INTRO_OUT, 'storyteller')
        lines = {l['id']: l['text'] for l in data['lines']}
        for mood in data['storyteller'].get('moods', ['neutral']):
            if low(): break
            results['talk ' + mood] = make_talk(tok, 'storyteller', lines, folder=folder, mood=mood)
    log('intro art: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    log('generations left: %s' % gens_left(tok))
    log('Intro art is in out-intro. All finished. Tell Claude in the chat.')

def main():
    args = sys.argv[1:] or ['test']
    if '--redo' in args:
        REDO[0] = True; args = [a for a in args if a != '--redo']
    if args and args[0] == 'intro':
        tok = read_token()
        if not tok:
            sys.exit('No token found. Save it in %s/pixellab-token.txt' % HERE)
        return intro(tok, args[1:])
    if args and args[0] == 'talk':
        tok = read_token()
        if not tok:
            sys.exit('No token found. Save it in %s/pixellab-token.txt' % HERE)
        log('--- %s: talking portraits' % time.strftime('%Y-%m-%d %H:%M'))
        return talk(tok, args[1:])
    mode = 'characters'
    if args and args[0] in ('portraits', 'objects'):
        mode = args[0]; args = args[1:] or ['all']
    known = OBJECTS if mode == 'objects' else CAST
    if mode == 'objects':
        # groups (0.20): 'millbrook' is every Millbrook building and level, 'darktower' the tower's works,
        # 'stages' every villain's tower as it grows (or 'stages-lich' for one villain)
        TOWER_WORKS = ('t-library-2', 't-vigor', 't-raise', 't-dread', 't-ritual', 't-masons', 't-hands', 't-treasury')
        groups = {'millbrook': [k for k in OBJECTS if k.startswith('t-') and not k.startswith(TOWER_WORKS)],
                  'darktower': [k for k in OBJECTS if k.startswith(TOWER_WORKS)] + (['library'] if 'library' in OBJECTS else []),
                  'stages': [k for k in OBJECTS if re.match(r'tower-[a-z]+-\d$', k)]}
        groups['villain-lairs'] = ['boneforge', 'eyrie', 'brimstone', 'foundry', 'lodge', 'stables']
        groups['defences'] = [k for k in OBJECTS if k.startswith(('t-walls', 't-watch', 't-ballista', 't-arcane', 't-bell'))]
        for v in ('lich', 'dragon', 'demon', 'archmage', 'vampire', 'deathknight'):
            groups['stages-' + v] = [k for k in OBJECTS if re.match(r'tower-%s-\d$' % v, k)]
        args = [k for a in args for k in groups.get(a, [a])]
    keys = TEST if args == ['test'] and mode != 'objects' else list(known) if args == ['all'] else args
    bad = [k for k in keys if k not in known]
    if bad:
        sys.exit('Unknown names: %s\nKnown: %s' % (', '.join(bad), ', '.join(known)))
    tok = read_token()
    if not tok:
        sys.exit('No token found. Save it in %s/pixellab-token.txt' % HERE)
    log('--- %s: %s, %d to do' % (time.strftime('%Y-%m-%d %H:%M'), mode, len(keys)))
    code, b = http('GET', '/balance', None, tok)
    if code == 401:
        sys.exit('PixelLab says the token is not valid (401). Check pixellab-token.txt.')
    log('balance:', b.decode('utf-8', 'replace')[:200])
    if mode == 'portraits':
        os.makedirs(OUT, exist_ok=True)
        return portraits(tok, keys)
    if mode == 'objects':
        os.makedirs(OBJ_OUT, exist_ok=True)
        return objects(tok, keys)
    spec = load_spec()
    if not spec:
        sys.exit('Could not read the PixelLab API spec.')
    os.makedirs(OUT, exist_ok=True)
    total, results = 0.0, {}
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {k: ex.submit(make, spec, tok, k) for k in keys if REDO[0] or not os.path.exists(os.path.join(OUT, k, 'done.txt'))}
        for k, f in futs.items():
            try:
                r, c = f.result()
            except Exception as e:
                r, c = 'error: %s' % e, 0.0
                log('%s: error %s' % (k, e))
            results[k] = r; total += c
    code, b = http('GET', '/balance', None, tok)
    log('done: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    log('spent about $%.2f; balance now %s' % (total, b.decode('utf-8', 'replace')[:120]))
    log('All finished. Tell Claude in the chat.')

if __name__ == '__main__':
    main()
