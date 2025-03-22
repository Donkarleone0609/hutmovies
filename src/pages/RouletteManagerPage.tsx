import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { User } from 'firebase/auth';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion } from 'framer-motion';
import { LayoutDashboardIcon, TimerIcon, PlayIcon, PauseIcon, CalendarIcon, BarChart2Icon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RouletteStats {
  totalPrizes: number;
  totalTonAwarded: number;
  totalSpins: number;
  tonSmallWins: number;
  tonBigWins: number;
  treshHutWins: number;
  lastUpdated: number | null;
}

export function RouletteManagerPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rouletteActive, setRouletteActive] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<RouletteStats>({
    totalPrizes: 0,
    totalTonAwarded: 0,
    totalSpins: 0,
    tonSmallWins: 0,
    tonBigWins: 0,
    treshHutWins: 0,
    lastUpdated: null
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists() && snapshot.val().admin === true) {
            setIsAdmin(true);
            await loadRouletteSettings();
            await loadRouletteStats();
          } else {
            setIsAdmin(false);
          }
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

  const loadRouletteSettings = async () => {
    try {
      const rouletteRef = ref(db, 'settings/roulette');
      const snapshot = await get(rouletteRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRouletteActive(data.active || false);
        
        if (data.startTime) {
          setStartDate(new Date(data.startTime));
        }
        
        if (data.endTime) {
          setEndDate(new Date(data.endTime));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек рулетки:', error);
      toast.error('Ошибка загрузки настроек рулетки');
    }
  };

  const loadRouletteStats = async () => {
    setLoadingStats(true);
    try {
      // Получаем статистику из Firebase
      const statsRef = ref(db, 'stats/roulette');
      const snapshot = await get(statsRef);
      
      if (snapshot.exists()) {
        setStats(snapshot.val());
      } else {
        // Если статистики нет, создаем инициализирующие данные
        await calculateStats();
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      toast.error('Ошибка загрузки статистики рулетки');
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateStats = async () => {
    setLoadingStats(true);
    try {
      // Инициализируем счетчики
      let totalPrizes = 0;
      let totalTonAwarded = 0;
      let totalSpins = 0;
      let tonSmallWins = 0; 
      let tonBigWins = 0;
      let treshHutWins = 0;
      
      // Получаем всех пользователей
      const usersRef = ref(db, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        
        // Проходим по всем пользователям
        for (const userId in users) {
          if (users[userId].transactions) {
            const transactions = users[userId].transactions;
            
            // Проверяем все транзакции пользователя
            for (const transactionId in transactions) {
              const transaction = transactions[transactionId];
              
              // Если это транзакция вращения рулетки
              if (transaction.type === 'roulette_spin') {
                totalSpins++;
              }
              
              // Если это транзакция выигрыша
              if (transaction.type === 'roulette_win') {
                if (transaction.prize === 'ton_small') {
                  tonSmallWins++;
                  totalTonAwarded += 0.5;
                  totalPrizes++;
                } else if (transaction.prize === 'ton_big') {
                  tonBigWins++;
                  totalTonAwarded += 100;
                  totalPrizes++;
                } else if (transaction.prize === 'tresh_hut') {
                  treshHutWins++;
                  totalPrizes++;
                }
              }
            }
          }
        }
      }
      
      // Получаем также информацию о выигравших права на треки
      const treshHutRef = ref(db, 'treshHutWinners');
      const treshHutSnapshot = await get(treshHutRef);
      
      if (treshHutSnapshot.exists()) {
        const winners = Object.keys(treshHutSnapshot.val()).length;
        // Если есть расхождение с данными из транзакций, берем большее значение
        treshHutWins = Math.max(treshHutWins, winners);
      }
      
      // Сохраняем статистику
      const newStats: RouletteStats = {
        totalPrizes,
        totalTonAwarded,
        totalSpins,
        tonSmallWins,
        tonBigWins,
        treshHutWins,
        lastUpdated: Date.now()
      };
      
      await update(ref(db, 'stats/roulette'), newStats);
      setStats(newStats);
      toast.success('Статистика обновлена');
    } catch (error) {
      console.error('Ошибка расчета статистики:', error);
      toast.error('Ошибка при расчете статистики');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!startDate || !endDate) {
      toast.error('Необходимо указать даты начала и окончания акции');
      return;
    }
    
    if (startDate >= endDate) {
      toast.error('Дата начала должна быть раньше даты окончания');
      return;
    }
    
    setSaving(true);
    
    try {
      const rouletteRef = ref(db, 'settings/roulette');
      
      await update(rouletteRef, {
        active: rouletteActive,
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      });
      
      toast.success('Настройки рулетки успешно сохранены');
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const toggleRouletteStatus = async () => {
    setSaving(true);
    
    try {
      const rouletteRef = ref(db, 'settings/roulette');
      
      await update(rouletteRef, {
        active: !rouletteActive,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid
      });
      
      setRouletteActive(!rouletteActive);
      toast.success(`Рулетка ${!rouletteActive ? 'активирована' : 'деактивирована'}`);
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      toast.error('Ошибка изменения статуса');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Никогда';
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          <p className="mt-4">Загрузка настроек рулетки...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex justify-center items-center">
        <div className="bg-gray-800 p-6 rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещен</h1>
          <p>Требуются права администратора для доступа к этой странице</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TimerIcon size={28} />
            Управление рулеткой TON
          </h1>
          
          <Link 
            to="/admin" 
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <LayoutDashboardIcon size={20} />
            Назад к панели
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Текущий статус рулетки</h2>
            
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg ${rouletteActive ? 'bg-green-600' : 'bg-red-600'}`}>
                {rouletteActive ? 'Активна' : 'Неактивна'}
              </div>
              
              <motion.button
                onClick={toggleRouletteStatus}
                disabled={saving}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  rouletteActive 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {rouletteActive ? (
                  <>
                    <PauseIcon size={20} />
                    <span>Деактивировать</span>
                  </>
                ) : (
                  <>
                    <PlayIcon size={20} />
                    <span>Активировать</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
          
          <p className="text-gray-400 mb-6">
            Когда рулетка активна, пользователи с Luxury подпиской могут использовать ее. 
            При деактивации рулетка становится недоступной для всех пользователей.
          </p>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon size={18} />
                  Дата начала акции
                </label>
              </div>
              <div className="relative">
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd.MM.yyyy HH:mm"
                  placeholderText="Выберите дату и время"
                  className="w-full bg-gray-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon size={18} />
                  Дата окончания акции
                </label>
              </div>
              <div className="relative">
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd.MM.yyyy HH:mm"
                  placeholderText="Выберите дату и время"
                  className="w-full bg-gray-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <motion.button
            onClick={handleSaveSettings}
            disabled={saving || !startDate || !endDate}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-3 rounded-lg text-lg font-bold ${
              saving || !startDate || !endDate
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </motion.button>
        </div>

        <div className="mt-12 bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart2Icon size={20} />
              Статистика рулетки
            </h2>
            
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-400">
                Последнее обновление: {formatDate(stats.lastUpdated)}
              </p>
              
              <motion.button
                onClick={calculateStats}
                disabled={loadingStats}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  loadingStats 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loadingStats ? 'Обновление...' : 'Обновить статистику'}
              </motion.button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Выдано призов</h3>
              <p className="text-2xl font-bold text-red-500">{stats.totalPrizes}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Выдано TON</h3>
              <p className="text-2xl font-bold text-blue-500">{stats.totalTonAwarded.toFixed(2)}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Всего вращений</h3>
              <p className="text-2xl font-bold text-green-500">{stats.totalSpins}</p>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-4">Детальная статистика призов</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="pb-3 pr-4">Тип приза</th>
                  <th className="pb-3 pr-4">Количество</th>
                  <th className="pb-3">Процент от всех вращений</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-3 pr-4">0.5 TON</td>
                  <td className="py-3 pr-4">{stats.tonSmallWins}</td>
                  <td className="py-3">
                    {stats.totalSpins > 0 
                      ? ((stats.tonSmallWins / stats.totalSpins) * 100).toFixed(2) 
                      : '0'}%
                  </td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 pr-4">100 TON</td>
                  <td className="py-3 pr-4">{stats.tonBigWins}</td>
                  <td className="py-3">
                    {stats.totalSpins > 0 
                      ? ((stats.tonBigWins / stats.totalSpins) * 100).toFixed(6) 
                      : '0'}%
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Права на треки TRESH HUT</td>
                  <td className="py-3 pr-4">{stats.treshHutWins}</td>
                  <td className="py-3">
                    {stats.totalSpins > 0 
                      ? ((stats.treshHutWins / stats.totalSpins) * 100).toFixed(6) 
                      : '0'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 