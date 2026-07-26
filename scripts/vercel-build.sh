#!/bin/sh
set -e

# This script is used by the storefront Vercel project, whose Root
# Directory is the repo root. The admin project has its own
# apps/admin/vercel.json with a direct buildCommand, since its Root
# Directory (apps/admin) makes outputDirectory resolve correctly without
# any extra indirection here.
cd "$(git rev-parse --show-toplevel)"

npx nx build storefront
