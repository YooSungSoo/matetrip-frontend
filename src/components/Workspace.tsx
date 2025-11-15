import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { MapPanel } from './MapPanel';
import type { KakaoPlace, RouteSegment, ChatMessage } from '../types/map';
import type { PlanDayDto } from '../types/workspace';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { PlanRoomHeader } from './PlanRoomHeader';
import { usePlaceStore } from '../store/placeStore'; // placeStore import
import { type Poi, usePoiSocket } from '../hooks/usePoiSocket.ts';
import { useChatSocket } from '../hooks/useChatSocket'; // useChatSocket import 추가
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers.ts';
import { API_BASE_URL } from '../api/client.ts';
import { PdfDocument } from './PdfDocument';
import { CATEGORY_INFO, type PlaceDto } from '../types/place.ts'; // useWorkspaceMembers 훅 import

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
    const value = (hash >> (i * 8)) & 0xff; // 0-255
    const darkValue = Math.floor(value * 0.7); // 0-178 범위로 조정하여 어두운 색상 유도
    color += darkValue.toString(16).padStart(2, '0');
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

  // PDF 생성을 위한 상태와 ref
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { members: membersWithoutColor } = useWorkspaceMembers(workspaceId);

  // usePoiSocket에서 요구하는 color 속성을 멤버 객체에 추가합니다.
  const members = useMemo(
    () =>
      membersWithoutColor.map((member) => ({
        ...member,
        color: generateColorFromString(member.id),
      })),
    [membersWithoutColor]
  );
  // usePoiSocket에서 모든 상태와 함수를 가져옵니다.
  const {
    pois,
    setPois,
    isSyncing,
    markPoi,
    unmarkPoi,
    addSchedule,
    removeSchedule,
    reorderPois,
    reorderMarkedPois,
    cursors,
    moveCursor,
    hoveredPoiInfo,
    hoverPoi,
    clickEffects, // 추가
    clickMap, // 추가
  } = usePoiSocket(workspaceId, members);

  const {
    messages,
    sendMessage,
    isConnected: isChatConnected,
  } = useChatSocket(workspaceId);

  // [추가] MapPanel에 전달할 최신 채팅 메시지 상태
  const [latestChatMessage, setLatestChatMessage] =
    useState<ChatMessage | null>(null);

  // [추가] messages 배열이 업데이트될 때마다 최신 메시지를 상태에 저장
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const mapRef = useRef<kakao.maps.Map>(null);
  // [추가] 경로 최적화를 트리거하기 위한 상태
  const [optimizingDayId, setOptimizingDayId] = useState<string | null>(null);
  // [추가] 최적화 완료 후 상태를 리셋하는 콜백
  const handleOptimizationComplete = useCallback(
    () => setOptimizingDayId(null),
    []
  );
  // [추가] 지도에 표시할 날짜 ID를 관리하는 상태
  const [visibleDayIds, setVisibleDayIds] = useState<Set<string>>(new Set());

  // [추가] planDayDtos가 변경되면 visibleDayIds를 모든 날짜 ID로 초기화
  useEffect(() => {
    setVisibleDayIds(new Set(planDayDtos.map((day) => day.id)));
  }, [planDayDtos]);

  // [추가] 날짜 가시성 토글 핸들러
  const handleDayVisibilityChange = useCallback(
    (dayId: string, isVisible: boolean) => {
      setVisibleDayIds((prevVisibleDayIds) => {
        const newVisibleDayIds = new Set(prevVisibleDayIds);
        if (isVisible) {
          newVisibleDayIds.add(dayId);
        } else {
          newVisibleDayIds.delete(dayId);
        }
        return newVisibleDayIds;
      });
    },
    []
  );

  // [수정] 패널 열기/닫기 시 지도 리렌더링을 위한 useEffect
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      // 패널의 transition duration(300ms) 이후에 relayout을 호출합니다.
      const timer = setTimeout(() => {
        map.relayout();
      }, 310); // transition 시간보다 약간 길게 설정
      return () => clearTimeout(timer);
    }
  }, [isLeftPanelOpen, isRightPanelOpen]);
  // PlanRoomHeader에 전달할 activeMembers 데이터 형식으로 변환
  const activeMembersForHeader = useMemo(() => {
    return members.map((member) => ({
      id: member.id, // PlanRoomHeader의 id 타입이 string이어야 함
      name: member.profile.nickname,
      // TODO: 백엔드 응답에 profileImageId가 포함되면 실제 이미지 URL을 구성해야 합니다.
      // 현재는 임시 플레이스홀더를 사용합니다.
      avatar: member.profile.profileImageId
        ? `${API_BASE_URL}/binary-content/${member.profile.profileImageId}/presigned-url` // 예시 URL 구조
        : `https://ui-avatars.com/api/?name=${member.profile.nickname}&background=random`,
    }));
  }, [members]);

  // MapPanel에서 전달받을 경로 세그먼트 정보를 저장할 상태 추가
  const [routeSegmentsByDay, setRouteSegmentsByDay] = useState<
    Record<string, RouteSegment[]>
  >({});

  // [추가] 마지막 메시지가 변경될 때만 실행되는 useEffect
  // 이렇게 하면 메시지 배열 전체가 아닌, 마지막 메시지가 바뀔 때만 반응합니다.
  // RightPanel에서 받은 메시지 타입과 MapPanel에서 사용할 ChatMessage 타입을 맞춰줍니다.
  useMemo(() => {
    // lastMessage와 lastMessage.userId가 모두 존재해야 합니다. (시스템 메시지 제외)
    if (lastMessage && lastMessage.userId && activeMembersForHeader) {
      // [추가] 메시지를 보낸 사용자의 정보를 activeMembersForHeader에서 찾습니다.
      const sender = activeMembersForHeader.find(
        (member) => member.id === lastMessage.userId
      );

      setLatestChatMessage({
        userId: lastMessage.userId, // 메시지를 보낸 사용자의 ID
        message: lastMessage.message, // 메시지 내용
        avatar: sender?.avatar, // [추가] 찾은 사용자의 아바타 URL
      });
    }
  }, [lastMessage, activeMembersForHeader]); // [수정] activeMembersForHeader를 의존성 배열에 추가

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

  // PDF 내보내기 버튼 클릭 핸들러
  const handleExportToPdf = useCallback(() => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true); // PDF 생성 시작을 알림
  }, [isGeneratingPdf]);

  // isGeneratingPdf 상태가 true로 변경되면 PDF 생성 로직을 실행
  useEffect(() => {
    if (!isGeneratingPdf) return;

    const generatePdf = async () => {
      // ref가 준비될 때까지 잠시 기다립니다.
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!pdfRef.current) {
        alert('PDF 생성에 실패했습니다: 문서를 찾을 수 없습니다.');
        setIsGeneratingPdf(false);
        return;
      }

      const element = pdfRef.current;
      try {
        // 지도 타일이 로드될 시간을 추가로 기다립니다.
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const images = Array.from(element.querySelectorAll('img'));
        const crossOriginImages = images.filter(
          (img) =>
            img.src &&
            (img.src.includes('daumcdn.net') ||
              img.src.includes('kakaocdn.net'))
        );

        const promises = crossOriginImages.map((img) => {
          return new Promise<void>((resolve) => {
            const originalSrc = img.src;
            if (originalSrc.startsWith('data:')) {
              resolve();
              return;
            }
            const proxyUrl = `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(
              originalSrc
            )}`;

            const newImg = new Image();
            newImg.crossOrigin = 'Anonymous';
            newImg.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = newImg.naturalWidth;
              canvas.height = newImg.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(newImg, 0, 0);
              img.src = canvas.toDataURL('image/png');
              resolve();
            };
            newImg.onerror = () => {
              console.error(`프록시 이미지 로드 실패: ${originalSrc}`);
              resolve();
            };
            newImg.src = proxyUrl;
          });
        });

        await Promise.all(promises);

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${workspaceName}_여행계획.pdf`);
      } catch (error) {
        console.error('PDF 생성 중 오류가 발생했습니다.', error);
        alert('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsGeneratingPdf(false); // 성공/실패 여부와 관계없이 상태를 리셋
      }
    };

    generatePdf();
  }, [isGeneratingPdf, workspaceName, itinerary, dayLayers, routeSegmentsByDay]);

  // [추가] LeftPanel에서 경로 최적화 버튼 클릭 시 호출될 핸들러
  const handleOptimizeRoute = useCallback((dayId: string) => {
    console.log(`[Workspace] Optimization triggered for day: ${dayId}`);
    setOptimizingDayId(dayId);
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
            const newItems = arrayMove(items, oldIndex, newIndex); // 이제 newItems가 사용됩니다.
            const newPoiIds = newItems.map((poi) => poi.id);
            reorderMarkedPois(newPoiIds);
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
            // [개선] 상태를 직접 조작하는 대신, usePoiSocket 훅의 함수를 호출하여 "명령"만 내립니다.
            // 훅 내부에서 낙관적 업데이트와 서버 이벤트 전송을 모두 처리합니다.
            const newPoiIds = newItems.map((poi) => poi.id);
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
      reorderMarkedPois,
      addSchedule,
      dayLayers,
    ]
  );

  // MapPanel로부터 경로 정보를 받아 상태를 업데이트하는 콜백 함수
  const handleRouteInfoUpdate = useCallback(
    (newRouteInfo: Record<string, RouteSegment[]>) => {
      setRouteSegmentsByDay(newRouteInfo);
    },
    []
  );

  // [추가] MapPanel로부터 최적화된 경로 순서를 받아 처리하는 콜백 함수
  const handleRouteOptimized = useCallback(
    (dayId: string, optimizedPoiIds: string[]) => {
      const currentPois = itinerary[dayId]?.map((p) => p.id) || [];
      // 현재 순서와 API가 제안한 최적 순서가 다를 경우에만 업데이트
      if (
        JSON.stringify(currentPois) !== JSON.stringify(optimizedPoiIds) &&
        optimizedPoiIds.length > 0
      ) {
        console.log(
          `Route optimized for day ${dayId}. Applying new order:`,
          optimizedPoiIds
        );
        // reorderPois를 호출하여 서버와 다른 클라이언트에 변경사항 전파
        reorderPois(dayId, optimizedPoiIds);
      }
    },
    [itinerary, reorderPois]
  );

  // [추가] 장소 캐시 스토어에서 데이터를 가져옵니다.
  const placeCache = usePlaceStore((state) => state.placesById);

  // [추가] 렌더링할 최종 장소 목록을 계산합니다. (pois + 캐시)
  const placesToRender = useMemo(() => {
    const combinedPlaces = new Map<string, PlaceDto>();
    const getKey = (p: { latitude: number; longitude: number }) =>
      `${p.latitude},${p.longitude}`;

    // 1. 캐시에 있는 모든 장소를 추가합니다. (API로 불러온 추천 장소 포함)
    placeCache.forEach((place) => {
      combinedPlaces.set(getKey(place), place);
    });

    // 2. POI 목록을 기반으로 PlaceDto를 만듭니다.
    // 이렇게 하면 캐시에 아직 없는 POI(예: 새로고침 직후)도 렌더링 목록에 포함됩니다.
    // 또한, 캐시된 정보가 있다면 POI 정보와 병합됩니다.
    pois.forEach((poi) => {
      const existingPlace = combinedPlaces.get(getKey(poi)) || {};
      const poiAsPlace: PlaceDto = {
        id: poi.id,
        latitude: poi.latitude,
        longitude: poi.longitude,
        title: poi.placeName || '이름 없는 장소',
        address: poi.address,
        // poi.categoryName이 유효한 카테고리인지 확인하고, 아니면 '기타'를 할당합니다.
        category:
          poi.categoryName && poi.categoryName in CATEGORY_INFO
            ? (poi.categoryName as PlaceDto['category'])
            : '기타',
      };
      // [수정] 캐시된 상세 정보(existingPlace)가 POI 기본 정보(poiAsPlace)를 덮어쓰도록 순서를 변경합니다.
      combinedPlaces.set(getKey(poi), { ...poiAsPlace, ...existingPlace });
    });

    return Array.from(combinedPlaces.values());
  }, [pois, placeCache]);

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
          onExportPdf={handleExportToPdf}
          isGeneratingPdf={isGeneratingPdf}
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
            onPoiHover={hoverPoi} // LeftPanel에 hover 핸들러 전달
            onOptimizeRoute={handleOptimizeRoute} // [추가] 최적화 핸들러 전달
            routeSegmentsByDay={routeSegmentsByDay} // LeftPanel에 경로 정보 전달
            visibleDayIds={visibleDayIds} // [추가] 가시성 상태 전달
            onDayVisibilityChange={handleDayVisibilityChange} // [추가] 가시성 변경 핸들러 전달
            hoveredPoiId={hoveredPoiInfo?.poiId ?? null}
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
              placesToRender={placesToRender} // [수정] 계산된 최종 목록 전달
              itinerary={itinerary}
              dayLayers={dayLayers}
              pois={pois}
              isSyncing={isSyncing}
              markPoi={markPoi}
              unmarkPoi={unmarkPoi}
              selectedPlace={selectedPlace}
              mapRef={mapRef}
              setSelectedPlace={setSelectedPlace}
              onRouteInfoUpdate={handleRouteInfoUpdate} // MapPanel에 콜백 함수 전달
              hoveredPoiInfo={hoveredPoiInfo} // hoveredPoi 대신 hoveredPoiInfo 전달
              optimizingDayId={optimizingDayId} // [추가] 최적화 트리거 상태 전달
              onOptimizationComplete={handleOptimizationComplete} // [추가] 최적화 완료 콜백 전달
              onRouteOptimized={handleRouteOptimized} // [추가] 최적화된 경로 콜백 전달
              latestChatMessage={latestChatMessage} // [추가] 최신 채팅 메시지 전달
              cursors={cursors} // cursors prop 전달
              moveCursor={moveCursor} // moveCursor prop 전달
              clickEffects={clickEffects} // clickEffects prop 전달
              clickMap={clickMap} // clickMap prop 전달
              visibleDayIds={visibleDayIds} // [추가] 가시성 상태 전달
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
            messages={messages}
            sendMessage={sendMessage}
            isChatConnected={isChatConnected}
            workspaceId={workspaceId}
          />
        </div>
      </div>
      <DragOverlay>
        {activePoi ? <DraggablePoiItem poi={activePoi} /> : null}
      </DragOverlay>

      {/* PDF 생성 시에만 렌더링되는 숨겨진 문서 */}
      {isGeneratingPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PdfDocument
            ref={pdfRef}
            workspaceName={workspaceName}
            itinerary={itinerary}
            dayLayers={dayLayers}
            routeSegmentsByDay={routeSegmentsByDay}
          />
        </div>
      )}
    </DndContext>
  );
}
