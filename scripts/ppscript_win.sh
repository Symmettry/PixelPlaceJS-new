#!/bin/bash

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file path>"
  exit 1
fi

./pixelplacejs/node_windows/node.exe ./pixelplacejs/dist/PPScript.js "$@"