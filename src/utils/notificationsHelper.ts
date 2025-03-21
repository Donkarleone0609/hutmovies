import { db } from '../firebase';
import { ref, get, push, query, orderByChild, equalTo, set, update } from 'firebase/database';

interface NotificationData {
  title: string;
  message: string;
  iconType: 'play' | 'star' | 'download' | 'bell';
  recipientType: 'all' | 'email' | 'uuid';
  recipient?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'failed';
}

/**
 * Отправляет уведомление о новой серии всем подписанным пользователям
 * @param showId ID сериала
 * @param showTitle Название сериала
 * @param seasonNumber Номер сезона
 * @param episodeNumber Номер эпизода
 * @param episodeTitle Название эпизода (если есть)
 */
export const sendNewEpisodeNotification = async (
  showId: number | string,
  showTitle: string, 
  seasonNumber: number, 
  episodeNumber: number, 
  episodeTitle?: string
) => {
  try {
    // Получаем всех пользователей, подписанных на этот сериал
    const subscriptionsRef = ref(db, 'users');
    const subscribersSnapshot = await get(subscriptionsRef);
    
    if (!subscribersSnapshot.exists()) {
      console.log('Нет пользователей для отправки уведомлений');
      return;
    }
    
    const users = subscribersSnapshot.val();
    const subscribedUsers: string[] = [];
    
    // Собираем ID пользователей, подписанных на этот сериал
    Object.entries(users).forEach(([userId, userData]: [string, any]) => {
      if (userData.subscriptions?.tvShows?.[showId] === true) {
        subscribedUsers.push(userId);
      }
    });
    
    console.log(`Найдено ${subscribedUsers.length} подписчиков на сериал "${showTitle}"`);
    
    if (subscribedUsers.length === 0) return;
    
    // Формируем заголовок и текст уведомления
    const title = `Новая серия: ${showTitle}`;
    const message = episodeTitle 
      ? `Вышла новая серия "${episodeTitle}" (Сезон ${seasonNumber}, Эпизод ${episodeNumber})`
      : `Вышла новая серия (Сезон ${seasonNumber}, Эпизод ${episodeNumber})`;
    
    // Отправляем уведомление каждому подписчику
    const notificationsRef = ref(db, 'notifications');
    const notificationPromises = subscribedUsers.map(userId => {
      const notificationData: NotificationData = {
        title,
        message,
        iconType: 'play',
        recipientType: 'uuid',
        recipient: userId,
        timestamp: Date.now(),
        status: 'sent'
      };
      
      return push(notificationsRef, notificationData);
    });
    
    await Promise.all(notificationPromises);
    console.log(`Уведомления о новой серии "${showTitle}" успешно отправлены ${subscribedUsers.length} пользователям`);
    
    return subscribedUsers.length;
  } catch (error) {
    console.error('Ошибка при отправке уведомлений о новой серии:', error);
    throw error;
  }
};

/**
 * Проверяет, подписан ли пользователь на уведомления о новых сериях
 * @param userId ID пользователя
 * @param showId ID сериала
 */
export const isUserSubscribedToShow = async (userId: string, showId: number | string): Promise<boolean> => {
  try {
    const subscriptionRef = ref(db, `users/${userId}/subscriptions/tvShows/${showId}`);
    const snapshot = await get(subscriptionRef);
    return snapshot.exists() && snapshot.val() === true;
  } catch (error) {
    console.error('Ошибка при проверке подписки:', error);
    return false;
  }
};

/**
 * Отправляет персональное уведомление конкретному пользователю
 * @param userId ID пользователя
 * @param title Заголовок уведомления
 * @param message Текст уведомления
 * @param iconType Тип иконки уведомления
 */
export const sendPersonalNotification = async (
  userId: string,
  title: string,
  message: string,
  iconType: NotificationData['iconType'] = 'bell'
): Promise<string | null> => {
  try {
    const notificationsRef = ref(db, 'notifications');
    const notificationData: NotificationData = {
      title,
      message,
      iconType,
      recipientType: 'uuid',
      recipient: userId,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    const result = await push(notificationsRef, notificationData);
    return result.key;
  } catch (error) {
    console.error('Ошибка при отправке персонального уведомления:', error);
    return null;
  }
};

/**
 * Проверяет наличие новых серий для сериала и отправляет уведомления подписчикам
 * @param showId ID сериала
 * @returns Количество отправленных уведомлений или null в случае ошибки
 */
export const checkForNewEpisodes = async (showId: number | string): Promise<number | null> => {
  try {
    // Получаем информацию о сериале
    const showRef = ref(db, `tvShows/${showId}`);
    const showSnapshot = await get(showRef);
    
    if (!showSnapshot.exists()) {
      console.error(`Сериал с ID ${showId} не найден`);
      return null;
    }
    
    const show = showSnapshot.val();
    
    // Получаем последнюю информацию о проверке новых серий
    const lastCheckRef = ref(db, `episodeChecks/${showId}`);
    const lastCheckSnapshot = await get(lastCheckRef);
    
    let lastCheckedData = {
      timestamp: 0,
      lastSeason: 0,
      lastEpisode: 0
    };
    
    if (lastCheckSnapshot.exists()) {
      lastCheckedData = lastCheckSnapshot.val();
    }
    
    // Находим последний сезон и эпизод
    const seasons = show.seasons || [];
    if (!Array.isArray(seasons) || seasons.length === 0) {
      console.log(`Сериал ${show.title} не имеет сезонов`);
      return null;
    }
    
    // Получаем последний сезон и эпизод
    const lastSeason = Math.max(...seasons.map((s: { number: number }) => s.number));
    const lastSeasonData = seasons.find((s: { number: number }) => s.number === lastSeason);
    
    if (!lastSeasonData || !Array.isArray(lastSeasonData.episodes)) {
      console.log(`Последний сезон не имеет эпизодов для сериала ${show.title}`);
      return null;
    }
    
    const lastEpisode = Math.max(...lastSeasonData.episodes.map((e: { id?: number }) => e.id || 0));
    
    // Проверяем, появились ли новые серии
    let notificationCount = 0;
    
    // Есть новый сезон
    if (lastSeason > lastCheckedData.lastSeason) {
      // Отправляем уведомление о новом сезоне
      const episodeData = lastSeasonData.episodes[0];
      const count = await sendNewEpisodeNotification(
        showId,
        show.title,
        lastSeason,
        episodeData.id || 1,
        episodeData.title
      );
      
      notificationCount = count || 0;
    } 
    // Тот же сезон, но новый эпизод
    else if (lastSeason === lastCheckedData.lastSeason && lastEpisode > lastCheckedData.lastEpisode) {
      // Находим новый эпизод
      const newEpisode = lastSeasonData.episodes.find((e: { id?: number }) => (e.id || 0) === lastEpisode);
      
      if (newEpisode) {
        const count = await sendNewEpisodeNotification(
          showId,
          show.title,
          lastSeason,
          lastEpisode,
          newEpisode.title
        );
        
        notificationCount = count || 0;
      }
    }
    
    // Обновляем информацию о последней проверке
    await set(lastCheckRef, {
      timestamp: Date.now(),
      lastSeason,
      lastEpisode
    });
    
    return notificationCount;
  } catch (error) {
    console.error('Ошибка при проверке новых серий:', error);
    return null;
  }
}; 