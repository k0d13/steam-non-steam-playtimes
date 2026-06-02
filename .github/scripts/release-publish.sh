#!/usr/bin/env bash
# Publish a stable release:
#   1. Zip plugin.json + .millennium/ into <name>-<version>.zip
#   2. Tag, push, and create a GitHub release with the zip attached
#   3. Push an update branch to a fork of SteamClientHomeBrew/PluginDatabase
#      advancing this plugin's submodule pointer to the new release commit
#   4. Leave a commit comment with a prefilled "compare" link so the maintainer
#      can manually open the upstream PR (rather than us auto-spamming it)
#
# Each step is idempotent: re-running after a partial failure heals the missing
# pieces instead of creating duplicates.
#
# Required env:
#   GITHUB_TOKEN     — provided by Actions; used for this repo's release and
#                      for the commit comment on this repo
#   PLUGIN_DB_TOKEN  — PAT with Contents: write on the fork; used to push
#                            the update branch. The fork lives under the PAT
#                            owner's account.
set -euo pipefail

name=$(jq -r .name plugin.json)
version=$(jq -r .version plugin.json)
tag="v${version}"
zip_name="${name}-${version}.zip"

# --- Zip --------------------------------------------------------------------

if [ ! -f "$zip_name" ]; then
  zip_targets=(plugin.json .millennium)
  [ -d backend ] && zip_targets+=(backend)
  zip -r "$zip_name" "${zip_targets[@]}"
fi

# --- Git tag ----------------------------------------------------------------

# Check the remote, not just local — Actions checkouts are shallow and don't
# include tags by default, so a re-run after a previous push wouldn't see it.
# If the tag is already on the remote, a prior run already did everything
# below; bail out without printing the magic line so changesets/action
# doesn't try to re-push the tag and fail.
if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
  echo "Tag ${tag} already on remote — nothing to publish."
  exit 0
fi
git tag -f "$tag"
git push origin "$tag"

# --- GitHub release ---------------------------------------------------------

if ! gh release view "$tag" >/dev/null 2>&1; then
  # Extract just this version's section from CHANGELOG.md (between `## X.Y.Z`
  # and the next `## ` header) so release notes aren't the entire history.
  notes_file=$(mktemp)
  if [ -f CHANGELOG.md ]; then
    awk -v ver="$version" '
      $0 == "## " ver { capture = 1; next }
      capture && /^## / { exit }
      capture { print }
    ' CHANGELOG.md > "$notes_file"
  fi
  gh release create "$tag" "$zip_name" --title "$tag" --notes-file "$notes_file"
fi

# --- Plugin database update branch ------------------------------------------

upstream="SteamClientHomeBrew/PluginDatabase"
branch="update-${name}-${version}"
release_url="https://github.com/${GITHUB_REPOSITORY}/releases/tag/${tag}"

export GH_TOKEN="$PLUGIN_DB_TOKEN"

fork_owner=$(gh api user --jq .login)
fork="${fork_owner}/SteamClientHomeBrew_PluginDatabase"
# Only fork if it doesn't already exist — fine-grained PATs can't fork repos
# they don't own, so skip if the fork is already in place.
if ! gh repo view "$fork" >/dev/null 2>&1; then
  gh repo fork "$upstream" \
    --clone=false \
    --default-branch-only \
    --fork-name SteamClientHomeBrew_PluginDatabase >/dev/null
fi

# Build/update the branch on the fork.
workdir=$(mktemp -d)
gh repo clone "$fork" "$workdir" -- --depth=1
pushd "$workdir" >/dev/null

git remote add upstream "https://github.com/${upstream}.git" 2>/dev/null \
  || git remote set-url upstream "https://github.com/${upstream}.git"
git fetch upstream main --depth=1
git checkout -B "$branch" upstream/main

# Find the submodule path inside PluginDatabase. Prefer an explicit override
# via PLUGIN_DB_SUBMODULE_PATH (useful when this repo has been renamed since
# being added to PluginDatabase and the .gitmodules URL no longer matches).
# Otherwise look up by URL — GitHub redirects old URLs for fetch but our
# grep can't see through the rename.
if [ -n "${PLUGIN_DB_SUBMODULE_PATH:-}" ]; then
  submodule_path="$PLUGIN_DB_SUBMODULE_PATH"
else
  # `|| true` on grep/git-config so pipefail doesn't kill the script when
  # there's no match — we want to fall through to the helpful error below.
  submodule_key=$(
    { git config -f .gitmodules --get-regexp 'submodule\..*\.url' 2>/dev/null || true; } \
      | { grep -iE "[/:]${GITHUB_REPOSITORY}(\.git)?\$" || true; } \
      | head -n1 \
      | awk '{print $1}' \
      | sed 's/\.url$//'
  )
  if [ -z "$submodule_key" ]; then
    echo "Could not find a submodule in ${fork} pointing at ${GITHUB_REPOSITORY}." >&2
    echo "If this repo has been renamed since being added to PluginDatabase," >&2
    echo "set PLUGIN_DB_SUBMODULE_PATH to the submodule's path explicitly." >&2
    exit 1
  fi
  submodule_path=$(git config -f .gitmodules "${submodule_key}.path")
fi

git submodule update --init "$submodule_path"

# Pin the submodule to the exact commit we just tagged, rather than tracking
# the configured remote branch — otherwise a commit landing on main between
# `git tag` and now would advance the DB PR past the release.
git -C "$submodule_path" fetch origin "$GITHUB_SHA" --depth=1
git -C "$submodule_path" checkout --detach "$GITHUB_SHA"

# Guard against re-runs where the submodule is already at the target commit.
if git diff --quiet -- "$submodule_path"; then
  echo "Submodule ${submodule_path} already at latest, no commit needed."
else
  git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -am "Update \`${name}\` to ${tag}"
fi

git push -f "https://x-access-token:${PLUGIN_DB_TOKEN}@github.com/${fork}.git" "$branch"

popd >/dev/null

# --- Notify via commit comment ---------------------------------------------

# Render the PR body from the template, then leave a commit comment on the
# release commit with a prefilled compare URL + the body to paste. The
# maintainer opens the upstream PR manually rather than us spamming it.

pr_body=$(mktemp)
sed \
  -e "s|REPLACE_WITH_PLUGIN_NAME|${name}|g" \
  -e "s|REPLACE_WITH_UPDATE_SUMMARY|See full release notes: ${release_url}|g" \
  .github/plugin-db-pr-template.md > "$pr_body"

pr_title="Update \`${name}\` to ${tag}"
encoded_title=$(jq -nr --arg s "$pr_title" '$s|@uri')
compare_url="https://github.com/${upstream}/compare/main...${fork_owner}:${branch}?quick_pull=1&title=${encoded_title}"

comment_body=$(cat <<EOF
## Plugin database update ready for ${tag}

Branch \`${branch}\` has been pushed to [\`${fork}\`](https://github.com/${fork}/tree/${branch}).

**[Open the PR against \`${upstream}\` →](${compare_url})**

Paste this as the PR body:

\`\`\`\`md
$(cat "$pr_body")
\`\`\`\`
EOF
)

# Use this repo's GITHUB_TOKEN (not the PAT, which has no access here) to
# leave the comment on this repo's release commit.
GH_TOKEN="$GITHUB_TOKEN" gh api \
  "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/comments" \
  -f body="$comment_body" >/dev/null

# Magic line changesets/action greps for to set published: true
echo "🦋  New tag:  ${name}@${version}"
