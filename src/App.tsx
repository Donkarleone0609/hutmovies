import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { MoviePage } from './pages/MoviePage';
import { Categories } from './pages/Categories';
import { Footer } from './components/Footer';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { SignUpPage } from './pages/SignUpPage';
import { VerifyEmailNotice } from './pages/VerifyEmailNotice';
import { EmailVerificationErrorPage } from './pages/EmailVerificationErrorPage';
import { SignInPage } from './pages/SignInPage';
import { TVShowPage } from './pages/TVShowPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ToastContainer } from 'react-toastify';
import { PlayerPage } from './pages/PlayerPage';
import 'react-toastify/dist/ReactToastify.css';
import { auth, db } from './firebase';
import { ref, get, update, onValue } from 'firebase/database';
import { NotificationSender } from './components/NotificationSender';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { MediaUploadPage } from './pages/ContentPublisher';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { episodeCheckService } from './utils/episodeCheckService';
import { EpisodeNotificationsPage } from './pages/EpisodeNotificationsPage';
import { SeriesListPage } from './pages/SeriesListPage';
import { ContentEditorPage } from './pages/ContentEditor';
import { AdminDashboard } from './pages/AdminDashboard';
import { MovieListPage } from './pages/MovieListPage';
import { MovieEditorPage } from './pages/MovieEditor';
import { RoulettePage } from './pages/RoulettePage';
import { UserBalanceManagementPage } from './pages/UserBalanceManagementPage';
import { RouletteManagerPage } from './pages/RouletteManagerPage';
import { LoadingScreen } from './components/LoadingScreen';

const manifestUrl = 'https://orange-used-monkey-420.mypinata.cloud/ipfs/bafkreic4ojkgcphtpev5w3i7mpuqf6h5ofh3llxpwcq2oupr5nb5zowvde';

export function App() {
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [isContentPreloaded, setIsContentPreloaded] = useState(false);
  const [appFullyLoaded, setAppFullyLoaded] = useState(false);

  // Проверка соединения с Firebase
  useEffect(() => {
    const checkFirebaseConnection = async () => {
      try {
        // Проверяем, что Firebase инициализирован и мы можем получить доступ к данным
        const testRef = ref(db, 'settings');
        await get(testRef);
        
        // Если получили ответ без ошибок, считаем что подключение установлено
        setIsFirebaseConnected(true);
        setIsInitializing(false);
      } catch (error) {
        console.error('Firebase connection test failed:', error);
        setIsInitializing(false);
      }
    };
    
    checkFirebaseConnection();
  }, []);

  // Предзагрузка основных данных контента
  useEffect(() => {
    if (!isFirebaseConnected) return;

    const preloadContent = async () => {
      try {
        // Загружаем базовые данные для фильмов и сериалов, чтобы они были в кэше
        const moviesRef = ref(db, 'movies');
        const tvShowsRef = ref(db, 'tvShows');
        
        // Запускаем загрузку параллельно
        await Promise.all([
          get(moviesRef),
          get(tvShowsRef)
        ]);
        
        setIsContentPreloaded(true);
      } catch (error) {
        console.error('Error preloading content:', error);
        // Даже если произошла ошибка, все равно продолжаем и считаем, что контент предзагружен
        setIsContentPreloaded(true);
      }
    };

    preloadContent();
  }, [isFirebaseConnected]);

  // Проверка авторизации пользователя и загрузка данных пользователя
  useEffect(() => {
    if (!isFirebaseConnected) return;

    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const subscription = userData.subscription;
            
            if (subscription && subscription.status === 'active') {
              const currentTime = Date.now();
              
              // Проверяем срок действия подписки
              if (subscription.endDate < currentTime) {
                await update(ref(db, `users/${user.uid}/subscription`), {
                  status: 'expired'
                });
                console.log('Subscription expired');
              }
            }
            
            // Запускаем сервис проверки новых серий только для администраторов
            const adminRef = ref(db, `users/${user.uid}/roles/admin`);
            const adminSnapshot = await get(adminRef);
            
            if (adminSnapshot.exists()) {
              // Запуск сервиса с интервалом в 12 часов
              episodeCheckService.startService();
            }
          }
          
          // Помечаем, что данные пользователя загружены
          setIsUserDataLoaded(true);
        } catch (error) {
          console.error('Subscription check error:', error);
          // Даже при ошибке считаем, что данные загружены, чтобы не блокировать интерфейс
          setIsUserDataLoaded(true);
        }
      } else {
        // Если пользователь не авторизован, то нет данных для загрузки
        setIsUserDataLoaded(true);
      }
    });

    return () => {
      unsubscribe();
      // Останавливаем сервис при размонтировании компонента
      episodeCheckService.stopService();
    };
  }, [isFirebaseConnected]);

  // Эффект для отслеживания полной загрузки и добавления дополнительной задержки
  useEffect(() => {
    // Проверяем, все ли данные загружены
    const isAppReady = 
      isFirebaseConnected && 
      !isInitializing && 
      isUserDataLoaded && 
      isContentPreloaded;
    
    if (isAppReady) {
      // Добавляем небольшую задержку перед отображением приложения,
      // чтобы компоненты успели получить данные и корректно отрендериться
      const timer = setTimeout(() => {
        setAppFullyLoaded(true);
      }, 1500); // Задержка в 1.5 секунды для гарантии загрузки
      
      return () => clearTimeout(timer);
    }
  }, [isFirebaseConnected, isInitializing, isUserDataLoaded, isContentPreloaded]);

  const handleConnectionSuccess = () => {
    setIsFirebaseConnected(true);
  };

  // Если идет инициализация или не все данные загружены, или нужна доп. задержка, показываем экран загрузки
  if (!appFullyLoaded) {
    return <LoadingScreen onConnectionSuccess={handleConnectionSuccess} />;
  }

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <BrowserRouter>
        <ToastContainer position="bottom-right" theme="dark" />
        <div className="bg-gray-900 text-white min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-email/error" element={<EmailVerificationErrorPage />} />
            <Route path="/verify-email/notice" element={<VerifyEmailNotice />} />
            <Route path="/movie/:id" element={<MoviePage />} />
            <Route path="/tvShow/:id" element={<TVShowPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/watch/:id" element={<PlayerPage />} />
            <Route path="/transactions" element={<TransactionHistoryPage />} />
            <Route path="/roulette" element={<RoulettePage />} />
            <Route path="*" element={<NotFoundPage />} />
            {/* Защищенные админские роуты */}
            <Route element={<AdminProtectedRoute />}>
              <Route 
                path="/admin"
                element={<AdminDashboard />}
              />
              <Route 
                path="/admin/notifications" 
                element={<NotificationSender />} 
              />
              <Route 
                path="/admin/add-media" 
                element={<MediaUploadPage />} 
              />
              <Route 
                path="/admin/episode-notifications" 
                element={<EpisodeNotificationsPage />} 
              />
              <Route 
                path="/admin/series-list" 
                element={<SeriesListPage />} 
              />
              <Route 
                path="/admin/edit-series/:id" 
                element={<ContentEditorPage />} 
              />
              <Route 
                path="/admin/movies-list" 
                element={<MovieListPage />} 
              />
              <Route 
                path="/admin/edit-movie/:id" 
                element={<MovieEditorPage />} 
              />
              <Route 
                path="/admin/user-balances" 
                element={<UserBalanceManagementPage />} 
              />
              <Route 
                path="/admin/roulette-manager" 
                element={<RouletteManagerPage />} 
              />
            </Route>
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}

export default App;