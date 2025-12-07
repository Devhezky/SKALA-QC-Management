#!/bin/sh
set -e

DB_PATH="/app/db/custom.db"
TEMPLATE_PATH="/app/db-template/custom.db"

# Check if database file exists in volume
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH."
    
    # Create db directory if not exists
    mkdir -p /app/db
    
    # Copy template database (created during build)
    if [ -f "$TEMPLATE_PATH" ]; then
        echo "Copying database template..."
        cp "$TEMPLATE_PATH" "$DB_PATH"
        echo "Database initialized from template!"
    else
        echo "WARNING: No database template found. Database may not work."
    fi
else
    echo "Database found at $DB_PATH"
fi

# Start the application
exec node server.js
