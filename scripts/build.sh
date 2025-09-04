#!/bin/bash

echo compiling typescript and declarations
tsc -d
echo copying mapdata
cp src/util/canvas/mapdata.bin dist/util/canvas/mapdata.bin
echo zipping userscript
zip -r ./userscript/extension.zip ./userscript/extension
