#!/usr/bin/env bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( dirname -- "${SCRIPT_DIR}" )";

process() {
  TS="$1"
  if [[ "$TS" == *".test.ts" ]]; then
    return 0
  fi
  CJS=${TS%.ts}.cjs
  MJS=${TS%.ts}.js
  echo $CJS
  sed 's/\.ts//' "$TS" | esbuild --loader=ts --format=cjs --target=node16 > "$CJS"
  echo $MJS
  sed 's/\.ts/.js/' "$TS" | esbuild --loader=ts --format=esm --target=esnext > "$MJS"
}

export -f process

find "$PROJECT_DIR" -name '*.ts' -print0 | xargs -n 1 -P 10 -0 -I{} bash -c 'process "$@"' _ {}

deno fmt --config deno.json . 2>/dev/null
