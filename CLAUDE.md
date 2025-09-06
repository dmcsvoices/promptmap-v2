# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptMap V2 is a prompt injection testing framework with a FastAPI backend and React TypeScript frontend. The application uses PostgreSQL with pgvector extension for data storage and vector operations.

## Architecture

### Backend (FastAPI + Python)
- **Main App**: `backend/main.py` - FastAPI application with CORS, health checks, and API routes
- **Database Layer**: `backend/database/connection.py` - PostgreSQL connection with SQLAlchemy async
- **Models**: `backend/models/` - SQLAlchemy models for sessions, test rules, configurations, results
- **API Routes**: `backend/api/` - FastAPI routers for sessions, tests, models, config, prompts, results
- **Virtual Environment**: `backend/venv/` - Python virtual environment

### Frontend (React + TypeScript)
- **Create React App**: TypeScript template with Material-UI components
- **Dependencies**: React 18, MUI, Axios, React Router, Socket.IO client, Chart.js
- **Development Server**: Proxies API calls to `http://localhost:12001`

### Database
- PostgreSQL with pgvector extension for vector operations
- Configuration stored in `.env` file
- Uses existing database `promptmap_web` from V1 located in the `../promptmap-web` folder (at the same level as this project)

## Development Commands

### Backend Setup and Running
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
Backend runs on http://localhost:12001

### Frontend Setup and Running  
```bash
cd frontend
npm start
# or
yarn start
```
Frontend runs on http://localhost:3000

### Initial Setup
Run the setup script to configure the entire environment:
```bash
./setup.sh
```

### Testing
- **Frontend**: `npm test` or `yarn test` (React Testing Library + Jest)
- **Backend**: No specific test command configured yet

## Key Configuration Files

- `.env` - Environment variables including database credentials and API keys
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node.js dependencies and scripts
- `setup.sh` - Complete infrastructure setup script for macOS

## Database Connection

The application connects to PostgreSQL using async SQLAlchemy. Database connection details:
- Connection handled in `backend/database/connection.py`
- Health check endpoint: `/health` and `/api/test-db`
- Uses pgvector extension for vector operations

## API Endpoints Structure

Main API routes are organized as:
- `/api/sessions` - Session management
- `/api/tests` - Test execution  
- `/api/models` - AI model configuration
- `/api/config` - Application configuration
- `/api/prompts` - Prompt management
- `/api/results` - Test results

## Development Notes

- Backend uses FastAPI with auto-reload in debug mode
- Frontend uses Create React App development server with hot reloading
- CORS is configured to allow localhost:3000 and localhost:12001
- Database models use SQLAlchemy with async support
- API keys for OpenAI and Anthropic should be added to `.env`