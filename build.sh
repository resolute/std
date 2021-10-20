#!/usr/bin/env sh

rename() {
  for file in *.js dom/*.js; do
    mv "$file" "${file%.js}.$1"
  done
}

npm run clean && \
npx tsc --project tsconfig.build.json -m commonjs && \
rename cjs && \
npx tsc --project tsconfig.build.json && \
# rename mjs && \
prettier --write *.cjs *.js *.d.ts && \
prettier --write dom/*.cjs dom/*.js dom/*.d.ts && \
(eslint --fix *.js *.cjs *.mjs dom/*.js dom/*.cjs dom/*.mjs > /dev/null 2>&1; true)
