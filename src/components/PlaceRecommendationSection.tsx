import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { RecommendedPlaceCard } from './RecommendedPlaceCard';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import { type PlaceDto } from '../types/place';
import { ReviewablePlacesCarousel } from './ReviewablePlacesCarousel';
import { Lightbulb } from 'lucide-react';
import type { AiPlace } from '../hooks/useChatSocket'; // Import type AiPlace
import type { Poi } from '../hooks/usePoiSocket'; // Import type Poi

interface PlaceRecommendationSectionProps {
  onPlaceClick: (placeId: string, place: PlaceDto) => void;
}

interface BehaviorRecommendationResponse {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string;
  image_url?: string;
  longitude: number;
  latitude: number;
  reason: {
    message: string;
    referencePlace: {
      id: string;
      title: string;
    };
  };
}

interface PlaceWithReason extends PlaceDto {
  recommendationReason?: BehaviorRecommendationResponse['reason']; // reason 객체 전체를 저장
}

export function PlaceRecommendationSection({
  onPlaceClick,
}: PlaceRecommendationSectionProps) {
  const [places, setPlaces] = useState<PlaceWithReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isLoggedIn || !user?.userId) {
      setIsLoading(false);
      return;
    }

    const fetchBehaviorPlaces = async () => {
      setIsLoading(true);
      try {
        const response = await client.get<BehaviorRecommendationResponse[]>(
          '/places/recommendation/behavior',
          {
            params: {
              userId: user.userId,
              limit: 5,
            },
          }
        );

        const placesData: PlaceWithReason[] = response.data.map((item) => {
          return {
            id: item.id,
            category: item.category as any,
            title: item.title,
            address: item.address,
            summary: item.summary,
            image_url: item.image_url,
            longitude: item.longitude,
            latitude: item.latitude,
            recommendationReason: item.reason,
          };
        });

        setPlaces(placesData);
      } catch (error) {
        console.error('Failed to fetch place recommendations:', error);
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBehaviorPlaces();
  }, [isAuthLoading, isLoggedIn, user?.userId]);

  const handlePlaceClick = (placeId: string, place: PlaceDto) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    onPlaceClick(placeId, place);
  };

  // Placeholder for onAddPoiToItinerary, as this section doesn't directly add to itinerary
  const handleAddPoiToItinerary = (poi: Poi) => {
    console.log('POI added to itinerary (from PlaceRecommendationSection):', poi);
    // Implement actual logic if needed
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-xl font-bold text-gray-900">
              여기 갈래? 말래?
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            MateTrip AI가 추천하는 성향 기반 장소 추천
          </p>
        </div>
      </div>

      {!isLoggedIn ? (
        <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-4 md:p-6 border border-blue-100">
          <div className="text-center">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
              로그인이 필요합니다
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">
              당신의 취향에 맞는 장소를 추천받으려면 로그인하세요
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-primary hover:bg-primary-strong text-primary-foreground"
            >
              로그인하기
            </Button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="w-full h-64 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          추천할 장소가 없습니다.
        </div>
      ) : (
        <ReviewablePlacesCarousel>
          {places.map((place) => (
            <RecommendedPlaceCard
              key={place.id}
              place={{
                id: place.id,
                title: place.title,
                address: place.address,
                summary: place.summary,
                imageUrl: place.image_url, // Map image_url to imageUrl
                longitude: place.longitude,
                latitude: place.latitude,
                category: place.category as AiPlace['category'], // Cast to AiPlace's category type
                recommendationReason: place.recommendationReason?.message, // Map message
              }}
              onAddPoiToItinerary={handleAddPoiToItinerary}
              onCardClick={() => {
                handlePlaceClick(place.id, place);
              }}
              showAddButton={false} // '일정에 추가' 버튼을 숨깁니다.
            />
          ))}
        </ReviewablePlacesCarousel>
      )}
    </section>
  );
}
