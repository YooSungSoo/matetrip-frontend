import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
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
import { MapPanel } from '../components/MapPanel';
import type { KakaoPlace, RouteSegment, ChatMessage } from '../types/map';
import type { PlanDayDto } from '../types/workspace';
import { LeftPanel } from '../components/LeftPanel';
import { PlanRoomHeader } from '../components/PlanRoomHeader';
import { usePlaceStore } from '../store/placeStore';
import { type Poi, usePoiSocket } from '../hooks/usePoiSocket.ts';
import { type AiPlace, useChatSocket } from '../hooks/useChatSocket';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers.ts';
import client, { API_BASE_URL } from '../api/client.ts';
import { CATEGORY_INFO, type PlaceDto } from '../types/place.ts';
import { AddToItineraryModal } from '../components/AddToItineraryModal.tsx';
import { PdfDocument } from '../components/PdfDocument.tsx';
import { AIRecommendationLoadingModal } from '../components/AIRecommendationLoadingModal.tsx';
import { PdfGeneratingLoadingModal } from '../components/PdfGeneratingLoadingModal';
import { toast } from 'sonner';
import { ScheduleSidebar, PoiDetailPanel } from '../components/ScheduleSidebar.tsx'; // PoiDetailPanel 임포트
import { OptimizationModal } from '../components/OptimizationModal.tsx';

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
    const darkValue = Math.floor(value * 0.7);
    color += darkValue.toString(16).padStart(2, '0');
  }
  return color.toUpperCase();
};

