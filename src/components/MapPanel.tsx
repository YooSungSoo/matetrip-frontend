import { PlusCircle, X } from 'lucide-react'; // PlusCircle, X 아이콘 임포트
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import type { Poi, CreatePoiDto } from '../hooks/usePoiSocket';
import {
  Map as KakaoMap,
  MapMarker,
  CustomOverlayMap,
  Polyline,
} from 'react-kakao-maps-sdk';
import { Button } from './ui/button';
import { KAKAO_REST_API_KEY } from '../constants'; // KAKAO_REST_API_KEY import 추가
import { fetchPlacesInBounds } from '../api/places';
import type { PlaceDto } from '../types/place';
import { CATEGORY_INFO } from '../types/place';

import { useAnimatedOpacity } from '../hooks/useAnimatedOpacity';

import type {
  KakaoPlace,
  RouteSegment,
  KakaoNaviRoad,
  KakaoNaviSection,
  KakaoNaviGuide,
  MapPanelProps,
  PoiMarkerProps,
  DayRouteRendererProps,
} from '../types/map';

/**
 * POI 순번과 색상을 포함하는 커스텀 SVG 마커 아이콘을 생성합니다.
 * @param label - 마커에 표시될 텍스트 ('출발', '경유', '도착' 등)
 * @param color - 마커의 배경색
 * @returns 데이터 URI 형식의 SVG 문자열
 */
const createCustomMarkerIcon = (label: string, color: string) => {
  // 텍스트 길이에 따라 폰트 크기 동적 조절
  const fontSize = label.length > 1 ? 14 : 16;
  const svg = `<svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.058 0 0 8.058 0 18C0 28.296 15.66 46.404 16.596 47.544C17.328 48.456 18.672 48.456 19.404 47.544C20.34 46.404 36 28.296 36 18C36 8.058 27.942 0 18 0Z" fill="${color}"/>
    <text x="18" y="21" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" alignment-baseline="central">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * 백엔드 장소 마커 Props
 */
interface PlaceMarkerProps {
  place: PlaceDto;
  onPlaceClick: (place: PlaceDto) => void;
}

/**
 * 백엔드에서 가져온 장소를 표시하는 마커 컴포넌트
 */
const PlaceMarker = memo(({ place, onPlaceClick }: PlaceMarkerProps) => {
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const infoWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (infoWindowTimeoutRef.current) {
        clearTimeout(infoWindowTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseOver = () => {
    if (infoWindowTimeoutRef.current) {
      clearTimeout(infoWindowTimeoutRef.current);
      infoWindowTimeoutRef.current = null;
    }
    setIsInfoWindowOpen(true);
  };

  const handleMouseOut = () => {
    infoWindowTimeoutRef.current = setTimeout(() => {
      setIsInfoWindowOpen(false);
    }, 100);
  };

  const handleClick = () => {
    if (infoWindowTimeoutRef.current) {
      clearTimeout(infoWindowTimeoutRef.current);
      infoWindowTimeoutRef.current = null;
    }
    onPlaceClick(place);
  };
  // 카테고리에 따른 아이콘 이미지 URL 생성
  const getMarkerImageSrc = (categoryCode: string): string => {
    // 카테고리별 색상 가져오기
    const categoryInfo = CATEGORY_INFO[categoryCode as keyof typeof CATEGORY_INFO];
    const color = categoryInfo?.color || '#808080';

    // 카테고리별로 다른 SVG 아이콘 생성
    let iconSvg = '';

    switch (categoryCode) {
      case '레포츠': // 레포츠 - 자전거/활동 아이콘
        iconSvg = `
          <g transform="translate(16, 16)">
            <!-- 자전거 바퀴 -->
            <circle cx="-4" cy="4" r="3" stroke="white" stroke-width="1.5" fill="none"/>
            <circle cx="4" cy="4" r="3" stroke="white" stroke-width="1.5" fill="none"/>
            <!-- 프레임 -->
            <path d="M-4,4 L0,-2 L4,4 M0,-2 L0,1"
                  stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- 핸들 -->
            <path d="M-1,-2 L1,-2"
                  stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </g>
        `;
        break;

      case '추천코스': // 추천코스 - 별표 아이콘
        iconSvg = `
          <g transform="translate(16, 16)">
            <!-- 별 -->
            <path d="M0,-6 L1.5,-2 L6,-2 L2.5,1 L4,6 L0,3 L-4,6 L-2.5,1 L-6,-2 L-1.5,-2 Z"
                  fill="white" stroke="white" stroke-width="1"/>
          </g>
        `;
        break;

      case '인문(문화/예술/역사)': // 문화/역사 - 박물관/건물
        iconSvg = `
          <g transform="translate(16, 16)">
            <!-- 지붕 -->
            <path d="M-7,-4 L0,-7 L7,-4 Z" fill="white" stroke="white" stroke-width="1"/>
            <!-- 기둥들 -->
            <rect x="-6" y="-3" width="2" height="8" fill="white"/>
            <rect x="-1" y="-3" width="2" height="8" fill="white"/>
            <rect x="4" y="-3" width="2" height="8" fill="white"/>
            <!-- 바닥 -->
            <rect x="-7" y="5" width="14" height="1" fill="white"/>
          </g>
        `;
        break;

      case '자연': // 자연 - 나무 아이콘
        iconSvg = `
          <g transform="translate(16, 16)">
            <!-- 나무 잎 -->
            <circle cx="0" cy="-3" r="4" fill="white"/>
            <circle cx="-3" cy="-1" r="3" fill="white"/>
            <circle cx="3" cy="-1" r="3" fill="white"/>
            <!-- 나무 줄기 -->
            <rect x="-1" y="1" width="2" height="5" fill="white"/>
          </g>
        `;
        break;

      default:
        // 기본 아이콘 - 위치 핀
        iconSvg = `
          <circle cx="16" cy="16" r="6" fill="white"/>
        `;
    }

    // SVG로 마커 이미지 생성 (데이터 URI 방식)
    const svg = `
      <svg width="36" height="44" xmlns="http://www.w3.org/2000/svg">
        <!-- 핀 모양 배경 -->
        <path d="M18 0C10.8 0 5 5.8 5 13c0 9.9 13 26 13 26s13-16.1 13-26c0-7.2-5.8-13-13-13z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <!-- 카테고리별 아이콘 -->
        ${iconSvg}
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const markerImageSrc = getMarkerImageSrc(place.category);
  const markerImage = {
    src: markerImageSrc,
    size: { width: 36, height: 44 },
    options: {
      offset: { x: 18, y: 44 }, // 마커 이미지의 기준점
    },
  };

  return (
    <>
      <MapMarker
        position={{ lat: place.latitude, lng: place.longitude }}
        image={markerImage}
        clickable={true}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={handleClick}
      />
      {isInfoWindowOpen && (
        <CustomOverlayMap
          position={{ lat: place.latitude, lng: place.longitude }}
          xAnchor={0.5}
          yAnchor={1.8}
          zIndex={10}
        >
          <div
            className="min-w-[200px] max-w-[300px] rounded-lg bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <div className="mb-2 text-[16px] font-bold text-[#333]">
              {place.title}
            </div>
            {place.image_url && (
              <img
                src={place.image_url}
                alt={place.title}
                className="mb-2 h-[120px] w-full rounded object-cover"
              />
            )}
            <div className="mb-1 text-[13px] text-[#666]">{place.address}</div>
            {place.summary && (
              <div className="mt-2 text-[12px] leading-snug text-[#888]">
                {place.summary}
              </div>
            )}
            <div className="mt-2 inline-block rounded bg-[#f5f5f5] px-2 py-1 text-[11px] text-[#999]">
              {CATEGORY_INFO[place.category as keyof typeof CATEGORY_INFO]?.name || '기타'}
            </div>
          </div>
        </CustomOverlayMap>
      )}
    </>
  );
});

