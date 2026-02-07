# PostgreSQL Database Backup & Restore

This document provides instructions for backing up and restoring the PostgreSQL database for the time-tracker-app.

## Files

- `backup.sh` - Daily backup script
- `restore.sh` - Database restoration script

## Environment Variables

Both scripts use the following environment variables:

- `DATABASE_URL` - PostgreSQL connection URL (format: `postgresql://user:password@host:port/database`)
- `BACKUP_DIR` - Directory to store backup files (default: `D:/SideProject/time-tracker-app/backups`)

## Backup Script (`backup.sh`)

### Features

- Creates daily compressed backups using `pg_dump`
- File naming convention: `backup_YYYY-MM-DD_HHMMSS.sql`
- Automatically removes backups older than 30 days
- Automatically installs PostgreSQL client if not found
- Works on Linux, macOS, and Windows (with Git Bash or WSL)

### Usage

#### Manual Execution

```bash
# Set environment variables (if not using defaults)
export DATABASE_URL="postgresql://your_user:your_password@localhost:5432/your_database"
export BACKUP_DIR="/path/to/your/backups"

# Run backup script
./backup.sh
```

#### Setting up Daily Automated Backups

**Linux (cron):**

1. Open crontab editor:
   ```bash
   crontab -e
   ```

2. Add the following line for daily backup at 2:00 AM:
   ```
   0 2 * * * /bin/bash /path/to/time-tracker-app/scripts/backup.sh
   ```

3. Save and exit

**Windows (Task Scheduler):**

1. Open Task Scheduler
2. Create Basic Task:
   - Name: "Daily PostgreSQL Backup"
   - Trigger: "Daily" at 2:00 AM
   - Action: "Start a program"
     - Program/script: `C:\Program Files\Git\bin\bash.exe` (or your Git Bash path)
     - Add arguments: `./backup.sh`
     - Start in: `D:\SideProject\time-tracker-app\scripts`

**macOS (launchd):**

1. Create plist file at `~/Library/LaunchAgents/com.time-tracker.backup.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.time-tracker.backup</string>
       <key>ProgramArguments</key>
       <array>
           <string>/bin/bash</string>
           <string>/path/to/time-tracker-app/scripts/backup.sh</string>
       </array>
       <key>StartCalendarInterval</key>
       <dict>
           <key>Hour</key>
           <integer>2</integer>
       </dict>
   </dict>
   </plist>
   ```

2. Load the plist:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.time-tracker.backup.plist
   ```

## Restore Script (`restore.sh`)

### Features

- Restores database from backup files
- Supports both custom format (pg_dump -F c) and plain SQL backups
- Automatically drops existing database before restoration
- Validates backup file before proceeding
- Works on Linux, macOS, and Windows (with Git Bash or WSL)

### Usage

```bash
# Basic restoration
./restore.sh /path/to/backup_YYYY-MM-DD_HHMMSS.sql

# With custom backup directory
export BACKUP_DIR="/path/to/your/backups"
./restore.sh backup_YYYY-MM-DD_HHMMSS.sql
```

### Examples

```bash
# Restore latest backup
./restore.sh $(ls -t /path/to/backups/backup_*.sql | head -1)

# Restore specific backup
./restore.sh D:/SideProject/time-tracker-app/backups/backup_2024-02-06_143022.sql
```

## Backup Directory Structure

```
D:/SideProject/time-tracker-app/
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   └── BACKUP.md
└── backups/
    ├── backup_2024-02-06_143022.sql
    ├── backup_2024-02-05_143022.sql
    └── ... (keeps last 30 days)
```

## Troubleshooting

### Common Issues

1. **pg_dump command not found**
   - Install PostgreSQL client
   - Linux: `sudo apt-get install postgresql-client`
   - macOS: `brew install postgresql`

2. **Permission denied**
   - Ensure script has execute permissions: `chmod +x backup.sh restore.sh`
   - Check backup directory write permissions

3. **Database connection failed**
   - Verify DATABASE_URL format
   - Check if PostgreSQL server is running
   - Verify username and password

4. **Restore fails on existing database**
   - Script automatically drops existing database before restore
   - Ensure you have necessary permissions to drop/create databases

### Windows Notes

- Use Git Bash or WSL for best compatibility
- Paths should use forward slashes (/) or double backslashes (\\)
- Ensure PostgreSQL is installed and in PATH

### Testing

1. Create test backup:
   ```bash
   ./backup.sh
   ```

2. Test restore:
   ```bash
   # Create a temporary database for testing
   createdb test_db

   # Restore to test database
   ./restore.sh backups/backup_*.sql

   # Verify data
   psql test_db -c "SELECT COUNT(*) FROM your_table;"
   ```

## Security Considerations

- Keep backup files secure with appropriate permissions
- Store backups in a different location from the application
- Consider encrypting sensitive backups
- Regularly verify backup integrity