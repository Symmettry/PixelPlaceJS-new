#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
RELEASE_DIR="$ROOT_DIR/release"


rm -rf "$ROOT_DIR/used_node_modules" "$ROOT_DIR/temp_modules"
mkdir "$ROOT_DIR/temp_modules"
cp "$ROOT_DIR/package.json" "$ROOT_DIR/package-lock.json" "$ROOT_DIR/temp_modules/" 2>/dev/null || true

(
  cd "$ROOT_DIR/temp_modules"
  npm install --omit=dev --force
)

mv "$ROOT_DIR/temp_modules/node_modules" "$ROOT_DIR/used_node_modules"
rm -rf "$ROOT_DIR/temp_modules"

rm -rf "$RELEASE_DIR"
rm -rf "$ROOT_DIR/build"
mkdir -p "$RELEASE_DIR"

# build windows release
mkdir -p "$ROOT_DIR/build/pixelplacejs"
cp -r "$ROOT_DIR/dist" "$ROOT_DIR/build/pixelplacejs/"
cp -r "$ROOT_DIR/used_node_modules" "$ROOT_DIR/build/pixelplacejs/node_modules"
cp -r "$ROOT_DIR/node_windows" "$ROOT_DIR/build/pixelplacejs/"
cp "$SCRIPTS_DIR/ppscript.bat" "$ROOT_DIR/build/"
cp "$SCRIPTS_DIR/bot.ppscript" "$ROOT_DIR/build/"

(
  cd "$ROOT_DIR/build"
  zip -r "$RELEASE_DIR/release_windows.zip" .
)
rm -rf "$ROOT_DIR/build"

# build linux release
mkdir -p "$ROOT_DIR/build/pixelplacejs"
cp -r "$ROOT_DIR/dist" "$ROOT_DIR/build/pixelplacejs/"
cp -r "$ROOT_DIR/used_node_modules" "$ROOT_DIR/build/pixelplacejs/node_modules"
cp -r "$ROOT_DIR/node_linux" "$ROOT_DIR/build/pixelplacejs/"
cp "$SCRIPTS_DIR/ppscript.sh" "$ROOT_DIR/build/"
cp "$SCRIPTS_DIR/bot.ppscript" "$ROOT_DIR/build/"

(
  cd "$ROOT_DIR/build"
  zip -r "$RELEASE_DIR/release_linux.zip" .
)
rm -rf "$ROOT_DIR/build"