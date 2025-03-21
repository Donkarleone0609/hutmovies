import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';
import { checkForNewEpisodes } from './notificationsHelper';

interface EpisodeCheckStatus {
  lastRun: number;
  isRunning: boolean;
  results: {
    [showId: string]: {
      timestamp: number;
      notificationsSent: number;
    };
  };
}

/**
 * Сервис для автоматической проверки новых серий
 */
class EpisodeCheckService {
  private checkIntervalId: number | null = null;
  private checkInterval = 1000 * 60 * 60 * 12; // 12 часов
  private isRunning = false;

  /**
   * Запускает сервис автоматической проверки новых серий
   * @param interval Интервал проверки в миллисекундах (по умолчанию каждые 12 часов)
   */
  startService(interval?: number) {
    if (this.checkIntervalId !== null) {
      console.log('Сервис проверки новых серий уже запущен');
      return;
    }

    if (interval) {
      this.checkInterval = interval;
    }

    // Запускаем проверку при запуске
    this.checkAllShows();

    // Устанавливаем периодическую проверку
    this.checkIntervalId = window.setInterval(() => {
      this.checkAllShows();
    }, this.checkInterval);

    console.log(`Сервис проверки новых серий запущен. Интервал: ${this.checkInterval / (1000 * 60 * 60)} часов`);
  }

  /**
   * Останавливает сервис автоматической проверки
   */
  stopService() {
    if (this.checkIntervalId === null) {
      console.log('Сервис проверки новых серий не запущен');
      return;
    }

    window.clearInterval(this.checkIntervalId);
    this.checkIntervalId = null;
    console.log('Сервис проверки новых серий остановлен');
  }

  /**
   * Запускает немедленную проверку всех сериалов
   */
  async checkAllShows() {
    if (this.isRunning) {
      console.log('Проверка новых серий уже выполняется');
      return;
    }

    try {
      this.isRunning = true;
      await this.updateServiceStatus(true);

      // Получаем список всех сериалов
      const showsRef = ref(db, 'tvShows');
      const showsSnapshot = await get(showsRef);

      if (!showsSnapshot.exists()) {
        console.log('Сериалы не найдены');
        return;
      }

      const shows = showsSnapshot.val();
      const results: EpisodeCheckStatus['results'] = {};

      // Проверяем каждый сериал на наличие новых серий
      for (const showId in shows) {
        try {
          console.log(`Проверка новых серий для сериала ${shows[showId].title} (ID: ${showId})`);
          const notificationsSent = await checkForNewEpisodes(showId);
          
          results[showId] = {
            timestamp: Date.now(),
            notificationsSent: notificationsSent || 0
          };
          
          // Небольшая задержка между проверками, чтобы не перегружать сервер
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Ошибка при проверке сериала ${showId}:`, error);
        }
      }

      // Обновляем статус и результаты проверки
      await this.saveCheckResults(results);
      console.log('Проверка новых серий завершена');
    } catch (error) {
      console.error('Ошибка при проверке новых серий:', error);
    } finally {
      this.isRunning = false;
      await this.updateServiceStatus(false);
    }
  }

  /**
   * Обновляет статус работы сервиса в Firebase
   */
  private async updateServiceStatus(isRunning: boolean) {
    try {
      const statusRef = ref(db, 'episodeCheckService/status');
      await set(statusRef, { 
        isRunning,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса сервиса:', error);
    }
  }

  /**
   * Сохраняет результаты проверки в Firebase
   */
  private async saveCheckResults(results: EpisodeCheckStatus['results']) {
    try {
      const statusRef = ref(db, 'episodeCheckService');
      
      const status: EpisodeCheckStatus = {
        lastRun: Date.now(),
        isRunning: this.isRunning,
        results
      };
      
      await set(statusRef, status);
    } catch (error) {
      console.error('Ошибка при сохранении результатов проверки:', error);
    }
  }
}

// Экспортируем единственный экземпляр сервиса
export const episodeCheckService = new EpisodeCheckService(); 