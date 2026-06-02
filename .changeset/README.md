# Changesets

This directory holds [changesets](https://github.com/changesets/changesets). Each markdown file describes a pending change and the semver bump it requires.

To add one:

```sh
pnpm changeset
```

Pick a bump (`patch`, `minor`, `major`) and write a short summary. Commit the generated file alongside your change.

On merge to `main`, the `Pipeline` workflow opens (or updates) a "Pending Release" PR that consumes all queued changesets, bumps the version in `package.json` + `plugin.json`, and updates `CHANGELOG.md`. Merging that PR triggers the release: it builds the plugin, zips it, and publishes a GitHub release with the zip attached.
