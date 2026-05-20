import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
