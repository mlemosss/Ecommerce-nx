#!/bin/sh
set -e

# Projects "storefront" and "admin" share the same repo root as Vercel
# Root Directory, so a single vercel.json build command has to pick the
# right Nx app based on which Vercel project is building.
ADMIN_PROJECT_ID="prj_rXSZns6TdaQqXUHeNrFtP7zraHWM"

if [ "$VERCEL_PROJECT_ID" = "$ADMIN_PROJECT_ID" ]; then
  npx nx build admin
  BUILD_OUTPUT="apps/admin/.next"
else
  npx nx build storefront
  BUILD_OUTPUT="apps/storefront/.next"
fi

rm -rf .vercel-build-output
cp -r "$BUILD_OUTPUT" .vercel-build-output
