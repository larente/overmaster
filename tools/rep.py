# usage: python3 rep.py file  < pairs.json   ; pairs: [[old, new, count?], ...]
import sys, json
path = sys.argv[1]
src = open(path).read()
pairs = json.load(open(sys.argv[2]))
for p in pairs:
    old, new = p[0], p[1]
    cnt = p[2] if len(p) > 2 else 1
    n = src.count(old)
    if cnt != -1 and n != cnt:
        print('MISMATCH', n, 'expected', cnt, ':', old[:90]); sys.exit(1)
    if n == 0:
        print('MISSING', old[:90]); sys.exit(1)
    src = src.replace(old, new)
open(path, 'w').write(src)
print('ok', len(pairs), 'replacements in', path)