const DAY_COLORS = [
  '#E53935',
  '#FB8C00',
  '#43A047',
  '#1E88E5',
  '#5E35B1',
  '#8E24AA',
  '#D81B60',
  '#6D4C41',
  '#757575',
  '#00897B',
  '#00ACC1',
  '#7CB342',
  '#E65100',
  '#C0CA33',
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
  const [isLeftPanelOpen, _setIsLeftPanelOpen] = useState(true);
  const [schedulePosition, setSchedulePosition] = useState<
    'hidden' | 'overlay' | 'docked'
  >('hidden');

  const [recommendedItinerary, setRecommendedItinerary] = useState<
    Record<string, Poi[]>
  >({});
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [itineraryAiPlaces, setItineraryAiPlaces] = useState<AiPlace[]>([]);
  const [chatAiPlaces, setChatAiPlaces] = useState<AiPlace[]>([]);
  const [_initialBoundsSet, setInitialBoundsSet] = useState(false);

  const [poiToAdd, setPoiToAdd] = useState<Poi | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [initialMapCenter, setInitialMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [postLocation, setPostLocation] = useState<string | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // 상세보기 패널 상태 추가
  const [showPlaceDetailPanel, setShowPlaceDetailPanel] = useState(false);
  const [selectedPlaceIdForPanel, setSelectedPlaceIdForPanel] = useState<
    string | null
  >(null);

  const { members: membersWithoutColor } = useWorkspaceMembers(workspaceId);

  const members = useMemo(
    () =>
      membersWithoutColor.map((member) => ({
        ...member,
        color: generateColorFromString(member.id),
      })),
    [membersWithoutColor]
  );

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
    clickEffects,
    clickMap,
    addRecommendedPoisToDay,
    focusPlace,
    flushPois,
  } = usePoiSocket(workspaceId, members);

  const {
    messages,
    sendMessage,
    isConnected: isChatConnected,
  } = useChatSocket(workspaceId);

  const [latestChatMessage, setLatestChatMessage] =
    useState<ChatMessage | null>(null);

  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

  const handleSendMessage = (message: string) => {
    if (message.trim().startsWith('/')) {
      setInitialBoundsSet(false);
    }
    sendMessage(message);
  };

  useEffect(() => {
    if (hoveredPoiInfo && !pois.find((p) => p.id === hoveredPoiInfo.poiId)) {
      hoverPoi(null);
    }
  }, [pois, hoveredPoiInfo, hoverPoi]);

  useEffect(() => {
    if (lastMessage?.recommendedPlaces) {
      setChatAiPlaces(lastMessage.recommendedPlaces);
      const map = mapRef.current;
      if (map && lastMessage.recommendedPlaces.length > 0) {
        const firstPlace = lastMessage.recommendedPlaces[0];
        const moveLatLon = new window.kakao.maps.LatLng(
          firstPlace.latitude,
          firstPlace.longitude
        );
        isProgrammaticMove.current = true;
        map.panTo(moveLatLon);
      }
    }
  }, [lastMessage]);

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const mapRef = useRef<kakao.maps.Map>(null);
  const isProgrammaticMove = useRef(false);
  const [optimizingDayId, setOptimizingDayId] = useState<string | null>(null);
  const [isOptimizationProcessing, setIsOptimizationProcessing] =
    useState(false);
  const handleOptimizationComplete = useCallback(() => {
    setIsOptimizationProcessing(false);
  }, []);
  const [visibleDayIds, setVisibleDayIds] = useState<Set<string>>(new Set());

  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [originalRouteData, setOriginalRouteData] = useState<{
    pois: Poi[];
    segments: RouteSegment[];
  } | null>(null);

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
        setRecommendedItinerary({});
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
              summary: p.summary,
              imageUrl: p.image_url,
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
      setItineraryAiPlaces(allRecommendedPois);
    } catch (error) {
      console.error('Failed to generate AI plan:', error);
      setRecommendedItinerary({});
    } finally {
      setIsRecommendationLoading(false);
    }
  }, [workspaceId, postLocation, planDayDtos]);

  useEffect(() => {
    console.log('[디버그] 워크스페이스 진입. 게시글 여행지:', postLocation);

    if (planDayDtos.length === 0) return;

    if (postLocation) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(postLocation, (result: any, status: any) => {
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
  }, [planDayDtos, generateAiPlan]);

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

  const handleMyItineraryVisibilityChange = useCallback(() => {
    const allDayIds = dayLayers.map((day) => day.id);
    setVisibleDayIds((prev) => {
      const newSet = new Set(prev);
      const areAllVisible = allDayIds.every((id) => newSet.has(id));
      if (areAllVisible) {
        allDayIds.forEach((id) => newSet.delete(id));
      } else {
        allDayIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [dayLayers]);

  const handleRecommendedItineraryVisibilityChange = useCallback(() => {
    const allRecommendedDayIds = Object.keys(recommendedItinerary);
    setVisibleDayIds((prev) => {
      const newSet = new Set(prev);
      const areAllVisible = allRecommendedDayIds.every((id) => newSet.has(id));
      if (areAllVisible) {
        allRecommendedDayIds.forEach((id) => newSet.delete(id));
      } else {
        allRecommendedDayIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, [recommendedItinerary]);

  const handleAddRecommendedPoi = useCallback((poi: Poi) => {
    setPoiToAdd(poi);
    setIsAddModalOpen(true);
  }, []);

  const handleConfirmAdd = useCallback(
    (targetDayId: string) => {
      if (!poiToAdd) {
        return;
      }
      const result = addRecommendedPoisToDay(targetDayId, [poiToAdd]);
      if (!result.success && result.message) {
        toast.warning(result.message);
      }
      setIsAddModalOpen(false);
    },
    [poiToAdd, addRecommendedPoisToDay]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const timer = setTimeout(() => {
        map.relayout();
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [isLeftPanelOpen, schedulePosition]);

  const activeMembersForHeader = useMemo(() => {
    return members.map((member) => ({
      id: member.id,
      name: member.profile.nickname,
      avatar: member.profile.profileImageId
        ? member.profile.profileImageId
        : `https://ui-avatars.com/api/?name=${member.profile.nickname}&background=random`,
      email: member.email,
      profileId: member.profile.id,
      userId: member.id,
    }));
  }, [members]);

  const [routeSegmentsByDay, setRouteSegmentsByDay] = useState<
    Record<string, RouteSegment[]>
  >({});

  useEffect(() => {
    if (lastMessage && activeMembersForHeader) {
      const sender = activeMembersForHeader.find(
        (member) => member.id === lastMessage.userId
      );
      if (
        (lastMessage.role === 'user' &&
          lastMessage.message.startsWith('@AI')) ||
        (lastMessage.role === 'ai' && lastMessage.isLoading)
      ) {
        setLatestChatMessage(null);
      } else if (lastMessage.userId) {
        const messageToSet = {
          userId: lastMessage.userId,
          message: lastMessage.message,
          avatar: sender?.avatar,
        };
        setLatestChatMessage(messageToSet);
      } else {
        setLatestChatMessage(null);
      }
    } else {
      setLatestChatMessage(null);
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

  const handlePoiClick = (poi: Pick<Poi, 'latitude' | 'longitude'>) => {
    const map = mapRef.current;
    if (!map) return;
    isProgrammaticMove.current = true;
    const moveLatLon = new window.kakao.maps.LatLng(
      poi.latitude,
      poi.longitude
    );
    map.setLevel(3);
    map.panTo(moveLatLon);
  };

  // 상세보기 패널 핸들러 추가
  const handleOpenPlaceDetailPanel = (placeId: string) => {
    setSelectedPlaceIdForPanel(placeId);
    requestAnimationFrame(() => setShowPlaceDetailPanel(true));
  };

  const handleClosePlaceDetailPanel = () => {
    setShowPlaceDetailPanel(false);
    setTimeout(() => setSelectedPlaceIdForPanel(null), 300);
  };

  const handleExportToPdf = useCallback(() => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
  }, [isGeneratingPdf]);

  useEffect(() => {
    if (!isGeneratingPdf) return;

    const generatePdf = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!pdfRef.current) {
        toast.warning('PDF 생성에 실패했습니다: 문서를 찾을 수 없습니다.');
        setIsGeneratingPdf(false);
        return;
      }

      const element = pdfRef.current;
      try {
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
        toast.warning('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsGeneratingPdf(false);
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

  const handleOptimizeRoute = useCallback(
    (dayId: string) => {
      const pois = itinerary[dayId] || [];
      const segments = routeSegmentsByDay[dayId] || [];
      setOriginalRouteData(JSON.parse(JSON.stringify({ pois, segments })));
      setOptimizingDayId(dayId);
      setIsOptimizationProcessing(true);
      setIsOptimizationModalOpen(true);
    },
    [itinerary, routeSegmentsByDay]
  );

  const handleCloseModal = () => {
    setIsOptimizationModalOpen(false);
    setOriginalRouteData(null);
    setOptimizingDayId(null);
    setIsOptimizationProcessing(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const poi = pois.find((p) => p.id === active.id);
    if (poi) {
      setActivePoi(poi);
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePoi(null);
      const { active, over } = event;

      if (!over) {
        return;
      }

      const activeId = String(active.id);
      const activeSortableContainerId =
        active.data.current?.sortable?.containerId;

      let targetDroppableId: string | undefined;
      let targetSortableContainerId: string | undefined;

      if (over.data.current?.sortable) {
        targetSortableContainerId = String(
          over.data.current.sortable.containerId
        );
        targetDroppableId = targetSortableContainerId.replace('-sortable', '');
      } else {
        targetDroppableId = String(over.id);
        targetSortableContainerId =
          targetDroppableId === 'marker-storage'
            ? 'marker-storage-sortable'
            : targetDroppableId + '-sortable';
      }

      if (!activeSortableContainerId || !activeId || !targetDroppableId) {
        return;
      }

      const isSameLogicalContainer =
        activeSortableContainerId === targetSortableContainerId;

      if (
        isSameLogicalContainer &&
        activeSortableContainerId?.startsWith('rec-')
      ) {
        return;
      }
      if (isSameLogicalContainer) {
        if (targetDroppableId === 'marker-storage') {
          const items = markedPois;
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newItems = arrayMove(items, oldIndex, newIndex);
            const newPoiIds = newItems.map((poi) => poi.id);
            reorderMarkedPois(newPoiIds);
          }
        } else {
          const dayId = targetDroppableId;
          const items = itinerary[dayId];
          if (!items) return;
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newItems = arrayMove(items, oldIndex, newIndex);
            const newPoiIds = newItems.map((poi) => poi.id);
            reorderPois(dayId, newPoiIds);
          }
        }
      } else {
        const activePoi = pois.find((p) => p.id === activeId);
        if (!activePoi) {
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
                  categoryName: p.categoryName,
                };
              }
            }
            return p;
          });
        });

        if (activePoi.planDayId) {
          removeSchedule(activeId, activePoi.planDayId);
        }

        if (isDroppingToItineraryDay) {
          const dayId = targetDroppableId;
          addSchedule(activeId, dayId);
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

  const handleRouteInfoUpdate = useCallback(
    (newRouteInfo: Record<string, RouteSegment[]>) => {
      setRouteSegmentsByDay(newRouteInfo);
    },
    []
  );

  const handleRouteOptimized = useCallback(
    (dayId: string, optimizedPoiIds: string[]) => {
      const currentPois = itinerary[dayId]?.map((p) => p.id) || [];
      if (
        JSON.stringify(currentPois) !== JSON.stringify(optimizedPoiIds) &&
        optimizedPoiIds.length > 0
      ) {
        reorderPois(dayId, optimizedPoiIds);
      }
    },
    [itinerary, reorderPois]
  );

  const placeCache = usePlaceStore((state) => state.placesById);

  const placesToRender = useMemo(() => {
    const combinedPlaces = new Map<string, PlaceDto>();
    const getKey = (p: { latitude: number; longitude: number }) =>
      `${p.latitude},${p.longitude}`;

    placeCache.forEach((place) => {
      combinedPlaces.set(getKey(place), place);
    });

    pois.forEach((poi) => {
      const existingPlace = combinedPlaces.get(getKey(poi)) || {};
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
      combinedPlaces.set(getKey(poi), { ...poiAsPlace, ...existingPlace });
    });

    Object.values(recommendedItinerary)
      .flat()
      .forEach((poi) => {
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

  const handleToggleScheduleOverlay = () => {
    setSchedulePosition((prev) => (prev === 'hidden' ? 'overlay' : 'hidden'));
  };

  const handleDockScheduleSidebar = () => {
    setSchedulePosition('docked');
  };

  const handleUndockScheduleSidebar = () => {
    setSchedulePosition('overlay');
  };

  const dayLayerForModal = optimizingDayId
    ? (dayLayers.find((l) => l.id === optimizingDayId) ?? null)
    : null;
  const optimizedPois = optimizingDayId ? itinerary[optimizingDayId] : [];
  const optimizedSegments = optimizingDayId
    ? routeSegmentsByDay[optimizingDayId]
    : [];

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="h-full flex flex-col bg-gray-50 p-4 gap-4">
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
          onToggleScheduleSidebar={handleToggleScheduleOverlay}
          onFlush={flushPois}
        />

        <div className="flex-1 flex relative overflow-hidden rounded-lg">
          <div
            className={`w-2/5 h-full transition-opacity duration-300 ${
              schedulePosition === 'docked'
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100'
            }`}
          >
            <LeftPanel
              isRecommendationLoading={isRecommendationLoading}
              workspaceId={workspaceId}
              isOpen={isLeftPanelOpen}
              recommendedItinerary={recommendedItinerary}
              dayLayers={dayLayers}
              onPoiClick={handlePoiClick}
              onPoiHover={hoverPoi}
              onAddRecommendedPoi={handleAddRecommendedPoi}
              onAddRecommendedPoiToDay={addRecommendedPoisToDay}
              visibleDayIds={visibleDayIds}
              onDayVisibilityChange={handleDayVisibilityChange}
              onRecommendedItineraryVisibilityChange={
                handleRecommendedItineraryVisibilityChange
              }
              hoveredPoiId={hoveredPoiInfo?.poiId ?? null}
              messages={messages}
              sendMessage={handleSendMessage}
              isChatConnected={isChatConnected}
              onCardClick={handlePoiClick}
              onShowDetails={handleOpenPlaceDetailPanel} // 상세보기 핸들러 전달
              setChatAiPlaces={setChatAiPlaces}
              chatAiPlaces={chatAiPlaces}
              activeMembers={activeMembersForHeader}
            />
          </div>

          <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
            <MapPanel
              workspaceId={workspaceId}
              placesToRender={placesToRender}
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
              onRouteInfoUpdate={handleRouteInfoUpdate}
              onRouteOptimized={handleRouteOptimized}
              optimizingDayId={optimizingDayId}
              onOptimizationComplete={handleOptimizationComplete}
              latestChatMessage={latestChatMessage}
              cursors={cursors}
              moveCursor={moveCursor}
              clickEffects={clickEffects}
              clickMap={clickMap}
              visibleDayIds={visibleDayIds}
              initialCenter={initialMapCenter}
              focusPlace={focusPlace}
              itineraryAiPlaces={itineraryAiPlaces}
              chatAiPlaces={chatAiPlaces}
              isProgrammaticMove={isProgrammaticMove}
              hoveredPoiInfo={hoveredPoiInfo}
            />
          </div>

          <ScheduleSidebar
            position={schedulePosition}
            onClose={() => setSchedulePosition('hidden')}
            onDock={handleDockScheduleSidebar}
            onUndock={handleUndockScheduleSidebar}
            itinerary={itinerary}
            dayLayers={dayLayers}
            markedPois={markedPois}
            unmarkPoi={unmarkPoi}
            removeSchedule={removeSchedule}
            onPoiSelect={handlePoiClick}
            onPoiHover={hoverPoi}
            routeSegmentsByDay={routeSegmentsByDay}
            onOptimizeRoute={handleOptimizeRoute}
            visibleDayIds={visibleDayIds}
            onDayVisibilityChange={handleDayVisibilityChange}
            onMyItineraryVisibilityChange={handleMyItineraryVisibilityChange}
            hoveredPoiId={hoveredPoiInfo?.poiId ?? null}
            isOptimizationProcessing={isOptimizationProcessing}
          />
        </div>
      </div>
      <DragOverlay>
        {activePoi ? <DraggablePoiItem poi={activePoi} /> : null}
      </DragOverlay>
      <AddToItineraryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dayLayers={dayLayers}
        onConfirm={handleConfirmAdd}
        poiName={poiToAdd?.placeName}
      />
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
      <AIRecommendationLoadingModal isOpen={isRecommendationLoading} />
      <PdfGeneratingLoadingModal isOpen={isGeneratingPdf} />
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
      {/* 상세보기 패널 렌더링 */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 ${
          showPlaceDetailPanel
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClosePlaceDetailPanel}
      />
      <PoiDetailPanel
        placeId={selectedPlaceIdForPanel}
        isVisible={showPlaceDetailPanel}
        onClose={handleClosePlaceDetailPanel}
        onNearbyPlaceSelect={handleOpenPlaceDetailPanel}
        onPoiSelect={() => {}}
        widthClass="w-1/2"
        onClick={(e) => e.stopPropagation()}
        positioning="fixed"
      />
    </DndContext>
  );
}
