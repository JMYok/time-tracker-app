#!/bin/bash

# PostgreSQL Database Restoration Script
# Restores database from a backup file

# Check if backup file is provided as argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 D:/SideProject/time-tracker-app/backups/backup_2024-02-06_143022.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

# Set environment variables
DATABASE_URL=${DATABASE_URL:-"postgresql://user:password@localhost:5432/time_tracker"}

# Extract connection parameters from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):[^@]*@\([^:]*\):\([^/]*\)\/.*/\2/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):[^@]*@\([^:]*\):\([^/]*\)\/.*/\3/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\(.*\)$/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

# If DB_USER not found, extract password first then user
if [ -z "$DB_USER" ]; then
    # Handle case where username might be empty
    PWD_PART=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/:\([^@]*\)@.*/\1/p')
    if [ -n "$PWD_PART" ]; then
        # No user specified, extract port and name directly
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\(.*\)$/\1/p')
        # Use default user
        DB_USER="postgres"
    else
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    fi
fi

# Fallback to default values if extraction fails
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"time_tracker"}
DB_USER=${DB_USER:-"postgres"}

echo "Restoring database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"

# Check if pg_restore is available
if command -v pg_restore >/dev/null 2>&1; then
    echo "Using pg_restore for custom format backup..."

    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | grep -qw "$DB_NAME"; then
        echo "Database '$DB_NAME' exists, dropping for clean restore..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    fi

    # Create new database
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

    # Restore the database
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$BACKUP_FILE"; then
        echo "✓ Database restored successfully from $BACKUP_FILE"
    else
        echo "✗ Restoration failed"
        exit 1
    fi
elif command -v psql >/dev/null 2>&1; then
    # Check if it's a plain SQL backup
    if file "$BACKUP_FILE" | grep -q "ASCII text\|text\"; then
        echo "Plain SQL backup detected, using psql..."

        # Check if database exists
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | grep -qw "$DB_NAME"; then
            echo "Database '$DB_NAME' exists, dropping for clean restore..."
            dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        fi

        # Create new database
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

        # Restore from SQL file
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"; then
            echo "✓ Database restored successfully from $BACKUP_FILE"
        else
            echo "✗ Restoration failed"
            exit 1
        fi
    else
        echo "✗ pg_restore not found and backup is not plain SQL"
        echo "Please install PostgreSQL client first"
        exit 1
    fi
else
    echo "✗ PostgreSQL client not found"
    echo "Installing PostgreSQL..."

    # Try to install PostgreSQL on Linux/Mac
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y postgresql-client
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install postgresql
    else
        echo "Please install PostgreSQL client manually"
        exit 1
    fi

    # Try restore again after installation
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$BACKUP_FILE"; then
        echo "✓ Database restored successfully after installation: $BACKUP_FILE"
    else
        echo "✗ Restoration still failed"
        exit 1
    fi
fi

# Check backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup file size: $BACKUP_SIZE"

echo "Restoration completed successfully"