import React, { useState, useEffect } from 'react';
import { PlayIcon, StarIcon, DownloadIcon, BellIcon } from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, push, get } from 'firebase/database';
import { toast } from 'react-toastify';
import { User } from 'firebase/auth';

const iconTypes = {
  play: { icon: PlayIcon, color: 'red' },
  star: { icon: StarIcon, color: 'yellow' },
  download: { icon: DownloadIcon, color: 'green' },
  bell: { icon: BellIcon, color: 'blue' }
};

interface NotificationData {
  title: string;
  message: string;
  iconType: keyof typeof iconTypes;
  recipientType: 'all' | 'email' | 'uuid';
  recipient?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'failed';
}

export function NotificationSender() {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    iconType: 'play' as keyof typeof iconTypes,
    recipientType: 'all' as 'all' | 'email' | 'uuid',
    recipientId: ''
  });
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setIsAdmin(userData.admin === true);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          toast.error('Ошибка проверки прав доступа');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    if (!currentUser) {
      toast.error('Требуется авторизация');
      setSending(false);
      return;
    }

    if (!isAdmin) {
      toast.error('Недостаточно прав для отправки уведомлений');
      setSending(false);
      return;
    }

    try {
      const notificationData: NotificationData = {
        title: formData.title,
        message: formData.message,
        iconType: formData.iconType,
        recipientType: formData.recipientType,
        timestamp: Date.now(),
        status: 'sent'
      };

      if (formData.recipientType !== 'all') {
        notificationData.recipient = formData.recipientId;
      }

      const notificationsRef = ref(db, 'notifications');
      await push(notificationsRef, notificationData);

      toast.success('Уведомление успешно отправлено!');
      setFormData({
        title: '',
        message: '',
        iconType: 'play',
        recipientType: 'all',
        recipientId: ''
      });

    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast.error('Ошибка при отправке уведомления');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-white text-center p-4">Загрузка...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-white">Отправить уведомление</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Заголовок
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full bg-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Сообщение
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            className="w-full bg-gray-700 rounded-lg p-3 h-32 text-white focus:ring-2 focus:ring-red-500"
            required
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Тип иконки
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(iconTypes).map(([key, { icon: Icon, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({...formData, iconType: key as keyof typeof iconTypes})}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    formData.iconType === key 
                      ? `bg-${color}-500/20 ring-2 ring-${color}-500`
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  <Icon className={`text-${color}-500`} size={20} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Получатели
            </label>
            <select
              value={formData.recipientType}
              onChange={(e) => setFormData({
                ...formData, 
                recipientType: e.target.value as 'all' | 'email' | 'uuid'
              })}
              className="w-full bg-gray-700 rounded-lg p-3 text-white mb-2"
            >
              <option value="all">Все пользователи</option>
              <option value="email">По email</option>
              <option value="uuid">По UUID</option>
            </select>

            {formData.recipientType !== 'all' && (
              <input
                type="text"
                placeholder={
                  formData.recipientType === 'email' 
                    ? 'Введите email' 
                    : 'Введите UUID пользователя'
                }
                value={formData.recipientId}
                onChange={(e) => setFormData({...formData, recipientId: e.target.value})}
                className="w-full bg-gray-700 rounded-lg p-3 text-white"
                required
              />
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={sending || !isAdmin}
          className={`w-full ${
            sending || !isAdmin ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
          } text-white font-medium py-3 px-6 rounded-lg transition-colors`}
        >
          {sending ? 'Отправка...' : 'Отправить уведомление'}
        </button>

        {!isAdmin && (
          <p className="text-red-500 text-sm text-center">
            Требуются права администратора для отправки уведомлений
          </p>
        )}
      </form>
    </div>
  );
}