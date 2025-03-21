import video1 from '../movies/1.mp4';

export interface TVShow {
  id: number;
  type: 'tv';
  title: string;
  image: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  director: string;
  cast?: string[]; // Явное объявление опционального поля
  seasons: {
    number: number;
    episodes: {
      id: number;
      title: string;
      duration: string;
      videoSrc: string;
    }[];
  }[];
}

export const tvShows: TVShow[] = [
  {
    id: 1,
    type: 'tv',
    title: 'Речь Посполитая: сериал',
    image: 'https://i.ibb.co/fdkgYyfy/14-2025.png',
    description: 'Описание сериала...',
    rating: '8.5',
    year: '2023',
    genre: 'Драма',
    director: 'Режиссер',
    cast: ['Актер 1', 'Актер 2'], // Добавляем поле cast
    seasons: [
      {
        number: 1,
        episodes: [
          {
            id: 1,
            title: 'Пилотная серия',
            duration: '45m',
            videoSrc: video1
          },
          {
            id: 2,
            title: 'Пилотная sсерия',
            duration: '42m',
            videoSrc: video1
          }
        ]
      }
    ]
  }
];