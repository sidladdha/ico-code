import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const { user, getAuthHeaders, refreshBalance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txResponse] = await Promise.all([
        axios.get(`${API}/transactions`, { headers: getAuthHeaders() })
      ]);
      
      setTransactions(txResponse.data.slice(0, 10));
      await refreshBalance();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock chart data
  const chartData = [
    { time: '00:00', price: 1.0 },
    { time: '04:00', price: 0.98 },
    { time: '08:00', price: 1.02 },
    { time: '12:00', price: 1.01 },
    { time: '16:00', price: 0.99 },
    { time: '20:00', price: 1.03 },
    { time: '24:00', price: 1.00 },
  ];

  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
  const avgPrice = transactions.length > 0 
    ? transactions.reduce((sum, tx) => sum + tx.price, 0) / transactions.length 
    : 1.0;

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="dashboard-heading">Dashboard</h1>
        <p className="text-zinc-400">Overview of your portfolio and market activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-[#18181b] border-white/10" data-testid="balance-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">Token Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-semibold" data-testid="dashboard-balance">
              {user?.balance?.toFixed(2).toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 mt-1">TKN</p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-semibold" data-testid="total-volume">
              {totalVolume.toFixed(2)}
            </p>
            <p className="text-sm text-emerald-500 mt-1 flex items-center gap-1">
              <ArrowUpRight size={14} />
              +12.5%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg. Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-semibold" data-testid="avg-price">
              {avgPrice.toFixed(4)}
            </p>
            <p className="text-sm text-rose-500 mt-1 flex items-center gap-1">
              <ArrowDownRight size={14} />
              -2.3%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-semibold" data-testid="transaction-count">
              {transactions.length}
            </p>
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
              <Activity size={14} />
              Active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart */}
      <Card className="bg-[#18181b] border-white/10">
        <CardHeader>
          <CardTitle>Market Price (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="#52525b" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#52525b" 
                style={{ fontSize: '12px' }}
                domain={[0.95, 1.05]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#6366f1" 
                strokeWidth={2}
                fill="url(#priceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-[#18181b] border-white/10">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-400">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-zinc-400" data-testid="no-transactions">No recent transactions</p>
          ) : (
            <div className="space-y-3" data-testid="recent-transactions">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition"
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <ArrowUpRight size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Trade Executed</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">
                      {tx.amount.toFixed(2)} TKN
                    </p>
                    <p className="text-xs text-zinc-500">@ {tx.price.toFixed(4)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;