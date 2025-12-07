#!/bin/sh
set -e

DB_PATH="/app/db/custom.db"

# Check if database file exists
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH. Initializing..."
    
    # Create db directory if not exists
    mkdir -p /app/db
    
    # Run prisma db push to create schema
    npx prisma db push --skip-generate
    
    echo "Database initialized successfully!"
else
    echo "Database found at $DB_PATH"
fi

# Start the application
exec node server.js
