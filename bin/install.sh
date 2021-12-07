#!/usr/bin/env sh

# deno
command -v deno >/dev/null 2>&1 || {
  echo >&2 "Deno not installed.";
  if command -v brew &> /dev/null; then
    echo >&2 "brew install deno"
    brew install deno
  else
    echo >&2 "curl -fsSL https://deno.land/x/install/install.sh | sh"
    curl -fsSL https://deno.land/x/install/install.sh | sh
  fi
}

# lcov (genhtml)
command -v genhtml >/dev/null 2>&1 || {
  echo >&2 "lcov not installed.";
  if command -v brew &> /dev/null; then
    echo >&2 "brew install lcov"
    brew install lcov
  else
    echo >&2 "sudo apt-get install -y lcov"
    sudo apt-get install -y lcov
  fi
}

# esbuild
command -v esbuild >/dev/null 2>&1 || {
  echo >&2 "esbuild not installed.";
  echo >&2 "npm i -g esbuild"
  npm i -g esbuild
}
