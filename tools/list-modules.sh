#!/bin/sh
# Prints <link rel="modulepreload"> tags for the static ES-module graph.
# Usage (from repo root, needs Node):  sh tools/list-modules.sh
# Paste the output over the existing modulepreload block in index.html / gallery.html / 404.html
# (prefix hrefs with "/" for 404.html). Page modules (js/pages/*) are lazy: preload them only on their own page.
npx --yes esbuild js/main.js --bundle --format=esm --metafile=/tmp/pk-meta.json --outfile=/dev/null --log-level=error
node -e '
const m = require("/tmp/pk-meta.json");
Object.keys(m.inputs).filter(f => f.startsWith("js/") && !f.startsWith("js/pages/")).sort()
  .forEach(f => console.log(`  <link rel="modulepreload" href="${f}">`));'
