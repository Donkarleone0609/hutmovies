import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchIcon, BellIcon, UserIcon, MenuIcon, XIcon, SettingsIcon } from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';
import { SearchPanel } from './search/SearchPanel';
import { Modal } from './ui/Modal';
import { ProfileSettings } from './settings/ProfileSettings';
import { AppSettings } from './settings/AppSettings';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';
import { toast } from 'react-toastify';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      setIsEmailVerified(loggedIn ? user!.emailVerified : false);
      setShowProfileSettings(false);
      setShowAppSettings(false);

      if (loggedIn) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          setIsAdmin(snapshot.exists() && snapshot.val().admin === true);
        } catch (error) {
          console.error('Ошибка проверки прав администратора:', error);
        }

        if (!user?.emailVerified) {
          navigate('/verify-email-notice');
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleProfileClick = () => {
    if (!isLoggedIn || !isEmailVerified) {
      navigate('/signup');
    } else {
      setShowProfileSettings(true);
    }
  };

  return (
    <>
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="text-red-600 font-bold text-2xl mr-8">
                HUT MOVIES
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link to="/" className="text-white hover:text-red-500 transition-colors">
                  Home
                </Link>
                <Link to="/categories" className="text-gray-300 hover:text-red-500 transition-colors">
                  Movies
                </Link>
                <Link to="/categories?type=tv" className="text-gray-300 hover:text-red-500 transition-colors">
                  TV Shows
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    Админ-панель
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-300 hover:text-white" onClick={() => setShowSearch(true)}>
                <SearchIcon size={20} />
              </button>
              <div className="relative">
                <button className="text-gray-300 hover:text-white" onClick={() => setShowNotifications(!showNotifications)}>
                  <BellIcon size={20} />
                  <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-2 h-2" />
                </button>
                {showNotifications && <div className="absolute right-0 mt-2 z-50">
                    <NotificationsPanel onClose={() => setShowNotifications(false)} />
                  </div>}
              </div>
              <button 
                className="text-gray-300 hover:text-white" 
                onClick={handleProfileClick}
              >
                <UserIcon size={20} />
              </button>
              <button 
                className="text-gray-300 hover:text-white" 
                onClick={() => isLoggedIn && isEmailVerified ? setShowAppSettings(true) : navigate('/signup')}
              >
                <SettingsIcon size={20} />
              </button>
              <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
              </button>
            </div>
          </div>
          {isMenuOpen && <div className="md:hidden mt-4 pb-4">
              <div className="flex flex-col space-y-4">
                <Link to="/" className="text-white hover:text-red-500 transition-colors">
                  Home
                </Link>
                <Link to="/categories" className="text-gray-300 hover:text-red-500 transition-colors">
                  Movies
                </Link>
                <Link to="/categories?type=tv" className="text-gray-300 hover:text-red-500 transition-colors">
                  TV Shows
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    Админ-панель
                  </Link>
                )}
              </div>
            </div>}
        </div>
      </nav>
      
      <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
      
      {isLoggedIn && isEmailVerified && (
        <>
          <Modal isOpen={showProfileSettings} onClose={() => setShowProfileSettings(false)} title="Profile Settings">
            <ProfileSettings />
          </Modal>
          <Modal isOpen={showAppSettings} onClose={() => setShowAppSettings(false)} title="App Settings">
            <AppSettings />
          </Modal>
        </>
      )}
    </>
  );
}