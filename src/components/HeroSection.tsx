import React from 'react';
import { PlayIcon, InfoIcon } from 'lucide-react';
export function HeroSection() {
  return <div className="relative h-[70vh] bg-cover bg-center" style={{
    backgroundImage: 'url(https://i.ibb.co/nNckrfrB/faslh-TSRU.png)'
  }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent">
        <div className="container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-2">Фальшивый ЦРУшник 2</h1>
            <p className="text-xl mb-4">2025</p>
            <p className="text-gray-300 mb-8 text-lg">
              Мистер Валерий находит бомжа с формой ЦРУ и забирает ее, что бы пользоваться в своих целях
            </p>
            <div className="flex space-x-4">
              <button className="bg-white text-black px-8 py-3 rounded flex items-center hover:bg-gray-200 transition">
                <PlayIcon size={20} className="mr-2" />
                Смотреть
              </button>
{/*               <button className="bg-gray-600/70 text-white px-8 py-3 rounded flex items-center hover:bg-gray-600 transition">
                <InfoIcon size={20} className="mr-2" />
                Подробнее
              </button> */}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
