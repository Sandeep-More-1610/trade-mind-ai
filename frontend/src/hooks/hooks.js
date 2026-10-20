import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
// src/hooks/useAuth.js
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tm_token");
    const name  = localStorage.getItem("tm_name");
    if (token && name) setUser({ token, name });
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem("tm_token",   data.token);
    localStorage.setItem("tm_name",    data.name);
    setUser({ token: data.token, name: data.name, balance: data.balance });
    toast.success(`Welcome back, ${data.name}!`);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    localStorage.setItem("tm_token", data.token);
    localStorage.setItem("tm_name",  data.name);
    setUser({ token: data.token, name: data.name });
    toast.success("Account created! ₹10L virtual balance credited.");
    return data;
  };

  const logout = () => {
    localStorage.removeItem("tm_token");
    localStorage.removeItem("tm_name");
    setUser(null);
    toast.success("Logged out");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


// src/hooks/useStocks.js
import { stocksAPI } from "../services/api";

export function useStocks() {
  const [stocks,  setStocks]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchStocks = useCallback(async () => {
    try {
      const { data } = await stocksAPI.getAll();
      setStocks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    // Live refresh every 30 seconds
    const id = setInterval(fetchStocks, 30000);
    return () => clearInterval(id);
  }, [fetchStocks]);

  return { stocks, loading, error, refetch: fetchStocks };
}


// src/hooks/usePrediction.js
import { predictAPI } from "../services/api";

export function usePrediction(symbol) {
  const [prediction, setPrediction] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    predictAPI.predict(symbol)
      .then(({ data }) => setPrediction(data))
      .catch(() => setPrediction(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { prediction, loading };
}


// src/hooks/usePortfolio.js
import { portfolioAPI } from "../services/api";

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  const refresh = async () => {
    try {
      const [portRes, sumRes] = await Promise.all([
        portfolioAPI.getPortfolio(),
        portfolioAPI.getSummary(),
      ]);
      setPortfolio(portRes.data);
      setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  return { portfolio, summary, loading, refresh };
}