const PoiMarker = memo(
  ({
    poi,
    markerLabel,
    markerColor,
    unmarkPoi,
    isOverlayHoveredRef,
  }: PoiMarkerProps) => {
    const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
    const infoWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isVisible = markerLabel !== undefined;
    // useAnimatedOpacity 훅을 사용하여 opacity 값을 제어합니다.
    const animatedOpacity = useAnimatedOpacity(isVisible, 300);

    const handleMouseOver = () => {
      if (infoWindowTimeoutRef.current) {
        clearTimeout(infoWindowTimeoutRef.current);
        infoWindowTimeoutRef.current = null;
      }
      isOverlayHoveredRef.current = true;
      setIsInfoWindowOpen(true);
    };

    const handleMouseOut = () => {
      infoWindowTimeoutRef.current = setTimeout(() => {
        isOverlayHoveredRef.current = false;
        setIsInfoWindowOpen(false);
      }, 100);
    };

    const handleClick = () => {
      if (infoWindowTimeoutRef.current) {
        clearTimeout(infoWindowTimeoutRef.current);
        infoWindowTimeoutRef.current = null;
      }
      isOverlayHoveredRef.current = true;
      setIsInfoWindowOpen(true);
    };

    const isScheduled = markerLabel !== undefined;

    // isScheduled가 true일 때만 커스텀 아이콘을 사용하고, false일 때는 undefined로 두어 기본 마커를 사용하도록 합니다.
    const markerImage = isScheduled ? {
      src: createCustomMarkerIcon(markerLabel, markerColor || '#FF5733'),
      size: { width: 36, height: 48 },
      options: {
        offset: { x: 18, y: 48 }, // 마커의 하단 중앙을 좌표에 맞춤
      },
    } : undefined;

    return (
      <MapMarker
        position={{ lat: poi.latitude, lng: poi.longitude }}
        image={markerImage}
        draggable={false}
        clickable={true}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={handleClick}
        // isScheduled가 아닐 때는 항상 보이도록 opacity를 1로 설정합니다.
        opacity={isScheduled ? animatedOpacity : 1}
      >
        {isInfoWindowOpen && (
          <CustomOverlayMap
            position={{ lat: poi.latitude, lng: poi.longitude }}
            xAnchor={0.5}
            yAnchor={1.3}
            zIndex={3}
          >
            <div
              className="block min-w-[180px] max-w-[400px] whitespace-normal rounded-lg bg-white p-2.5 text-left leading-relaxed shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              className="p-3 bg-white rounded-lg shadow-lg min-w-[200px] flex flex-col gap-1 relative"
            >
              <div className="font-bold text-base text-center">
                {poi.placeName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {poi.address}
              </div>
              {/* 보관함에만 있는 마커일 경우 '제거' 버튼 표시 */}
              {!isScheduled && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-1"
                  onClick={(e) => {
                    e.stopPropagation(); // 클릭 이벤트 전파 방지
                    isOverlayHoveredRef.current = false; // Ref 값을 수동으로 초기화
                    unmarkPoi(poi.id);
                    setIsInfoWindowOpen(false); // 정보창 닫기
                  }}
                >
                  보관함에서 제거
                </Button>
              )}
            </div>
          </CustomOverlayMap>
        )}
      </MapMarker>
    );
  }
);

