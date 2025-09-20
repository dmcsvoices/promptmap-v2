#!/bin/bash

# PromptMap V2 - Enhanced Startup Script
# Version: 2.1.0
# Updated: 2025-09-13

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=12001
FRONTEND_PORT=3000
POSTGRES_SERVICE="postgresql@15"
STARTUP_WAIT_BACKEND=8
STARTUP_WAIT_FRONTEND=15

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

print_highlight() {
    echo -e "${CYAN}🔥 $1${NC}"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 PromptMap V2 Startup                   ║"
    echo "║                        Version 2.1.0                         ║"
    echo "║                                                               ║"
    echo "║  Backend API:  http://localhost:${BACKEND_PORT}                             ║"
    echo "║  Frontend UI:  http://localhost:${FRONTEND_PORT}                              ║"
    echo "║  API Docs:     http://localhost:${BACKEND_PORT}/docs                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    # Check for any process using the port (LISTEN, ESTABLISHED, or CLOSED)
    if lsof -Pi :$port -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}
    local attempt=1

    print_info "Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi

        if [ $((attempt % 5)) -eq 0 ]; then
            print_info "Still waiting for $service_name... (attempt $attempt/$max_attempts)"
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    print_error "$service_name failed to start after $max_attempts seconds"
    return 1
}

# Function to cleanup on exit
cleanup_on_exit() {
    echo -e "\n${YELLOW}🛑 Interrupt received. Cleaning up...${NC}"
    ./stop-promptmap.sh
    exit 0
}

# Set up signal handlers
trap cleanup_on_exit INT TERM

print_banner

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run this script as root (sudo)! Run as normal user instead."
    print_info "If PostgreSQL needs to be started, run: brew services start $POSTGRES_SERVICE"
    exit 1
fi

# Get script directory and create logs
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"
mkdir -p logs

print_info "Starting PromptMap V2 system..."
echo

# 1. Check PostgreSQL service
print_info "Checking PostgreSQL service..."
if brew services list | grep $POSTGRES_SERVICE | grep started > /dev/null; then
    print_status "PostgreSQL is running"
else
    print_info "Starting PostgreSQL service..."
    if brew services start $POSTGRES_SERVICE 2>/dev/null; then
        sleep 3
        print_status "PostgreSQL started"
    else
        print_warning "PostgreSQL service start failed, but continuing..."
        print_info "You may need to start PostgreSQL manually with: brew services start $POSTGRES_SERVICE"
    fi
fi

# 2. Check database connectivity
print_info "Testing database connection..."
if psql -U promptmap_user -d promptmap_web -c "SELECT 1;" >/dev/null 2>&1; then
    print_status "Database connection verified"
else
    print_error "Database connection failed! Please check your PostgreSQL setup."
    print_info "Make sure the promptmap_web database and promptmap_user exist."
    exit 1
fi

# 3. Check for existing processes and clean up
print_info "Checking for existing processes on ports $BACKEND_PORT and $FRONTEND_PORT..."

# Clean up any existing PID files and processes
if [ -f "logs/backend.pid" ]; then
    EXISTING_BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $EXISTING_BACKEND_PID 2>/dev/null; then
        print_warning "Killing existing backend process (PID: $EXISTING_BACKEND_PID)"
        kill -9 $EXISTING_BACKEND_PID 2>/dev/null || true
    fi
    rm -f logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    EXISTING_FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $EXISTING_FRONTEND_PID 2>/dev/null; then
        print_warning "Killing existing frontend process (PID: $EXISTING_FRONTEND_PID)"
        kill -9 $EXISTING_FRONTEND_PID 2>/dev/null || true
    fi
    rm -f logs/frontend.pid
fi

# Kill any processes still using the ports (more aggressive cleanup)
for port in $BACKEND_PORT $FRONTEND_PORT; do
    PIDS=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        print_warning "Force killing processes on port $port: $PIDS"
        echo $PIDS | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
done

# 4. Start Backend
print_highlight "Starting PromptMap V2 Backend..."
cd backend

if [ ! -d "venv" ]; then
    print_error "Backend virtual environment not found! Run setup.sh first."
    exit 1
fi

print_info "Activating Python virtual environment..."
source venv/bin/activate

print_info "Checking Python dependencies..."
if ! pip check >/dev/null 2>&1; then
    print_info "Installing/updating Python dependencies..."
    pip install -r requirements.txt --quiet --no-warn-script-location
fi

print_info "Starting FastAPI backend server on port $BACKEND_PORT..."
nohup python main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

# Wait for backend to be ready
if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend API" $STARTUP_WAIT_BACKEND; then
    print_status "Backend started successfully (PID: $BACKEND_PID)"
else
    print_error "Backend failed to start! Check logs/backend.log for details."
    exit 1
fi

cd ..

# 5. Start Frontend
print_highlight "Starting PromptMap V2 Frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found! Run setup.sh first."
    exit 1
fi

print_info "Checking Node.js dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    print_info "Installing Node.js dependencies..."
    npm install --silent
fi

print_info "Starting React development server on port $FRONTEND_PORT..."
nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid

# Wait for frontend to be ready
if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" $STARTUP_WAIT_FRONTEND; then
    print_status "Frontend started successfully (PID: $FRONTEND_PID)"
else
    print_error "Frontend failed to start! Check logs/frontend.log for details."
    exit 1
fi

cd ..

# 6. Final status check
echo
print_status "PromptMap V2 system startup completed successfully!"
echo
print_highlight "🌟 System Information:"
echo "  • Backend API:     http://localhost:$BACKEND_PORT"
echo "  • Frontend UI:     http://localhost:$FRONTEND_PORT"
echo "  • API Docs:        http://localhost:$BACKEND_PORT/docs"
echo "  • Health Check:    http://localhost:$BACKEND_PORT/health"
echo "  • Backend PID:     $BACKEND_PID"
echo "  • Frontend PID:    $FRONTEND_PID"
echo
print_info "📁 Logs:"
echo "  • Backend logs:    ./logs/backend.log"
echo "  • Frontend logs:   ./logs/frontend.log"
echo "  • Process IDs:     ./logs/backend.pid, ./logs/frontend.pid"
echo
print_info "🛑 To stop the system:"
echo "  ./stop-promptmap.sh"
echo

# 7. Quick health check
print_info "Performing final health checks..."
if curl -s http://localhost:$BACKEND_PORT/health | grep -q "healthy"; then
    print_status "Backend health check: PASSED"
else
    print_warning "Backend health check: FAILED (but service is running)"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT | grep -q "200"; then
    print_status "Frontend health check: PASSED"
else
    print_warning "Frontend health check: FAILED (but service may still be starting)"
fi

echo
print_highlight "🎉 PromptMap V2 is ready to use!"
print_warning "Keep this terminal open or the processes will continue in background."
print_info "Press Ctrl+C to stop monitoring (processes will keep running)."

# 8. Monitor processes
trap 'echo -e "\n${YELLOW}Monitoring stopped. Use ./stop-promptmap.sh to stop services.${NC}"; exit 0' INT

print_info "Monitoring system health (Ctrl+C to stop monitoring)..."
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

    # Quick health check
    if curl -s http://localhost:$BACKEND_PORT/health | grep -q "healthy"; then
        print_status "System is running normally ($(date '+%H:%M:%S'))"
    else
        print_warning "System health check failed ($(date '+%H:%M:%S'))"
    fi
done

print_error "System monitoring detected a failure. Please check the logs and restart if needed."