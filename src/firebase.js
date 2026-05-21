// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbaV7FedWND7EO-udMOKUf6UQ7DdMdrJ0",
  authDomain: "expense-tracker-feb75.firebaseapp.com",
  projectId: "expense-tracker-feb75",
  storageBucket: "expense-tracker-feb75.appspot.com",
  messagingSenderId: "309069875492",
  appId: "1:309069875492:web:147c55de09e64cbb8acbb1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔥 Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ EXPORT db and auth
export { db, auth };
