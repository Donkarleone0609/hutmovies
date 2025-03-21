import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ClockIcon, 
  StarIcon, 
  FilmIcon, 
  UserIcon, 
  UsersIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BellIcon,
  SendIcon,
  RotateCwIcon,
  EditIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { ref, get, push, set, update } from 'firebase/database';
import { toast } from 'react-toastify';
import { 
  sendPersonalNotification, 
  isUserSubscribedToShow, 
  sendNewEpisodeNotification,
  checkForNewEpisodes
} from '../utils/notificationsHelper';
import { formatTime, getVideoProgress, getLastWatched } from '../utils/videoHelper';

interface Episode {
  id: number;
  title: string;
  duration: string;
  videoSrc: string;
}

interface Season {
  number: number;
  episodes: Episode[];
}

interface TVShow {
  id: number;
  type: 'tv';
  title: string;
  image: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  director: string;
  cast?: string[];
  seasons: Season[];
}

interface TVTimeStamps {
  [showId: string]: {
    seasons: {
      [seasonNumber: string]: {
        episodes: {
          [episodeNumber: string]: {
            time: number;
            timestamp: number;
            duration?: number;
          };
        };
      };
    };
  };
}

interface LastWatched {
  type: 'tvShow' | 'movie';
  contentId: number;
  season?: number;
  episode?: number;
  time: number;
  timestamp: number;
}

