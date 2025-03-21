import React from 'react';
import { PlayIcon, InfoIcon } from 'lucide-react';
export function HeroSection() {
  return <div className="relative h-[70vh] bg-cover bg-center" style={{
    backgroundImage: 'url(https://i.ibb.co/fdkgYyfy/14-2025.png)'
  }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent">
        <div className="container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-2">Речь Посполитая</h1>
            <p className="text-xl mb-4">Скоро</p>
            <p className="text-gray-300 mb-8 text-lg">
              Учитель Физики Фокин, после увольнения из богатой школы из за его бедности уходит в направлении
              наркоторговли.
              На пути у них много преград. Великий спортик наркошопа Чеховой по кличке "Тонированный" мешает
              Фокину стать лучшим наркобороном. Не смотря на преграды Фокин открывает магазин "Речь посполитая"
              и огромную команду. С ней, они, уничтожив Чехову захватывают мир наркоторговли и мстят той самой школе.
            </p>
            <div className="flex space-x-4">
              {/* <button className="bg-white text-black px-8 py-3 rounded flex items-center hover:bg-gray-200 transition">
                <PlayIcon size={20} className="mr-2" />
                Play
              </button> */}
              <button className="bg-gray-600/70 text-white px-8 py-3 rounded flex items-center hover:bg-gray-600 transition">
                <InfoIcon size={20} className="mr-2" />
                Подробнее
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>;
}