const DayRouteRenderer = memo(
  ({
    layer,
    itinerary,
    dailyRouteInfo,
    visibleDayIds,
  }: DayRouteRendererProps) => {
    const isVisible = visibleDayIds.has(layer.id);
    const animatedOpacity = useAnimatedOpacity(isVisible, 300);

    const segments = dailyRouteInfo[layer.id];
    const dayPois = itinerary[layer.id] || [];

    return (
      <>
        {/* Polyline rendering */}
        {segments && segments.length > 0
          ? segments.map((segment, index) => (
              <Polyline
                key={`${layer.id}-segment-${index}`}
                path={segment.path}
                strokeWeight={5}
                strokeColor={layer.color}
                strokeOpacity={animatedOpacity * 0.9}
                strokeStyle={'solid'}
              />
            ))
          : // 상세 경로 정보가 없으면 기존처럼 POI를 직접 연결
            dayPois.length > 1 && (
              <Polyline
                key={layer.id}
                path={dayPois.map((poi) => ({
                  lat: poi.latitude,
                  lng: poi.longitude,
                }))}
                strokeWeight={5}
                strokeColor={layer.color}
                strokeOpacity={animatedOpacity * 0.9}
                strokeStyle={'solid'}
              />
            )}

        {/* CustomOverlayMap for route info rendering */}
        {segments &&
          segments.length > 0 &&
          segments.map((segment, index) => {
            // 세그먼트의 상세 경로가 없거나 길이가 0이면 오버레이를 표시하지 않음
            if (!segment.path || segment.path.length === 0) return null;

            // 경로의 중간 지점 계산
            const midPointIndex = Math.floor(segment.path.length / 2);
            const midPoint = segment.path[midPointIndex];

            const totalMinutes = Math.ceil(segment.duration / 60); // 초를 분으로 변환 (올림)
            const totalKilometers = (segment.distance / 1000).toFixed(1); // 미터를 킬로미터로 변환 (소수점 첫째 자리)

            return (
              <CustomOverlayMap
                key={`route-info-${layer.id}-${index}`}
                position={{ lat: midPoint.lat, lng: midPoint.lng }} // 중간 지점 사용
                yAnchor={1.6} // 경로 위에 표시되도록 조정
              >
                <div
                  style={{
                    padding: '5px 10px',
                    backgroundColor: 'white',
                    borderRadius: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.3s ease-in-out', // CSS transition을 유지하여 부드러운 효과
                    opacity: animatedOpacity,
                  }}
                >
                  {`${totalMinutes}분, ${totalKilometers}km`}
                </div>
              </CustomOverlayMap>
            );
          })}
      </>
    );
  }
);

