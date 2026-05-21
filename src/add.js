import React, { useState } from "react";
import "./add.css";
import BackButton from "./backbutton";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

function Add() {
  const { currentUser } = useAuth();
  const [expense, setExpense] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
    paymentType: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setExpense({
      ...expense,
      [e.target.name]: e.target.value,
    });
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
    try {
      await addDoc(collection(db, "expenses"), {
        title: expense.title,
        amount: Number(expense.amount),
        category: expense.category,
        date: expense.date,
        paymentType: expense.paymentType,
        notes: expense.notes,
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
          <p>Record a new transaction to track your spending.</p>
        </div>

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
            {isSubmitting ? "Adding..." : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Add;
