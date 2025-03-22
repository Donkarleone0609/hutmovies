import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { auth, db } from '../firebase';
import { ref, get, update, set } from 'firebase/database';
import { User } from 'firebase/auth';
import { DollarSignIcon, UserIcon, SearchIcon } from 'lucide-react';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  rouletteBalance?: number;
  subscription?: {
    plan: string;
    status: string;
    endDate: number;
  };
}

export function UserBalanceManagementPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBalanceValues, setNewBalanceValues] = useState<{[key: string]: string}>({});
  const [processing, setProcessing] = useState<{[key: string]: boolean}>({});

  // Проверка прав администратора
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
            await loadAllUsers();
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

  const loadAllUsers = async () => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray: UserData[] = [];
        
        Object.keys(usersData).forEach((uid) => {
          const userData = usersData[uid];
          usersArray.push({
            uid,
            email: userData.email || 'Нет email',
            displayName: userData.displayName || 'Нет имени',
            rouletteBalance: userData.rouletteBalance || 0,
            subscription: userData.subscription
          });
          
          // Инициализируем значения для редактирования баланса
          setNewBalanceValues(prev => ({
            ...prev,
            [uid]: (userData.rouletteBalance || 0).toString()
          }));
        });
        
        // Сортируем пользователей по email
        usersArray.sort((a, b) => a.email.localeCompare(b.email));
        
        setUsers(usersArray);
        setFilteredUsers(usersArray);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      toast.error('Ошибка при загрузке данных пользователей');
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(term) || 
        (user.displayName?.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    }
  };

  const handleBalanceChange = (uid: string, value: string) => {
    setNewBalanceValues(prev => ({
      ...prev,
      [uid]: value
    }));
  };

  const updateUserBalance = async (uid: string) => {
    if (processing[uid]) return;
    
    const newBalance = parseFloat(newBalanceValues[uid]);
    if (isNaN(newBalance) || newBalance < 0) {
      toast.error('Введите корректное значение баланса');
      return;
    }
    
    setProcessing(prev => ({ ...prev, [uid]: true }));
    
    try {
      // Обновляем баланс пользователя
      await update(ref(db, `users/${uid}`), {
        rouletteBalance: newBalance
      });
      
      // Записываем транзакцию (если баланс был изменен)
      const user = users.find(u => u.uid === uid);
      const oldBalance = user?.rouletteBalance || 0;
      
      if (newBalance !== oldBalance) {
        const now = Date.now();
        const transactionRef = ref(db, `users/${uid}/transactions/${now}`);
        await set(transactionRef, {
          type: 'admin_balance_change',
          date: now,
          oldBalance,
          newBalance,
          adminUid: currentUser?.uid,
          status: 'success'
        });
      }
      
      // Обновляем список пользователей
      setUsers(prev => 
        prev.map(user => 
          user.uid === uid 
            ? { ...user, rouletteBalance: newBalance } 
            : user
        )
      );
      
      setFilteredUsers(prev => 
        prev.map(user => 
          user.uid === uid 
            ? { ...user, rouletteBalance: newBalance } 
            : user
        )
      );
      
      toast.success('Баланс пользователя обновлен');
    } catch (error) {
      console.error('Ошибка обновления баланса:', error);
      toast.error('Ошибка при обновлении баланса пользователя');
    } finally {
      setProcessing(prev => ({ ...prev, [uid]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          <p className="mt-4">Загрузка данных пользователей...</p>
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSignIcon size={28} />
            Управление балансом пользователей
          </h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск пользователя..."
              value={searchTerm}
              onChange={handleSearch}
              className="bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
            />
            <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Текущая подписка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Баланс рулетки (TON)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                      {searchTerm ? 'Пользователи не найдены' : 'Нет данных о пользователях'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <UserIcon size={20} className="text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">
                              {user.displayName || 'Нет имени'}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {user.uid.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.subscription ? (
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.subscription.status === 'active' ? 'Активна' : 'Неактивна'}
                            </span>
                            <div className="text-sm mt-1">
                              {user.subscription.plan}
                              {user.subscription.status === 'active' && (
                                <span className="text-xs text-gray-400 ml-2">
                                  до {new Date(user.subscription.endDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Нет подписки</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number" 
                            min="0"
                            step="0.001"
                            value={newBalanceValues[user.uid] || '0'}
                            onChange={(e) => handleBalanceChange(user.uid, e.target.value)}
                            className="bg-gray-700 text-white px-3 py-2 rounded w-24 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-gray-400">TON</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => updateUserBalance(user.uid)}
                          disabled={processing[user.uid]}
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                            processing[user.uid]
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                          }`}
                        >
                          {processing[user.uid] ? 'Обновление...' : 'Обновить баланс'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 