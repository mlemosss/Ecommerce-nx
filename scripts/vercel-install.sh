#!/bin/sh
set -e

cd "$(git rev-parse --show-toplevel)"

# Vercel may restore a build cache from a previous admin deployment that
# still has the symlinks scripts/vercel-build.sh creates (apps/admin/node_modules
# pointing at the real node_modules, apps/admin/apps/storefront/.next pointing
# at the real .next). If those exist before npm install runs, they confuse
# module resolution (e.g. "Could not resolve @prisma/client despite the
# installation that we just tried"). Clear them first so install always
# starts from a clean, real filesystem state.
rm -rf apps/admin/node_modules apps/admin/apps

npm install
