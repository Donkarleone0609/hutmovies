import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FilmIcon,
  TvIcon,
  PlusIcon,
  XIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  SaveIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, get, update, remove } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

interface Episode {
  title: string;
  duration: string;
  videoSrc: string;
}

interface Season {
  number: number;
  episodes: Episode[];
}

interface TVShow {
  id: string;
  type: 'tv';
  title: string;
  image: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  director: string;
  cast: string[];
  seasons: Season[];
}

export function ContentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openedSeasons, setOpenedSeasons] = useState<number[]>([]);
  const [tvShow, setTvShow] = useState<TVShow | null>(null);
  
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

  // Загрузка данных сериала
  useEffect(() => {
    const fetchTVShow = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const tvShowRef = ref(db, `tvShows/${id}`);
        const snapshot = await get(tvShowRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setTvShow(data);
          
          // Если есть сезоны, открываем последний по умолчанию
          if (data.seasons && data.seasons.length > 0) {
            setOpenedSeasons([data.seasons[data.seasons.length - 1].number]);
          }
        } else {
          toast.error('Сериал не найден');
          navigate('/admin');
        }
      } catch (error) {
        console.error('Ошибка загрузки сериала:', error);
        toast.error('Ошибка загрузки данных сериала');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTVShow();
  }, [id, navigate]);

  const toggleSeason = (seasonNumber: number) => {
    setOpenedSeasons(prev => 
      prev.includes(seasonNumber)
        ? prev.filter(n => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
  };

  const handleAddSeason = () => {
    if (!tvShow) return;
    
    const newSeasonNumber = tvShow.seasons.length > 0 
      ? Math.max(...tvShow.seasons.map(s => s.number)) + 1 
      : 1;
    
    const newSeason: Season = {
      number: newSeasonNumber,
      episodes: []
    };
    
    setTvShow({
      ...tvShow,
      seasons: [...tvShow.seasons, newSeason]
    });
    
    // Открываем новый сезон автоматически
    setOpenedSeasons(prev => [...prev, newSeasonNumber]);
  };

  const handleAddEpisode = (seasonIndex: number) => {
    if (!tvShow) return;
    
    const updatedSeasons = [...tvShow.seasons];
    updatedSeasons[seasonIndex] = {
      ...updatedSeasons[seasonIndex],
      episodes: [
        ...updatedSeasons[seasonIndex].episodes,
        {
          title: '',
          duration: '',
          videoSrc: ''
        }
      ]
    };
    
    setTvShow({
      ...tvShow,
      seasons: updatedSeasons
    });
  };

  const handleDeleteSeason = (seasonIndex: number) => {
    if (!tvShow) return;
    
    if (window.confirm('Вы уверены, что хотите удалить этот сезон?')) {
      const updatedSeasons = tvShow.seasons.filter((_, i) => i !== seasonIndex);
      setTvShow({
        ...tvShow,
        seasons: updatedSeasons
      });
      
      // Закрываем удаленный сезон
      const seasonNumber = tvShow.seasons[seasonIndex].number;
      setOpenedSeasons(prev => prev.filter(n => n !== seasonNumber));
    }
  };

  const handleDeleteEpisode = (seasonIndex: number, episodeIndex: number) => {
    if (!tvShow) return;
    
    const updatedSeasons = [...tvShow.seasons];
    updatedSeasons[seasonIndex] = {
      ...updatedSeasons[seasonIndex],
      episodes: updatedSeasons[seasonIndex].episodes.filter((_, i) => i !== episodeIndex)
    };
    
    setTvShow({
      ...tvShow,
      seasons: updatedSeasons
    });
  };

  const handleEpisodeChange = (
    seasonIndex: number, 
    episodeIndex: number, 
    field: keyof Episode, 
    value: string
  ) => {
    if (!tvShow) return;
    
    const updatedSeasons = [...tvShow.seasons];
    updatedSeasons[seasonIndex] = {
      ...updatedSeasons[seasonIndex],
      episodes: updatedSeasons[seasonIndex].episodes.map((episode, i) => 
        i === episodeIndex ? { ...episode, [field]: value } : episode
      )
    };
    
    setTvShow({
      ...tvShow,
      seasons: updatedSeasons
    });
  };

  const handleSave = async () => {
    if (!tvShow || !isAdmin || !currentUser) {
      toast.error('Нет прав для сохранения изменений');
      return;
    }

    try {
      const tvShowRef = ref(db, `tvShows/${tvShow.id}`);
      
      // Обновляем timestamp
      await update(tvShowRef, {
        ...tvShow,
        updatedAt: Date.now()
      });
      
      toast.success('Сериал успешно обновлен!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка при сохранении данных');
    }
  };

  const handleDelete = async () => {
    if (!tvShow || !isAdmin || !currentUser) {
      toast.error('Нет прав для удаления сериала');
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить сериал "${tvShow.title}"? Это действие невозможно отменить.`)) {
      return;
    }

    try {
      // Удаляем сериал из базы данных
      const tvShowRef = ref(db, `tvShows/${tvShow.id}`);
      await remove(tvShowRef);
      
      toast.success('Сериал успешно удален!');
      navigate('/admin/series-list');
    } catch (error) {
      console.error('Ошибка при удалении сериала:', error);
      toast.error('Ошибка при удалении сериала');
    }
  };

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

  if (!tvShow) {
    return <div className="text-white text-center p-4">Сериал не найден</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/admin/series-list')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon size={20} />
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TvIcon size={28} />
              Редактирование сериала: {tvShow.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-800 py-2 px-4 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2Icon size={18} />
              Удалить сериал
            </button>
            <button
              onClick={handleSave}
              className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <SaveIcon size={18} />
              Сохранить изменения
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Сезоны и эпизоды</h2>
            
            {tvShow.seasons.map((season, seasonIndex) => (
              <div key={seasonIndex} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Сезон {season.number}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSeason(season.number)}
                      className="text-gray-400 hover:text-white"
                    >
                      {openedSeasons.includes(season.number) ? (
                        <ChevronUpIcon size={20} />
                      ) : (
                        <ChevronDownIcon size={20} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSeason(seasonIndex)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </div>
                </div>

                {openedSeasons.includes(season.number) && (
                  <div className="space-y-4">
                    {season.episodes.map((episode, episodeIndex) => (
                      <div key={episodeIndex} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Эпизод {episodeIndex + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEpisode(seasonIndex, episodeIndex)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Название эпизода"
                            value={episode.title}
                            onChange={(e) => handleEpisodeChange(seasonIndex, episodeIndex, 'title', e.target.value)}
                            className="w-full bg-gray-600 rounded-lg p-2"
                          />
                          <input
                            type="text"
                            placeholder="Длительность"
                            value={episode.duration}
                            onChange={(e) => handleEpisodeChange(seasonIndex, episodeIndex, 'duration', e.target.value)}
                            className="w-full bg-gray-600 rounded-lg p-2"
                          />
                          <input
                            type="text"
                            placeholder="Путь к видео (например: tv-shows/series1/s1e1.mp4)"
                            value={episode.videoSrc}
                            onChange={(e) => handleEpisodeChange(seasonIndex, episodeIndex, 'videoSrc', e.target.value)}
                            className="w-full bg-gray-600 rounded-lg p-2"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddEpisode(seasonIndex)}
                      className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-2 flex items-center justify-center gap-2"
                    >
                      <PlusIcon size={16} />
                      Добавить эпизод
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSeason}
              className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 flex items-center justify-center gap-2"
            >
              <PlusIcon size={20} />
              Добавить сезон
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 