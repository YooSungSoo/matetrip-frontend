import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlaceCard } from './PlaceCard';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import { type PlaceDto } from '../types/place';

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
}

export function PlaceRecommendationSection({ onPlaceClick }: PlaceRecommendationSectionProps) {
  const [places, setPlaces] = useState<PlaceDto[]>([]);
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
              limit: 3,
            },
          }
        );
        
        // Convert to PlaceDto format
        const placesData: PlaceDto[] = response.data.map((item) => {
          return {
            id: item.id,
            category: item.category as any, // CategoryCode
            title: item.title,
            address: item.address,
            summary: item.summary,
            image_url: item.image_url,
            longitude: item.longitude,
            latitude: item.latitude,
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

  const handlePlaceClick = (placeId: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    const place = places.find(p => p.id === placeId);
    if (place) {
      onPlaceClick(placeId, place);
    }
  };

  const handleAllViewClick = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    // TODO: Navigate to place recommendation page when implemented
  };

  return (
    <section className="mb-8 md:mb-10 lg:mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h2 className="text-xl md:text-xl font-bold text-gray-900">
            여기 갈래? 말래?
          </h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            MateTrip AI가 추천하는 성향기반 장소추천
          </p>
        </div>
        <Button
          onClick={handleAllViewClick}
          variant="ghost"
          disabled={true}
          className="text-sm self-start sm:self-auto"
        >
          All View
        </Button>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              로그인하기
            </Button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="w-full aspect-[203/241] bg-gray-200 rounded-[16px] animate-pulse"
            />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          추천할 장소가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onClick={handlePlaceClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
