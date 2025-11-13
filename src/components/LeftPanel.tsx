import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SimpleToggle } from './ui/SimpleToggle'; // Switch 대신 SimpleToggle을 import
import {
  Calendar,
  Search,
  StickyNote,
  ListOrdered,
  GripVertical,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  Clock, // Clock 아이콘 임포트
  Car, // Car 아이콘 임포트
} from 'lucide-react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Poi } from '../hooks/usePoiSocket';
import type { DayLayer, KakaoPlace, RouteSegment } from '../types/map';
import { Input } from './ui/input';
import { Button } from './ui/button';
import React from 'react'; // React Fragment 사용을 위해 import

const KAKAO_MAP_SERVICES_STATUS = window.kakao?.maps.services.Status;
type KakaoPagination = kakao.maps.Pagination;
type PlacesSearchResult = kakao.maps.services.PlacesSearchResult;
type PlacesSearchResultStatus = kakao.maps.services.Status;

interface PageInfo {
  current: number;
  last: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

interface PoiItemProps {
  poi: Poi;
  color?: string;
  index?: number;
  onPoiClick: (poi: Poi) => void;
  onPoiHover: (poiId: string) => void;
  onPoiLeave: () => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
}

function PoiItem({ poi, color, index, onPoiClick, onPoiHover, onPoiLeave, unmarkPoi, removeSchedule }: PoiItemProps) {
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
      className="flex items-center text-xs p-1 rounded-md cursor-pointer hover:bg-blue-100" // gap-2 제거, 호버 색상 변경
      onClick={() => onPoiClick(poi)}
      onMouseEnter={() => onPoiHover(poi.id)}
      onMouseLeave={onPoiLeave}
    >
      {/* 고정 너비 컨테이너 추가 */}
      <div className="flex items-center w-16 flex-shrink-0">
        <div {...attributes} {...listeners} className="cursor-grab touch-none p-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        {color && index !== undefined && (
          <span
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs ml-2" // ml-2 추가
            style={{ backgroundColor: color }}
          >
            {index + 1}
          </span>
        )}
      </div>
      <span className="truncate flex-grow">{poi.placeName}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDeleteClick}
        className="w-6 h-6 p-0 flex-shrink-0"
      >
        <X className="w-3 h-3 text-gray-500" />
      </Button>
    </li>
  );
}

function MarkerStorage({ pois, onPoiClick, onPoiHover, onPoiLeave, unmarkPoi, removeSchedule }: { pois: Poi[], onPoiClick: (poi: Poi) => void, onPoiHover: (poiId: string) => void, onPoiLeave: () => void, unmarkPoi: (poiId: string | number) => void, removeSchedule: (poiId: string, planDayId: string) => void }) {
    const { setNodeRef } = useDroppable({ id: 'marker-storage' });
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div ref={setNodeRef} className="p-3 border-b">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-base font-bold">마커 보관함</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
            </div>
            {!isCollapsed && (
                <SortableContext id="marker-storage-sortable" items={pois.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2 min-h-[2rem]">
                        {pois.length > 0 ? (
                            pois.map((poi) => <PoiItem key={poi.id} poi={poi} onPoiClick={onPoiClick} onPoiHover={onPoiHover} onPoiLeave={onPoiLeave} unmarkPoi={unmarkPoi} removeSchedule={removeSchedule} />)
                        ) : (
                            <p className="text-xs text-gray-500 p-2">지도에 마커를 추가하여 보관하세요.</p>
                        )}
                    </ul>
                </SortableContext>
            )}
        </div>
    );
}

