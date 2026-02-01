#!/bin/bash

# Run the FastAPI backend server

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your GEMINI_API_KEY"
    echo "Example: GEMINI_API_KEY=your_key_here"
    exit 1
fi

# Run uvicorn
uvicorn main:app --reload --port 8000 --host 0.0.0.0

