import { PlusCircle, X } from 'lucide-react';
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import type { Poi, CreatePoiDto, HoveredPoiInfo } from '../hooks/usePoiSocket';
import {
  // prettier-ignore
  Map as KakaoMap,
  MapMarker,
  CustomOverlayMap,
  Polyline,
} from 'react-kakao-maps-sdk';
import { Button } from './ui/button';
import { AI_SERVER_URL, KAKAO_REST_API_KEY } from '../constants';
import { usePlaceStore } from '../store/placeStore';
import type { CategoryCode, PlaceDto } from '../types/place';
import { CATEGORY_INFO } from '../types/place';
import { findPoiByCoordinates } from '../utils/coordinates';

import type {
  KakaoPlace,
  RouteSegment,
  KakaoNaviRoad,
  KakaoNaviSection,
  KakaoNaviGuide,
} from '../types/map';
import { CategoryIcon } from './CategoryIcon';
import type { AiPlace } from '../hooks/useChatSocket.ts';

/**
 * [신규] PoiMarker를 위한 커스텀 마커 아이콘 생성 함수
 * @param label 마커에 표시될 텍스트 (예: 숫자)
 * @param color 마커의 배경색
 * @returns SVG 데이터 URI 문자열
 */
// const createCustomMarkerIcon = (label: string, color: string): string => {
//   const svg = `
//     <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
//       <path d="M18 0C9.85 0 3 6.85 3 15c0 10.5 15 25.5 15 25.5S33 25.5 33 15C33 6.85 26.15 0 18 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
//       <text x="18" y="19" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" alignment-baseline="central">
//         ${label}
//       </text>
//     </svg>
//   `;
//   return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
// };

// [신규] 요청된 새로운 카테고리 색상 팔레트
const NEW_CATEGORY_COLORS: Record<string, string> = {
  '인문(문화/예술/역사)': '#DAA520', // Gold
  레포츠: '#E67E22', // Orange
  자연: '#27AE60', // Green
  숙박: '#2980B9', // Blue
  음식: '#E74C3C', // Red-Orange
  추천코스: '#9B59B6', // Purple
  기타: '#7F8C8D', // Gray
};

