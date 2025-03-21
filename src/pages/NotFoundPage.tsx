// pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Страница не найдена</h1>
        <p className="text-xl mb-8">Запрошенная страница не существует</p>
        <Link 
          to="/" 
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg 
                    transition-all duration-300 inline-block"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}