# SFTP Server with UI and Cronjob Management

A Docker-based SFTP server with a web UI for managing cronjobs and processing uploaded files. Deployable on Railway.

## Features

- **SFTP Server**: Secure file transfer using OpenSSH
- **Web UI**: Modern interface for managing cronjobs and viewing file uploads
- **Cronjob Management**: Create, update, delete, and monitor cronjobs
- **File Processing**: Automatic processing of uploaded files (JSON, CSV, TXT)
- **Database**: PostgreSQL for storing cronjobs and file metadata
- **Docker**: Fully containerized with Docker Compose

## Architecture

- **Application Container**: Combined SFTP server (OpenSSH) and Node.js/Express web app
- **Database**: PostgreSQL for data persistence
- **File Watcher**: Monitors SFTP upload directory for new files

## Quick Start

### Local Development

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Start services with Docker Compose**:
```bash
docker-compose up -d
```

3. **Access the application**:
   - Web UI: http://localhost:3000
   - SFTP Server: localhost:2222
   - PostgreSQL: localhost:5432

### SFTP Connection

Connect to the SFTP server:
```bash
sftp -P 2222 sftpuser@localhost
# Password: sftpuser123
```

Upload files to the `/uploads` directory in the SFTP session.

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Web server port (default: 3000)
- `SFTP_UPLOAD_DIR`: Directory to watch for uploaded files
- `NODE_ENV`: Environment (development/production)

### SFTP User Setup

Default SFTP user:
- Username: `sftpuser`
- Password: `sftpuser123`
- Upload directory: `/home/sftpuser/uploads`

To change credentials, modify `Dockerfile.sftp`.

## Railway Deployment

1. **Create a Railway project** and connect your repository

2. **Add services**:
   - PostgreSQL database service
   - Docker service (using the Dockerfile)

3. **Set environment variables**:
   - `DATABASE_URL`: Provided by Railway PostgreSQL service
   - `PORT`: Railway will set this automatically
   - `SFTP_UPLOAD_DIR`: Set to `/home/sftpuser/uploads`
   - `NODE_ENV`: `production`

4. **Configure ports**:
   - Port 22 (SFTP) - Railway will assign a port
   - Port 3000 (Web UI) - Railway will assign a port

5. **Deploy**: Railway will automatically build and deploy using the Dockerfile

### Railway Notes

- Both SFTP and web UI run in the same container
- For production, consider using Railway's volume storage for persistent file storage
- Database migrations run automatically on startup
- Note: Railway may require additional configuration to expose port 22 for SFTP

## API Endpoints

### Cronjobs

- `GET /api/cronjobs` - List all cronjobs
- `GET /api/cronjobs/:id` - Get cronjob by ID
- `POST /api/cronjobs` - Create new cronjob
- `PUT /api/cronjobs/:id` - Update cronjob
- `DELETE /api/cronjobs/:id` - Delete cronjob
- `GET /api/cronjobs/:id/executions` - Get execution history

### Files

- `GET /api/files` - List uploaded files
- `GET /api/files/:id` - Get file by ID
- `GET /api/files/stats/summary` - Get file statistics

### Health

- `GET /health` - Health check endpoint

## Cronjob Schedule Format

Use standard cron expressions:
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight
- `*/5 * * * *` - Every 5 minutes
- `0 0 * * 0` - Weekly on Sunday

## File Processing

The system automatically processes files based on their extension:

- **JSON**: Parses and extracts metadata (keys, record count)
- **CSV**: Analyzes structure (headers, line count)
- **TXT**: Counts lines, words, and characters
- **Other**: Generic processing with file metadata

## Development

### Run locally without Docker

```bash
# Install dependencies
npm install

# Start PostgreSQL locally or use Docker
docker-compose up -d postgres

# Run migrations and start server
npm start
```

### Development with hot reload

```bash
npm run dev
```

## Project Structure

```
sftp-node/
├── src/
│   ├── server.js           # Main Express server
│   ├── db/
│   │   ├── connection.js   # Database connection
│   │   └── schema.sql      # Database schema
│   ├── sftp/
│   │   └── sftp-watcher.js # File watcher
│   ├── cron/
│   │   ├── scheduler.js    # Cron scheduler
│   │   └── cronjob-service.js # CRUD operations
│   ├── handlers/
│   │   └── file-handler.js # File processing
│   └── routes/
│       ├── cronjobs.js     # Cronjob API routes
│       └── files.js        # File API routes
├── ui/
│   └── public/
│       └── index.html      # Web UI
├── docker-compose.yml
├── Dockerfile              # Combined SFTP + Web App
└── package.json
```

## License

ISC

