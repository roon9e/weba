#!/bin/bash
# Smoke test for the deployed webA bundle. Run on the host: bash verify.sh [base]
set -u
B="${1:-http://127.0.0.1:8091}"

echo "=== base: $B ==="

first_asset=$(curl -s "$B/" | grep -oE 'assets/[A-Za-z0-9._-]+\.js' | head -1)
sw=$(ls /opt/weba/dist/service.worker*.js 2>/dev/null | head -1 | xargs -r basename)

printf '%-46s %s\n' "path" "result"
for p in \
  "/" \
  "/index.html" \
  "/$first_asset" \
  "/site.webmanifest" \
  "/img-apple-64/0023-20e3.png" \
  "/img-apple-160/1f600.png" \
  "/${sw}" \
  "/some/spa/route/that/does/not/exist"
do
  [ -z "$p" ] && continue
  printf '%-46s ' "$p"
  curl -s -o /dev/null -w 'HTTP %{http_code}  %{content_type}  %{size_download}b\n' "$B$p"
done

echo
echo "=== cache headers ==="
printf '%-20s ' "hashed asset:"
curl -s -D- -o /dev/null "$B/$first_asset" | grep -i 'cache-control' | tr -d '\r'
printf '%-20s ' "index.html:"
curl -s -D- -o /dev/null "$B/index.html" | grep -i 'cache-control' | tr -d '\r'
printf '%-20s ' "manifest:"
curl -s -D- -o /dev/null "$B/site.webmanifest" | grep -i 'cache-control' | tr -d '\r'

echo
echo "=== branding ==="
curl -s "$B/" | grep -oE '<title>[^<]*</title>|name="title" content="[^"]*"|rel="canonical" href="[^"]*"'

echo
echo "=== CSP (websync should be absent when branded) ==="
curl -s "$B/" | grep -o 'script-src[^;]*'