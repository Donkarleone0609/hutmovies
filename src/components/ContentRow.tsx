import React from 'react';
import { Link } from 'react-router-dom';

type ContentItem = {
  id: number;
  title: string;
  image: string;
  type: 'movie' | 'tv' | 'tvShow';
};

type ContentRowProps = {
  title: string;
  items: ContentItem[];
};

export function ContentRow({ title, items }: ContentRowProps) {
  // Функция для преобразования типа контента в правильный путь
  const getContentPath = (type: string, id: number) => {
    if (type === 'tv') {
      return `/tvShow/${id}`;
    }
    return `/${type}/${id}`;
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {items.map((item) => (
          <Link 
            to={getContentPath(item.type, item.id)} 
            key={item.id} 
            className="relative group cursor-pointer"
          >
            <div className="aspect-[2/3] overflow-hidden rounded-md shadow-md">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-1.5">
              <h3 className="text-xs font-medium leading-tight line-clamp-2">{item.title}</h3>
              <p className="text-[10px] text-gray-300 capitalize">{item.type === 'tvShow' ? 'Сериал' : 'Фильм'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}