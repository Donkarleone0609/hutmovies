import React, { useState, useEffect } from 'react';
import { UserIcon, CameraIcon, SaveIcon, LogOutIcon, MailIcon, LockIcon, CreditCardIcon } from 'lucide-react';
import { auth } from '../../firebase';
import { 
  updateProfile,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  User
} from 'firebase/auth';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

export function ProfileSettings() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordForEmailChange, setPasswordForEmailChange] = useState('');
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    email: false
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading({ ...loading, profile: true });

    try {
      await updateProfile(user, { displayName });
      toast.success('Профиль успешно обновлен');
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setLoading({ ...loading, profile: false });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error('Email пользователя не найден');
      return;
    }

    setLoading({ ...loading, password: true });
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Письмо для сброса пароля отправлено на вашу почту');
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setLoading({ ...loading, password: false });
    }
  };

  const handleEmailChange = async () => {
    if (!user || !newEmail) {
      toast.error('Введите новый email');
      return;
    }

    setLoading({ ...loading, email: true });
    try {
      const credential = EmailAuthProvider.credential(
        user.email || '',
        passwordForEmailChange
      );
      await reauthenticateWithCredential(user, credential);
      
      await verifyBeforeUpdateEmail(user, newEmail, {
        url: window.location.href,
        handleCodeInApp: false
      });

      toast.success('Письмо для подтверждения отправлено на новый адрес');
      setNewEmail('');
      setPasswordForEmailChange('');
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setLoading({ ...loading, email: false });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Вы успешно вышли из системы');
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-full h-full rounded-full" 
              />
            ) : (
              <UserIcon size={48} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Форма обновления профиля */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <form className="space-y-4" onSubmit={handleProfileUpdate}>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Имя
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:border-red-500"
              placeholder="Ваше имя"
            />
          </div>

          <button
            type="submit"
            disabled={loading.profile}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition flex items-center justify-center disabled:opacity-50"
          >
            <SaveIcon size={18} className="mr-2" />
            {loading.profile ? 'Сохранение...' : 'Обновить профиль'}
          </button>
        </form>
      </div>

      {/* Блок смены почты */}
      <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Новый email
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:border-red-500"
            placeholder="Новый email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Текущий пароль
          </label>
          <input
            type="password"
            value={passwordForEmailChange}
            onChange={(e) => setPasswordForEmailChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:border-red-500"
            placeholder="Введите текущий пароль"
          />
        </div>

        <button
          onClick={handleEmailChange}
          disabled={loading.email}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition flex items-center justify-center disabled:opacity-50"
        >
          <MailIcon size={18} className="mr-2" />
          {loading.email ? 'Отправка...' : 'Поменять почту'}
        </button>
      </div>

      {/* Блок истории транзакций */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <Link 
          to="/transactions"
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition flex items-center justify-center"
        >
          <CreditCardIcon size={18} className="mr-2" />
          История транзакций
        </Link>
      </div>

      {/* Блок сброса пароля */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <button
          onClick={handlePasswordReset}
          disabled={loading.password}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition flex items-center justify-center disabled:opacity-50"
        >
          <LockIcon size={18} className="mr-2" />
          {loading.password ? 'Отправка...' : 'Сбросить пароль'}
        </button>
      </div>

      {/* Кнопка выхода */}
      <button
        onClick={handleSignOut}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md transition flex items-center justify-center mt-4"
      >
        <LogOutIcon size={18} className="mr-2" />
        Выйти из аккаунта
      </button>
    </div>
  );
}