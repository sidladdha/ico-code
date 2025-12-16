import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MarketplacePage from "./pages/MarketplacePage";
import TransactionsPage from "./pages/TransactionsPage";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <PrivateRoute>
                  <Layout>
                    <MarketplacePage />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <Layout>
                    <TransactionsPage />
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
          <Toaster theme="dark" position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;