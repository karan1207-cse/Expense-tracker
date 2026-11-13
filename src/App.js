import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Expenses from './expenses';
import Add from './add';
import Navbar from './navbar';
import Login from './Login';
import Register from './Register';
import Profile from './Profile';
import Dashboard from './pages/Dashboard';
import Chatbot from './components/Chatbot';
import { useAuth } from './AuthContext';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
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
  const [budget, setBudget] = useState(0);
  const [expensesList, setExpensesList] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      setBudget(0);
      setExpensesList([]);
      return;
    }
    
    // Real-time listener for budget (updates instantly when Profile is saved)
    const unsubBudget = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const userData = snap.data() || {};
      setBudget(Number(userData.budget) || 0);
    }, (err) => {
      console.error('Error listening to budget', err);
    });

    // Real‑time listener for expenses
    const q = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({ id: docSnap.id, ...data });
      });
      // Sort by date descending (timezone-safe local parse)
      list.sort((a, b) => {
        const parseLocal = (d) => {
          if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day);
          }
          return new Date(d || 0);
        };
        return parseLocal(b.date) - parseLocal(a.date);
      });
      setExpensesList(list);
    }, (error) => {
      console.error('Error listening to expenses', error);
    });
    return () => {
      unsubBudget();
      unsubscribe();
    };
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout();
      setShowMenu(false);
      setBudget(0);
      setExpensesList([]);
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

                <main className="dashboard-main" style={{ padding: 0 }}>
                  <Dashboard 
                    expenses={expensesList}
                    budget={budget}
                  />
                </main>
              </div>
            </PrivateRoute>
          }
        />
        <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
        <Route path="/add" element={<PrivateRoute><Add /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Routes>

      {currentUser && <Chatbot expenses={expensesList} />}
    </div>
  );
}

export default App;