export function MapPanel({
  itinerary,
  dayLayers,
  pois,
  isSyncing,
  markPoi,
  selectedPlace,
  unmarkPoi,
  mapRef, // hoveredPoi 제거
  hoveredPoiInfo, // hoveredPoiInfo 추가
  setSelectedPlace,
  onRouteInfoUpdate, // 추가된 prop
  onRouteOptimized,
  optimizingDayId,
  onOptimizationComplete,
  latestChatMessage,
  cursors, // props로 받음
  moveCursor, // props로 받음
  clickEffects, // props로 받음
  clickMap, // props로 받음
  visibleDayIds, // props로 받음
}: MapPanelProps) {
  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
  const pendingSelectedPlaceRef = useRef<KakaoPlace | null>(null);
  // 일자별 경로 세그먼트 정보를 저장할 상태 추가
  // [추가] 지도 클릭으로 생성된 임시 장소를 저장할 상태
  const [temporaryPlaces, setTemporaryPlaces] = useState<KakaoPlace[]>([]);
  // [추가] 호버된 임시 장소의 ID를 저장할 상태
  const [hoveredTempPlaceId, setHoveredTempPlaceId] = useState<string | null>(
    null
  );
  // [추가] 오버레이 위에 마우스가 있는지 확인하기 위한 Ref
  const isOverlayHoveredRef = useRef(false);
  const [dailyRouteInfo, setDailyRouteInfo] = useState<
    Record<string, RouteSegment[]>
  >({});

  // 채팅 말풍선 상태와 타이머 Ref를 추가합니다.
  const [chatBubbles, setChatBubbles] = useState<Record<string, string>>({});
  const chatBubbleTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // 새로운 채팅 메시지를 처리하는 useEffect (말풍선 표시 로직은 그대로 유지)
  useEffect(() => {
    if (latestChatMessage) {
      const { userId, message } = latestChatMessage;

      // 동일한 사용자의 이전 말풍선 타이머가 있다면 제거합니다.
      if (chatBubbleTimers.current[userId]) {
        clearTimeout(chatBubbleTimers.current[userId]);
      }

      // 새로운 말풍선을 표시합니다.
      setChatBubbles((prev) => ({ ...prev, [userId]: message }));

      // 5초 후에 말풍선을 자동으로 숨기는 타이머를 설정합니다.
      chatBubbleTimers.current[userId] = setTimeout(() => {
        setChatBubbles((prev) => {
          const newBubbles = { ...prev };
          delete newBubbles[userId];
          return newBubbles;
        });
        delete chatBubbleTimers.current[userId];
      }, 5000); // 5초 동안 표시
    }

    // 컴포넌트가 언마운트될 때 모든 타이머를 정리합니다.
    return () => {
      Object.values(chatBubbleTimers.current).forEach(clearTimeout);
    };
  }, [latestChatMessage]);

  useEffect(() => {
    if (!mapInstance) return;

    const handleMouseMove = (mouseEvent: kakao.maps.event.MouseEvent) => {
      const latlng = mouseEvent.latLng;
      moveCursor({ lat: latlng.getLat(), lng: latlng.getLng() });
    };

    // 쓰로틀링을 적용하여 이벤트 발생 빈도를 조절할 수 있습니다. (예: 100ms 마다)
    // const throttledMoveCursor = throttle(handleMouseMove, 100);

    window.kakao.maps.event.addListener(
      mapInstance,
      'mousemove',
      handleMouseMove
    );

    return () => {
      window.kakao.maps.event.removeListener(
        mapInstance,
        'mousemove',
        handleMouseMove
      );
    };
  }, [mapInstance, moveCursor]);

  // 백엔드에서 가져온 장소 데이터 상태
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  // 디바운스를 위한 타이머 ref
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 선택된 백엔드 장소 상태
  const [selectedBackendPlace, setSelectedBackendPlace] = useState<PlaceDto | null>(null);
  // summary 펼치기/접기 상태
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  /**
   * 지도 영역 내의 장소 데이터를 가져오는 함수
   */
  const fetchPlacesInView = useCallback(async (map: kakao.maps.Map) => {
    try {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest(); // 남서쪽 좌표
      const ne = bounds.getNorthEast(); // 북동쪽 좌표

      const mapBounds = {
        swLat: sw.getLat(),
        swLng: sw.getLng(),
        neLat: ne.getLat(),
        neLng: ne.getLng(),
      };

      console.log('Fetching places for bounds:', mapBounds);
      const placesData = await fetchPlacesInBounds(mapBounds);
      console.log('Received places:', placesData);
      setPlaces(placesData);
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  }, []);

  /**
   * 지도 이동/줌 변경 시 디바운스된 장소 데이터 요청
   */
  const handleMapBoundsChanged = useCallback(
    (map: kakao.maps.Map) => {
      // 기존 타이머가 있으면 취소
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }

      // 500ms 후에 API 요청 (디바운스)
      fetchTimerRef.current = setTimeout(() => {
        fetchPlacesInView(map);
      }, 500);
    },
    [fetchPlacesInView]
  );

  /**
   * 백엔드 장소 마커 클릭 시 처리
   */
  const handlePlaceClick = useCallback((place: PlaceDto) => {
    setSelectedBackendPlace(place);
    setIsSummaryExpanded(false); // 새로운 장소 선택 시 summary 접기

    // 지도가 있으면 해당 위치로 포커싱 및 줌 조정
    if (mapInstance) {
      const position = new window.kakao.maps.LatLng(place.latitude, place.longitude);

      // 줌 레벨을 먼저 설정한 후 중앙으로 이동
      mapInstance.setLevel(5);

      // setCenter를 사용하여 정확한 위치로 이동
      mapInstance.setCenter(position);
    }
  }, [mapInstance]);

  // 지도 인스턴스가 생성되면 초기 장소 데이터 로드
  useEffect(() => {
    if (mapInstance) {
      fetchPlacesInView(mapInstance);
    }
    
    return () => {
        if (fetchTimerRef.current) {
            clearTimeout(fetchTimerRef.current);
        }
    };
  }, [mapInstance, fetchPlacesInView]);

  useEffect(() => {
    if (selectedPlace && mapInstance) {
      const position = new window.kakao.maps.LatLng(
        Number(selectedPlace.y),
        Number(selectedPlace.x)
      );
      mapInstance.panTo(position);

      const poiData = {
        latitude: Number(selectedPlace.y),
        longitude: Number(selectedPlace.x),
        address: selectedPlace.road_address_name || selectedPlace.address_name,
        placeName: selectedPlace.place_name,
        categoryName: selectedPlace.category_name,
      };
      markPoi(poiData);
      setSelectedPlace(null);
    } else if (selectedPlace && !mapInstance) {
      pendingSelectedPlaceRef.current = selectedPlace;
    }
  }, [selectedPlace, mapInstance, markPoi, setSelectedPlace]);

  useEffect(() => {
    if (mapInstance && pendingSelectedPlaceRef.current) {
      const placeToProcess = pendingSelectedPlaceRef.current;
      pendingSelectedPlaceRef.current = null;

      const position = new window.kakao.maps.LatLng(
        Number(placeToProcess.y),
        Number(placeToProcess.x)
      );
      mapInstance.panTo(position);

      const poiData = {
        latitude: Number(placeToProcess.y),
        longitude: Number(placeToProcess.x),
        address:
          placeToProcess.road_address_name || placeToProcess.address_name,
        placeName: placeToProcess.place_name,
        categoryName: placeToProcess.category_name,
      };
      markPoi(poiData);
      setSelectedPlace(null);
    }
  }, [mapInstance, markPoi, setSelectedPlace]);

  // [수정] 경로 그리기 전용 useEffect: itinerary나 dayLayers가 변경될 때만 실행
  useEffect(() => {
    console.log('[Effect] Drawing routes based on itinerary change.');
    const drawStandardRoutes = async () => {
      const newDailyRouteInfo: Record<string, RouteSegment[]> = {};

      for (const dayLayer of dayLayers) {
        const dayPois = itinerary[dayLayer.id];
        if (dayPois && dayPois.length >= 2) {
          try {
            const originPoi = dayPois[0];
            const destinationPoi = dayPois[dayPois.length - 1];
            const waypoints = dayPois.slice(1, dayPois.length - 1);

            const originParam = `${originPoi.longitude},${originPoi.latitude}`;
            const destinationParam = `${destinationPoi.longitude},${destinationPoi.latitude}`;
            const waypointsParam = waypoints
              .map((poi) => `${poi.longitude},${poi.latitude}`)
              .join('|');

            const queryParams = new URLSearchParams({
              origin: originParam,
              destination: destinationParam,
              priority: 'RECOMMEND',
              // [수정] summary를 false로 설정해야 road_details와 guides 정보가 반환됩니다.
              summary: 'false',
              road_details: 'true', // 상세 경로 정보 요청
              guides: 'true', // 경로 안내 정보 요청
            });

            if (waypointsParam) {
              queryParams.append('waypoints', waypointsParam);
            }

            const response = await fetch(
              `https://apis-navi.kakaomobility.com/v1/directions?${queryParams.toString()}`,
              {
                headers: {
                  Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
                },
              }
            );
            if (!response.ok)
              throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log(
              `[DEBUG] Raw API response for day ${dayLayer.id}:`,
              data
            ); // API 응답 전체를 로깅

            if (data.routes && data.routes[0]?.sections) {
              const segmentsForDay: RouteSegment[] = [];
              // [수정] poisForThisDay를 루프 안으로 이동
              const poisForThisDay = [originPoi, ...waypoints, destinationPoi];

              // 좌표를 기반으로 가장 가까운 POI를 찾는 헬퍼 함수
              // [수정] 검색 대상을 인자로 받도록 변경
              const findClosestPoi = (
                lng: number,
                lat: number,
                poisToSearch: Poi[]
              ): Poi | null => {
                let closestPoi: Poi | null = null;
                let minDistance = Infinity;

                poisToSearch.forEach((poi) => {
                  const dist =
                    Math.pow(poi.longitude - lng, 2) +
                    Math.pow(poi.latitude - lat, 2);
                  if (dist < minDistance) {
                    minDistance = dist;
                    closestPoi = poi;
                  }
                });
                return closestPoi;
              };

              data.routes[0].sections.forEach(
                (section: KakaoNaviSection, index: number) => {
                  // [수정] detailedPath를 루프 내에서 초기화하여 각 세그먼트가 독립적인 경로를 갖도록 합니다.
                  const segmentPath: { lat: number; lng: number }[] = [];
                  if (section.roads) {
                    section.roads.forEach((road: KakaoNaviRoad) => {
                      for (let i = 0; i < road.vertexes.length; i += 2) {
                        segmentPath.push({
                          lng: road.vertexes[i],
                          lat: road.vertexes[i + 1],
                        });
                      }
                    });
                  }

                  // guides 정보를 사용하여 정확한 fromPoi와 toPoi를 찾습니다.
                  const guides = section.guides as KakaoNaviGuide[];
                  // [수정] section.guides가 없거나 비어있는 경우를 처리합니다.
                  if (!guides || guides.length === 0) {
                    console.warn(
                      `[DEBUG] Section ${index} for day ${dayLayer.id} has no guides. Skipping this section.`
                    );
                    return; // 현재 section 처리를 건너뛰고 다음 section으로 넘어갑니다.
                  }
                  const startGuide = guides[0];

                  const endGuide = guides[guides.length - 1];

                  const fromPoi = findClosestPoi(
                    startGuide.x,
                    startGuide.y,
                    poisForThisDay
                  );
                  // 마지막 섹션의 마지막 가이드는 도착지입니다.
                  // 경유지 가이드 타입은 1000, 도착지 가이드 타입은 101 입니다.
                  const toPoi = findClosestPoi(
                    endGuide.x,
                    endGuide.y,
                    poisForThisDay
                  );

                  if (fromPoi && toPoi) {
                    segmentsForDay.push({
                      fromPoiId: fromPoi.id,
                      toPoiId: toPoi.id,
                      duration: section.duration,
                      distance: section.distance,
                      path: segmentPath,
                    });
                  }
                }
              );
              newDailyRouteInfo[dayLayer.id] = segmentsForDay;
            }
          } catch (error) {
            console.error(
              `Error fetching directions for day ${dayLayer.id}:`,
              error
            );
          }
        } else {
          console.log(
            `Skipping route fetch for day ${dayLayer.id}: not enough POIs (${
              dayPois ? dayPois.length : 0
            })`
          );
        }
      }

      console.log(
        'New daily route info before setting state:',
        newDailyRouteInfo
      );
      // 경로 정보 업데이트 시 부모 컴포넌트로 전달
      if (onRouteInfoUpdate) {
        onRouteInfoUpdate(newDailyRouteInfo as Record<string, RouteSegment[]>);
      }
      setDailyRouteInfo(newDailyRouteInfo);
    };

    drawStandardRoutes();
  }, [itinerary, dayLayers, onRouteInfoUpdate]);

  // [추가] 경로 최적화 전용 useEffect: optimizingDayId가 변경될 때만 실행
  useEffect(() => {
    if (!optimizingDayId) return;

    console.log(`[Effect] Optimizing route for day: ${optimizingDayId}`);

    const optimizeRoute = async () => {
      const dayPois = itinerary[optimizingDayId];
      if (!dayPois || dayPois.length < 4) {
        // 출발, 도착, 경유지 2개 이상
        console.warn('[TSP] Not enough POIs to optimize.');
        onOptimizationComplete?.();
        return;
      }

      // 두 지점 간의 경로 정보를 가져오는 함수
      const fetchDuration = async (
        from: Poi,
        to: Poi
      ): Promise<{
        from: string;
        to: string;
        duration: number;
        distance: number;
      } | null> => {
        try {
          // [수정] GET 요청으로 변경하고, 파라미터를 URL 쿼리 스트링으로 전달합니다.
          const response = await fetch(
            `https://apis-navi.kakaomobility.com/v1/directions?origin=${from.longitude},${from.latitude}&destination=${to.longitude},${to.latitude}&priority=TIME&summary=true`,
            {
              method: 'GET',
              headers: {
                Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
              },
            }
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (data.routes && data.routes[0] && data.routes[0].summary) {
            return {
              from: from.id,
              to: to.id,
              duration: data.routes[0].summary.duration,
              distance: data.routes[0].summary.distance,
            };
          }
          return null;
        } catch (error) {
          console.error(
            `Error fetching duration between ${from.placeName} and ${to.placeName}:`,
            error
          );
          return null;
        }
      };

      try {
        const originPoi = dayPois[0];
        const destinationPoi = dayPois[dayPois.length - 1];
        const waypoints = dayPois.slice(1, dayPois.length - 1);
        console.log(
          `[TSP] Starting optimization for day ${optimizingDayId} with ${waypoints.length} waypoints.`
        );
        const allPoints = [originPoi, ...waypoints, destinationPoi];
        const promises: ReturnType<typeof fetchDuration>[] = [];

        // 1. 모든 지점 쌍(pair)에 대한 API 호출 Promise 생성
        for (let i = 0; i < allPoints.length; i++) {
          for (let j = 0; j < allPoints.length; j++) {
            if (i === j) continue;
            promises.push(fetchDuration(allPoints[i], allPoints[j]));
          }
        }

        console.log(`[TSP] Created ${promises.length} API call promises.`);

        // 2. Promise.all로 모든 API를 병렬 호출
        const results = await Promise.all(promises);

        // 3. 결과로 이동 시간 행렬(Matrix) 생성
        const durationMatrix: Record<string, Record<string, number>> = {};
        results.forEach((result) => {
          if (result) {
            if (!durationMatrix[result.from]) durationMatrix[result.from] = {};
            durationMatrix[result.from][result.to] = result.duration;
          }
        });

        console.log('[TSP] Duration Matrix created:', durationMatrix);

        // --- 여기부터는 생성된 durationMatrix를 TSP 솔버에 전달하는 부분 ---
        // 예시: console.log만 하고, 실제 솔버 연동은 서버에서 수행하는 것을 권장합니다.
        // const optimizedOrder = await solveTspOnServer(durationMatrix, originPoi.id, destinationPoi.id);
        // onRouteOptimized?.(optimizingDayId, optimizedOrder);
      } catch (error) {
        console.error(
          `[TSP] Error during optimization for day ${optimizingDayId}:`,
          error
        );
      } finally {
        // 최적화 작업이 성공하든 실패하든 부모에게 완료를 알림
        onOptimizationComplete?.();
      }
    };

    optimizeRoute();
  }, [optimizingDayId, itinerary, onRouteOptimized, onOptimizationComplete]);

  const scheduledPoiData = new Map<string, { label: string; color: string }>();
  dayLayers.forEach((dayLayer) => {
    const dayPois = itinerary[dayLayer.id];
    if (dayPois) {
      const totalPois = dayPois.length;
      dayPois.forEach((poi, index) => {
        let label: string;
        if (index === 0) {
          label = '출발';
        } else if (index === totalPois - 1) {
          label = '도착';
        } else {
          label = '경유';
        }

        scheduledPoiData.set(poi.id, {
          label,
          color: dayLayer.color,
        });
      });
    }
  });

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <style>
        {`
          div[style*="background: rgb(255, 255, 255);"][style*="border: 1px solid rgb(118, 129, 168);"] {
            display: none !important;
          }
          .ripple {
            position: absolute;
            border-radius: 50%;
            border-style: solid;
            transform: translate(-50%, -50%);
            animation: ripple-animation 1s ease-out;
          }
          @keyframes ripple-animation {
            from { width: 0; height: 0; opacity: 0.9; }
            to { width: 150px; height: 150px; opacity: 0; }
          }
          @keyframes fade-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }
        `}
      </style>
      <KakaoMap
        center={{ lat: 33.450701, lng: 126.570667 }}
        className="h-full w-full"
        level={3}
        onCreate={(map) => {
          if (mapRef) {
            (mapRef as React.MutableRefObject<kakao.maps.Map>).current = map;
            setMapInstance(map);
          }
        }}
        onCenterChanged={(map) => {
          // 지도 중심이 변경될 때마다 호출
          handleMapBoundsChanged(map);
        }}
        onZoomChanged={(map) => {
          // 줌 레벨이 변경될 때마다 호출
          handleMapBoundsChanged(map);
        }}
        onClick={(_map, mouseEvent) => {
          // 오버레이 위에서 발생한 클릭이면 마커를 생성하지 않음
          if (isOverlayHoveredRef.current) return;

          const latlng = mouseEvent.latLng;

          // 1. 다른 사용자에게 클릭 이벤트를 즉시 전파합니다.
          clickMap({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          });

          // 2. 클릭한 위치의 주소 변환 및 임시 장소 생성 로직을 수행합니다.
          const geocoder = new window.kakao.maps.services.Geocoder();
          const places = new window.kakao.maps.services.Places();
          geocoder.coord2Address(
            latlng.getLng(),
            latlng.getLat(),
            (result, status) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const address =
                  result[0].road_address?.address_name ||
                  result[0].address.address_name;

                // 임시 장소 데이터 생성
                const tempPlace: KakaoPlace = {
                  id: `temp_${new Date().getTime()}`,
                  place_name: address, // 초기 이름은 주소로 설정
                  address_name: address,
                  road_address_name: result[0].road_address?.address_name || '',
                  x: latlng.getLng().toString(),
                  y: latlng.getLat().toString(),
                  // KakaoPlace의 나머지 필수 필드들 초기화
                  category_name: '',
                  category_group_code: '',
                  category_group_name: '',
                  phone: '',
                  place_url: '',
                  distance: '',
                };

                // 주변 장소 검색으로 더 정확한 장소명 가져오기 (선택적)
                places.keywordSearch(
                  address,
                  (data, searchStatus) => {
                    if (
                      searchStatus === window.kakao.maps.services.Status.OK &&
                      data.length > 0
                    ) {
                      // 검색된 첫 번째 장소 정보로 임시 장소 정보 업데이트
                      const place = data[0];
                      tempPlace.place_name = place.place_name;
                      tempPlace.category_name = place.category_name;
                    }
                    // markPoi를 직접 호출하는 대신, 임시 장소 상태를 설정
                    setTemporaryPlaces((prev) => [...prev, tempPlace]);
                  },
                  {
                    location: latlng,
                    radius: 50,
                    sort: window.kakao.maps.services.SortBy.DISTANCE,
                  }
                );
              }
            }
          );
        }}
      >
        {pois.map((poi) => {
          const data = scheduledPoiData.get(poi.id);
          const markerLabel = data?.label;
          const markerColor = data?.color;
          const isDayVisible =
            !poi.planDayId || visibleDayIds.has(poi.planDayId);
          return (
            <PoiMarker
              key={poi.id}
              poi={poi}
              markerLabel={isDayVisible ? markerLabel : undefined}
              markerColor={markerColor}
              isHovered={hoveredPoiInfo?.poiId === poi.id}
              unmarkPoi={unmarkPoi}
              isOverlayHoveredRef={isOverlayHoveredRef}
            />
          );
        })}

        {/* 지도 클릭 물결 효과 렌더링 */}
        {clickEffects.map((effect) => (
          <CustomOverlayMap
            key={effect.id}
            position={effect.position}
            zIndex={5}
            xAnchor={0.5}
            yAnchor={0.5}
          >
            {/* 물결 효과와 이름표를 포함하는 컨테이너 */}
            <div className="relative flex items-center justify-center">
              {/* 이름표 */}
              <span
                className="px-2 py-1 text-xs text-white rounded-md shadow-md z-10"
                style={{
                  backgroundColor: effect.userColor,
                  // 애니메이션으로 사라지도록 설정
                  animation: 'fade-out 1s ease-out forwards',
                  animationDelay: '0.5s',
                }}
              >
                {effect.userName}
              </span>
              {/* 첫 번째 물결 */}
              <div
                className="ripple"
                style={{
                  top: '50%',
                  left: '50%',
                  borderWidth: '3px',
                  borderColor: effect.userColor,
                  backgroundColor: `${effect.userColor}66`,
                }}
              />
              {/* 두 번째 물결 (지연 시작) */}
              <div
                className="ripple"
                style={{
                  top: '50%',
                  left: '50%',
                  borderWidth: '3px',
                  borderColor: effect.userColor,
                  backgroundColor: `${effect.userColor}66`,
                  animationDelay: '0.3s', // 0.3초 뒤에 시작
                }}
              />
            </div>
          </CustomOverlayMap>
        ))}
        {/* 백엔드에서 가져온 장소 마커 렌더링 */}
        {places.map((place) => (
          <PlaceMarker key={place.id} place={place} onPlaceClick={handlePlaceClick} />
        ))}

        {/* 각 세그먼트별 Polyline 렌더링 */}
        {dayLayers.map((layer) => {
          const segments = dailyRouteInfo[layer.id];
          if (segments && segments.length > 0) {
            return segments.map((segment, index) => (
              <Polyline
                key={`${layer.id}-segment-${index}`} // 각 세그먼트별 고유 키
                path={segment.path}
                strokeWeight={5}
                strokeColor={layer.color}
                strokeOpacity={0.9}
                strokeStyle={'solid'}
              />
            ));
          }
          // 상세 경로 정보가 없으면 기존처럼 POI를 직접 연결
          const path = (itinerary[layer.id] || []).map((poi) => ({
            lat: poi.latitude,
            lng: poi.longitude,
          }));
          return path.length > 1 ? (
            <Polyline
              key={layer.id}
              path={path}
              strokeWeight={5}
              strokeColor={layer.color}
              strokeOpacity={0.9}
              strokeStyle={'solid'}
            />
          ) : null;
        })}

        {/* 각 세그먼트별 경로 정보 표시 CustomOverlayMap 추가 */}
        {dayLayers.map((layer) => {
          const segments = dailyRouteInfo[layer.id];

        {/* 다른 사용자가 호버한 POI 강조 효과 */}
        {hoveredPoiInfo &&
          (() => {
            const poi = pois.find((p) => p.id === hoveredPoiInfo.poiId);
            if (!poi) return null;

            return (
              <CustomOverlayMap
                position={{ lat: poi.latitude, lng: poi.longitude }}
                xAnchor={0.5}
                yAnchor={0.8}
                zIndex={4}
              >
                {/* 원과 이름표를 포함하는 컨테이너 */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* 원형 강조 효과 */}
                  <div className="absolute inset-0 w-full h-full rounded-full border-4 border-blue-500 bg-blue-500/20 animate-pulse" />
                  {/* 호버한 사용자 이름 표시 */}
                  <div
                    className="absolute bottom-0 mb-1 px-1.5 py-0.5 rounded-full text-xs text-white"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      fontSize: '10px',
                    }}
                  >
                    {hoveredPoiInfo.userName}
                  </div>
                </div>
              </CustomOverlayMap>
            );
          })()}

        {/* 지도 클릭으로 생성된 임시 마커 및 오버레이 */}
        {temporaryPlaces.map((tempPlace) => (
          <React.Fragment key={tempPlace.id}>
            <MapMarker
              position={{
                lat: Number(tempPlace.y),
                lng: Number(tempPlace.x),
              }}
              onMouseOver={() => setHoveredTempPlaceId(tempPlace.id)}
              onMouseOut={() => setHoveredTempPlaceId(null)}
            />
            {hoveredTempPlaceId === tempPlace.id && (
              <CustomOverlayMap
                position={{
                  lat: Number(tempPlace.y),
                  lng: Number(tempPlace.x),
                }}
                yAnchor={1.3} // yAnchor 값을 다른 오버레이와 동일하게 조정합니다.
              >
                <div
                  className="p-3 bg-white rounded-lg shadow-lg min-w-[200px]"
                  onMouseEnter={() => {
                    isOverlayHoveredRef.current = true;
                    setHoveredTempPlaceId(tempPlace.id);
                  }}
                  onMouseLeave={() => {
                    isOverlayHoveredRef.current = false;
                    setHoveredTempPlaceId(null);
                  }}
                >
                  <div className="font-bold text-base">
                    {tempPlace.place_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {tempPlace.address_name}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        isOverlayHoveredRef.current = false;
                        markPoi({
                          latitude: Number(tempPlace.y),
                          longitude: Number(tempPlace.x),
                          address:
                            tempPlace.road_address_name ||
                            tempPlace.address_name,
                          placeName: tempPlace.place_name,
                          categoryName: tempPlace.category_name,
                        });
                        setTemporaryPlaces((prev) =>
                          prev.filter((p) => p.id !== tempPlace.id)
                        );
                      }}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      보관함에 추가
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        isOverlayHoveredRef.current = false;
                        setTemporaryPlaces((prev) =>
                          prev.filter((p) => p.id !== tempPlace.id)
                        );
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CustomOverlayMap>
            )}
          </React.Fragment>
        ))}

        {/* 다른 사용자들의 커서 렌더링 (이전과 동일) */}
        {Object.entries(cursors).map(([userId, cursorData]) => {
          // ... (기존 커서 렌더링 로직)
          return (
            <CustomOverlayMap
              key={userId}
              position={cursorData.position}
              xAnchor={0}
              yAnchor={0}
              zIndex={10}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <img
                  src={cursorData.userAvatar}
                  alt={cursorData.userName}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    order: 1,
                  }}
                />
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={cursorData.userColor || '#FF0000'}
                  style={{ transform: 'rotate(315deg)' }}
                >
                  <path d="M4.222 3.4l15.876 7.938a1 1 0 010 1.789L4.222 21.065a1 1 0 01-1.444-1.245l3.96-6.6-3.96-6.6a1 1 0 011.444-1.22z" />
                </svg>
                <span
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    order: 2,
                  }}
                >
                  {cursorData.userName}
                </span>
                {chatBubbles[userId] && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                      }}
                    >
                      {chatBubbles[userId]}
                    </div>
                  </div>
                )}
              </div>
            </CustomOverlayMap>
          );
        })}

        {/* 각 날짜별 경로 및 정보 오버레이 렌더링 */}
        {dayLayers.map((layer) => (
          <DayRouteRenderer
            key={layer.id}
            layer={layer}
            itinerary={itinerary}
            dailyRouteInfo={dailyRouteInfo}
            visibleDayIds={visibleDayIds}
          />
        ))}
      </KakaoMap>

      {isSyncing && (
        <div className="absolute left-2.5 top-2.5 z-20 rounded bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md">
          데이터 동기화 중...
        </div>
      )}

      {/* 선택된 백엔드 장소 상세 정보 사이드 패널 */}
      {selectedBackendPlace && (
        <div className="absolute right-5 top-5 z-10 flex w-[280px] max-h-[70vh] flex-col overflow-y-auto rounded-[10px] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-3">
            <h2 className="text-[16px] font-bold text-[#222]">장소 정보</h2>
            <button
              onClick={() => setSelectedBackendPlace(null)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xl leading-none text-[#666]"
              aria-label="닫기"
              type="button"
            >
              ×
            </button>
          </div>
          <div className="relative w-full border-b border-[#e0e0e0]">
            {selectedBackendPlace.image_url && (
              <img
                src={selectedBackendPlace.image_url}
                alt={selectedBackendPlace.title}
                className="h-[150px] w-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col gap-3 p-4">
            <h3 className="mb-2.5 text-lg font-bold text-[#222]">
              {selectedBackendPlace.title}
            </h3>
            <div
              className="mb-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
              style={{
                backgroundColor:
                  CATEGORY_INFO[selectedBackendPlace.category as keyof typeof CATEGORY_INFO]?.color || '#808080',
              }}
            >
              {CATEGORY_INFO[selectedBackendPlace.category as keyof typeof CATEGORY_INFO]?.name || '기타'}
            </div>

            {selectedBackendPlace.summary && (
              <div className="mb-4 rounded border-l-[3px] border-[#4caf50] bg-[#f8f9fa] p-3">
                <p
                  className={`m-0 text-[13px] leading-relaxed text-[#555] ${
                    isSummaryExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {selectedBackendPlace.summary}
                </p>
                {selectedBackendPlace.summary.length > 100 && (
                  <button
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="mt-1.5 border-0 bg-transparent p-0 text-xs font-bold text-[#4caf50] underline"
                    type="button"
                  >
                    {isSummaryExpanded ? '접기' : '자세히보기'}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => {
                const poiData = {
                  latitude: selectedBackendPlace.latitude,
                  longitude: selectedBackendPlace.longitude,
                  address: selectedBackendPlace.address,
                  placeName: selectedBackendPlace.title,
                  categoryName: selectedBackendPlace.category,
                };
                markPoi(poiData);
                setSelectedBackendPlace(null);
              }}
              className="w-full rounded bg-[#4caf50] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#45a049]"
              type="button"
            >
              여행지에 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
