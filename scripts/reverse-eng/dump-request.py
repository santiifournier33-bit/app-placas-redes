"""Dump headers de la request que envió el browser."""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from mitmproxy.io import FlowReader

HERE = os.path.dirname(os.path.abspath(__file__))
FLOW = os.path.join(HERE, 'output', 'zonaprop.flow')

needle = sys.argv[1] if len(sys.argv) > 1 else 'suggestLocation?location_name=villa%20rosa'
max_dumps = int(sys.argv[2]) if len(sys.argv) > 2 else 1

found = 0
with open(FLOW, 'rb') as f:
    reader = FlowReader(f)
    for flow in reader.stream():
        if not hasattr(flow, 'request'):
            continue
        if needle not in flow.request.pretty_url:
            continue
        req = flow.request
        print(f"=== {req.method} {req.pretty_url}")
        print(f"Request headers:")
        for k, v in req.headers.items():
            print(f"  {k}: {v}")
        print(f"Cookies: {dict(req.cookies)}")
        found += 1
        if found >= max_dumps:
            break

if found == 0:
    print(f"No requests matched: {needle!r}", file=sys.stderr)
