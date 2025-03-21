import React, { useState, useEffect } from 'react';
import { Bell, Video, Download } from 'lucide-react';
import { auth, db } from '../../firebase';
import { ref, get, set, update } from 'firebase/database';
import { toast } from 'react-toastify';

interface UserSettings {
  notifications: boolean;
  autoplayNext: boolean;
  autoDownload: boolean;
}

export function AppSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: false,
    autoplayNext: true,
    autoDownload: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.error('Пользователь не авторизован');
          setLoading(false);
          return;
        }

        const userSettingsRef = ref(db, `users/${currentUser.uid}/settings`);
        const snapshot = await get(userSettingsRef);

        if (snapshot.exists()) {
          const userSettings = snapshot.val();
          setSettings({
            notifications: userSettings.notifications === true,
            autoplayNext: userSettings.autoplayNext !== false,
            autoDownload: userSettings.autoDownload === true
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки настроек пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, []);

  const handleSettingChange = async (settingName: keyof UserSettings, value: boolean) => {
    try {
      setSaving(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error('Пользователь не авторизован');
        return;
      }

      const updatedSettings = {
        ...settings,
        [settingName]: value
      };

      setSettings(updatedSettings);

      const userSettingsRef = ref(db, `users/${currentUser.uid}/settings`);
      await update(userSettingsRef, { [settingName]: value });

      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-400">Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-sm text-gray-400">
                Get notified about new releases
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Autoplay Next Episode</h3>
              <p className="text-sm text-gray-400">
                Automatically play next episode
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.autoplayNext}
              onChange={(e) => handleSettingChange('autoplayNext', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download size={20} className="text-gray-400" />
            <div>
              <h3 className="font-medium">Auto Download</h3>
              <p className="text-sm text-gray-400">
                Download episodes for offline viewing
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.autoDownload}
              onChange={(e) => handleSettingChange('autoDownload', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}