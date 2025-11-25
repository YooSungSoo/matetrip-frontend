import { useState, useMemo } from 'react';
import { usePlaceStore } from '../store/placeStore'; // [추가] 장소 캐시를 사용하기 위해 import
import { SimpleToggle } from './ui/SimpleToggle';
import {
  GripVertical,
  ChevronDown,
  ChevronUp, // [수정] ChevronsUpDown 아이콘으로 변경
  ChevronsUpDown,
  X,
  PlusCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Poi } from '../hooks/usePoiSocket';
import type { DayLayer } from '../types/map';
import { Button } from './ui/button';
import React from 'react';
import { ChatPanel } from './ChatPanel';
import { CategoryIcon } from './CategoryIcon'; // [추가] CategoryIcon 임포트
import { type AiPlace, type ChatMessage } from '../hooks/useChatSocket';
import type { ActiveMember } from '../types/member';

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

interface LeftPanelProps {
  isOpen: boolean;
  isRecommendationLoading: boolean;
  workspaceId: string;
  recommendedItinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  onPoiClick: (poi: Poi | AiPlace) => void;
  onPoiHover: (poiId: string | null) => void;
  onAddRecommendedPoi: (poi: Poi) => void;
  onAddRecommendedPoiToDay: (planDayId: string, pois: Poi[]) => void;
  visibleDayIds: Set<string>;
  onDayVisibilityChange: (dayId: string, isVisible: boolean) => void;
  onRecommendedItineraryVisibilityChange: () => void;
  hoveredPoiId: string | null;
  onGenerateAiPlan?: () => void;
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  onCardClick: (poi: any) => void;
  onShowDetails: (placeId: string) => void; // 상세보기 핸들러 추가
  setChatAiPlaces: (places: AiPlace[]) => void;
  chatAiPlaces: AiPlace[];
  activeMembers?: ActiveMember[];
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
  const virtualPlanDayId = `rec-${workspaceId}-${layer.planDate}`;
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
          <h3
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

function ChatSidebar({
  messages,
  sendMessage,
  isChatConnected,
  workspaceId,
  onAddPoiToItinerary,
  onCardClick,
  onShowDetails, // 상세보기 핸들러 추가
  setChatAiPlaces,
  chatAiPlaces,
  activeMembers,
}: {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  workspaceId: string;
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: any) => void;
  onShowDetails: (placeId: string) => void; // 상세보기 핸들러 추가
  setChatAiPlaces: (places: AiPlace[]) => void;
  chatAiPlaces: AiPlace[];
  activeMembers?: ActiveMember[];
}) {
  return (
    <ChatPanel
      messages={messages}
      sendMessage={sendMessage}
      isChatConnected={isChatConnected}
      workspaceId={workspaceId}
      onAddPoiToItinerary={onAddPoiToItinerary}
      onCardClick={onCardClick}
      onShowDetails={onShowDetails} // 상세보기 핸들러 전달
      setChatAiPlaces={setChatAiPlaces}
      chatAiPlaces={chatAiPlaces}
      activeMembers={activeMembers}
    />
  );
}

