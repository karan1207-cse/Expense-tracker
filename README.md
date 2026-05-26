# Expense Tracker

A sleek, modern expense‑tracking web app built with **React** and **Firebase**.

## 🌟 Features
- Add, edit, and delete expenses
- Set a monthly budget and see usage progress
- Real‑time sync with Firebase Firestore
- Responsive, glass‑morphism UI with dark mode
- Deploys automatically to Firebase Hosting

## 🚀 Quick Start
```bash
# Clone the repo
git clone https://github.com/karan1207-cse/Expense-tracker.git
cd Expense-tracker

# Install dependencies
npm install

# Run locally
npm start
```
The app will be available at `http://localhost:3000` (or the port you set).

## 📦 Build
```bash
npm run build
```
This creates an optimized production build in the `build/` folder.

## ☁️ Deploy to Firebase
1. Make sure you have the Firebase CLI installed:
   ```bash
   npm install -g firebase-tools
   ```
2. Authenticate and select your project:
   ```bash
   firebase login
   firebase use expense-tracker-feb75
   ```
3. Deploy:
   ```bash
   firebase deploy --only hosting
   ```
Your live site will be available at `https://expense-tracker-feb75.web.app`.

## 🛠️ Project Structure
```
my-new-app/
├─ public/            # Public assets
├─ src/               # React source code
│  ├─ components/    # UI components (Navbar, Dashboard, etc.)
│  ├─ pages/         # Page components (Add, Expenses, Profile)
│  └─ App.js         # Main app component
├─ firebase.json      # Firebase Hosting config
└─ README.md          # You are reading it!
```

## 📚 Learn More
- React docs: https://reactjs.org/
- Firebase docs: https://firebase.google.com/docs

## 📄 License
MIT © Karan
