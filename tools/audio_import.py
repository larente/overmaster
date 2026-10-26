#!/usr/bin/env python3
"""Bring ElevenLabs sounds and music (elevenlabs_gen.py's out-audio/) into the game.

    python3 tools/audio_import.py PATH/TO/out-audio [--art art]

Needs ffmpeg. Every file is evened out in loudness and written to art/audio/, and art/manifest.json gets an
"audio" list the game reads ({"click": {"file": "audio/click.mp3", "kind": "sfx"}, ...}):
  - effects: silence at the start trimmed, a tiny fade at the end, mono MP3 at 96 kbps;
  - ambience loops (amb-*): left exactly as long as they are, so they loop without a seam, as mono WAV
    (MP3 adds a sliver of silence at the start, which would click on every loop);
  - music (music-*): stereo MP3 at 128 kbps; victory and defeat play once, the rest loop.
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = {'sfx': -16.0, 'amb': -24.0, 'loop': -22.0, 'music': -17.0}   # integrated loudness, LUFS
ONCE = {'music-victory', 'music-defeat'}
# effects heard all the time are cut short, so a tail of hiss doesn't follow every click
CLIP = {'click': 0.18, 'deny': 0.4, 'tab': 0.5}


def kind_of(key):
    return 'amb' if key.startswith('amb-') else 'loop' if key.startswith('steps-') else 'music' if key.startswith('music-') else 'sfx'


def loudness(path, pre=''):
    """integrated loudness and true peak, from ffmpeg's loudnorm analysis"""
    af = (pre + ',' if pre else '') + 'loudnorm=print_format=json'
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', af, '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not m:
        return None, None
    d = json.loads(m.group(0))
    try:
        return float(d['input_i']), float(d['input_tp'])
    except ValueError:
        return None, None


def duration(path):
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


def convert(src, dst, kind, key):
    trim = 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.01' if kind == 'sfx' else ''
    li, tp = loudness(src, trim)
    gain = 0.0
    if li is not None and li > -70:
        gain = TARGET[kind] - li
        if tp is not None:
            gain = min(gain, -1.0 - tp)      # never push a peak past -1 dBFS
    gain = max(-20.0, min(20.0, gain))
    chain = [f for f in [trim, 'volume=%.2fdB' % gain] if f]
    if kind == 'sfx':
        d = duration(src)
        if key in CLIP:
            chain.insert(1 if trim else 0, 'atrim=0:%.2f' % CLIP[key]); d = min(d, CLIP[key])
        if d > 0.2:
            chain.append('afade=t=out:st=%.3f:d=0.04' % max(0, d - 0.06))
        args = ['-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k']
    elif kind in ('amb', 'loop'):
        args = ['-ac', '1', '-ar', '32000', '-c:a', 'pcm_s16le']
    else:
        args = ['-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k']
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(chain)] + args + [dst]
    subprocess.run(cmd, check=True)
    return gain, li


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input')
    ap.add_argument('--art', default=os.path.join(ROOT, 'art'))
    args = ap.parse_args()
    out = os.path.join(args.art, 'audio'); os.makedirs(out, exist_ok=True)
    mpath = os.path.join(args.art, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'art': {}}
    audio = man.setdefault('audio', {})
    done = []
    for fn in sorted(os.listdir(args.input)):
        if not fn.lower().endswith(('.mp3', '.wav')):
            continue
        key = os.path.splitext(fn)[0]; kind = kind_of(key)
        ext = 'wav' if kind in ('amb', 'loop') else 'mp3'
        rel = 'audio/%s.%s' % (key, ext); dst = os.path.join(args.art, rel)
        gain, li = convert(os.path.join(args.input, fn), dst, kind, key)
        e = {'file': rel, 'kind': kind}
        if kind in ('amb', 'loop') or (kind == 'music' and key not in ONCE):
            e['loop'] = True
        if kind == 'music' and key in ONCE:
            e['loop'] = False
        audio[key] = e
        done.append('%-16s %-5s %5.1f s  %+5.1f dB  %4d KB' % (key, kind, duration(dst), gain, os.path.getsize(dst) // 1024))
    with open(mpath, 'w') as f:
        json.dump(man, f, indent=1, sort_keys=True)
    for d in done:
        print(d)
    total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print('%d imported, art/audio is %.1f MB. Manifest: %s' % (len(done), total / 1e6, mpath))


if __name__ == '__main__':
    main()
