import { MapPin, PlusCircle } from 'lucide-react';
import { type AiPlace } from '../hooks/useChatSocket';
import { Button } from './ui/button';
import { type Poi } from '../hooks/usePoiSocket';

interface RecommendedPlaceCardProps {
  place: AiPlace;
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
}

export function RecommendedPlaceCard({
  place,
  onAddPoiToItinerary,
  onCardClick,
}: RecommendedPlaceCardProps) {
  const handleAddClick = () => {
    // AiPlace를 Poi 타입과 유사하게 변환하여 전달
    const poiForModal: Poi = {
      id: place.id,
      placeId: place.id, // 추가 : placeId 필수로 변경되서
      placeName: place.title,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      categoryName: place.category,
      status: 'RECOMMENDED',
      // 나머지 Poi 필드는 Workspace의 모달 핸들러에서 처리하므로 필수값만 전달
      workspaceId: '',
      createdBy: '',
      sequence: 0,
      isPersisted: false,
    };
    onAddPoiToItinerary(poiForModal);
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3 text-gray-900 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
      onClick={() => onCardClick(place)}
    >
      {place.image_url && (
        <img
          src={place.image_url}
          alt={place.title}
          className="w-20 h-20 rounded-md object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <p className="font-semibold truncate text-sm">{place.title}</p>
          <div className="flex items-start gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p className="truncate">{place.address}</p>
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-blue-600 hover:text-blue-700"
            onClick={handleAddClick}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-xs">일정에 추가</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
