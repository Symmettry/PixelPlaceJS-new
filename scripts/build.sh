#!/bin/bash

echo compiling typescript and declarations
tsc -d
copyfiles -u 1 "src/**/*.{html,css,bin,zbin}" dist/