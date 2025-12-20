#!/bin/bash

echo "Checking service status..."
echo ""

# Check Hardhat
if ps aux | grep -q "[h]ardhat node"; then
    echo "✅ Hardhat node      - http://127.0.0.1:8545"
else
    echo "❌ Hardhat node      - Not running"
fi

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB           - localhost:27017"
else
    echo "❌ MongoDB           - Not running"
fi

# Check Admin Service
if ps aux | grep -q "[p]ython.*admin-service.*server.py"; then
    echo "✅ Admin Service     - http://localhost:8001"
else
    echo "❌ Admin Service     - Not running"
fi

# Check Trading Service
if ps aux | grep -q "[p]ython.*trading-service.*server.py"; then
    echo "✅ Trading Service   - http://localhost:8002"
else
    echo "❌ Trading Service   - Not running"
fi

# Check Frontend
if ps aux | grep -q "[r]eact-scripts start"; then
    echo "✅ Frontend          - http://localhost:3000"
else
    echo "❌ Frontend          - Not running"
fi

echo ""
echo "Contract Deployments:"
if [ -f "/app/deployments/localhost.json" ]; then
    echo "✅ Contracts deployed"
    cat /app/deployments/localhost.json | grep -E '"AssetBackedToken"|"OrderBook"'
else
    echo "❌ No deployments found"
fi