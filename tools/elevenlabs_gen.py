#!/usr/bin/env python3
"""Overmaster: make the game's sound effects and music with ElevenLabs.

Run it in Terminal:
    python3 ~/Documents/bts-art/elevenlabs_gen.py test      # 4 sounds, to hear the style
    python3 ~/Documents/bts-art/elevenlabs_gen.py sfx       # every sound effect and ambience loop
    python3 ~/Documents/bts-art/elevenlabs_gen.py music     # the music tracks
    python3 ~/Documents/bts-art/elevenlabs_gen.py all       # both
    python3 ~/Documents/bts-art/elevenlabs_gen.py hit-1 music-map        # just these
    python3 ~/Documents/bts-art/elevenlabs_gen.py --redo music-battle    # make one again (the old one goes to previous/)
    python3 ~/Documents/bts-art/elevenlabs_gen.py heroes            # a voice for every hero, then all their lines
    python3 ~/Documents/bts-art/elevenlabs_gen.py heroes ione pip   # just these heroes
    python3 ~/Documents/bts-art/elevenlabs_gen.py --redo heroes pip  # speak Pip's lines again (his voice stays)
    python3 ~/Documents/bts-art/elevenlabs_gen.py villains          # 0.31: a voice for each villain, then its lines
    python3 ~/Documents/bts-art/elevenlabs_gen.py monsters          # 0.31: the monsters of the wilds you parley with
    python3 ~/Documents/bts-art/elevenlabs_gen.py minions           # 0.33: each villain's minions
    python3 ~/Documents/bts-art/elevenlabs_gen.py voices            # all of them: heroes, villains, minions, monsters

Lines and voice descriptions are in hero_lines.json next to this script. Each speaker's voice is designed once
and saved in your ElevenLabs voices (one of your custom voice slots each); its id is kept in out-voice/voices.json.
Lines already spoken are skipped, so running it again only speaks the new ones. Villains get their voices first, then
minions, then monsters: if your plan runs out of voice slots, the ones that didn't get one are listed in log.txt.

It reads your ElevenLabs API key from elevenlabs-key.txt (or the .rtf TextEdit makes) in this folder and
never prints it. Everything is saved in out-audio/ as MP3. Progress goes to log.txt.
Only needs the Python that comes with macOS.
"""
import json, os, re, ssl, subprocess, sys, tempfile, threading, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.elevenlabs.io'
OUT = os.path.join(HERE, 'out-audio')
LOG = os.path.join(HERE, 'log.txt')
WORKERS = 2
SFX_FORMAT = 'mp3_44100_128'
MUSIC_FORMAT = 'mp3_44100_128'
MUSIC_MODELS = ['music_v2_5', 'music_v2', 'music_v1']   # newest first; falls back if the plan doesn't offer one

