import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FilmIcon,
  ArrowLeftIcon,
  SaveIcon,
  Trash2Icon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, get, update, remove } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

interface Movie {
  id: string;
  type: 'movie';
  title: string;
  image: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  director: string;
  cast: string[];
  videoSrc: string;
  duration: string;
}

export function MovieEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<Movie | null>(null);
  
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

  // Загрузка данных фильма
  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const movieRef = ref(db, `movies/${id}`);
        const snapshot = await get(movieRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setMovie(data);
        } else {
          toast.error('Фильм не найден');
          navigate('/admin');
        }
      } catch (error) {
        console.error('Ошибка загрузки фильма:', error);
        toast.error('Ошибка загрузки данных фильма');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovie();
  }, [id, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!movie) return;
    
    const { name, value } = e.target;
    setMovie({
      ...movie,
      [name]: value
    });
  };

  const handleCastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!movie) return;
    
    const castArray = e.target.value.split(',').map(item => item.trim());
    setMovie({
      ...movie,
      cast: castArray
    });
  };

  const handleSave = async () => {
    if (!movie || !isAdmin || !currentUser) {
      toast.error('Нет прав для сохранения изменений');
      return;
    }

    try {
      const movieRef = ref(db, `movies/${movie.id}`);
      
      // Обновляем timestamp
      await update(movieRef, {
        ...movie,
        updatedAt: Date.now()
      });
      
      toast.success('Фильм успешно обновлен!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка при сохранении данных');
    }
  };

  const handleDelete = async () => {
    if (!movie || !isAdmin || !currentUser) {
      toast.error('Нет прав для удаления фильма');
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить фильм "${movie.title}"? Это действие невозможно отменить.`)) {
      return;
    }

    try {
      // Удаляем фильм из базы данных
      const movieRef = ref(db, `movies/${movie.id}`);
      await remove(movieRef);
      
      toast.success('Фильм успешно удален!');
      navigate('/admin/movies-list');
    } catch (error) {
      console.error('Ошибка при удалении фильма:', error);
      toast.error('Ошибка при удалении фильма');
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

  if (!movie) {
    return <div className="text-white text-center p-4">Фильм не найден</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/admin/movies-list')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon size={20} />
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FilmIcon size={28} />
              Редактирование фильма: {movie.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-800 py-2 px-4 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2Icon size={18} />
              Удалить фильм
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="aspect-[2/3] mb-4 overflow-hidden rounded-lg">
                <img src={movie.image} alt={movie.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Путь к обложке</label>
                  <input
                    type="text"
                    name="image"
                    value={movie.image}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Путь к видео</label>
                  <input
                    type="text"
                    name="videoSrc"
                    value={movie.videoSrc}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">Название</label>
                <input
                  type="text"
                  name="title"
                  value={movie.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">Описание</label>
                <textarea
                  name="description"
                  value={movie.description}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded-lg p-2 h-32"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Год выпуска</label>
                  <input
                    type="text"
                    name="year"
                    value={movie.year}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Рейтинг</label>
                  <input
                    type="text"
                    name="rating"
                    value={movie.rating}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Жанр</label>
                  <input
                    type="text"
                    name="genre"
                    value={movie.genre}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-400">Длительность</label>
                  <input
                    type="text"
                    name="duration"
                    value={movie.duration}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">Режиссер</label>
                <input
                  type="text"
                  name="director"
                  value={movie.director}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">Актеры (через запятую)</label>
                <input
                  type="text"
                  name="cast"
                  value={movie.cast ? movie.cast.join(', ') : ''}
                  onChange={handleCastChange}
                  className="w-full bg-gray-700 rounded-lg p-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 