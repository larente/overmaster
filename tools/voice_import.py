#!/usr/bin/env python3
"""Bring the heroes' voice lines and talking portraits into the game.

    python3 tools/voice_import.py --voice PATH/TO/out-voice --talk PATH/TO/out [--art art]

out-voice/ comes from `elevenlabs_gen.py heroes`: <hero>/<line>.mp3 with <line>.json (the text and the time
every letter is spoken). out/ comes from `pixellab_gen.py talk`: <hero>/talk/ holds the portrait's mouth shapes
(visemes.json and one PNG each) and lines.json (PixelLab's lip-sync plan for every line).

Written to art/voice/<hero>.mp3 (all of a hero's lines in one mono 64 kbps file, evened out in loudness, a short
silence between them) and art/talk/<hero>.webp (the mouth shapes side by side in one strip), and art/manifest.json gets:
  "voice": {hero: {line: {"file", "at", "dur", "text", "sync": [[mouth, until_seconds], ...]}}}
  "talk":  {hero: {"strip": file, "n": mouth shapes, "rest": the closed mouth, "order": [...]}}
One file per hero rather than one per line keeps the published game under the artifact's file limit.
The sync pairs each mouth shape from PixelLab's plan with the moment ElevenLabs says that part of the text ends,
so the lips land on the words.
"""
import argparse, collections, json, os, re, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = -16.0


def loudness(path):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    try:
        d = json.loads(m.group(0)); return float(d['input_i']), float(d['input_tp'])
    except Exception:
        return None, None


def duration(path):
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


RATE, GAP = 44100, 0.4


def pcm(src):
    """the line as 16-bit mono samples at 44.1 kHz, evened out in loudness"""
    li, tp = loudness(src); gain = 0.0
    if li is not None and li > -70:
        gain = TARGET - li
        if tp is not None: gain = min(gain, -1.0 - tp)
    gain = max(-15.0, min(15.0, gain))
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', 'volume=%.2fdB' % gain, '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'], capture_output=True, check=True)
    return p.stdout


def encode(raw, dst):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '64k', dst], input=raw, check=True)


def sync_for(plan, meta, dur, order):
    """[[mouth index, seconds when it ends], ...]"""
    frames = plan.get('frames') or []
    if not frames:
        return []
    al = (meta or {}).get('alignment') or {}
    ends = al.get('character_end_times_seconds') or []
    text = plan.get('text', '')
    out = []
    if ends and len(ends) >= len(text) * 0.9:
        for f in frames:
            k = max(0, min(len(ends), int(f.get('text_offset', 0))))
            t = ends[k - 1] if k > 0 else 0.0
            out.append([order.index(f['viseme']) if f['viseme'] in order else 0, round(t, 3)])
        # frames that land on the same moment (punctuation, spaces) get a sliver each, so none vanish
        for i in range(1, len(out)):
            if out[i][1] <= out[i - 1][1]:
                out[i][1] = round(out[i - 1][1] + 0.04, 3)
    else:
        total = sum(f.get('duration_ms', 90) for f in frames) or 1; t = 0.0
        for f in frames:
            t += f.get('duration_ms', 90) / total * dur
            out.append([order.index(f['viseme']) if f['viseme'] in order else 0, round(t, 3)])
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--voice', required=True)
    ap.add_argument('--talk', required=True)
    ap.add_argument('--art', default=os.path.join(ROOT, 'art'))
    args = ap.parse_args()
    os.makedirs(os.path.join(args.art, 'voice'), exist_ok=True); os.makedirs(os.path.join(args.art, 'talk'), exist_ok=True)
    mpath = os.path.join(args.art, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'art': {}}
    voice = man.setdefault('voice', {}); talk = man.setdefault('talk', {})
    report = []
    heroes = sorted(set(os.listdir(args.voice)) | set(os.listdir(args.talk)))
    for hero in heroes:
        tdir = os.path.join(args.talk, hero, 'talk'); vdir = os.path.join(args.voice, hero)
        order, plans = [], {}
        if os.path.exists(os.path.join(tdir, 'visemes.json')):
            vj = json.load(open(os.path.join(tdir, 'visemes.json')))
            order = vj['order']
            ims = [Image.open(os.path.join(tdir, vj['files'][vid])).convert('RGBA') for vid in order]
            w, h = max(i.width for i in ims), max(i.height for i in ims)
            strip = Image.new('RGBA', (w * len(ims), h), (0, 0, 0, 0))
            for n, im in enumerate(ims): strip.paste(im, (n * w + (w - im.width) // 2, h - im.height))
            rel = 'talk/%s.webp' % hero
            strip.save(os.path.join(args.art, rel), 'WEBP', lossless=True, method=4, quality=100)
            if os.path.exists(os.path.join(tdir, 'lines.json')):
                plans = json.load(open(os.path.join(tdir, 'lines.json')))
            # the closed mouth: the shape most lines end on
            last = collections.Counter(p['frames'][-1]['viseme'] for p in plans.values() if p.get('frames'))
            rest = order.index(last.most_common(1)[0][0]) if last and last.most_common(1)[0][0] in order else 0
            talk[hero] = {'strip': rel, 'n': len(order), 'rest': rest, 'order': order}
        if not os.path.isdir(vdir):
            continue
        lines = voice.setdefault(hero, {}); n = 0; raw = b''; rel = 'voice/%s.mp3' % hero
        for fn in sorted(os.listdir(vdir)):
            if not fn.endswith('.mp3') or fn.startswith('voice-preview'):
                continue
            cat = fn[:-4]; meta_p = os.path.join(vdir, cat + '.json')
            meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
            r = pcm(os.path.join(vdir, fn)); at = GAP + len(raw) / 2 / RATE; dur = len(r) / 2 / RATE
            raw += b'\0' * (2 * int(GAP * RATE)) + r
            e = {'file': rel, 'at': round(at, 3), 'dur': round(dur, 2), 'text': meta.get('text', '')}
            if cat in plans and order:
                e['sync'] = sync_for(plans[cat], meta, dur, order)
            lines[cat] = e; n += 1
        if raw:
            encode(raw + b'\0' * (2 * int(GAP * RATE)), os.path.join(args.art, rel))
        report.append('%-9s %2d lines%s' % (hero, n, ', %d mouth shapes' % len(order) if order else ', no talking portrait'))
    with open(mpath, 'w') as f:
        json.dump(man, f, indent=1, sort_keys=True)
    for r in report:
        print(r)
    # the one-file-per-line layout from before is replaced
    for d in ('voice', 'talk'):
        for f in os.listdir(os.path.join(args.art, d)):
            if re.match(r'.+-\w+\.(mp3|webp)$', f) and not f.split('.')[0] in voice and not f.split('.')[0] in talk:
                os.remove(os.path.join(args.art, d, f))
    size = sum(os.path.getsize(os.path.join(args.art, d, f)) for d in ('voice', 'talk') for f in os.listdir(os.path.join(args.art, d)))
    print('%d heroes. art/voice + art/talk: %.1f MB. Manifest: %s' % (len(report), size / 1e6, mpath))


if __name__ == '__main__':
    main()
