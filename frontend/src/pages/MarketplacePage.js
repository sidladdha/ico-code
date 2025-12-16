import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MarketplacePage = () => {
  const { getAuthHeaders, refreshBalance } = useAuth();
  const [orderbook, setOrderbook] = useState({ buys: [], sells: [] });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [orderbookRes, ordersRes] = await Promise.all([
        axios.get(`${API}/orderbook`, { headers: getAuthHeaders() }),
        axios.get(`${API}/orders`, { headers: getAuthHeaders() })
      ]);
      
      setOrderbook(orderbookRes.data);
      setOrders(ordersRes.data);
      await refreshBalance();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (type) => {
    setSubmitting(true);
    
    const price = type === 'buy' ? parseFloat(buyPrice) : parseFloat(sellPrice);
    const amount = type === 'buy' ? parseFloat(buyAmount) : parseFloat(sellAmount);
    
    if (!price || !amount || price <= 0 || amount <= 0) {
      toast.error('Please enter valid price and amount');
      setSubmitting(false);
      return;
    }
    
    try {
      await axios.post(
        `${API}/orders`,
        { type, price, amount },
        { headers: getAuthHeaders() }
      );
      
      toast.success(`${type === 'buy' ? 'Buy' : 'Sell'} order created successfully!`);
      
      if (type === 'buy') {
        setBuyPrice('');
        setBuyAmount('');
      } else {
        setSellPrice('');
        setSellAmount('');
      }
      
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers: getAuthHeaders() });
      toast.success('Order cancelled');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const bestBid = orderbook.buys[0]?.price || 0;
  const bestAsk = orderbook.sells[0]?.price || 0;
  const spread = bestAsk - bestBid;

  return (
    <div className="space-y-8" data-testid="marketplace-page">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="marketplace-heading">Marketplace</h1>
        <p className="text-zinc-400">Trade tokens with other users</p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#18181b] border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-1">Best Bid</p>
            <p className="text-2xl font-mono font-semibold text-emerald-500" data-testid="best-bid">
              {bestBid.toFixed(4)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#18181b] border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-1">Best Ask</p>
            <p className="text-2xl font-mono font-semibold text-rose-500" data-testid="best-ask">
              {bestAsk.toFixed(4)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#18181b] border-white/10">
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-1">Spread</p>
            <p className="text-2xl font-mono font-semibold" data-testid="spread">
              {spread.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <Card className="bg-[#18181b] border-white/10" data-testid="order-book">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Order Book</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              className="h-8 w-8"
              data-testid="refresh-orderbook"
            >
              <RefreshCw size={16} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs text-zinc-500 border-b border-white/5">
              <div>Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            
            {/* Sell Orders */}
            <div className="max-h-48 overflow-y-auto" data-testid="sell-orders">
              {orderbook.sells.slice(0, 10).map((order, idx) => (
                <div 
                  key={idx}
                  className="grid grid-cols-3 gap-2 px-4 py-1.5 text-sm font-mono hover:bg-rose-500/5 transition"
                >
                  <div className="text-rose-500">{order.price.toFixed(4)}</div>
                  <div className="text-right text-zinc-300">{order.amount.toFixed(2)}</div>
                  <div className="text-right text-zinc-400">
                    {(order.price * order.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Mid Price */}
            <div className="px-4 py-3 bg-[#27272a] text-center">
              <span className="text-lg font-mono font-semibold">
                {((bestBid + bestAsk) / 2 || 1.0).toFixed(4)}
              </span>
            </div>

            {/* Buy Orders */}
            <div className="max-h-48 overflow-y-auto" data-testid="buy-orders">
              {orderbook.buys.slice(0, 10).map((order, idx) => (
                <div 
                  key={idx}
                  className="grid grid-cols-3 gap-2 px-4 py-1.5 text-sm font-mono hover:bg-emerald-500/5 transition"
                >
                  <div className="text-emerald-500">{order.price.toFixed(4)}</div>
                  <div className="text-right text-zinc-300">{order.amount.toFixed(2)}</div>
                  <div className="text-right text-zinc-400">
                    {(order.price * order.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trading Form */}
        <Card className="bg-[#18181b] border-white/10" data-testid="trade-form">
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="buy">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger 
                  value="buy" 
                  className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
                  data-testid="buy-tab"
                >
                  <TrendingUp size={16} className="mr-2" />
                  Buy
                </TabsTrigger>
                <TabsTrigger 
                  value="sell"
                  className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500"
                  data-testid="sell-tab"
                >
                  <TrendingDown size={16} className="mr-2" />
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Price</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="0.0000"
                    className="bg-[#09090b] border-white/10 font-mono"
                    data-testid="buy-price-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Amount</label>
                  <Input
                    type="number"
                    step="1"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0"
                    className="bg-[#09090b] border-white/10 font-mono"
                    data-testid="buy-amount-input"
                  />
                </div>
                <div className="pt-2 pb-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="font-mono">
                      {(parseFloat(buyPrice) * parseFloat(buyAmount) || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateOrder('buy')}
                  disabled={submitting}
                  className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 hover:bg-emerald-500/20"
                  data-testid="submit-buy-order"
                >
                  {submitting ? 'Placing...' : 'Place Buy Order'}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Price</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="0.0000"
                    className="bg-[#09090b] border-white/10 font-mono"
                    data-testid="sell-price-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Amount</label>
                  <Input
                    type="number"
                    step="1"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    className="bg-[#09090b] border-white/10 font-mono"
                    data-testid="sell-amount-input"
                  />
                </div>
                <div className="pt-2 pb-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="font-mono">
                      {(parseFloat(sellPrice) * parseFloat(sellAmount) || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateOrder('sell')}
                  disabled={submitting}
                  className="w-full bg-rose-500/10 text-rose-500 border border-rose-500/50 hover:bg-rose-500/20"
                  data-testid="submit-sell-order"
                >
                  {submitting ? 'Placing...' : 'Place Sell Order'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* My Orders */}
        <Card className="bg-[#18181b] border-white/10" data-testid="my-orders">
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-400">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-zinc-400" data-testid="no-orders">No active orders</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div 
                    key={order.id}
                    className="p-3 rounded-lg border border-white/5 space-y-2"
                    data-testid={`order-${order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        order.type === 'buy' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {order.type.toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                        order.status === 'filled' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Price</span>
                        <span className="font-mono">{order.price.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Amount</span>
                        <span className="font-mono">{order.amount.toFixed(2)}</span>
                      </div>
                      {order.filled > 0 && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Filled</span>
                          <span className="font-mono">{order.filled.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {order.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        className="w-full mt-2 border-white/10 hover:bg-white/5"
                        data-testid={`cancel-order-${order.id}`}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplacePage;