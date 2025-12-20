# 🚀 Local Development Setup - Asset-Backed Token Platform

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ and yarn installed
- Python 3.11+ installed
- MongoDB running (or use Docker)

### ⚡ One-Command Setup

```bash
# Run everything at once
cd /app && chmod +x scripts/setup-local.sh && ./scripts/setup-local.sh
```

That's it! The script will:
1. ✅ Install all dependencies
2. ✅ Start local Hardhat blockchain
3. ✅ Deploy smart contracts
4. ✅ Start admin service (port 8001)
5. ✅ Start trading service (port 8002)
6. ✅ Start frontend (port 3000)

---

## Manual Setup (Step by Step)

If you prefer to run each step manually:

### Step 1: Install Dependencies

```bash
# Install contract dependencies
cd /app/contracts
yarn install

# Install admin service dependencies
cd /app/admin-service
pip install -r requirements.txt

# Install trading service dependencies
cd /app/trading-service
pip install -r requirements.txt

# Install frontend dependencies
cd /app/frontend
yarn install
```

### Step 2: Start Local Blockchain

```bash
# Terminal 1: Start Hardhat local node
cd /app/contracts
npx hardhat node

# Keep this running! It provides:
# - Local blockchain at http://127.0.0.1:8545
# - 20 pre-funded test accounts
# - Block explorer at console
```

You'll see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

### Step 3: Deploy Smart Contracts

```bash
# Terminal 2: Deploy contracts to local network
cd /app/contracts
npx hardhat run scripts/deploy.js --network localhost

# This creates:
# - /app/deployments/localhost.json (addresses)
# - /app/abis/*.json (contract ABIs)
```

### Step 4: Start Backend Services

```bash
# Terminal 3: Admin Service
cd /app/admin-service
python server.py
# Running on http://localhost:8001

# Terminal 4: Trading Service
cd /app/trading-service
python server.py
# Running on http://localhost:8002
```

### Step 5: Start Frontend

```bash
# Terminal 5: React Frontend
cd /app/frontend
yarn start
# Running on http://localhost:3000
```

---

## 👤 Test Accounts

After deployment, use these accounts:

| Role | Address | Private Key | Purpose |
|------|---------|-------------|----------|
| Admin | Account #1 | From Hardhat output | Verify assets |
| Owner | Account #2 | From Hardhat output | Submit assets, issue tokens |
| User1 | Account #3 | From Hardhat output | Trade (10% allocation) |
| User2 | Account #4 | From Hardhat output | Trade (18% allocation) |
| User3 | Account #5 | From Hardhat output | Trade (25% allocation) |

**Import these into MetaMask:**
1. Open MetaMask
2. Add Network: 
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
3. Import accounts using private keys from Hardhat output

---

## 🧪 Testing the Complete Flow

### Test 1: Token Issuance Flow

```bash
# Use the helper script
cd /app/scripts
node test-token-issuance.js

# Or manually:
# 1. Owner submits asset (10,000 tokens)
# 2. Admin verifies
# 3. Owner issues tokens
# 4. Check balances:
#    - User1: 1,000 TKN (10%)
#    - User2: 1,800 TKN (18%)
#    - User3: 2,500 TKN (25%)
#    - Owner: 4,700 TKN (47%)
```

### Test 2: Trading Flow

```bash
# Use the helper script
cd /app/scripts
node test-trading.js

# Or manually:
# 1. User1 places sell order: 100 TKN @ 0.01 ETH
# 2. User2 places buy order: 100 TKN @ 0.01 ETH
# 3. Order matches automatically
# 4. Tokens transferred, ETH settled
```

---

## 🛠️ Development Tools

### View Blockchain Logs
```bash
# Watch contract events in real-time
cd /app/contracts
npx hardhat watch
```

### Reset Local Blockchain
```bash
# Stop hardhat node (Ctrl+C in Terminal 1)
# Start it again - chain resets automatically
cd /app/contracts
npx hardhat node
```

### Compile Contracts After Changes
```bash
cd /app/contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### Check Contract State
```bash
# Interactive console
cd /app/contracts
npx hardhat console --network localhost

# In console:
const Token = await ethers.getContractAt("AssetBackedToken", "<address>");
await Token.currentBatchId();
await Token.balanceOf("<address>");
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused" when deploying
**Solution:** Make sure Hardhat node is running first (Terminal 1)

### Issue: "Nonce too high" error
**Solution:** Reset MetaMask account
- Settings → Advanced → Reset Account

### Issue: Contracts deployed but frontend can't connect
**Solution:** Check contract addresses in frontend .env match deployment output

### Issue: MongoDB connection error
**Solution:** 
```bash
# Quick fix: Use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# Ubuntu: sudo apt-get install mongodb
# Mac: brew install mongodb-community
```

### Issue: Port already in use
**Solution:**
```bash
# Find and kill process
lsof -ti:8001 | xargs kill -9  # Admin service
lsof -ti:8002 | xargs kill -9  # Trading service
lsof -ti:3000 | xargs kill -9  # Frontend
```

---

## 📝 Architecture Overview

```
                     ┌───────────────────────┐
                     │  Frontend (React)      │
                     │  http://localhost:3000 │
                     └────────┬─────────────┘
                              │
              ┌─────────────┼──────────────┐
              │              │               │
    ┌────────┴────────┐  ┌────┴──────────────┐
    │  Admin Service   │  │  Trading Service  │
    │  Port 8001       │  │  Port 8002        │
    └────────┬────────┘  └────┬─────────────┘
             │                    │
             └────────┬───────────┘
                      │
          ┌───────────┼───────────┐
          │           │            │
    ┌─────┴─────┐  ┌───┴────┐  ┌───┴─────┐
    │  Hardhat   │  │ MongoDB│  │ MetaMask  │
    │ Local Net │  │         │  │  Wallet   │
    │ :8545     │  │ :27017  │  │          │
    └───────────┘  └─────────┘  └───────────┘
```

---

## 📦 What's Running?

```bash
# Check all services
ps aux | grep -E "hardhat|python.*server.py|react-scripts"

# Or use the helper
cd /app/scripts
./check-status.sh
```

Expected output:
```
✅ Hardhat node      - http://127.0.0.1:8545
✅ Admin Service     - http://localhost:8001
✅ Trading Service   - http://localhost:8002
✅ Frontend          - http://localhost:3000
✅ MongoDB           - localhost:27017
```

---

## 🔥 Quick Commands Cheatsheet

```bash
# Full reset and restart
cd /app && ./scripts/reset-local.sh

# Deploy contracts only
cd /app/contracts && npx hardhat run scripts/deploy.js --network localhost

# Test complete flow
cd /app/scripts && node test-complete-flow.js

# View logs
tail -f /app/admin-service/logs/app.log
tail -f /app/trading-service/logs/app.log

# Clean build artifacts
cd /app/contracts && npx hardhat clean
cd /app/frontend && rm -rf build node_modules/.cache
```

---

## 🎓 Next Steps

1. **Run the one-command setup** (recommended)
2. **Import test accounts to MetaMask**
3. **Test token issuance flow**
4. **Test trading flow**
5. **Explore the code** in `/app/contracts`, `/app/admin-service`, `/app/trading-service`

---

## 📞 Need Help?

Check:
- Full architecture: `/app/ARCHITECTURE.md`
- Contract docs: `/app/contracts/README.md`
- API docs: `/app/admin-service/API.md`

Common issues: See Troubleshooting section above