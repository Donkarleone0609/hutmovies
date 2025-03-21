import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboardIcon,
  FilmIcon,
  TvIcon,
  BellIcon,
  PlusIcon,
  ListIcon,
  EditIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

export function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Проверка прав администратора
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          setIsAdmin(snapshot.exists() && snapshot.val().admin === true);
        } catch (error) {
          console.error('Ошибка проверки прав доступа:', error);
          toast.error('Ошибка проверки прав доступа');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="text-white text-center p-4">Загрузка...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-white text-center p-4">
        Требуются права администратора для доступа к этой странице
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <LayoutDashboardIcon size={28} />
          Административная панель
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Добавление нового контента */}
          <Link 
            to="/admin/add-media" 
            className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg flex flex-col items-center transition-all hover:transform hover:scale-105"
          >
            <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <PlusIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Добавить новый контент</h2>
            <p className="text-gray-400 text-center mt-2">Добавьте фильм или сериал в каталог</p>
          </Link>

          {/* Управление сериалами */}
          <Link 
            to="/admin/series-list" 
            className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg flex flex-col items-center transition-all hover:transform hover:scale-105"
          >
            <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <TvIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Управление сериалами</h2>
            <p className="text-gray-400 text-center mt-2">Редактирование сезонов и эпизодов</p>
          </Link>

          {/* Управление фильмами */}
          <Link 
            to="/admin/movies-list" 
            className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg flex flex-col items-center transition-all hover:transform hover:scale-105"
          >
            <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <FilmIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Управление фильмами</h2>
            <p className="text-gray-400 text-center mt-2">Редактирование данных фильмов</p>
          </Link>

          {/* Уведомления о новых эпизодах */}
          <Link 
            to="/admin/episode-notifications" 
            className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg flex flex-col items-center transition-all hover:transform hover:scale-105"
          >
            <div className="bg-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <BellIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Уведомления о новых эпизодах</h2>
            <p className="text-gray-400 text-center mt-2">Управление уведомлениями об обновлениях</p>
          </Link>

          {/* Отправка уведомлений */}
          <Link 
            to="/admin/notifications" 
            className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg flex flex-col items-center transition-all hover:transform hover:scale-105"
          >
            <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <BellIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-center">Отправка уведомлений</h2>
            <p className="text-gray-400 text-center mt-2">Общие и персональные уведомления пользователям</p>
          </Link>
        </div>
      </div>
    </div>
  );
} 