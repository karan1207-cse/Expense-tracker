import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import "./auth.css";

export default function Profile() {
  const { currentUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(true);

  const userDocRef = doc(db, "users", currentUser.uid);

  useEffect(() => {
    async function fetchProfile() {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPhone(data.phone || "");
        setBudget(data.budget || "");
      }
      setLoading(false);
    }
    fetchProfile();
  }, [currentUser.uid]);

  const handleSave = async (e) => {
    e.preventDefault();
    await setDoc(
      userDocRef,
      { name, phone, email: currentUser.email, budget },
      { merge: true }
    );
    alert("Profile saved!");
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Profile</h2>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email (read‑only)</label>
            <input type="email" value={currentUser.email} readOnly />
          </div>
          <div className="form-group">
            <label>Budget</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      </div>
    </div>
  );
}
