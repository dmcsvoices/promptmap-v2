#!/bin/bash

# PromptMap V2 - System Startup Script
# Use this script to start the system after reboot

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 PromptMap V2 Startup                   ║"
    echo "║                                                               ║"
    echo "║  Backend:  http://localhost:12001                             ║"
    echo "║  Frontend: http://localhost:3000                              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_banner

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run this script as root (sudo)! Run as normal user instead."
    print_info "If PostgreSQL needs to be started, run: brew services start postgresql@15"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory if it doesn't exist
mkdir -p logs

print_info "Starting PromptMap V2 system..."

# Check if PostgreSQL is running
print_info "Checking PostgreSQL service..."
if brew services list | grep postgresql@15 | grep started > /dev/null; then
    print_status "PostgreSQL is running"
else
    print_info "Starting PostgreSQL service..."
    # Don't run as root - let it fail gracefully and continue
    if brew services start postgresql@15 2>/dev/null; then
        sleep 3
        print_status "PostgreSQL started"
    else
        print_warning "PostgreSQL service start failed, but continuing..."
        print_info "You may need to start PostgreSQL manually with: brew services start postgresql@15"
    fi
fi

# Kill any existing processes on our ports
print_info "Checking for existing processes on ports 12001 and 3000..."

if lsof -ti:12001 > /dev/null 2>&1; then
    print_warning "Killing existing process on port 12001"
    kill -9 $(lsof -ti:12001) 2>/dev/null || true
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    print_warning "Killing existing process on port 3000"
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
fi

# Wait a moment for processes to fully terminate
sleep 2

# Start Backend
print_info "Starting PromptMap V2 Backend on port 12001..."
cd backend

# Activate virtual environment and start backend in background
if [ -d "venv" ]; then
    print_info "Activating Python virtual environment..."
    source venv/bin/activate
    
    print_info "Installing/updating Python dependencies..."
    pip install -r requirements.txt --quiet --no-warn-script-location
    
    print_info "Starting FastAPI backend server..."
    nohup python main.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    # Wait a moment for backend to start
    sleep 5
    
    # Check if backend is running
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Backend started successfully (PID: $BACKEND_PID)"
    else
        print_error "Backend failed to start!"
        exit 1
    fi
else
    print_error "Backend virtual environment not found! Run setup.sh first."
    exit 1
fi

cd ..

# Start Frontend
print_info "Starting PromptMap V2 Frontend on port 3000..."
cd frontend

if [ -f "package.json" ]; then
    print_info "Installing/updating Node.js dependencies..."
    npm install --silent
    
    print_info "Starting React development server..."
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    # Wait a moment for frontend to start
    sleep 10
    
    # Check if frontend is running
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Frontend started successfully (PID: $FRONTEND_PID)"
    else
        print_error "Frontend failed to start!"
        exit 1
    fi
else
    print_error "Frontend package.json not found! Run setup.sh first."
    exit 1
fi

cd ..

print_status "PromptMap V2 system startup completed successfully!"
echo ""
print_info "System Information:"
echo "  • Backend API:     http://localhost:12001"
echo "  • Frontend UI:     http://localhost:3000"
echo "  • API Docs:        http://localhost:12001/docs"
echo "  • Backend PID:     $BACKEND_PID"
echo "  • Frontend PID:    $FRONTEND_PID"
echo ""
print_info "Logs:"
echo "  • Backend logs:    ./logs/backend.log"
echo "  • Frontend logs:   ./logs/frontend.log"
echo "  • Process IDs:     ./logs/backend.pid, ./logs/frontend.pid"
echo ""
print_info "To stop the system, use:"
echo "  ./stop-promptmap.sh"
echo ""
print_warning "Keep this terminal open or the processes will continue in background."
print_info "Press Ctrl+C to stop watching or close this terminal safely."

# Monitor processes
trap 'echo -e "\n${YELLOW}Monitoring stopped. Processes continue running in background.${NC}"; exit 0' INT

print_info "Monitoring system (Ctrl+C to stop monitoring)..."
while true; do
    sleep 30
    
    # Check backend
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend process died! Check logs/backend.log"
        break
    fi
    
    # Check frontend
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend process died! Check logs/frontend.log"
        break
    fi
    
    print_status "System is running normally ($(date '+%H:%M:%S'))"
done