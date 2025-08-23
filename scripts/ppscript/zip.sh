#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
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
mkdir -p "$RELEASE_DIR"

for PLATFORM in windows linux macos; do
  BUILD_DIR="$ROOT_DIR/build/pixelplacejs"
  mkdir -p "$BUILD_DIR"
  
  cp -r "$ROOT_DIR/dist" "$BUILD_DIR/"
  cp -r "$ROOT_DIR/used_node_modules" "$BUILD_DIR/node_modules"
  cp -r "$ROOT_DIR/node_$PLATFORM" "$BUILD_DIR/"
  cp "$SCRIPTS_DIR/ppscript_$PLATFORM.${PLATFORM == windows && echo "bat" || echo "sh"}" "$ROOT_DIR/build/"
  cp "$SCRIPTS_DIR/bot.ppscript" "$ROOT_DIR/build/"
  
  (
    cd "$ROOT_DIR/build"
    zip -r "$RELEASE_DIR/release_$PLATFORM.zip" .
  )
  rm -rf "$ROOT_DIR/build"
done
