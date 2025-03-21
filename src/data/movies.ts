export interface Movie {
  id: number;
  title: string;
  image: string;
  type: 'movie' | 'tv';
  description: string;
  duration: string;
  rating: string;
  year: string;
  videoSrc: string;
  genre: string;
  director: string;
  cast?: string[];
}

export const movies: Movie[] = [
  {
    id: 1,
    title: 'Фальшивый ЦРУшник',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    type: 'movie',
    description: 'A mysterious stranger arrives in a remote mountain village and sets off a chain of events that will change the community forever. This dark thriller explores revenge, redemption and the secrets we keep.',
    duration: '5m',
    rating: '4.8',
    year: '2024',
    videoSrc: '1.mp4', // Используем путь к файлу вместо импорта
    genre: 'Корометражка',
    director: 'HUT Originals',
    cast: ['Петр Петров', 'Мария Иванова', 'Сергей Сидоров']
  },
  {
    id: 2,
    title: 'Речь Посполитая',
    image: 'https://i.ibb.co/fdkgYyfy/14-2025.png',
    type: 'movie',
    description: `Учитель физики Фокин, после увольнения из богатой школы из-за его бедности, уходит в наркоторговлю. На его пути встаёт великий спортик наркобизнеса Чехова по кличке "Тонированный", который мешает Фокину стать лучшим наркобароном.`,
    duration: 'Неизвестно',
    rating: 'Отсутствует',
    year: 'Планируется 2025',
    videoSrc: '',
    genre: 'Криминальная драма',
    director: 'HUT Originals',
    cast: ['Фокин Алексей', 'Чехова Лариса', 'Ширинов Андрей']
  }
];