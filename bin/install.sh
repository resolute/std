#!/usr/bin/env sh

# deno
command -v deno >/dev/null 2>&1 || {
  echo >&2 "Deno not installed.";
  exit 1;
  if command -v brew &> /dev/null; then
      echo "brew install deno"
      brew install deno
  else
    echo "curl -fsSL https://deno.land/x/install/install.sh | sh"
    curl -fsSL https://deno.land/x/install/install.sh | sh
  fi
}

# lcov (genhtml)
command -v genhtml >/dev/null 2>&1 || {
  echo >&2 "lcov not installed.";
  exit 1;
  if command -v brew &> /dev/null; then
      echo "brew install lcov"
      brew install lcov
  else
    echo "sudo apt-get install -y lcov"
    sudo apt-get install -y lcov
  fi
}

