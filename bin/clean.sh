#!/usr/bin/env bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( dirname -- "${SCRIPT_DIR}" )";

# remove coverage/ dir
rm -rf "$PROJECT_DIR/coverage" &>/dev/null

# remove .js .cjs .mjs .d.ts .js.map
echo >&2 find \"$PROJECT_DIR\" -name \'*.js\' -or -name \'*.cjs\' -or -name \'*.mjs\' -or -name \'*.d.ts\' -or -name \'*.js.map\' -delete
find "$PROJECT_DIR" \( -name '*.js' -or -name '*.cjs' -or -name '*.mjs' -or -name '*.d.ts' -or -name '*.js.map' \) -delete
