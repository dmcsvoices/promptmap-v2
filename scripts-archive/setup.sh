#!/bin/bash

# PromptMap V2 - Complete Infrastructure Setup Script
# This script sets up PostgreSQL, pgvector, creates the database, 
# and prepares the backend and frontend skeleton

set -e  # Exit on any error

echo "🚀 PromptMap V2 Setup Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS. Please adapt for your OS."
    exit 1
fi

print_info "Setting up PromptMap V2 infrastructure..."

# 1. Install/Update Homebrew
print_info "Checking Homebrew installation..."
if ! command -v brew &> /dev/null; then
    print_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    print_status "Homebrew already installed"
fi

# 2. Install PostgreSQL
print_info "Installing/Updating PostgreSQL..."
if brew list postgresql@15 &>/dev/null; then
    print_status "PostgreSQL 15 already installed"
else
    brew install postgresql@15
    print_status "PostgreSQL 15 installed"
fi

# 3. Install pgvector
print_info "Installing pgvector extension..."
if brew list pgvector &>/dev/null; then
    print_status "pgvector already installed"
else
    brew install pgvector
    print_status "pgvector installed"
fi

# 4. Start PostgreSQL service
print_info "Starting PostgreSQL service..."
brew services start postgresql@15
sleep 3  # Give it time to start
print_status "PostgreSQL service started"

# 5. Create database and user
print_info "Setting up database and user..."

# Database configuration
DB_NAME="promptmap_v2"
DB_USER="promptmap_v2_user"
DB_PASSWORD="promptmap_v2_secure_password"
DB_HOST="localhost"
DB_PORT="5432"

# Create user and database
psql postgres << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
        RAISE NOTICE 'User $DB_USER created';
    ELSE
        RAISE NOTICE 'User $DB_USER already exists';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

print_status "Database user and database created"

# 6. Set up pgvector extension in the new database
print_info "Setting up pgvector extension..."
psql -d $DB_NAME << EOF
-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions to user
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

print_status "pgvector extension configured"

# 7. Test database connection
print_info "Testing database connection..."
if psql -d $DB_NAME -U $DB_USER -h $DB_HOST -p $DB_PORT -c "SELECT 'Connection successful!' as status;" &>/dev/null; then
    print_status "Database connection test successful"
else
    print_error "Database connection test failed"
    exit 1
fi

# 8. Create environment file
print_info "Creating environment configuration..."
cat > .env << EOF
# PromptMap V2 Environment Configuration
# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# API Configuration
API_HOST=localhost
API_PORT=8000
DEBUG=true

# Frontend Configuration
FRONTEND_PORT=3000

# Security
SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# API Keys (add your keys here)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Logging
LOG_LEVEL=INFO
EOF

print_status "Environment file created"

# 9. Install Python dependencies
print_info "Setting up Python backend environment..."
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is required. Please install Python 3.8+"
    exit 1
fi

# Create virtual environment for backend
cd backend
python3 -m venv venv
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
alembic==1.12.1
pydantic==2.5.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
pgvector==0.2.4
httpx==0.25.2
openai==1.3.5
anthropic==0.7.7
ollama==0.1.7
requests==2.31.0
websockets==11.0.3
pytest==7.4.3
pytest-asyncio==0.21.1
EOF

print_info "Installing Python dependencies..."
pip install -r requirements.txt
print_status "Python backend environment ready"

# Go back to project root
cd ..

# 10. Install Node.js dependencies
print_info "Setting up React frontend environment..."
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js via Homebrew..."
    brew install node
fi

if ! command -v yarn &> /dev/null; then
    print_info "Installing Yarn..."
    npm install -g yarn
fi

# Create React app
cd frontend
if [ ! -f package.json ]; then
    print_info "Creating React application..."
    npx create-react-app . --template typescript
fi

# Install additional dependencies
yarn add @mui/material @emotion/react @emotion/styled
yarn add @mui/icons-material
yarn add axios
yarn add react-router-dom
yarn add @types/node @types/react @types/react-dom
yarn add socket.io-client

print_status "React frontend environment ready"

# Go back to project root
cd ..

# 11. Create basic directory structure
print_info "Creating project structure..."
mkdir -p backend/{api,models,database,core,tests}
mkdir -p frontend/src/{components,pages,services,hooks,types,utils}
mkdir -p database/{migrations,seeds}
mkdir -p docs

print_status "Project structure created"

print_status "✨ PromptMap V2 infrastructure setup complete!"
echo ""
print_info "Next steps:"
echo "1. Add your API keys to .env file"
echo "2. Run 'cd backend && source venv/bin/activate && python main.py' to start backend"
echo "3. Run 'cd frontend && yarn start' to start frontend"
echo "4. Backend will be available at http://localhost:8000"
echo "5. Frontend will be available at http://localhost:3000"
echo ""
print_info "Database connection details:"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo "- Host: $DB_HOST:$DB_PORT"
echo "- Connection string available in .env file"