// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDoc, addDoc, doc } from "firebase/firestore/lite";
import LZString from "lz-string";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4zgnCBMLPfdPww_dOlSDOlyoIgHA5RW8",
  authDomain: "midas-touchfree.firebaseapp.com",
  projectId: "midas-touchfree",
  storageBucket: "midas-touchfree.appspot.com",
  messagingSenderId: "695610986329",
  appId: "1:695610986329:web:c04dba64cec9ae2851c648",
  measurementId: "G-KHVR0K3MWQ",
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
export const db = getFirestore(firebase);

export async function storeStories(data: string) {
  localStorage.setItem("stories", data);
}

export async function getStories() {
  const stories = localStorage.getItem("stories");
  if (stories) {
    return stories;
  }
}

export async function storeData(data: string) {
  // Add a new document in collection "cities"
  const docRef = await addDoc(collection(db, "chart-data"), {
    data,
  });

  return docRef.id;
}

export async function getStoredData(id: string) {
  // Add a new document in collection "cities"
  const docRef = doc(db, "chart-data", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return JSON.parse(docSnap.data().data);
  }
}
