import React, { useEffect } from 'react';
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
import { ref, get, update } from 'firebase/database';
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

const manifestUrl = 'https://orange-used-monkey-420.mypinata.cloud/ipfs/bafkreic4ojkgcphtpev5w3i7mpuqf6h5ofh3llxpwcq2oupr5nb5zowvde';

export function App() {
  useEffect(() => {
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
        } catch (error) {
          console.error('Subscription check error:', error);
        }
      }
    });

    return () => {
      unsubscribe();
      // Останавливаем сервис при размонтировании компонента
      episodeCheckService.stopService();
    };
  }, []);

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
            </Route>
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}

export default App;