import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Loader,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  ArrowLeft
} from 'lucide-react';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';

// Динамический импорт видео
const getLocalVideo = async (path: string) => {
  try {
    // Для упрощения тестирования будем все пути обрабатывать через наш локальный файл
    // В продакшне здесь будет более комплексная логика маппинга путей
    // к реальным файлам на сервере или CDN
    console.log('Пытаюсь загрузить видео по пути:', path);
    
    // Проверка различных путей к видео
    if (path === 'src/movies/1.mp4' || path.includes('1.mp4')) {
      console.log('Обнаружено совпадение с тестовым видео');
      const video = await import('../movies/1.mp4');
      return video.default;
    }
    
    // Проверка на наличие паттерна для TV шоу
    if (path.startsWith('tv-shows/') || path.includes('/episodes/')) {
      console.log('Обнаружен путь сериала, используем тестовое видео');
      const video = await import('../movies/1.mp4'); // Используем то же видео для тестирования
      return video.default;
    }
    
    // Проверка относительных путей в формате "../movies/..."
    if (path.includes('../movies/') || path.includes('/movies/')) {
      console.log('Обнаружен относительный путь к видео');
      try {
        const video = await import('../movies/1.mp4'); // Для тестирования всегда возвращаем 1.mp4
        return video.default;
      } catch (e) {
        console.error('Не удалось импортировать видео по относительному пути', e);
      }
    }
    
    // Если путь не распознан, возвращаем null
    console.log('Локальное видео не найдено, будет использован внешний источник');
    return null;
  } catch (error) {
    console.error('Ошибка загрузки видео:', error);
    return null;
  }
};

interface Movie {
  id: number;
  videoSrc: string;
  [key: string]: any;
}

interface TVShow {
  id: number;
  videoSrc: string;
  [key: string]: any;
}

