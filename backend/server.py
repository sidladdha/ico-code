from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    email: str
    balance: float = 333333.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserInDB(User):
    hashed_password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: str
    type: str  # 'buy' or 'sell'
    price: float
    amount: float
    filled: float = 0.0
    status: str = 'open'  # 'open', 'filled', 'partially_filled', 'cancelled'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateOrderRequest(BaseModel):
    type: str
    price: float
    amount: float

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user: str
    to_user: str
    amount: float
    price: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BalanceResponse(BaseModel):
    email: str
    balance: float

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Initialize default users
async def init_users():
    users_data = [
        {"email": "owner@test.com", "password": "1234", "balance": 333333.0},
        {"email": "user1@test.com", "password": "1234", "balance": 333333.0},
        {"email": "user2@test.com", "password": "1234", "balance": 333333.0},
    ]
    
    for user_data in users_data:
        existing = await db.users.find_one({"email": user_data["email"]})
        if not existing:
            hashed_pwd = get_password_hash(user_data["password"])
            await db.users.insert_one({
                "email": user_data["email"],
                "hashed_password": hashed_pwd,
                "balance": user_data["balance"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })

@app.on_event("startup")
async def startup_event():
    await init_users()
    # Create some initial orders for demo
    order_count = await db.orders.count_documents({})
    if order_count == 0:
        demo_orders = [
            {"user_email": "user1@test.com", "type": "buy", "price": 0.98, "amount": 1000, "filled": 0, "status": "open", "created_at": datetime.now(timezone.utc).isoformat(), "id": str(uuid.uuid4())},
            {"user_email": "user2@test.com", "type": "sell", "price": 1.02, "amount": 1500, "filled": 0, "status": "open", "created_at": datetime.now(timezone.utc).isoformat(), "id": str(uuid.uuid4())},
            {"user_email": "owner@test.com", "type": "buy", "price": 0.99, "amount": 2000, "filled": 0, "status": "open", "created_at": datetime.now(timezone.utc).isoformat(), "id": str(uuid.uuid4())},
        ]
        await db.orders.insert_many(demo_orders)

# Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email})
    if not user_doc or not verify_password(request.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": user_doc["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user = User(email=user_doc["email"], balance=user_doc["balance"])
    return LoginResponse(token=access_token, user=user)

@api_router.get("/balance", response_model=BalanceResponse)
async def get_balance(current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"email": current_user.email}, {"_id": 0})
    return BalanceResponse(email=user_doc["email"], balance=user_doc["balance"])

@api_router.post("/orders", response_model=Order)
async def create_order(order_req: CreateOrderRequest, current_user: User = Depends(get_current_user)):
    # Validate order
    if order_req.type not in ['buy', 'sell']:
        raise HTTPException(status_code=400, detail="Order type must be 'buy' or 'sell'")
    
    if order_req.amount <= 0 or order_req.price <= 0:
        raise HTTPException(status_code=400, detail="Amount and price must be positive")
    
    user_doc = await db.users.find_one({"email": current_user.email})
    
    # Check if user has enough balance for buy orders
    if order_req.type == 'buy':
        required = order_req.amount * order_req.price
        if user_doc["balance"] < required:
            raise HTTPException(status_code=400, detail="Insufficient balance")
    else:  # sell order
        if user_doc["balance"] < order_req.amount:
            raise HTTPException(status_code=400, detail="Insufficient tokens to sell")
    
    order = Order(
        user_email=current_user.email,
        type=order_req.type,
        price=order_req.price,
        amount=order_req.amount
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    await db.orders.insert_one(order_dict)
    
    # Try to match orders
    await match_orders()
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({"user_email": current_user.email}, {"_id": 0}).to_list(100)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    return orders

@api_router.get("/orderbook")
async def get_orderbook(current_user: User = Depends(get_current_user)):
    buy_orders = await db.orders.find({"type": "buy", "status": "open"}, {"_id": 0}).sort("price", -1).to_list(50)
    sell_orders = await db.orders.find({"type": "sell", "status": "open"}, {"_id": 0}).sort("price", 1).to_list(50)
    
    return {
        "buys": buy_orders,
        "sells": sell_orders
    }

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"$or": [{"from_user": current_user.email}, {"to_user": current_user.email}]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    for tx in transactions:
        if isinstance(tx['timestamp'], str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    
    return transactions

@api_router.get("/all-transactions", response_model=List[Transaction])
async def get_all_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    for tx in transactions:
        if isinstance(tx['timestamp'], str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    return transactions

@api_router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_email": current_user.email})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != "open":
        raise HTTPException(status_code=400, detail="Can only cancel open orders")
    
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Order cancelled"}

async def match_orders():
    """Simple order matching engine"""
    # Get all open buy orders sorted by price (highest first)
    buy_orders = await db.orders.find({"type": "buy", "status": "open"}).sort("price", -1).to_list(100)
    # Get all open sell orders sorted by price (lowest first)
    sell_orders = await db.orders.find({"type": "sell", "status": "open"}).sort("price", 1).to_list(100)
    
    for buy_order in buy_orders:
        for sell_order in sell_orders:
            # Check if orders can match (buy price >= sell price)
            if buy_order["price"] >= sell_order["price"]:
                # Calculate match amount
                buy_remaining = buy_order["amount"] - buy_order["filled"]
                sell_remaining = sell_order["amount"] - sell_order["filled"]
                match_amount = min(buy_remaining, sell_remaining)
                
                if match_amount > 0:
                    # Execute trade at sell price
                    trade_price = sell_order["price"]
                    
                    # Update buyer (receives tokens, pays money)
                    await db.users.update_one(
                        {"email": buy_order["user_email"]},
                        {"$inc": {"balance": match_amount - (match_amount * trade_price)}}
                    )
                    
                    # Update seller (receives money, loses tokens)
                    await db.users.update_one(
                        {"email": sell_order["user_email"]},
                        {"$inc": {"balance": (match_amount * trade_price) - match_amount}}
                    )
                    
                    # Update orders
                    buy_order["filled"] += match_amount
                    sell_order["filled"] += match_amount
                    
                    await db.orders.update_one(
                        {"id": buy_order["id"]},
                        {"$set": {
                            "filled": buy_order["filled"],
                            "status": "filled" if buy_order["filled"] >= buy_order["amount"] else "partially_filled"
                        }}
                    )
                    
                    await db.orders.update_one(
                        {"id": sell_order["id"]},
                        {"$set": {
                            "filled": sell_order["filled"],
                            "status": "filled" if sell_order["filled"] >= sell_order["amount"] else "partially_filled"
                        }}
                    )
                    
                    # Create transaction record
                    transaction = Transaction(
                        from_user=sell_order["user_email"],
                        to_user=buy_order["user_email"],
                        amount=match_amount,
                        price=trade_price
                    )
                    
                    tx_dict = transaction.model_dump()
                    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
                    await db.transactions.insert_one(tx_dict)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()