"""Prototype of the Spood score (SPEC-spood-score.md): rank one naturalist's jumping spider records 0-100 from public iNat data.

Every point comes from a named field, and each record prints its reasons, so the owner can check the ranking by eye before any
of it goes into spoodex.html. Weights live in W; change them and re-run.

Usage (from the repo root):
  python tools/spood_score.py                       # themoojuice, rarity in Australia, top 30
  python tools/spood_score.py laz --place 7308 --top 50
  python tools/spood_score.py themoojuice --csv scores.csv
Cost: 1 call per 200 records + 1 call per 100 records with comments + 2 (region tree, top identifiers), at ~1 call/s.
Not shipped with the site.
"""
import argparse, collections, csv, json, math, re, time, urllib.request

API = 'https://api.inaturalist.org'
SALTICIDAE = 48139
# Points out of 100 per part (they add up to 100; a record's score is the sum of earned parts)
W = {'rare': 30, 'secret': 30, 'notice': 15, 'story': 15, 'puzzle': 10}
SECRET_WORDS = re.compile(r'undescribed|un-described|new species|sp\.? ?nov|unnamed|not (yet )?described|morpho ?species', re.I)
ODD_WORDS = re.compile(r'never seen|first record|range extension|no records|unusual', re.I)  # a surprise, not necessarily a new species
CURVE = 40  # display = 100 * (1 - e^(-raw / CURVE)): ordinary records stay low, the top few percent reach the 80s and 90s
FIELDS = ('(id:!t,observed_on:!t,created_at:!t,quality_grade:!t,captive:!t,faves_count:!t,comments_count:!t,'
          'num_identification_disagreements:!t,description:!t,'
          'taxon:(id:!t,name:!t,rank:!t,rank_level:!t),'
          'identifications:(current:!t,body:!t,user:(login:!t),taxon:(id:!t,rank:!t,rank_level:!t)),'
          'annotations:(controlled_attribute_id:!t,controlled_value_id:!t),photos:(id:!t))')
_last = [0.0]


def get(url):
    wait = 1.05 - (time.time() - _last[0])
    if wait > 0: time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': 'SPOODEX tools/spood_score.py (github.com/Themoojuice/spoodex)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def records(login):
    out, last = [], 0
    while True:
        r = get(f'{API}/v2/observations?user_login={login}&taxon_id={SALTICIDAE}&per_page=200&order_by=id&order=asc'
                f'&id_above={last}&fields={FIELDS}')['results']
        out += r
        if len(r) < 200: return out
        last = r[-1]['id']


def comments(ids):
    got = {}
    for k in range(0, len(ids), 100):
        for o in get(f'{API}/v2/observations?per_page=100&id={",".join(map(str, ids[k:k + 100]))}'
                     '&fields=(id:!t,comments:(body:!t,user:(login:!t)))')['results']:
            got[o['id']] = o.get('comments') or []
    return got


def region(place):
    """Region tree: records per taxon (with descendants) and, per genus, the share of its records that stop at the genus."""
    n = get(f'{API}/v1/observations/taxonomy?taxon_id={SALTICIDAE}&place_id={place}&verifiable=true')['results']
    total = {x['id']: x.get('descendant_obs_count') or 0 for x in n}
    stuck = {x['id']: (x.get('direct_obs_count') or 0) / total[x['id']] for x in n if x['rank'] == 'genus' and total[x['id']]}
    return total, stuck


def experts(place):
    r = get(f'{API}/v1/observations/identifiers?taxon_id={SALTICIDAE}&place_id={place}&per_page=50')['results']
    return {x['user']['login'] for x in r}


