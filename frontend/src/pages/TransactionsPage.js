import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TransactionsPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/all-transactions`, {
        headers: getAuthHeaders()
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="transactions-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="transactions-heading">
            Transactions
          </h1>
          <p className="text-zinc-400">Complete history of all marketplace trades</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchTransactions}
          className="border-white/10 hover:bg-white/5"
          data-testid="refresh-transactions"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="bg-[#18181b] border-white/10">
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-400">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-zinc-400" data-testid="no-transactions">No transactions yet</p>
          ) : (
            <div className="space-y-2" data-testid="transactions-list">
              {transactions.map((tx) => {
                const isSender = tx.from_user === user?.email;
                const isReceiver = tx.to_user === user?.email;
                
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-white/5 hover:bg-white/5 transition"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSender ? 'bg-rose-500/10' : isReceiver ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
                      }`}>
                        {isSender ? (
                          <ArrowUpRight size={20} className="text-rose-500" />
                        ) : isReceiver ? (
                          <ArrowDownRight size={20} className="text-emerald-500" />
                        ) : (
                          <ArrowUpRight size={20} className="text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isSender && 'Sold to'}
                          {isReceiver && 'Bought from'}
                          {!isSender && !isReceiver && 'Trade between'}
                          <span className="text-zinc-400 ml-1">
                            {isSender ? tx.to_user : isReceiver ? tx.from_user : `${tx.from_user} → ${tx.to_user}`}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${
                        isSender ? 'text-rose-500' : isReceiver ? 'text-emerald-500' : 'text-white'
                      }`}>
                        {isSender && '-'}{isReceiver && '+'}{tx.amount.toFixed(2)} TKN
                      </p>
                      <p className="text-xs text-zinc-500">@ {tx.price.toFixed(4)}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Total: {(tx.amount * tx.price).toFixed(4)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;