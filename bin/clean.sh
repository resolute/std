#!/usr/bin/env bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( dirname -- "${SCRIPT_DIR}" )";

echo >&2 $PROJECT_DIR: removing .js .cjs .mjs .d.ts .js.map
find "$PROJECT_DIR" -name '*.js' -or -name '*.cjs' -or -name '*.mjs' -or -name '*.d.ts' -or -name '*.js.map' -delete
