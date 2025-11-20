import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Loader2 } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { InspirationCard } from './InspirationCard';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';

// 백엔드 응답 타입 (GetPopularPlacesResDto)
interface PopularPlaceResponse {
  addplace_id: string;
  title: string;
  address: string;
  image_url?: string;
  summary?: string;
  latitude: number;
  longitude: number;
}

// 프론트엔드 내부 타입
interface Place {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
  summary?: string;
  latitude: number;
  longitude: number;
  badgeText?: string;
}

interface InspirationPageProps {
  onViewAccommodation?: (accommodationId: string) => void;
}

export function InspirationPage({ onViewAccommodation }: InspirationPageProps) {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [_searchQuery, setSearchQuery] = useState('');
  const { isAuthLoading } = useAuthStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // 백엔드 응답을 프론트엔드 타입으로 변환
  const transformResponse = (
    data: PopularPlaceResponse[],
    startIndex: number
  ): Place[] => {
    return data.map((item, index) => ({
      id: item.addplace_id,
      title: item.title,
      address: item.address,
      imageUrl: item.image_url,
      summary: item.summary,
      latitude: item.latitude,
      longitude: item.longitude,
      badgeText: `현재 가장 인기있는 장소 TOP. ${startIndex + index + 1}`,
    }));
  };

  // 초기 데이터 로드
  const fetchInitialPlaces = useCallback(async () => {
    if (isAuthLoading) return;

    setIsLoading(true);
    setPage(1);
    setHasMore(true);

    try {
      const response = await client.get<PopularPlaceResponse[]>(
        '/places/popular',
        {
          params: {
            page: 1,
            limit: ITEMS_PER_PAGE,
          },
        }
      );

      const transformedData = transformResponse(response.data, 0);
      setPlaces(transformedData);

      // 받아온 데이터가 limit보다 적으면 더 이상 데이터가 없음
      if (response.data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch popular places:', error);
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  // 추가 데이터 로드 (무한 스크롤)
  const fetchMorePlaces = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const response = await client.get<PopularPlaceResponse[]>(
        '/places/popular',
        {
          params: {
            page: nextPage,
            limit: ITEMS_PER_PAGE,
          },
        }
      );

      const transformedData = transformResponse(response.data, places.length);
      setPlaces((prev) => [...prev, ...transformedData]);
      setPage(nextPage);

      if (response.data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch more places:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, places.length]);

  // 초기 로드
  useEffect(() => {
    fetchInitialPlaces();
  }, [fetchInitialPlaces]);

  // Intersection Observer 설정 (무한 스크롤)
  useEffect(() => {
    if (isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchMorePlaces();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore, isLoadingMore, fetchMorePlaces]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: 검색 API 구현 시 활성화
    // 현재는 인기 장소 목록만 표시
    console.log('검색어:', query);
  };

  const handleCardClick = (place: Place) => {
    if (onViewAccommodation) {
      onViewAccommodation(place.id);
    }

    console.log('전송되니?');

    // InspirationDetail 페이지로 라우팅 (장소 정보 전달)
    navigate(`/inspiration/${place.id}`, {
      state: {
        title: place.title,
        address: place.address,
        summary: place.summary,
        imageUrl: place.imageUrl,
      },
    });
  };

  return (
    <div className="bg-white min-h-screen">
      {/* 모바일 반응형 컨테이너 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16 py-6 sm:py-8 md:py-12">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-2">
            당신을 위한 AI 장소추천
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            인기 있는 장소를 둘러보고 여행 영감을 얻으세요.
          </p>

          {/* Search Bar */}
          <div className="w-full">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        {/* Places Section */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Compass className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isLoading ? (
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              ) : (
                '인기 장소'
              )}
            </h2>
          </div>

          {isLoading ? (
            // 로딩 스켈레톤 - 모바일 반응형 그리드
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 h-[252px] rounded-2xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              표시할 장소가 없습니다.
            </div>
          ) : (
            <>
              {/* 장소 카드 그리드 - 모바일 반응형 */}
              <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                {places.map((place) => (
                  <InspirationCard
                    key={place.id}
                    imageUrl={place.imageUrl}
                    badgeText={place.badgeText}
                    title={place.title}
                    address={place.address}
                    onClick={() => handleCardClick(place)}
                  />
                ))}
              </div>

              {/* 무한 스크롤 로딩 인디케이터 */}
              <div ref={loadMoreRef} className="mt-8 flex justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>더 불러오는 중...</span>
                  </div>
                )}
                {!hasMore && places.length > 0 && (
                  <p className="text-gray-400 text-sm">
                    모든 장소를 불러왔습니다.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
