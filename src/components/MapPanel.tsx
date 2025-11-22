import { PlusCircle, X, ChevronsRight, Filter, Star } from 'lucide-react';
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
import { FamousPlacesCarousel } from './FamousPlacesCarousel';

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
  workspaceId: string;
  itinerary: Record<string, Poi[]>;
  recommendedItinerary: Record<string, Poi[]>;
  dayLayers: { id: string; label: string; color: string; planDate: string }[];
  placesToRender: PlaceDto[];
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
  itineraryAiPlaces: AiPlace[] | undefined;
  chatAiPlaces: AiPlace[] | undefined;
  isProgrammaticMove: React.MutableRefObject<boolean>;
  schedulePosition: 'hidden' | 'overlay' | 'docked';
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
  highlightedPlaceId: string | null;
}

export interface PoiMarkerProps {
  poi: Poi;
  markerLabel?: string;
  markerColor?: string;
  unmarkPoi: (poiId: string) => void;
  isOverlayHoveredRef: React.MutableRefObject<boolean>;
  isHovered: boolean;
  place: PlaceDto | undefined;
  pois: Poi[];
  markPoi: (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy'>) => void;
}

export interface DayRouteRendererProps {
  layer: { id: string; label: string; color: string };
  itinerary: Record<string, Poi[]>;
  dailyRouteInfo: Record<string, RouteSegment[]>;
  visibleDayIds: Set<string>;
}

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
    pois: Poi[];
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
            {(place.category &&
              CATEGORY_INFO[place.category as keyof typeof CATEGORY_INFO]
                ?.name) ||
              '기타'}
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
    highlightedPlaceId,
  }: PlaceMarkerProps) => {
    const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
    const infoWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
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
      if (isInfoWindowClickedRef.current) {
        isInfoWindowClickedRef.current = false;
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

    const getMarkerImageSrc = (place: PlaceDto, markedPoi?: Poi): string => {
      const categoryCode = place.category;
      const isMarkedOnly = markedPoi && markedPoi.status === 'MARKED';
      const scheduleInfo = markedPoi?.id
        ? scheduledPoiData.get(markedPoi.id)
        : undefined;
      const recommendedLabelInfo = recommendedPoiLabelData.get(place.id);
      const badgeInfo = scheduleInfo || recommendedLabelInfo;

      const categoryInfo =
        CATEGORY_INFO[categoryCode as keyof typeof CATEGORY_INFO];
      const color =
        NEW_CATEGORY_COLORS[categoryCode] || categoryInfo?.color || '#808080';
      const strokeColor = 'white';
      const strokeWidth = '2';

      let iconSvg = '';

      switch (categoryCode) {
        case '레포츠':
          iconSvg = `
          <g transform="translate(20, 18)">
            <circle cx="-4" cy="4" r="3" stroke="white" stroke-width="1.5" fill="none"/>
            <circle cx="4" cy="4" r="3" stroke="white" stroke-width="1.5" fill="none"/>
            <path d="M-4,4 L0,-2 L4,4 M0,-2 L0,1"
                  stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M-1,-2 L1,-2"
                  stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </g>
        `;
          break;

        case '추천코스':
          iconSvg = `
          <g transform="translate(20, 18)">
            <path d="M0,-6 L1.5,-2 L6,-2 L2.5,1 L4,6 L0,3 L-4,6 L-2.5,1 L-6,-2 L-1.5,-2 Z"
                  fill="white" stroke="white" stroke-width="1"/>
          </g>
        `;
          break;

        case '인문(문화/예술/역사)':
          iconSvg = `
          <g transform="translate(20, 18)">
            <path d="M-7,-4 L0,-7 L7,-4 Z" fill="white" stroke="white" stroke-width="1"/>
            <rect x="-6" y="-3" width="2" height="8" fill="white"/>
            <rect x="-1" y="-3" width="2" height="8" fill="white"/>
            <rect x="4" y="-3" width="2" height="8" fill="white"/>
            <rect x="-7" y="5" width="14" height="1" fill="white"/>
          </g>
        `;
          break;

        case '자연':
          iconSvg = `
          <g transform="translate(20, 18)">
            <circle cx="0" cy="-3" r="4" fill="white"/>
            <circle cx="-3" cy="-1" r="3" fill="white"/>
            <circle cx="3" cy="-1" r="3" fill="white"/>
            <rect x="-1" y="1" width="2" height="5" fill="white"/>
          </g>
        `;
          break;

        case '숙박':
          iconSvg = `
            <g transform="translate(20, 18)">
              <rect x="-8" y="-5" width="2.5" height="7" fill="white" rx="0.5"/>
              <rect x="-5.5" y="-0.5" width="12" height="4" fill="white" rx="0.5"/>
              <rect x="-4.5" y="-3" width="4" height="2.5" fill="white" rx="0.5"/>
              <rect x="-5.5" y="3.5" width="2" height="3.5" fill="white"/>
              <rect x="4.5" y="3.5" width="2" height="3.5" fill="white"/>
            </g>
          `;
          break;

        case '음식':
          iconSvg = `
            <g transform="translate(20, 18)">
              <path d="M-5.5,-7 L-5.5,-1 M-7,-7 L-7,-2 C-7,-1 -6,-1 -5.5,-1 M-4,-7 L-4,-2 C-4,-1 -5,-1 -5.5,-1 M-5.5,-1 L-5.5,7"
                    stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3.5,-7 L3.5,7 M3.5,-7 L6,-6 L6,-4 L3.5,-2.5"
                    stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          `;
          break;

        default:
          iconSvg = `
              <circle cx="16" cy="16" r="6" fill="white"/>
            `;
      }

      const svg = `
      <svg width="44" height="48" viewBox="0 -6 48 52" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C11 0 4 8 4 18c0 12 16 28 16 28s16-16 16-28C36 8 29 0 20 0z"
              fill="${color}" 
              stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
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
        ${iconSvg}
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

    const markedPoi = findPoiByCoordinates(
      pois,
      place.latitude,
      place.longitude
    );
    const markerImageSrc = getMarkerImageSrc(place, markedPoi);
    const markerImage = {
      src: markerImageSrc,
      size: { width: 44, height: 48 },
      options: {
        offset: { x: 22, y: 48 },
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
        {place.id === highlightedPlaceId && (
          <CustomOverlayMap
            position={{ lat: place.latitude, lng: place.longitude }}
            zIndex={0}
            xAnchor={0.55}
            yAnchor={0.55}
          >
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 bg-blue-500/20 pointer-events-none" />
          </CustomOverlayMap>
        )}
      </>
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

    const segments = dailyRouteInfo[layer.id];
    const dayPois = itinerary[layer.id] || [];

    return (
      <>
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
          : dayPois.length > 1 && (
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

        {segments &&
          segments.length > 0 &&
          segments.map((segment, index) => {
            if (!segment.path || segment.path.length === 0) return null;

            const midPointIndex = Math.floor(segment.path.length / 2);
            const midPoint = segment.path[midPointIndex];

            const totalMinutes = Math.ceil(segment.duration / 60);
            const totalKilometers = (segment.distance / 1000).toFixed(1);

            return (
              <CustomOverlayMap
                key={`route-info-${layer.id}-${index}`}
                position={{ lat: midPoint.lat, lng: midPoint.lng }}
                yAnchor={1.6}
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
                    transition: 'opacity 0.3s ease-in-out',
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
  workspaceId,
  itinerary,
  recommendedItinerary,
  dayLayers,
  placesToRender,
  pois,
  isSyncing,
  markPoi,
  selectedPlace,
  unmarkPoi,
  mapRef,
  hoveredPoiInfo,
  setSelectedPlace,
  onRouteInfoUpdate,
  onRouteOptimized,
  optimizingDayId,
  onOptimizationComplete,
  latestChatMessage,
  cursors,
  moveCursor,
  clickEffects,
  clickMap,
  visibleDayIds,
  initialCenter,
  focusPlace,
  itineraryAiPlaces,
  chatAiPlaces,
  isProgrammaticMove,
  schedulePosition,
}: MapPanelProps) {
  const defaultCenter = { lat: 33.450701, lng: 126.570667 };
  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);
  const addPlacesToCache = usePlaceStore((state) => state.addPlaces);
  const pendingSelectedPlaceRef = useRef<KakaoPlace | null>(null);
  const isOverlayHoveredRef = useRef(false);
  const [dailyRouteInfo, setDailyRouteInfo] = useState<
    Record<string, RouteSegment[]>
  >({});
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORY_INFO))
  );
  const [isCategoryFilterVisible, setIsCategoryFilterVisible] = useState(true);
  const [showFamousPlaces, setShowFamousPlaces] = useState(true);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(
    null
  );
  const isOptimizingRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itineraryRef = useRef(itinerary);

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  const onRouteOptimizedRef = useRef(onRouteOptimized);
  const onOptimizationCompleteRef = useRef(onOptimizationComplete);

  useEffect(() => {
    onRouteOptimizedRef.current = onRouteOptimized;
  }, [onRouteOptimized]);

  useEffect(() => {
    onOptimizationCompleteRef.current = onOptimizationComplete;
  }, [onOptimizationComplete]);

  const [recommendedRouteInfo, setRecommendedRouteInfo] = useState<
    Record<string, RouteSegment[]>
  >({});

  const recommendedPoiMap = React.useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(recommendedItinerary).forEach(([dayId, pois]) => {
      pois.forEach((poi) => {
        map.set(poi.placeId, dayId);
      });
    });
    return map;
  }, [recommendedItinerary]);

  const [chatBubbles, setChatBubbles] = useState<Record<string, string>>({});
  const chatBubbleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (latestChatMessage) {
      const { userId, message } = latestChatMessage;

      if (chatBubbleTimers.current[userId]) {
        clearTimeout(chatBubbleTimers.current[userId]);
      }

      setChatBubbles((prev) => ({ ...prev, [userId]: message }));

      chatBubbleTimers.current[userId] = setTimeout(() => {
        setChatBubbles((prev) => {
          const newBubbles = { ...prev };
          delete newBubbles[userId];
          return newBubbles;
        });
        delete chatBubbleTimers.current[userId];
      }, 5000);
    }

    return () => {
      Object.values(chatBubbleTimers.current).forEach(clearTimeout);
    };
  }, [latestChatMessage]);

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

  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedBackendPlace, setSelectedBackendPlace] =
    useState<PlaceDto | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const fetchPlacesInView = useCallback(
    async (map: kakao.maps.Map) => {
      try {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

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

  const handleMapBoundsChanged = useCallback(
    (map: kakao.maps.Map) => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }

      fetchTimerRef.current = setTimeout(() => {
        fetchPlacesInView(map);
      }, 500);
    },
    [fetchPlacesInView]
  );

  const handlePlaceClick = useCallback(
    (place: PlaceDto) => {
      if (mapInstance) {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }

        const position = new window.kakao.maps.LatLng(
          place.latitude,
          place.longitude
        );
        mapInstance.setLevel(5, { anchor: position });
        mapInstance.panTo(position);

        setHighlightedPlaceId(place.id);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedPlaceId(null);
        }, 3000);
      }
    },
    [mapInstance]
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

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

      console.warn('KakaoPlace selection flow needs placeId implementation');
      setSelectedPlace(null);
    }
  }, [mapInstance, markPoi, setSelectedPlace]);

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
              summary: 'false',
              road_details: 'true',
              guides: 'true',
            });

            if (waypointsParam) {
              queryParams.append('waypoints', waypointsParam);
            }

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
              console.error(
                `[DEBUG] Kakao Mobility API HTTP Error for day ${dayLayer.id}: Status ${response.status}, Text: ${response.statusText}`
              );
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(
              `[DEBUG] Raw API response for day ${dayLayer.id}:`,
              data
            );

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

              data.routes[0].sections.forEach(
                (section: KakaoNaviSection, index: number) => {
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
                    console.warn(
                      `[DEBUG] Section ${index} for day ${dayLayer.id} has no guides. Skipping this section.`
                    );
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

  useEffect(() => {
    if (!optimizingDayId) {
      isOptimizingRef.current = false;
      return;
    }

    if (isOptimizingRef.current) return;

    console.log(`[Effect] Optimizing route for day: ${optimizingDayId}`);

    const optimizeRoute = async () => {
      const dayPois = itineraryRef.current[optimizingDayId];
      if (!dayPois) {
        console.warn(
          `[Optimization] No POIs found for day ${optimizingDayId}.`
        );
        onOptimizationCompleteRef.current?.();
        return;
      }

      console.log(
        '[Optimization] POIs to be optimized:',
        dayPois.map((p) => p.placeName)
      );

      try {
        isOptimizingRef.current = true;
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

        if (result.ids && onRouteOptimized) {
          const optimizedPoiNames = result.ids.map(
            (id: string) => dayPois.find((p) => p.id === id)?.placeName
          );
          console.log(
            '[Optimization] Optimized POI order (names):',
            optimizedPoiNames
          );

          onRouteOptimizedRef.current?.(optimizingDayId, result.ids);
        }
      } catch (error) {
        console.error(
          `[Optimization] Error during optimization for day ${optimizingDayId}:`,
          error
        );
      } finally {
        isOptimizingRef.current = false;
        onOptimizationCompleteRef.current?.();
      }
    };

    optimizeRoute();
  }, [optimizingDayId]);

  const scheduledPoiData = new Map<string, { label: string; color: string }>();
  dayLayers.forEach((dayLayer) => {
    const dayPois = itinerary[dayLayer.id];
    if (dayPois) {
      dayPois.forEach((poi, index) => {
        const label = String(index + 1);

        scheduledPoiData.set(poi.id, {
          label,
          color: dayLayer.color,
        });
      });
    }
  });

  const recommendedPoiLabelData = new Map<
    string,
    { label: string; color: string }
  >();
  dayLayers.forEach((dayLayer) => {
    const virtualDayId = `rec-${workspaceId}-${dayLayer.planDate}`;
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
      if (prev.size < allCategoryKeys.length) {
        return new Set(allCategoryKeys);
      }
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

  const allPoisAsPlaces = React.useMemo(() => {
    const allPois = [
      ...Object.values(itinerary).flat(),
      ...Object.values(recommendedItinerary).flat(),
      ...(chatAiPlaces || []),
    ];

    return allPois.map(
      (poi): PlaceDto => ({
        id: (poi as Poi).placeId || (poi as AiPlace).id,
        title:
          (poi as Poi).placeName || (poi as AiPlace).title || '이름 없는 장소',
        address: poi.address,
        latitude: poi.latitude,
        longitude: poi.longitude,
        category:
          ((poi as any).categoryName as CategoryCode) ||
          ((poi as any).category as CategoryCode) ||
          '기타',
        image_url: '',
        summary: '',
        popularityScore: (poi as any).popularityScore,
      })
    );
  }, [itinerary, recommendedItinerary, chatAiPlaces]);

  const allPlacesToRender = React.useMemo(() => {
    const combined = [...placesToRender, ...allPoisAsPlaces];
    const uniquePlaces = new Map<string, PlaceDto>();
    combined.forEach((place) => {
      if (!uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, place);
      }
    });
    return Array.from(uniquePlaces.values());
  }, [placesToRender, allPoisAsPlaces]);

  const famousPlaces = React.useMemo(
    () =>
      allPlacesToRender
        .filter((p) => (p.popularityScore ?? 0) > 0)
        .sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0)),
    [allPlacesToRender]
  );

  const famousPlaceIds = React.useMemo(
    () => new Set(famousPlaces.map((p) => p.id)),
    [famousPlaces]
  );

  const filteredPlacesToRender = allPlacesToRender.filter((place) => {
    if (famousPlaceIds.has(place.id)) {
      return true;
    }

    if (visibleCategories.has(place.category)) {
      return true;
    }

    const markedPoi = findPoiByCoordinates(
      pois,
      place.latitude,
      place.longitude
    );
    if (
      markedPoi &&
      markedPoi.planDayId &&
      visibleDayIds.has(markedPoi.planDayId)
    ) {
      return true;
    }

    const recommendedDayId = recommendedPoiMap.get(place.id);
    return !!recommendedDayId && visibleDayIds.has(recommendedDayId);
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>
        {`
          div[style*="background: rgb(255, 255, 255);"][style*="border: 1px solid rgb(118, 129, 168);"] {
            display: none !important;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes ripple-thrice {
            from {
              transform: scale(0.2);
              opacity: 0.7;
            }
            to {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          .animate-ripple-thrice {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 3px solid #3b82f6;
            animation: ripple-thrice 0.8s ease-out;
            animation-iteration-count: 3;
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
          if (isOverlayHoveredRef.current) {
            isOverlayHoveredRef.current = false;
            return;
          }
          setHighlightedPlaceId(null);
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          const latlng = mouseEvent.latLng;
          clickMap({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          });
        }}
      >
        {schedulePosition !== 'overlay' && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-2 p-1.5">
            <button
              onClick={() => setShowFamousPlaces(!showFamousPlaces)}
              className="p-1.5 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 flex-shrink-0"
            >
              <Star
                size={18}
                className={
                  showFamousPlaces ? 'text-yellow-400 fill-current' : ''
                }
              />
            </button>
            <div className="border-l border-gray-300 h-6" />
            <button
              onClick={() =>
                setIsCategoryFilterVisible(!isCategoryFilterVisible)
              }
              className="p-1.5 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 flex-shrink-0"
            >
              {isCategoryFilterVisible ? (
                <ChevronsRight size={18} />
              ) : (
                <Filter size={18} />
              )}
            </button>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateColumns: isCategoryFilterVisible ? '1fr' : '0fr',
              }}
            >
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 min-w-max pr-1">
                  <div className="border-l border-gray-300 h-6" />
                  <button
                    onClick={handleToggleAllCategories}
                    className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-full shadow-md transition-all duration-200 flex justify-center items-center gap-1.5"
                    style={{
                      backgroundColor:
                        visibleCategories.size ===
                        Object.keys(CATEGORY_INFO).length
                          ? '#374151'
                          : 'white',
                      color:
                        visibleCategories.size ===
                        Object.keys(CATEGORY_INFO).length
                          ? 'white'
                          : '#4B5563',
                    }}
                  >
                    전체
                  </button>

                  {Object.entries(CATEGORY_INFO).map(
                    ([key, { name, color }]) => (
                      <button
                        key={key}
                        onClick={() => handleCategoryToggle(key)}
                        className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-full shadow-md transition-all duration-200 flex justify-center items-center gap-1.5"
                        style={{
                          backgroundColor: visibleCategories.has(key)
                            ? NEW_CATEGORY_COLORS[key] || color
                            : 'white',
                          color: visibleCategories.has(key)
                            ? 'white'
                            : '#4B5563',
                        }}
                      >
                        <CategoryIcon
                          category={key as CategoryCode}
                          className="w-4 h-4"
                        />
                        {name}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {filteredPlacesToRender.map((place) => (
          <PlaceMarker
            key={`${place.id}-${place.latitude}-${place.longitude}`}
            place={place}
            onPlaceClick={handlePlaceClick}
            markPoi={markPoi}
            unmarkPoi={unmarkPoi}
            pois={pois}
            isOverlayHoveredRef={isOverlayHoveredRef}
            scheduledPoiData={scheduledPoiData}
            recommendedPoiLabelData={recommendedPoiLabelData}
            highlightedPlaceId={highlightedPlaceId}
          />
        ))}

        {itineraryAiPlaces?.map((place) => {
          const dayId = recommendedPoiMap.get(place.id);
          const isVisible = dayId ? visibleDayIds.has(dayId) : false;

          if (!isVisible) {
            return null;
          }

          return (
            <CustomOverlayMap
              key={`rec-highlight-${place.id}`}
              position={{ lat: place.latitude, lng: place.longitude }}
              xAnchor={0.5}
              yAnchor={0.5}
              zIndex={0}
              clickable={false}
            >
              <div className="w-16 h-16 rounded-full border-4 border-purple-500 bg-purple-500/20 animate-pulse pointer-events-none" />
            </CustomOverlayMap>
          );
        })}

        {chatAiPlaces?.map((place) => (
          <CustomOverlayMap
            key={`chat-rec-highlight-${place.id}`}
            position={{ lat: place.latitude, lng: place.longitude }}
            xAnchor={0.55}
            yAnchor={0.55}
            zIndex={0}
            clickable={false}
          >
            <div className="w-16 h-16 rounded-full border-4 border-purple-500 bg-purple-500/20 animate-pulse pointer-events-none" />
          </CustomOverlayMap>
        ))}

        {clickEffects.map((effect) => (
          <CustomOverlayMap
            key={effect.id}
            position={effect.position}
            zIndex={5}
            xAnchor={0.5}
            yAnchor={0.5}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ animation: 'fade-out 1s ease-out forwards' }}
            >
              <span
                className="px-2 py-1 text-xs text-white rounded-md shadow-md z-10"
                style={{
                  backgroundColor: effect.userColor,
                  animationDelay: '0.5s',
                }}
              >
                {effect.userName}
              </span>
            </div>
          </CustomOverlayMap>
        ))}

        {hoveredPoiInfo &&
          (() => {
            const poi = pois.find((p) => p.id === hoveredPoiInfo.poiId);
            // [수정] poi가 pois 배열에 존재하지 않으면 파란색 원을 렌더링하지 않음
            // 이렇게 하면 POI가 삭제되었을 때 파란색 원이 즉시 사라집니다.
            if (!poi) {
              // 이상적으로는 부모 컴포넌트에서 hoveredPoiInfo를 null로 설정해야 합니다.
              return null;
            }

            return (
              <CustomOverlayMap
                position={{ lat: poi.latitude, lng: poi.longitude }}
                xAnchor={0.5}
                yAnchor={0.8}
                zIndex={4}
              >
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 w-full h-full rounded-full border-4 border-blue-500 bg-blue-500/20 animate-pulse" />
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

        {Object.entries(cursors).map(([userId, cursorData]) => {
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

        {dayLayers.map((layer) => (
          <DayRouteRenderer
            key={layer.id}
            layer={layer}
            itinerary={itinerary}
            dailyRouteInfo={dailyRouteInfo}
            visibleDayIds={visibleDayIds}
          />
        ))}

        {Object.entries(recommendedRouteInfo).map(([dayId, segments]) => {
          const isVisible = visibleDayIds.has(dayId);
          const dayLayer = dayLayers.find((layer) =>
            dayId.endsWith(layer.planDate)
          );
          const routeColor = dayLayer ? dayLayer.color : '#FF00FF';

          return segments.map((segment, index) => (
            <Polyline
              key={`rec-${dayId}-segment-${index}`}
              path={segment.path}
              strokeWeight={5}
              strokeColor={routeColor}
              strokeOpacity={isVisible ? 0.7 : 0}
              strokeStyle={'dashed'}
            />
          ));
        })}

        {selectedBackendPlace && (
          <CustomOverlayMap
            position={{
              lat: selectedBackendPlace.latitude,
              lng: selectedBackendPlace.longitude,
            }}
            yAnchor={1.1}
            zIndex={11}
          >
            <div
              className="relative min-w-[200px] max-w-[300px] rounded-lg bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={() => {
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

              {selectedBackendPlace.summary && (
                <div className="mt-2 text-[12px] leading-snug text-[#888]">
                  <div
                    className={isSummaryExpanded ? '' : 'line-clamp-3'}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
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

      {showFamousPlaces && (
        <FamousPlacesCarousel
          places={famousPlaces}
          onPlaceSelect={handlePlaceClick}
        />
      )}

      {isSyncing && (
        <div className="absolute left-2.5 top-2.5 z-20 rounded bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
            <span>데이터 동기화 중...</span>
          </div>
        </div>
      )}

      <div
        id="map-video-overlay-root"
        className="pointer-events-none absolute top-3 right-3 z-30 flex flex-col items-end gap-2"
      />
    </div>
  );
}
