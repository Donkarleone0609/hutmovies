import React, { useState, useMemo, useEffect } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase';

type SearchResult = {
  id: string;
  title: string;
  type: 'movie' | 'tvShow';
  image: string;
};

interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'tvShow';
  image: string;
  description: string;
  cast?: string[];
}

export function SearchPanel({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allContent, setAllContent] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const moviesRef = ref(db, 'movies');
    const tvShowsRef = ref(db, 'tvShows');

    const fetchData = () => {
      try {
        // Загрузка фильмов
        onValue(moviesRef, (snapshot) => {
          const moviesData = snapshot.val() || {};
          const moviesArray = Object.entries(moviesData).map(([id, item]) => ({
            ...(item as Omit<MediaItem, 'id'>),
            id,
            type: 'movie' as const
          }));

          // Загрузка сериалов
          onValue(tvShowsRef, (tvSnapshot) => {
            const tvData = tvSnapshot.val() || {};
            const tvArray = Object.entries(tvData).map(([id, item]) => ({
              ...(item as Omit<MediaItem, 'id'>),
              id,
              type: 'tvShow' as const
            }));
            
            setAllContent([...moviesArray, ...tvArray]);
            setLoading(false);
          });
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      setAllContent([]);
    };
  }, [isOpen]);

  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const lowerTerm = searchTerm.toLowerCase();
    return allContent.filter(item => {
      const inTitle = item.title?.toLowerCase().includes(lowerTerm) || false;
      const inDescription = item.description?.toLowerCase().includes(lowerTerm) || false;
      const inCast = item.cast?.some(a => a.toLowerCase().includes(lowerTerm)) || false;
      return inTitle || inDescription || inCast;
    });
  }, [searchTerm, allContent]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigate(`/${result.type}/${result.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="relative flex-1 max-w-2xl mx-auto">
            <SearchIcon className="absolute left-4 top-3 text-gray-400" size={20} />
            <input
              type="text"
              className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Поиск фильмов и сериалов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-white transition"
          >
            <XIcon size={24} />
          </button>
        </div>
        
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              Загрузка данных...
            </div>
          ) : results.length > 0 ? (
            results.map(result => (
              <div
                key={`${result.type}-${result.id}`}
                className="flex items-center p-4 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors mb-2"
                onClick={() => handleSelect(result)}
              >
                <img
                  src={result.image}
                  alt={result.title}
                  className="w-16 h-24 object-cover rounded-lg mr-4"
                />
                <div>
                  <h3 className="font-medium text-lg">{result.title}</h3>
                  <p className="text-gray-400 text-sm">
                    {result.type === 'movie' ? 'Фильм' : 'Сериал'}
                  </p>
                </div>
              </div>
            ))
          ) : searchTerm ? (
            <div className="text-center py-8 text-gray-400">
              Ничего не найдено по запросу "{searchTerm}"
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}