function ItineraryPanel({
  itinerary,
  dayLayers,
  onPoiClick,
  onPoiHover, // (poiId: string) => void
  onPoiLeave, // () => void
  unmarkPoi,
  removeSchedule,
  routeSegmentsByDay,
  onOptimizeRoute,
  visibleDayIds,
  onDayVisibilityChange,
}: {
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  onPoiClick: (poi: Poi) => void;
  onPoiHover: (poiId: string) => void;
  onPoiLeave: () => void;
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onOptimizeRoute: (dayId: string) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
}) {
  return (
    <div className="p-3 space-y-2 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <ListOrdered className="w-5 h-5 text-gray-600" />
        <span className="text-base font-bold">여행 일정</span>
      </div>
      <div className="space-y-3">
        {dayLayers.map((layer) => {
          const pois = itinerary[layer.id] || [];
          const isDayVisible = visibleDayIds.has(layer.id);
          const segmentsForThisDay = routeSegmentsByDay[layer.id] || [];
          const containerBodyClasses = `transition-opacity duration-300 ${isDayVisible ? 'opacity-100' : 'opacity-40 pointer-events-none'}`;

          // 각 날짜별 접힘/펼침 상태를 관리하기 위해 ItineraryPanel 내부에 상태를 만듭니다.
          // 더 복잡한 상태 관리가 필요하면 이 로직을 부모 컴포넌트로 올릴 수 있습니다.
          const [isCollapsed, setIsCollapsed] = useState(false);
          const { setNodeRef } = useDroppable({ id: layer.id });

          return (
            <div key={layer.id} className="border-b pb-2">
              {/* Header: 토글 스위치, 날짜, 버튼들 */}
              <div ref={setNodeRef} className="flex items-center mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <SimpleToggle
                      checked={isDayVisible}
                      onChange={(checked) => onDayVisibilityChange(layer.id, checked)}
                    />
                    <h3 className="text-sm font-bold">{layer.label}</h3>
                  </div>
                  <div className="flex-grow">
                    {pois.length >= 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onOptimizeRoute(layer.id)}
                      >
                        경로 최적화
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setIsCollapsed(!isCollapsed)}>
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
              </div>

              {/* Body: POI 목록 (opacity 적용) */}
              <div className={containerBodyClasses}>
                {!isCollapsed && (
                    <SortableContext id={layer.id + '-sortable'} items={pois.map(p => p.id)} strategy={verticalListSortingStrategy}>
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
                                        onPoiLeave={onPoiLeave}
                                        unmarkPoi={unmarkPoi}
                                        removeSchedule={removeSchedule}
                                      />
                                      {index < pois.length - 1 && (() => {
                                          const nextPoi = pois[index + 1];
                                          const segment = segmentsForThisDay.find(
                                              s => s.fromPoiId === poi.id && s.toPoiId === nextPoi.id
                                          );

                                          const totalMinutes = segment ? Math.ceil(segment.duration / 60) : 0;
                                          const totalKilometers = segment ? (segment.distance / 1000).toFixed(1) : '0.0';

                                          return (
                                              <div className="relative flex items-center h-8">
                                                  <div className="absolute left-4 w-0.5 h-full bg-gray-300"></div>
                                                  {segment && (
                                                  <div className="flex items-center text-xs text-gray-600 ml-17">
                                                      <span className="mr-2 flex items-center">
                                                          <Clock className="w-3 h-3 mr-1" />
                                                          {`${totalMinutes}분`}
                                                      </span>
                                                      <span className="flex items-center">
                                                          <Car className="w-3 h-3 mr-1" />
                                                          {`${totalKilometers}km`}
                                                      </span>
                                                  </div>
                                                  )}
                                              </div>
                                          );
                                      })()}
                                  </React.Fragment>
                              ))
                          ) : (
                              <p className="text-xs text-gray-500 p-2">마커를 드래그하여 추가하세요.</p>
                          )}
                      </ul>
                    </SortableContext>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SearchPanelProps {
  onPlaceClick: (place: KakaoPlace) => void;
}

function SearchPanel({
  onPlaceClick,
}: SearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  const placesRef = useRef<kakao.maps.services.Places | null>(null);
  const paginationRef = useRef<KakaoPagination | null>(null);

  useEffect(() => {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      placesRef.current = new window.kakao.maps.services.Places();
    }
  }, []);

  const searchCallback = useCallback(
    (
      result: PlacesSearchResult,
      status: PlacesSearchResultStatus,
      pagination: KakaoPagination
    ) => {
      if (status === KAKAO_MAP_SERVICES_STATUS.OK) {
        setResults(result as KakaoPlace[]);
        paginationRef.current = pagination;
        setPageInfo({
          current: pagination.current,
          last: pagination.last,
          hasPrevPage: pagination.hasPrevPage,
          hasNextPage: pagination.hasNextPage,
        });
      } else {
        setResults([]);
        setPageInfo(null);
      }
    },
    []
  );

  const handleSearch = useCallback(() => {
    if (!keyword.trim() || !placesRef.current) return;
    placesRef.current.keywordSearch(keyword, searchCallback, { page: 1 });
  }, [keyword, searchCallback]);

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex-shrink-0 flex gap-2">
        <Input
          type="text"
          placeholder="장소, 주소 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-9"
        />
        <Button size="sm" onClick={handleSearch} className="h-9">
          검색
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 border-t pt-4">
        <ul className="flex-1 overflow-y-auto space-y-2 pr-2">
          {results.length > 0 ? (
            results.map((place) => (
              <li
                key={place.id}
                className="p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => onPlaceClick(place)}
              >
                <div className="text-sm font-semibold truncate">
                  {place.place_name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {place.road_address_name || place.address_name}
                </div>
              </li>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              검색어를 입력해주세요.
            </div>
          )}
        </ul>
        {pageInfo && results.length > 0 && (
          <div className="flex-shrink-0 flex justify-center items-center gap-3 pt-2 mt-2 border-t">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => paginationRef.current?.gotoPage(pageInfo.current - 1)}
              disabled={!pageInfo.hasPrevPage}
            >
              이전
            </Button>
            <span>{pageInfo.current} / {pageInfo.last}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => paginationRef.current?.gotoPage(pageInfo.current + 1)}
              disabled={!pageInfo.hasNextPage}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface LeftPanelProps {
  isOpen: boolean;
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  markedPois: Poi[];
  unmarkPoi: (poiId: string | number) => void;
  removeSchedule: (poiId: string, planDayId: string) => void;
  onPlaceClick: (place: KakaoPlace) => void;
  onPoiClick: (poi: Poi) => void;
  onPoiHover: (poiId: string | null) => void; // null을 허용하도록 변경
  onPoiLeave: () => void; // onPoiHover(null)을 호출하므로 onPoiLeave는 동일
  routeSegmentsByDay: Record<string, RouteSegment[]>;
  onOptimizeRoute: (dayId: string) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
}

export function LeftPanel({
  isOpen,
  itinerary,
  dayLayers,
  markedPois,
  unmarkPoi,
  removeSchedule,
  onPlaceClick,
  onPoiClick,
  onPoiHover, // (poiId: string | null) => void
  routeSegmentsByDay,
  onOptimizeRoute,
  visibleDayIds,
  onDayVisibilityChange,
}: LeftPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
      <Tabs defaultValue="plan" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-around rounded-none bg-gray-50 border-b">
          <TabsTrigger value="plan" className="flex-1 gap-2">
            <Calendar className="w-4 h-4" />
            <span>일정</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 gap-2">
            <Search className="w-4 h-4" />
            <span>장소 검색</span>
          </TabsTrigger>
          <TabsTrigger value="memo" className="flex-1 gap-2">
            <StickyNote className="w-4 h-4" />
            <span>메모</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="flex-1 overflow-auto m-0">
          <MarkerStorage pois={markedPois} onPoiClick={onPoiClick} onPoiHover={onPoiHover} onPoiLeave={() => onPoiHover(null)} unmarkPoi={unmarkPoi} removeSchedule={removeSchedule} />
          <ItineraryPanel
            itinerary={itinerary}
            dayLayers={dayLayers}
            onPoiClick={onPoiClick}
            onPoiHover={onPoiHover} // (poiId: string) => void
            onPoiLeave={() => onPoiHover(null)} // onPoiHover(null) 호출
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            routeSegmentsByDay={routeSegmentsByDay}
            onOptimizeRoute={onOptimizeRoute}
            visibleDayIds={visibleDayIds}
            onDayVisibilityChange={onDayVisibilityChange}
          />
        </TabsContent>
        <TabsContent value="search" className="flex-1 relative m-0">
          <div className="absolute inset-0">
            <SearchPanel onPlaceClick={onPlaceClick} />
          </div>
        </TabsContent>
        <TabsContent value="memo" className="h-full m-0 p-4">
          <div className="h-full flex items-center justify-center text-gray-500">
            메모 기능 (개발 예정)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