def score(o, login, total, stuck, ex, notes):
    """→ (score 0-100, [reasons]). Each part is 0..1 times its weight."""
    t, why, part = o.get('taxon') or {}, [], {}
    ids = [i for i in o.get('identifications') or [] if i.get('current')]
    others = [i for i in ids if i['user']['login'] != login]
    n = total.get(t.get('id'), 0)
    # rare: few iNat records of what it is, in the region (log scale; 1 record = 1.0, 3,000+ = 0)
    if t.get('rank_level', 99) <= 10 or t.get('rank_level') == 20:   # species or genus, as the app does
        part['rare'] = max(0.0, 1 - math.log10(max(n, 1)) / 3.5)
        if part['rare'] > 0.3: why.append(f'{n} iNat record{"s" * (n != 1)} of {t["name"]} in the region')
    # secret: the signs of an unnamed species
    s = 0.0
    if t.get('rank') == 'genus' and any(i['user']['login'] in ex and (i.get('taxon') or {}).get('rank') == 'genus' for i in others):
        surprise = 1 - stuck.get(t['id'], 1)
        s = max(s, 0.25 + 0.6 * surprise)
        why.append(f'an experienced identifier stopped at {t["name"]}, where {round(100 * (1 - surprise))}% of records stop')
    if t.get("rank_level", 0) > 20 and any(i["user"]["login"] in ex for i in others):
        s = max(s, 0.45)
        why.append(f'experienced identifiers left it at {t.get("rank")}')
    text = ' '.join([o.get('description') or ''] + [i.get('body') or '' for i in ids] + [c.get('body') or '' for c in notes])
    if SECRET_WORDS.search(text):
        s = 1.0
        why.append(f'notes say "{SECRET_WORDS.search(text).group(0)}"')
    elif ODD_WORDS.search(text):
        s = max(s, 0.5)
        why.append(f'notes say "{ODD_WORDS.search(text).group(0)}"')
    part['secret'] = s
    # an unnamed species has few records by definition: let a strong secret stand in for rarity above species
    if s >= 0.6 and t.get('rank_level', 0) > 10: part['rare'] = max(part.get('rare', 0), s)
    # notice: other people reacting (faves, comments, how many people identified it)
    fav, com = o.get('faves_count') or 0, sum(1 for c in notes if c['user']['login'] != login)
    part['notice'] = min(1.0, 0.25 * fav + 0.15 * com + 0.05 * len(others))
    if fav or com: why.append(f'{fav} fave{"s" * (fav != 1)}, {com} comment{"s" * (com != 1)} from others')
    # story: what the record shows (sex, adult, evidence, behaviour, enough photos)
    ann = {(a['controlled_attribute_id'], a['controlled_value_id']) for a in o.get('annotations') or []}
    st = 0.3 * ((9, 11) in ann) + 0.15 * ((9, 10) in ann) + 0.1 * ((1, 2) in ann) + 0.3 * any(a == 22 for a, _ in ann)
    st += 0.15 * (len(o.get('photos') or []) >= 4) + 0.2 * (o.get('quality_grade') == 'research')
    part['story'] = min(1.0, st)
    # puzzle: people disagree about it
    d = o.get('num_identification_disagreements') or 0
    part['puzzle'] = min(1.0, d / 2)
    if d: why.append(f'{d} disagreeing ID{"s" * (d != 1)}')
    if o.get('captive'): return 0, ['captive']
    raw = sum(W[k] * v for k, v in part.items())
    return round(100 * (1 - math.exp(-raw / CURVE))), why


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('login', nargs='?', default='themoojuice')
    ap.add_argument('--place', type=int, default=6744, help='iNat place id for rarity (default Australia)')
    ap.add_argument('--top', type=int, default=30)
    ap.add_argument('--csv')
    a = ap.parse_args()
    obs = records(a.login)
    notes = comments([o['id'] for o in obs if o.get('comments_count')])
    total, stuck = region(a.place)
    ex = experts(a.place) - {a.login}
    rows = sorted(((*score(o, a.login, total, stuck, ex, notes.get(o['id'], [])), o) for o in obs), key=lambda r: -r[0])
    hist = collections.Counter(min(9, s // 10) for s, _, _ in rows)
    print(f'{len(rows)} records · score bands: ' + ' '.join(f'{10 * b}s:{hist[b]}' for b in range(9, -1, -1)))
    for s, why, o in rows[:a.top]:
        t = o.get('taxon') or {}
        print(f'{s:3d}  {t.get("name", "?"):28.28s} {API.replace("api.", "www.")}/observations/{o["id"]}\n      ' + '; '.join(why))
    if a.csv:
        with open(a.csv, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['score', 'taxon', 'rank', 'observed_on', 'url', 'reasons'])
            for s, why, o in rows:
                t = o.get('taxon') or {}
                w.writerow([s, t.get('name'), t.get('rank'), o.get('observed_on'),
                            f'https://www.inaturalist.org/observations/{o["id"]}', '; '.join(why)])


if __name__ == '__main__':
    main()
