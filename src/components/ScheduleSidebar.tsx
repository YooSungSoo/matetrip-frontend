import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MapPin,
  X,
  Clock,
  Car,
  ArrowLeftToLine,
  FileText,
  ArrowRightToLine,
  Trash2,
} from 'lucide-react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Poi } from '../hooks/usePoiSocket';
import type { DayLayer, RouteSegment } from '../types/map';
import { Button } from './ui/button';
import { SimpleToggle } from './ui/SimpleToggle';
import { CategoryIcon } from './CategoryIcon';
import { usePlaceStore } from '../store/placeStore';
import { usePlaceDetail, type NearbyPlace } from '../hooks/usePlaceDetail';
import { InspirationCard } from './InspirationCard';

// Kakao Maps API 로드를 위한 전역 선언
declare global {
  interface Window {
    kakao: any;
  }
}

interface PoiItemProps {
  poi: Poi & { image_url?: string; summary?: string };
  color?: string;
  index?: number;
  onShowDetail: (placeId: string) => void;
  onPoiHover: (poiId: string | null) => void;
  onPoiSelect?: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  isHovered: boolean;
}

function PoiItem({
  poi,
  color,
  index,
  onShowDetail,
  onPoiHover,
  onPoiSelect,
  unmarkPoi,
  removeSchedule,
  isHovered,
}: PoiItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: poi.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (poi.status === 'SCHEDULED' && poi.planDayId) {
      removeSchedule(poi.id, poi.planDayId);
    } else {
      unmarkPoi(poi.id);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center text-sm p-2 rounded-md border border-gray-200 cursor-pointer bg-white ${
        isHovered ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      onMouseEnter={() => onPoiHover(poi.id)}
      onMouseLeave={() => onPoiHover(null)}
      onClick={() => onPoiSelect?.(poi)}
    >
      <div
        {...attributes}
        {...listeners}
        className="touch-none p-1 cursor-grab flex-shrink-0"
      >
        <GripVertical className="w-6 h-6 text-gray-400" />
      </div>

      {poi.image_url ? (
        <img
          src={poi.image_url}
          alt={poi.placeName}
          className="w-12 h-12 rounded-md object-cover ml-2 mr-3 flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center ml-2 mr-3 flex-shrink-0">
          <CategoryIcon
            category={poi.categoryName}
            className="w-6 h-6 text-gray-500"
          />
        </div>
      )}

      <div className="flex items-center flex-grow min-w-0">
        {color && index !== undefined && (
          <span
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-sm mr-2"
            style={{ backgroundColor: color }}
          >
            {index + 1}
          </span>
        )}
        <div className="flex flex-col min-w-0">
          <span className="truncate font-medium">{poi.placeName}</span>
          {poi.categoryName && (
            <span className="truncate text-xs text-gray-500">
              {poi.categoryName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs rounded-full border-gray-200 hover:bg-transparent hover:border-2 hover:border-black"
          onClick={(e) => {
            e.stopPropagation();
            onShowDetail(poi.placeId);
          }}
        >
          상세보기
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          className="w-8 h-8 p-0"
        >
          <Trash2 className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </li>
  );
}

function MarkerStorage({
  pois,
  onShowDetail,
  onPoiHover,
  onPoiSelect,
  unmarkPoi,
  removeSchedule,
  hoveredPoiId,
}: {
  pois: (Poi & { image_url?: string; summary?: string })[];
  onShowDetail: (placeId: string) => void;
  onPoiHover: (poiId: string | null) => void;
  onPoiSelect?: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  hoveredPoiId: string | null;
}) {
  const { setNodeRef } = useDroppable({ id: 'marker-storage' });
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className="px-6 py-4 border border-gray-200 rounded-lg bg-slate-50"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold">장소 보관함</h3>
        </div>
        <Button
          variant="ghost"
          className="size-[28px]"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronDown className="size-[28px]" />
          ) : (
            <ChevronUp className="size-[28px]" />
          )}
        </Button>
      </div>
      {!isCollapsed && (
        <SortableContext
          id="marker-storage-sortable"
          items={pois.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2 min-h-[2rem]">
            {pois.length > 0 ? (
              pois.map((poi) => (
                <PoiItem
                  key={poi.id}
                  poi={poi}
                  onShowDetail={onShowDetail}
                  onPoiHover={onPoiHover}
                  onPoiSelect={onPoiSelect}
                  unmarkPoi={unmarkPoi}
                  removeSchedule={removeSchedule}
                  isHovered={hoveredPoiId === poi.id}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 p-2">
                지도에 장소를 추가하여 보관하세요.
              </p>
            )}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}

function DayItineraryItem({
  layer,
  itinerary,
  visibleDayIds,
  routeSegmentsByDay,
  onDayVisibilityChange,
  onOptimizeRoute,
  onShowDetail,
  onPoiHover,
  onPoiSelect,
  unmarkPoi,
  removeSchedule,
  onToggleCollapse,
  isCollapsed,
  hoveredPoiId,
}: {
  layer: DayLayer;
  itinerary: Record<string, (Poi & { image_url?: string; summary?: string })[]>;
  visibleDayIds: Set<string>;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onOptimizeRoute: (dayId: string) => void;
  onShowDetail: (placeId: string) => void;
  onPoiHover: (poiId: string | null) => void;
  onPoiSelect?: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hoveredPoiId: string | null;
}) {
  const { setNodeRef } = useDroppable({ id: layer.id });

  const pois = itinerary[layer.id] || [];
  const isDayVisible = visibleDayIds.has(layer.id);
  const segmentsForThisDay = routeSegmentsByDay[layer.id] || [];
  const containerBodyClasses = `transition-opacity duration-300 ${
    isDayVisible ? 'opacity-100' : 'opacity-40 pointer-events-none'
  }`;

  return (
    <div className="border border-gray-200 px-6 py-4 rounded-lg bg-slate-50">
      <div
        ref={setNodeRef}
        className="flex items-center justify-between gap-2 "
      >
        <div className="flex items-center gap-2 flex-shrink min-w-0 ">
          <Button
            variant="ghost"
            className="size-[28px]"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronDown className="size-[28px]" />
            ) : (
              <ChevronUp className="size-[28px]" />
            )}
          </Button>
          <h3 className="text-base font-bold truncate">{layer.label}</h3>
          <SimpleToggle
            checked={isDayVisible}
            onChange={(checked) => onDayVisibilityChange(layer.id, checked)}
          />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {pois.length >= 2 && (
            <Button
              variant="outline"
              className="text-sm rounded-full border-gray-200 hover:bg-transparent hover:border-2 hover:border-black"
              onClick={() => onOptimizeRoute(layer.id)}
            >
              경로 최적화
            </Button>
          )}
        </div>
      </div>

      <div className={`mt-6 ${containerBodyClasses}`}>
        {!isCollapsed && (
          <SortableContext
            id={`${layer.id}-sortable`}
            items={pois.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2 min-h-[2rem]">
              {pois.length > 0 ? (
                pois.map((poi, index) => (
                  <React.Fragment key={poi.id}>
                    <PoiItem
                      poi={poi}
                      color={layer.color}
                      index={index}
                      onShowDetail={onShowDetail}
                      onPoiHover={onPoiHover}
                      onPoiSelect={onPoiSelect}
                      unmarkPoi={unmarkPoi}
                      removeSchedule={removeSchedule}
                      isHovered={hoveredPoiId === poi.id}
                    />
                    {index < pois.length - 1 &&
                      (() => {
                        const nextPoi = pois[index + 1];
                        const segment = segmentsForThisDay.find(
                          (s) =>
                            s.fromPoiId === poi.id && s.toPoiId === nextPoi.id
                        );
                        if (!segment) return null;

                        const totalMinutes = Math.ceil(segment.duration / 60);
                        const totalKilometers = (
                          segment.distance / 1000
                        ).toFixed(1);

                        return (
                          <div className="relative flex items-center h-8 pl-8">
                            <div className="absolute left-4 w-0.5 h-full bg-gray-300" />
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="mr-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {`${totalMinutes}분`}
                              </span>
                              <span className="flex items-center">
                                <Car className="w-3 h-3 mr-1" />
                                {`${totalKilometers}km`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                  </React.Fragment>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-2">
                  장소를 보관함에서 드래그하여 추가하세요.
                </p>
              )}
            </ul>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export function PoiDetailPanel({
  placeId,
  isVisible,
  onClose,
  onNearbyPlaceSelect,
  onPoiSelect,
  widthClass = 'w-full',
  onClick,
  positioning = 'absolute',
}: {
  placeId: string | null;
  isVisible: boolean;
  onClose: () => void;
  onNearbyPlaceSelect: (placeId: string) => void;
  onPoiSelect?: (place: Pick<Poi, 'latitude' | 'longitude'>) => void;
  widthClass?: string;
  onClick?: (e: React.MouseEvent) => void;
  positioning?: 'fixed' | 'absolute';
}) {
  const { placeDetail, nearbyPlaces, isLoading, error } =
    usePlaceDetail(placeId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (placeId && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [placeId]);

  useEffect(() => {
    if (isVisible && mapRef.current && placeDetail && window.kakao) {
      const { latitude, longitude } = placeDetail;
      if (latitude && longitude) {
        const options = {
          center: new window.kakao.maps.LatLng(latitude, longitude),
          level: 3,
        };
        const map = new window.kakao.maps.Map(mapRef.current, options);
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(latitude, longitude),
        });
        marker.setMap(map);
        map.relayout();
        map.setCenter(new window.kakao.maps.LatLng(latitude, longitude));
      }
    }
  }, [isVisible, placeDetail]);

  const handleNearbyClick = (place: NearbyPlace) => {
    onNearbyPlaceSelect(place.id);
    if (place.latitude && place.longitude) {
      onPoiSelect?.({ latitude: place.latitude, longitude: place.longitude });
    }
  };

  const renderContent = () => {
    if (!placeId) return null; // ID가 없으면 아무것도 렌더링하지 않음

    if (isLoading) {
      return (
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-4">
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          </div>
          <div className="w-full h-[40vh] bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="space-y-3 pt-2 animate-pulse">
            <div className="w-full h-[200px] bg-gray-200 rounded-lg"></div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded mt-1 flex-shrink-0"></div>
              <div className="h-5 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded mt-1 flex-shrink-0"></div>
              <div className="h-20 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
          <div className="pt-8">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10">
              <InspirationCard isLoading={true} title="" address="" />
              <InspirationCard isLoading={true} title="" address="" />
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">오류 발생: {error.message}</p>
        </div>
      );
    }

    if (!placeDetail) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">장소 정보를 찾을 수 없습니다.</p>
        </div>
      );
    }

    return (
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-8 py-8 space-y-4"
      >
        <div className="mb-6">
          <h3 className="text-2xl font-bold">{placeDetail.title}</h3>
        </div>
        {placeDetail.imageUrl && (
          <img
            src={placeDetail.imageUrl}
            alt={placeDetail.title}
            className="w-full h-[40vh] object-cover rounded-lg"
          />
        )}
        <div className="text-md text-gray-800 space-y-3 pt-2">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
            <span>{placeDetail.address}</span>
          </div>
          {placeDetail.summary && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
              <p className="leading-relaxed">{placeDetail.summary}</p>
            </div>
          )}
        </div>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '200px' }}
          className="rounded-lg"
        ></div>
        {nearbyPlaces.length > 0 && (
          <div className="pt-8">
            <h2 className="text-lg font-bold leading-5 mb-4">
              MateTrip이 추천하는{' '}
              <span className="text-gray-600">{placeDetail.title}</span> 주변
              장소
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10">
              {nearbyPlaces.map((place) => (
                <div
                  key={place.id}
                  className="cursor-pointer"
                  onClick={() => handleNearbyClick(place)}
                >
                  <InspirationCard
                    imageUrl={place.imageUrl}
                    title={place.title}
                    address={place.address}
                    category={place.category}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const positionClass =
    positioning === 'fixed' ? 'fixed h-screen' : 'absolute h-full';

  return (
    <div
      className={`${positionClass} top-0 right-0 bg-white z-30 ${widthClass}`}
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
      }}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-start px-2 py-2 border-b">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

interface ScheduleSidebarProps {
  position: 'hidden' | 'overlay' | 'docked';
  onClose: () => void;
  onDock: () => void;
  onUndock: () => void;
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  markedPois: Poi[];
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  onPoiHover: (poiId: string | null) => void;
  onPoiSelect?: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onOptimizeRoute: (dayId: string) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onMyItineraryVisibilityChange: () => void;
  hoveredPoiId: string | null;
  isOptimizationProcessing: boolean;
}

export function ScheduleSidebar({
  position,
  onClose,
  onDock,
  onUndock,
  itinerary,
  dayLayers,
  markedPois,
  unmarkPoi,
  removeSchedule,
  onPoiHover,
  onPoiSelect,
  routeSegmentsByDay,
  onOptimizeRoute,
  visibleDayIds,
  onDayVisibilityChange,
  onMyItineraryVisibilityChange,
  hoveredPoiId,
}: ScheduleSidebarProps) {
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(
    new Set()
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);

  const handlePoiDetailClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsDetailPanelVisible(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelVisible(false);
  };

  const handleNearbyPlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const placeCache = usePlaceStore((state) => state.placesById);

  const poisWithEnhancedData = useMemo(() => {
    const allPois = [...markedPois, ...Object.values(itinerary).flat()];
    return allPois.map((poi) => {
      const cachedPlace = placeCache.get(poi.placeId);
      if (cachedPlace) {
        return {
          ...poi,
          categoryName: poi.categoryName || cachedPlace.category,
          image_url: cachedPlace.image_url,
          summary: cachedPlace.summary,
        };
      }
      return poi;
    });
  }, [markedPois, itinerary, placeCache]);

  const enrichedMarkedPois = useMemo(
    () =>
      poisWithEnhancedData
        .filter((p) => p.status === 'MARKED')
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [poisWithEnhancedData]
  );

  const enrichedItinerary = useMemo(() => {
    const newItinerary: Record<
      string,
      (Poi & { image_url?: string; summary?: string })[]
    > = {};
    dayLayers.forEach((layer) => {
      newItinerary[layer.id] = poisWithEnhancedData
        .filter((p) => p.planDayId === layer.id && p.status === 'SCHEDULED')
        .sort((a, b) => a.sequence - b.sequence);
    });
    return newItinerary;
  }, [poisWithEnhancedData, dayLayers]);

  const handleToggleDayCollapse = (dayId: string) => {
    setCollapsedDayIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const handleToggleAllCollapse = () => {
    if (collapsedDayIds.size === dayLayers.length) {
      setCollapsedDayIds(new Set());
    } else {
      setCollapsedDayIds(new Set(dayLayers.map((l) => l.id)));
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'docked':
        return 'left-0';
      case 'overlay':
        return 'left-2/5';
      case 'hidden':
      default:
        return 'left-full';
    }
  };

  const getWidthClass = () => {
    switch (position) {
      case 'docked':
        return 'w-2/5'; // 40% 너비
      case 'overlay':
        return 'w-3/5'; // 60% 너비
      case 'hidden':
      default:
        return 'w-3/5'; // 숨겨질 때도 원래 너비 유지
    }
  };

  return (
    <div
      className={`absolute top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-20 rounded-lg overflow-hidden ${getPositionClasses()} ${getWidthClass()}`}
    >
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-between px-10 py-4 border-b border-gray-200"
        >
          <div className="flex items-center gap-2">
            {position === 'overlay' ? (
              <Button variant="ghost" size="icon" onClick={onDock}>
                <ArrowLeftToLine className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={onUndock}>
                <ArrowRightToLine className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-xl font-bold">여행 일정</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-10 py-4 space-y-4">
          <MarkerStorage
            pois={enrichedMarkedPois}
            onShowDetail={handlePoiDetailClick}
            onPoiHover={onPoiHover}
            onPoiSelect={onPoiSelect}
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            hoveredPoiId={hoveredPoiId}
          />
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-0 py-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">전체 경로</h3>
                <SimpleToggle
                  checked={dayLayers.every((layer) =>
                    visibleDayIds.has(layer.id)
                  )}
                  onChange={onMyItineraryVisibilityChange}
                />
              </div>
              <Button
                variant="link"
                className="text-base text-gray-500 p-0 h-auto"
                onClick={handleToggleAllCollapse}
              >
                <ChevronsUpDown className="size-[28px] mr-1" />
                {collapsedDayIds.size === dayLayers.length
                  ? '일정 모두 펴기'
                  : '일정 모두 접기'}
              </Button>
            </div>
            <div className="pt-4 space-y-4">
              {dayLayers.map((layer) => (
                <DayItineraryItem
                  key={layer.id}
                  layer={layer}
                  itinerary={enrichedItinerary}
                  visibleDayIds={visibleDayIds}
                  routeSegmentsByDay={routeSegmentsByDay}
                  onDayVisibilityChange={onDayVisibilityChange}
                  onOptimizeRoute={onOptimizeRoute}
                  onShowDetail={handlePoiDetailClick}
                  onPoiHover={onPoiHover}
                  onPoiSelect={onPoiSelect}
unmarkPoi={unmarkPoi}
                  removeSchedule={removeSchedule}
                  isCollapsed={collapsedDayIds.has(layer.id)}
                  onToggleCollapse={() => handleToggleDayCollapse(layer.id)}
                  hoveredPoiId={hoveredPoiId}
                />
              ))}
            </div>
          </div>
        </div>
        <PoiDetailPanel
          placeId={selectedPlaceId}
          isVisible={isDetailPanelVisible}
          onClose={handleCloseDetailPanel}
          onNearbyPlaceSelect={handleNearbyPlaceSelect}
          onPoiSelect={onPoiSelect}
          widthClass="w-full" // ScheduleSidebar 내부에서는 기존 너비 유지
          onClick={(e) => e.stopPropagation()} // 이벤트 전파 방지
        />
      </div>
    </div>
  );
}
