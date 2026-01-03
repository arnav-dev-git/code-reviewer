# Database Setup Instructions

## Prerequisites
- MySQL server installed and running
- MySQL credentials (username, password, host, port)

## Setup Steps

### 1. Create a `.env` file in the `backend` directory

Copy `example.env` to `.env` and fill in your database credentials:

```env
# MYSQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_DEFAULT_DATABASE=code_reviewer
```

### 2. Run the database setup script

This will create the database and all required tables:

```bash
cd backend
npm run setup-db
```

Or manually:

```bash
cd backend
npm run build
node dist/database/setup/createTables.js
```

### 3. Verify the connection

Start your backend server:

```bash
npm run dev
```

You should see:
- `✅ Database connection pool created successfully` if connection is successful
- Error messages with troubleshooting tips if connection fails

## Troubleshooting

### Connection Timeout (ETIMEDOUT)

**Possible causes:**
1. MySQL server is not running
   - **Windows**: Check Services, start MySQL service
   - **Linux/Mac**: `sudo systemctl start mysql` or `brew services start mysql`

2. Wrong host/port
   - Default: `localhost:3306`
   - Check your MySQL configuration

3. Database doesn't exist
   - Run the setup script: `npm run setup-db`

4. Wrong credentials
   - Verify username and password in `.env` file

5. Firewall blocking connection
   - Check if port 3306 is accessible

### Test MySQL Connection Manually

```bash
mysql -h localhost -P 3306 -u root -p
```

If this works, your MySQL is running and accessible.

### Create Database Manually

If the setup script fails, you can create the database manually:

```sql
CREATE DATABASE code_reviewer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run the setup script again.

