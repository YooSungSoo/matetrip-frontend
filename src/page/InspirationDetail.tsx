import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Map as KakaoMap, MapMarker } from 'react-kakao-maps-sdk';
import { Button } from './ui/button';
import { InspirationCard } from './InspirationCard';
import client from '../api/client';

// 장소 상세 정보 타입
interface PlaceDetail {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
  summary?: string;
  latitude?: number;
  longitude?: number;
}

// 주변 장소 타입
interface NearbyPlace {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
}

// InspirationPage에서 전달받는 state 타입
interface LocationState {
  title?: string;
  address?: string;
  summary?: string;
  imageUrl?: string;
}

// 백엔드 API 응답 타입 (GET /places/{placeId})
interface PlaceApiResponse {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string;
  image_url?: string;
  longitude: number;
  latitude: number;
}

// 주변 장소 API 응답 타입
interface NearbyPlaceApiResponse {
  id: string;
  category: string;
  title: string;
  address: string;
  summary?: string;
  image_url?: string;
  longitude: number;
  latitude: number;
}

// 장소 + 주변 장소 통합 API 응답 타입 (GET /places/{placeId}/with-nearby)
interface PlaceWithNearbyApiResponse {
  place: PlaceApiResponse;
  nearbyPlaces: NearbyPlaceApiResponse[];
}

export function InspirationDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // InspirationPage에서 전달받은 데이터
  const passedData = location.state as LocationState | null;

  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 }); // 기본값: 서울

  useEffect(() => {
    const fetchPlaceDetail = async () => {
      if (!placeId) return;

      setIsLoading(true);
      try {
        // InspirationPage에서 전달받은 데이터가 있으면 먼저 UI에 표시
        if (passedData?.title) {
          const detailFromState: PlaceDetail = {
            id: placeId,
            title: passedData.title,
            address: passedData.address || '',
            imageUrl: passedData.imageUrl,
            summary: passedData.summary,
            // 좌표는 API에서 가져올 예정
            latitude: undefined,
            longitude: undefined,
          };
          setPlaceDetail(detailFromState);
        }

        // API에서 장소 상세 정보 + 주변 장소 함께 가져오기
        const response = await client.get<PlaceWithNearbyApiResponse>(
          `/places/${placeId}/with-nearby`
        );
        const { place: apiData, nearbyPlaces: nearbyPlacesData } = response.data;
        console.log('API Response:', { apiData, nearbyPlacesData });

        // API 응답으로 상세 정보 업데이트
        const updatedDetail: PlaceDetail = {
          id: apiData.id,
          title: passedData?.title || apiData.title,
          address: passedData?.address || apiData.address,
          imageUrl: passedData?.imageUrl || apiData.image_url,
          summary: passedData?.summary || apiData.summary,
          latitude: apiData.latitude,
          longitude: apiData.longitude,
        };
        setPlaceDetail(updatedDetail);

        // 지도 중심 설정
        if (apiData.latitude && apiData.longitude) {
          console.log('Setting map center:', {
            lat: apiData.latitude,
            lng: apiData.longitude,
          });
          setMapCenter({
            lat: apiData.latitude,
            lng: apiData.longitude,
          });
        } else {
          console.warn('No coordinates found in API response:', apiData);
        }

        // 주변 장소 데이터 설정
        const formattedNearbyPlaces: NearbyPlace[] = nearbyPlacesData.map(
          (nearby) => ({
            id: nearby.id,
            title: nearby.title,
            address: nearby.address,
            imageUrl: nearby.image_url,
          })
        );
        setNearbyPlaces(formattedNearbyPlaces);
      } catch (error) {
        console.error('Failed to fetch place detail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaceDetail();
  }, [placeId]); // passedData는 제거 - 객체 참조로 인한 무한 루프 방지

  const handlePlanTrip = () => {
    // CreatePostModal로 라우팅 (장소 정보 전달: 이름, 주소, 좌표)
    navigate('/post', {
      state: {
        placeId: placeDetail?.id,
        placeName: placeDetail?.title,
        placeAddress: placeDetail?.address,
        placeLatitude: placeDetail?.latitude,
        placeLongitude: placeDetail?.longitude,
      },
    });
  };

  const handleNearbyPlaceClick = (nearbyPlaceId: string) => {
    navigate(`/inspiration/${nearbyPlaceId}`);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex">
        {/* 메인 콘텐츠 로딩 스켈레톤 */}
        <div className="w-full lg:w-[576px] bg-white border-r border-gray-200">
          <div className="animate-pulse">
            <div className="bg-gray-300 h-[490px] rounded-b-xl"></div>
            <div className="p-8">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        {/* 지도 영역 */}
        <div className="hidden lg:flex flex-1 bg-gray-100 items-center justify-center">
          <div className="text-gray-500">지도 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!placeDetail) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500">장소 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 h-screen flex">
      {/* 메인 콘텐츠 영역 */}
      <div className="lg:w-[676px] bg-white border-r border-gray-200 overflow-y-auto h-full">
        {/* 상단 이미지 및 장소 정보 */}
        <div
          className="relative h-[490px] rounded-b-xl bg-cover bg-center flex flex-col justify-end p-8"
          style={{
            backgroundColor: placeDetail.imageUrl
              ? undefined
              : 'rgb(209 213 219)',
            backgroundImage: placeDetail.imageUrl
              ? `url(${placeDetail.imageUrl})`
              : undefined,
          }}
        >
          <div className="text-white">
            <h1 className="text-2xl font-medium leading-[1.4] mb-3">
              {placeDetail.title}
            </h1>
            <p className="text-base font-medium leading-[1.6] mb-3">
              {placeDetail.address}
            </p>
          </div>
          <Button
            onClick={handlePlanTrip}
            className="w-fit bg-white text-black hover:bg-gray-100 rounded-full px-6 py-2 text-lg font-medium"
          >
            여행을 계획하세요.
          </Button>
        </div>

        {/* 소개 섹션 */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-lg font-medium leading-[1.5] mb-3">소개</h2>
          <p className="text-sm text-black leading-5">
            {placeDetail.summary || '장소에 대한 소개 정보가 없습니다.'}
          </p>
        </div>

        {/* 근처의 다른 장소들 섹션 */}
        <div className="p-8">
          <h2 className="text-lg font-bold leading-5 mb-4">
            MateTrip이 추천하는 주변장소
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {nearbyPlaces.map((place) => (
              <div
                key={place.id}
                className="cursor-pointer"
                onClick={() => handleNearbyPlaceClick(place.id)}
              >
                <InspirationCard
                  imageUrl={place.imageUrl}
                  badgeText=""
                  title={place.title}
                  address={place.address}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 지도 영역 (데스크탑에서만 표시) */}
      <div className="hidden lg:flex flex-1 bg-gray-100 relative h-full">
        {placeDetail.latitude && placeDetail.longitude ? (
          <KakaoMap
            center={mapCenter}
            style={{ width: '100%', height: '100%' }}
            level={3}
          >
            <MapMarker
              position={{
                lat: placeDetail.latitude,
                lng: placeDetail.longitude,
              }}
            />
          </KakaoMap>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MapPin className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              지도 뷰
            </h3>
            <p className="text-base text-gray-500">
              여행지를 지도에서 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