interface MapPanelProps {
  workspaceId: string; // [신규] workspaceId를 prop으로 받습니다.
  itinerary: Record<string, Poi[]>;
  recommendedItinerary: Record<string, Poi[]>;
  dayLayers: { id: string; label: string; color: string; planDate: string }[];
  placesToRender: PlaceDto[]; // [수정] 렌더링할 장소 목록을 prop으로 받음
  pois: Poi[];
  isSyncing: boolean;
  markPoi: (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy'>) => void;
  unmarkPoi: (poiId: string) => void;
  selectedPlace: KakaoPlace | null;
  setSelectedPlace: (place: KakaoPlace | null) => void;
  mapRef: React.RefObject<kakao.maps.Map | null>;
  hoveredPoiInfo: HoveredPoiInfo | null;
  onRouteInfoUpdate: (info: Record<string, RouteSegment[]>) => void;
  onRouteOptimized?: (dayId: string, poiIds: string[]) => void;
  optimizingDayId: string | null;
  onOptimizationComplete?: () => void;
  latestChatMessage: {
    userId: string;
    message: string;
    avatar?: string;
  } | null;
  cursors: Record<
    string,
    {
      position: { lat: number; lng: number };
      userName: string;
      userColor: string;
      userAvatar: string;
    }
  >;
  moveCursor: (position: { lat: number; lng: number }) => void;
  clickEffects: {
    id: string;
    position: { lat: number; lng: number };
    userId: string;
    userColor: string;
    userName: string;
  }[];
  clickMap: (position: { lat: number; lng: number }) => void;
  visibleDayIds: Set<string>;
  initialCenter: { lat: number; lng: number } | null;
  focusPlace: (
    bounds: {
      southWestLatitude: number;
      southWestLongitude: number;
      northEastLatitude: number;
      northEastLongitude: number;
    },
    callback: (places: any[]) => void
  ) => void;
  isRecommendationOpen: boolean;
  setIsRecommendationOpen: (isOpen: boolean) => void;
  recommendedPlaces: AiPlace[] | undefined;
  isProgrammaticMove: React.MutableRefObject<boolean>;
}

export interface PlaceMarkerProps {
  place: PlaceDto;
  onPlaceClick: (place: PlaceDto) => void;
  markPoi: (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy'>) => void;
  unmarkPoi: (poiId: string) => void;
  pois: Poi[];
  isOverlayHoveredRef: React.MutableRefObject<boolean>;
  scheduledPoiData: Map<string, { label: string; color: string }>;
  recommendedPoiLabelData: Map<string, { label: string; color: string }>;
}

export interface PoiMarkerProps {
  poi: Poi;
  markerLabel?: string;
  markerColor?: string;
  unmarkPoi: (poiId: string) => void;
  isOverlayHoveredRef: React.MutableRefObject<boolean>;
  isHovered: boolean;
  place: PlaceDto | undefined; // PoiMarker가 원본 PlaceDto 정보를 받을 수 있도록 추가
  pois: Poi[];
  markPoi: (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy'>) => void;
}

export interface DayRouteRendererProps {
  layer: { id: string; label: string; color: string };
  itinerary: Record<string, Poi[]>;
  dailyRouteInfo: Record<string, RouteSegment[]>;
  visibleDayIds: Set<string>;
}

/**
 * 장소 정보창(인포윈도우) 컴포넌트
 * PlaceMarker와 PoiMarker에서 재사용됩니다.
 */
const PlaceInfoWindow = memo(
  ({
    place,
    pois,
    isOverlayHoveredRef,
    onClose,
    markPoi,
    unmarkPoi,
  }: {
    place: PlaceDto;
    pois: Poi[]; // isMarked 확인을 위해 필요
    isOverlayHoveredRef: React.MutableRefObject<boolean>;
    onClose: () => void;
    markPoi: (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy'>) => void;
    unmarkPoi: (poiId: string) => void;
  }) => {
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const markedPoi = findPoiByCoordinates(
      pois,
      place.latitude,
      place.longitude
    );
    const isMarked = !!markedPoi;

    return (
      <div
        className="min-w-[200px] max-w-[300px] rounded-lg bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
        onMouseDown={() => {
          isOverlayHoveredRef.current = true;
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-gray-500/50 p-0 text-white hover:bg-gray-600/60"
          aria-label="닫기"
          type="button"
        >
          <X size={14} />
        </button>

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
            <div
              className={isSummaryExpanded ? '' : 'line-clamp-3'}
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              {place.summary}
            </div>
            {place.summary.length > 100 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSummaryExpanded(!isSummaryExpanded);
                }}
                className="mt-1 border-0 bg-transparent p-0 text-xs font-bold text-[#4caf50] underline"
                type="button"
              >
                {isSummaryExpanded ? '접기' : '자세히 보기'}
              </button>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="inline-block rounded bg-[#f5f5f5] px-2 py-1 text-[11px] text-[#999]">
            {CATEGORY_INFO[place.category as keyof typeof CATEGORY_INFO]
              ?.name || '기타'}
          </div>
          <Button
            size="sm"
            className={`h-7 px-2.5 text-xs transition-colors ${isMarked ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4caf50] hover:bg-[#45a049]'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isMarked && markedPoi) {
                unmarkPoi(markedPoi.id);
              } else {
                markPoi({
                  placeId: place.id,
                  latitude: place.latitude,
                  longitude: place.longitude,
                  address: place.address,
                  placeName: place.title,
                  categoryName: place.category,
                });
              }
              onClose();
            }}
          >
            {isMarked ? (
              <X size={14} className="mr-1" />
            ) : (
              <PlusCircle size={14} className="mr-1" />
            )}
            {isMarked ? '보관함에서 제거' : '보관함에 추가'}
          </Button>
        </div>
      </div>
    );
  }
);

/**
 * 백엔드에서 가져온 장소를 표시하는 마커 컴포넌트
 */
const PlaceMarker = memo(
  ({
    place,
    onPlaceClick,
    markPoi,
    unmarkPoi,
    pois,
    isOverlayHoveredRef,
    scheduledPoiData,
    recommendedPoiLabelData,
  }: PlaceMarkerProps) => {
    const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
    const infoWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    // [추가] 정보창이 클릭되었는지 확인하는 ref. '접기' 클릭 시 창이 바로 닫히는 것을 방지합니다.
    const isInfoWindowClickedRef = useRef(false);

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
      // [수정] 정보창이 방금 클릭되었다면, mouse out 로직을 잠시 무시합니다.
      if (isInfoWindowClickedRef.current) {
        isInfoWindowClickedRef.current = false; // 플래그를 다시 false로 설정합니다.
        return;
      }

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
    const getMarkerImageSrc = (place: PlaceDto, markedPoi?: Poi): string => {
      // '보관함' 또는 '일반' 상태에 대한 아이콘 생성
      const categoryCode = place.category;
      const isMarkedOnly = markedPoi && markedPoi.status === 'MARKED';
      const scheduleInfo = markedPoi?.id
        ? scheduledPoiData.get(markedPoi.id)
        : undefined;
      // [신규] AI 추천 경로의 라벨 정보를 가져옵니다.
      const recommendedLabelInfo = recommendedPoiLabelData.get(place.id);
      // '내 일정'과 'AI 추천' 중 하나를 선택하여 배지 정보를 설정합니다.
      const badgeInfo = scheduleInfo || recommendedLabelInfo;

      // 카테고리별 색상 가져오기
      const categoryInfo =
        CATEGORY_INFO[categoryCode as keyof typeof CATEGORY_INFO];
      // [수정] 새로운 색상 팔레트를 적용합니다.
      const color =
        NEW_CATEGORY_COLORS[categoryCode] || categoryInfo?.color || '#808080';
      // [수정] '보관함' 상태일 때의 테두리 스타일은 기본으로 되돌리고, 후광 효과로 대체합니다.
      const strokeColor = 'white';
      const strokeWidth = '2';

      // 카테고리별로 다른 SVG 아이콘 생성
      let iconSvg = '';

      switch (categoryCode) {
        case '레포츠': // 레포츠 - 자전거/활동 아이콘
          iconSvg = `
          <g transform="translate(20, 18)">
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
          <g transform="translate(20, 18)">
            <!-- 별 -->
            <path d="M0,-6 L1.5,-2 L6,-2 L2.5,1 L4,6 L0,3 L-4,6 L-2.5,1 L-6,-2 L-1.5,-2 Z"
                  fill="white" stroke="white" stroke-width="1"/>
          </g>
        `;
          break;

        case '인문(문화/예술/역사)': // 문화/역사 - 박물관/건물
          iconSvg = `
          <g transform="translate(20, 18)">
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
          <g transform="translate(20, 18)">
            <!-- 나무 잎 -->
            <circle cx="0" cy="-3" r="4" fill="white"/>
            <circle cx="-3" cy="-1" r="3" fill="white"/>
            <circle cx="3" cy="-1" r="3" fill="white"/>
            <!-- 나무 줄기 -->
            <rect x="-1" y="1" width="2" height="5" fill="white"/>
          </g>
        `;
          break;

        case '숙박': // 숙박 - 침대 아이콘
          iconSvg = `
            <g transform="translate(20, 18)">
              <!-- 침대 머리판 -->
              <rect x="-8" y="-5" width="2.5" height="7" fill="white" rx="0.5"/>
              <!-- 침대 본체 -->
              <rect x="-5.5" y="-0.5" width="12" height="4" fill="white" rx="0.5"/>
              <!-- 베개 -->
              <rect x="-4.5" y="-3" width="4" height="2.5" fill="white" rx="0.5"/>
              <!-- 침대 다리 -->
              <rect x="-5.5" y="3.5" width="2" height="3.5" fill="white"/>
              <rect x="4.5" y="3.5" width="2" height="3.5" fill="white"/>
            </g>
          `;
          break;

        case '음식': // 음식 - 식기 아이콘
          iconSvg = `
            <g transform="translate(20, 18)">
              <!-- 포크 -->
              <path d="M-5.5,-7 L-5.5,-1 M-7,-7 L-7,-2 C-7,-1 -6,-1 -5.5,-1 M-4,-7 L-4,-2 C-4,-1 -5,-1 -5.5,-1 M-5.5,-1 L-5.5,7"
                    stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- 나이프 -->
              <path d="M3.5,-7 L3.5,7 M3.5,-7 L6,-6 L6,-4 L3.5,-2.5"
                    stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
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
      <svg width="48" height="52" viewBox="0 -6 48 52" xmlns="http://www.w3.org/2000/svg">
        {/* 핀 모양 배경 - [수정] 새로운 색상 팔레트를 적용합니다. */}
        <path d="M20 0C11 0 4 8 4 18c0 12 16 28 16 28s16-16 16-28C36 8 29 0 20 0z"
              fill="${color}" 
              stroke="${strokeColor}" stroke-width="${strokeWidth}"/>

        <!-- [수정] 일정에 포함된 경우, 우측 상단에 숫자 배지 추가 -->
        ${
          badgeInfo
            ? `
          <g transform="translate(34, 4)">
            <circle cx="0" cy="0" r="10" fill="${badgeInfo.color}" stroke="white" stroke-width="2"/>
            <text x="0" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle" alignment-baseline="central">
              ${badgeInfo.label}
            </text>
          </g>
        `
            : ''
        }

        <!-- 카테고리별 아이콘 -->
        ${iconSvg}

        <!-- [수정] '보관함' 상태일 때만 표시되는 별 아이콘 -->
        ${
          isMarkedOnly
            ? `
          <path d="M35, -6 L38.5, 3 L48, 4 L41.5, 10 L44, 18 L35, 14 L26, 18 L28.5, 10 L22, 4 L31.5, 3 Z"
                fill="#FFD700" stroke="white" stroke-width="2.5" />
        `
            : ''
        }
      </svg>
    `;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    // 현재 장소가 보관함(pois)에 이미 추가되었는지 확인합니다.
    const markedPoi = findPoiByCoordinates(
      pois,
      place.latitude,
      place.longitude
    );
    const markerImageSrc = getMarkerImageSrc(place, markedPoi);
    const markerImage = {
      src: markerImageSrc,
      size: { width: 48, height: 52 }, // 확장된 SVG 크기에 맞춰 업데이트
      options: {
        offset: { x: 24, y: 52 }, // 확장된 SVG 크기에 맞춰 기준점 업데이트
      },
    };

    const isMarked = !!markedPoi;
    return (
      <>
        <MapMarker
          position={{ lat: place.latitude, lng: place.longitude }}
          image={markerImage}
          clickable={true}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onClick={handleClick}
          // 보관함에 추가된 장소일 경우, z-index를 높여 다른 마커(PoiMarker) 위에 표시되도록 합니다.
          // 이렇게 하면 커스텀 마커가 기본 마커를 가리게 됩니다.
          zIndex={
            scheduledPoiData.has(markedPoi?.id ?? '') ? 3 : isMarked ? 2 : 1
          }
        />
        {isInfoWindowOpen && (
          <CustomOverlayMap
            position={{ lat: place.latitude, lng: place.longitude }}
            xAnchor={0.5}
            yAnchor={1.15}
            zIndex={10}
          >
            <div
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              onMouseDown={() => {
                isInfoWindowClickedRef.current = true;
              }}
            >
              <PlaceInfoWindow
                place={place}
                pois={pois}
                isOverlayHoveredRef={isOverlayHoveredRef}
                onClose={() => setIsInfoWindowOpen(false)}
                markPoi={markPoi}
                unmarkPoi={unmarkPoi}
              />
            </div>
          </CustomOverlayMap>
        )}
      </>
    );
  }
);

// const PoiMarker = memo(
//   ({
//     poi,
//     markerLabel,
//     markerColor,
//     unmarkPoi,
//     isOverlayHoveredRef,
//     isHovered,
//     place, // place prop 추가
//     pois,
//     markPoi,
//   }: PoiMarkerProps) => {
//     const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
//     const infoWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//     // [수정] isVisible 로직 변경
//     // 마커의 가시성은 markerLabel의 존재 여부가 아니라,
//     // POI의 상태와 부모로부터 받은 가시성 정보(visibleDayIds)에 따라 결정되어야 합니다.
//     const isVisible =
//       poi.status === 'MARKED' ||
//       (poi.status === 'SCHEDULED' &&
//         poi.planDayId &&
//         markerLabel !== undefined);
//
//     const handleMouseOver = () => {
//       // 마커가 보이지 않으면 호버 이벤트를 무시합니다.
//       if (!isVisible) return;
//
//       if (infoWindowTimeoutRef.current) {
//         clearTimeout(infoWindowTimeoutRef.current);
//         infoWindowTimeoutRef.current = null;
//       }
//       isOverlayHoveredRef.current = true;
//       setIsInfoWindowOpen(true);
//     };
//
//     const handleMouseOut = () => {
//       // 마커가 보이지 않으면 호버 이벤트를 무시합니다.
//       if (!isVisible) return;
//
//       infoWindowTimeoutRef.current = setTimeout(() => {
//         isOverlayHoveredRef.current = false;
//         setIsInfoWindowOpen(false);
//       }, 100);
//     };
//
//     const handleClick = () => {
//       // 마커가 보이지 않으면 클릭 이벤트를 무시합니다.
//       if (!isVisible) return;
//
//       if (infoWindowTimeoutRef.current) {
//         clearTimeout(infoWindowTimeoutRef.current);
//         infoWindowTimeoutRef.current = null;
//       }
//       isOverlayHoveredRef.current = true;
//       setIsInfoWindowOpen(true);
//     };
//
//     const isScheduled = poi.status === 'SCHEDULED' && markerLabel !== undefined;
//     // isScheduled가 true일 때만 커스텀 아이콘을 사용하고, false일 때는 undefined로 두어 기본 마커를 사용하도록 합니다.
//     const markerImage = isScheduled
//       ? {
//           src: createCustomMarkerIcon(markerLabel, markerColor || '#FF5733'),
//           size: { width: 36, height: 48 },
//           options: {
//             offset: { x: 18, y: 48 }, // 마커의 하단 중앙을 좌표에 맞춤
//           },
//         }
//       : undefined;
//
//     return (
//       <MapMarker
//         position={{ lat: poi.latitude, lng: poi.longitude }}
//         image={markerImage} // isScheduled가 아니면 기본 카카오 마커가 표시됩니다.
//         draggable={false}
//         clickable={true}
//         onMouseOver={handleMouseOver}
//         onMouseOut={handleMouseOut}
//         onClick={handleClick}
//         // [수정] isVisible을 기반으로 투명도 조절
//         // isHovered는 isVisible일 때만 의미가 있습니다.
//         opacity={!isVisible ? 0 : isHovered ? 0.5 : 1}
//         // [수정] zIndex 로직 단순화.
//         // PlaceMarker가 모든 것을 처리하므로, PoiMarker는 PlaceMarker가 없을 때만 렌더링됩니다.
//         // 따라서 복잡한 zIndex 경쟁이 필요 없어집니다.
//         // isScheduled일 때만 zIndex를 높여 다른 기본 마커들보다 위에 오도록 합니다.
//         zIndex={isScheduled ? 3 : 0}
//       >
//         {isInfoWindowOpen && (
//           <CustomOverlayMap
//             position={{ lat: poi.latitude, lng: poi.longitude }}
//             xAnchor={0.5}
//             yAnchor={1.3}
//             zIndex={3}
//           >
//             <div onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
//               {place ? (
//                 <PlaceInfoWindow
//                   place={place}
//                   pois={pois}
//                   isOverlayHoveredRef={isOverlayHoveredRef}
//                   onClose={() => setIsInfoWindowOpen(false)}
//                   markPoi={markPoi}
//                   unmarkPoi={unmarkPoi} // 여기서는 unmarkPoi만 필요하지만, PlaceInfoWindow는 markPoi도 받습니다.
//                 />
//               ) : (
//                 <div className="p-3 bg-white rounded-lg shadow-lg min-w-[200px]">
//                   <div className="font-bold text-base">{poi.placeName}</div>
//                   <div className="text-xs text-gray-500 truncate">
//                     {poi.address}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </CustomOverlayMap>
//         )}
//       </MapMarker>
//     );
//   }
// );

const DayRouteRenderer = memo(
  ({
    layer,
    itinerary,
    dailyRouteInfo,
    visibleDayIds,
  }: DayRouteRendererProps) => {
    const isVisible = visibleDayIds.has(layer.id);

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
                strokeOpacity={isVisible ? 0.9 : 0}
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
                strokeOpacity={isVisible ? 0.9 : 0}
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
                    opacity: isVisible ? 1 : 0,
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
  workspaceId, // [신규]
  itinerary,
  recommendedItinerary,
  dayLayers,
  placesToRender,
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
  initialCenter, // props로 받음
  focusPlace, // [추가] focusPlace prop
  recommendedPlaces,
  isProgrammaticMove,
}: MapPanelProps) {
  const defaultCenter = { lat: 33.450701, lng: 126.570667 }; // 제주도 기본 위치
  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
  const addPlacesToCache = usePlaceStore((state) => state.addPlaces); // 스토어의 액션 가져오기
  const pendingSelectedPlaceRef = useRef<KakaoPlace | null>(null);
  // [추가] 오버레이 위에 마우스가 있는지 확인하기 위한 Ref
  const isOverlayHoveredRef = useRef(false);
  const [dailyRouteInfo, setDailyRouteInfo] = useState<
    Record<string, RouteSegment[]>
  >({});
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORY_INFO))
  );

  const [recommendedRouteInfo, setRecommendedRouteInfo] = useState<
    Record<string, RouteSegment[]>
  >({});

  // [신규] 추천 POI를 빠르게 조회하기 위해 Map으로 변환합니다.
  const recommendedPoiMap = React.useMemo(() => {
    const map = new Map<string, string>(); // key: placeId, value: dayId
    Object.entries(recommendedItinerary).forEach(([dayId, pois]) => {
      pois.forEach((poi) => {
        map.set(poi.placeId, dayId);
      });
    });
    return map;
  }, [recommendedItinerary]);

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

  // [신규] initialCenter prop이 변경되면 지도를 해당 위치로 이동시킵니다.
  useEffect(() => {
    if (mapInstance && initialCenter) {
      const newCenter = new window.kakao.maps.LatLng(
        initialCenter.lat,
        initialCenter.lng
      );
      mapInstance.panTo(newCenter);
    }
  }, [mapInstance, initialCenter]);

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
  // 디바운스를 위한 타이머 ref
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 선택된 백엔드 장소 상태
  const [selectedBackendPlace, setSelectedBackendPlace] =
    useState<PlaceDto | null>(null);
  // summary 펼치기/접기 상태
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  /**
   * 지도 영역 내의 장소 데이터를 가져오는 함수 (WebSocket 기반)
   */
  const fetchPlacesInView = useCallback(
    async (map: kakao.maps.Map) => {
      try {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest(); // 남서쪽 좌표
        const ne = bounds.getNorthEast(); // 북동쪽 좌표

        const mapBounds = {
          southWestLatitude: sw.getLat(),
          southWestLongitude: sw.getLng(),
          northEastLatitude: ne.getLat(),
          northEastLongitude: ne.getLng(),
        };

        console.log('Fetching places for bounds via WebSocket:', mapBounds);
        focusPlace(mapBounds, (places) => {
          console.log('Received places via WebSocket:', places);
          addPlacesToCache(places);
        });
      } catch (error) {
        console.error('Failed to fetch places:', error);
      }
    },
    [addPlacesToCache, focusPlace]
  );

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
  const handlePlaceClick = useCallback(
    (place: PlaceDto) => {
      if (mapInstance) {
        const position = new window.kakao.maps.LatLng(
          place.latitude,
          place.longitude
        );
        mapInstance.setLevel(5, { anchor: position });
        mapInstance.panTo(position);
      }
    },
    [mapInstance]
  );

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
      setSelectedPlace(null); // 처리 후 상태 초기화
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

      // TODO: KakaoPlace를 선택할 때 placeId가 필요함.
      // 백엔드에 place를 먼저 생성하거나, 이 플로우를 제거해야 함.
      console.warn('KakaoPlace selection flow needs placeId implementation');
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

            // [추가] API 요청 URL 로깅
            console.log(
              `[DEBUG] Kakao Mobility API Request URL for day ${dayLayer.id}: https://apis-navi.kakaomobility.com/v1/directions?${queryParams.toString()}`
            );

            const response = await fetch(
              `https://apis-navi.kakaomobility.com/v1/directions?${queryParams.toString()}`,
              {
                headers: {
                  Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
                },
              }
            );
            if (!response.ok) {
              // [추가] HTTP 오류 상태 로깅
              console.error(
                `[DEBUG] Kakao Mobility API HTTP Error for day ${dayLayer.id}: Status ${response.status}, Text: ${response.statusText}`
              );
              throw new Error(`HTTP error! status: ${response.status}`);
            }

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

                  // [추가] findClosestPoi가 null을 반환하는 경우 로깅
                  if (!fromPoi) {
                    console.warn(
                      `[DEBUG] From POI not found for section ${index} in day ${dayLayer.id} at coordinates (${startGuide.x}, ${startGuide.y})`
                    );
                  }
                  if (!toPoi) {
                    console.warn(
                      `[DEBUG] To POI not found for section ${index} in day ${dayLayer.id} at coordinates (${endGuide.x}, ${endGuide.y})`
                    );
                  }

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
            } else {
              // [수정] API 응답에 routes 또는 sections가 없는 경우, 에러 코드와 메시지를 로깅
              if (data.routes && data.routes[0]) {
                const routeResult = data.routes[0];
                console.warn(
                  `[DEBUG] Kakao Mobility API did not return sections for day ${dayLayer.id}. Result Code: ${routeResult.result_code}, Message: ${routeResult.result_msg}`,
                  data
                );
              } else {
                console.warn(
                  `[DEBUG] Kakao Mobility API response for day ${dayLayer.id} does not contain valid routes:`,
                  data
                );
              }
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

  useEffect(() => {
    const drawRecommendedRoutes = async () => {
      const newRecommendedRouteInfo: Record<string, RouteSegment[]> = {};

      for (const dayId in recommendedItinerary) {
        const dayPois = recommendedItinerary[dayId];
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
              summary: 'false',
              road_details: 'true',
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

            if (data.routes && data.routes[0]?.sections) {
              const segmentsForDay: RouteSegment[] = [];
              const poisForThisDay = [originPoi, ...waypoints, destinationPoi];

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

              data.routes[0].sections.forEach((section: KakaoNaviSection) => {
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

                const guides = section.guides as KakaoNaviGuide[];
                if (!guides || guides.length === 0) {
                  return;
                }
                const startGuide = guides[0];
                const endGuide = guides[guides.length - 1];

                const fromPoi = findClosestPoi(
                  startGuide.x,
                  startGuide.y,
                  poisForThisDay
                );
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
              });
              newRecommendedRouteInfo[dayId] = segmentsForDay;
            }
          } catch (error) {
            console.error(
              `Error fetching directions for recommended day ${dayId}:`,
              error
            );
          }
        }
      }
      setRecommendedRouteInfo(newRecommendedRouteInfo);
    };

    drawRecommendedRoutes();
  }, [recommendedItinerary]);

  // [추가] 경로 최적화 전용 useEffect: optimizingDayId가 변경될 때만 실행
  useEffect(() => {
    if (!optimizingDayId) return;

    console.log(`[Effect] Optimizing route for day: ${optimizingDayId}`);

    const optimizeRoute = async () => {
      const dayPois = itinerary[optimizingDayId];
      if (!dayPois) {
        console.warn(
          `[Optimization] No POIs found for day ${optimizingDayId}.`
        );
        onOptimizationComplete?.();
        return;
      }

      // [추가] 최적화할 POI들의 이름을 로그로 출력합니다.
      console.log(
        '[Optimization] POIs to be optimized:',
        dayPois.map((p) => p.placeName)
      );

      try {
        // API에 보낼 poi_list를 구성합니다.
        const poi_list = dayPois.map((poi) => ({
          id: poi.id,
          latitude: poi.latitude,
          longitude: poi.longitude,
        }));

        const payload = { poi_list };
        console.log(
          `[Optimization] Calling API for day ${optimizingDayId} with payload:`,
          payload
        );

        const response = await fetch(`${AI_SERVER_URL}/optimization/route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[Optimization] API Response:', result);

        // API 응답에서 최적화된 POI ID 순서를 추출하여 부모 컴포넌트로 전달합니다.
        if (result.ids && onRouteOptimized) {
          // [추가] 최적화된 순서에 해당하는 POI 이름을 로그로 출력합니다.
          const optimizedPoiNames = result.ids.map(
            (id: string) => dayPois.find((p) => p.id === id)?.placeName
          );
          console.log(
            '[Optimization] Optimized POI order (names):',
            optimizedPoiNames
          );

          onRouteOptimized(optimizingDayId, result.ids);
        }
      } catch (error) {
        console.error(
          `[Optimization] Error during optimization for day ${optimizingDayId}:`,
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
      dayPois.forEach((poi, index) => {
        // [수정] '출발/경유/도착' 대신 순서대로 숫자를 라벨로 사용합니다.
        const label = String(index + 1);

        scheduledPoiData.set(poi.id, {
          label,
          color: dayLayer.color,
        });
      });
    }
  });

  // [신규] AI 추천 경로의 마커에 표시할 숫자 라벨 데이터를 생성합니다.
  const recommendedPoiLabelData = new Map<
    string,
    { label: string; color: string }
  >();
  dayLayers.forEach((dayLayer) => {
    const virtualDayId = `rec-${workspaceId}-${dayLayer.planDate}`; // 'rec-workspaceId-YYYY-MM-DD' 형식으로 수정
    const dayPois = recommendedItinerary[virtualDayId];
    if (dayPois) {
      dayPois.forEach((poi, index) => {
        recommendedPoiLabelData.set(poi.placeId, {
          label: String(index + 1),
          color: dayLayer.color,
        });
      });
    }
  });

  const handleToggleAllCategories = () => {
    setVisibleCategories((prev) => {
      const allCategoryKeys = Object.keys(CATEGORY_INFO);
      // 일부만 선택되었거나 모두 선택되지 않았을 경우 -> 모두 선택
      if (prev.size < allCategoryKeys.length) {
        return new Set(allCategoryKeys);
      }
      // 모두 선택되었을 경우 -> 모두 해제
      return new Set<string>();
    });
  };

  const handleCategoryToggle = (categoryKey: string) => {
    setVisibleCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  // [신규] itinerary와 recommendedItinerary에 포함된 모든 POI를 PlaceDto 형태로 변환합니다.
  // 이렇게 하면 지도 범위와 상관없이 항상 마커를 표시할 수 있습니다.
  const allPoisAsPlaces = React.useMemo(() => {
    const allPois = [
      ...Object.values(itinerary).flat(),
      ...Object.values(recommendedItinerary).flat(),
    ];

    return allPois.map(
      (poi): PlaceDto => ({
        id: poi.placeId,
        title: poi.placeName || '이름 없는 장소', // [수정] placeName이 없을 경우 기본값 제공
        address: poi.address,
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: (poi.categoryName as CategoryCode) || '기타', // [수정] categoryName이 없을 경우 기본값 제공 및 타입 단언
        image_url: '',
        summary: '',
      })
    );
  }, [itinerary, recommendedItinerary]);

  // [신규] 지도 범위 기반 장소와, 일정에 포함된 모든 장소를 합치고 중복을 제거합니다.
  const allPlacesToRender = React.useMemo(() => {
    const combined = [...placesToRender, ...allPoisAsPlaces];
    const uniquePlaces = new Map<string, PlaceDto>();
    combined.forEach((place) => {
      // placesToRender의 정보가 더 상세하므로, 중복 시 기존 값을 유지합니다.
      if (!uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, place);
      }
    });
    return Array.from(uniquePlaces.values());
  }, [placesToRender, allPoisAsPlaces]);

  // [수정] 필터링 대상을 allPlacesToRender로 변경하여 모든 마커에 필터가 적용되도록 합니다.
  const filteredPlacesToRender = allPlacesToRender.filter((place) => {
    // 조건 1: 카테고리 필터가 켜져 있는 경우
    if (visibleCategories.has(place.category)) {
      return true;
    }

    // 조건 2: '내 일정'에 포함된 장소인 경우
    const markedPoi = findPoiByCoordinates(
      pois,
      place.latitude,
      place.longitude
    );
    // '내 일정'에 포함되어 있고, 해당 날짜의 경로가 켜져 있는 경우
    if (
      markedPoi &&
      markedPoi.planDayId &&
      visibleDayIds.has(markedPoi.planDayId)
    ) {
      return true;
    }

    // 조건 3: 'AI 추천 일정'에 포함되어 있고, 해당 날짜의 경로가 보이는 경우
    const recommendedDayId = recommendedPoiMap.get(place.id);
    return !!recommendedDayId && visibleDayIds.has(recommendedDayId);
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
        center={initialCenter || defaultCenter}
        className="h-full w-full"
        level={3}
        onCreate={(map) => {
          if (mapRef) {
            (mapRef as React.MutableRefObject<kakao.maps.Map>).current = map;
            setMapInstance(map);
          }
        }}
        onIdle={(map) => {
          if (isProgrammaticMove.current) {
            map.relayout();
            isProgrammaticMove.current = false;
          }
          handleMapBoundsChanged(map);
        }}
        onClick={(_map, mouseEvent) => {
          // 오버레이 위에서 발생한 클릭이면 마커를 생성하지 않음
          if (isOverlayHoveredRef.current) return;

          const latlng = mouseEvent.latLng;
          // 다른 사용자에게 클릭 이벤트를 전파합니다.
          clickMap({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          });
        }}
      >
        {/* 카테고리 필터 버튼 */}
        <div className="absolute top-2.5 right-2.5 z-20 flex gap-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-md">
          {/* [신규] 전체 토글 버튼 */}
          <button
            onClick={handleToggleAllCategories}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex justify-center items-center gap-1.5 ${
              visibleCategories.size === Object.keys(CATEGORY_INFO).length
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            전체
          </button>
          {/* 구분선 */}
          <div className="border-b border-gray-300 my-1" />

          {Object.entries(CATEGORY_INFO).map(([key, { name, color }]) => (
            <button
              key={key}
              onClick={() => handleCategoryToggle(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex justify-center items-center gap-1.5 ${
                visibleCategories.has(key)
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                // [수정] 새로운 색상 팔레트를 적용합니다.
                backgroundColor: visibleCategories.has(key)
                  ? NEW_CATEGORY_COLORS[key] || color
                  : undefined,
              }}
            >
              <CategoryIcon
                category={key as CategoryCode}
                className="w-4 h-4"
              />
              {name}
            </button>
          ))}
        </div>
        {/* [수정] 필터링된 최종 목록인 filteredPlacesToRender를 사용하여 마커를 렌더링합니다. */}
        {filteredPlacesToRender.map((place) => (
          <PlaceMarker
            // ID가 임시 ID인 경우 key가 중복될 수 있으므로 좌표를 추가하여 고유성을 보장합니다.
            key={`${place.id}-${place.latitude}-${place.longitude}`}
            place={place}
            onPlaceClick={handlePlaceClick}
            markPoi={markPoi}
            unmarkPoi={unmarkPoi}
            pois={pois}
            isOverlayHoveredRef={isOverlayHoveredRef}
            scheduledPoiData={scheduledPoiData}
            recommendedPoiLabelData={recommendedPoiLabelData}
          />
        ))}

        {/* AI 추천 장소 강조 효과 */}
        {recommendedPlaces?.map((place) => (
          <CustomOverlayMap
            key={`rec-highlight-${place.id}`}
            position={{ lat: place.latitude, lng: place.longitude }}
            xAnchor={0.5}
            yAnchor={0.93}
            zIndex={0}
            clickable={false}
          >
            <div className="w-16 h-16 rounded-full border-4 border-purple-500 bg-purple-500/20 animate-pulse pointer-events-none" />
          </CustomOverlayMap>
        ))}

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

        {/* AI 추천 경로 렌더링 */}
        {Object.entries(recommendedRouteInfo).map(([dayId, segments]) => {
          const isVisible = visibleDayIds.has(dayId);
          // [수정] 추천 경로의 dayId에서 날짜 정보를 찾아 해당하는 dayLayer의 색상을 사용합니다.
          // dayId 형식: rec-workspaceId-YYYY-MM-DD
          const dayLayer = dayLayers.find((layer) =>
            dayId.endsWith(layer.planDate)
          );
          const routeColor = dayLayer ? dayLayer.color : '#FF00FF'; // 일치하는 색상이 없으면 기본 자홍색 사용

          return segments.map((segment, index) => (
            <Polyline
              key={`rec-${dayId}-segment-${index}`}
              path={segment.path}
              strokeWeight={5}
              strokeColor={routeColor} // [수정] 각 날짜별 색상 적용
              strokeOpacity={isVisible ? 0.7 : 0}
              strokeStyle={'dashed'} // 점선으로 표시
            />
          ));
        })}

        {/* 선택된 백엔드 장소 상세 정보 사이드 패널 */}
        {selectedBackendPlace && (
          <CustomOverlayMap
            position={{
              lat: selectedBackendPlace.latitude,
              lng: selectedBackendPlace.longitude,
            }}
            yAnchor={1.1} // 마커 이미지 높이를 고려하여 조정
            zIndex={11} // 다른 정보창보다 위에 표시되도록 z-index 조정
          >
            {/* 마우스 오버 정보창과 유사한 스타일로 변경 */}
            <div
              className="relative min-w-[200px] max-w-[300px] rounded-lg bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
              onClick={(e) => {
                // 이 오버레이 내부에서 발생하는 모든 클릭 이벤트의 전파를 막습니다.
                e.stopPropagation();
              }}
              onMouseDown={() => {
                // 클릭이 시작될 때 isOverlayHoveredRef를 true로 설정하여 지도 클릭을 막습니다.
                isOverlayHoveredRef.current = true;
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBackendPlace(null);
                }}
                className="absolute right-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-gray-500/50 p-0 text-white hover:bg-gray-600/60"
                aria-label="닫기"
                type="button"
              >
                <X size={14} />
              </button>

              <div className="mb-2 text-[16px] font-bold text-[#333]">
                {selectedBackendPlace.title}
              </div>
              {selectedBackendPlace.image_url && (
                <img
                  src={selectedBackendPlace.image_url}
                  alt={selectedBackendPlace.title}
                  className="mb-2 h-[120px] w-full rounded object-cover"
                />
              )}
              <div className="mb-1 text-[13px] text-[#666]">
                {selectedBackendPlace.address}
              </div>

              {/* 요약 정보 (자세히보기/접기 기능 유지) */}
              {selectedBackendPlace.summary && (
                <div className="mt-2 text-[12px] leading-snug text-[#888]">
                  {/* p 태그 대신 div를 사용하고, 줄 바꿈을 강제하는 인라인 스타일을 적용합니다. */}
                  <div
                    className={isSummaryExpanded ? '' : 'line-clamp-3'}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal', // 줄 바꿈을 명시적으로 허용합니다.
                    }}
                  >
                    {selectedBackendPlace.summary}
                  </div>
                  {selectedBackendPlace.summary.length > 100 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSummaryExpanded(!isSummaryExpanded);
                      }}
                      className="mt-1 border-0 bg-transparent p-0 text-xs font-bold text-[#4caf50] underline"
                      type="button"
                    >
                      {isSummaryExpanded ? '접기' : '자세히 보기'}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between">
                <div className="inline-block rounded bg-[#f5f5f5] px-2 py-1 text-[11px] text-[#999]">
                  {CATEGORY_INFO[
                    selectedBackendPlace.category as keyof typeof CATEGORY_INFO
                  ]?.name || '기타'}
                </div>
                {(() => {
                  const markedPoi = findPoiByCoordinates(
                    pois,
                    selectedBackendPlace.latitude,
                    selectedBackendPlace.longitude
                  );
                  const isMarked = !!markedPoi;

                  return (
                    <Button
                      size="sm"
                      className={`h-7 px-2.5 text-xs transition-colors ${
                        isMarked
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-[#4caf50] hover:bg-[#45a049]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMarked && markedPoi) {
                          unmarkPoi(markedPoi.id);
                        } else {
                          markPoi({
                            placeId: selectedBackendPlace.id,
                            latitude: selectedBackendPlace.latitude,
                            longitude: selectedBackendPlace.longitude,
                            address: selectedBackendPlace.address,
                            placeName: selectedBackendPlace.title,
                            categoryName: selectedBackendPlace.category,
                          });
                        }
                        setSelectedBackendPlace(null);
                      }}
                    >
                      {isMarked ? (
                        <X size={14} className="mr-1" />
                      ) : (
                        <PlusCircle size={14} className="mr-1" />
                      )}
                      {isMarked ? '보관함에서 제거' : '보관함에 추가'}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </CustomOverlayMap>
        )}
      </KakaoMap>

      {isSyncing && (
        <div className="absolute left-2.5 top-2.5 z-20 rounded bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
            <span>데이터 동기화 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}
