#!/bin/bash
# Vercel Ignored Build Step
# Exit 0: Skip build
# Exit 1: Proceed with build
#
# This script limits preview deployments to only the develop branch.
# For other branches, use the manual deploy workflow in GitHub Actions.

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# Always build for production (main branch)
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]; then
  echo "✓ Production build (main branch) - proceeding"
  exit 1
fi

# Build for develop branch (preview)
if [[ "$VERCEL_GIT_COMMIT_REF" == "develop" ]]; then
  echo "✓ Preview build (develop branch) - proceeding"
  exit 1
fi

# Skip builds for all other branches (feature branches, PR branches, etc.)
echo "⊘ Skipping build for branch: $VERCEL_GIT_COMMIT_REF"
echo "  Use GitHub Actions 'Manual Preview Deploy' workflow to deploy this branch."
exit 0
