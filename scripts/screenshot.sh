#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is not installed. Install it with:"
  echo "  brew tap mobile-dev-inc/tap"
  echo "  brew install maestro"
  exit 1
fi

MOCKUP_DIR="$ROOT_DIR/assets/mockups"
ARTIFACT_DIR="$ROOT_DIR/.maestro/maestro-output"

# Clean previous artifacts and screenshots
rm -rf "$ARTIFACT_DIR"
rm -rf "$MOCKUP_DIR"

mkdir -p "$ARTIFACT_DIR"
mkdir -p "$MOCKUP_DIR"

echo "📸 Running Maestro screenshot flow..."

maestro test \
  --test-output-dir "$ARTIFACT_DIR" \
  .maestro/screenshot-flow.yaml

echo "📂 Copying screenshots..."

SCREENSHOTS_FOUND=0

while IFS= read -r -d '' screenshot; do
  cp "$screenshot" "$MOCKUP_DIR/"
  SCREENSHOTS_FOUND=1
done < <(find "$ARTIFACT_DIR" -type f -name "*.png" -print0)

if [ "$SCREENSHOTS_FOUND" -eq 0 ]; then
  echo "❌ No screenshots were found in Maestro output."
  exit 1
fi

# Remove Maestro artifacts after a successful copy
rm -rf "$ARTIFACT_DIR"

echo
echo "✅ Screenshots saved to:"
echo "   $MOCKUP_DIR"
echo
echo "🧹 Cleaned up Maestro artifacts."