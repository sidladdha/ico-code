import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const quickLogin = (userEmail) => {
    setEmail(userEmail);
    setPassword('1234');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-8 bg-[#09090b]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight mb-2" data-testid="login-title">
              TokenTrade
            </h1>
            <p className="text-zinc-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@test.com"
                  required
                  className="bg-[#18181b] border-white/10 focus:border-white/20"
                  data-testid="email-input"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="1234"
                  required
                  className="bg-[#18181b] border-white/10 focus:border-white/20"
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-200 font-medium"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-sm text-zinc-500 text-center">Quick Login (Demo)</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin('owner@test.com')}
                className="border-white/10 hover:bg-white/5"
                data-testid="quick-login-owner"
              >
                Owner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin('user1@test.com')}
                className="border-white/10 hover:bg-white/5"
                data-testid="quick-login-user1"
              >
                User 1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickLogin('user2@test.com')}
                className="border-white/10 hover:bg-white/5"
                data-testid="quick-login-user2"
              >
                User 2
              </Button>
            </div>
            <p className="text-xs text-zinc-600 text-center">All demo accounts use password: 1234</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1762258344624-52d8c3b74c66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBnZW9tZXRyaWMlMjBkaWdpdGFsJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NjU4NjcyOTB8MA&ixlib=rb-4.1.0&q=85"
          alt="Abstract geometric background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default LoginPage;