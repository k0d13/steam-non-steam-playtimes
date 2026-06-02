#!/usr/bin/env bash
# Publish a snapshot (pre-release) build.
#
# Fires when push-to-main has pending changesets that aren't yet merged via
# the "Pending Release" PR. Generates a beta version from those changesets,
# rebuilds, zips, and uploads to a GitHub pre-release so users can grab
# preview zips. Does NOT push tags, commits, or open a DB PR.
#
# Idempotent: snapshot versions include a timestamp + commit SHA so re-runs
# produce a distinct release rather than colliding with the previous snapshot.
set -euo pipefail

# --- Guard: bail if there are no changesets to consume ----------------------

# changesets/action also reports `published: false` when there are no
# changesets at all. Without this check we'd re-tag the current stable version.
shopt -s nullglob
pending=(.changeset/*.md)
shopt -u nullglob
pending_count=0
for f in "${pending[@]}"; do
  [ "$(basename "$f")" != "README.md" ] && pending_count=$((pending_count + 1))
done
if [ "$pending_count" -eq 0 ]; then
  echo "No pending changesets, skipping snapshot release."
  exit 0
fi

# --- Bump to a snapshot version ---------------------------------------------

pnpm exec changeset version --snapshot beta

snapshot_version=$(jq -r .version package.json)
name=$(jq -r .name plugin.json)

# --- Mirror version into plugin.json ----------------------------------------

# Done before the build so the snapshot version gets baked into anything that
# reads plugin.json at build time.
tmp=$(mktemp)
jq --arg v "$snapshot_version" '.version = $v' plugin.json > "$tmp"
mv "$tmp" plugin.json

# --- Build ------------------------------------------------------------------

pnpm build

# --- Zip --------------------------------------------------------------------

tag="v${snapshot_version}"
zip_name="${name}-${snapshot_version}.zip"
zip_targets=(plugin.json .millennium)
[ -d backend ] && zip_targets+=(backend)
zip -r "$zip_name" "${zip_targets[@]}"

# --- GitHub pre-release -----------------------------------------------------

gh release create "$tag" "$zip_name" \
  --title "$tag" \
  --notes "Snapshot build from commit ${GITHUB_SHA}. Not a stable release." \
  --prerelease \
  --target "$GITHUB_SHA"
