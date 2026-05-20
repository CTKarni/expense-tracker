import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC6VaZ3WFcFUW4drffzpUPsszJzC8Y-Nzc",
  authDomain: "expense-tracker-ab30c.firebaseapp.com",
  projectId: "expense-tracker-ab30c",
  storageBucket: "expense-tracker-ab30c.firebasestorage.app",
  messagingSenderId: "758792252873",
  appId: "1:758792252873:web:13e418aa66f5d09f248c18",
  measurementId: "G-ZYE4271TB6"
};

let app, auth, provider;

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
  } catch (error) {
    console.warn("Firebase is not fully configured. Using mock auth setup.");
  }
} else {
  console.warn("Firebase API Key is placeholder. Using mock auth setup.");
}

export { auth, provider, signInWithPopup };
