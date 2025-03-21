import React from 'react';
import { FilterIcon } from 'lucide-react';
const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Western', 'Animation'];
export function Categories() {
  return <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700 transition">
          <FilterIcon size={20} />
          <span>Filter</span>
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {genres.map(genre => <div key={genre} className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-xl font-bold group-hover:scale-110 transition">
                {genre}
              </h3>
            </div>
          </div>)}
      </div>
    </div>;
}