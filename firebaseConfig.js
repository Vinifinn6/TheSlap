import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"
import "firebase/storage"

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
}

firebase.initializeApp(firebaseConfig)
const auth = firebase.auth()
const db = firebase.firestore()
const storage = firebase.storage()

// Configurações adicionais para o Firestore
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
})

// Habilitar persistência offline para melhor experiência do usuário
db.enablePersistence().catch((err) => {
  if (err.code == "failed-precondition") {
    console.warn("Persistência falhou, possivelmente múltiplas abas abertas")
  } else if (err.code == "unimplemented") {
    console.warn("O navegador não suporta persistência offline")
  }
})
