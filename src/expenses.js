import { useEffect, useState } from "react";
import "./expenses.css";
import BackButton from "./backbutton";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const formatDateLocal = (dateStr) => {
  if (!dateStr) return "";
  if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  const dateObj = new Date(dateStr);
  return isNaN(dateObj.getTime()) ? dateStr : dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const [editData, setEditData] = useState({
    title: "",
    amount: "",
    category: "Food",
    paymentType: "UPI",
    date: "",
    notes: "",
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, "expenses"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        // Sort by date descending (parse locally to avoid timezone offset)
        data.sort((a, b) => {
          const parseLocal = (d) => {
            if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [y, m, day] = d.split('-').map(Number);
              return new Date(y, m - 1, day);
            }
            return new Date(d || 0);
          };
          return parseLocal(b.date) - parseLocal(a.date);
        });
        setExpenses(data);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [currentUser]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this expense?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "expenses", id));
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete expense. " + (err.message || ""));
    }
  };

  const handleEdit = (expense, e) => {
    e.stopPropagation();
    setEditingId(expense.id);
    setEditData({
      title: expense.title || "",
      amount: expense.amount || "",
      category: expense.category || "Food",
      paymentType: expense.paymentType || "UPI",
      date: expense.date || "",
      notes: expense.notes || "",
    });
  };

  const handleSave = async (id, e) => {
    e.stopPropagation();
    const numAmount = Number(editData.amount);

    if (!editData.title.trim()) {
      alert("Please enter a title for the expense.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    if (!editData.date) {
      alert("Please select a valid date.");
      return;
    }

    try {
      const updatedPayload = {
        title: editData.title.trim(),
        amount: numAmount,
        category: editData.category,
        paymentType: editData.paymentType,
        date: editData.date,
        notes: editData.notes || "",
      };

      await updateDoc(doc(db, "expenses", id), updatedPayload);

      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === id ? { ...expense, ...updatedPayload } : expense
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error("Error updating expense:", err);
      alert("Failed to update expense: " + (err.message || ""));
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const toggleExpand = (id) => {
    if (editingId === id) return; // Prevent collapse while editing
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredExpenses =
    selectedCategory === "All"
      ? expenses
      : expenses.filter((expense) => expense.category === selectedCategory);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);
  };

  const getCategoryColor = (category) => {
    const colors = {
      Food: 'category-food',
      Transport: 'category-transport',
      Bills: 'category-bills',
      Entertainment: 'category-entertainment',
      Travel: 'category-travel',
      Other: 'category-other'
    };
    return colors[category] || 'category-other';
  };

  return (
    <div className="page-container fade-in">
      <BackButton />
      
      <div className="expenses-header-area">
        <div className="title-section">
          <h2>Transactions</h2>
          <p>Review and manage your expenses.</p>
        </div>

        <div className="filter-wrapper">
          <select
            className="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Travel">Travel</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="expenses-list-container">
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <p>No expenses found for this category.</p>
          </div>
        ) : (
          <div className="expenses-table">
            <div className="table-header">
              <div className="col-date">Date</div>
              <div className="col-info">Details</div>
              <div className="col-payment">Payment</div>
              <div className="col-amount">Amount</div>
            </div>

            <div className="table-body">
              {filteredExpenses.map((expense) => {
                const isExpanded = expandedId === expense.id;
                const isEditing = editingId === expense.id;

                return (
                  <div 
                    key={expense.id} 
                    className={`expense-card ${isExpanded ? 'expanded' : ''} ${isEditing ? 'editing' : ''} ${expense.isAnomaly ? 'highlight-anomaly' : ''}`}
                    onClick={() => toggleExpand(expense.id)}
                  >
                    <div className="expense-row-main">
                      <div className="col-date">
                        <span className="date-badge">{formatDateLocal(expense.date)}</span>
                      </div>
                      
                      <div className="col-info">
                        <span className="expense-title">
                          {expense.title}
                          {expense.isAnomaly && <span className="warning-indicator" title="AI detected this as unusually high spending">⚠️</span>}
                        </span>
                        <span className={`category-badge ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </div>

                      <div className="col-payment">
                        <span className="payment-type">{expense.paymentType}</span>
                      </div>

                      <div className="col-amount">
                        <span className="amount-value">{formatAmount(expense.amount)}</span>
                        <svg className={`chevron ${isExpanded ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="expense-details-panel" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="edit-form">
                            <div className="edit-row">
                              <input
                                className="edit-input"
                                value={editData.title}
                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                placeholder="Title"
                              />
                              <input
                                type="number"
                                className="edit-input"
                                value={editData.amount}
                                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                                placeholder="Amount (₹)"
                                min="0.01"
                                step="any"
                              />
                            </div>
                            <div className="edit-row" style={{ marginTop: '8px' }}>
                              <select
                                className="edit-input"
                                value={editData.category}
                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                              >
                                <option value="Food">Food</option>
                                <option value="Transport">Transport</option>
                                <option value="Bills">Bills</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Travel">Travel</option>
                                <option value="Other">Other</option>
                              </select>
                              <select
                                className="edit-input"
                                value={editData.paymentType}
                                onChange={(e) => setEditData({ ...editData, paymentType: e.target.value })}
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                              </select>
                              <input
                                type="date"
                                className="edit-input"
                                value={editData.date}
                                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                              />
                            </div>
                            <textarea
                              className="edit-input"
                              value={editData.notes}
                              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                              placeholder="Notes"
                              rows="2"
                              style={{ marginTop: '8px', width: '100%' }}
                            />
                            <div className="action-buttons" style={{ marginTop: '10px' }}>
                              <button className="btn-primary" onClick={(e) => handleSave(expense.id, e)}>Save Changes</button>
                              <button className="btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="view-details">
                            <div className="notes-section">
                              <h4>Notes</h4>
                              <p>{expense.notes || "No additional notes provided."}</p>
                            </div>
                            <div className="action-buttons">
                              <button className="btn-outline" onClick={(e) => handleEdit(expense, e)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                              </button>
                              <button className="btn-danger" onClick={(e) => handleDelete(expense.id, e)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Expenses;

