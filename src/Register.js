import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./auth.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (err) => {
    const code = err.code || "";
    if (code === "auth/email-already-in-use") {
      return "An account with this email address already exists.";
    } else if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    } else if (code === "auth/weak-password") {
      return "Password should be at least 6 characters long.";
    } else if (code === "auth/network-request-failed") {
      return "Network error. Please check your internet connection and try again.";
    }
    return err.message || "Failed to create an account. Please try again.";
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      return setError("Please enter an email address.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    if (password !== passwordConfirm) {
      return setError("Passwords do not match.");
    }

    try {
      setError("");
      setLoading(true);
      const res = await signup(cleanEmail, password);
      
      // Initialize default user document in Firestore
      if (res?.user?.uid) {
        await setDoc(
          doc(db, "users", res.user.uid),
          {
            email: cleanEmail,
            name: "",
            phone: "",
            budget: 0,
            createdAt: new Date(),
          },
          { merge: true }
        );
      }

      navigate("/");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Start tracking your expenses today</p>
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
              placeholder="•••••••• (Min. 6 chars)"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button disabled={loading} className="submit-btn" type="submit">
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