# The look of the game, for the ear: dark gothic fantasy, a dungeon master's table. No voices, no music in the effects.
FX = 'dark fantasy video game sound effect, crisp and close, clean start and end, no speech'
# key: (description, seconds, loops seamlessly)
SFX = {
    # the interface
    'click': ('a soft wooden button click, like a game piece tapped on an oak table', 0.5, False),
    'open': ('a heavy old leather-bound book opening, pages rustling', 1.2, False),
    'tab': ('a single parchment page turning', 0.6, False),
    'deny': ('a dull low wooden thud, a muted "no" sound for a disallowed action', 0.5, False),
    'coins': ('a small handful of gold coins dropped into a leather purse', 0.9, False),
    'chime': ('a short soft magical chime, two gentle bell notes rising', 1.0, False),
    # the map: night and day, minions and building
    'night': ('a deep distant church bell tolls once, then a low wind, night falling', 3.0, False),
    'dawn': ('a rooster crows far away at dawn, morning birds start singing', 3.0, False),
    'minion-1': ('a small undead skeleton servant answers: dry bones rattle and click, a hollow raspy grunt', 0.8, False),
    'minion-2': ('skeleton bones clatter as a small undead servant shuffles to attention', 0.8, False),
    'minion-go': ('quick shuffling footsteps on dirt moving away, a pickaxe and a sack jostling', 1.0, False),
    'build': ('hammering nails into wooden beams and stones being set, a small construction site', 2.5, False),
    'built': ('heavy stone blocks settle into place with a deep thump, then a short ominous low horn', 2.5, False),
    'summon': ('dark magic summoning: a rising ghostly whoosh, crackling purple energy, bones rattling together', 2.5, False),
    'summoned': ('a dark spell completes with a deep magical boom, then a creature rises from the earth', 2.0, False),
    'research': ('a quill pen scratching quickly on parchment, a heavy tome closing', 1.5, False),
    'researched': ('an arcane discovery: a shimmering magical swell and a deep resonant chime', 2.0, False),
    'mine': ('a pickaxe strikes rock three times, small stones tumble', 1.5, False),
    'horde': ('a horde of monsters marching: heavy footsteps, clanking weapons, war drums in the distance', 3.0, False),
    'growl': ('a crowd of monsters growling and snarling menacingly', 1.5, False),
    'laugh': ('a deep evil villain laugh echoing in a stone throne room', 3.0, False),
    # battle
    'battle': ('a battle horn blows once, war drums pound, a fight is about to begin', 3.0, False),
    'dice-1': ('a handful of plastic polyhedral dice rolling and tumbling on a wooden table, then settling', 1.2, False),
    'dice-2': ('two dice tossed onto a wooden tabletop, clattering and coming to rest', 1.0, False),
    'hit-1': ('a sword slash striking leather armor and flesh, a meaty impact', 0.6, False),
    'hit-2': ('a heavy axe chop hitting a wooden shield and armor', 0.6, False),
    'hit-3': ('a mace blow crunching into chain mail', 0.6, False),
    'miss-1': ('a fast sword swing whooshing through empty air', 0.5, False),
    'miss-2': ('a blade deflected off a metal shield with a sharp clang', 0.5, False),
    'crit': ('a devastating critical hit: a huge bone-crunching impact with a metallic ring', 1.0, False),
    'arrow': ('a bow string twangs, an arrow whistles through the air and thuds into a target', 1.0, False),
    'fire': ('a fireball spell: a roaring whoosh of flame and an explosion', 1.5, False),
    'holy': ('a healing spell: warm shimmering bells and a soft angelic choir swell', 1.5, False),
    'dark': ('a necrotic curse spell: a hissing burst of dark energy and ghostly whispers', 1.5, False),
    'die': ('a monster collapses and dies with a final pained groan', 1.2, False),
    'down': ('an armored hero falls to the ground with a clatter of metal and a gasp', 1.2, False),
    'roar': ('a huge beast roars, deep and terrifying', 2.0, False),
    'win': ('a short triumphant fanfare of brass horns, a victory sting', 3.0, False),
    'lose': ('a short somber low brass and string sting, a defeat', 3.0, False),
    'levelup': ('a magical level up: an ascending sparkle and a bright triumphant chord', 1.8, False),
    'item': ('a treasure found: a chest creaks open, gold and jewels sparkle magically', 1.8, False),
    # the party on the road: seamless loops, one per kind of ground
    'steps-road': ('a small party of four adventurers walking at a steady pace on a dirt road: boots crunching on gravel, light armor and gear jingling softly', 8, True),
    'steps-grass': ('a small party of four adventurers walking at a steady pace through tall grass: soft footsteps swishing through the grass, gear jingling softly', 8, True),
    'steps-forest': ('a small party of four adventurers walking at a steady pace through a forest: footsteps on dry leaves, twigs snapping now and then', 8, True),
    'steps-snow': ('a small party of four adventurers walking at a steady pace through deep snow: boots crunching in the snow, heavy cloaks rustling', 8, True),
    'steps-swamp': ('a small party of four adventurers wading at a steady pace through a swamp: squelching mud and splashing shallow water', 8, True),
    # ambience, seamless loops
    'amb-day': ('ambience loop: wind over open grassland, distant birds, leaves rustling, a calm fantasy countryside', 20, True),
    'amb-night': ('ambience loop: a quiet night outdoors, crickets, an owl now and then, a light breeze', 20, True),
    'amb-tower': ('ambience loop: inside a dark stone tower, a crackling fireplace, distant chains, water dripping, low wind', 20, True),
    'amb-town': ('ambience loop: a busy friendly medieval village square, distant chatter and laughter, a blacksmith hammering far off, a cart rolling by, chickens, a dog barking once', 20, True),
}
TEST = ['click', 'dice-1', 'hit-1', 'summon']

