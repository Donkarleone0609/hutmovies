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
import { ref, get, set } from 'firebase/database';

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<any>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [hasWatched, setHasWatched] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const movieRef = ref(db, `movies/${id}`);
        const snapshot = await get(movieRef);
        
        if (snapshot.exists()) {
          const movieData = snapshot.val();
          setMovie(movieData);
          if (movieData.ratings) {
            const totalRatings = Object.values(movieData.ratings) as number[];
            const avgRating = totalRatings.reduce((acc, rating) => acc + rating, 0) / totalRatings.length;
            setAverageRating(avgRating);
          }
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
          
          // Проверяем, смотрел ли пользователь фильм
          const watchHistoryRef = ref(db, `users/${user.uid}/movieTimeStamps/${id}`);
          const watchSnapshot = await get(watchHistoryRef);
          setHasWatched(watchSnapshot.exists());
          
          // Получаем оценку пользователя, если она есть
          if (id) {
            const userRatingRef = ref(db, `movies/${id}/ratings/${user.uid}`);
            const userRatingSnapshot = await get(userRatingRef);
            if (userRatingSnapshot.exists()) {
              setUserRating(userRatingSnapshot.val());
            }
          }
        } catch (error) {
          console.error('Error checking user data:', error);
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

  const handleRating = async (rating: number) => {
    if (!currentUser || !movie || !movie.videoSrc || !hasWatched) return;
    try {
      const ratingRef = ref(db, `movies/${movie.id}/ratings/${currentUser.uid}`);
      await set(ratingRef, rating);
      setUserRating(rating);
      // Recalculate average rating
      const movieRef = ref(db, `movies/${movie.id}`);
      const snapshot = await get(movieRef);
      if (snapshot.exists()) {
        const movieData = snapshot.val();
        if (movieData.ratings) {
          const totalRatings = Object.values(movieData.ratings) as number[];
          const avgRating = totalRatings.reduce((acc, rating) => acc + rating, 0) / totalRatings.length;
          setAverageRating(avgRating);
        }
      }
    } catch (error) {
      console.error('Error setting rating:', error);
    }
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
                  {averageRating ? averageRating.toFixed(1) : movie.rating}
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

              {currentUser && movie.videoSrc && hasWatched && (
                <div className="flex gap-2 mb-4">
                  <span className="text-gray-400 mr-2">Ваша оценка:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`text-xl ${userRating && userRating >= star ? 'text-yellow-400' : 'text-gray-400'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

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