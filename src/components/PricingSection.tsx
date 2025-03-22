import React, { useState, useEffect } from 'react';
import { CheckIcon } from 'lucide-react';
import { useTonConnectUI, useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import { SendTransactionRequest } from '@tonconnect/sdk';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';
import { ref, update, get, remove, push } from 'firebase/database';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';

const PLANS = [
  {
    name: 'Base',
    price: 0.5,
    features: [
      'Базовый доступ',
      'Базовый контент',
      'Поддержка 0,0001 нано секунда'
    ],
    trialAvailable: true
  },
  {
    name: 'Standart',
    price: 1,
    features: [
      'Full HD (1080p)',
      'Базовый контент',
      'HUT ORIGINALS',
      'Оффлайн просмотр',
      'Поддержка 0,0002 нано секунда'
    ]
  },
  {
    name: 'Luxury',
    price: 1.5,
    features: [
      'Ultra HD (4K)',
      'Эксклюзивный контент',
      'Долокализация',
      'Персональный менеджер'
    ]
  }
];

export function PricingSection() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const checkSubscriptionStatus = async (user: User) => {
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      setUserData(data);
      
      if (data.subscription) {
        const now = Date.now();
        const isActive = data.subscription.startDate <= now && now <= data.subscription.endDate;
        
        if (!isActive) {
          await remove(ref(db, `users/${user.uid}/subscription`));
          await update(ref(db, `users/${user.uid}`), {
            isTrial: false
          });
          return null;
        }
        return data.subscription;
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      if (user) {
        const subscription = await checkSubscriptionStatus(user);
        setCurrentSubscription(subscription);
      }
    });
    return unsubscribe;
  }, []);

  const addTransactionRecord = async (transactionData: any) => {
    if (!currentUser) return;
    
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const transactionsRef = ref(db, `users/${currentUser.uid}/transactions`);
      
      await push(transactionsRef, transactionData);
    } catch (error) {
      console.error('Ошибка записи транзакции:', error);
    }
  };

  const activateSubscription = async (plan: any) => {
    if (!currentUser) {
      toast.error('Требуется авторизация');
      return;
    }

    setProcessing(true);
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);

      if (plan.trialAvailable && !userData?.hasUsedTrial) {
        const startDate = Date.now();
        const endDate = startDate + 3 * 24 * 60 * 60 * 1000;
        
        await update(userRef, {
          subscription: {
            plan: plan.name,
            startDate,
            endDate,
            status: 'active'
          },
          hasUsedTrial: true,
          isTrial: true
        });
        
        setCurrentSubscription({ 
          plan: plan.name,
          startDate,
          endDate,
          status: 'active'
        });

        await addTransactionRecord({
          plan: plan.name,
          date: startDate,
          amount: 0,
          status: 'success',
          type: 'trial'
        });
        
        toast.success('Пробный период активирован!');
        return;
      }

      const transactionStartData = {
        plan: plan.name,
        date: Date.now(),
        amount: plan.price,
        status: 'pending',
        type: 'subscription'
      };
      
      const transactionRef = await push(ref(db, `users/${currentUser.uid}/transactions`), transactionStartData);
      const transactionId = transactionRef.key;

      try {
        const transaction: SendTransactionRequest = {
          validUntil: Date.now() + 600000,
          messages: [{
            address: 'UQB1dXoCrffS3WYLxRAM--AhL8D5d2soBw2GysTpiIuWmkc5',
            amount: (plan.price * 1000000000).toString(),
          }]
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        
        if (result.boc) {
          const startDate = Date.now();
          const endDate = startDate + 30 * 24 * 60 * 60 * 1000;
          
          await update(userRef, {
            subscription: {
              plan: plan.name,
              startDate,
              endDate,
              txHash: result.boc,
              status: 'active'
            },
            isTrial: false
          });
          
          setCurrentSubscription({
            plan: plan.name,
            startDate,
            endDate,
            txHash: result.boc,
            status: 'active'
          });

          await update(ref(db, `users/${currentUser.uid}/transactions/${transactionId}`), {
            status: 'success',
            txHash: result.boc,
            completeDate: Date.now()
          });
          
          toast.success('Подписка активирована!');
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
      toast.error('Ошибка активации подписки');
    } finally {
      setProcessing(false);
    }
  };

  const getButtonState = (plan: any) => {
    if (!currentUser) return { text: 'Войдите для выбора', disabled: true };
    if (processing) return { text: 'Обработка...', disabled: true };
    
    const isSubActive = currentSubscription?.status === 'active';
    const isCurrentPlan = currentSubscription?.plan === plan.name;

    if (isSubActive) {
      return isCurrentPlan 
        ? { text: 'Активна', disabled: true }
        : { text: 'Уже есть подписка', disabled: true };
    }

    if (plan.trialAvailable && !userData?.hasUsedTrial) {
      return { text: 'Активировать пробный период', disabled: false };
    }

    return { text: `Купить за ${plan.price} TON`, disabled: false };
  };

  const handleSubscriptionPurchase = (plan: any) => {
    activateSubscription(plan);
  };

  const handleDirectPayment = () => {
    if (selectedPlan) {
      activateSubscription(selectedPlan);
    }
    setIsModalOpen(false);
  };

  const handleBalancePayment = async () => {
    if (!currentUser) {
      toast.error('Требуется авторизация');
      return;
    }

    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    const currentBalance = snapshot.exists() && snapshot.val().rouletteBalance 
      ? snapshot.val().rouletteBalance 
      : 0;

    if (currentBalance < selectedPlan.price) {
      toast.error('Недостаточно средств на балансе рулетки');
      return;
    }

    try {
      setProcessing(true);
      const startDate = Date.now();
      const endDate = startDate + 30 * 24 * 60 * 60 * 1000;

      await update(userRef, {
        subscription: {
          plan: selectedPlan.name,
          startDate,
          endDate,
          status: 'active'
        },
        rouletteBalance: currentBalance - selectedPlan.price
      });

      setCurrentSubscription({
        plan: selectedPlan.name,
        startDate,
        endDate,
        status: 'active'
      });

      await addTransactionRecord({
        plan: selectedPlan.name,
        date: startDate,
        amount: selectedPlan.price,
        status: 'success',
        type: 'subscription'
      });

      toast.success('Подписка активирована через баланс рулетки!');
    } catch (error) {
      console.error('Ошибка активации подписки через баланс:', error);
      toast.error('Ошибка активации подписки через баланс');
    } finally {
      setProcessing(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="bg-gray-800 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Выберите подписку</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            {userData?.hasUsedTrial ? 'Выберите подходящий тариф' : 'Начните с пробного периода'}
          </p>
          
          <div className="mt-6 flex justify-center flex-col items-center">
            {currentUser && (
              <Link 
                to="/transactions" 
                className="text-red-500 hover:text-red-400 mt-4 flex items-center"
              >
                Просмотреть историю транзакций
              </Link>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const { text, disabled } = getButtonState(plan);
            
            return (
              <div 
                key={plan.name}
                className="bg-gray-900 rounded-lg p-8 border border-gray-700 transition-all"
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-red-500 text-3xl font-bold mb-4">
                  {plan.price} TON
                  <span className="text-sm text-gray-400">/месяц</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckIcon 
                        size={18} 
                        className="mr-2 text-red-500"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscriptionPurchase(plan)}
                  disabled={disabled || processing}
                  className={`w-full py-3 rounded-md transition ${
                    disabled || processing
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {text}
                </button>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70"
              onClick={() => setIsModalOpen(false)}
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
                
                <h2 className="text-3xl font-bold mb-4 text-yellow-300">Выберите способ оплаты</h2>
                <div className="flex justify-center mb-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-bold mx-2"
                    onClick={handleDirectPayment}
                  >
                    Оплата напрямую
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-bold mx-2"
                    onClick={handleBalancePayment}
                  >
                    Оплата Балансом
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}