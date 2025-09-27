# PromptMap V2

A comprehensive prompt injection testing framework with a FastAPI backend and React TypeScript frontend. PromptMap V2 provides advanced testing capabilities for AI model security, including vector-based analysis using PostgreSQL with pgvector extension.

## 🚀 Features

- **Advanced Prompt Testing**: Comprehensive framework for testing prompt injection vulnerabilities
- **Vector Analysis**: Uses pgvector extension for similarity search and embedding operations
- **Real-time Interface**: React TypeScript frontend with Material-UI components
- **FastAPI Backend**: High-performance Python backend with async database operations
- **Multi-Model Support**: Compatible with OpenAI and Anthropic AI models
- **Session Management**: Organize and track testing sessions
- **Results Analytics**: Detailed analysis and visualization of test results

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI Application**: Modern, fast web framework with automatic API documentation
- **Async Database Layer**: SQLAlchemy with PostgreSQL and pgvector support
- **API Routes**: Organized endpoints for sessions, tests, models, configuration, and results
- **Vector Operations**: Advanced similarity search and embedding capabilities

### Frontend (React + TypeScript)
- **React 18**: Modern React with TypeScript for type safety
- **Material-UI**: Professional component library with synthwave theme
- **Real-time Updates**: Socket.IO integration for live test progress
- **Data Visualization**: Chart.js integration for results analytics
- **Responsive Design**: Works across desktop and mobile devices

### Database
- **PostgreSQL 15**: Robust relational database with advanced features
- **pgvector Extension**: Vector similarity search and indexing (HNSW/IVFFlat)
- **Async Operations**: Non-blocking database operations for better performance

## 📋 Prerequisites

- **macOS**: Development environment optimized for macOS
- **PostgreSQL 15**: Required for database operations
- **Node.js 16+**: For frontend development
- **Python 3.8+**: For backend development
- **Homebrew**: For package management

## 🛠️ Installation

### Quick Setup (Recommended)
Run the automated setup script that configures the entire environment:

```bash
./setup.sh
```

This script will:
- Install PostgreSQL 15 via Homebrew
- Compile and install pgvector extension
- Set up Python virtual environment
- Install all dependencies
- Configure database connections
- Start all services

### Manual Setup

#### 1. Database Setup
```bash
# Install PostgreSQL 15
brew install postgresql@15
brew services start postgresql@15

# Compile pgvector from source (required for PostgreSQL@15)
cd /tmp
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
make && make install

# Enable pgvector extension
psql -U [username] -d promptmap_web -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
```

#### 4. Environment Configuration
Copy and configure the environment file:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

## 🚀 Running the Application

### Start All Services
```bash
./start-promptmap.sh
```

### Stop All Services
```bash
./stop-promptmap.sh
```

### Manual Startup

#### Backend (Port 12001)
```bash
cd backend
source venv/bin/activate
python main.py
```

#### Frontend (Port 3000)
```bash
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:12001
- **API Documentation**: http://localhost:12001/docs

## 📚 API Documentation

The FastAPI backend provides automatic interactive API documentation:
- **Swagger UI**: http://localhost:12001/docs
- **ReDoc**: http://localhost:12001/redoc

### Main API Endpoints

- `/api/sessions` - Session management and tracking
- `/api/tests` - Test execution and configuration
- `/api/models` - AI model configuration and management
- `/api/config` - Application configuration settings
- `/api/prompts` - Prompt management and templates
- `/api/results` - Test results and analytics

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Backend Testing
Backend testing framework to be implemented.

## 🔧 Development

### Backend Development
The backend uses FastAPI with auto-reload enabled in debug mode:
```bash
cd backend
source venv/bin/activate
python main.py
```

### Frontend Development
The frontend uses Create React App with hot reloading:
```bash
cd frontend
npm start
```

### Code Style
- Backend: Follows PEP 8 Python style guidelines
- Frontend: Uses TypeScript with strict mode enabled
- Material-UI components for consistent styling

## 📁 Project Structure

```
promptmap-v2/
├── backend/                 # FastAPI backend
│   ├── api/                # API route handlers
│   ├── database/           # Database configuration
│   ├── models/             # SQLAlchemy models
│   ├── venv/              # Python virtual environment
│   ├── main.py            # FastAPI application entry point
│   └── requirements.txt   # Python dependencies
├── frontend/              # React TypeScript frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── package.json      # Node.js dependencies
├── docs/                 # Documentation
├── logs/                 # Application logs
├── scripts-archive/      # Archived utility scripts
├── setup.sh             # Automated setup script
├── start-promptmap.sh   # Start all services
├── stop-promptmap.sh    # Stop all services
└── CLAUDE.md           # Claude Code integration guide
```

## 🔑 Environment Variables

Configure the following in your `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promptmap_web
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# FastAPI Configuration
API_PORT=12001
DEBUG=True
CORS_ORIGINS=["http://localhost:3000"]

# API Keys (Optional)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## 🔒 Security

- API keys and sensitive data are stored in `.env` (excluded from git)
- CORS properly configured for development and production
- SQL injection protection via SQLAlchemy ORM
- Input validation using Pydantic models

## 📖 Documentation

- **pgvector Setup**: See `docs/PGVECTOR_SETUP.md` for detailed installation guide
- **Claude Integration**: See `CLAUDE.md` for Claude Code development guidelines
- **API Reference**: Available at http://localhost:12001/docs when running

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

#### pgvector Extension Not Found
If you see pgvector-related errors:
```bash
# Reinstall pgvector
cd /tmp && rm -rf pgvector
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector && export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
make clean && make && make install
```

#### Database Connection Issues
Ensure PostgreSQL is running and credentials are correct:
```bash
brew services restart postgresql@15
psql -U [username] -d promptmap_web -c "SELECT version();"
```

#### Port Conflicts
If ports 3000 or 12001 are in use:
```bash
# Find and kill processes using the ports
lsof -ti:3000 | xargs kill -9
lsof -ti:12001 | xargs kill -9
```

For more issues, check the logs in the `logs/` directory or the console output.

## 🔗 Related Projects

This is version 2 of PromptMap. The original database from PromptMap V1 is reused for continuity.