# key: (description, seconds). All instrumental.
MUSIC_STYLE = 'Instrumental video game music for a dark fantasy strategy game where you play the dungeon master. Orchestral with medieval instruments, no vocals, no lyrics.'
MUSIC = {
    'music-title': ('Main theme: mysterious and grand, a slow build from a lone lute and low strings to a full dark orchestra with a wordless choir pad, gothic and adventurous.', 90),
    'music-map': ('Exploration theme for the overworld map: calm but slightly ominous, lute, harp, soft strings and low woodwinds, a steady gentle pulse, good for long listening and looping.', 120),
    'music-tower': ("The villain's Dark Tower: brooding and sinister, low pipe organ, cellos, slow timpani, distant bells, scheming and patient.", 90),
    'music-town': ("Millbrook, the heroes' home town: warm and cheerful, fiddle, lute, tin whistle and a light hand drum, a tavern-folk tune, homely and hopeful, good for looping.", 90),
    'music-battle': ('Battle theme: tense and energetic, driving war drums, staccato strings, brass stabs, a heroic counter-melody, good for looping.', 90),
    'music-finale': ('Final boss battle against the dark lord in his throne room: epic and desperate, massive drums, full orchestra, dark choir pads, pipe organ, rising intensity.', 120),
    'music-victory': ('The heroes win and save the realm: a triumphant, warm, heroic fanfare that resolves into a peaceful ending.', 30),
    'music-defeat': ('The heroes have fallen and the dark lord rules: a slow, somber, haunting lament with low strings and a tolling bell.', 30),
}

_lock = threading.Lock()
def log(*a):
    s = ' '.join(str(x) for x in a)
    with _lock:
        print(s, flush=True)
        with open(LOG, 'a') as f:
            f.write(time.strftime('%Y-%m-%d %H:%M:%S ') + s + '\n')


# ---------------- the key (never printed) ----------------
def rtf_text(raw):
    """plain text from an RTF file: drops header groups, control words and braces"""
    out, i, n, skip = [], 0, len(raw), []
    while i < n:
        c = raw[i]
        if c == '{':
            m = re.match(r'\{\\(\*|fonttbl|colortbl|stylesheet|info|expandedcolortbl)', raw[i:])
            skip.append(bool(m) or (skip[-1] if skip else False))
            i += 1; continue
        if c == '}':
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

def read_key():
    for fn in sorted(os.listdir(HERE)):
        if not fn.lower().startswith('elevenlabs-key'):
            continue
        raw = open(os.path.join(HERE, fn), 'rb').read().decode('utf-8', 'replace')
        if raw.lstrip().startswith('{\\rtf'):
            raw = rtf_text(raw)
        cands = re.findall(r'[A-Za-z0-9][A-Za-z0-9_\-]{18,}[A-Za-z0-9]', raw)
        if cands:
            return max(cands, key=len)
    return None


# ---------------- HTTP (urllib, or curl if Python's certificates aren't set up) ----------------
USE_CURL = [False]
def http(method, path, key, body=None, timeout=300):
    url = API + path
    headers = {'User-Agent': 'overmaster-audio/1', 'xi-api-key': key}
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

def reason(b):
    """ElevenLabs' error, without anything secret in it"""
    try:
        d = json.loads(b)
        d = d.get('detail', d)
        if isinstance(d, dict):
            return '%s: %s' % (d.get('status', ''), d.get('message', ''))[:300]
        return str(d)[:300]
    except Exception:
        return b[:200].decode('utf-8', 'replace')

def credits_left(key):
    try:
        code, b = http('GET', '/v1/user/subscription', key, timeout=30)
        d = json.loads(b)
        return int(d['character_limit']) - int(d['character_count']), d.get('tier', '?')
    except Exception:
        return None, None


# ---------------- one sound ----------------
REDO = [False]
STOP = [False]

def save(key, raw):
    dst = os.path.join(OUT, key + '.mp3')
    if os.path.exists(dst):
        keep = os.path.join(OUT, 'previous'); os.makedirs(keep, exist_ok=True)
        os.replace(dst, os.path.join(keep, key + '.mp3'))
    open(dst, 'wb').write(raw)

