#!/usr/bin/env bash
set -euo pipefail

# Automated release script for forge-ai-init
# Usage: ./scripts/release.sh <major|minor|patch>
#
# Steps:
#   1. Validates clean working tree on main
#   2. Runs full validation (lint + typecheck + build + test)
#   3. Bumps version in package.json + package-lock.json
#   4. Promotes [Unreleased] CHANGELOG entries to new version
#   5. Commits, tags, and pushes
#   6. Creates GitHub release (triggers npm publish via workflow)

BUMP="${1:-}"
if [[ -z "$BUMP" || ! "$BUMP" =~ ^(major|minor|patch)$ ]]; then
	echo "Usage: $0 <major|minor|patch>"
	exit 1
fi

BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
	echo "Error: must be on main branch (current: $BRANCH)"
	exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
	echo "Error: working tree is not clean"
	exit 1
fi

echo "Running full validation..."
npm run validate

OLD_VERSION=$(node -p "require('./package.json').version")
npm version "$BUMP" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

echo "Bumping: $OLD_VERSION → $NEW_VERSION"

# Update CHANGELOG: promote [Unreleased] to new version
DATE=$(date +%Y-%m-%d)
if grep -q "## \[Unreleased\]" CHANGELOG.md; then
	sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md
	rm -f CHANGELOG.md.bak
	echo "CHANGELOG.md updated with [$NEW_VERSION] - $DATE"
else
	echo "Warning: no [Unreleased] section found in CHANGELOG.md"
fi

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main --tags

echo ""
echo "Creating GitHub release..."
gh release create "v$NEW_VERSION" \
	--title "v$NEW_VERSION" \
	--notes "See [CHANGELOG.md](https://github.com/Forge-Space/forge-ai-init/blob/main/CHANGELOG.md#$(echo "$NEW_VERSION" | tr '.' '')---$DATE) for details." \
	--latest

echo ""
echo "Release v$NEW_VERSION created and pushed."
echo "npm publish will be triggered automatically by the publish workflow."
