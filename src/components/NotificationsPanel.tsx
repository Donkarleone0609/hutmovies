import React, { useState, useEffect } from 'react';
import { BellIcon, CheckIcon, XIcon } from 'lucide-react';
import { auth, db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { User } from 'firebase/auth';
import { toast } from 'react-toastify';

const iconTypes = {
  play: { color: 'red' },
  star: { color: 'yellow' },
  download: { color: 'green' },
  bell: { color: 'blue' }
};

interface Notification {
  id: string;
  title: string;
  message: string;
  iconType: keyof typeof iconTypes;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = ref(db, 'notifications');
    const unsubscribe = onValue(notificationsRef, async (snapshot) => {
      const notificationsData = snapshot.val();
      const formattedNotifications: Notification[] = [];
      const updates: Record<string, any> = {};

      for (const id in notificationsData) {
        const notification = notificationsData[id];
        
        let shouldShow = false;
        switch (notification.recipientType) {
          case 'all':
            shouldShow = true;
            break;
          case 'email':
            shouldShow = notification.recipient === currentUser.email;
            break;
          case 'uuid':
            shouldShow = notification.recipient === currentUser.uid;
            break;
        }

        if (shouldShow && notification.status !== 'read') {
          // Автоматически обновляем статус sent -> delivered
          if (notification.status === 'sent') {
            updates[`${id}/status`] = 'delivered';
          }

          formattedNotifications.push({
            id,
            ...notification,
            status: notification.status === 'sent' ? 'delivered' : notification.status
          });
        }
      }

      // Пакетное обновление статусов
      if (Object.keys(updates).length > 0) {
        try {
          await update(ref(db, 'notifications'), updates);
        } catch (error) {
          console.error('Error updating notifications statuses:', error);
        }
      }

      formattedNotifications.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(formattedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = ref(db, `notifications/${notificationId}`);
      await update(notificationRef, { status: 'read' });
    } catch (error) {
      toast.error('Ошибка обновления уведомления');
      console.error('Error marking notification as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      const updates: { [key: string]: any } = {};
      notifications.forEach(notification => {
        updates[`notifications/${notification.id}/status`] = 'read';
      });
      await update(ref(db), updates);
      onClose(); // Закрываем панель после очистки
    } catch (error) {
      toast.error('Ошибка очистки уведомлений');
      console.error('Error clearing notifications:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Уведомления</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearAll}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Очистить все"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">Нет новых уведомлений</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 text-${iconTypes[notification.iconType].color}-500 mt-1`}>
                  <BellIcon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">{notification.title}</h4>
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-gray-400 hover:text-green-500 transition-colors"
                      title="Пометить как прочитанное"
                    >
                      <CheckIcon size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(notification.timestamp).toLocaleDateString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}