function VolumeSlider({ volume, onVolumeChange, isMuted, onMuteToggle }: {
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange(x);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  return (
    <div
      className="group flex items-center relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
        onClick={onMuteToggle}
      >
        {getVolumeIcon()}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isHovered ? 'w-24 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div
          ref={sliderRef}
          className="w-24 px-4 py-2"
          onMouseDown={(e) => {
            setIsDragging(true);
            const rect = sliderRef.current!.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onVolumeChange(x);
          }}
        >
          <div className="relative h-1 bg-white/20 rounded-full cursor-pointer">
            <div
              className="absolute h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-lg"
              style={{
                left: `${isMuted ? 0 : volume * 100}%`,
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ currentTime, duration, onSeek }: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [localTime, setLocalTime] = useState(currentTime);

  useEffect(() => {
    if (!isDragging) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isDragging]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(position);
    
    if (isDragging) {
      const newTime = position * duration;
      setLocalTime(newTime);
      onSeek(newTime);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    setIsDragging(true);
    const rect = progressRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = position * duration;
    setLocalTime(newTime);
    onSeek(newTime);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const progressWidth = Math.min(((isDragging ? localTime : currentTime) / duration) * 100, 100);

  return (
    <div className="group relative" onMouseLeave={() => setHoverPosition(null)}>
      <div
        ref={progressRef}
        className="h-1 group-hover:h-1.5 bg-white/20 rounded-full cursor-pointer transition-all"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute h-full bg-red-600 rounded-full transition-all"
          style={{ width: `${progressWidth}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-red-600 rounded-full shadow-lg transition-transform duration-150"
          style={{
            left: `${progressWidth}%`,
            transform: `translateX(-50%) scale(${isDragging || hoverPosition !== null ? 1 : 0.8})`,
          }}
        />
      </div>
      {hoverPosition !== null && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs"
          style={{ left: `${hoverPosition * 100}%` }}
        >
          {formatTime(hoverPosition * duration)}
        </div>
      )}
    </div>
  );
}

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const continueWatching = searchParams.get('continue') === 'true';

  // Функция форматирования времени
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Определяем тип контента на основе URL и параметров
  const isTV = location.pathname.startsWith('/tvShow/') || 
               (location.pathname.startsWith('/player/') && searchParams.has('season') && searchParams.has('episode')) ||
               (location.pathname.startsWith('/watch/') && searchParams.has('season') && searchParams.has('episode'));

  // Следим за изменениями полноэкранного режима
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        if (!id) {
          console.log('ID не найден');
          loadingTimeoutRef.current = setTimeout(() => {
            navigate('/not-found');
          }, 5000);
          return;
        }

        // Выбираем путь в зависимости от типа контента
        const contentRef = ref(db, isTV ? `tvShows/${id}` : `movies/${id}`);
        console.log('Загрузка контента из:', isTV ? 'tvShows' : 'movies', 'с ID:', id);
        console.log('URL путь:', location.pathname);
        console.log('Параметры:', { season, episode });
        
        const snapshot = await get(contentRef);
        
        if (snapshot.exists()) {
          const contentData = snapshot.val();
          console.log('Данные контента:', contentData);
          
          if (isTV && season && episode) {
            // Проверяем наличие сезонов в данных
            if (!contentData.seasons || !Array.isArray(contentData.seasons) || contentData.seasons.length === 0) {
              console.log('В данных не найдены сезоны:', contentData);
              loadingTimeoutRef.current = setTimeout(() => {
                navigate('/not-found');
              }, 5000);
              return;
            }
          
            // Для сериалов ищем нужный эпизод
            const seasonObj = contentData.seasons.find((s: any) => 
              s.number.toString() === season || s.number === parseInt(season)
            );
            if (seasonObj) {
              // Сначала ищем по ID
              let episodeObj = seasonObj.episodes.find((e: any) => 
                e.id?.toString() === episode || e.id === parseInt(episode)
              );
              
              // Если не нашли по ID, пробуем использовать индекс массива (эпизод №...)
              if (!episodeObj && !isNaN(parseInt(episode)) && parseInt(episode) > 0) {
                const index = parseInt(episode) - 1;
                if (index >= 0 && index < seasonObj.episodes.length) {
                  episodeObj = seasonObj.episodes[index];
                  console.log('Найден эпизод по индексу:', index, episodeObj);
                }
              }
              
              if (episodeObj && episodeObj.videoSrc) {
                console.log('Найден эпизод с видео:', episodeObj);
                const localVideo = await getLocalVideo(episodeObj.videoSrc);
                
                if (localVideo) {
                  console.log('Использую локальное видео для эпизода');
                  setVideoSource(localVideo);
                  setIsLoading(false);
                } else {
                  console.log('Использую внешний источник видео для эпизода');
                  setVideoSource(episodeObj.videoSrc);
                  setIsLoading(false);
                }
                return;
              }
            }
            console.log('Эпизод не найден:', {
              searchParams: { season, episode },
              seasons: contentData.seasons?.map((s: { number: number, episodes?: any[] }) => ({
                number: s.number,
                episodeCount: s.episodes?.length || 0
              })),
              seasonFound: seasonObj ? {
                number: seasonObj.number,
                episodes: seasonObj.episodes?.map((e: { id: number, title: string }) => ({ id: e.id, title: e.title })) || []
              } : null
            });
          } else if (contentData.videoSrc) {
            // Для фильмов используем поле videoSrc
            console.log('Путь к видео:', contentData.videoSrc);
            const localVideo = await getLocalVideo(contentData.videoSrc);
            
            if (localVideo) {
              console.log('Использую локальное видео');
              setVideoSource(localVideo);
              setIsLoading(false);
            } else {
              console.log('Использую внешний источник видео');
              setVideoSource(contentData.videoSrc);
              setIsLoading(false);
            }
            return;
          }
        }

        console.log('Видео не найдено');
        loadingTimeoutRef.current = setTimeout(() => {
          navigate('/not-found');
        }, 5000);
      } catch (error) {
        console.error('Ошибка загрузки контента:', error);
        loadingTimeoutRef.current = setTimeout(() => {
          navigate('/not-found');
        }, 5000);
      }
    };

    loadContent();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [id, navigate, isTV, location.pathname, season, episode]);

  const getRoundedTime = (time: number) => Math.floor(time / 60) * 60;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser || !videoRef.current || !videoSource) return;

      try {
        if (continueWatching) {
          let progressRef;
          let savedProgress = null;
          
          if (!isTV) {
            // Для фильмов
            progressRef = ref(db, `users/${currentUser.uid}/watchProgress/${id}`);
          } else {
            // Для сериалов
            if (!season || !episode) {
              console.error('Ошибка: отсутствуют данные о сезоне или эпизоде');
              return;
            }
            
            const episodeId = parseInt(episode);
            const seasonId = parseInt(season);
            
            progressRef = ref(db, 
              `users/${currentUser.uid}/tvTimeStamps/${id}/seasons/${seasonId}/episodes/${episodeId}`
            );
          }

          const snapshot = await get(progressRef);
          
          if (snapshot.exists()) {
            savedProgress = snapshot.val();
            console.log('Загружен сохраненный прогресс:', savedProgress);
            
            // Проверяем, что прогресс существует и содержит корректное значение времени
            if (savedProgress.time && typeof savedProgress.time === 'number' && savedProgress.time > 0) {
              // Если сохраненное время близко к концу видео, начинаем с начала
              if (duration > 0 && savedProgress.time >= duration - 10) {
                videoRef.current.currentTime = 0;
                console.log('Время просмотра близко к концу, начинаем с начала');
              } else {
                videoRef.current.currentTime = savedProgress.time;
                console.log('Восстановлена позиция:', savedProgress.time);
              }
            }
          } else {
            console.log('Сохраненный прогресс не найден, начинаем с начала');
          }
        } else {
          console.log('Параметр continue не установлен, начинаем с начала');
        }
        
        // Запускаем воспроизведение
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Ошибка автовоспроизведения:', error);
              // Многие браузеры блокируют автовоспроизведение без взаимодействия с пользователем
              setIsPlaying(false);
            });
          }
        } catch (error) {
          console.error('Ошибка автовоспроизведения:', error);
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
      }
    };

    // Загружаем прогресс после загрузки метаданных видео
    if (videoRef.current && videoSource) {
      const handleMetadataLoaded = () => {
        loadProgress();
        setInitialized(true);
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleMetadataLoaded);
        }
      };
    }
  }, [currentUser, id, videoSource, season, episode, isTV, continueWatching, duration]);

  // Функция сохранения прогресса
  const saveProgress = async () => {
    if (!currentUser || !videoRef.current || !videoSource) return;
    
    try {
      const updates: { [key: string]: any } = {};
      const roundedTime = Math.floor(videoRef.current.currentTime);
      const timestamp = Date.now();
      
      if (!isTV) {
        // Для фильмов
        updates[`users/${currentUser.uid}/watchProgress/${id}`] = {
          time: roundedTime,
          timestamp: timestamp,
          duration: Math.floor(duration)
        };
      } else {
        // Для сериалов - проверяем наличие данных сезона и эпизода
        if (!season || !episode) {
          console.error('Ошибка: отсутствуют данные о сезоне или эпизоде');
          return;
        }
        
        // Создаем структуру для сохранения времени эпизода
        const episodeId = parseInt(episode);
        const seasonId = parseInt(season);
        
        updates[`users/${currentUser.uid}/tvTimeStamps/${id}/seasons/${seasonId}/episodes/${episodeId}`] = {
          time: roundedTime,
          timestamp: timestamp,
          duration: Math.floor(duration)
        };
      }
      
      // Обновляем данные о последнем просмотренном контенте
      updates[`users/${currentUser.uid}/lastWatched`] = {
        type: isTV ? 'tvShow' : 'movie',
        contentId: parseInt(id || '0'),
        season: season ? parseInt(season) : undefined,
        episode: episode ? parseInt(episode) : undefined,
        time: roundedTime,
        timestamp: timestamp
      };
      
      // Отправляем обновления в Firebase
      await update(ref(db), updates);
      console.log('Прогресс успешно сохранен в Firebase:', {
        contentId: id,
        type: isTV ? 'tvShow' : 'movie',
        season,
        episode,
        time: roundedTime
      });
    } catch (error) {
      console.error('Ошибка сохранения прогресса в Firebase:', error);
    }
  };

  // Периодическое сохранение прогресса
  useEffect(() => {
    const startProgressSaving = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      progressIntervalRef.current = setInterval(() => {
        if (!currentUser || !videoRef.current || !videoSource || !isPlaying) return;
        saveProgress();
      }, 30000); // Каждые 30 секунд
    };
    
    const stopProgressSaving = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    
    if (isPlaying) {
      startProgressSaving();
    } else {
      stopProgressSaving();
    }
    
    return () => {
      stopProgressSaving();
    };
  }, [isPlaying, currentUser, id, videoSource, season, episode, isTV, duration]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser, id, videoSource, season, episode, isTV]);

  // Сохранение прогресса при выходе из компонента
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [currentUser, id, videoSource, season, episode, isTV]);

  // Сохранение прогресса при событиях плеера
  useEffect(() => {
    if (!videoRef.current) return;
    
    const handlePause = () => {
      saveProgress();
    };
    
    const handleEnded = () => {
      saveProgress();
    };
    
    videoRef.current.addEventListener('pause', handlePause);
    videoRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('pause', handlePause);
        videoRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [videoRef.current, currentUser, id, videoSource, season, episode, isTV]);

  // Восстанавливаем настройки громкости из localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem('player_volume');
    const savedMuted = localStorage.getItem('player_muted');
    
    if (savedVolume !== null) {
      const parsedVolume = parseFloat(savedVolume);
      setVolume(parsedVolume);
      if (videoRef.current) {
        videoRef.current.volume = parsedVolume;
      }
    }
    
    if (savedMuted === 'true') {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  }, []);
  
  // Сохраняем настройки громкости в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('player_volume', volume.toString());
    localStorage.setItem('player_muted', isMuted.toString());
    
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  return (
    <div className="flex flex-col h-screen bg-black" ref={containerRef}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader size={48} className="text-red-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              src={videoSource || undefined}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play().catch(err => console.error('Ошибка воспроизведения:', err));
                  }
                }
              }}
            />

            {/* Кнопка возврата */}
            <button 
              onClick={() => navigate(-1)} 
              className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 rounded-full z-20 transition-all"
            >
              <ArrowLeft size={24} />
            </button>

            {/* Оверлей управления */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 hover:opacity-100 transition-opacity z-10 flex flex-col"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play();
                  }
                }
              }}
            >
              {/* Нижняя панель управления */}
              <div 
                className="mt-auto p-4 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <ProgressBar 
                  currentTime={currentTime} 
                  duration={duration} 
                  onSeek={(time) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                    }
                  }}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <button
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      onClick={() => {
                        if (videoRef.current) {
                          if (isPlaying) {
                            videoRef.current.pause();
                          } else {
                            videoRef.current.play();
                          }
                        }
                      }}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    
                    <VolumeSlider 
                      volume={volume}
                      onVolumeChange={(value) => {
                        setVolume(value);
                        if (videoRef.current) {
                          videoRef.current.volume = value;
                          if (value > 0 && isMuted) {
                            videoRef.current.muted = false;
                            setIsMuted(false);
                          }
                        }
                      }}
                      isMuted={isMuted}
                      onMuteToggle={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                    />
                    
                    <div className="ml-4 text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                  
                  <button
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => {
                      if (isFullscreen) {
                        document.exitFullscreen().catch(err => console.error(err));
                      } else if (containerRef.current) {
                        containerRef.current.requestFullscreen().catch(err => console.error(err));
                      }
                    }}
                  >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}