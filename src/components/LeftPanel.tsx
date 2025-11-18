import { useState, useMemo } from 'react';
import { usePlaceStore } from '../store/placeStore'; // [추가] 장소 캐시를 사용하기 위해 import
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SimpleToggle } from './ui/SimpleToggle';
import {
  ListOrdered,
  GripVertical,
  ChevronDown,
  Lightbulb,
  ChevronUp, // [수정] ChevronsUpDown 아이콘으로 변경
  ChevronsUpDown,
  MapPin,
  X,
  PlusCircle,
  Clock,
  Car,
  MessageCircle,
  Check,
  RefreshCw,
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
import React from 'react';
import { ChatPanel } from './ChatPanel';
import { CategoryIcon } from './CategoryIcon'; // [추가] CategoryIcon 임포트
import { type AiPlace, type ChatMessage } from '../hooks/useChatSocket';

interface PoiItemProps {
  poi: Poi;
  color?: string;
  index?: number;
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  isHovered: boolean;
  onAddRecommendedPoi?: (poi: Poi) => void;
  allAddedPois?: Poi[];
}

function PoiItem({
  poi,
  color,
  index,
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  isHovered,
  onAddRecommendedPoi,
  allAddedPois,
}: PoiItemProps) {
  const isRecommended = poi.status === ('RECOMMENDED' as any);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: poi.id, disabled: isRecommended });

  const isAdded = useMemo(() => {
    if (!isRecommended || !allAddedPois) return false;
    // Using toFixed to avoid floating point inaccuracies
    const poiCoord = `${poi.latitude.toFixed(5)},${poi.longitude.toFixed(5)}`;
    return allAddedPois.some((p) => {
      const addedPoiCoord = `${p.latitude.toFixed(5)},${p.longitude.toFixed(
        5
      )}`;
      return addedPoiCoord === poiCoord;
    });
  }, [poi, allAddedPois, isRecommended]);

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

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddRecommendedPoi?.(poi);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center text-sm p-1 rounded-md cursor-pointer ${
        isHovered ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      onClick={() => onPoiClick(poi)}
      onMouseEnter={() => onPoiHover(poi.id)}
      onMouseLeave={() => onPoiHover(null)}
    >
      <div className="flex items-center w-12 flex-shrink-0 gap-1">
        {!isRecommended ? (
          <div
            {...attributes}
            {...listeners}
            className="touch-none p-1 cursor-grab"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        ) : (
          <div className="w-6 h-6 p-1" /> // 아이콘이 없을 때 레이아웃 유지를 위한 빈 div
        )}
        {color && index !== undefined && (
          <span
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-sm"
            style={{ backgroundColor: color }}
          >
            {index + 1}
          </span>
        )}
      </div>
      {/* [수정] 아이콘과 장소 이름을 함께 표시 */}
      <div className="flex items-center gap-2 flex-grow ml-2 min-w-0">
        <CategoryIcon
          category={poi.categoryName}
          className="w-4 h-4 text-gray-500 flex-shrink-0"
        />
        <span className="truncate">{poi.placeName}</span>
      </div>
      {isRecommended ? (
        isAdded ? (
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="w-6 h-6 p-0 flex-shrink-0 text-green-500 cursor-default"
            aria-label="이미 추가됨"
          >
            <Check className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddClick}
            className="w-6 h-6 p-0 flex-shrink-0 text-blue-500 hover:bg-blue-100"
            aria-label="내 일정에 담기"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
        )
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteClick}
          className="w-6 h-6 p-0 flex-shrink-0"
        >
          <X className="w-3 h-3 text-gray-500" />
        </Button>
      )}
    </li>
  );
}

