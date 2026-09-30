"""Offline editorial recipe compiler. No network, credentials or publication support."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHANNELS = ('letter', 'intelligence', 'seo_article', 'x', 'threads', 'instagram', 'short_video', 'newsletter')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def confined(relative, prefix):
    if not isinstance(relative, str) or not isinstance(prefix, str):
        raise ValueError('path must be text')
    if (not relative.startswith(prefix + '/') or '\\' in relative or
            any(ord(ch) < 32 or ord(ch) == 127 for ch in relative)):
        raise ValueError('path outside allowed scope')
    parts = relative.split('/')
    if any(part in ('', '.', '..') for part in parts):
        raise ValueError('path outside allowed scope')
    p = ROOT.joinpath(*parts)
    scope = ROOT.joinpath(*prefix.split('/'))
    # Check every component, including dangling symlinks and symlinks that
    # point back into the lane. Do this before resolve() follows anything.
    for depth in range(1, len(parts) + 1):
        if ROOT.joinpath(*parts[:depth]).is_symlink():
            raise ValueError('symlink forbidden')
    resolved = p.resolve(strict=False)
    if not resolved.is_relative_to(scope.resolve(strict=False)):
        raise ValueError('symlink forbidden')
    return p


def exact_keys(value, expected, message):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise ValueError(message)


def source_metadata(text):
    lines = text.splitlines()
    if not lines or lines[0].lstrip('\ufeff').strip() != '---':
        raise ValueError('Letter frontmatter required')
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), None)
    if end is None:
        raise ValueError('Letter frontmatter is not closed')
    values = {}
    for line in lines[1:end]:
        if ':' not in line:
            continue
        key, raw_value = line.split(':', 1)
        if key not in ('title', 'date'):
            continue
        if key in values:
            raise ValueError('duplicate Letter metadata: ' + key)
        value = raw_value.strip()
        if value.startswith('"'):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as error:
                raise ValueError('invalid quoted Letter metadata: ' + key) from error
        elif value.startswith("'"):
            if not value.endswith("'") or len(value) < 2:
                raise ValueError('invalid quoted Letter metadata: ' + key)
            value = value[1:-1].replace("''", "'")
        if not isinstance(value, str) or not value:
            raise ValueError('invalid Letter metadata: ' + key)
        values[key] = value
    if set(values) != {'title', 'date'}:
        raise ValueError('Letter title/date metadata required')
    return values, '\n'.join(lines[end + 1:])


def load_recipe(relative):
    return json.loads(confined(relative, 'ops/media/sources').read_text())


def compile_recipe(r):
    def require(ok, message):
        if not ok:
            raise ValueError(message)
    exact_keys(r, ('schema_version', 'id', 'source', 'evidence', 'channels', 'cta'), 'recipe schema fields')
    require(type(r['schema_version']) is int and r['schema_version'] == 1, 'schema version')
    require(isinstance(r['id'], str) and re.fullmatch(r'[a-z0-9-]{1,80}', r['id']), 'invalid id')
    source = r['source']
    exact_keys(source, ('path', 'sha256', 'url', 'date', 'title'), 'source schema fields')
    require(isinstance(source['path'], str) and re.fullmatch(r'content/letters/[a-zA-Z0-9_-]+\.md', source['path']), 'Letter path required')
    require(isinstance(source['sha256'], str) and re.fullmatch(r'[a-f0-9]{64}', source['sha256']), 'source hash required')
    raw = confined(source['path'], 'content/letters').read_bytes()
    text = raw.decode('utf-8')
    require(digest(raw) == source['sha256'], 'stale source hash')
    metadata, body = source_metadata(text)
    require(source['title'] == metadata['title'], 'source title differs from Letter')
    require(source['date'] == metadata['date'] and re.fullmatch(r'\d{4}-\d{2}-\d{2}', source['date']), 'source date differs from Letter')
    require(source['url'] == '/letters/' + Path(source['path']).stem, 'source URL differs from loader slug')
    evidence = r['evidence']
    require(isinstance(evidence, dict) and bool(evidence), 'evidence required')
    for key, e in evidence.items():
        require(isinstance(key, str) and re.fullmatch(r'[a-z0-9-]+', key), 'invalid evidence id')
        exact_keys(e, ('kind', 'authority', 'scope', 'excerpt', 'line'), 'evidence schema fields')
        require(e['kind'] in ('quote', 'fact'), 'evidence kind')
        require(e['authority'] in ('OWNER_SOURCE', 'FACT'), 'evidence authority')
        require(isinstance(e['scope'], str) and e['scope'].strip(), 'evidence scope required')
        require((e['kind'] == 'quote' and e['authority'] == 'OWNER_SOURCE') or
                (e['kind'] == 'fact' and e['authority'] == 'FACT' and e['scope'] == 'source_text_only'),
                'evidence authority does not match kind')
        require(isinstance(e['excerpt'], str) and e['excerpt'] and e['excerpt'] in body, 'invented evidence')
        lines = text.splitlines()
        require(type(e['line']) is int and e['line'] >= 1 and e['line'] <= len(lines) and e['excerpt'] in lines[e['line'] - 1], 'invalid line locator')
        # FACT means only an observation of the source text, never independent world verification.
        require(e['authority'] != 'FACT' or e['scope'] == 'source_text_only', 'unverified world fact')
    require(isinstance(r['channels'], dict) and set(r['channels']) == set(CHANNELS), 'all eight channels required')
    cta = r['cta']
    exact_keys(cta, ('href', 'label', 'evidence_id', 'reason'), 'CTA schema fields')
    require(isinstance(cta['href'], str) and cta['href'].startswith('/') and
            not cta['href'].startswith('//') and not any(ch in cta['href'] for ch in ('\\', '?', '#', '%')) and
            not any(ord(ch) < 32 or ord(ch) == 127 for ch in cta['href']),
            'CTA must be a local route')
    route_parts = cta['href'][1:].split('/') if cta['href'] != '/' else []
    require(all(part and part not in ('.', '..') for part in route_parts), 'CTA path traversal')
    require(isinstance(cta['label'], str) and cta['label'].strip() and
            isinstance(cta['reason'], str) and cta['reason'].strip(), 'CTA label/reason required')
    require(cta['href'] in re.findall(r'\]\((/[^)]+)\)', text), 'CTA must exist in source')
    require(isinstance(cta['evidence_id'], str) and cta['evidence_id'] in evidence, 'CTA relevance evidence required')
    require(ROOT.joinpath('src', 'app', *route_parts, 'page.tsx').is_file(), 'CTA route missing')
    outputs = []
    bodies = []
    purposes = set()
    warnings = []
    for channel in CHANNELS:
        spec = r['channels'][channel]
        exact_keys(spec, ('purpose', 'segments'), 'channel schema fields')
        require(isinstance(spec['purpose'], str) and spec['purpose'].strip() and isinstance(spec['segments'], list) and spec['segments'], 'empty channel')
        require(spec['purpose'] not in purposes, 'channel purposes must be distinct')
        purposes.add(spec['purpose'])
        seen = set()
        for s in spec['segments']:
            exact_keys(s, ('kind', 'text', 'evidence_ids'), 'segment schema fields')
            require(s['kind'] in ('quote', 'fact', 'inference'), 'segment kind')
            require(isinstance(s['text'], str), 'segment text must be text')
            require(isinstance(s['evidence_ids'], list) and s['evidence_ids'] and
                    all(isinstance(k, str) and k in evidence for k in s['evidence_ids']) and
                    len(set(s['evidence_ids'])) == len(s['evidence_ids']), 'missing/duplicate provenance')
            copy = s['text'].strip()
            require(copy and copy not in seen, 'repeated segment')
            seen.add(copy)
            if s['kind'] in ('quote', 'fact'):
                require(any(evidence[k]['kind'] == s['kind'] and copy == evidence[k]['excerpt'] for k in s['evidence_ids']), 'quote/fact must match same-kind evidence verbatim')
            else:
                require(not re.search(r'[「」“”"\d]|https?://|\]\(|/[a-zA-Z]', copy), 'inference contains unverified quote/number/link')
                warnings.append(channel + ': inference needs editorial truth review')
            require(not any(w in copy.lower() for w in ('delve', 'game-changer', '革新的な', '無限の可能性', '革命を起こ')), 'generic hype')
        body = '\n\n'.join(s['text'] for s in spec['segments'])
        require(body not in bodies, 'platform copy-paste')
        # Detect substantial copied prose; shared exact evidence quotes are deliberately exempt.
        inference = {s['text'] for s in spec['segments'] if s['kind'] == 'inference'}
        for prior in outputs:
            old = {s['text'] for s in prior['segments'] if s['kind'] == 'inference'}
            require(not inference.intersection(old), 'reused platform prose')
        require(channel != 'x' or len(body) <= 140, 'X conservative Japanese budget exceeded')
        require(channel != 'threads' or len(body) <= 450, 'Threads editorial budget exceeded')
        bodies.append(body)
        outputs.append(dict(channel=channel, status='DRAFT', approval='UNREVIEWED',
                            provenance=source, **spec))
    return dict(schema_version=1, id=r['id'], status='DRAFT', approval='UNREVIEWED',
                recipe_sha256=digest(json.dumps(r, ensure_ascii=False, sort_keys=True).encode()),
                source=source, evidence=evidence, outputs=outputs, cta=dict(status='DRAFT', **cta),
                queue=[dict(channel=c, day_offset=i, state='DRAFT', executable=False)
                       for i, c in enumerate(CHANNELS)],
                quality=dict(mechanical='PASS', editorial='REQUIRED', warnings=warnings),
                publication='DISABLED')


def render(p):
    sections = [f"# DRAFT — {p['id']}", 'Approval: UNREVIEWED. Publication: DISABLED.',
                f"Source: {p['source']['path']}\nSHA256: {p['source']['sha256']}\nURL: {p['source']['url']}"]
    for o in p['outputs']:
        sections.append(f"## {o['channel']} — DRAFT\nPurpose: {o['purpose']}")
        for s in o['segments']:
            refs = ', '.join(f"{k}:L{p['evidence'][k]['line']}" for k in s['evidence_ids'])
            sections.append(f"[{s['kind']} | {refs}]\n{s['text']}")
    sections.append(f"## Related CTA — DRAFT\n{p['cta']['label']} ({p['cta']['href']})\nRelevance: {p['cta']['reason']}")
    return '\n\n'.join(sections) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('recipe')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    p = compile_recipe(load_recipe(args.recipe))
    target = confined('ops/media/drafts/' + p['id'], 'ops/media/drafts')
    package = confined('ops/media/drafts/' + p['id'] + '/package.json', 'ops/media/drafts')
    review = confined('ops/media/drafts/' + p['id'] + '/review.md', 'ops/media/drafts')
    payload = json.dumps(p, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if package.read_text(encoding='utf-8') != payload or review.read_text(encoding='utf-8') != render(p):
            raise ValueError('draft differs from deterministic recipe')
        print('PASS: provenance, quality checks, deterministic package; editorial approval still required')
    else:
        target.mkdir(exist_ok=False)
        package = confined('ops/media/drafts/' + p['id'] + '/package.json', 'ops/media/drafts')
        review = confined('ops/media/drafts/' + p['id'] + '/review.md', 'ops/media/drafts')
        with package.open('x', encoding='utf-8', newline='\n') as output:
            output.write(payload)
        with review.open('x', encoding='utf-8', newline='\n') as output:
            output.write(render(p))
        print('DRAFT created: ' + str(target.relative_to(ROOT)))


if __name__ == '__main__':
    main()
