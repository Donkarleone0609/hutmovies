import React, { useState, useEffect } from 'react';
import { HeroSection } from '../components/HeroSection';
import { ContentRow } from '../components/ContentRow';
import { PricingSection } from '../components/PricingSection';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';

// Типы для фильмов и сериалов
type ContentItem = {
  id: number;
  title: string;
  image: string;
  type: 'movie' | 'tv' | 'tvShow';
};

export function HomePage() {
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [tvShows, setTvShows] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        
        // Получаем фильмы из Firebase
        const moviesRef = ref(db, 'movies');
        const moviesSnapshot = await get(moviesRef);
        
        const moviesData: ContentItem[] = [];
        if (moviesSnapshot.exists()) {
          // Конвертируем данные из Firebase в нужный формат
          moviesSnapshot.forEach((childSnapshot) => {
            const movie = childSnapshot.val();
            moviesData.push({
              id: movie.id,
              title: movie.title,
              image: movie.image,
              type: 'movie'
            });
          });
        }
        setMovies(moviesData);
        
        // Получаем сериалы из Firebase
        const tvShowsRef = ref(db, 'tvShows');
        const tvShowsSnapshot = await get(tvShowsRef);
        
        const tvShowsData: ContentItem[] = [];
        if (tvShowsSnapshot.exists()) {
          tvShowsSnapshot.forEach((childSnapshot) => {
            const tvShow = childSnapshot.val();
            tvShowsData.push({
              id: tvShow.id,
              title: tvShow.title,
              image: tvShow.image,
              type: 'tvShow'
            });
          });
        }
        setTvShows(tvShowsData);
        
      } catch (error) {
        console.error('Ошибка при загрузке контента:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, []);

  return (
    <main>
      <HeroSection />
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="loader">Загрузка контента...</div>
          </div>
        ) : (
          <>
            <ContentRow 
              title="Популярные фильмы" 
              items={movies}
            />
            <ContentRow 
              title="Сериалы" 
              items={tvShows}
            />
          </>
        )}
      </div>
      <PricingSection />
    </main>
  );
}