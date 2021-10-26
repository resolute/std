#!/usr/bin/env sh

rm -rf coverage/
deno test --allow-net --doc --coverage=coverage/tmp --ignore=node_modules
deno coverage coverage/tmp --lcov > coverage/lcov.info
sed -i.bak -E 's/SF:.*\/([^/]+\.ts)/SF:\1/' coverage/lcov.info
rm -f coverage/lcov.info.bak
genhtml -o coverage coverage/lcov.info
