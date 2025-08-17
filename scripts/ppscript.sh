#!/bin/bash

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file path>"
  exit 1
fi

chmod +X ./pixelplacejs/node_linux/bin/node
./pixelplacejs/node_linux/bin/node ./pixelplacejs/dist/PPScript.js "$@"