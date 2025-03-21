import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TvIcon,
  ArrowLeftIcon,
  EditIcon,
  SearchIcon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

interface TVShow {
  id: string;
  title: string;
  image: string;
  year: string;
  seasons: any[];
}

export function SeriesListPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tvShows, setTvShows] = useState<TVShow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Загрузка списка сериалов
  useEffect(() => {
    const fetchTVShows = async () => {
      try {
        setLoading(true);
        const tvShowsRef = ref(db, 'tvShows');
        const snapshot = await get(tvShowsRef);
        
        if (snapshot.exists()) {
          const tvShowsData = snapshot.val();
          const tvShowsList = Object.keys(tvShowsData).map(key => ({
            id: key,
            ...tvShowsData[key]
          }));
          
          setTvShows(tvShowsList);
        } else {
          setTvShows([]);
        }
      } catch (error) {
        console.error('Ошибка загрузки сериалов:', error);
        toast.error('Ошибка при загрузке списка сериалов');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTVShows();
  }, []);

  const filteredTVShows = tvShows.filter(show => 
    show.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center gap-2 mb-8">
          <button 
            onClick={() => navigate('/admin')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TvIcon size={28} />
            Список сериалов для редактирования
          </h1>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full bg-gray-800 border-gray-700 rounded-lg py-2 pl-10 pr-3"
            placeholder="Поиск сериалов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredTVShows.length === 0 ? (
          <div className="text-center p-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">Сериалы не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTVShows.map(show => (
              <div key={show.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <div className="relative pb-[150%]">
                  <img 
                    src={show.image} 
                    alt={show.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg truncate">{show.title}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center text-sm text-gray-400">
                      <span>{show.year}</span>
                      <span className="mx-2">•</span>
                      <span>{show.seasons.length} сезон(ов)</span>
                    </div>
                    <Link 
                      to={`/admin/edit-series/${show.id}`} 
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                    >
                      <EditIcon size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 