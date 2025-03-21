import React from 'react';
export function LoadingCard() {
  return <div className="animate-pulse">
      <div className="aspect-[2/3] bg-gray-800 rounded-md overflow-hidden" />
      <div className="mt-2 h-4 bg-gray-800 rounded w-3/4" />
      <div className="mt-1 h-3 bg-gray-800 rounded w-1/2" />
    </div>;
}