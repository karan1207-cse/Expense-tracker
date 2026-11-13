import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (err) => {
    const code = err.code || "";
    if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
      return "Invalid email or password. Please check your credentials.";
    } else if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    } else if (code === "auth/too-many-requests") {
      return "Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.";
    } else if (code === "auth/network-request-failed") {
      return "Network error. Please check your internet connection.";
    }
    return err.message || "Failed to sign in. Please try again.";
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      return setError("Please enter your email address.");
    }

    try {
      setError("");
      setLoading(true);
      await login(cleanEmail, password);
      navigate("/");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to ExpenseTracker</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button disabled={loading} className="submit-btn" type="submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

