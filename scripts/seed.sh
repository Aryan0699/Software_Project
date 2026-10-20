#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Seeding reference data and bootstrap administrator..."
node seed/seed.js

echo "Seeding buildings and rooms..."
node seed/seedBuilding.js

if [ -f data/approvedUsers.js ]; then
    echo "Seeding registration access list..."
    node seed/seedApprovedUsers.js
else
    echo "Registration access seed skipped: data/approvedUsers.js was not mounted."
fi

echo "All available seeds completed successfully."