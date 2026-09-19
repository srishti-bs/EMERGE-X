#!/usr/bin/env bash
# ==============================================================================
# EMERGE-X Universal Build Script for Render
# ==============================================================================
set -o errexit

echo "==> [1/3] Installing Python backend dependencies..."
pip install -r backend/requirements.txt

echo "==> [2/3] Installing Node.js frontend dependencies..."
cd frontend
npm install

echo "==> [3/3] Building production React frontend..."
npm run build
cd ..

echo "==> EMERGE-X Build Completed Successfully!"
