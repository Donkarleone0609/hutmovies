import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  date: number;
  amount: number;
  plan: string;
  status: string;
  txHash?: string;
}

export function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          toast.error('Необходима авторизация');
          navigate('/signin');
          return;
        }
        
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const userTransactions = userData.transactions || [];
          
          // Преобразуем объект в массив и сортируем по дате (новые вверху)
          const transactionList = Object.entries(userTransactions).map(([id, data]: [string, any]) => ({
            id,
            ...data
          })).sort((a, b) => b.date - a.date);
          
          setTransactions(transactionList);
        }
      } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
        toast.error('Ошибка при загрузке истории транзакций');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [navigate]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Успешно';
      case 'pending':
        return 'В обработке';
      case 'failed':
        return 'Ошибка';
      case 'cancelled':
        return 'Отменено';
      default:
        return 'Неизвестно';
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
        <p className="mt-4">Загрузка истории транзакций...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8 text-center">История транзакций</h1>
      
      {transactions.length === 0 ? (
        <div className="text-center bg-gray-800 rounded-lg p-8">
          <p className="text-gray-400">У вас пока нет транзакций</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Дата и время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Тип подписки
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Сумма (TON)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID транзакции
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(transaction.date).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      Подписка "{transaction.plan}"
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.amount} TON
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400 truncate max-w-xs">
                      {transaction.txHash || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 