export function TVShowPage() {
  const { id } = useParams<{ id: string }>();
  const [openedSeason, setOpenedSeason] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tvTimeStamps, setTVTimeStamps] = useState<TVTimeStamps>({});
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null);
  const [show, setShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [checkingNewEpisodes, setCheckingNewEpisodes] = useState(false);
  
  // Загружаем данные сериала из Firebase
  useEffect(() => {
    const fetchTVShow = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const tvShowRef = ref(db, `tvShows/${id}`);
        const snapshot = await get(tvShowRef);
        
        if (snapshot.exists()) {
          setShow(snapshot.val());
        } else {
          console.error('Сериал не найден в базе данных');
          setShow(null);
        }
      } catch (error) {
        console.error('Ошибка загрузки сериала:', error);
        setShow(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTVShow();
  }, [id]);

  // Функция для получения статуса подписки на уведомления о новых сериях
  const fetchSubscriptionStatus = async (userId: string, showId: string) => {
    try {
      setIsSubscribed(await isUserSubscribedToShow(userId, showId));
    } catch (error) {
      console.error('Ошибка при проверке статуса подписки:', error);
    }
  };

  // Функция для подписки/отписки от уведомлений о новых сериях
  const toggleSubscription = async () => {
    if (!currentUser || !show) return;
    
    try {
      const subscriptionRef = ref(db, `users/${currentUser.uid}/subscriptions/tvShows/${show.id}`);
      
      if (isSubscribed) {
        // Отписка от уведомлений
        await set(subscriptionRef, null);
        setIsSubscribed(false);
        toast.success(`Вы отписались от уведомлений о новых сериях "${show.title}"`);
      } else {
        // Подписка на уведомления
        await set(subscriptionRef, true);
        setIsSubscribed(true);
        toast.success(`Вы подписались на уведомления о новых сериях "${show.title}"`);
        
        // Отправляем системное уведомление о подписке
        await sendPersonalNotification(
          currentUser.uid,
          'Подписка на сериал',
          `Вы подписались на уведомления о новых сериях "${show.title}"`,
          'bell'
        );
      }
    } catch (error) {
      console.error('Ошибка при изменении подписки:', error);
      toast.error('Произошла ошибка при изменении подписки');
    }
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user && id) {
        try {
          const tvStampsRef = ref(db, `users/${user.uid}/tvTimeStamps`);
          const lastWatchedRef = ref(db, `users/${user.uid}/lastWatched`);
          const userRef = ref(db, `users/${user.uid}`);
          
          const [tvSnapshot, lastSnapshot, userSnapshot] = await Promise.all([
            get(tvStampsRef),
            get(lastWatchedRef),
            get(userRef)
          ]);

          const tvData = tvSnapshot.exists() ? tvSnapshot.val() : {};
          const lastData = lastSnapshot.exists() ? lastSnapshot.val() : null;
          
          console.log('Загружены данные о просмотре:', { tvData, lastData });
          
          setTVTimeStamps(tvData);
          setLastWatched(lastData);
          
          // Проверяем статус подписки
          await fetchSubscriptionStatus(user.uid, id);
          
          // Проверяем, является ли пользователь администратором
          if (userSnapshot.exists()) {
            setIsAdmin(userSnapshot.val().admin === true);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [id]);

  const getEpisodeProgress = (seasonNumber: number, episodeId: number) => {
    if (!show || !tvTimeStamps[show.id.toString()]) return null;
    
    // Проверяем структуру данных tvTimeStamps и получаем прогресс для конкретного эпизода
    const seasonData = tvTimeStamps[show.id.toString()]?.seasons?.[seasonNumber];
    if (!seasonData || !seasonData.episodes || !seasonData.episodes[episodeId]) {
      return null;
    }
    
    const progress = seasonData.episodes[episodeId];
    console.log('Прогресс эпизода:', { seasonNumber, episodeId, progress });
    
    // Возвращаем null, если структура данных некорректна
    if (!progress || typeof progress.time !== 'number') {
      return null;
    }
    
    return progress;
  };

  const getLastWatchedEpisode = (): { episode: Episode | null, season: number | null } => {
    console.log('Получение последнего просмотренного эпизода:', { lastWatched, showId: show?.id });
    
    // Проверяем наличие сезонов и эпизодов
    if (!show || !show.seasons || !Array.isArray(show.seasons) || show.seasons.length === 0) {
      console.log('У сериала нет сезонов');
      return { episode: null, season: null };
    }
    
    // Проверяем, есть ли данные о последнем просмотре и совпадает ли ID контента
    if (!lastWatched || 
        lastWatched.contentId !== show.id || 
        lastWatched.type !== 'tvShow' || 
        typeof lastWatched.season !== 'number' || 
        typeof lastWatched.episode !== 'number') {
      console.log('Возвращаем первый эпизод, так как нет lastWatched или не совпадают данные', {
        lastWatchedExists: !!lastWatched,
        showExists: !!show,
        contentIdMatch: lastWatched?.contentId === show?.id,
        typeIsTVShow: lastWatched?.type === 'tvShow',
        seasonIsValid: typeof lastWatched?.season === 'number',
        episodeIsValid: typeof lastWatched?.episode === 'number'
      });
      return getFirstEpisode();
    }
    
    // Находим нужный сезон
    const season = show.seasons?.find(s => s.number === lastWatched.season);
    
    if (!season) {
      console.log('Сезон не найден:', lastWatched.season);
      return getFirstEpisode();
    }
    
    // Проверяем, есть ли эпизоды в сезоне
    if (!season.episodes || !Array.isArray(season.episodes) || season.episodes.length === 0) {
      console.log('В сезоне нет эпизодов:', season.number);
      return getFirstEpisode();
    }
    
    // Сначала ищем по ID
    let episode = season.episodes.find(e => e.id === lastWatched.episode);
    
    // Если по ID не нашли, пробуем найти по индексу (эпизод №...)
    if (!episode && season.episodes.length >= lastWatched.episode) {
      episode = season.episodes[lastWatched.episode - 1];
      console.log('Найден эпизод по индексу:', lastWatched.episode - 1, episode);
    }
    
    console.log('Результат поиска эпизода по lastWatched:', { 
      seasonNumber: season.number, 
      episodeFound: !!episode,
      episode: episode
    });
    
    return episode ? { episode, season: season.number } : getFirstEpisode();
  };

  const getFirstEpisode = (): { episode: Episode | null, season: number | null } => {
    if (!show || !show.seasons || !Array.isArray(show.seasons) || show.seasons.length === 0) {
      console.log('Нет сезонов для получения первого эпизода');
      return { episode: null, season: null };
    }
    
    const firstSeason = show.seasons[0];
    
    if (!firstSeason.episodes || !Array.isArray(firstSeason.episodes) || firstSeason.episodes.length === 0) {
      console.log('В первом сезоне нет эпизодов');
      return { episode: null, season: firstSeason.number };
    }
    
    const firstEpisode = firstSeason.episodes[0] || null;
    console.log('Первый эпизод:', firstEpisode);
    return { episode: firstEpisode, season: firstSeason.number };
  };

  const handleMainWatchButton = (): string => {
    const { episode, season } = getLastWatchedEpisode();
    
    // Если эпизод не найден, или у эпизода нет videoSrc, возвращаем "#" (ссылка никуда не ведет)
    if (!episode || !show || !season || !episode.videoSrc) return '#';
    
    // Для продолжения просмотра добавляем параметр continue=true
    return `/player/${show.id}?season=${season}&episode=${episode.id || 1}&continue=true`;
  };

  const getButtonText = () => {
    // Проверяем доступность видео для последнего просмотренного эпизода
    const { episode } = getLastWatchedEpisode();
    if (!episode || !episode.videoSrc) {
      return 'Скоро';
    }
    
    if (!lastWatched || !show || 
        lastWatched.contentId !== show.id || 
        lastWatched.type !== 'tvShow' || 
        typeof lastWatched.season !== 'number' || 
        typeof lastWatched.episode !== 'number') {
      return `Смотреть 1 серию`;
    }
    
    const progress = getEpisodeProgress(lastWatched.season, lastWatched.episode);
    
    // Если есть прогресс, определяем формат текста "Продолжить"
    if (progress && typeof progress.time === 'number' && progress.time > 0) {
      // Если прогресс близок к концу эпизода и это не последний эпизод, предлагаем следующий
      if (progress.duration && progress.time > progress.duration * 0.9) {
        const nextEpisode = getNextEpisode(lastWatched.season, lastWatched.episode);
        if (nextEpisode) {
          return `Смотреть ${nextEpisode.season} сезон ${nextEpisode.episode} серию`;
        }
      }
      
      // Если есть время, показываем его в формате минут
      const minutes = Math.floor(progress.time / 60);
      return `Продолжить с ${minutes} мин.`;
    }
    
    // Если прогресса нет, показываем базовый текст
    return `Смотреть ${episode.id || 1} серию`;
  };

  // Функция для получения следующего эпизода
  const getNextEpisode = (seasonNum: number, episodeNum: number): { season: number, episode: number } | null => {
    if (!show || !show.seasons) return null;
    
    // Находим текущий сезон
    const currentSeason = show.seasons.find(s => s.number === seasonNum);
    if (!currentSeason || !currentSeason.episodes) return null;
    
    // Проверяем, есть ли следующий эпизод в текущем сезоне
    const currentEpisodeIndex = currentSeason.episodes.findIndex(e => e.id === episodeNum);
    if (currentEpisodeIndex >= 0 && currentEpisodeIndex < currentSeason.episodes.length - 1) {
      const nextEpisode = currentSeason.episodes[currentEpisodeIndex + 1];
      return { season: seasonNum, episode: nextEpisode.id || (currentEpisodeIndex + 2) };
    }
    
    // Если это последний эпизод сезона, проверяем наличие следующего сезона
    const currentSeasonIndex = show.seasons.findIndex(s => s.number === seasonNum);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < show.seasons.length - 1) {
      const nextSeason = show.seasons[currentSeasonIndex + 1];
      if (nextSeason.episodes && nextSeason.episodes.length > 0) {
        const firstEpisode = nextSeason.episodes[0];
        return { season: nextSeason.number, episode: firstEpisode.id || 1 };
      }
    }
    
    return null;
  };

  // Функция для отправки уведомления о новой серии
  const handleSendNewEpisodeNotification = async (seasonNumber: number, episodeNumber: number, episodeTitle?: string) => {
    if (!show || !currentUser || !isAdmin) return;
    
    try {
      setSendingNotification(true);
      
      const count = await sendNewEpisodeNotification(
        show.id,
        show.title,
        seasonNumber,
        episodeNumber,
        episodeTitle
      );
      
      if (count) {
        toast.success(`Уведомления о новой серии отправлены ${count} подписчикам`);
      } else {
        toast.info('У сериала нет подписчиков');
      }
    } catch (error) {
      console.error('Ошибка отправки уведомления о новой серии:', error);
      toast.error('Ошибка отправки уведомления о новой серии');
    } finally {
      setSendingNotification(false);
    }
  };

  // Функция для автоматической проверки новых серий
  const handleCheckNewEpisodes = async () => {
    if (!show || !currentUser || !isAdmin) return;
    
    try {
      setCheckingNewEpisodes(true);
      toast.info('Проверка наличия новых серий...');
      
      const count = await checkForNewEpisodes(show.id);
      
      if (count === null) {
        toast.info('Новых серий не обнаружено');
      } else if (count > 0) {
        toast.success(`Уведомления о новой серии отправлены ${count} подписчикам`);
      } else {
        toast.info('Новых серий нет или у сериала нет подписчиков');
      }
    } catch (error) {
      console.error('Ошибка при проверке новых серий:', error);
      toast.error('Ошибка при проверке новых серий');
    } finally {
      setCheckingNewEpisodes(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="text-center py-20">Сериал не найден</div>
      </div>
    );
  }

  const toggleSeason = (seasonNumber: number) => {
    setOpenedSeason(prev => prev === seasonNumber ? null : seasonNumber);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {loading ? (
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : show ? (
        <>
          <div 
            className="relative h-[70vh] bg-cover bg-center"
            style={{ backgroundImage: `url(${show.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50">
              <div className="container mx-auto px-4 h-full flex items-end pb-16">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                      Сериал
                    </span>
                    {isAdmin && (
                      <Link 
                        to={`/admin/edit-series/${show.id}`}
                        className="bg-purple-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
                      >
                        <EditIcon size={12} />
                        Редактировать
                      </Link>
                    )}
                  </div>
                  
                  <h1 className="text-5xl font-bold mb-4">{show.title}</h1>
                  
                  <div className="flex flex-wrap gap-4 text-sm mb-6">
                    <span className="flex items-center">
                      <StarIcon size={16} className="mr-1" />
                      {show.rating}
                    </span>
                    <span>{show.year}</span>
                    <span className="flex items-center">
                      <FilmIcon size={16} className="mr-1" />
                      {show.genre}
                    </span>
                    <span className="flex items-center">
                      <UserIcon size={16} className="mr-1" />
                      {show.director}
                    </span>
                  </div>

                  <p className="text-lg text-gray-300 mb-8">{show.description}</p>

                  {show.cast && show.cast.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-2 flex items-center">
                        <UsersIcon size={20} className="mr-2" />
                        В ролях:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {show.cast.map((actor, index) => (
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

                  <div className="flex gap-3">
                    {(() => {
                      // Проверяем наличие сезонов и эпизодов
                      const hasSeasons = show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0;
                      const hasEpisodes = hasSeasons && show.seasons.some(season => 
                        season.episodes && Array.isArray(season.episodes) && season.episodes.length > 0
                      );
                      const hasAvailableEpisodes = hasEpisodes && show.seasons.some(season => 
                        season.episodes && season.episodes.some(episode => episode.videoSrc)
                      );
                      
                      if (!hasSeasons || !hasEpisodes || !hasAvailableEpisodes) {
                        return (
                          <div className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed">
                            <PlayIcon size={20} className="inline mr-2 opacity-50" />
                            Скоро
                          </div>
                        );
                      }
                      
                      const { episode } = getLastWatchedEpisode();
                      if (!episode || !episode.videoSrc) {
                        return (
                          <div className="inline-block bg-gray-600 text-gray-300 px-8 py-3 rounded-lg cursor-not-allowed">
                            <PlayIcon size={20} className="inline mr-2 opacity-50" />
                            Скоро
                          </div>
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
                      
                      return (
                        <Link
                          to={handleMainWatchButton()}
                          className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition"
                        >
                          <PlayIcon size={20} className="inline mr-2" />
                          {getButtonText()}
                        </Link>
                      );
                    })()}
                    
                    {currentUser && (
                      <button 
                        onClick={toggleSubscription}
                        className={`inline-block px-8 py-3 rounded-lg ${
                          isSubscribed ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
                        } transition`}
                        title={isSubscribed ? 'Отписаться от уведомлений' : 'Подписаться на новые серии'}
                      >
                        <BellIcon size={20} className="inline mr-2" />
                        {isSubscribed ? 'Отписаться' : 'Подписаться'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Сезоны</h2>
              
              {isAdmin && currentUser && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckNewEpisodes}
                    disabled={checkingNewEpisodes}
                    className={`px-4 py-2 rounded flex items-center ${
                      checkingNewEpisodes ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                    title="Автоматически проверить наличие новых серий и отправить уведомления"
                  >
                    <RotateCwIcon size={18} className={`mr-2 ${checkingNewEpisodes ? 'animate-spin' : ''}`} />
                    Проверить новые серии
                  </button>
                  <span className="text-yellow-400 text-sm">Админ-панель</span>
                </div>
              )}
            </div>
            
            {!show.seasons || !Array.isArray(show.seasons) || show.seasons.length === 0 ? (
              <div className="text-center p-8 bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-4">
                <div className="text-gray-400 text-lg">Информация о сезонах пока отсутствует</div>
                <div className="text-gray-500">Следите за обновлениями</div>
              </div>
            ) : (
              show.seasons.map((season) => (
                <div key={season.number} className="mb-6 bg-gray-800 rounded-lg">
                  <button
                    onClick={() => toggleSeason(season.number)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-700 transition"
                  >
                    <span className="text-xl font-semibold">
                      Сезон {season.number}
                    </span>
                    {openedSeason === season.number ? (
                      <ChevronUpIcon size={24} />
                    ) : (
                      <ChevronDownIcon size={24} />
                    )}
                  </button>
                  
                  {openedSeason === season.number && (
                    <div className="p-4 pt-0">
                      {!season.episodes || !Array.isArray(season.episodes) || season.episodes.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">Эпизоды пока не добавлены</div>
                      ) : (
                        season.episodes.map((episode, index) => {
                          const isAvailable = !!episode.videoSrc;
                          const episodeId = episode.id || (index + 1);
                          const progress = getEpisodeProgress(season.number, episodeId);
                          
                          return (
                            <div
                              key={episodeId}
                              className="flex items-center justify-between p-3 hover:bg-gray-700 rounded transition"
                            >
                              <div className="flex-1">
                                <h3 className="font-medium">{episode.title || `Эпизод ${index + 1}`}</h3>
                                <div className="flex items-center text-sm text-gray-400 mt-1">
                                  <ClockIcon size={14} className="mr-1" />
                                  {episode.duration}
                                  {progress && (
                                    <span className="ml-2 text-green-400">
                                      Просмотрено: {formatTime(progress.time)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isAdmin && (
                                  <button
                                    onClick={() => handleSendNewEpisodeNotification(
                                      season.number,
                                      episodeId,
                                      episode.title
                                    )}
                                    disabled={sendingNotification}
                                    className={`px-3 py-2 rounded hover:bg-yellow-700 transition flex items-center ${
                                      sendingNotification ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-600'
                                    }`}
                                    title="Отправить уведомление о новой серии"
                                  >
                                    <SendIcon size={16} className="mr-1" />
                                    Уведомить
                                  </button>
                                )}
                                
                                {isAvailable ? (
                                  currentUser ? (
                                    <Link
                                      to={`/player/${show.id}?season=${season.number}&episode=${episodeId}${progress ? '&continue=true' : ''}`}
                                      className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition flex items-center"
                                    >
                                      <PlayIcon size={18} className="mr-2" />
                                      {progress ? 'Продолжить' : 'Смотреть'}
                                    </Link>
                                  ) : (
                                    <button
                                      disabled
                                      className="px-4 py-2 bg-gray-600 rounded cursor-not-allowed text-gray-400 flex items-center"
                                    >
                                      <PlayIcon size={18} className="mr-2 opacity-50" />
                                      Войдите для просмотра
                                    </button>
                                  )
                                ) : (
                                  <div className="px-4 py-2 bg-gray-600 rounded cursor-not-allowed text-gray-400 flex items-center">
                                    <PlayIcon size={18} className="mr-2 opacity-50" />
                                    Скоро
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="text-white text-center p-4">Сериал не найден</div>
      )}
    </div>
  );
}