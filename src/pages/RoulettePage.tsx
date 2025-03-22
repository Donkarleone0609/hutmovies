import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { auth, db } from '../firebase';
import { ref, update, get, push } from 'firebase/database';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { SendTransactionRequest } from '@tonconnect/sdk';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ROULETTE_PRICE = 0.001; // 0.001 TON за одно вращение
const PRIZES = [
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'ton_small', name: '0.5 TON', chance: 5, color: '#0088CC', icon: '💎' },
  { id: 'tresh_hut', name: 'Права на треки TRESH HUT', chance: 0.00001, color: '#FFD700', icon: '🎵' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'ton_small', name: '0.5 TON', chance: 5, color: '#0088CC', icon: '💎' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'ton_big', name: '100 TON', chance: 0.001, color: '#0088CC', icon: '💰' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'nothing', name: 'Ничего', chance: 94.999, color: '#333333', icon: '❌' },
  { id: 'ton_small', name: '0.5 TON', chance: 5, color: '#0088CC', icon: '💎' },
];

// Добавляем задания в рулетку
const TASKS = [
  {
    id: 'watch_producer',
    description: 'Посмотреть фильм/сериал от определенного продюсера',
    reward: 0.01,
    checkCompletion: async () => {
      // Логика проверки выполнения задания
      // Например, проверка истории просмотров пользователя
      return false; // Возвращаем true, если задание выполнено
    }
  },
  {
    id: 'spend_time',
    description: 'Находиться на HUT MOVIES 2 часа',
    reward: 0.1,
    checkCompletion: async () => {
      // Логика проверки времени нахождения на сайте
      return false;
    }
  },
  {
    id: 'purchase_subscription',
    description: 'Приобрести любой уровень подписки',
    reward: 1,
    checkCompletion: async () => {
      // Логика проверки покупки подписки
      return false;
    }
  },
  {
    id: 'connect_wallet',
    description: 'Подключить кошелек TON',
    reward: 0.01,
    checkCompletion: async () => {
      return isWalletConnected(); // Проверяем, подключен ли кошелек
    }
  }
];

