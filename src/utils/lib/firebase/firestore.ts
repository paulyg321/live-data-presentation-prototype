import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, push } from "firebase/database";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";
import { getFirestore, collection, getDoc, addDoc, doc } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyA4zgnCBMLPfdPww_dOlSDOlyoIgHA5RW8",
  authDomain: "midas-touchfree.firebaseapp.com",
  projectId: "midas-touchfree",
  storageBucket: "midas-touchfree.appspot.com",
  messagingSenderId: "695610986329",
  appId: "1:695610986329:web:c04dba64cec9ae2851c648",
  measurementId: "G-KHVR0K3MWQ",
  databaseURL: "https://midas-touchfree-default-rtdb.firebaseio.com/", // Add this line with your Realtime Database URL
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
const realTimeDB = getDatabase(firebase);
const firestoreDB = getFirestore(firebase);

export function storeStories(data: string) {
  localStorage.setItem("stories", data);
}

export function getStories() {
  const stories = localStorage.getItem("stories");
  if (stories) {
    return stories;
  }
}

export async function storeData(data: string) {
  return storeDataRealTimeDB(data);
}

export async function getStoredData(id: string) {
  try {
    const data = await getStoredDataRealTimeDB(id);
    console.log(data);
    if (data) {
      return data;
    } else {
      return getStoredDataFirestore(id);
    }
  } catch (error) {
    return getStoredDataFirestore(id);
  }
}

export async function storeDataRealTimeDB(data: string) {
  const compressedData = compressToUTF16(data);

  // Generate a new child location using a unique key
  const newDataRef = push(ref(realTimeDB, "/chart-data"));

  // Write the compressed data to the new reference location
  await set(newDataRef, {
    data: compressedData,
  });

  // Return the unique key of the new data location
  return newDataRef.key;
}

export async function getStoredDataRealTimeDB(id: string) {
  const dbRef = ref(realTimeDB);
  const snapshot = await get(child(dbRef, `/chart-data/${id}`));
  if (snapshot.exists()) {
    const decompressedData = decompressFromUTF16(snapshot.val().data);
    return JSON.parse(decompressedData);
  }
}

export async function storeDataFirestore(data: string) {
  const docRef = await addDoc(collection(firestoreDB, "chart-data"), {
    data,
  });

  return docRef.id;
}

export async function getStoredDataFirestore(id: string) {
  const docRef = doc(firestoreDB, "chart-data", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return JSON.parse(docSnap.data().data);
  }
}
