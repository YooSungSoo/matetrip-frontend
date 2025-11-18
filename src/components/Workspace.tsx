import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
} from 'lucide-react';
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
import { Button } from './ui/button';
import type { PlanDayDto } from '../types/workspace';
import { LeftPanel } from './LeftPanel';
import { PlanRoomHeader } from './PlanRoomHeader';
import { usePlaceStore } from '../store/placeStore'; // placeStore import
import { type Poi, usePoiSocket } from '../hooks/usePoiSocket.ts';
import { type AiPlace, useChatSocket } from '../hooks/useChatSocket';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers.ts';
import client, { API_BASE_URL } from '../api/client.ts';
import { CATEGORY_INFO, type PlaceDto } from '../types/place.ts'; // useWorkspaceMembers 훅 import
import { AddToItineraryModal } from './AddToItineraryModal.tsx';
import { PdfDocument } from './PdfDocument.tsx'; // [신규] 모달 컴포넌트 임포트 (생성 필요)
import { AIRecommendationLoadingModal } from './AIRecommendationLoadingModal.tsx';

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

const DAY_COLORS = [
  '#E53935', // 선명한 빨강
  '#FB8C00', // 주황
  '#43A047', // 녹색
  '#1E88E5', // 파랑
  '#5E35B1', // 남보라 (인디고)
  '#8E24AA', // 보라
  '#D81B60', // 짙은 핑크 (마젠타)
  '#6D4C41', // 갈색
  '#757575', // 회색
  '#00897B', // 짙은 녹색 (틸)
  '#00ACC1', // 청록 (사이언)
  '#7CB342', // 연두
  '#E65100', // 짙은 주황
  '#C0CA33', // 라임
];

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

  // [신규] AI 추천 일정 관련 상태
  const [recommendedItinerary, setRecommendedItinerary] = useState<
    Record<string, Poi[]>
  >({});
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);
  const [aiRecommendedPlaces, setAiRecommendedPlaces] = useState<AiPlace[]>([]);
  const [initialBoundsSet, setInitialBoundsSet] = useState(false);

  // [신규] '일정 추가' 모달 관련 상태
  const [poiToAdd, setPoiToAdd] = useState<Poi | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // [신규] 초기 지도 중심 좌표 상태
  const [initialMapCenter, setInitialMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 게시글의 위치 정보를 저장할 상태
  const [postLocation, setPostLocation] = useState<string | null>(null);

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
    addRecommendedPoisToDay,
    focusPlace, // 추가
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

  const handleSendMessage = (message: string) => {
    if (message.trim().startsWith('/')) {
      setInitialBoundsSet(false);
    }
    sendMessage(message);
  };

  useEffect(() => {
    if (lastMessage?.recommendedPlaces && !initialBoundsSet) {
      setAiRecommendedPlaces(lastMessage.recommendedPlaces);
      const map = mapRef.current;
      if (map && lastMessage.recommendedPlaces.length > 0) {
        isProgrammaticMove.current = true;
        const bounds = new window.kakao.maps.LatLngBounds();
        lastMessage.recommendedPlaces.forEach((place) => {
          bounds.extend(
            new window.kakao.maps.LatLng(place.latitude, place.longitude)
          );
        });
        map.setBounds(bounds);
        setInitialBoundsSet(true);
      }
    } else if (lastMessage && !lastMessage.recommendedPlaces) {
      setAiRecommendedPlaces([]);
    }
  }, [lastMessage, initialBoundsSet]);

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const mapRef = useRef<kakao.maps.Map>(null);
  const isProgrammaticMove = useRef(false);
  // [추가] 경로 최적화를 트리거하기 위한 상태
  const [optimizingDayId, setOptimizingDayId] = useState<string | null>(null);
  // [추가] 최적화 진행 중 상태
  const [isOptimizationProcessing, setIsOptimizationProcessing] =
    useState(false);
  // [추가] 최적화 완료 후 상태를 리셋하는 콜백
  const handleOptimizationComplete = useCallback(() => {
    setOptimizingDayId(null);
    setIsOptimizationProcessing(false); // Optimization ends
  }, []);
  // [추가] 지도에 표시할 날짜 ID를 관리하는 상태
  const [visibleDayIds, setVisibleDayIds] = useState<Set<string>>(new Set());

  // 워크스페이스와 연결된 게시글 정보를 가져와서 postLocation을 설정합니다.
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        const response = await client.get(`/workspace/${workspaceId}/post`);
        if (response.data && response.data.location) {
          setPostLocation(response.data.location);
        }
      } catch (error) {
        console.error('Failed to fetch post data for workspace:', error);
      }
    };

    fetchPostData();
  }, [workspaceId]);

  // [신규] AI 추천 일정 가져오기 함수
  const generateAiPlan = useCallback(async () => {
    if (!postLocation || planDayDtos.length === 0) {
      console.log(
        'Cannot generate AI plan: missing postLocation or planDayDtos'
      );
      return;
    }
    setIsRecommendationLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/workspace/generate-ai-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspaceId,
            region: postLocation,
            startDate: planDayDtos[0].planDate,
            endDate: planDayDtos[planDayDtos.length - 1].planDate,
          }),
        }
      );
      const data = await response.json();

      if (!data) {
        console.error('Invalid AI plan response:', data);
        setRecommendedItinerary({}); // 에러 시 기존 추천 초기화
        return;
      }

      const newRecommendedItinerary: Record<string, Poi[]> = {};
      const allRecommendedPois: AiPlace[] = [];
      data.forEach((rec: { pois: any[] }, index: number) => {
        const planDay = planDayDtos[index];
        if (!planDay || !rec || !rec.pois) return;

        const virtualPlanDayId = `rec-${workspaceId}-${planDay.planDate}`;
        const poisForDay = rec.pois
          .filter((p) => p && p.id)
          .map((p: any) => {
            const poiData = {
              ...p,
              id: `rec-${p.id}`,
              placeId: p.id,
              placeName: p.title,
              categoryName: p.category,
              status: 'RECOMMENDED' as any,
              planDayId: virtualPlanDayId,
            };
            allRecommendedPois.push({
              id: p.id,
              title: p.title,
              summary: p.summary, // [수정] summary 속성 추가
              image_url: p.image_url, // [수정] image_url 속성 추가
              latitude: p.latitude,
              longitude: p.longitude,
              category: p.category,
              address: p.address,
            });
            return poiData;
          });
        newRecommendedItinerary[virtualPlanDayId] = poisForDay;
      });
      setRecommendedItinerary(newRecommendedItinerary);
      setAiRecommendedPlaces(allRecommendedPois);
    } catch (error) {
      console.error('Failed to generate AI plan:', error);
      setRecommendedItinerary({}); // 에러 시 기존 추천 초기화
    } finally {
      setIsRecommendationLoading(false);
    }
  }, [workspaceId, postLocation, planDayDtos]);

  // [추가] planDayDtos가 변경되면 visibleDayIds를 모든 날짜 ID로 초기화
  useEffect(() => {
    // [디버그용] 워크스페이스 진입 시 게시글의 여행지(postLocation) 값 확인
    console.log('[디버그] 워크스페이스 진입. 게시글 여행지:', postLocation);

    if (planDayDtos.length === 0) return;

    // [수정] postLocation이 있으면 좌표로 변환하여 지도 초기 위치 설정
    if (postLocation) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(postLocation, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          setInitialMapCenter({
            lat: Number(result[0].y),
            lng: Number(result[0].x),
          });
        } else {
          console.warn(
            `'${postLocation}'에 대한 좌표를 찾을 수 없습니다. 기본 위치로 지도를 표시합니다.`
          );
        }
      });
    }

    setVisibleDayIds(new Set(planDayDtos.map((day) => day.id)));

    // AI 추천 일정을 생성합니다.
    generateAiPlan();
  }, [planDayDtos, generateAiPlan]); // [수정] 의존성 배열에 generateAiPlan 추가

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

  const dayLayers = useMemo(
    () =>
      planDayDtos.map((day, index) => ({
        id: day.id,
        planDate: day.planDate,
        label: day.planDate,
        color: DAY_COLORS[index % DAY_COLORS.length],
      })),
    [planDayDtos]
  );

  // [수정] '내 일정'의 모든 경로 가시성을 토글하는 핸들러
  const handleMyItineraryVisibilityChange = useCallback(() => {
    const allDayIds = dayLayers.map((day) => day.id);
    setVisibleDayIds((prev) => {
      const newSet = new Set(prev);
      const areAllVisible = allDayIds.every((id) => newSet.has(id));
      if (areAllVisible) {
        // 모두 켜져 있으면 모두 끄기
        allDayIds.forEach((id) => newSet.delete(id));
      } else {
        // 하나라도 꺼져 있으면 모두 켜기
        allDayIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [dayLayers]);

  // [신규] 'AI 추천 일정'의 모든 경로 가시성을 토글하는 핸들러
  const handleRecommendedItineraryVisibilityChange = useCallback(() => {
    const allRecommendedDayIds = Object.keys(recommendedItinerary);
    setVisibleDayIds((prev) => {
      const newSet = new Set(prev);
      const areAllVisible = allRecommendedDayIds.every((id) => newSet.has(id));
      if (areAllVisible) {
        // 모두 켜져 있으면 모두 끄기
        allRecommendedDayIds.forEach((id) => newSet.delete(id));
      } else {
        // 하나라도 꺼져 있으면 모두 켜기
        allRecommendedDayIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [recommendedItinerary]);

  // [수정] 추천 POI를 '내 일정'에 추가하는 핸들러
  const handleAddRecommendedPoi = useCallback((poi: Poi) => {
    // 항상 모달을 띄워서 날짜를 선택하게 함
    setPoiToAdd(poi);
    setIsAddModalOpen(true);
  }, []);

  // [수정] 모달에서 날짜를 선택하고 '확인'을 눌렀을 때 실행되는 함수
  const handleConfirmAdd = useCallback(
    (targetDayId: string) => {
      if (!poiToAdd) return;

      // addRecommendedPoisToDay 함수를 사용하여 POI를 추가하고 결과를 받음
      const result = addRecommendedPoisToDay(targetDayId, [poiToAdd]);

      // 결과에 따라 사용자에게 알림
      if (!result.success && result.message) {
        alert(result.message);
      }

      // 모달 닫기
      setIsAddModalOpen(false);
    },
    [poiToAdd, addRecommendedPoisToDay]
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
  }, [isLeftPanelOpen]);
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

  // [FIX] useMemo를 useEffect로 변경하여 Rules of Hooks 위반 해결
  useEffect(() => {
    if (lastMessage && lastMessage.userId && activeMembersForHeader) {
      const sender = activeMembersForHeader.find(
        (member) => member.id === lastMessage.userId
      );

      setLatestChatMessage({
        userId: lastMessage.userId,
        message: lastMessage.message,
        avatar: sender?.avatar,
      });
    }
  }, [lastMessage, activeMembersForHeader]);

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

  const handlePoiClick = (poi: Poi | AiPlace) => {
    const map = mapRef.current;
    if (!map) return;
    isProgrammaticMove.current = true;
    const moveLatLon = new window.kakao.maps.LatLng(
      poi.latitude,
      poi.longitude
    );
    map.setLevel(5);
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
  }, [
    isGeneratingPdf,
    workspaceName,
    itinerary,
    dayLayers,
    routeSegmentsByDay,
  ]);

  // [추가] LeftPanel에서 경로 최적화 버튼 클릭 시 호출될 핸들러
  const handleOptimizeRoute = useCallback((dayId: string) => {
    console.log(`[Workspace] Optimization triggered for day: ${dayId}`);
    setOptimizingDayId(dayId);
    setIsOptimizationProcessing(true); // Optimization starts
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

      // [개선] 추천 목록 내에서의 순서 변경 시도 방지
      if (
        isSameLogicalContainer &&
        activeSortableContainerId?.startsWith('rec-')
      ) {
        return;
      }
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
                  categoryName: p.categoryName, // [추가] categoryName 유지
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

    // 3. AI 추천 POI 목록을 기반으로 PlaceDto를 만듭니다.
    Object.values(recommendedItinerary)
      .flat()
      .forEach((poi) => {
        // 이미 추가된 장소는 건너뜁니다.
        if (combinedPlaces.has(getKey(poi))) return;

        const poiAsPlace: PlaceDto = {
          id: poi.id,
          latitude: poi.latitude,
          longitude: poi.longitude,
          title: poi.placeName || '이름 없는 장소',
          address: poi.address,
          category:
            poi.categoryName && poi.categoryName in CATEGORY_INFO
              ? (poi.categoryName as PlaceDto['category'])
              : '기타',
        };
        combinedPlaces.set(getKey(poi), poiAsPlace);
      });

    return Array.from(combinedPlaces.values());
  }, [pois, placeCache, recommendedItinerary]);

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
            isRecommendationLoading={isRecommendationLoading}
            workspaceId={workspaceId}
            isOpen={isLeftPanelOpen}
            itinerary={itinerary}
            recommendedItinerary={recommendedItinerary}
            dayLayers={dayLayers}
            markedPois={markedPois}
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            onPoiClick={handlePoiClick}
            onPoiHover={hoverPoi} // LeftPanel에 hover 핸들러 전달
            onAddRecommendedPoi={handleAddRecommendedPoi}
            onAddRecommendedPoiToDay={addRecommendedPoisToDay}
            onOptimizeRoute={handleOptimizeRoute}
            routeSegmentsByDay={routeSegmentsByDay} // LeftPanel에 경로 정보 전달
            visibleDayIds={visibleDayIds} // [추가] 가시성 상태 전달
            onDayVisibilityChange={handleDayVisibilityChange} // [추가] 가시성 변경 핸들러 전달
            onMyItineraryVisibilityChange={handleMyItineraryVisibilityChange} // [수정] '내 일정'용 핸들러 전달
            onRecommendedItineraryVisibilityChange={
              handleRecommendedItineraryVisibilityChange
            } // [수정] 'AI 추천'용 핸들러 전달
            onGenerateAiPlan={generateAiPlan} // [신규] AI 추천 재생성 함수 전달
            hoveredPoiId={hoveredPoiInfo?.poiId ?? null}
            isOptimizationProcessing={isOptimizationProcessing} // New prop
            // [수정] ChatPanel을 위해 props 전달
            messages={messages}
            sendMessage={handleSendMessage}
            isChatConnected={isChatConnected}
            onCardClick={handlePoiClick} // 채팅 카드 클릭 핸들러
            isRecommendationOpen={isRecommendationOpen}
            setIsRecommendationOpen={setIsRecommendationOpen}
            setAiRecommendedPlaces={setAiRecommendedPlaces}
            aiRecommendedPlaces={aiRecommendedPlaces}
          />

          {/* AI 추천 일정 버튼 */}
          <div
            className="absolute top-0 z-30 transition-all duration-300 ease-in-out"
            style={{
              left: isLeftPanelOpen
                ? isRecommendationOpen
                  ? '768px'
                  : '384px'
                : '0px',
            }}
          >
            <Button
              variant={isRecommendationOpen ? 'default' : 'outline'}
              className={`h-14 w-auto px-4 shadow-lg rounded-none rounded-tr-lg flex items-center gap-2 ${
                isRecommendationOpen
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-transparent shadow-indigo-500/50'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-transparent shadow-indigo-500/50'
              }`}
              onClick={() => setIsRecommendationOpen(!isRecommendationOpen)}
            >
              <span className="text-sm font-semibold">AI 추천</span>
              {isRecommendationOpen ? (
                <ChevronsLeft className="w-5 h-5" />
              ) : (
                <ChevronsRight className="w-5 h-5" />
              )}
            </Button>
          </div>
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="absolute top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center border border-gray-300 rounded-r-md shadow-md"
            style={{ left: isLeftPanelOpen ? '384px' : '0' }}
          >
            {isLeftPanelOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <div className="flex-1 bg-gray-100">
            <MapPanel
              workspaceId={workspaceId} // [신규] workspaceId 전달
              placesToRender={placesToRender} // [수정] 계산된 최종 목록 전달
              itinerary={itinerary}
              recommendedItinerary={recommendedItinerary}
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
              initialCenter={initialMapCenter} // [신규] 초기 지도 중심 좌표 전달
              focusPlace={focusPlace} // [추가] focusPlace 전달
              isRecommendationOpen={isRecommendationOpen}
              setIsRecommendationOpen={setIsRecommendationOpen}
              recommendedPlaces={aiRecommendedPlaces}
              isProgrammaticMove={isProgrammaticMove}
            />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activePoi ? <DraggablePoiItem poi={activePoi} /> : null}
      </DragOverlay>
      {/* [신규] 일정 추가 모달 */}
      <AddToItineraryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dayLayers={dayLayers}
        onConfirm={handleConfirmAdd}
        poiName={poiToAdd?.placeName}
      />

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

      {/* AI 추천 로딩 모달 */}
      <AIRecommendationLoadingModal isOpen={isRecommendationLoading} />
    </DndContext>
  );
}
