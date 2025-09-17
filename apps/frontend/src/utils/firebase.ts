// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "video-proctoring-app.firebaseapp.com",
  projectId: "video-proctoring-app",
  storageBucket: "video-proctoring-app.firebasestorage.app",
  messagingSenderId: "361376119590",
  appId: "1:361376119590:web:2075aea8e6cfd658669fe7",
  measurementId: "G-9L1G9JJJHG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);