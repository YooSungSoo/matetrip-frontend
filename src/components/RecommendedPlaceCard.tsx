import { MapPin, Lightbulb } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface RecommendedPlaceCardProps {
  imageUrl?: string;
  title: string;
  category?: string;
  address: string;
  recommendationReason?: string;
  onClick?: () => void;
}

export function RecommendedPlaceCard({
  imageUrl,
  title,
  category,
  address,
  recommendationReason,
  onClick,
}: RecommendedPlaceCardProps) {
  return (
    <div
      className="group flex flex-col w-80 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg mr-4 flex-shrink-0"
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-300 overflow-hidden w-full">
        <img
          src={imageUrl || 'https://via.placeholder.com/300x200'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-lg font-bold text-gray-800 leading-snug truncate">
          {title}
        </h3>
        <div className="flex flex-col gap-1.5 text-sm text-gray-600 mt-2">
          {category && (
            <div className="flex items-center gap-1.5">
              <CategoryIcon category={category} className="w-4 h-4 text-gray-400" />
              <span>{category}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{address}</span>
          </div>
        </div>
        {recommendationReason && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-start gap-2 text-sm text-purple-700 h-10 overflow-hidden">
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed break-keep">{recommendationReason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