export function LeftPanel({
  isOpen,
  workspaceId,
  recommendedItinerary,
  dayLayers,
  onPoiClick,
  onPoiHover,
  onAddRecommendedPoi,
  onAddRecommendedPoiToDay,
  visibleDayIds,
  onDayVisibilityChange,
  onRecommendedItineraryVisibilityChange,
  hoveredPoiId,
  onGenerateAiPlan,
  messages,
  sendMessage,
  isChatConnected,
  onCardClick,
  onShowDetails, // 상세보기 핸들러 받기
  setChatAiPlaces,
  chatAiPlaces,
  activeMembers,
}: LeftPanelProps) {
  const [activeTab, _setActiveTab] = useState('chat');

  const [recCollapsedDayIds, setRecCollapsedDayIds] = useState<Set<string>>(
    new Set()
  );

  const [isAiRecOpen, _setIsAiRecOpen] = useState(false);

  const handleRecToggleDayCollapse = (dayId: string) => {
    setRecCollapsedDayIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const handleRecToggleAllCollapse = () => {
    if (recCollapsedDayIds.size === dayLayers.length) {
      setRecCollapsedDayIds(new Set());
    } else {
      setRecCollapsedDayIds(new Set(dayLayers.map((l) => l.id)));
    }
  };

  const placeCache = usePlaceStore((state) => state.placesById);

  const poisWithCategory = useMemo(() => {
    const allPois = [...Object.values(recommendedItinerary).flat()];
    return allPois.map((poi) => {
      if (poi.categoryName) return poi;
      const cachedPlace = placeCache.get(poi.placeId);
      return cachedPlace ? { ...poi, categoryName: cachedPlace.category } : poi;
    });
  }, [recommendedItinerary, placeCache]);

  const allAddedPois = useMemo(
    () => [...Object.values(recommendedItinerary).flat()],
    [recommendedItinerary]
  );

  const enrichedRecommendedItinerary = useMemo(() => {
    const newItinerary: Record<string, Poi[]> = {};
    dayLayers.forEach((layer) => {
      const virtualDayId = `rec-${workspaceId}-${layer.planDate}`;
      const poisForDay = recommendedItinerary[virtualDayId] || [];
      if (poisForDay.length > 0) {
        const poiIdsForDay = new Set(poisForDay.map((p) => p.id));
        newItinerary[virtualDayId] = poisWithCategory.filter((p) =>
          poiIdsForDay.has(p.id)
        );
      }
    });
    return newItinerary;
  }, [poisWithCategory, recommendedItinerary, workspaceId, dayLayers]);

  const enrichedChatAiPlaces = useMemo(() => {
    return chatAiPlaces.map((place) => {
      if (place.category) return place;
      const cachedPlace = placeCache.get(place.id);
      return cachedPlace
        ? { ...place, categoryName: cachedPlace.category }
        : place;
    });
  }, [chatAiPlaces, placeCache]);

  if (!isOpen) {
    return null;
  }

  const renderAiRecommendationContent = () => (
    <>
      <div className="p-4 border-b">{onGenerateAiPlan &&
        <Button className="w-full" onClick={onGenerateAiPlan} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 추천받기
        </Button>}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">전체 추천 경로</h3>
            <SimpleToggle
              checked={
                Object.keys(recommendedItinerary).length > 0 &&
                Object.keys(recommendedItinerary).every((id) =>
                  visibleDayIds.has(id)
                )
              }
              onChange={onRecommendedItineraryVisibilityChange}
            />
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-base text-gray-500"
            onClick={handleRecToggleAllCollapse}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
            {recCollapsedDayIds.size === dayLayers.length
              ? '일정 모두 펴기'
              : '일정 모두 접기'}
          </Button>
        </div>
        {dayLayers.map((layer) => (
          <RecommendedDayItem
            key={layer.id}
            {...{
              layer,
              workspaceId,
              recommendedItinerary: enrichedRecommendedItinerary,
              visibleDayIds,
              onDayVisibilityChange,
              onAddRecommendedPoiToDay,
              onPoiClick,
              onPoiHover,
              unmarkPoi: () => {},
              removeSchedule: () => {},
              hoveredPoiId,
              onAddRecommendedPoi,
              allAddedPois,
            }}
            isCollapsed={recCollapsedDayIds.has(layer.id)}
            onToggleCollapse={() => handleRecToggleDayCollapse(layer.id)}
          />
        ))}
      </div>
    </>
  );

  const renderTabContent = () => {
    if (activeTab === 'chat') {
      return (
        <ChatSidebar
          messages={messages}
          sendMessage={sendMessage}
          isChatConnected={isChatConnected}
          workspaceId={workspaceId}
          onAddPoiToItinerary={onAddRecommendedPoi}
          onCardClick={onCardClick}
          onShowDetails={onShowDetails} // 상세보기 핸들러 전달
          setChatAiPlaces={setChatAiPlaces}
          chatAiPlaces={enrichedChatAiPlaces}
          activeMembers={activeMembers}
        />
      );
    }
    return null;
  };

  return (
    <div className="relative h-full rounded-lg overflow-hidden w-full">
      <div className="flex h-full">
        <div className="w-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
          <div className="flex-1 m-0 overflow-y-auto">{renderTabContent()}</div>
        </div>
      </div>
      <div
        className={`absolute top-0 left-0 h-full w-96 bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-10 ${
          isAiRecOpen
            ? 'opacity-100 translate-x-96'
            : 'opacity-0 -translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            {renderAiRecommendationContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
