import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  date: number;
  amount?: number;
  plan?: string;
  status: string;
  txHash?: string;
  type?: string;
  prize?: string;
  fromAddress?: string;
  toAddress?: string;
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

  const getTransactionTypeText = (transaction: Transaction) => {
    if (transaction.type === 'roulette_deposit') {
      return 'Пополнение баланса рулетки';
    } else if (transaction.type === 'roulette_spin') {
      return 'Вращение рулетки';
    } else if (transaction.type === 'roulette_win') {
      switch (transaction.prize) {
        case 'ton':
          return 'Выигрыш в рулетке (1 TON)';
        case 'subscription':
          return 'Выигрыш в рулетке (Luxury 1 день)';
        default:
          return 'Выигрыш в рулетке';
      }
    } else if (transaction.type === 'ton_prize_transfer') {
      return 'Перевод TON на кошелек';
    } else if (transaction.type === 'admin_balance_change') {
      return 'Изменение баланса администратором';
    } else if (transaction.type === 'subscription') {
      return `Подписка "${transaction.plan}"`;
    } else if (transaction.type === 'trial') {
      return `Пробный период "${transaction.plan}"`;
    } else {
      return `Подписка "${transaction.plan}"`;
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (transaction.type === 'roulette_win' && transaction.prize === 'ton') {
      return '+1.000';
    } else if (transaction.type === 'roulette_deposit') {
      // @ts-ignore
      if (transaction.fromAddress && transaction.toAddress) {
        return transaction.amount ? `+${transaction.amount.toFixed(3)}` : '-';
      }
      return transaction.amount ? transaction.amount.toFixed(3) : '-';
    } else if (transaction.type === 'admin_balance_change') {
      // @ts-ignore - typescript не видит поля oldBalance и newBalance
      if (transaction.oldBalance !== undefined && transaction.newBalance !== undefined) {
        // @ts-ignore
        const diff = transaction.newBalance - transaction.oldBalance;
        return diff > 0 ? `+${diff.toFixed(3)}` : `${diff.toFixed(3)}`;
      }
      return '-';
    } else if (transaction.type === 'roulette_win' && transaction.prize === 'subscription') {
      return '-';
    } else if (transaction.type === 'roulette_win' && transaction.prize === 'nothing') {
      return '-';
    } else if (transaction.amount !== undefined) {
      return transaction.amount.toFixed(3);
    } else {
      return '-';
    }
  };

  const getAmountClass = (transaction: Transaction) => {
    if (transaction.type === 'roulette_win' && transaction.prize === 'ton') {
      return 'text-green-400';
    } else if (transaction.type === 'roulette_deposit') {
      return 'text-green-400';
    } else if (transaction.type === 'admin_balance_change') {
      // @ts-ignore
      if (transaction.oldBalance !== undefined && transaction.newBalance !== undefined) {
        // @ts-ignore
        return transaction.newBalance > transaction.oldBalance ? 'text-green-400' : 'text-red-400';
      }
      return '';
    } else if (transaction.type === 'subscription') {
      return 'text-yellow-400';
    } else if (transaction.type === 'roulette_spin') {
      return 'text-red-400';
    } else {
      return '';
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
                    Операция
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
                      {getTransactionTypeText(transaction)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getAmountClass(transaction)}`}>
                      {getTransactionAmount(transaction)}
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