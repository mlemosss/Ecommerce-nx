#!/bin/sh
set -e

# The two Vercel projects for this repo have different Root Directories
# configured in their dashboard settings (storefront: repo root, admin:
# apps/admin), so Vercel invokes this script with different cwds. Always
# move to the repo root first so `nx build <app>` behaves the same way
# regardless of which project triggered it.
cd "$(git rev-parse --show-toplevel)"

ADMIN_PROJECT_ID="prj_rXSZns6TdaQqXUHeNrFtP7zraHWM"

if [ "$VERCEL_PROJECT_ID" = "$ADMIN_PROJECT_ID" ]; then
  npx nx build admin

  # outputDirectory in vercel.json ("apps/storefront/.next") is resolved
  # by Vercel relative to this project's Root Directory (apps/admin), i.e.
  # it looks for apps/admin/apps/storefront/.next. Symlink that expected
  # path to the real admin build output. A symlink (not a copy) matters:
  # Next's build trace files bake in relative paths like "../../node_modules"
  # computed from the app's real nesting depth (apps/admin/.next, 2 levels
  # deep), and a symlink preserves that real path for resolution, while a
  # copy to a different depth would break it.
  mkdir -p apps/admin/apps/storefront
  rm -rf apps/admin/apps/storefront/.next
  ln -s ../../.next apps/admin/apps/storefront/.next
else
  npx nx build storefront
fi
