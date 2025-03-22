import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';

/**
 * Интерфейс для эпизода сериала
 */
interface Episode {
  id: number;
  title?: string;
  duration?: string;
  videoSrc?: string;
}

/**
 * Интерфейс для сезона сериала
 */
interface Season {
  number: number;
  episodes: Episode[];
}

/**
 * Интерфейс для сохранения прогресса просмотра фильмов
 */
interface MovieProgress {
  time: number;
  timestamp: number;
  duration?: number;
}

/**
 * Интерфейс для сохранения прогресса просмотра сериалов
 */
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

/**
 * Интерфейс для хранения информации о последнем просмотренном контенте
 */
interface LastWatched {
  type: 'tvShow' | 'movie';
  contentId: string | number;
  season?: number;
  episode?: number;
  time: number;
  timestamp: number;
}

/**
 * Сохраняет прогресс просмотра в Firebase
 * @param userId ID пользователя
 * @param contentId ID фильма или сериала
 * @param currentTime Текущее время просмотра в секундах
 * @param duration Общая продолжительность видео в секундах
 * @param isTV Флаг, указывающий тип контента (true - сериал, false - фильм)
 * @param seasonNumber Номер сезона (только для сериалов)
 * @param episodeNumber Номер эпизода (только для сериалов)
 */
