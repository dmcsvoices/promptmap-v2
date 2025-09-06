#!/bin/bash

# PromptMap V2 - System Stop Script
# Use this script to gracefully stop the PromptMap V2 system

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
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🛑 PromptMap V2 Shutdown                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_banner

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

print_info "Stopping PromptMap V2 system..."

# Stop processes using PID files
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_info "Stopping backend process (PID: $BACKEND_PID)..."
        kill -TERM $BACKEND_PID 2>/dev/null || true
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 $BACKEND_PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_warning "Force killing backend process..."
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        
        print_status "Backend stopped"
    else
        print_warning "Backend process not running"
    fi
    rm -f logs/backend.pid
else
    print_warning "Backend PID file not found"
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_info "Stopping frontend process (PID: $FRONTEND_PID)..."
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_warning "Force killing frontend process..."
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        
        print_status "Frontend stopped"
    else
        print_warning "Frontend process not running"
    fi
    rm -f logs/frontend.pid
else
    print_warning "Frontend PID file not found"
fi

# Additional cleanup - kill any processes still on the ports
print_info "Cleaning up any remaining processes on ports 12001 and 3000..."

if lsof -ti:12001 > /dev/null 2>&1; then
    print_warning "Killing remaining processes on port 12001"
    kill -9 $(lsof -ti:12001) 2>/dev/null || true
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    print_warning "Killing remaining processes on port 3000"
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
fi

print_status "PromptMap V2 system stopped successfully!"
print_info "To start the system again, run: ./start-promptmap.sh"