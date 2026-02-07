#!/bin/bash

# PostgreSQL Daily Backup Script
# Creates daily backups of the PostgreSQL database

# Set environment variables
DATABASE_URL=${DATABASE_URL:-"postgresql://user:password@localhost:5432/time_tracker"}
BACKUP_DIR=${BACKUP_DIR:-"D:/SideProject/time-tracker-app/backups"}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

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

echo "Creating backup of database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"

# Create backup using pg_dump
if command -v pg_dump >/dev/null 2>&1; then
    # Create custom format backup with compression
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ Backup created successfully: $BACKUP_FILE"

        # Keep only 30 days of backups
        echo "Removing backups older than 30 days..."
        find "$BACKUP_DIR" -name "backup_*.sql*" -mtime +30 -delete
        echo "✓ Old backups cleaned up"
    else
        echo "✗ Backup failed"
        exit 1
    fi
else
    echo "✗ pg_dump command not found"
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

    # Try backup again after installation
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ Backup created successfully after installation: $BACKUP_FILE"
    else
        echo "✗ Backup still failed"
        exit 1
    fi
fi

# Print backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

echo "Backup completed successfully"