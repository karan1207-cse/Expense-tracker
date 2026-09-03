# AI-Powered Expense Tracker & Personal Finance Assistant
https://expense-tracker-feb75.web.app/

An upgraded, sleek, modern expense-tracking web application built with **React** and **Firebase**, integrated with a secure **Node.js Express** backend and a **Python FastAPI** Machine Learning microservice.

---

## 🌟 Enhanced Features

### 1. 🤖 AI Natural Language & Voice Expense Entry
- Type transaction entries naturally: *"Spent ₹450 on pizza yesterday"* or *"Paid 1500 for electricity bill"*.
- Speak your transactions directly into the browser using the **Web Speech API** microphone.
- Google Gemini extracts `title`, `amount`, `category`, and relative `date` details to auto-complete the form.

### 2. 📸 AI Receipt OCR Scanner
- Upload or drag-and-drop receipt images into the scanner.
- Extracts total cost, merchant name, items, and date using **Tesseract.js** and formats the data into categories.

### 3. 💬 Floating AI Assistant Chatbot
- Open the conversation bubble in the bottom right to ask questions about your financial history:
  - *"How much did I spend on food this month?"*
  - *"Compare this month with last month"*
  - *"Provide suggestions on how I can save more money"*

### 4. 📈 scikit-learn Spending Predictions
- Trains a local Linear Regression model on your cumulative spending history to forecast next week's outflow, next month's outflow, and expected monthly savings.

### 5. 🚨 Isolation Forest Anomaly Detection
- Analyzes category spending patterns using scikit-learn's Isolation Forest and Z-score calculations to alert you during creation if a new expense is unusually high (e.g. ₹5000 on groceries vs your typical ₹400).

### 6. 📊 Modern Fintech Analytics Dashboard
- Stunning glassmorphic cards for limits, outflows, and forecasts.
- Real-time responsive visual breakdowns using **Chart.js** (Category Doughnut Share & Weekly Spending Curve).
- AI Monthly report generator creating personalized trend reports and actionable tips.

---

## 🚀 Quick Start (Running All Services)

### Step 1: Pre-requisites & Setup
Ensure Node.js and Python are installed. 

Create a `.env` file in the `server/` directory and configure your Google Gemini API Key:
```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key
PYTHON_SERVICE_URL=http://localhost:8000
```

### Step 2: Start the Python ML Service
```bash
cd python-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
*The Python microservice will run on `http://localhost:8000`.*

### Step 3: Start the Express AI Backend
```bash
cd server
npm install
npm start
```
*The Express gateway will run on `http://localhost:5000`.*

### Step 4: Run the React Application
```bash
# In the root project directory
npm install
npm start
```
*The frontend web app will open at `http://localhost:3000`.*

---

## 🛠️ Project Structure
```
my-new-app/
├─ public/            # Public assets
├─ src/               # React frontend source code
│  ├─ components/    # AI inputs (NLP, Scanner, Voice), Chatbot, Navbar
│  ├─ pages/         # Dashboard analytics page, Login, Profile
│  ├─ services/      # Axios API service instances
│  └─ App.js         # Routes and real-time Firebase listeners
├─ server/            # Node.js backend (CORS, OCR, Gemini API wrappers)
├─ python-service/    # FastAPI ML Service (Linear Regression, Isolation Forest)
├─ firebase.json      # Firebase configuration
├─ brain.md           # Repository knowledge base
└─ README.md          # You are reading it!
```

---


