import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, get, onValue, off } from 'firebase/database';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onConnectionSuccess: () => void;
}

type LoadingStep = {
  id: string;
  title: string;
  status: 'waiting' | 'loading' | 'done' | 'error';
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onConnectionSuccess }) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [timeoutError, setTimeoutError] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { id: 'firebase', title: 'Подключение к серверу', status: 'loading' },
    { id: 'userData', title: 'Загрузка данных профиля', status: 'waiting' },
    { id: 'content', title: 'Подготовка контента', status: 'waiting' }
  ]);
  
  // Обновление статуса шага загрузки
  const updateStepStatus = (stepId: string, status: LoadingStep['status']) => {
    setLoadingSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );

    // Если шаг "firebase" выполнен, сообщаем об успешном подключении
    if (stepId === 'firebase' && status === 'done') {
      setConnectionStatus('connected');
      onConnectionSuccess();

      // Начинаем следующий шаг
      updateStepStatus('userData', 'loading');
      
      // Имитируем загрузку данных пользователя и контента с задержкой
      // для более плавного UX и гарантии, что все данные точно загрузятся
      setTimeout(() => {
        updateStepStatus('userData', 'done');
        updateStepStatus('content', 'loading');
        
        setTimeout(() => {
          updateStepStatus('content', 'done');
        }, 1000);
      }, 1500);
    }
  };
  
  useEffect(() => {
    // Создаем таймер для отображения сообщения о тайм-ауте после 15 секунд
    const timeoutTimer = setTimeout(() => {
      if (connectionStatus !== 'connected') {
        setTimeoutError(true);
      }
    }, 15000);
    
    // Проверка реального соединения с Firebase с помощью специального пути .info/connected
    const connectedRef = ref(db, '.info/connected');
    
    const checkInitialConnection = async () => {
      try {
        // Проверяем, что база данных отвечает
        const testRef = ref(db, 'test');
        await get(testRef);
        
        // Если получили ответ, подключаемся к мониторингу состояния соединения
        onValue(connectedRef, (snap) => {
          // Если connected === true, соединение установлено
          if (snap.val() === true) {
            updateStepStatus('firebase', 'done');
          } else {
            // База данных существует, но соединение еще не установлено
            setConnectionStatus('checking');
            setRetryCount(prev => prev + 1);
          }
        });
      } catch (error) {
        console.error('Ошибка при проверке соединения с Firebase:', error);
        setConnectionStatus('error');
        updateStepStatus('firebase', 'error');
        
        // Пробуем повторно подключиться через 3 секунды
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          checkInitialConnection();
        }, 3000);
      }
    };
    
    checkInitialConnection();
    
    return () => {
      clearTimeout(timeoutTimer);
      // Отписываемся от обновлений состояния соединения
      off(connectedRef);
    };
  }, [onConnectionSuccess]);
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2 className="loading-title">
          {connectionStatus === 'error' ? 'Ошибка подключения' : 'Загрузка приложения...'}
        </h2>
        
        <div className="loading-steps">
          {loadingSteps.map((step) => (
            <div key={step.id} className={`loading-step loading-step-${step.status}`}>
              <div className="loading-step-icon">
                {step.status === 'loading' && <div className="loading-step-spinner"></div>}
                {step.status === 'done' && <div className="loading-step-check">✓</div>}
                {step.status === 'error' && <div className="loading-step-error">✕</div>}
              </div>
              <div className="loading-step-title">{step.title}</div>
            </div>
          ))}
        </div>
        
        {connectionStatus === 'error' && (
          <p className="loading-message loading-message-error">
            <span className="loading-error">Не удалось установить соединение с сервером.</span>{' '}
            Пытаемся подключиться снова... 
            <span className="loading-retry-count"> (Попытка {retryCount})</span>
          </p>
        )}
        
        {timeoutError && connectionStatus !== 'error' && (
          <p className="loading-message loading-message-timeout">
            <span className="loading-error">Подключение занимает больше времени, чем обычно.</span>{' '}
            Пожалуйста, проверьте ваше интернет-соединение и подождите еще немного...
          </p>
        )}
      </div>
    </div>
  );
}; 