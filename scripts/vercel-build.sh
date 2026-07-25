#!/bin/sh
set -e

# Projects "storefront" and "admin" share the same repo root as Vercel
# Root Directory, so a single vercel.json build command has to pick the
# right Nx app based on which Vercel project is building. outputDirectory
# is fixed to apps/storefront/.next, so when building admin we symlink it
# there instead of copying: Next's build trace files bake in relative
# paths (e.g. "../../node_modules") computed from the app's real nesting
# depth, so a copy to a shallower path breaks them, but a same-depth
# symlink (apps/storefront/.next -> apps/admin/.next) resolves correctly.
ADMIN_PROJECT_ID="prj_rXSZns6TdaQqXUHeNrFtP7zraHWM"

if [ "$VERCEL_PROJECT_ID" = "$ADMIN_PROJECT_ID" ]; then
  npx nx build admin
  rm -rf apps/storefront/.next
  ln -s ../admin/.next apps/storefront/.next
else
  npx nx build storefront
fi
