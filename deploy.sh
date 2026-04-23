#!/bin/bash
set -e

cd /var/www/stakeoption

echo "==============================="
echo "  StakeOption Deploy Script"
echo "==============================="
echo ""

echo "📦 Pulling latest code..."
git pull origin master

echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install --production
cd ..

echo ""
echo "🏗️  Building frontend..."
cd frontend && npm install && npm run build
cd ..

echo ""
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.js

echo ""
echo "✅ Deploy complete!"
echo ""
pm2 status
