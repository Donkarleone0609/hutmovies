import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get, onValue } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';
import { episodeCheckService } from '../utils/episodeCheckService';
import { RotateCwIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

interface TVShow {
  id: number;
  title: string;
  image?: string;
  seasons?: { number: number; episodes: { id: number; title: string }[] }[];
}

interface CheckResult {
  timestamp: number;
  notificationsSent: number;
}

interface EpisodeCheckStatus {
  lastRun: number;
  isRunning: boolean;
  results: {
    [showId: string]: CheckResult;
  };
}

export function EpisodeNotificationsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tvShows, setTvShows] = useState<TVShow[]>([]);
  const [serviceStatus, setServiceStatus] = useState<EpisodeCheckStatus | null>(null);
  const [checkInProgress, setCheckInProgress] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setLoading(true);

      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          setIsAdmin(snapshot.exists() && snapshot.val().admin === true);
        } catch (error) {
          console.error('Ошибка проверки прав администратора:', error);
          toast.error('Ошибка проверки прав доступа');
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Загружаем список сериалов
    const tvShowsRef = ref(db, 'tvShows');
    const unsubscribeTvShows = onValue(tvShowsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const tvShowsArray: TVShow[] = Object.entries(data).map(([id, show]: [string, any]) => ({
            id: parseInt(id),
            title: show.title,
            image: show.image,
            seasons: show.seasons
          }));

          setTvShows(tvShowsArray);
        }
      } catch (error) {
        console.error('Ошибка загрузки списка сериалов:', error);
      }
    });

    // Подписываемся на статус сервиса проверки эпизодов
    const statusRef = ref(db, 'episodeCheckService');
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setServiceStatus(data);
        }
      } catch (error) {
        console.error('Ошибка загрузки статуса сервиса:', error);
      }
    });

    return () => {
      unsubscribeTvShows();
      unsubscribeStatus();
    };
  }, [isAdmin]);

  const handleRunCheck = async () => {
    if (checkInProgress) return;

    try {
      setCheckInProgress(true);
      toast.info('Запуск проверки новых серий для всех сериалов...');
      await episodeCheckService.checkAllShows();
      toast.success('Проверка новых серий завершена');
    } catch (error) {
      console.error('Ошибка запуска проверки:', error);
      toast.error('Ошибка запуска проверки');
    } finally {
      setCheckInProgress(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-6 text-center">
          <XCircleIcon size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Доступ запрещен</h1>
          <p className="text-gray-300">
            У вас нет прав администратора для просмотра этой страницы
          </p>
        </div>
      </div>
    );
  }

  const getLastCheckInfo = (showId: number) => {
    if (!serviceStatus || !serviceStatus.results || !serviceStatus.results[showId]) {
      return 'Нет данных о проверке';
    }

    const result = serviceStatus.results[showId];
    const date = formatDate(result.timestamp);
    return `${date} (отправлено: ${result.notificationsSent})`;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-6">Управление уведомлениями о новых сериях</h1>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Статус сервиса проверки</h2>
              <div className="flex items-center text-gray-300">
                <span className="mr-2">
                  Последняя проверка:
                </span>
                {serviceStatus?.lastRun ? (
                  <span>{formatDate(serviceStatus.lastRun)}</span>
                ) : (
                  <span className="text-yellow-400">Нет данных</span>
                )}
              </div>
              <div className="flex items-center mt-1">
                <span className="mr-2 text-gray-300">
                  Статус:
                </span>
                {serviceStatus?.isRunning ? (
                  <span className="text-green-400 flex items-center">
                    <RotateCwIcon size={16} className="mr-1 animate-spin" />
                    Выполняется проверка
                  </span>
                ) : (
                  <span className="text-blue-400 flex items-center">
                    <ClockIcon size={16} className="mr-1" />
                    Ожидание
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleRunCheck}
              disabled={checkInProgress || (serviceStatus?.isRunning || false)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                checkInProgress || (serviceStatus?.isRunning || false)
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RotateCwIcon
                size={20}
                className={`mr-2 ${
                  checkInProgress || (serviceStatus?.isRunning || false) ? 'animate-spin' : ''
                }`}
              />
              Запустить проверку всех сериалов
            </button>
          </div>

          <div className="overflow-hidden bg-gray-900 rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Сериал
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Последняя проверка
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Подписчики
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {tvShows.map((show) => (
                    <tr key={show.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {show.image && (
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={show.image}
                                alt={show.title}
                              />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{show.title}</div>
                            <div className="text-sm text-gray-400">
                              ID: {show.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {getLastCheckInfo(show.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <a
                          href={`/tvShow/${show.id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Управление →
                        </a>
                      </td>
                    </tr>
                  ))}

                  {tvShows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                        Сериалы не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 