function MarkerStorage({
  pois,
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  hoveredPoiId,
}: {
  pois: Poi[];
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  hoveredPoiId: string | null;
}) {
  const { setNodeRef } = useDroppable({ id: 'marker-storage' });
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div ref={setNodeRef} className="p-3 border-b">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold">장소 보관함</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
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
                  onPoiClick={onPoiClick}
                  onPoiHover={onPoiHover}
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
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  onToggleCollapse,
  isCollapsed,
  hoveredPoiId,
}: {
  layer: DayLayer;
  itinerary: Record<string, Poi[]>;
  visibleDayIds: Set<string>;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onOptimizeRoute: (dayId: string) => void;
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
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
    <div className="border-b pb-2 px-3">
      <div
        ref={setNodeRef}
        className="flex items-center justify-between gap-2 "
      >
        <div className="flex items-center gap-2 flex-shrink min-w-0 ">
          <SimpleToggle
            checked={isDayVisible}
            onChange={(checked) => onDayVisibilityChange(layer.id, checked)}
          />
          <h3 className="text-base font-bold truncate">{layer.label}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {pois.length >= 2 && (
            <Button
              variant="outline"
              size="sm" // size="sm"에 text-sm이 포함되어 있지만 명시적으로 변경
              className="h-7 text-sm "
              onClick={() => onOptimizeRoute(layer.id)}
            >
              경로 최적화
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 "
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className={`mt-2 ${containerBodyClasses}`}>
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
                      onPoiClick={onPoiClick}
                      onPoiHover={onPoiHover}
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

function ItineraryPanel({
  itinerary,
  dayLayers,
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  routeSegmentsByDay,
  onOptimizeRoute,
  visibleDayIds,
  onDayVisibilityChange,
  hoveredPoiId,
  isRecommendationLoading,
  onMyItineraryVisibilityChange, // [수정] '내 일정' 전체 토글 핸들러 prop
}: {
  workspaceId: string;
  isRecommendationLoading: boolean;
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onOptimizeRoute: (dayId: string) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  hoveredPoiId: string | null;
  onMyItineraryVisibilityChange: () => void; // [수정] '내 일정' 전체 토글 핸들러 prop
}) {
  // [신규] '내 일정'의 접기/펼치기 상태 관리
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(
    new Set()
  );

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
    // 모든 날짜가 접혀있으면 모두 펴고, 그렇지 않으면 모두 접습니다.
    if (collapsedDayIds.size === dayLayers.length) {
      setCollapsedDayIds(new Set());
    } else {
      setCollapsedDayIds(new Set(dayLayers.map((l) => l.id)));
    }
  };

  return (
    <div className="p-3 space-y-3 flex flex-col">
      {isRecommendationLoading ? (
        <div className="flex justify-center items-center h-full text-base text-gray-500">
          AI 추천 일정을 불러오는 중...
        </div>
      ) : (
        <>
          {/* [신규] 전체 경로 토글 스위치 */}
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">전체 경로</h3>
              <SimpleToggle
                // '내 일정'의 모든 경로가 켜져 있을 때만 ON
                checked={dayLayers.every((layer) =>
                  visibleDayIds.has(layer.id)
                )}
                onChange={onMyItineraryVisibilityChange}
              />
            </div>
            {/* [신규] 모두 접기/펴기 버튼 */}
            <Button
              variant="link"
              size="sm"
              className="text-base text-gray-500"
              onClick={handleToggleAllCollapse}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
              {collapsedDayIds.size === dayLayers.length
                ? '일정 모두 펴기'
                : '일정 모두 접기'}
            </Button>
          </div>
          {dayLayers.map((layer) => (
            <DayItineraryItem
              isCollapsed={collapsedDayIds.has(layer.id)} // [수정] isCollapsed prop 전달
              key={layer.id}
              layer={layer}
              itinerary={itinerary}
              visibleDayIds={visibleDayIds}
              routeSegmentsByDay={routeSegmentsByDay}
              onDayVisibilityChange={onDayVisibilityChange}
              onOptimizeRoute={onOptimizeRoute}
              onPoiClick={onPoiClick}
              onPoiHover={onPoiHover}
              unmarkPoi={unmarkPoi}
              removeSchedule={removeSchedule}
              onToggleCollapse={() => handleToggleDayCollapse(layer.id)}
              hoveredPoiId={hoveredPoiId}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface LeftPanelProps {
  isOpen: boolean;
  isRecommendationLoading: boolean;
  workspaceId: string;
  itinerary: Record<string, Poi[]>;
  recommendedItinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  markedPois: Poi[];
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  onAddRecommendedPoi: (poi: Poi) => void;
  onAddRecommendedPoiToDay: (planDayId: string, pois: Poi[]) => void;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onOptimizeRoute: (dayId: string) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onMyItineraryVisibilityChange: () => void; // [수정] '내 일정' 전체 토글 핸들러 prop
  onRecommendedItineraryVisibilityChange: () => void; // [수정] 'AI 추천' 전체 토글 핸들러 prop
  hoveredPoiId: string | null;
  onGenerateAiPlan: () => void;
  isOptimizationProcessing: boolean;
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  onCardClick: (poi: any) => void;
  isRecommendationOpen: boolean;
  setIsRecommendationOpen: (isOpen: boolean) => void;
  setAiRecommendedPlaces: (places: AiPlace[]) => void;
  aiRecommendedPlaces: AiPlace[];
}

const formatDuration = (seconds: number) => {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}시간 ${remainingMinutes}분`;
};

const formatDistance = (meters: number) => {
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatDurationChange = (seconds: number) => {
  const isNegative = seconds < 0;
  const prefix = isNegative ? '' : '+';
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);

  if (minutes === 0 && absSeconds > 0) {
    return seconds > 0 ? '+1분 미만' : '-1분 미만';
  }

  let formatted;
  if (minutes < 60) {
    formatted = `${minutes}분`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    formatted = `${hours}시간 ${remainingMinutes}분`;
  }
  if (seconds === 0) return '변동 없음';
  return `${prefix}${formatted}`;
};

const formatDistanceChange = (meters: number) => {
  const isNegative = meters < 0;
  const prefix = isNegative ? '' : '+';
  const absMeters = Math.abs(meters);
  const formatted = `${(absMeters / 1000).toFixed(1)}km`;
  if (meters === 0) return '변동 없음';
  return `${prefix}${formatted}`;
};

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalData: { pois: Poi[]; segments: RouteSegment[] } | null;
  optimizedData: { pois: Poi[]; segments: RouteSegment[] } | null;
  dayLayer: DayLayer | null;
}

function OptimizationModal({
  isOpen,
  onClose,
  originalData,
  optimizedData,
  dayLayer,
}: OptimizationModalProps) {
  if (!isOpen || !originalData || !dayLayer) return null;

  const calculateTotals = (segments: RouteSegment[]) => {
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
    return { totalDistance, totalDuration };
  };

  const originalTotals = calculateTotals(originalData.segments);
  const optimizedTotals = optimizedData
    ? calculateTotals(optimizedData.segments)
    : null;

  const renderRouteList = (
    pois: Poi[],
    segments: RouteSegment[],
    color: string
  ) => (
    <ul className="space-y-1">
      {pois.map((poi, index) => (
        <React.Fragment key={poi.id}>
          <li className="flex items-center text-base">
            <span
              className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-sm mr-3"
              style={{ backgroundColor: color }}
            >
              {index + 1}
            </span>
            <span className="truncate">{poi.placeName}</span>
          </li>
          {index < pois.length - 1 &&
            (() => {
              const nextPoi = pois[index + 1];
              if (!nextPoi) return null;
              const segment = segments.find(
                (s) => s.fromPoiId === poi.id && s.toPoiId === nextPoi.id
              );
              if (!segment) return null;
              return (
                <div className="relative flex h-8 items-center pl-8">
                  <div className="absolute left-4 h-full w-0.5 bg-gray-300" />
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(segment.duration)}
                    </span>
                    <span className="flex items-center">
                      <Car className="h-3 w-3 mr-1" />
                      {formatDistance(segment.distance)}
                    </span>
                  </div>
                </div>
              );
            })()}
        </React.Fragment>
      ))}
    </ul>
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">경로 최적화 결과</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4">
            <h3 className="font-semibold mb-3 text-center">기존 경로</h3>
            <div className="text-base mb-4 p-2 bg-gray-50 rounded-md">
              <p>
                <strong>총 거리:</strong>{' '}
                {formatDistance(originalTotals.totalDistance)}
              </p>
              <p>
                <strong>총 소요 시간:</strong>{' '}
                {formatDuration(originalTotals.totalDuration)}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto pr-2">
              {renderRouteList(
                originalData.pois,
                originalData.segments,
                dayLayer.color
              )}
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-semibold mb-3 text-center">최적 경로</h3>
            {optimizedData && optimizedTotals ? (
              <>
                <div className="text-base mb-4 p-2 bg-blue-50 rounded-md">
                  <p>
                    <strong>총 거리:</strong>{' '}
                    {formatDistance(optimizedTotals.totalDistance)}
                    <span
                      className={`ml-2 text-sm font-semibold ${
                        optimizedTotals.totalDistance <
                        originalTotals.totalDistance
                          ? 'text-blue-600'
                          : optimizedTotals.totalDistance >
                              originalTotals.totalDistance
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      (
                      {formatDistanceChange(
                        optimizedTotals.totalDistance -
                          originalTotals.totalDistance
                      )}
                      )
                    </span>
                  </p>
                  <p>
                    <strong>총 소요 시간:</strong>{' '}
                    {formatDuration(optimizedTotals.totalDuration)}
                    <span
                      className={`ml-2 text-sm font-semibold ${
                        optimizedTotals.totalDuration <
                        originalTotals.totalDuration
                          ? 'text-blue-600'
                          : optimizedTotals.totalDuration >
                              originalTotals.totalDuration
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      (
                      {formatDurationChange(
                        optimizedTotals.totalDuration -
                          originalTotals.totalDuration
                      )}
                      )
                    </span>
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2">
                  {renderRouteList(
                    optimizedData.pois,
                    optimizedData.segments,
                    dayLayer.color
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
                <p className="mt-4 text-gray-600">최적화 중입니다...</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t text-right">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}

function RecommendedDayItem({
  layer,
  workspaceId,
  recommendedItinerary,
  visibleDayIds,
  onDayVisibilityChange,
  onAddRecommendedPoiToDay,
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  onToggleCollapse,
  isCollapsed,
  hoveredPoiId,
  onAddRecommendedPoi,
  allAddedPois,
}: {
  layer: DayLayer;
  workspaceId: string;
  recommendedItinerary: Record<string, Poi[]>;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onAddRecommendedPoiToDay: (planDayId: string, pois: Poi[]) => void;
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  hoveredPoiId: string | null;
  onAddRecommendedPoi: (poi: Poi) => void;
  allAddedPois: Poi[];
}) {
  const virtualPlanDayId = `rec-${workspaceId}-${layer.label}`;
  const recommendedPois = recommendedItinerary[virtualPlanDayId] || [];

  if (recommendedPois.length === 0) return null;

  const isDayVisible = visibleDayIds.has(virtualPlanDayId);

  return (
    <div className="border-b pb-2 px-3">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-shrink min-w-0 ">
          <SimpleToggle
            checked={isDayVisible}
            onChange={(checked) =>
              onDayVisibilityChange(virtualPlanDayId, checked)
            }
          />
          <h3 // [수정] text-sm -> text-base
            className="text-base font-bold truncate"
            style={{ color: layer.color }}
          >
            {layer.label}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            className="h-7 text-sm "
            onClick={() => onAddRecommendedPoiToDay(layer.id, recommendedPois)}
          >
            이 일정으로 채우기
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 "
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {!isCollapsed && (
        <ul className="space-y-1 mt-2">
          {recommendedPois.map((poi) => (
            <PoiItem
              key={poi.id}
              poi={poi}
              onPoiClick={onPoiClick}
              onPoiHover={onPoiHover}
              unmarkPoi={unmarkPoi}
              removeSchedule={removeSchedule}
              isHovered={hoveredPoiId === poi.id}
              onAddRecommendedPoi={onAddRecommendedPoi}
              allAddedPois={allAddedPois}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecommendationSidebar({
  workspaceId,
  dayLayers,
  recommendedItinerary,
  onPoiClick,
  onPoiHover,
  unmarkPoi,
  removeSchedule,
  hoveredPoiId,
  onAddRecommendedPoi,
  onAddRecommendedPoiToDay,
  onClose,
  allAddedPois,
  visibleDayIds,
  onDayVisibilityChange,
  onRecommendedItineraryVisibilityChange, // [수정] 'AI 추천' 전체 토글 핸들러 prop
  onGenerateAiPlan,
}: {
  workspaceId: string;
  dayLayers: DayLayer[];
  recommendedItinerary: Record<string, Poi[]>;
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  hoveredPoiId: string | null;
  onAddRecommendedPoi: (poi: Poi) => void;
  onAddRecommendedPoiToDay: (planDayId: string, pois: Poi[]) => void;
  onClose: () => void;
  allAddedPois: Poi[];
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onRecommendedItineraryVisibilityChange: () => void; // [수정] 'AI 추천' 전체 토글 핸들러 prop
  onGenerateAiPlan: () => void;
}) {
  // [신규] 'AI 추천'의 접기/펼치기 상태 관리
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(
    new Set()
  );

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
  return (
    <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          AI 추천 일정
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={onGenerateAiPlan}
          variant="default" // [수정] 버튼 스타일을 기본(채워진 형태)으로 변경
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 추천받기
        </Button>
      </div>
      <div className="overflow-y-auto flex-1">
        {/* [신규] 전체 추천 경로 토글 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">전체 추천 경로</h3>
            <SimpleToggle
              // 모든 추천 경로가 켜져 있을 때만 ON
              checked={
                Object.keys(recommendedItinerary).length > 0 &&
                Object.keys(recommendedItinerary).every((id) =>
                  visibleDayIds.has(id)
                )
              }
              onChange={onRecommendedItineraryVisibilityChange}
            />
          </div>
          {/* [신규] 모두 접기/펴기 버튼 */}
          <Button
            variant="link"
            size="sm"
            className="text-base text-gray-500"
            onClick={handleToggleAllCollapse}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
            {collapsedDayIds.size === dayLayers.length
              ? '일정 모두 펴기'
              : '일정 모두 접기'}
          </Button>
        </div>
        {dayLayers.map((layer) => (
          <RecommendedDayItem
            key={layer.id}
            layer={layer}
            workspaceId={workspaceId}
            isCollapsed={collapsedDayIds.has(layer.id)}
            recommendedItinerary={recommendedItinerary}
            visibleDayIds={visibleDayIds}
            onDayVisibilityChange={onDayVisibilityChange}
            onAddRecommendedPoiToDay={onAddRecommendedPoiToDay}
            onPoiClick={onPoiClick}
            onPoiHover={onPoiHover}
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            onToggleCollapse={() => handleToggleDayCollapse(layer.id)}
            hoveredPoiId={hoveredPoiId}
            onAddRecommendedPoi={onAddRecommendedPoi}
            allAddedPois={allAddedPois}
          />
        ))}
      </div>
    </div>
  );
}

export function LeftPanel({
  isOpen,
  isRecommendationLoading,
  workspaceId,
  itinerary,
  recommendedItinerary,
  dayLayers,
  markedPois,
  unmarkPoi,
  removeSchedule,
  onPoiClick,
  onPoiHover,
  onAddRecommendedPoi,
  onAddRecommendedPoiToDay,
  routeSegmentsByDay,
  onOptimizeRoute,
  visibleDayIds,
  onDayVisibilityChange,
  onMyItineraryVisibilityChange,
  onRecommendedItineraryVisibilityChange,
  hoveredPoiId,
  onGenerateAiPlan,
  isOptimizationProcessing,
  messages,
  sendMessage,
  isChatConnected,
  onCardClick,
  isRecommendationOpen,
  setIsRecommendationOpen,
  setAiRecommendedPlaces,
  aiRecommendedPlaces,
}: LeftPanelProps) {
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [optimizationDayId, setOptimizationDayId] = useState<string | null>(
    null
  );
  const [originalRouteData, setOriginalRouteData] = useState<{
    pois: Poi[];
    segments: RouteSegment[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');

  // [추가] 장소 캐시에서 모든 장소 정보를 가져옵니다.
  const placeCache = usePlaceStore((state) => state.placesById);

  // [추가] 서버에서 받은 POI 목록에 캐시된 카테고리 정보를 병합합니다.
  const poisWithCategory = useMemo(() => {
    const allPois = [...markedPois, ...Object.values(itinerary).flat()];
    return allPois.map((poi) => {
      // POI에 categoryName이 이미 있으면 그대로 사용합니다.
      if (poi.categoryName) return poi;
      // categoryName이 없으면, placeCache에서 placeId를 기준으로 찾아 채워줍니다.
      const cachedPlace = placeCache.get(poi.placeId);
      return cachedPlace ? { ...poi, categoryName: cachedPlace.category } : poi;
    });
  }, [markedPois, itinerary, placeCache]);

  const allAddedPois = useMemo(
    () => [...markedPois, ...Object.values(itinerary).flat()],
    [markedPois, itinerary]
  );

  const handleOptimizeRoute = (dayId: string) => {
    const pois = itinerary[dayId] || [];
    const segments = routeSegmentsByDay[dayId] || [];
    setOriginalRouteData(JSON.parse(JSON.stringify({ pois, segments })));
    setOptimizationDayId(dayId);
    setIsOptimizationModalOpen(true); // 모달 열기
    onOptimizeRoute(dayId);
  };

  const handleCloseModal = () => {
    setIsOptimizationModalOpen(false);
    setOriginalRouteData(null);
  };

  // [추가] poisWithCategory를 사용하여 markedPois와 itinerary를 재생성합니다.
  const enrichedMarkedPois = useMemo(
    () => poisWithCategory.filter((p) => p.status === 'MARKED'),
    [poisWithCategory]
  );
  const enrichedItinerary = useMemo(() => {
    const newItinerary: Record<string, Poi[]> = {};
    dayLayers.forEach((layer) => {
      newItinerary[layer.id] = poisWithCategory.filter(
        (p) => p.planDayId === layer.id
      );
    });
    return newItinerary;
  }, [poisWithCategory, dayLayers]);

  // [수정] 모든 Hook이 호출된 후에 조기 리턴을 수행합니다.
  if (!isOpen) {
    return null;
  }

  const dayLayerForModal = optimizationDayId
    ? (dayLayers.find((l) => l.id === optimizationDayId) ?? null)
    : null;
  const optimizedPois = optimizationDayId ? itinerary[optimizationDayId] : [];
  const optimizedSegments = optimizationDayId
    ? routeSegmentsByDay[optimizationDayId]
    : [];

  return (
    <>
      <div className="flex h-full">
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="w-full justify-around rounded-none bg-black h-14">
              <TabsTrigger
                value="itinerary"
                className="flex-1 gap-2 text-lg text-gray-400 rounded-none data-[state=active]:text-white data-[state=active]:bg-gray-800"
              >
                <ListOrdered className="w-5 h-5" />
                <span>내 일정</span>
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="flex-1 gap-2 text-lg text-gray-400 rounded-none data-[state=active]:text-white data-[state=active]:bg-gray-800"
              >
                <MessageCircle className="w-5 h-5" />
                <span>채팅</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="itinerary"
              className="flex-1 m-0 overflow-y-auto"
            >
              <MarkerStorage
                pois={enrichedMarkedPois} // [수정] 카테고리 정보가 보강된 데이터 사용
                {...{
                  onPoiClick,
                  onPoiHover,
                  unmarkPoi,
                  removeSchedule,
                  hoveredPoiId,
                }}
              />
              <ItineraryPanel
                {...{
                  itinerary: enrichedItinerary, // [수정] 카테고리 정보가 보강된 데이터 사용
                  workspaceId,
                  dayLayers,
                  onPoiClick,
                  onPoiHover,
                  unmarkPoi,
                  removeSchedule,
                  routeSegmentsByDay,
                  onOptimizeRoute: handleOptimizeRoute,
                  visibleDayIds,
                  onDayVisibilityChange,
                  onMyItineraryVisibilityChange,
                  hoveredPoiId,
                  isRecommendationLoading,
                }}
              />
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-auto m-0">
              <ChatPanel
                messages={messages}
                sendMessage={sendMessage}
                isChatConnected={isChatConnected}
                workspaceId={workspaceId}
                onAddPoiToItinerary={onAddRecommendedPoi}
                onCardClick={onCardClick}
                setAiRecommendedPlaces={setAiRecommendedPlaces}
                aiRecommendedPlaces={aiRecommendedPlaces}
              />
            </TabsContent>
          </Tabs>
        </div>
        {isRecommendationOpen && (
          <RecommendationSidebar
            {...{
              workspaceId,
              dayLayers,
              recommendedItinerary,
              onPoiClick,
              onPoiHover,
              unmarkPoi,
              removeSchedule,
              hoveredPoiId,
              onAddRecommendedPoi: onAddRecommendedPoi,
              onAddRecommendedPoiToDay,
              onClose: () => setIsRecommendationOpen(false),
              allAddedPois,
              visibleDayIds,
              onDayVisibilityChange,
              onRecommendedItineraryVisibilityChange, // [수정] 'AI 추천'용 핸들러 전달
              onGenerateAiPlan,
            }}
          />
        )}
      </div>
      <OptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={handleCloseModal}
        originalData={originalRouteData}
        optimizedData={
          !isOptimizationProcessing
            ? { pois: optimizedPois, segments: optimizedSegments }
            : null
        }
        dayLayer={dayLayerForModal}
      />
    </>
  );
}