def ask(key, path, body):
    """one request, waiting out 'too many at once'; returns (code, bytes)"""
    t0 = time.time()
    while True:
        code, b = http('POST', path, KEY[0], body)
        if code == 429 and time.time() - t0 < 20 * 60:
            time.sleep(10); continue
        return code, b

def stopper(key, code, b):
    r = reason(b)
    if code == 401 or 'quota' in r.lower() or 'credits' in r.lower():
        log('%s: STOP: %s %s' % (key, code, r)); STOP[0] = True; return True
    return False

def make_sfx(key):
    if STOP[0]: return 'skipped'
    desc, secs, loop = SFX[key]
    if os.path.exists(os.path.join(OUT, key + '.mp3')) and not REDO[0]:
        return 'had'
    tail = FX if not loop else 'video game footstep loop, close and clear, steady rhythm, no music, no speech, no wind' if key.startswith('steps-') else 'dark fantasy video game ambience, no music, no speech'
    body = {'text': '%s. %s' % (desc, tail),
            'duration_seconds': max(0.5, min(30, secs)), 'prompt_influence': 0.5, 'model_id': 'eleven_text_to_sound_v2'}
    if loop:
        body['loop'] = True
    log('%s: asking (%.1f s%s)' % (key, secs, ', loop' if loop else ''))
    code, b = ask(key, '/v1/sound-generation?output_format=' + SFX_FORMAT, body)
    if code != 200:
        if stopper(key, code, b): return 'stop'
        log('%s: refused (%s): %s' % (key, code, reason(b))); return 'fail'
    save(key, b); log('%s: done (%d KB)' % (key, len(b) // 1024)); return 'ok'

def make_music(key):
    if STOP[0]: return 'skipped'
    desc, secs = MUSIC[key]
    if os.path.exists(os.path.join(OUT, key + '.mp3')) and not REDO[0]:
        return 'had'
    for model in MUSIC_MODELS:
        body = {'prompt': MUSIC_STYLE + ' ' + desc, 'music_length_ms': int(secs * 1000), 'force_instrumental': True, 'model_id': model}
        log('%s: composing %d s with %s (this takes a minute or two)' % (key, secs, model))
        code, b = ask(key, '/v1/music?output_format=' + MUSIC_FORMAT, body)
        if code == 200:
            save(key, b); log('%s: done (%d KB)' % (key, len(b) // 1024)); return 'ok'
        if stopper(key, code, b): return 'stop'
        r = reason(b)
        log('%s: %s refused (%s): %s' % (key, model, code, r))
        if code in (400, 403, 422) and 'model' in r.lower():
            continue   # this plan doesn't offer that model: try the next
        return 'fail'
    return 'fail'

def run(keys, fn, workers):
    results = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {k: ex.submit(fn, k) for k in keys}
        for k, f in futs.items():
            try:
                results[k] = f.result()
            except Exception as e:
                results[k] = 'error'; log('%s: error %s' % (k, e))
    return results

# ---------------- hero voices and lines ----------------
VOICE_OUT = os.path.join(HERE, 'out-voice')
TTS_MODELS = ['eleven_v3', 'eleven_multilingual_v2']   # most expressive first; falls back if one can't do timings

def load_lines():
    path = os.path.join(HERE, 'hero_lines.json')
    if not os.path.exists(path):
        sys.exit('hero_lines.json is missing. It goes next to this script.')
    return json.load(open(path))

def voices_file():
    p = os.path.join(VOICE_OUT, 'voices.json')
    return json.load(open(p)) if os.path.exists(p) else {}

_vlock = threading.Lock()
def save_voice(hero, rec):
    with _vlock:
        d = voices_file(); d[hero] = rec
        with open(os.path.join(VOICE_OUT, 'voices.json'), 'w') as f:
            json.dump(d, f, indent=1)

SLOTS_FULL = [False]

def speakers(data, group):
    """key -> {'voice', 'lines', 'name'}: heroes by id, villains as villain-<type>, monsters by type (0.31)"""
    out = {}
    if group in ('heroes', 'voices'):
        for k, h in data['heroes'].items(): out[k] = {'voice': h['voice'], 'lines': h['lines'], 'name': k.capitalize()}
    if group in ('villains', 'voices'):
        for t, v in data.get('villains', {}).items(): out[v.get('key', 'villain-' + t)] = {'voice': v['voice'], 'lines': v['lines'], 'name': 'Villain ' + t.capitalize()}
    if group in ('minions', 'voices'):
        for t, m in data.get('minions', {}).items(): out[m.get('key', 'minion-' + t)] = {'voice': m['voice'], 'lines': m['lines'], 'name': 'Minion ' + t.capitalize()}
    if group in ('monsters', 'voices'):
        for t, m in data.get('monsters', {}).items(): out[t] = {'voice': m['voice'], 'lines': m['lines'], 'name': 'Monster ' + t.capitalize()}
    return out

def design_voice(hero, H):
    """design a voice from the description, keep the first take, save it to the account"""
    if STOP[0]: return 'skipped'
    have = voices_file().get(hero)
    if have and have.get('voice_id'):
        return 'had'
    if SLOTS_FULL[0]: return 'no slot'
    folder = os.path.join(VOICE_OUT, hero); os.makedirs(folder, exist_ok=True)
    sample = ' '.join(H['lines'].values())
    while len(sample) < 120: sample = sample + ' ' + sample
    for model in ('eleven_ttv_v3', 'eleven_multilingual_ttv_v2'):
        body = {'voice_description': H['voice'], 'model_id': model, 'text': sample[:1000], 'guidance_scale': 5}
        log('%s: designing a voice (%s)' % (hero, model))
        code, b = ask(hero, '/v1/text-to-voice/design?output_format=mp3_44100_128', body)
        if code == 200: break
        if stopper(hero, code, b): return 'stop'
        log('%s: voice design refused (%s): %s' % (hero, code, reason(b)))
    else:
        return 'fail'
    d = json.loads(b); prev = (d.get('previews') or [None])[0]
    if not prev:
        log('%s: no voice came back' % hero); return 'fail'
    import base64
    open(os.path.join(folder, 'voice-preview.mp3'), 'wb').write(base64.b64decode(prev['audio_base_64']))
    body = {'voice_name': 'BTS %s' % H.get('name', hero.capitalize()), 'voice_description': H['voice'], 'generated_voice_id': prev['generated_voice_id']}
    code, b = ask(hero, '/v1/text-to-voice', body)
    if code != 200:
        if stopper(hero, code, b): return 'stop'
        r = reason(b)
        if 'limit' in r.lower() or 'slot' in r.lower():
            SLOTS_FULL[0] = True
            log('%s: no free voice slot on your ElevenLabs plan (%s). Speakers without a voice stay text-only in the game.' % (hero, r)); return 'no slot'
        log('%s: saving the voice failed (%s): %s' % (hero, code, r)); return 'fail'
    vid = json.loads(b).get('voice_id')
    save_voice(hero, {'voice_id': vid, 'generated_voice_id': prev['generated_voice_id']})
    log('%s: voice ready' % hero); return 'ok'

def speak(job):
    """one line, with the timing of every letter (for the lip-sync)"""
    hero, cat, text, vid = job
    if STOP[0]: return 'skipped'
    folder = os.path.join(VOICE_OUT, hero); os.makedirs(folder, exist_ok=True)
    mp3, meta = os.path.join(folder, cat + '.mp3'), os.path.join(folder, cat + '.json')
    if os.path.exists(mp3) and os.path.exists(meta) and not REDO[0]:
        old = json.load(open(meta))
        if old.get('text') == text: return 'had'
    import base64
    for model in TTS_MODELS:
        code, b = ask(hero, '/v1/text-to-speech/%s/with-timestamps?output_format=mp3_44100_128' % vid, {'text': text, 'model_id': model})
        if code == 200:
            d = json.loads(b)
            open(mp3, 'wb').write(base64.b64decode(d['audio_base64']))
            with open(meta, 'w') as f:
                json.dump({'text': text, 'model': model, 'alignment': d.get('alignment'), 'normalized_alignment': d.get('normalized_alignment')}, f)
            return 'ok'
        if stopper(hero, code, b): return 'stop'
        log('%s/%s: %s refused (%s): %s' % (hero, cat, model, code, reason(b)))
    return 'fail'

def heroes(which, group='heroes'):
    data = load_lines(); H = speakers(data, group)
    keys = which or list(H)
    bad = [k for k in keys if k not in H]
    if bad:
        sys.exit('Unknown speakers: %s\nKnown: %s' % (', '.join(bad), ', '.join(H)))
    os.makedirs(VOICE_OUT, exist_ok=True)
    left, tier = credits_left(KEY[0])
    log('--- %s: %s: voices for %d speakers · plan %s · %s credits left' % (time.strftime('%Y-%m-%d %H:%M'), group, len(keys), tier, left))
    redo = REDO[0]; REDO[0] = False   # --redo speaks lines again; it never replaces a voice
    # one at a time, in order (heroes, villains, then monsters), so a full plan leaves the monsters without, not a villain
    res = run(keys, lambda k: design_voice(k, H[k]), 1)
    REDO[0] = redo
    log('voices: %s' % ', '.join('%s %s' % kv for kv in res.items()))
    if STOP[0]: return
    l2, _ = credits_left(KEY[0])
    if left is not None and l2 is not None: log('voice design used %d credits; %d left' % (left - l2, l2)); left = l2
    vs = voices_file()
    jobs = [(k, c, t, vs[k]['voice_id']) for k in keys if vs.get(k) for c, t in H[k]['lines'].items()]
    log('speaking %d lines' % len(jobs))
    res = run(jobs, speak, 3)
    bad = ['%s/%s %s' % (j[0], j[1], r) for j, r in res.items() if r not in ('ok', 'had')]
    log('lines: %d ok, %d already made%s' % (sum(r == 'ok' for r in res.values()), sum(r == 'had' for r in res.values()), ('; problems: ' + ', '.join(bad[:20])) if bad else ''))
    l3, _ = credits_left(KEY[0])
    if left is not None and l3 is not None: log('the lines used %d credits; %d left' % (left - l3, l3))
    log('All finished. Tell Claude in the chat.')

KEY = [None]

def main():
    args = sys.argv[1:] or ['test']
    if '--redo' in args:
        REDO[0] = True; args = [a for a in args if a != '--redo']
    if args and args[0] in ('heroes', 'villains', 'minions', 'monsters', 'voices'):
        KEY[0] = read_key()
        if not KEY[0]:
            sys.exit('No key found. Save it in %s/elevenlabs-key.txt' % HERE)
        return heroes(args[1:], args[0])
    if args == ['test']: keys = TEST
    elif args == ['sfx']: keys = list(SFX)
    elif args == ['music']: keys = list(MUSIC)
    elif args == ['all']: keys = list(SFX) + list(MUSIC)
    else: keys = args
    bad = [k for k in keys if k not in SFX and k not in MUSIC]
    if bad:
        sys.exit('Unknown names: %s\nSound effects: %s\nMusic: %s' % (', '.join(bad), ', '.join(SFX), ', '.join(MUSIC)))
    KEY[0] = read_key()
    if not KEY[0]:
        sys.exit('No key found. Save it in %s/elevenlabs-key.txt' % HERE)
    os.makedirs(OUT, exist_ok=True)
    left, tier = credits_left(KEY[0])
    if left is None:
        code, b = http('GET', '/v1/user/subscription', KEY[0], timeout=30)
        sys.exit('ElevenLabs refused the key (%s): %s. Check elevenlabs-key.txt.' % (code, reason(b)))
    log('--- %s: %d to do · plan %s · %d credits left' % (time.strftime('%Y-%m-%d %H:%M'), len(keys), tier, left))
    fx = [k for k in keys if k in SFX]; mu = [k for k in keys if k in MUSIC]
    results = {}
    if fx:
        results.update(run(fx, make_sfx, WORKERS))
        l2, _ = credits_left(KEY[0])
        if l2 is not None: log('sound effects used %d credits; %d left' % (left - l2, l2)); left = l2
    if mu and not STOP[0]:
        # the first track alone, to see what music costs
        results[mu[0]] = make_music(mu[0])
        l2, _ = credits_left(KEY[0])
        if l2 is not None and results[mu[0]] == 'ok':
            log('one %d s track used %d credits; %d left' % (MUSIC[mu[0]][1], left - l2, l2))
        if len(mu) > 1 and not STOP[0]:
            results.update(run(mu[1:], make_music, 1))
    log('results: %s' % ', '.join('%s %s' % kv for kv in results.items()))
    l3, _ = credits_left(KEY[0])
    if l3 is not None: log('credits left: %d' % l3)
    log('All finished. Tell Claude in the chat.')

if __name__ == '__main__':
    main()
