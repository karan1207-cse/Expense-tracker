from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
import uvicorn

app = FastAPI(title="Expense Tracker AI ML Service")

# Pydantic models
class ExpenseItem(BaseModel):
    date: str
    amount: float
    category: str
    title: Optional[str] = None

class PredictRequest(BaseModel):
    expenses: List[ExpenseItem]

class AnomalyRequest(BaseModel):
    expenses: List[ExpenseItem]
    newExpense: ExpenseItem

@app.get("/health")
def health():
    return {"status": "online"}

@app.post("/predict")
def predict_spending(req: PredictRequest):
    if not req.expenses:
        raise HTTPException(status_code=400, detail="Expenses list cannot be empty")

    try:
        # Convert to Pandas DataFrame
        data = [{"date": e.date, "amount": e.amount} for e in req.expenses]
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        
        # Sort by date
        df = df.sort_values('date')
        
        # Aggregate daily spending
        daily = df.groupby('date')['amount'].sum().reset_index()
        
        if len(daily) < 3:
            # Fallback to simple average daily spending if not enough data points
            avg_daily = df['amount'].sum() / max(1, (df['date'].max() - df['date'].min()).days + 1)
            next_week = round(avg_daily * 7)
            next_month = round(avg_daily * 30)
            return {
                "next_week_predicted": next_week,
                "next_month_predicted": next_month,
                "expected_monthly_savings": 0,
                "method": "fallback_daily_average"
            }
            
        # Calculate cumulative spending to make regression highly linear and stable
        min_date = daily['date'].min()
        daily['days'] = (daily['date'] - min_date).dt.days
        daily['cumulative'] = daily['amount'].cumsum()
        
        X = daily[['days']].values
        y = daily['cumulative'].values
        
        # Fit Linear Regression
        model = LinearRegression()
        model.fit(X, y)
        
        # Current status
        last_day = int(daily['days'].max())
        current_cum = float(daily['cumulative'].iloc[-1])
        
        # Predict cumulative spending 7 days and 30 days into the future
        pred_7 = float(model.predict([[last_day + 7]])[0])
        pred_30 = float(model.predict([[last_day + 30]])[0])
        
        # Next week/month spending is the difference from current cumulative
        next_week = max(0, round(pred_7 - current_cum))
        next_month = max(0, round(pred_30 - current_cum))
        
        # Expected monthly savings (based on regression trend vs simple flat average)
        # If regression slope is negative (spending is decreasing), user is saving more
        slope = float(model.coef_[0])
        flat_expected = avg_daily = df['amount'].mean() * 30
        trend_expected = next_month
        expected_savings = max(0, round(flat_expected - trend_expected))
        
        return {
            "next_week_predicted": next_week,
            "next_month_predicted": next_month,
            "expected_monthly_savings": expected_savings,
            "method": "linear_regression_cumulative"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/detect-anomaly")
def detect_anomaly(req: AnomalyRequest):
    expenses = req.expenses
    new_exp = req.newExpense
    
    if not expenses:
        return {"is_anomaly": False, "message": "No historical data to evaluate anomalies."}
        
    try:
        # Filter past expenses by the same category
        category_expenses = [e for e in expenses if e.category == new_exp.category]
        amounts = [e.amount for e in category_expenses]
        
        if len(amounts) < 3:
            # Not enough history in this category, return no anomaly
            return {"is_anomaly": False, "message": "Insufficient category history to evaluate anomalies."}
            
        mean = float(np.mean(amounts))
        std = float(np.std(amounts)) if len(amounts) > 1 else 0.0
        new_amt = new_exp.amount
        
        # If standard deviation is 0, all past expenses are identical.
        # Check if new expense is 3 times greater
        if std == 0.0 or len(amounts) < 5:
            if new_amt > mean * 3 and new_amt > 500:
                return {
                    "is_anomaly": True,
                    "message": f"This expense is significantly higher than your typical {new_exp.category} spending of ₹{round(mean)}."
                }
            return {"is_anomaly": False, "message": ""}
            
        # Run Isolation Forest for outlier detection if we have at least 5 points
        amounts_arr = np.array(amounts).reshape(-1, 1)
        model = IsolationForest(contamination=0.1, random_state=42)
        model.fit(amounts_arr)
        
        pred = model.predict([[new_amt]])[0]
        
        # Only flag as anomaly if Isolation Forest identifies it as an outlier AND it's higher than the mean
        # (we don't want to warn users about unusually LOW expenses)
        z_score = (new_amt - mean) / std
        
        if pred == -1 and new_amt > mean and z_score > 2.0:
            return {
                "is_anomaly": True,
                "message": f"This expense is unusually high (₹{round(new_amt)} vs average ₹{round(mean)} in {new_exp.category}). Z-score: {round(z_score, 1)}."
            }
            
        return {"is_anomaly": False, "message": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
