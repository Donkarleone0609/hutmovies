import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDfdhYv0xQgr6skr9qQ03S8-jPxFFWBhPg",
  authDomain: "hut-movies.firebaseapp.com",
  databaseURL: "https://hut-movies-default-rtdb.firebaseio.com",
  projectId: "hut-movies",
  storageBucket: "hut-movies.firebasestorage.app",
  messagingSenderId: "818725898790",
  appId: "1:818725898790:web:fa48351ee72e3fd00e74e7",
  measurementId: "G-D82TQD0366"
};

// Проверка наличия обязательных конфигурационных параметров
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
  console.error('Необходимые параметры Firebase не настроены. Проверьте переменные окружения.');
  console.log('Доступные переменные:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);