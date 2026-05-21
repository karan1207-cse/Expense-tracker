import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Expenses from './expenses';
import Add from './add';
import Navbar from './navbar';
import Login from './Login';
import Register from './Register';
import Profile from './Profile';
import { useAuth } from './AuthContext';
import { collection, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [showMenu, setShowMenu] = React.useState(false);
  const [usedPerc, setUsedPerc] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [budget, setBudget] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    // Listener for budget (once)
    const fetchBudget = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userSnap.data() || {};
        setBudget(Number(userData.budget) || 0);
      } catch (err) {
        console.error('Error fetching budget', err);
      }
    };
    fetchBudget();

    // Real‑time listener for expenses
    const q = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sum = 0;
      snapshot.forEach((docSnap) => {
        const amt = Number(docSnap.data().amount) || 0;
        sum += amt;
      });
      setTotal(sum);
    }, (error) => {
      console.error('Error listening to expenses', error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (budget > 0) {
      const percentage = ((total / budget) * 100).toFixed(1);
      setUsedPerc(percentage);
      setRemaining((budget - total).toFixed(2));
    }
  }, [total, budget]);

  async function handleLogout() {
    try {
      await logout();
      setShowMenu(false);
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <div className="app-layout">
      {currentUser && <Navbar showMenu={showMenu} setShowMenu={setShowMenu} />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <div className="dashboard-container">
                
                {showMenu && (
                  <div className="side-menu-overlay" onClick={() => setShowMenu(false)}>
                    <div className="side-menu" onClick={(e) => e.stopPropagation()}>
                      <div className="menu-header">
                        <div className="profile-avatar">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <div className="profile-info">
                          <h3>{currentUser?.email?.split('@')[0] || "User"}</h3>
                          <p>{currentUser?.email}</p>
                        </div>
                      </div>
                      <div className="menu-links">
                        <button className="menu-link" onClick={handleLogout}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                          Logout
                        </button>
<button className="menu-link" onClick={() => navigate('/profile')}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/></svg>
  Profile
</button>
                      </div>
                    </div>
                  </div>
                )}

                <main className="dashboard-main">
                  <header className="dashboard-header">
                    <h1>Welcome back, <span>{currentUser?.email?.split('@')[0] || "User"}</span></h1>
                    <p>Here's an overview of your expenses.</p>
                  </header>

                  <div className="action-grid">
                    <div className="action-card primary-card" onClick={() => navigate('/add')}>
                      <div className="card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </div>
                      <div className="card-content">
                        <h3>Add Expense</h3>
                        <p>Record a new transaction</p>
                      </div>
                    </div>

                    <div className="action-card secondary-card" onClick={() => navigate('/expenses')}>
                      <div className="card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="8" y1="18" x2="21" y2="18"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                      </div>
                      <div className="card-content">
                        <h3>View Expenses</h3>
                        <p>Analyze your spending</p>
                      </div>
                    </div>
                  </div>

                  <div className="summary-section">
                    <div className="summary-card">
                      <div className="summary-header">
                        <h3>Monthly Budget</h3>
                        <span className="badge">Active</span>
                      </div>
                      {budget > 0 ? (
                        <div>
                          <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${usedPerc}%` }}></div>
                          </div>
                          <div className="summary-stats">
                            <span>{usedPerc}% Used</span>
                            <span>₹{remaining} left</span>
                          </div>
                        </div>
                      ) : (
                        <div className="summary-stats">
                          <span>Please set your budget in Profile.</span>
                        </div>
) }
                    </div>
                  </div>
                </main>
              </div>
            </PrivateRoute>
          }
        />
        <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
        <Route path="/add" element={<PrivateRoute><Add /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
</Routes>
    </div>
  );
}

export default App;
