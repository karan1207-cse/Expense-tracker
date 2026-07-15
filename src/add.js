import React, { useState, useEffect } from "react";
import "./add.css";
import BackButton from "./backbutton";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import NaturalLanguageEntry from "./components/NaturalLanguageEntry";
import ReceiptScanner from "./components/ReceiptScanner";
import { checkAnomaly } from "./services/api";

function Add() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("manual"); // manual, nlp, scan
  const [history, setHistory] = useState([]);
  const [expense, setExpense] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
    paymentType: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch expenses history for anomaly checks
  useEffect(() => {
    if (!currentUser) return;
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, "expenses"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setHistory(list);
      } catch (err) {
        console.error("Error loading expenses for anomaly detection", err);
      }
    };
    fetchHistory();
  }, [currentUser]);

  const handleChange = (e) => {
    setExpense({
      ...expense,
      [e.target.name]: e.target.value,
    });
  };

  const handleParsedExpense = (data) => {
    setExpense((prev) => ({
      ...prev,
      title: data.title || prev.title,
      amount: data.amount || prev.amount,
      category: data.category || prev.category,
      date: data.date || prev.date,
      notes: data.notes || prev.notes || "",
    }));
    setActiveTab("manual"); // Switch back to manual form to review details
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !expense.title ||
      !expense.amount ||
      !expense.category ||
      !expense.date ||
      !expense.paymentType
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    let isAnomalyDetected = false;
    let anomalyMessage = "";

    try {
      // Check for spending anomaly
      const checkRes = await checkAnomaly(history, {
        amount: Number(expense.amount),
        category: expense.category,
        date: expense.date,
        title: expense.title
      });

      if (checkRes.is_anomaly) {
        isAnomalyDetected = true;
        anomalyMessage = checkRes.message;
      }
    } catch (err) {
      console.warn("Anomaly microservice check bypassed/offline", err);
    }

    if (isAnomalyDetected) {
      const proceed = window.confirm(
        `🚨 ANOMALY WARNING 🚨\n\n${anomalyMessage}\n\nDo you still want to save this expense?`
      );
      if (!proceed) {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await addDoc(collection(db, "expenses"), {
        title: expense.title,
        amount: Number(expense.amount),
        category: expense.category,
        date: expense.date,
        paymentType: expense.paymentType,
        notes: expense.notes,
        isAnomaly: isAnomalyDetected,
        createdAt: new Date(),
        userId: currentUser.uid,
      });

      alert("Expense added successfully!");

      setExpense({
        title: "",
        amount: "",
        category: "",
        date: "",
        paymentType: "",
        notes: "",
      });
      // Refresh local history list
      setHistory((prev) => [...prev, { ...expense, amount: Number(expense.amount) }]);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container fade-in">
      <BackButton />
      
      <div className="form-card">
        <div className="form-header">
          <h2>Add New Expense</h2>
          <p>Record a transaction manually or use our smart AI inputs.</p>
        </div>

        {/* Tab Selection */}
        <div className="add-entry-tabs">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Entry
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'nlp' ? 'active' : ''}`}
            onClick={() => setActiveTab('nlp')}
          >
            AI Text/Voice
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            Scan Receipt
          </button>
        </div>

        {/* Render Scanner or NLP inside the card, maintaining tabs layout */}
        {activeTab === 'nlp' && (
          <NaturalLanguageEntry onParsed={handleParsedExpense} disabled={isSubmitting} />
        )}

        {activeTab === 'scan' && (
          <ReceiptScanner onScanned={handleParsedExpense} disabled={isSubmitting} />
        )}

        {/* Standard form always visible or only visible on manual tab, let's keep it visible on Manual so tabs acts as enhancers */}
        {activeTab === 'manual' && (
          <form className="expense-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                value={expense.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                placeholder="e.g., Groceries"
                value={expense.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  value={expense.amount}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Type *</label>
                <select
                  name="paymentType"
                  value={expense.paymentType}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select Method</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={expense.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Category</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Bills">Bills</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                placeholder="Any additional details..."
                value={expense.notes}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Expense"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Add;
