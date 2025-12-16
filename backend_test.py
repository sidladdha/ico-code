import requests
import sys
import json
from datetime import datetime

class TokenTradingAPITester:
    def __init__(self, base_url="https://token-triangle.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for each user
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login - {email}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.tokens[email] = response['token']
            print(f"   Token obtained for {email}")
            return True, response
        return False, {}

    def get_auth_headers(self, email):
        """Get authorization headers for a user"""
        if email not in self.tokens:
            return {'Content-Type': 'application/json'}
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.tokens[email]}'
        }

    def test_balance(self, email):
        """Test getting user balance"""
        success, response = self.run_test(
            f"Get Balance - {email}",
            "GET",
            "balance",
            200,
            headers=self.get_auth_headers(email)
        )
        return success, response

    def test_create_order(self, email, order_type, price, amount):
        """Test creating an order"""
        success, response = self.run_test(
            f"Create {order_type} Order - {email}",
            "POST",
            "orders",
            200,
            data={"type": order_type, "price": price, "amount": amount},
            headers=self.get_auth_headers(email)
        )
        return success, response

    def test_get_orders(self, email):
        """Test getting user orders"""
        success, response = self.run_test(
            f"Get Orders - {email}",
            "GET",
            "orders",
            200,
            headers=self.get_auth_headers(email)
        )
        return success, response

    def test_get_orderbook(self, email):
        """Test getting orderbook"""
        success, response = self.run_test(
            f"Get Orderbook - {email}",
            "GET",
            "orderbook",
            200,
            headers=self.get_auth_headers(email)
        )
        return success, response

    def test_get_transactions(self, email):
        """Test getting user transactions"""
        success, response = self.run_test(
            f"Get Transactions - {email}",
            "GET",
            "transactions",
            200,
            headers=self.get_auth_headers(email)
        )
        return success, response

    def test_get_all_transactions(self, email):
        """Test getting all transactions"""
        success, response = self.run_test(
            f"Get All Transactions - {email}",
            "GET",
            "all-transactions",
            200,
            headers=self.get_auth_headers(email)
        )
        return success, response

def main():
    print("🚀 Starting Token Trading Marketplace API Tests")
    print("=" * 60)
    
    tester = TokenTradingAPITester()
    
    # Test users
    test_users = [
        "owner@test.com",
        "user1@test.com", 
        "user2@test.com"
    ]
    
    # Test 1: Login all users
    print("\n📝 Phase 1: Authentication Tests")
    login_success = True
    for email in test_users:
        success, response = tester.test_login(email, "1234")
        if not success:
            login_success = False
            print(f"❌ Login failed for {email}, stopping tests")
            break
        else:
            print(f"   User: {response.get('user', {}).get('email')}")
            print(f"   Balance: {response.get('user', {}).get('balance')}")
    
    if not login_success:
        print(f"\n📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        return 1
    
    # Test 2: Balance checks
    print("\n💰 Phase 2: Balance Tests")
    for email in test_users:
        success, response = tester.test_balance(email)
        if success:
            print(f"   {email}: {response.get('balance')} tokens")
    
    # Test 3: Order management
    print("\n📋 Phase 3: Order Management Tests")
    
    # Create some orders
    order_tests = [
        ("user1@test.com", "buy", 0.98, 1000),
        ("user2@test.com", "sell", 1.02, 1500),
        ("owner@test.com", "buy", 0.99, 2000),
    ]
    
    created_orders = []
    for email, order_type, price, amount in order_tests:
        success, response = tester.test_create_order(email, order_type, price, amount)
        if success:
            created_orders.append((email, response.get('id')))
            print(f"   Created {order_type} order: {response.get('id')}")
    
    # Test getting orders for each user
    for email in test_users:
        success, response = tester.test_get_orders(email)
        if success:
            print(f"   {email} has {len(response)} orders")
    
    # Test 4: Orderbook
    print("\n📊 Phase 4: Orderbook Tests")
    success, response = tester.test_get_orderbook("owner@test.com")
    if success:
        buys = response.get('buys', [])
        sells = response.get('sells', [])
        print(f"   Orderbook: {len(buys)} buy orders, {len(sells)} sell orders")
        if buys:
            print(f"   Best bid: {buys[0].get('price')}")
        if sells:
            print(f"   Best ask: {sells[0].get('price')}")
    
    # Test 5: Transaction history
    print("\n📈 Phase 5: Transaction Tests")
    for email in test_users:
        success, response = tester.test_get_transactions(email)
        if success:
            print(f"   {email}: {len(response)} personal transactions")
    
    # Test all transactions
    success, response = tester.test_get_all_transactions("owner@test.com")
    if success:
        print(f"   Total marketplace transactions: {len(response)}")
    
    # Test 6: Order matching (create matching orders)
    print("\n🔄 Phase 6: Order Matching Tests")
    
    # Create a buy order that should match with existing sell orders
    success, response = tester.test_create_order("owner@test.com", "buy", 1.05, 500)
    if success:
        print("   Created high-price buy order to trigger matching")
        
        # Check if transactions were created
        success, response = tester.test_get_all_transactions("owner@test.com")
        if success:
            print(f"   Transactions after matching: {len(response)}")
    
    # Test 7: Invalid operations
    print("\n❌ Phase 7: Error Handling Tests")
    
    # Test invalid login
    tester.run_test("Invalid Login", "POST", "auth/login", 401, 
                   data={"email": "invalid@test.com", "password": "wrong"})
    
    # Test invalid order
    tester.run_test("Invalid Order - Negative Price", "POST", "orders", 400,
                   data={"type": "buy", "price": -1, "amount": 100},
                   headers=tester.get_auth_headers("owner@test.com"))
    
    # Test unauthorized access
    tester.run_test("Unauthorized Access", "GET", "balance", 401)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for failed in tester.failed_tests:
            print(f"   - {failed.get('test')}: {failed}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())