export function RoulettePage() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPosition, setSpinPosition] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasLuxuryAccess, setHasLuxuryAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPrize, setCelebrationPrize] = useState('');
  const [rouletteActive, setRouletteActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [animationDuration, setAnimationDuration] = useState(5); // 5 секунд по умолчанию
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [pendingPrize, setPendingPrize] = useState<string | null>(null);
  const [visiblePrizes, setVisiblePrizes] = useState<any[]>([]);
  const [recentSpinners, setRecentSpinners] = useState<string[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  
  const rouletteRef = useRef<HTMLDivElement>(null);
  const [rouletteWidth, setRouletteWidth] = useState(0);
  const navigate = useNavigate();

  // Расчет ширины для замкнутого круга призов
  useEffect(() => {
    const calculateWidth = () => {
      if (rouletteRef.current) {
        const itemWidth = 120; // ширина одного элемента
        const spacing = 4; // отступы (по 2px с каждой стороны)
        const totalWidth = PRIZES.length * (itemWidth + spacing);
        setRouletteWidth(totalWidth);
      }
    };

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, []);

  // Эффект для инициализации начальной позиции рулетки
  useEffect(() => {
    if (rouletteWidth > 0 && !isSpinning) {
      // Устанавливаем начальную позицию так, чтобы один из призов был по центру
      const itemWidth = 124; // 120px + 4px spacing
      const viewportCenter = window.innerWidth / 2;
      const initialPosition = -(Math.floor(PRIZES.length / 2) * itemWidth) + (viewportCenter - 60);
      setSpinPosition(initialPosition);
    }
  }, [rouletteWidth, isSpinning]);

  // Эффект для генерации оптимизированного списка призов
  useEffect(() => {
    const generateVisiblePrizes = () => {
      // Получаем ширину видимого окна
      const windowWidth = window.innerWidth;
      
      // Вычисляем, сколько элементов нужно для заполнения экрана + буфер
      // Добавляем буфер 10 элементов с каждой стороны для плавных анимаций
      const itemWidth = 124; // 120px ширина + 4px marginy
      const visibleCount = Math.ceil(windowWidth / itemWidth) + 20;
      
      // Создаем массив призов, который покрывает всю видимую область и буфер
      const prizes = [];
      for (let i = 0; i < visibleCount; i++) {
        // Используем оригинальный массив PRIZES и берем элемент по модулю для циклического обхода
        const prizeIndex = i % PRIZES.length;
        prizes.push({
          ...PRIZES[prizeIndex],
          uniqueId: `${PRIZES[prizeIndex].id}-${i}` // Добавляем уникальный id для React key
        });
      }
      
      setVisiblePrizes(prizes);
    };
    
    generateVisiblePrizes();
    window.addEventListener('resize', generateVisiblePrizes);
    
    return () => window.removeEventListener('resize', generateVisiblePrizes);
  }, []);
  
  // Эффект для обработки "бесконечной" прокрутки
  useEffect(() => {
    if (spinCompleted && !isSpinning) {
      // Если анимация завершена, корректируем позицию для создания эффекта бесконечности
      resetRoulettePosition();
    }
  }, [spinCompleted, isSpinning]);
  
  // Функция для сброса позиции рулетки в центр без видимых изменений
  const resetRoulettePosition = () => {
    const itemWidth = 124; // 120px + 4px margin
    const totalWidth = PRIZES.length * itemWidth;
    
    // Текущая позиция может быть очень далеко влево/вправо после вращения
    // Корректируем её, чтобы она была в пределах одного цикла призов
    const currentModPosition = spinPosition % totalWidth;
    
    // Добавляем totalWidth и снова берем остаток, чтобы избежать отрицательных чисел
    const normalizedPosition = (currentModPosition + totalWidth) % totalWidth;
    
    // Устанавливаем позицию в середину окна
    const viewportCenter = window.innerWidth / 2;
    const prizeIndex = Math.round(normalizedPosition / itemWidth) % PRIZES.length;
    const centerPosition = -(prizeIndex * itemWidth) + (viewportCenter - 60);
    
    // Устанавливаем новую позицию без анимации
    setSpinPosition(centerPosition);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        setCurrentUser(user);
        await checkRouletteStatus();
        await loadUserBalance(user.uid);
        setIsLoading(false);
      } else {
        setCurrentUser(null);
        setHasLuxuryAccess(false);
        setBalance(0);
        setIsLoading(false);
        navigate('/signin');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  const checkRouletteStatus = async () => {
    try {
      const rouletteRef = ref(db, 'settings/roulette');
      const snapshot = await get(rouletteRef);
      
      if (snapshot.exists()) {
        const rouletteData = snapshot.val();
        const now = Date.now();
        
        // Проверяем не только флаг active, но и попадание в период действия акции
        const isStarted = rouletteData.startTime ? now >= rouletteData.startTime : true;
        const isNotEnded = rouletteData.endTime ? now <= rouletteData.endTime : true;
        
        setRouletteActive(rouletteData.active && isStarted && isNotEnded);
        
        if (rouletteData.endTime) {
          setEndTime(rouletteData.endTime);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса рулетки:', error);
    }
  };

  useEffect(() => {
    if (endTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
          setRouletteActive(false);
          setTimeLeft('Акция завершена');
          clearInterval(timer);
        } else {
          const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          
          setTimeLeft(`${days}д ${hours}ч ${minutes}м ${seconds}с`);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [endTime]);

  const handleDeposit = async () => {
    if (!currentUser) {
      toast.error('Требуется авторизация');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    if (!wallet) {
      toast.error('Необходимо подключить TON кошелек');
      return;
    }

    setProcessing(true);
    try {
      const transactionStartData = {
        type: 'roulette_deposit',
        date: Date.now(),
        amount: amount,
        status: 'pending'
      };
      
      const transactionRef = await push(ref(db, `users/${currentUser.uid}/transactions`), transactionStartData);
      const transactionId = transactionRef.key;

      try {
        // Отправляем TON с кошелька пользователя на адрес сервиса
        const transaction: SendTransactionRequest = {
          validUntil: Date.now() + 600000,
          messages: [{
            address: 'UQB1dXoCrffS3WYLxRAM--AhL8D5d2soBw2GysTpiIuWmkc5',
            amount: (amount * 1000000000).toString()
          }]
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        
        if (result.boc) {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          const currentBalance = snapshot.exists() && snapshot.val().rouletteBalance 
            ? snapshot.val().rouletteBalance 
            : 0;
          
          await update(userRef, {
            rouletteBalance: currentBalance + amount
          });
          
          await update(ref(db, `users/${currentUser.uid}/transactions/${transactionId}`), {
            status: 'success',
            txHash: result.boc,
            completeDate: Date.now(),
            fromAddress: wallet.account.address,
            toAddress: 'UQB1dXoCrffS3WYLxRAM--AhL8D5d2soBw2GysTpiIuWmkc5'
          });
          
          setBalance(currentBalance + amount);
          setDepositAmount('');
          toast.success(`Баланс пополнен на ${amount} TON`);
        }
      } catch (error) {
        console.error('Ошибка транзакции:', error);
        
        await update(ref(db, `users/${currentUser.uid}/transactions/${transactionId}`), {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
          completeDate: Date.now()
        });
        
        toast.error('Ошибка при обработке транзакции');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      toast.error('Ошибка пополнения баланса');
    } finally {
      setProcessing(false);
    }
  };

  const getRandomPrize = () => {
    // Используем только основные призы для настоящего розыгрыша
    const mainPrizes = [
      { id: 'ton_small', chance: 5 },
      { id: 'ton_big', chance: 0.001 },
      { id: 'tresh_hut', chance: 0.00001 },
      { id: 'nothing', chance: 94.99899 }
    ];
    
    const random = Math.random() * 100;
    let cumulativeChance = 0;
    
    for (const prize of mainPrizes) {
      cumulativeChance += prize.chance;
      if (random < cumulativeChance) {
        return prize.id;
      }
    }
    
    return 'nothing'; // По умолчанию
  };

  const getPositionForPrize = (prizeId: string) => {
    // Находим индекс приза в массиве
    const firstPrizeIndex = PRIZES.findIndex(p => p.id === prizeId);
    
    if (firstPrizeIndex !== -1) {
      // Вычисляем позицию для центрирования выигрыша
      const itemWidth = 120; // ширина элемента в px
      const spacing = 4; // учитываем margin 2px с каждой стороны
      const elementWidth = itemWidth + spacing;
      const centerOffset = window.innerWidth / 2 - itemWidth / 2;
      
      // Возвращаем позицию с учетом ширины всех элементов
      return -(firstPrizeIndex * elementWidth) + centerOffset;
    }
    
    return 0;
  };

  const processWin = async (prizeId: string) => {
    if (!currentUser) return;
    
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const transactionData = {
        type: 'roulette_win',
        date: Date.now(),
        status: 'success',
        prize: prizeId
      };
      
      await push(ref(db, `users/${currentUser.uid}/transactions`), transactionData);
      
      if (prizeId === 'ton_small') {
        // Зачисляем выигрыш на баланс пользователя
        const snapshot = await get(userRef);
        const currentBalance = snapshot.exists() && snapshot.val().rouletteBalance 
          ? snapshot.val().rouletteBalance 
          : 0;
        
        await update(userRef, {
          rouletteBalance: currentBalance + 0.5 // Выигрыш в 0.5 TON
        });
        
        setBalance(currentBalance + 0.5);
        toast.success('0.5 TON зачислен на ваш баланс рулетки!');
        
        setCelebrationPrize('0.5 TON');
        setShowCelebration(true);
      } else if (prizeId === 'ton_big') {
        // Зачисляем большой выигрыш на баланс пользователя
        const snapshot = await get(userRef);
        const currentBalance = snapshot.exists() && snapshot.val().rouletteBalance 
          ? snapshot.val().rouletteBalance 
          : 0;
        
        await update(userRef, {
          rouletteBalance: currentBalance + 100 // Выигрыш в 100 TON
        });
        
        setBalance(currentBalance + 100);
        toast.success('100 TON зачислен на ваш баланс рулетки!');
        
        setCelebrationPrize('100 TON');
        setShowCelebration(true);
      } else if (prizeId === 'tresh_hut') {
        // Отмечаем пользователя как выигравшего права на треки
        await update(userRef, {
          treshHutRights: true
        });
        
        // Также сохраняем информацию для администраторов
        await push(ref(db, 'treshHutWinners'), {
          userId: currentUser.uid,
          email: currentUser.email,
          date: Date.now()
        });
        
        toast.success('Вы выиграли права на треки TRESH HUT!');
        
        setCelebrationPrize('права на треки TRESH HUT');
        setShowCelebration(true);
      } else {
        toast.info('К сожалению, вы ничего не выиграли.');
      }
    } catch (error) {
      console.error('Ошибка обработки выигрыша:', error);
      toast.error('Ошибка при обработке выигрыша');
    }
  };

  const spinRoulette = async () => {
    if (!currentUser) {
      toast.error('Требуется авторизация');
      return;
    }
    
    if (balance < ROULETTE_PRICE) {
      toast.error('Недостаточно средств на балансе');
      return;
    }
    
    setIsSpinning(true);
    setPrize(null);
    setShowCelebration(false);
    setSpinCompleted(false);
    
    try {
      // Списываем стоимость вращения
      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, {
        rouletteBalance: balance - ROULETTE_PRICE
      });
      
      setBalance(balance - ROULETTE_PRICE);
      
      // Записываем транзакцию
      await push(ref(db, `users/${currentUser.uid}/transactions`), {
        type: 'roulette_spin',
        date: Date.now(),
        amount: ROULETTE_PRICE,
        status: 'success'
      });
      
      // 1. Сразу определяем выигрышный приз
      const winningPrize = getRandomPrize();
      setPendingPrize(winningPrize);
      
      // 2. Вычисляем положение приза в массиве
      const itemWidth = 124; // 120px + 4px
      const prizeIndex = PRIZES.findIndex(p => p.id === winningPrize);
      
      // 3. Находим центр экрана
      const viewportCenter = window.innerWidth / 2 - 60;
      
      // 4. Получаем текущую позицию барабана
      const currentPosition = spinPosition;
      
      // 5. Определяем количество оборотов для эффекта (5-8 полных оборотов)
      const rotations = 5 + Math.floor(Math.random() * 4);
      
      // 6. Вычисляем общую ширину одного набора призов
      const totalWidth = PRIZES.length * itemWidth;
      
      // 7. Рассчитываем, как далеко должна прокрутиться рулетка в пикселях
      // Всегда вращаем влево (отрицательное направление)
      const spinDistance = rotations * totalWidth;
      
      // 8. Вычисляем, где будет находиться выигрышный приз после вращения
      // Он должен быть точно под указателем (в центре экрана)
      const finalPrizePosition = -(prizeIndex * itemWidth) + viewportCenter;
      
      // 9. Вычисляем разницу между текущей позицией и необходимой финальной позицией
      const positionDifference = (currentPosition - finalPrizePosition) % totalWidth;
      
      // 10. Вычисляем итоговую позицию с учетом оборотов и необходимой конечной позиции
      const targetPosition = currentPosition - spinDistance - positionDifference;
      
      // 11. Запускаем анимацию
      setSpinPosition(targetPosition);
      
      // 12. Обрабатываем результат после завершения анимации
      setTimeout(() => {
        setSpinCompleted(true);
        setPrize(winningPrize);
        processWin(winningPrize);
        setIsSpinning(false);
        setPendingPrize(null);
      }, animationDuration * 1000 + 100);
      
    } catch (error) {
      console.error('Ошибка вращения рулетки:', error);
      toast.error('Ошибка при вращении рулетки');
      setIsSpinning(false);
      setPendingPrize(null);
    }
  };

  const skipAnimation = () => {
    if (pendingPrize && !spinCompleted) {
      // Получаем индекс выигрышного приза
      const prizeIndex = PRIZES.findIndex(p => p.id === pendingPrize);
      
      // Устанавливаем правильную финальную позицию
      const itemWidth = 124; // 120px + 4px
      const viewportCenter = window.innerWidth / 2 - 60;
      const targetPosition = -(prizeIndex * itemWidth) + viewportCenter;
      
      // Немедленно устанавливаем нужную позицию
      setSpinPosition(targetPosition);
      setSpinCompleted(true);
      
      // Обрабатываем выигрыш через небольшую задержку
      setTimeout(() => {
        setPrize(pendingPrize);
        processWin(pendingPrize);
        setIsSpinning(false);
        setPendingPrize(null);
      }, 300);
    }
  };

  useEffect(() => {
    const fetchRecentSpinners = async () => {
      try {
        const snapshot = await get(ref(db, 'recentSpinners'));
        if (snapshot.exists()) {
          setRecentSpinners(snapshot.val());
        }
      } catch (error) {
        console.error('Ошибка загрузки последних пользователей:', error);
      }
    };

    fetchRecentSpinners();
    const interval = setInterval(fetchRecentSpinners, 10000); // Обновляем каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  // Добавляем возможность приобретения подписки за баланс рулетки
  const handlePurchaseSubscription = async (plan: string, cost: number) => {
    if (!currentUser) {
      toast.error('Требуется авторизация');
      return;
    }

    if (balance < cost) {
      toast.error('Недостаточно средств на балансе');
      return;
    }

    setProcessing(true);
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const startDate = Date.now();
      const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 дней

      await update(userRef, {
        rouletteBalance: balance - cost,
        subscription: {
          status: 'active',
          plan: plan,
          startDate: startDate,
          endDate: endDate
        }
      });

      setBalance(balance - cost);
      toast.success(`Подписка ${plan} приобретена!`);
    } catch (error) {
      console.error('Ошибка при покупке подписки:', error);
      toast.error('Ошибка при покупке подписки');
    } finally {
      setProcessing(false);
    }
  };

  // Функция для загрузки баланса пользователя
  const loadUserBalance = async (userId: string) => {
    try {
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setBalance(userData.rouletteBalance || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки баланса:', error);
    }
  };

  // Выбираем случайные 3 задания каждый день
  useEffect(() => {
    const selectRandomTasks = () => {
      const shuffledTasks = TASKS.sort(() => 0.5 - Math.random());
      return shuffledTasks.slice(0, 3);
    };

    setDailyTasks(selectRandomTasks());
  }, []);

  // Перемещаем проверку на наличие wallet внутрь компонента
  const isWalletConnected = () => {
    return typeof wallet !== 'undefined' && !!wallet;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        <p className="ml-4">Загрузка...</p>
      </div>
    );
  }
  
  if (!rouletteActive) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col justify-center items-center text-center">
        <h1 className="text-3xl font-bold mb-6">Рулетка TON временно недоступна</h1>
        <p className="text-xl mb-4">Акция с рулеткой либо завершена, либо еще не началась.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-center mb-8"
      >
        <h1 className="text-3xl font-bold">Рулетка TON</h1>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {endTime && (
            <motion.div 
              className="bg-red-600 p-3 rounded-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-xl">До конца акции: <span className="font-bold">{timeLeft}</span></span>
            </motion.div>
          )}
          <motion.div 
            className="bg-gray-800 p-3 rounded-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-xl">Баланс: <span className="text-red-500 font-bold">{balance.toFixed(3)} TON</span></span>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Добавляем большой таймер в центре страницы */}
      {endTime && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 text-center"
        >
          <div className="inline-block bg-gradient-to-r from-red-700 to-red-500 p-4 md:p-6 rounded-xl shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">ДО ОКОНЧАНИЯ РУЛЕТКИ</h2>
            <div className="text-3xl md:text-5xl font-bold font-mono tracking-wider">{timeLeft}</div>
          </div>
        </motion.div>
      )}
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h2 className="text-2xl font-bold mb-4">Пополнить баланс</h2>
          <div className="flex items-center mb-4">
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Сумма в TON"
              className="bg-gray-700 text-white p-3 rounded-l-md flex-grow focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <motion.button
              onClick={handleDeposit}
              disabled={processing || !currentUser || !wallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-r-md ${
                processing || !currentUser || !wallet
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? 'Обработка...' : 'Пополнить'}
            </motion.button>
          </div>
          {!wallet && <p className="text-yellow-400">Подключите кошелек TON для пополнения</p>}
          {!currentUser && <p className="text-yellow-400">Войдите в аккаунт для пополнения</p>}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h2 className="text-2xl font-bold mb-4">Приобрести подписку</h2>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => handlePurchaseSubscription('Base', 0.5)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-white font-bold"
            >
              Base - 0.5 TON
            </button>
            <button 
              onClick={() => handlePurchaseSubscription('Standart', 1)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-white font-bold"
            >
              Standart - 1 TON
            </button>
            <button 
              onClick={() => handlePurchaseSubscription('Luxury', 1.5)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-white font-bold"
            >
              Luxury - 1.5 TON
            </button>
          </div>
        </motion.div>
      </div>
      
      <div className="flex flex-col items-center mb-12">
        <div className="relative w-full mb-8 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500 z-20"></div>
          
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-gray-900 via-transparent to-gray-900 z-10 pointer-events-none"></div>
          
          {/* Используем режим "бесконечный круг" для отображения призов */}
          <div className="relative overflow-hidden">
            <motion.div 
              ref={rouletteRef}
              className="flex items-center py-8"
              style={{ x: spinPosition }}
              animate={{ x: spinPosition }}
              transition={{
                type: "tween",
                duration: animationDuration,
                ease: [0.1, 0.3, 0.3, 1], // Кастомная кривая для эффекта вращения с замедлением
              }}
            >
              {visiblePrizes.map((prizeItem, index) => (
                <motion.div
                  key={prizeItem.uniqueId}
                  className="flex-shrink-0 w-[120px] h-[120px] mx-2 rounded-lg flex flex-col items-center justify-center"
                  style={{ backgroundColor: prizeItem.color }}
                  whileHover={{ scale: !isSpinning ? 1.05 : 1 }}
                >
                  <span className="text-4xl mb-2">{prizeItem.icon}</span>
                  <span className="text-white font-bold text-center">{prizeItem.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          {isSpinning && !spinCompleted && (
            <motion.button
              onClick={skipAnimation}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium mb-2"
            >
              Пропустить анимацию
            </motion.button>
          )}
          
          <motion.button
            onClick={spinRoulette}
            disabled={isSpinning || balance < ROULETTE_PRICE || !currentUser}
            whileHover={{ scale: isSpinning || balance < ROULETTE_PRICE || !currentUser ? 1 : 1.05 }}
            whileTap={{ scale: isSpinning || balance < ROULETTE_PRICE || !currentUser ? 1 : 0.95 }}
            className={`px-8 py-4 rounded-md text-xl font-bold ${
              isSpinning || balance < ROULETTE_PRICE || !currentUser
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 shadow-lg'
            }`}
          >
            {isSpinning ? 'Крутится...' : 'Крутить рулетку'}
          </motion.button>
        </div>
      </div>
      
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div 
              className="bg-gray-800 p-8 rounded-lg text-center max-w-md w-full relative overflow-hidden"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <motion.div 
                className="absolute -top-10 -left-10 w-[500px] h-[500px] bg-red-500 rounded-full opacity-10"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              ></motion.div>
              
              <h2 className="text-3xl font-bold mb-4 text-yellow-300">Поздравляем!</h2>
              <p className="text-2xl mb-6">Вы выиграли <span className="text-red-500 font-bold">{celebrationPrize}</span></p>
              
              <motion.div 
                className="flex justify-center mb-6"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              >
                <div className="text-6xl">🎉</div>
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold"
                onClick={() => setShowCelebration(false)}
              >
                Забрать выигрыш
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="overflow-hidden whitespace-nowrap mb-4">
        <motion.div
          className="flex"
          animate={{ x: ['100%', '-100%'] }}
          transition={{
            repeat: Infinity,
            duration: recentSpinners.length * 2, // Длительность зависит от количества пользователей
            ease: 'linear'
          }}
        >
          {recentSpinners.map((spinner, index) => (
            <div key={index} className="mx-4">
              <span className="text-white font-bold">{spinner}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Отображаем задания */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-bold mb-4">Ежедневные задания</h2>
        <ul className="space-y-2">
          {dailyTasks.map(task => (
            <li key={task.id} className="flex justify-between items-center">
              <span>{task.description}</span>
              <span className="text-red-500 font-bold">+{task.reward} TON</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 