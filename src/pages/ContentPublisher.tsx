import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FilmIcon,
  TvIcon,
  PlusIcon,
  XIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, push, update, get } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

interface MediaFormData {
  type: 'movie' | 'tv';
  title: string;
  image: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  director: string;
  cast: string[];
  videoSrc: string;
  seasons: {
    number: number;
    episodes: {
      title: string;
      duration: string;
      videoSrc: string;
    }[];
  }[];
}

export function MediaUploadPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openedSeasons, setOpenedSeasons] = useState<number[]>([]);
  
  const [formData, setFormData] = useState<MediaFormData>({
    type: 'movie',
    title: '',
    image: '',
    description: '',
    rating: '',
    year: '',
    genre: '',
    director: '',
    cast: [],
    videoSrc: '',
    seasons: []
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setIsAdmin(userData.admin === true);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          toast.error('Ошибка проверки прав доступа');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin || !currentUser) {
      toast.error('Доступ запрещен');
      return;
    }

    try {
      if (!formData.image) {
        toast.error('Укажите путь к обложке');
        return;
      }

      if (formData.type === 'movie' && !formData.videoSrc) {
        toast.error('Укажите путь к видео файлу');
        return;
      }

      if (formData.type === 'tv') {
        if (formData.seasons.length === 0) {
          toast.error('Добавьте хотя бы один сезон');
          return;
        }

        for (const season of formData.seasons) {
          if (season.episodes.length === 0) {
            toast.error('Каждый сезон должен содержать эпизоды');
            return;
          }
        }
      }

      const mediaData = {
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const mediaRef = ref(db, formData.type === 'movie' ? 'movies' : 'tvShows');
      const newMediaRef = push(mediaRef);
      
      await update(newMediaRef, {
        ...mediaData,
        id: newMediaRef.key
      });

      toast.success('Медиа успешно добавлено!');
      navigate('/admin');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка при добавлении медиа');
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setOpenedSeasons(prev => 
      prev.includes(seasonNumber)
        ? prev.filter(n => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <PlusIcon size={28} />
          Добавить новый контент
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Тип контента <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'movie' }))}
                  className={`flex-1 p-4 rounded-lg flex flex-col items-center justify-center ${
                    formData.type === 'movie' 
                      ? 'bg-red-600' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <FilmIcon size={24} />
                  <span className="mt-2">Фильм</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'tv' }))}
                  className={`flex-1 p-4 rounded-lg flex flex-col items-center justify-center ${
                    formData.type === 'tv' 
                      ? 'bg-red-600' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <TvIcon size={24} />
                  <span className="mt-2">Сериал</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Путь к обложке <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded-lg p-3"
                required
                placeholder="images/covers/movie1.jpg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Название <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Описание <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-gray-800 rounded-lg p-3 h-32"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Год выпуска <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-lg p-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Жанр <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-lg p-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Режиссер <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="director"
                  value={formData.director}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-lg p-3"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Актерский состав (через запятую)
              </label>
              <input
                type="text"
                name="cast"
                value={formData.cast.join(', ')}
                onChange={(e) => 
                  setFormData(prev => ({
                    ...prev,
                    cast: e.target.value.split(',').map(s => s.trim())
                  }))
                }
                className="w-full bg-gray-800 rounded-lg p-3"
                placeholder="Актер 1, Актер 2, Актер 3"
              />
            </div>

            {formData.type === 'movie' ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Путь к видео <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="videoSrc"
                  value={formData.videoSrc}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 rounded-lg p-3"
                  placeholder="movies/1.mp4"
                  required
                />
              </div>
            ) : (
              <div className="space-y-4">
                {formData.seasons.map((season, seasonIndex) => (
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
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            seasons: prev.seasons.filter((_, i) => i !== seasonIndex)
                          }))}
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
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  seasons: prev.seasons.map((s, i) => 
                                    i === seasonIndex ? {
                                      ...s,
                                      episodes: s.episodes.filter((_, j) => j !== episodeIndex)
                                    } : s
                                  )
                                }))}
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
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  seasons: prev.seasons.map((s, i) => 
                                    i === seasonIndex ? {
                                      ...s,
                                      episodes: s.episodes.map((ep, j) => 
                                        j === episodeIndex ? { ...ep, title: e.target.value } : ep
                                      )
                                    } : s
                                  )
                                }))}
                                className="w-full bg-gray-600 rounded-lg p-2"
                              />
                              <input
                                type="text"
                                placeholder="Длительность"
                                value={episode.duration}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  seasons: prev.seasons.map((s, i) => 
                                    i === seasonIndex ? {
                                      ...s,
                                      episodes: s.episodes.map((ep, j) => 
                                        j === episodeIndex ? { ...ep, duration: e.target.value } : ep
                                      )
                                    } : s
                                  )
                                }))}
                                className="w-full bg-gray-600 rounded-lg p-2"
                              />
                              <input
                                type="text"
                                placeholder="Путь к видео (например: tv-shows/series1/s1e1.mp4)"
                                value={episode.videoSrc}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  seasons: prev.seasons.map((s, i) => 
                                    i === seasonIndex ? {
                                      ...s,
                                      episodes: s.episodes.map((ep, j) => 
                                        j === episodeIndex ? { ...ep, videoSrc: e.target.value } : ep
                                      )
                                    } : s
                                  )
                                }))}
                                className="w-full bg-gray-600 rounded-lg p-2"
                              />
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            seasons: prev.seasons.map((s, i) => 
                              i === seasonIndex ? {
                                ...s,
                                episodes: [...s.episodes, { 
                                  title: '', 
                                  duration: '', 
                                  videoSrc: '' 
                                }]
                              } : s
                            )
                          }))}
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
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    seasons: [...prev.seasons, {
                      number: prev.seasons.length + 1,
                      episodes: []
                    }]
                  }))}
                  className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 flex items-center justify-center gap-2"
                >
                  <PlusIcon size={20} />
                  Добавить сезон
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-medium transition-colors"
            >
              Опубликовать контент
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}