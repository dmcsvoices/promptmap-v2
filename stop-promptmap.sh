#!/bin/bash

# PromptMap V2 - Enhanced Shutdown Script
# Version: 2.1.0
# Updated: 2025-09-13

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
MAX_SHUTDOWN_WAIT=10

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
    echo -e "${CYAN}🛑 $1${NC}"
}

print_banner() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🛑 PromptMap V2 Shutdown                  ║"
    echo "║                        Version 2.1.0                         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to gracefully stop a process by PID
stop_process() {
    local pid=$1
    local process_name=$2
    local wait_time=${3:-5}

    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        return 1  # Process not running
    fi

    print_info "Stopping $process_name (PID: $pid)..."

    # Try graceful shutdown first
    kill -TERM "$pid" 2>/dev/null

    # Wait for graceful shutdown
    local attempt=0
    while [ $attempt -lt $wait_time ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            print_status "$process_name stopped gracefully"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    # Force kill if necessary
    print_warning "Force killing $process_name..."
    kill -KILL "$pid" 2>/dev/null

    # Final check
    if ! kill -0 "$pid" 2>/dev/null; then
        print_status "$process_name stopped (force killed)"
        return 0
    else
        print_error "Failed to stop $process_name"
        return 1
    fi
}

# Function to stop process by port
stop_process_by_port() {
    local port=$1
    local service_name=$2

    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -z "$pids" ]; then
        return 1  # No processes on this port
    fi

    print_info "Stopping processes on port $port ($service_name)..."
    for pid in $pids; do
        if stop_process "$pid" "$service_name" 3; then
            true  # Success
        else
            print_warning "Failed to stop process $pid on port $port"
        fi
    done
}

# Function to clean up pid files
cleanup_pid_files() {
    local files=("logs/backend.pid" "logs/frontend.pid")

    for pid_file in "${files[@]}"; do
        if [ -f "$pid_file" ]; then
            rm -f "$pid_file"
        fi
    done
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

print_banner

print_info "Stopping PromptMap V2 system..."
echo

# 1. Stop processes using PID files
backend_stopped=false
frontend_stopped=false

# Stop Backend
if [ -f "logs/backend.pid" ]; then
    backend_pid=$(cat logs/backend.pid 2>/dev/null)
    if [ -n "$backend_pid" ] && stop_process "$backend_pid" "Backend" $MAX_SHUTDOWN_WAIT; then
        backend_stopped=true
    fi
else
    print_warning "Backend PID file not found"
fi

# Stop Frontend
if [ -f "logs/frontend.pid" ]; then
    frontend_pid=$(cat logs/frontend.pid 2>/dev/null)
    if [ -n "$frontend_pid" ] && stop_process "$frontend_pid" "Frontend" $MAX_SHUTDOWN_WAIT; then
        frontend_stopped=true
    fi
else
    print_warning "Frontend PID file not found"
fi

# 2. Clean up any remaining processes by port
print_info "Cleaning up any remaining processes on ports $BACKEND_PORT and $FRONTEND_PORT..."

if ! $backend_stopped; then
    if stop_process_by_port $BACKEND_PORT "Backend"; then
        backend_stopped=true
    fi
fi

if ! $frontend_stopped; then
    if stop_process_by_port $FRONTEND_PORT "Frontend"; then
        frontend_stopped=true
    fi
fi

# 3. Final cleanup
print_info "Performing final cleanup..."

# Clean up PID files
cleanup_pid_files

# Check for any remaining Python/Node processes related to the project
remaining_procs=$(ps aux | grep -E "(python.*main\.py|npm.*start)" | grep -v grep | wc -l)
if [ $remaining_procs -gt 0 ]; then
    print_warning "Found $remaining_procs potentially related processes still running"
    print_info "You may want to check: ps aux | grep -E '(python.*main\.py|npm.*start)'"
fi

# 4. Verify ports are free
echo
print_info "Verifying ports are free..."

for port in $BACKEND_PORT $FRONTEND_PORT; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is still in use"
        lsof -Pi :$port -sTCP:LISTEN | head -2
    else
        print_status "Port $port is free"
    fi
done

# 5. Show log file information
echo
print_info "📁 Log files preserved:"
for log_file in logs/backend.log logs/frontend.log; do
    if [ -f "$log_file" ]; then
        size=$(du -h "$log_file" | cut -f1)
        echo "  • $log_file ($size)"
    fi
done

# 6. Final status
echo
if $backend_stopped && $frontend_stopped; then
    print_status "PromptMap V2 system stopped successfully!"
    print_info "All services have been gracefully shut down."
elif $backend_stopped || $frontend_stopped; then
    print_warning "PromptMap V2 system partially stopped."
    if ! $backend_stopped; then
        print_warning "Backend may still be running - check port $BACKEND_PORT"
    fi
    if ! $frontend_stopped; then
        print_warning "Frontend may still be running - check port $FRONTEND_PORT"
    fi
else
    print_warning "Some services may still be running."
    print_info "Check running processes: lsof -i :$BACKEND_PORT -i :$FRONTEND_PORT"
fi

echo
print_info "🚀 To start the system again:"
echo "  ./start-promptmap.sh"
echo

# 7. Optional: Show system resource cleanup
if command -v docker >/dev/null 2>&1; then
    # Only show Docker info if Docker is available, since user mentioned they have Docker
    inactive_containers=$(docker ps -q -f status=exited 2>/dev/null | wc -l)
    if [ $inactive_containers -gt 0 ]; then
        print_info "💡 Tip: You have $inactive_containers inactive Docker containers. Consider running 'docker system prune' to free up space."
    fi
fi

# Show disk space in logs directory
if [ -d "logs" ]; then
    log_size=$(du -sh logs 2>/dev/null | cut -f1)
    print_info "📊 Log directory size: $log_size"
fi