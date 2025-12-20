#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Local Development Setup"
echo "  Asset-Backed Token Platform"
echo "========================================"
echo ""

# Check if we're in /app directory
if [ ! -d "/app/contracts" ]; then
    echo -e "${RED}Error: Please run this script from /app directory${NC}"
    exit 1
fi

cd /app

# Step 1: Install contract dependencies
echo -e "${YELLOW}[1/7] Installing contract dependencies...${NC}"
cd contracts
if [ ! -d "node_modules" ]; then
    yarn install > /dev/null 2>&1
    echo -e "${GREEN}✓ Contract dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Contract dependencies already installed${NC}"
fi

# Step 2: Compile contracts
echo -e "${YELLOW}[2/7] Compiling smart contracts...${NC}"
npx hardhat compile > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contracts compiled successfully${NC}"
else
    echo -e "${RED}✗ Contract compilation failed${NC}"
    exit 1
fi

# Step 3: Start Hardhat node in background
echo -e "${YELLOW}[3/7] Starting local blockchain (Hardhat)...${NC}"
pkill -f "hardhat node" 2>/dev/null
cd /app/contracts
npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
sleep 3

if ps -p $HARDHAT_PID > /dev/null; then
    echo -e "${GREEN}✓ Hardhat node running on http://127.0.0.1:8545 (PID: $HARDHAT_PID)${NC}"
    echo $HARDHAT_PID > /tmp/hardhat.pid
else
    echo -e "${RED}✗ Failed to start Hardhat node${NC}"
    exit 1
fi

# Step 4: Deploy contracts
echo -e "${YELLOW}[4/7] Deploying smart contracts...${NC}"
cd /app/contracts
sleep 2
npx hardhat run scripts/deploy.js --network localhost > /tmp/deploy.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contracts deployed successfully${NC}"
    
    # Extract contract addresses
    if [ -f "/app/deployments/localhost.json" ]; then
        TOKEN_ADDR=$(grep -o '"AssetBackedToken": "[^"]*' /app/deployments/localhost.json | cut -d'"' -f4)
        ORDERBOOK_ADDR=$(grep -o '"OrderBook": "[^"]*' /app/deployments/localhost.json | cut -d'"' -f4)
        echo -e "${GREEN}  • AssetBackedToken: $TOKEN_ADDR${NC}"
        echo -e "${GREEN}  • OrderBook: $ORDERBOOK_ADDR${NC}"
    fi
else
    echo -e "${RED}✗ Contract deployment failed${NC}"
    cat /tmp/deploy.log
    exit 1
fi

# Step 5: Check MongoDB
echo -e "${YELLOW}[5/7] Checking MongoDB...${NC}"
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${YELLOW}! MongoDB not running. Services may fail.${NC}"
    echo -e "${YELLOW}  Start with: sudo systemctl start mongodb${NC}"
fi

# Step 6: Create .env files if they don't exist
echo -e "${YELLOW}[6/7] Setting up environment files...${NC}"

# Admin service .env
if [ ! -f "/app/admin-service/.env" ]; then
    cat > /app/admin-service/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=asset_trading_admin
SECRET_KEY=local-dev-secret-key
POLYGON_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS_TOKEN=$TOKEN_ADDR
PORT=8001
EOF
    echo -e "${GREEN}✓ Admin service .env created${NC}"
fi

# Trading service .env
if [ ! -f "/app/trading-service/.env" ]; then
    cat > /app/trading-service/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=asset_trading_trades
POLYGON_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS_TOKEN=$TOKEN_ADDR
CONTRACT_ADDRESS_ORDERBOOK=$ORDERBOOK_ADDR
PORT=8002
EOF
    echo -e "${GREEN}✓ Trading service .env created${NC}"
fi

# Step 7: Display next steps
echo -e "${YELLOW}[7/7] Setup complete!${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Successful! ✅${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Import test accounts to MetaMask:"
echo "   Network: Hardhat Local"
echo "   RPC URL: http://127.0.0.1:8545"
echo "   Chain ID: 31337"
echo ""
echo "2. View test accounts and private keys:"
echo -e "   ${GREEN}cat /tmp/hardhat.log | grep 'Account #'${NC}"
echo ""
echo "3. Start admin service:"
echo -e "   ${GREEN}cd /app/admin-service && python server.py${NC}"
echo ""
echo "4. Start trading service:"
echo -e "   ${GREEN}cd /app/trading-service && python server.py${NC}"
echo ""
echo "5. Start frontend:"
echo -e "   ${GREEN}cd /app/frontend && yarn start${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  Stop blockchain: ${GREEN}kill \$(cat /tmp/hardhat.pid)${NC}"
echo -e "  View accounts: ${GREEN}cat /tmp/hardhat.log${NC}"
echo -e "  Deployment info: ${GREEN}cat /app/deployments/localhost.json${NC}"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  Full guide: /app/LOCAL_SETUP.md"
echo "  Architecture: /app/ARCHITECTURE.md"
echo ""