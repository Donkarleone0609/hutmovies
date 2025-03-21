import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ClockIcon, 
  StarIcon, 
  FilmIcon, 
  UserIcon, 
  UsersIcon,
  PlayIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { ref, get } from 'firebase/database';

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<any>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const movieRef = ref(db, `movies/${id}`);
        const snapshot = await get(movieRef);
        
        if (snapshot.exists()) {
          setMovie(snapshot.val());
        } else {
          setMovie(null);
        }
      } catch (error) {
        console.error('Error fetching movie:', error);
        setMovie(null);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      await fetchMovie();
      
      if (user) {
        try {
          const subscriptionRef = ref(db, `users/${user.uid}/subscription`);
          const snapshot = await get(subscriptionRef);
          
          if (snapshot.exists()) {
            const subscription = snapshot.val();
            const isActive = subscription.status === 'active' && subscription.endDate > Date.now();
            setHasActiveSubscription(isActive);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, [id]);

  const getButtonContent = () => {
    if (!movie?.videoSrc) {
      return (
        <div className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed">
          <PlayIcon size={20} className="inline mr-2 opacity-50" />
          Скоро
        </div>
      );
    }

    if (loading) {
      return (
        <button 
          disabled
          className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed"
        >
          Проверка подписки...
        </button>
      );
    }

    if (!currentUser) {
      return (
        <button
          disabled
          className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed"
        >
          <PlayIcon size={20} className="inline mr-2 opacity-50" />
          Войдите для просмотра
        </button>
      );
    }

    if (!hasActiveSubscription) {
      return (
        <button
          disabled
          className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed"
        >
          <PlayIcon size={20} className="inline mr-2 opacity-50" />
          Требуется активная подписка
        </button>
      );
    }

    return (
      <Link 
        to={`/player/${movie.id}?continue=true`}
        className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition"
      >
        <PlayIcon size={20} className="inline mr-2" />
        Смотреть сейчас
      </Link>
    );
  };

  if (loading) {
    return <div className="text-white text-center p-4">Загрузка...</div>;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center py-20">Фильм не найден</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div 
        className="relative h-[70vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${movie.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50">
          <div className="container mx-auto px-4 h-full flex items-end pb-16">
            <div className="max-w-3xl">
              <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>
              
              <div className="flex flex-wrap gap-4 text-sm mb-6">
                <span className="flex items-center">
                  <ClockIcon size={16} className="mr-1" />
                  {movie.duration}
                </span>
                <span className="flex items-center">
                  <StarIcon size={16} className="mr-1" />
                  {movie.rating}
                </span>
                <span>{movie.year}</span>
                <span className="flex items-center">
                  <FilmIcon size={16} className="mr-1" />
                  {movie.genre}
                </span>
                <span className="flex items-center">
                  <UserIcon size={16} className="mr-1" />
                  {movie.director}
                </span>
              </div>

              <p className="text-lg text-gray-300 mb-8">{movie.description}</p>

              {movie.cast && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2 flex items-center">
                    <UsersIcon size={20} className="mr-2" />
                    В ролях:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.cast.map((actor: string, index: number) => (
                      <span 
                        key={index}
                        className="bg-gray-800 px-3 py-1 rounded-full text-sm"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {getButtonContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}