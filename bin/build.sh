#!/usr/bin/env sh

ts2js() {
  for file in *.js dom/*.js; do
    sed -i.bak 's/\.ts/.js/' "$file"
    rm -f "$file.bak"
    sed -i.bak 's/\/\/ @ts-ignore tsc non-sense//' "$file"
    rm -f "$file.bak"
    deno fmt --config deno.json "$file" 2>/dev/null
  done
}

rename() {
  for file in *.js dom/*.js; do
    mv "$file" "${file%.js}.$1"
  done
}

npm run clean && \
npx tsc --project tsconfig.build.json -m commonjs && \
ts2js "$file" && \
rename cjs && \
npx tsc --project tsconfig.build.json && \
ts2js "$file" && \
echo Build Completed.
