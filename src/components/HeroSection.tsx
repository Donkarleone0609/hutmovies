import React, { useState, useEffect } from 'react';
import { PlayIcon, InfoIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { toast } from 'react-toastify';

export function HeroSection() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Проверяем статус подписки пользователя
  const checkUserSubscription = async (userId: string) => {
    try {
      const subscriptionRef = ref(db, `users/${userId}/subscription`);
      const snapshot = await get(subscriptionRef);
      
      if (snapshot.exists()) {
        const subscriptionData = snapshot.val();
        const now = new Date();
        const subscriptionEnd = new Date(subscriptionData.endDate);
        setIsSubscribed(subscriptionEnd > now);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  // Отслеживаем изменения состояния авторизации
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        await checkUserSubscription(user.uid);
      } else {
        setIsSubscribed(false);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Обработчик клика на кнопку "Смотреть"
  const handleWatchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.info('Для просмотра необходимо войти в систему', {
        position: 'bottom-center',
        autoClose: 3000,
      });
      navigate('/login');
      return;
    }
    
    if (!isSubscribed) {
      toast.warning('Для просмотра требуется активная подписка', {
        position: 'bottom-center',
        autoClose: 3000,
      });
      navigate('/subscription');
      return;
    }
    
    // Если пользователь авторизован и имеет подписку
    navigate('/player/-OMgEmp5qArVB39Lzog2');
  };

  // Обработчик клика на кнопку "Подробнее"
  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open('https://hutmovies.vercel.app/tvShow/-OMgEmp5qArVB39Lzog2', '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="relative h-[70vh] bg-cover bg-center flex items-center justify-center" style={{
        backgroundImage: 'url(https://i.ibb.co/nNckrfrB/faslh-TSRU.png)'
      }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] bg-cover bg-center" style={{
      backgroundImage: 'url(https://i.ibb.co/nNckrfrB/faslh-TSRU.png)'
    }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent">
        <div className="container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-2">Фальшивый ЦРУшник 2</h1>
            <p className="text-xl mb-4">2025</p>
            <p className="text-gray-300 mb-8 text-lg">
              Мистер Валерий находит бомжа с формой ЦРУ и забирает ее, что бы пользоваться в своих целях
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleWatchClick}
                className={`px-8 py-3 rounded flex items-center transition ${
                  currentUser && isSubscribed
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-white/80 text-black/80 cursor-pointer'
                }`}
              >
                <PlayIcon size={20} className="mr-2" />
                {currentUser
                  ? isSubscribed
                    ? 'Смотреть'
                    : 'Требуется подписка'
                  : 'Войдите для просмотра'}
              </button>
              
              <button
                onClick={handleInfoClick}
                className="bg-gray-600/70 text-white px-8 py-3 rounded flex items-center hover:bg-gray-600 transition"
              >
                <InfoIcon size={20} className="mr-2" />
                Подробнее
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
