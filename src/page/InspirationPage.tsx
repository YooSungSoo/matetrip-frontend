import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Loader2, Search } from 'lucide-react';
import { InspirationCard } from '../components/InspirationCard';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import PageContainer from '../components/PageContainer';

// 백엔드 응답 타입 (GetPlacesResDto)
interface GetPlacesResDto {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string;
  image_url?: string;
  longitude: number;
  latitude: number;
  popularityScore?: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');
  const { isAuthLoading } = useAuthStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // 백엔드 응답을 프론트엔드 타입으로 변환
  const transformResponse = (
    data: any[],
    startIndex: number
  ): Place[] => {
    return data.map((item, index) => ({
      id: item.place_id || item.addplace_id || item.id,
      title: item.title,
      address: item.address,
      imageUrl: item.image_url,
      summary: item.summary,
      latitude: item.latitude,
      longitude: item.longitude,
      badgeText: `현재 가장 인기있는 장소 TOP. ${startIndex + index + 1}`,
    }));
  };

  const fetchPlaces = useCallback(
    async (query?: string, isNewSearch = false) => {
      if (isNewSearch) {
        setIsLoading(true);
        setPage(1);
        setHasMore(true);
        setPlaces([]);
        setCurrentSearch(query || '');
      } else {
        setIsLoadingMore(true);
      }

      const currentPage = isNewSearch ? 1 : page + 1;

      // 검색 API는 페이지네이션을 지원하지 않으므로 word 파라미터만 전달
      const endpoint = query ? '/places/search/detail' : '/places/popular';
      const params = query
        ? { word: query }
        : { page: currentPage, limit: ITEMS_PER_PAGE };

      try {
        const response = await client.get<GetPlacesResDto[]>(endpoint, {
          params,
        });

        console.log('=== Backend Response Debug ===');
        console.log('Endpoint:', endpoint);
        console.log('Full response:', response.data);
        console.log('First item:', response.data[0]);
        console.log('First item id:', response.data[0]?.id);
        console.log('============================');

        const transformedData = transformResponse(
          response.data,
          isNewSearch ? 0 : places.length
        );

        console.log('=== Transformed Data Debug ===');
        console.log('Transformed data:', transformedData);
        console.log('First transformed item:', transformedData[0]);
        console.log('First transformed item id:', transformedData[0]?.id);
        console.log('==============================');

        // 검색의 경우 전체 결과를 한번에 받으므로 기존 데이터를 교체
        if (query) {
          setPlaces(transformedData);
          setHasMore(false); // 검색 결과는 한번에 모두 로드
        } else {
          setPlaces((prev) =>
            isNewSearch ? transformedData : [...prev, ...transformedData]
          );

          if (isNewSearch) {
            setPage(1);
          } else {
            setPage(currentPage);
          }

          if (response.data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch places:', error);
        if (isNewSearch) setPlaces([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [page, places.length]
  );

  // 초기 로드
  useEffect(() => {
    if (!isAuthLoading) {
      fetchPlaces(undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  // Intersection Observer 설정 (무한 스크롤)
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPlaces(searchQuery || undefined, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentObserver = observerRef.current;
    if (loadMoreRef.current) {
      currentObserver.observe(loadMoreRef.current);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [isLoading, isLoadingMore, hasMore, fetchPlaces, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces(searchQuery.trim(), true);
  };

  const handleCardClick = (place: Place) => {
    if (onViewAccommodation) {
      onViewAccommodation(place.id);
    }

    navigate(`/inspiration/${place.id}`, {
      state: {
        title: place.title,
        address: place.address,
        summary: place.summary,
        imageUrl: place.imageUrl,
        latitude: place.latitude,
        longitude: place.longitude,
      },
    });
  };

  return (
    <div className="bg-white min-h-screen">
      <PageContainer>
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            당신을 위한 AI 장소추천
          </h1>
          <p className="text-base text-gray-600 mb-6">
            인기 있는 장소를 둘러보고 여행 영감을 얻으세요.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="여행지, 관심사, 여행 스타일로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Places Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Compass className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">
              {isLoading && !isLoadingMore ? (
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              ) : (
                '인기 장소'
              )}
            </h2>
          </div>
          {currentSearch && !isLoading && (
            <p className="text-gray-600 mb-6">
              '{currentSearch}'에 대한 검색 결과입니다.
            </p>
          )}

          {isLoading && !isLoadingMore ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-22">
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
              <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-22">
                {places.map((place) => (
                  <InspirationCard
                    key={place.id}
                    imageUrl={place.imageUrl}
                    rank={places.indexOf(place) + 1}
                    title={place.title}
                    address={place.address}
                    onClick={() => handleCardClick(place)}
                  />
                ))}
              </div>

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
      </PageContainer>
    </div>
  );
}