export const saveVideoProgress = async (
  userId: string,
  contentId: string | number,
  currentTime: number,
  duration: number,
  isTV: boolean,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<void> => {
  if (!userId || !contentId) return;
  
  try {
    const updates: { [key: string]: any } = {};
    // Сохраняем точное время в секундах с десятичными знаками
    const exactTime = currentTime;
    const timestamp = Date.now();
    
    if (!isTV) {
      // Для фильмов
      updates[`users/${userId}/watchProgress/${contentId}`] = {
        time: exactTime,
        timestamp: timestamp,
        duration: Math.floor(duration)
      };
    } else {
      // Для сериалов
      if (!seasonNumber || !episodeNumber) {
        console.error('Ошибка: отсутствуют данные о сезоне или эпизоде');
        return;
      }
      
      updates[`users/${userId}/tvTimeStamps/${contentId}/seasons/${seasonNumber}/episodes/${episodeNumber}`] = {
        time: exactTime,
        timestamp: timestamp,
        duration: Math.floor(duration)
      };
    }
    
    // Сохраняем данные о последнем просмотре, используя contentId без преобразований
    updates[`users/${userId}/lastWatched`] = {
      type: isTV ? 'tvShow' : 'movie',
      contentId,
      season: seasonNumber,
      episode: episodeNumber,
      time: exactTime,
      timestamp: timestamp
    };
    
    // Отправляем обновления в Firebase
    await update(ref(db), updates);
    console.log('Прогресс успешно сохранен:', {
      contentId,
      type: isTV ? 'tvShow' : 'movie',
      season: seasonNumber,
      episode: episodeNumber,
      time: exactTime
    });
  } catch (error) {
    console.error('Ошибка сохранения прогресса:', error);
    throw error; // Пробрасываем ошибку для обработки в вызывающем коде
  }
};

/**
 * Получает сохраненный прогресс просмотра из Firebase
 * @param userId ID пользователя
 * @param contentId ID фильма или сериала
 * @param isTV Флаг, указывающий тип контента (true - сериал, false - фильм)
 * @param seasonNumber Номер сезона (только для сериалов)
 * @param episodeNumber Номер эпизода (только для сериалов)
 * @returns Объект с сохраненным прогрессом или null, если прогресс не найден
 */
export const getVideoProgress = async (
  userId: string,
  contentId: string | number,
  isTV: boolean,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<{ time: number; duration?: number } | null> => {
  if (!userId || !contentId) return null;
  
  try {
    let progressRef;
    
    if (!isTV) {
      // Для фильмов
      progressRef = ref(db, `users/${userId}/watchProgress/${contentId}`);
    } else {
      // Для сериалов
      if (!seasonNumber || !episodeNumber) {
        console.error('Ошибка: отсутствуют данные о сезоне или эпизоде');
        return null;
      }
      
      progressRef = ref(db, 
        `users/${userId}/tvTimeStamps/${contentId}/seasons/${seasonNumber}/episodes/${episodeNumber}`
      );
    }
    
    const snapshot = await get(progressRef);
    
    if (snapshot.exists()) {
      const progress = snapshot.val();
      
      if (progress.time && typeof progress.time === 'number') {
        return {
          time: progress.time,
          duration: progress.duration
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    return null;
  }
};

/**
 * Получает информацию о последнем просмотренном контенте для пользователя
 * @param userId ID пользователя
 * @returns Объект с информацией о последнем просмотренном контенте или null
 */
export const getLastWatched = async (userId: string): Promise<LastWatched | null> => {
  if (!userId) return null;
  
  try {
    const lastWatchedRef = ref(db, `users/${userId}/lastWatched`);
    const snapshot = await get(lastWatchedRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as LastWatched;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения последнего просмотра:', error);
    return null;
  }
};

/**
 * Форматирует время в секундах в формат мм:сс или чч:мм:сс
 * @param seconds Время в секундах
 * @returns Отформатированное время
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Находит следующий эпизод для просмотра после завершения текущего
 * @param contentId ID сериала
 * @param currentSeason Текущий сезон
 * @param currentEpisode Текущий эпизод
 * @returns Объект с информацией о следующем эпизоде или null, если следующего нет
 */
export const findNextEpisode = async (
  contentId: string | number,
  currentSeason: number,
  currentEpisode: number
): Promise<{ season: number; episode: number } | null> => {
  try {
    // Получаем информацию о сериале
    const showRef = ref(db, `tvShows/${contentId}`);
    const showSnapshot = await get(showRef);
    
    if (!showSnapshot.exists()) {
      console.error(`Сериал с ID ${contentId} не найден`);
      return null;
    }
    
    const show = showSnapshot.val();
    const seasons = show.seasons || [];
    
    if (!Array.isArray(seasons) || seasons.length === 0) {
      console.log(`Сериал ${show.title} не имеет сезонов`);
      return null;
    }
    
    console.log(`Поиск следующего эпизода после S${currentSeason}E${currentEpisode}`);
    
    // Находим текущий сезон
    const currentSeasonData = seasons.find(s => s.number === currentSeason);
    if (!currentSeasonData || !Array.isArray(currentSeasonData.episodes)) {
      console.log(`Сезон ${currentSeason} не найден или не имеет эпизодов`);
      return null;
    }
    
    console.log(`Найден сезон ${currentSeason} с ${currentSeasonData.episodes.length} эпизодами`);
    
    // Попробуем найти эпизод по ID или по индексу
    let currentEpisodeIndex = -1;
    
    // Сначала ищем по ID эпизода
    currentEpisodeIndex = currentSeasonData.episodes.findIndex((e: Episode) => 
      (e.id !== undefined && e.id === currentEpisode) ||
      // Учитываем что UI может отображать эпизод как номер по порядку (начиная с 1)
      (currentEpisode > 0 && currentEpisodeIndex === currentEpisode - 1)
    );
    
    // Если не нашли по ID, пробуем по индексу (эпизод = индекс + 1)
    if (currentEpisodeIndex === -1 && currentEpisode > 0 && currentEpisode <= currentSeasonData.episodes.length) {
      currentEpisodeIndex = currentEpisode - 1;
      console.log(`Эпизод найден по индексу: ${currentEpisodeIndex}`);
    }
    
    if (currentEpisodeIndex === -1) {
      console.log(`Эпизод ${currentEpisode} не найден в сезоне ${currentSeason}`);
      return null;
    }
    
    console.log(`Текущий эпизод: индекс ${currentEpisodeIndex}, всего эпизодов ${currentSeasonData.episodes.length}`);
    
    // Проверяем, есть ли следующий эпизод в текущем сезоне
    if (currentEpisodeIndex < currentSeasonData.episodes.length - 1) {
      const nextEpisode = currentSeasonData.episodes[currentEpisodeIndex + 1];
      const nextEpisodeId = nextEpisode.id || (currentEpisodeIndex + 2); // +2 т.к. индексация с 0, а эпизоды с 1
      
      console.log(`Найден следующий эпизод в текущем сезоне: S${currentSeason}E${nextEpisodeId}`);
      
      return {
        season: currentSeason,
        episode: nextEpisodeId
      };
    }
    
    console.log(`Эпизод ${currentEpisode} является последним в сезоне ${currentSeason}, ищем следующий сезон`);
    
    // Если это последний эпизод сезона, ищем следующий сезон
    const currentSeasonIndex = seasons.findIndex(s => s.number === currentSeason);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1) {
      const nextSeason = seasons[currentSeasonIndex + 1];
      if (nextSeason.episodes && nextSeason.episodes.length > 0) {
        const firstEpisode = nextSeason.episodes[0];
        const firstEpisodeId = firstEpisode.id || 1;
        
        console.log(`Найден первый эпизод следующего сезона: S${nextSeason.number}E${firstEpisodeId}`);
        
        return {
          season: nextSeason.number,
          episode: firstEpisodeId
        };
      }
    }
    
    console.log('Следующий эпизод не найден. Это последний эпизод последнего сезона.');
    return null;
  } catch (error) {
    console.error('Ошибка при поиске следующего эпизода:', error);
    return null;
  }
}; 