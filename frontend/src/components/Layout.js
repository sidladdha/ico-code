import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, TrendingUp, History } from 'lucide-react';
import { Button } from './ui/button';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/marketplace', label: 'Marketplace', icon: TrendingUp },
    { path: '/transactions', label: 'Transactions', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#09090b]/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold tracking-tight" data-testid="app-title">TokenTrade</h1>
              <nav className="flex gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <Button
                        variant="ghost"
                        className={`gap-2 ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-zinc-400">Balance</p>
                <p className="font-mono text-lg font-medium" data-testid="user-balance">
                  {user?.balance?.toFixed(2).toLocaleString()} TKN
                </p>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Account</p>
                <p className="text-sm font-medium" data-testid="user-email">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white"
                data-testid="logout-button"
              >
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
};

export default Layout;