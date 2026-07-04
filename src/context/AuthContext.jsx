import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage token
    const token = localStorage.getItem("gymos_token");
    if (token) {
      api.auth.session()
        .then(({ data }) => {
          if (data) {
            setUser({ id: data.id, email: data.email });
            setProfile(data);
          }
        })
        .catch(() => {
          localStorage.removeItem("gymos_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.auth.login(email, password);
      if (res?.data?.token) {
        localStorage.setItem("gymos_token", res.data.token);
        setUser({ id: res.data.user.id, email: res.data.user.email });
        setProfile(res.data.user);
        return { data: res.data, error: null };
      }
      return { data: null, error: new Error("Login failed") };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const signup = async (email, password, firstName, lastName, role) => {
    try {
      const res = await api.auth.signup(email, password, firstName, lastName, role);
      // Auto-login after signup
      return login(email, password);
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("gymos_token");
  };

  const value = {
    user,
    profile,
    login,
    signup,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
