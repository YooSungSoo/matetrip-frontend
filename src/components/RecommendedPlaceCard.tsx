import { MapPin, Lightbulb } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import type { AiPlace } from '../hooks/useChatSocket';
import type { Poi } from '../hooks/usePoiSocket'; // Poi 타입 임포트

interface RecommendedPlaceCardProps {
  place: AiPlace;
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: Pick<Poi, 'longitude' | 'latitude'>) => void;
  showAddButton?: boolean; // '일정에 추가' 버튼 표시 여부 prop 추가
}

export function RecommendedPlaceCard({
  place,
  onAddPoiToItinerary,
  onCardClick,
  showAddButton = true, // 기본값은 true로 설정
}: RecommendedPlaceCardProps) {
  const {
    imageUrl,
    title,
    category,
    address,
    recommendationReason,
    latitude,
    longitude,
    id,
  } = place;

  const handleCardClick = () => {
    onCardClick({ latitude, longitude });
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddPoiToItinerary({
      id,
      placeName: title,
      latitude,
      longitude,
      address,
      categoryName: category, // 'category' 대신 'categoryName' 사용
      // 필요한 다른 Poi 속성들을 여기에 추가
      workspaceId: '', // 임시 값, 실제 사용 시 적절한 값으로 대체 필요
      createdBy: '', // 임시 값, 실제 사용 시 적절한 값으로 대체 필요
      placeId: id, // AiPlace의 id를 placeId로 사용
      status: 'RECOMMENDED', // 기본 상태
      sequence: 0, // 기본 순서
      isPersisted: false, // 기본 값
    });
  };

  return (
    <div
      className="group flex flex-col w-80 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg mr-4 flex-shrink-0"
      onClick={handleCardClick}
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
              <CategoryIcon
                category={category}
                className="w-4 h-4 text-gray-400"
              />
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
            <div className="flex items-start gap-2 text-sm text-primary h-10 overflow-hidden">
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed break-keep">
                {recommendationReason}
              </p>
            </div>
          </div>
        )}
        {showAddButton && ( // showAddButton이 true일 때만 버튼 렌더링
          <button
            onClick={handleAddClick}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            일정에 추가
          </button>
        )}
      </div>
    </div>
  );
}
