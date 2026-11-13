import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import { getMLPredictions, getMonthlySummaryAI } from '../services/api';
import './Dashboard.css';

// Register Chart.js components
Chart.register(...registerables);

// Helper to format "YYYY-MM" to "September 2026"
const formatMonthLabel = (yearMonthStr) => {
  if (yearMonthStr === 'ALL') return 'All Time';
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr;
  const [year, month] = yearMonthStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, 1);
  return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Helper for local date parsing without timezone offset
const parseDateLocal = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const formatDateLocal = (dateStr) => {
  if (!dateStr) return '';
  const dateObj = parseDateLocal(dateStr);
  if (dateObj.getTime() === 0) return dateStr;
  return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function Dashboard({ expenses, budget }) {
  const navigate = useNavigate();
  const doughnutChartRef = useRef(null);
  const lineChartRef = useRef(null);
  
  const doughnutChartInst = useRef(null);
  const lineChartInst = useRef(null);

  const [predictions, setPredictions] = useState(null);
  const [loadingPreds, setLoadingPreds] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Month selector setup
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Reset AI report when month changes
  useEffect(() => {
    setAiReport('');
  }, [selectedMonth]);

  // Extract all unique YYYY-MM from expenses, plus current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    monthSet.add(currentMonthKey);
    (expenses || []).forEach((e) => {
      if (e.date && typeof e.date === 'string' && e.date.length >= 7) {
        monthSet.add(e.date.substring(0, 7));
      }
    });
    const sorted = Array.from(monthSet).sort().reverse();
    return [...sorted, 'ALL'];
  }, [expenses, currentMonthKey]);

  // Filter expenses for selected month
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (selectedMonth === 'ALL') return expenses;
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Calculate stats strictly for selected month
  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const monthlyRemaining = useMemo(() => {
    if (budget > 0) return budget - monthlyTotal;
    return 0 - monthlyTotal;
  }, [budget, monthlyTotal]);

  const monthlyUsedPerc = useMemo(() => {
    if (budget > 0) return Math.min(999, Number(((monthlyTotal / budget) * 100).toFixed(1)));
    return 0;
  }, [budget, monthlyTotal]);

  // Format currency cleanly
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num < 0) {
      return `-₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch predictions from Python ML microservice via backend proxy
  useEffect(() => {
    if (!expenses || expenses.length === 0) return;

    const fetchPredictions = async () => {
      setLoadingPreds(true);
      try {
        const data = await getMLPredictions(expenses);
        setPredictions(data);
      } catch (err) {
        console.error('Error fetching ML predictions:', err);
      } finally {
        setLoadingPreds(false);
      }
    };

    fetchPredictions();
  }, [expenses]);

  // Handle Chart rendering
  useEffect(() => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      if (doughnutChartInst.current) doughnutChartInst.current.destroy();
      if (lineChartInst.current) lineChartInst.current.destroy();
      return;
    }

    // 1. Doughnut Chart: Category breakdown
    const categoryTotals = {};
    filteredExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    const doughnutCtx = doughnutChartRef.current?.getContext('2d');
    if (doughnutCtx) {
      if (doughnutChartInst.current) {
        doughnutChartInst.current.destroy();
      }

      doughnutChartInst.current = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(categoryTotals),
          datasets: [{
            data: Object.values(categoryTotals),
            backgroundColor: [
              '#6366f1', // Indigo
              '#10b981', // Emerald
              '#f59e0b', // Amber
              '#ef4444', // Red
              '#3b82f6', // Blue
              '#8b5cf6', // Purple
              '#6b7280'  // Gray
            ],
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#6b7280',
                font: { family: 'Outfit', size: 12 }
              }
            }
          }
        }
      });
    }

    // 2. Line Chart: Spending trend
    const sorted = [...filteredExpenses].sort((a, b) => parseDateLocal(a.date) - parseDateLocal(b.date));
    
    // Group by date using formatDateLocal
    const dailySpend = {};
    sorted.forEach(e => {
      const d = formatDateLocal(e.date);
      dailySpend[d] = (dailySpend[d] || 0) + Number(e.amount);
    });

    const trendLabels = Object.keys(dailySpend).slice(-7);
    const trendData = Object.values(dailySpend).slice(-7);

    const lineCtx = lineChartRef.current?.getContext('2d');
    if (lineCtx) {
      if (lineChartInst.current) {
        lineChartInst.current.destroy();
      }

      lineChartInst.current = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Spending',
            data: trendData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#4f46e5'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              ticks: { color: '#6b7280' },
              grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            x: {
              ticks: { color: '#6b7280' },
              grid: { display: false }
            }
          }
        }
      });
    }

    return () => {
      if (doughnutChartInst.current) doughnutChartInst.current.destroy();
      if (lineChartInst.current) lineChartInst.current.destroy();
    };
  }, [filteredExpenses]);

  const handleGenerateReport = async () => {
    if (generatingReport || !filteredExpenses || filteredExpenses.length === 0) return;
    setGeneratingReport(true);
    try {
      const data = await getMonthlySummaryAI(filteredExpenses, budget);
      setAiReport(data.summary);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please check if your Gemini API key is set.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Find anomalous expenses in filtered list
  const anomalies = filteredExpenses.filter(e => e.isAnomaly);

  return (
    <div className="dashboard-content fade-in">
      <header className="dashboard-header-modern">
        <div>
          <h2>Smart Finance Hub</h2>
          <p>Real-time analytics and AI-powered insights for your wealth.</p>
        </div>
        <div className="header-actions">
          <select 
            className="month-filter-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <button className="header-btn primary" onClick={() => navigate('/add')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Expense
          </button>
          <button className="header-btn secondary" onClick={() => navigate('/expenses')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
            Transactions
          </button>
        </div>
      </header>

      {/* Main KPI Stats grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Outflow</span>
          <h3 className="kpi-value">{formatCurrency(monthlyTotal)}</h3>
          <span className="kpi-trend negative">{formatMonthLabel(selectedMonth)}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Monthly Limit</span>
          <h3 className="kpi-value">{formatCurrency(budget)}</h3>
          {budget > 0 ? (
            <div className="kpi-progress">
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, monthlyUsedPerc)}%`,
                    backgroundColor: monthlyUsedPerc > 100 ? '#ef4444' : undefined 
                  }}
                ></div>
              </div>
              <span className="kpi-subtext" style={{ color: monthlyUsedPerc > 100 ? '#ef4444' : undefined }}>
                {monthlyUsedPerc}% Consumed {monthlyUsedPerc > 100 ? '(Over Budget!)' : ''}
              </span>
            </div>
          ) : (
            <span className="kpi-subtext action-req" onClick={() => navigate('/profile')}>Set budget in Profile</span>
          )}
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Available Balance</span>
          <h3 className="kpi-value" style={{ color: monthlyRemaining < 0 ? '#ef4444' : undefined }}>
            {formatCurrency(monthlyRemaining)}
          </h3>
          <span className={`kpi-trend ${monthlyRemaining < 0 ? 'negative' : 'positive'}`}>
            {monthlyRemaining < 0 ? 'Deficit' : 'Remaining'}
          </span>
        </div>
      </div>

      {/* Predictive ML Insight Card */}
      <div className="predictive-banner">
        <div className="predictive-header">
          <div className="predictive-title-row">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <h4>AI Spending Forecasts (Machine Learning)</h4>
          </div>
          {predictions?.is_fallback && <span className="fallback-badge">Fallback Estimate</span>}
        </div>
        {loadingPreds ? (
          <div className="pred-loading">
            <div className="spinner-mini"></div>
            <span>Calculating forecasts...</span>
          </div>
        ) : predictions ? (
          <div className="forecasts-grid">
            <div className="forecast-item">
              <span className="item-label">Expected Next Week</span>
              <span className="item-value">{formatCurrency(predictions.next_week_predicted)}</span>
            </div>
            <div className="forecast-item">
              <span className="item-label">Expected Next Month</span>
              <span className="item-value">{formatCurrency(predictions.next_month_predicted)}</span>
            </div>
            <div className="forecast-item">
              <span className="item-label">Expected Monthly Savings</span>
              <span className="item-value positive">{formatCurrency(predictions.expected_monthly_savings)}</span>
            </div>
          </div>
        ) : (
          <p className="no-preds-text">Add at least 3 transactions to generate AI forecasts.</p>
        )}
      </div>

      {/* Charts section */}
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Category Share ({formatMonthLabel(selectedMonth)})</h4>
          <div className="canvas-wrapper">
            {filteredExpenses.length > 0 ? (
              <canvas ref={doughnutChartRef}></canvas>
            ) : (
              <div className="chart-placeholder">No transactions found for {formatMonthLabel(selectedMonth)}</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h4>Spending Curve ({formatMonthLabel(selectedMonth)})</h4>
          <div className="canvas-wrapper">
            {filteredExpenses.length > 0 ? (
              <canvas ref={lineChartRef}></canvas>
            ) : (
              <div className="chart-placeholder">No transactions found for {formatMonthLabel(selectedMonth)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly Alerts & AI Reports Section */}
      <div className="insights-section">
        {/* Left Column: Anomalies & recent transactions */}
        <div className="insights-left">
          {anomalies.length > 0 && (
            <div className="anomaly-alert-card">
              <div className="alert-card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <h4>Unusual Transactions Detected</h4>
              </div>
              <div className="anomalies-list">
                {anomalies.slice(0, 3).map(e => (
                  <div key={e.id} className="anomaly-item">
                    <div>
                      <span className="anomaly-title">{e.title}</span>
                      <span className="anomaly-meta">{e.category} | {formatDateLocal(e.date)}</span>
                    </div>
                    <span className="anomaly-amount">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-list-card">
            <h4>Outflows ({formatMonthLabel(selectedMonth)})</h4>
            <div className="recent-list">
              {filteredExpenses.slice(0, 5).map(e => (
                <div key={e.id} className={`recent-item ${e.isAnomaly ? 'highlight-anomaly' : ''}`}>
                  <div className="recent-item-info">
                    <span className="recent-title">
                      {e.title}
                      {e.isAnomaly && <span className="warning-dot" title="Anomaly flagged"></span>}
                    </span>
                    <span className="recent-category-badge">{e.category}</span>
                  </div>
                  <div className="recent-item-amount-date">
                    <span className="recent-amount">{formatCurrency(e.amount)}</span>
                    <span className="recent-date">{formatDateLocal(e.date)}</span>
                  </div>
                </div>
              ))}
              {filteredExpenses.length === 0 && (
                <p className="no-transactions">No transactions recorded for this period.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Monthly Summary Report */}
        <div className="insights-right">
          <div className="ai-report-card">
            <div className="report-header">
              <div className="report-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="report-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h4>Monthly AI Summary Report</h4>
              </div>
              <button 
                className="generate-report-btn" 
                onClick={handleGenerateReport}
                disabled={generatingReport || filteredExpenses.length === 0}
              >
                {generatingReport ? 'Analyzing...' : 'Generate AI Report'}
              </button>
            </div>

            <div className="report-body">
              {generatingReport ? (
                <div className="report-loading">
                  <div className="spinner"></div>
                  <p>Our financial AI is reading your expenses for {formatMonthLabel(selectedMonth)}, tracking trends, and drafting suggestions. Hang tight...</p>
                </div>
              ) : aiReport ? (
                <div className="report-markdown-view">
                  {aiReport.split('\n').map((line, idx) => {
                    let formattedLine = line;
                    
                    // Header render
                    if (line.startsWith('### ')) {
                      return <h6 key={idx}>{line.substring(4)}</h6>;
                    } else if (line.startsWith('## ')) {
                      return <h5 key={idx}>{line.substring(3)}</h5>;
                    } else if (line.startsWith('# ')) {
                      return <h4 key={idx}>{line.substring(2)}</h4>;
                    }
                    
                    // Bullet lists
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                      let cleanText = line.trim().substring(2);
                      if (cleanText.includes('**')) {
                        const parts = cleanText.split('**');
                        cleanText = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part);
                      }
                      return <li key={idx} className="report-li">{cleanText}</li>;
                    }

                    // Bold text
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      formattedLine = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part);
                    }

                    return <p key={idx} className="report-p">{formattedLine}</p>;
                  })}
                </div>
              ) : (
                <div className="report-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <p>Click "Generate AI Report" to get personalized savings tips, budget usage, and expense analysis for {formatMonthLabel(selectedMonth)}.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

