"""Analiza zonaprop.flow capturado con mitmdump.
Output:
  - all-urls.txt: todas las URLs únicas (sorted)
  - api-candidates.txt: requests que parecen XHR/JSON (no html/css/js/img)
  - autocomplete-hits.json: requests con query string que parecen autocomplete
  - polygon-hits.json: responses con GeoJSON / polygon / coordinates
"""
import io
import json
import os
import re
import sys
from collections import defaultdict

# encoding hack para consolas Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from mitmproxy.io import FlowReader
from mitmproxy.exceptions import FlowReadException

HERE = os.path.dirname(os.path.abspath(__file__))
FLOW = os.path.join(HERE, 'output', 'zonaprop.flow')
OUT = os.path.join(HERE, 'output')

IGNORE_EXTS = ('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2',
               '.ttf', '.ico', '.map', '.mp4', '.avif')
AUTOCOMPLETE_HINTS = ('autocomplete', 'suggest', 'search', 'location', 'ubicacion', 'place', 'geo', 'typeahead')
POLYGON_HINTS = ('polygon', 'geojson', 'coordinates', 'shape', 'boundary')

all_urls = set()
api_candidates = []
autocomplete_hits = []
polygon_hits = []
hosts = defaultdict(int)
content_types = defaultdict(int)

with open(FLOW, 'rb') as f:
    reader = FlowReader(f)
    try:
        for flow in reader.stream():
            if not hasattr(flow, 'request'):
                continue
            req = flow.request
            resp = getattr(flow, 'response', None)

            url = req.pretty_url
            host = req.host
            path = req.path
            method = req.method

            all_urls.add(f"{method} {url}")
            hosts[host] += 1

            path_lower = path.lower()
            if any(path_lower.split('?')[0].endswith(ext) for ext in IGNORE_EXTS):
                continue
            if host.endswith(('.googleapis.com', '.gstatic.com', '.google.com',
                              '.googletagmanager.com', '.google-analytics.com',
                              '.doubleclick.net', '.facebook.com', '.fbcdn.net',
                              '.amazon-adsystem.com', '.adsrvr.org', '.cloudflareinsights.com',
                              '.sentry.io', '.newrelic.com', '.optimizely.com',
                              '.hotjar.com', 'maps.googleapis.com')):
                continue

            ct = ''
            body_text = ''
            if resp is not None:
                ct = resp.headers.get('content-type', '').lower()
                content_types[ct.split(';')[0]] += 1
                try:
                    body_text = resp.get_text(strict=False) or ''
                except Exception:
                    body_text = ''

            is_api = 'json' in ct or 'application/' in ct
            if not is_api and resp is None:
                continue
            if 'text/html' in ct:
                continue

            api_candidates.append({
                'method': method,
                'url': url,
                'host': host,
                'status': resp.status_code if resp else None,
                'content_type': ct,
                'body_len': len(body_text),
                'body_preview': body_text[:600],
            })

            if any(h in path_lower for h in AUTOCOMPLETE_HINTS) or any(h in url.lower() for h in AUTOCOMPLETE_HINTS):
                autocomplete_hits.append({
                    'method': method,
                    'url': url,
                    'status': resp.status_code if resp else None,
                    'content_type': ct,
                    'body_preview': body_text[:1500],
                })

            if body_text:
                lower_body = body_text.lower()
                if any(h in lower_body for h in POLYGON_HINTS):
                    polygon_hits.append({
                        'method': method,
                        'url': url,
                        'status': resp.status_code if resp else None,
                        'content_type': ct,
                        'body_len': len(body_text),
                        'body_preview': body_text[:2500],
                    })
    except FlowReadException as e:
        print(f"Flow read error: {e}", file=sys.stderr)

with open(os.path.join(OUT, 'all-urls.txt'), 'w', encoding='utf-8') as f:
    for u in sorted(all_urls):
        f.write(u + '\n')

with open(os.path.join(OUT, 'api-candidates.txt'), 'w', encoding='utf-8') as f:
    for c in api_candidates:
        f.write(f"{c['method']} {c['url']}\n")
        f.write(f"  status={c['status']} ct={c['content_type']} len={c['body_len']}\n")
        if c['body_preview']:
            f.write(f"  body[:600]={c['body_preview']!r}\n")
        f.write('\n')

with open(os.path.join(OUT, 'autocomplete-hits.json'), 'w', encoding='utf-8') as f:
    json.dump(autocomplete_hits, f, ensure_ascii=False, indent=2)

with open(os.path.join(OUT, 'polygon-hits.json'), 'w', encoding='utf-8') as f:
    json.dump(polygon_hits, f, ensure_ascii=False, indent=2)

print(f"Total URLs únicas: {len(all_urls)}")
print(f"API candidates (no html/static): {len(api_candidates)}")
print(f"Autocomplete hits: {len(autocomplete_hits)}")
print(f"Polygon hits: {len(polygon_hits)}")
print(f"\nTop 15 hosts:")
for host, count in sorted(hosts.items(), key=lambda x: -x[1])[:15]:
    print(f"  {count:5d}  {host}")
print(f"\nTop 15 content-types:")
for ct, count in sorted(content_types.items(), key=lambda x: -x[1])[:15]:
    print(f"  {count:5d}  {ct}")
print(f"\nOutputs:")
print(f"  {OUT}/all-urls.txt")
print(f"  {OUT}/api-candidates.txt")
print(f"  {OUT}/autocomplete-hits.json")
print(f"  {OUT}/polygon-hits.json")
