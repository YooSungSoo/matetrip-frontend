import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { MapPanel, type KakaoPlace, type RouteSegment } from './MapPanel'; // RouteSegment import 추가
import type { PlanDayDto } from '../types/workspace';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { PlanRoomHeader } from './PlanRoomHeader';
import { type Poi, usePoiSocket } from '../hooks/usePoiSocket.ts';
import { useChatSocket, type ChatMessage } from '../hooks/useChatSocket'; // useChatSocket import 추가
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers.ts'; // useWorkspaceMembers 훅 import
import { VideoChat } from './VideoChat';

interface WorkspaceProps {
  workspaceId: string;
  workspaceName: string;
  planDayDtos: PlanDayDto[];
  onEndTrip: () => void;
}

const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    const brightValue = Math.floor(value / 2) + 128;
    color += brightValue.toString(16).padStart(2, '0');
  }
  return color.toUpperCase();
};

function DraggablePoiItem({ poi }: { poi: Poi }) {
  return (
    <div className="flex items-center gap-2 text-xs p-1 rounded-md bg-white shadow-lg">
      <GripVertical className="w-4 h-4 text-gray-400" />
      <span className="truncate">{poi.placeName}</span>
    </div>
  );
}

export function Workspace({
  workspaceId,
  workspaceName,
  planDayDtos,
  onEndTrip,
}: WorkspaceProps) {
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const {
    pois,
    setPois,
    isSyncing,
    markPoi,
    unmarkPoi,
    addSchedule,
    removeSchedule,
    reorderPois,
  } = usePoiSocket(workspaceId);
  const {
    messages,
    sendMessage,
    isConnected: isChatConnected,
  } = useChatSocket(workspaceId); // useChatSocket 훅 호출
  const {
    members,
    isLoading: isMembersLoading,
    error: membersError,
  } = useWorkspaceMembers(workspaceId);

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const [hoveredPoi, setHoveredPoi] = useState<Poi | null>(null); // hoveredPoi 상태 추가
  const mapRef = useRef<kakao.maps.Map>(null);

  // MapPanel에서 전달받을 경로 세그먼트 정보를 저장할 상태 추가
  const [routeSegmentsByDay, setRouteSegmentsByDay] = useState<
    Record<string, RouteSegment[]>
  >({});

  // PlanRoomHeader에 전달할 activeMembers 데이터 형식으로 변환
  const activeMembersForHeader = useMemo(() => {
    return members.map((member) => ({
      id: member.id, // PlanRoomHeader의 id 타입이 string이어야 함
      name: member.profile.nickname,
      // TODO: 백엔드 응답에 profileImageId가 포함되면 실제 이미지 URL을 구성해야 합니다.
      // 현재는 임시 플레이스홀더를 사용합니다.
      avatar: member.profile.profileImageId
        ? `http://localhost:3000/binary-content/${member.profile.profileImageId}/presigned-url` // 예시 URL 구조
        : `https://ui-avatars.com/api/?name=${member.profile.nickname}&background=random`,
    }));
  }, [members]);

  const dayLayers = useMemo(
    () =>
      planDayDtos.map((day) => ({
        id: day.id,
        label: day.planDate,
        color: generateColorFromString(day.id),
      })),
    [planDayDtos]
  );

  const { markedPois, itinerary } = useMemo(() => {
    const marked = pois
      .filter((p) => p.status === 'MARKED')
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const itineraryData: Record<string, Poi[]> = {};
    dayLayers.forEach((layer) => {
      itineraryData[layer.id] = pois
        .filter((p) => p.planDayId === layer.id && p.status === 'SCHEDULED')
        .sort((a, b) => a.sequence - b.sequence);
    });
    return { markedPois: marked, itinerary: itineraryData };
  }, [pois, dayLayers]);

  const startDate = planDayDtos.length > 0 ? planDayDtos[0].planDate : '';
  const endDate =
    planDayDtos.length > 0 ? planDayDtos[planDayDtos.length - 1].planDate : '';

  const handlePoiClick = (poi: Poi) => {
    const map = mapRef.current;
    if (!map) return;
    const moveLatLon = new window.kakao.maps.LatLng(
      poi.latitude,
      poi.longitude
    );
    map.panTo(moveLatLon);
  };

  const handlePoiHover = useCallback((poi: Poi) => {
    setHoveredPoi(poi);
  }, []);

  const handlePoiLeave = useCallback(() => {
    setHoveredPoi(null);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const poi = pois.find((p) => p.id === active.id);
    if (poi) {
      setActivePoi(poi);
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log('handleDragEnd called.');
      setActivePoi(null);
      const { active, over } = event;

      if (!over) {
        console.log('Drag ended outside of any droppable area.');
        return;
      }

      const activeId = String(active.id);
      const activeSortableContainerId =
        active.data.current?.sortable?.containerId; // 드래그 시작된 SortableContext의 ID

      let targetDroppableId: string | undefined; // 최종적으로 마커가 드롭된 Droppable 컨테이너의 ID
      let targetSortableContainerId: string | undefined; // 최종적으로 마커가 드롭된 SortableContext의 ID (아이템 위일 경우)

      if (over.data.current?.sortable) {
        // 드롭된 대상이 Sortable 아이템인 경우 (예: 이미 일정에 있는 다른 마커 위)
        targetSortableContainerId = String(
          over.data.current.sortable.containerId
        );
        // Sortable 아이템이 속한 Droppable 컨테이너의 ID를 유추
        targetDroppableId = targetSortableContainerId.replace('-sortable', '');
      } else {
        // 드롭된 대상이 Droppable 컨테이너인 경우 (예: 비어있는 날짜 컨테이너 또는 마커 보관함)
        targetDroppableId = String(over.id);
        // 이 경우 SortableContext ID는 Droppable ID에 '-sortable'을 붙인 형태일 수 있음
        targetSortableContainerId =
          targetDroppableId === 'marker-storage'
            ? 'marker-storage-sortable'
            : targetDroppableId + '-sortable';
      }

      console.log(
        `Drag event: activeId=${activeId}, overId=${over.id}, activeSortableContainerId=${activeSortableContainerId}, targetDroppableId=${targetDroppableId}, targetSortableContainerId=${targetSortableContainerId}`
      );

      if (!activeSortableContainerId || !activeId || !targetDroppableId) {
        console.log(
          'Missing activeSortableContainerId, activeId, or targetDroppableId information.'
        );
        return;
      }

      // 드래그 시작된 컨테이너와 드롭된 컨테이너가 같은 논리적 컨테이너인 경우 (내부에서 순서 변경)
      const isSameLogicalContainer =
        activeSortableContainerId === targetSortableContainerId;

      if (isSameLogicalContainer) {
        console.log(`Reordering within container: ${targetDroppableId}`);
        if (targetDroppableId === 'marker-storage') {
          const items = markedPois;
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newItems = arrayMove(items, oldIndex, newIndex);
            setPois((currentPois) => {
              const otherPois = currentPois.filter(
                (p) => p.status !== 'MARKED'
              );
              const updatedContainerPois = newItems.map((poi, index) => ({
                ...poi,
                status: 'MARKED',
                planDayId: undefined,
                sequence: index,
              }));
              return [...otherPois, ...updatedContainerPois];
            });
          }
        } else {
          // 여행 일정 날짜 컨테이너
          const dayId = targetDroppableId;
          const items = itinerary[dayId];
          if (!items) return;
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newItems = arrayMove(items, oldIndex, newIndex);
            const newPoiIds = newItems.map((poi) => poi.id);
            setPois((currentPois) => {
              const otherPois = currentPois.filter(
                (p) => p.planDayId !== dayId
              );
              const updatedContainerPois = newItems.map((poi, index) => ({
                ...poi,
                sequence: index,
              }));
              return [...otherPois, ...updatedContainerPois];
            });
            reorderPois(dayId, newPoiIds);
          }
        }
      } else {
        // 컨테이너 간 이동 (마커 보관함 <-> 여행 일정)
        console.log(
          `Moving POI between containers: from ${activeSortableContainerId} to ${targetDroppableId}`
        );
        const activePoi = pois.find((p) => p.id === activeId);
        if (!activePoi) {
          console.log(`Active POI with ID ${activeId} not found.`);
          return;
        }

        const isDroppingToMarkerStorage =
          targetDroppableId === 'marker-storage';
        const isDroppingToItineraryDay = dayLayers.some(
          (layer) => layer.id === targetDroppableId
        );

        setPois((currentPois) => {
          return currentPois.map((p) => {
            if (p.id === activeId) {
              if (isDroppingToMarkerStorage) {
                return {
                  ...p,
                  status: 'MARKED',
                  planDayId: undefined,
                  sequence: 0,
                };
              } else if (isDroppingToItineraryDay) {
                const dayId = targetDroppableId;
                return {
                  ...p,
                  status: 'SCHEDULED',
                  planDayId: dayId,
                  sequence: 999,
                };
              }
            }
            return p;
          });
        });

        if (activePoi.planDayId) {
          console.log(
            `Removing POI ${activeId} from previous schedule day ${activePoi.planDayId}`
          );
          removeSchedule(activeId, activePoi.planDayId);
        }

        if (isDroppingToItineraryDay) {
          const dayId = targetDroppableId;
          console.log(
            `ADD_SCHEDULE event: Adding POI ${activeId} to schedule day ${dayId}`
          );
          addSchedule(activeId, dayId);
        } else if (isDroppingToMarkerStorage) {
          console.log(
            `POI ${activeId} moved to marker-storage. No ADD_SCHEDULE event.`
          );
        }
      }
    },
    [
      markedPois,
      itinerary,
      pois,
      setPois,
      reorderPois,
      removeSchedule,
      addSchedule,
      dayLayers,
    ]
  );

  const handleMapPoiDragEnd = useCallback(
    (poiId: string, lat: number, lng: number) => {
      setPois((currentPois) =>
        currentPois.map((poi) =>
          poi.id === poiId ? { ...poi, latitude: lat, longitude: lng } : poi
        )
      );
      // TODO: Call a socket event to persist the new coordinates.
      // For now, only local state is updated.
      console.log(`POI ${poiId} dragged to Lat: ${lat}, Lng: ${lng}`);
    },
    [setPois]
  );

  // MapPanel로부터 경로 정보를 받아 상태를 업데이트하는 콜백 함수
  const handleRouteInfoUpdate = useCallback(
    (newRouteInfo: Record<string, RouteSegment[]>) => {
      setRouteSegmentsByDay(newRouteInfo);
    },
    []
  );

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="h-full flex flex-col bg-gray-50">
        <PlanRoomHeader
          workspaceId={workspaceId}
          title={workspaceName}
          startDate={startDate}
          endDate={endDate}
          totalDays={planDayDtos.length}
          currentMembers={activeMembersForHeader.length}
          maxMembers={4}
          onExit={onEndTrip}
          onBack={onEndTrip}
          isOwner={true}
          activeMembers={activeMembersForHeader}
        />

        <div className="flex-1 flex relative overflow-hidden">
          <LeftPanel
            isOpen={isLeftPanelOpen}
            itinerary={itinerary}
            dayLayers={dayLayers}
            markedPois={markedPois}
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            onPlaceClick={setSelectedPlace}
            onPoiClick={handlePoiClick}
            onPoiHover={handlePoiHover} // LeftPanel에 hover 핸들러 전달
            onPoiLeave={handlePoiLeave} // LeftPanel에 leave 핸들러 전달
            routeSegmentsByDay={routeSegmentsByDay} // LeftPanel에 경로 정보 전달
          />

          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="absolute top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center border border-gray-300 rounded-r-md shadow-md"
            style={{ left: isLeftPanelOpen ? '320px' : '0' }}
          >
            {isLeftPanelOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <div className="flex-1 bg-gray-100">
            <MapPanel
              itinerary={itinerary}
              dayLayers={dayLayers}
              pois={pois}
              isSyncing={isSyncing}
              markPoi={markPoi}
              unmarkPoi={unmarkPoi}
              selectedPlace={selectedPlace}
              mapRef={mapRef}
              onPoiDragEnd={handleMapPoiDragEnd}
              setSelectedPlace={setSelectedPlace}
              onRouteInfoUpdate={handleRouteInfoUpdate} // MapPanel에 콜백 함수 전달
            />
          </div>

          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="absolute top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center border border-gray-300 rounded-l-md shadow-md"
            style={{ right: isRightPanelOpen ? '320px' : '0' }}
          >
            {isRightPanelOpen ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <RightPanel
            isOpen={isRightPanelOpen}
            messages={messages} // messages prop 전달
            sendMessage={sendMessage} // sendMessage prop 전달
            isChatConnected={isChatConnected} // isChatConnected prop 전달
          />
        </div>
      </div>
      <div className="flex justify-center">
        {/* 📌화상 주석 처리 */}
        <VideoChat workspaceId={workspaceId} />
      </div>
      <DragOverlay>
        {activePoi ? <DraggablePoiItem poi={activePoi} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
