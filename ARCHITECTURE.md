# Asset-Backed Token Trading Platform - Architecture

## System Overview

A blockchain-based token trading platform where tokens are backed by real-world assets (RWA), with admin verification, multi-role access control, and on-chain order book trading.

## Architecture Components

### 1. Smart Contracts (Solidity on Polygon/Ethereum)

#### AssetBackedToken.sol
- ERC20 token with role-based access control
- Roles: Admin, Owner, Users
- Asset submission and verification flow
- Automated token distribution:
  - User1: 10%
  - User2: 18%  
  - User3: 25%
  - Owner: 47% (remainder)

#### OrderBook.sol
- On-chain limit order book
- Buy/Sell order placement
- Automatic order matching engine
- Price-time priority matching
- ETH<>Token settlement

### 2. Backend Microservices

#### Admin Service (Port 8001)
**Responsibilities:**
- Asset verification workflow
- Admin authentication
- Approve/reject asset submissions
- Monitor token issuance
- Admin dashboard APIs

**Endpoints:**
```
POST   /api/admin/login
GET    /api/admin/pending-assets
POST   /api/admin/verify-asset/:batchId
GET    /api/admin/asset-history
GET    /api/admin/statistics
```

#### Trading Service (Port 8002)
**Responsibilities:**
- Monitor blockchain events
- Cache order book state
- Provide trading analytics
- WebSocket for real-time updates
- User transaction history

**Endpoints:**
```
POST   /api/auth/login
GET    /api/orderbook
GET    /api/orders/user/:address
GET    /api/trades/history
GET    /api/analytics/volume
WS     /ws/orderbook
```

### 3. Frontend (React + Web3)

#### Components Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AssetVerification.jsx
│   │   │   ├── PendingAssets.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── owner/
│   │   │   ├── AssetSubmission.jsx
│   │   │   ├── TokenIssuance.jsx
│   │   │   └── OwnerDashboard.jsx
│   │   ├── trading/
│   │   │   ├── OrderBook.jsx
│   │   │   ├── OrderForm.jsx
│   │   │   ├── TradeHistory.jsx
│   │   │   └── Portfolio.jsx
│   │   └── common/
│   │       ├── WalletConnect.jsx
│   │       ├── RoleGuard.jsx
│   │       └── Layout.jsx
│   ├── contexts/
│   │   ├── Web3Context.jsx
│   │   ├── AuthContext.jsx
│   │   └── ContractContext.jsx
│   ├── hooks/
│   │   ├── useContract.js
│   │   ├── useOrderBook.js
│   │   └── useTokenBalance.js
│   └── pages/
│       ├── AdminPage.jsx
│       ├── OwnerPage.jsx
│       └── TradingPage.jsx
```

## User Flows

### Flow 1: Token Issuance
```
1. Owner submits asset proof via Owner Dashboard
   → Calls: submitAssetForTokenization() on contract
   
2. Admin receives notification
   → Admin Service monitors blockchain events
   
3. Admin reviews and verifies via Admin Dashboard
   → Calls: verifyAsset(batchId) on contract
   
4. Owner issues tokens after approval
   → Calls: issueTokens(batchId) on contract
   
5. Tokens distributed automatically:
   - User1: 10% (1,000 TKN if 10k issued)
   - User2: 18% (1,800 TKN)
   - User3: 25% (2,500 TKN)
   - Owner: 47% (4,700 TKN)
```

### Flow 2: Trading
```
1. User connects wallet (MetaMask)
2. Views order book (cached in Trading Service)
3. Places buy/sell order
   → Calls: placeBuyOrder() or placeSellOrder()
4. Order matching happens on-chain automatically
5. Trade executed, ETH<>Token settled
6. WebSocket pushes updates to all connected clients
```

## Technology Stack

### Blockchain
- Solidity ^0.8.20
- OpenZeppelin Contracts
- Hardhat for deployment
- Polygon Mumbai (testnet) / Polygon PoS (mainnet)

### Backend
- FastAPI (Python 3.11+)
- Web3.py for blockchain interaction
- MongoDB for off-chain data
- Redis for caching
- WebSocket for real-time updates

### Frontend
- React 19
- ethers.js v6
- Wagmi / RainbowKit for wallet connection
- TailwindCSS + shadcn/ui
- Recharts for analytics

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React)               │
│     Nginx / Vercel / Netlify             │
└──────────┬──────────────────────────────┘
           │
           ├──── Web3 RPC ────► Polygon Network
           │                    (Smart Contracts)
           │
           ├──── HTTP/WS ─────► Trading Service :8002
           │                    (Order book cache)
           │
           └──── HTTP ────────► Admin Service :8001
                                (Asset verification)
```

## Security Considerations

1. **Smart Contract**
   - OpenZeppelin audited contracts
   - ReentrancyGuard on order book
   - Pausable for emergencies
   - Role-based access control

2. **Backend**
   - JWT authentication
   - Rate limiting
   - Input validation
   - CORS configuration

3. **Frontend**
   - Wallet signature verification
   - Transaction confirmation UI
   - Gas estimation before TX
   - Error handling

## Environment Variables

### Admin Service
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=asset_trading_admin
SECRET_KEY=admin-jwt-secret
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
CONTRACT_ADDRESS_TOKEN=0x...
ADMIN_PRIVATE_KEY=0x...
```

### Trading Service
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=asset_trading_trades
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
CONTRACT_ADDRESS_TOKEN=0x...
CONTRACT_ADDRESS_ORDERBOOK=0x...
REDIS_URL=redis://localhost:6379
```

### Frontend
```
REACT_APP_ADMIN_SERVICE_URL=https://admin.example.com
REACT_APP_TRADING_SERVICE_URL=https://trading.example.com
REACT_APP_CHAIN_ID=80001
REACT_APP_TOKEN_ADDRESS=0x...
REACT_APP_ORDERBOOK_ADDRESS=0x...
```

## Next Steps

1. Deploy smart contracts to Polygon Mumbai
2. Set up microservices with proper env variables
3. Configure frontend with contract ABIs
4. Test complete flow end-to-end
5. Set up monitoring and logging
6. Deploy to production (Polygon PoS mainnet)
