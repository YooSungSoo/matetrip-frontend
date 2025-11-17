import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { WEBSOCKET_POI_URL } from '../constants';
import type { WorkspaceMember as OriginalWorkspaceMember } from '../types/member.ts';
import { API_BASE_URL } from '../api/client';

export type WorkspaceMember = OriginalWorkspaceMember & { color: string };

const PoiSocketEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  SYNC: 'sync',
  LEAVE: 'leave',
  LEFT: 'left',
  MARK: 'mark',
  MARKED: 'marked',
  UNMARK: 'unmark',
  UNMARKED: 'unmarked',
  REORDER: 'reorder',
  ADD_SCHEDULE: 'addSchedule',
  REMOVE_SCHEDULE: 'removeSchedule',
  CURSOR_MOVE: 'cursorMove',
  CURSOR_MOVED: 'cursorMoved',
  'poi:hover': 'poi:hover',
  'poi:hovered': 'poi:hovered',
  'map:click': 'map:click',
  'map:clicked': 'map:clicked',
  'place:focus': 'place:focus',
  'place:focused': 'place:focused',
} as const;

export type Poi = {
  id: string;
  workspaceId: string;
  createdBy: string;
  placeId: string; // 필수로 변경
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
  planDayId?: string;
  categoryName?: string;
  status: 'MARKED' | 'UNMARKED' | 'SCHEDULED' | 'RECOMMENDED';
  sequence: number;
  isPersisted: boolean;
};

export type CreatePoiDto = {
  workspaceId: string;
  createdBy: string;
  placeId: string; // 필수로 변경
  longitude: number;
  latitude: number;
  address: string;
  placeName?: string;
  planDayId?: string;
  categoryName?: string;
};

export type CursorPosition = {
  lat: number;
  lng: number;
};

export type UserCursor = {
  userId: string;
  position: CursorPosition;
  userName: string;
  userColor: string;
  userAvatar: string;
};

export interface HoveredPoiInfo {
  poiId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface MapClickEffect {
  id: string;
  position: CursorPosition;
  userId: string;
  userColor: string;
  userName: string;
}

export function usePoiSocket(workspaceId: string, members: WorkspaceMember[]) {
  const socketRef = useRef<Socket | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const [cursors, setCursors] = useState<
    Record<string, Omit<UserCursor, 'userId'>>
  >({});
  const [hoveredPoiInfo, setHoveredPoiInfo] = useState<HoveredPoiInfo | null>(
    null
  );
  const [clickEffects, setClickEffects] = useState<MapClickEffect[]>([]);

  // [FIX] Use a ref to track optimistic updates to avoid race conditions
  const optimisticScheduleRef = useRef<Map<string, { planDayId: string }>>(
    new Map()
  );

  const addSchedule = useCallback(
    (poiId: string, planDayId: string) => {
      console.log(
        `[addSchedule] Firing ADD_SCHEDULE event for poiId: ${poiId}, planDayId: ${planDayId}`
      );
      socketRef.current?.emit(PoiSocketEvent.ADD_SCHEDULE, {
        workspaceId,
        poiId,
        planDayId,
      });
    },
    [workspaceId]
  );

  const handlePoiHovered = useCallback(
    (data: HoveredPoiInfo | null) => {
      if (data && data.poiId && data.userId !== user?.userId) {
        const member = members.find((m) => m.id === data.userId);
        if (member) {
          setHoveredPoiInfo({
            ...data,
            userName: member.profile.nickname,
            userColor: member.color,
          });
        } else if (!data?.poiId) setHoveredPoiInfo(null);
      } else {
        setHoveredPoiInfo(null);
      }
    },
    [members, user?.userId]
  );

  const markPoi = useCallback(
    (
      poiData: Omit<
        CreatePoiDto,
        'workspaceId' | 'createdBy' | 'id' | 'planDayId'
      >,
      options: { isOptimistic?: boolean; targetDayId?: string } = {
        isOptimistic: true,
      }
    ) => {
      if (!user?.userId) {
        console.error('인증된 사용자 정보가 없습니다.');
        return;
      }

      const tempId = `poi-${Date.now()}-${Math.random()}`;
      const payload = { ...poiData, workspaceId, createdBy: user.userId };

      // If a targetDayId is provided, store it in the ref before emitting
      if (options.targetDayId) {
        console.log(
          `[markPoi] Storing optimistic schedule for tempId: ${tempId} -> planDayId: ${options.targetDayId}`
        );
        optimisticScheduleRef.current.set(tempId, {
          planDayId: options.targetDayId,
        });
      }

      if (options.isOptimistic) {
        const isScheduled = !!options.targetDayId;
        const newPoi: Poi = {
          id: tempId,
          status: isScheduled ? 'SCHEDULED' : 'MARKED',
          planDayId: isScheduled ? options.targetDayId : undefined,
          sequence: 0,
          isPersisted: false,
          ...payload,
        };
        setPois((prevPois) => [...prevPois, newPoi]);
      }

      console.log(`[markPoi] Firing MARK event for tempId: ${tempId}`);
      socketRef.current?.emit(PoiSocketEvent.MARK, { ...payload, tempId });
    },
    [workspaceId, user?.userId]
  );

  useEffect(() => {
    if (isAuthLoading) {
      console.log('인증 정보 로딩 중... 소켓 연결을 대기합니다.');
      return;
    }

    const socket = io(`${WEBSOCKET_POI_URL}/poi`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const handleSync = (payload: { pois: Poi[] }) => {
      console.log('[Event] SYNC 수신:', payload);
      setPois(payload.pois || []);
      setIsSyncing(false);
    };

    const handleMarked = (data: Poi & { tempId?: string }) => {
      console.log('[Event] MARKED 수신:', data);
      if (!data || !data.id) return;

      const newPoiData = { ...data, isPersisted: true };

      // Check the ref for optimistic data, not the component state
      const optimisticData = data.tempId
        ? optimisticScheduleRef.current.get(data.tempId)
        : undefined;

      if (optimisticData) {
        console.log(
          `[handleMarked] Found optimistic data for tempId ${data.tempId}:`,
          optimisticData
        );
        const { planDayId } = optimisticData;

        // Fire the event to add it to the schedule permanently
        setTimeout(() => {
          addSchedule(newPoiData.id, planDayId);
        }, 0);

        // Clean up the ref
        optimisticScheduleRef.current.delete(data.tempId!);
      }

      setPois((prevPois) => {
        const isTempPoiPresent =
          data.tempId && prevPois.some((p) => p.id === data.tempId);

        if (isTempPoiPresent) {
          return prevPois.map((p) =>
            p.id === data.tempId
              ? {
                  ...newPoiData,
                  // Preserve the planDayId from the optimistic UI to prevent flicker
                  planDayId: optimisticData?.planDayId || newPoiData.planDayId,
                  status: optimisticData?.planDayId
                    ? 'SCHEDULED'
                    : newPoiData.status,
                }
              : p
          );
        }

        const existingPoiIndex = prevPois.findIndex(
          (p) => p.id === newPoiData.id
        );
        if (existingPoiIndex > -1) {
          const updatedPois = [...prevPois];
          updatedPois[existingPoiIndex] = {
            ...updatedPois[existingPoiIndex],
            ...newPoiData,
          };
          return updatedPois;
        }

        // Fallback: match by coordinates when tempId is not provided
        const COORDINATE_TOLERANCE = 0.000001;
        const existingByCoordsIndex = prevPois.findIndex(
          (p) =>
            Math.abs(p.latitude - newPoiData.latitude) < COORDINATE_TOLERANCE &&
            Math.abs(p.longitude - newPoiData.longitude) < COORDINATE_TOLERANCE
        );

        if (existingByCoordsIndex > -1) {
          const updatedPois = [...prevPois];
          updatedPois[existingByCoordsIndex] = {
            ...updatedPois[existingByCoordsIndex],
            ...newPoiData,
          };
          return updatedPois;
        }

        return [...prevPois, newPoiData];
      });
    };

    const handleUnmarked = (data: string | { poiId: string }) => {
      console.log('[Event] UNMARKED 수신:', data);
      const idToRemove = typeof data === 'string' ? data : data?.poiId;

      if (idToRemove) {
        setPois((prevPois) => {
          console.log(`Removing POI with id: ${idToRemove}`);
          return prevPois.filter((p) => p.id !== idToRemove);
        });
      }
    };

    const handleAddSchedule = (data: { poiId: string; planDayId: string }) => {
      console.log('[Event] ADD_SCHEDULE 수신:', data);
      setPois((prevPois) =>
        prevPois.map((p) =>
          p.id === data.poiId
            ? { ...p, planDayId: data.planDayId, status: 'SCHEDULED' }
            : p
        )
      );
    };

    const handleRemoveSchedule = (data: {
      poiId: string;
      planDayId: string;
    }) => {
      console.log('[Event] REMOVE_SCHEDULE 수신:', data);
      setPois((prevPois) =>
        prevPois.map((p) =>
          p.id === data.poiId
            ? { ...p, planDayId: undefined, status: 'MARKED' }
            : p
        )
      );
    };

    const handleReorder = (data: { planDayId: string; poiIds: string[] }) => {
      console.log('[Event] REORDER 수신:', data);
      const newSequenceMap = new Map(
        data.poiIds.map((id, index) => [id, index])
      );
      setPois((prevPois) =>
        prevPois.map((poi) => {
          if (poi.planDayId === data.planDayId && newSequenceMap.has(poi.id)) {
            return { ...poi, sequence: newSequenceMap.get(poi.id)! };
          }
          return poi;
        })
      );
    };

    const handleCursorMoved = (data: UserCursor) => {
      if (data.userId === user?.userId) return;
      setCursors((prevCursors) => ({
        ...prevCursors,
        [data.userId]: {
          position: data.position,
          userName: data.userName,
          userColor: data.userColor,
          userAvatar: data.userAvatar,
        },
      }));
    };

    const handleMapClicked = (data: Omit<MapClickEffect, 'id'>) => {
      console.log('[Event] MAP_CLICKED 수신:', data);
      if (data.userId === user?.userId) return;

      const effectId = `${data.userId}-${Date.now()}`;
      const newEffect: MapClickEffect = { ...data, id: effectId };
      setClickEffects((prev) => [...prev, newEffect]);

      setTimeout(
        () =>
          setClickEffects((prev) =>
            prev.filter((effect) => effect.id !== effectId)
          ),
        1000
      );
    };

    const handlePlaceFocused = (data: { userId: string; userName: string; places?: any[] }) => {
      console.log('[Event] PLACE_FOCUSED 수신:', data);
      // 자신이 보낸 이벤트는 처리하지 않음 (이미 받았음)
      if (data.userId === user?.userId) return;
      // 다른 사용자의 focus 알림은 무시 (places가 없음)
      // 본인만 places를 받음
    };

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit(PoiSocketEvent.JOIN, { workspaceId });
    });

    socket.on(PoiSocketEvent.SYNC, handleSync);
    socket.on(PoiSocketEvent.MARKED, handleMarked);
    socket.on(PoiSocketEvent.UNMARKED, handleUnmarked);
    socket.on(PoiSocketEvent.ADD_SCHEDULE, handleAddSchedule);
    socket.on(PoiSocketEvent.REMOVE_SCHEDULE, handleRemoveSchedule);
    socket.on(PoiSocketEvent.REORDER, handleReorder);
    socket.on(PoiSocketEvent.CURSOR_MOVED, handleCursorMoved);
    socket.on(PoiSocketEvent['poi:hovered'], handlePoiHovered);
    socket.on(PoiSocketEvent['map:clicked'], handleMapClicked);
    socket.on(PoiSocketEvent['place:focused'], handlePlaceFocused);

    return () => {
      console.log('Disconnecting socket...');
      socket.emit(PoiSocketEvent.LEAVE, { workspaceId });
      socket.off(PoiSocketEvent.SYNC, handleSync);
      socket.off(PoiSocketEvent.MARKED, handleMarked);
      socket.off(PoiSocketEvent.UNMARKED, handleUnmarked);
      socket.off(PoiSocketEvent.ADD_SCHEDULE, handleAddSchedule);
      socket.off(PoiSocketEvent.REMOVE_SCHEDULE, handleRemoveSchedule);
      socket.off(PoiSocketEvent.REORDER, handleReorder);
      socket.off(PoiSocketEvent.CURSOR_MOVED, handleCursorMoved);
      socket.off(PoiSocketEvent['poi:hovered'], handlePoiHovered);
      socket.off(PoiSocketEvent['map:clicked'], handleMapClicked);
      socket.off(PoiSocketEvent['place:focused'], handlePlaceFocused);
      socket.disconnect();
    };
  }, [workspaceId, user?.userId, handlePoiHovered, isAuthLoading, addSchedule]);

  const unmarkPoi = useCallback(
    (poiId: number | string) => {
      socketRef.current?.emit(PoiSocketEvent.UNMARK, { workspaceId, poiId });
    },
    [workspaceId]
  );

  const removeSchedule = useCallback(
    (poiId: string, planDayId: string) => {
      socketRef.current?.emit(PoiSocketEvent.REMOVE_SCHEDULE, {
        workspaceId,
        poiId,
        planDayId,
      });
    },
    [workspaceId]
  );

  const reorderPois = useCallback(
    (planDayId: string, poiIds: string[]) => {
      setPois((prevPois) => {
        const newSequenceMap = new Map(poiIds.map((id, index) => [id, index]));
        const otherPois = prevPois.filter(
          (p) => p.planDayId !== planDayId && !newSequenceMap.has(p.id)
        );
        const reorderedPois = prevPois
          .filter((p) => newSequenceMap.has(p.id))
          .map((p) => ({ ...p, sequence: newSequenceMap.get(p.id)! }))
          .sort((a, b) => a.sequence - b.sequence);

        return [...otherPois, ...reorderedPois];
      });

      socketRef.current?.emit(PoiSocketEvent.REORDER, {
        workspaceId,
        planDayId,
        poiIds,
      });
    },
    [workspaceId]
  );

  const reorderMarkedPois = useCallback(
    (poiIds: string[]) => {
      setPois((prevPois) => {
        const newSequenceMap = new Map(poiIds.map((id, index) => [id, index]));
        const scheduledPois = prevPois.filter(
          (p) => p.status === 'SCHEDULED'
        );
        const reorderedMarkedPois = prevPois
          .filter((p) => newSequenceMap.has(p.id))
          .map((p) => ({ ...p, sequence: newSequenceMap.get(p.id)! }))
          .sort((a, b) => a.sequence - b.sequence);

        return [...scheduledPois, ...reorderedMarkedPois];
      });
    },
    [setPois]
  );

  const moveCursor = useCallback(
    (position: CursorPosition) => {
      if (isAuthLoading || !user || !socketRef.current?.connected) return;

      const currentUserMemberInfo = members.find(
        (member) => member.id === user.userId
      );

      const userAvatarUrl = currentUserMemberInfo?.profile.profileImageId
        ? `${API_BASE_URL}/binary-content/${currentUserMemberInfo.profile.profileImageId}/presigned-url`
        : `https://ui-avatars.com/api/?name=${
            currentUserMemberInfo?.profile.nickname || 'User'
          }&background=random`;

      const payload = {
        workspaceId,
        userId: user.userId,
        position,
        userName: currentUserMemberInfo?.profile.nickname || 'Unknown',
        userColor: currentUserMemberInfo?.color || '#FF0000',
        userAvatar: userAvatarUrl,
      };
      socketRef.current?.emit(PoiSocketEvent.CURSOR_MOVE, payload);
    },
    [workspaceId, user, isAuthLoading, members]
  );

  const hoverPoi = useCallback(
    (poiId: string | null) => {
      if (!user || !socketRef.current?.connected) return;
      socketRef.current?.emit(PoiSocketEvent['poi:hover'], {
        workspaceId,
        poiId,
        userId: user.userId,
      });
      const member = members.find((m) => m.id === user.userId);
      if (poiId && member) {
        setHoveredPoiInfo({
          poiId,
          userId: user.userId,
          userName: member.profile.nickname,
          userColor: member.color,
        });
      } else {
        setHoveredPoiInfo(null);
      }
    },
    [workspaceId, user, members]
  );

  const clickMap = useCallback(
    (position: CursorPosition) => {
      if (!user || !socketRef.current?.connected) return;
      const member = members.find((m) => m.id === user.userId);
      const userColor = member?.color || '#FF0000';
      const userName = member?.profile.nickname || 'Unknown';

      const effectId = `${user.userId}-${Date.now()}`;
      const newEffect: MapClickEffect = {
        id: effectId,
        position,
        userId: user.userId,
        userColor,
        userName,
      };
      setClickEffects((prev) => [...prev, newEffect]);
      setTimeout(
        () =>
          setClickEffects((prev) =>
            prev.filter((effect) => effect.id !== effectId)
          ),
        1000
      );

      socketRef.current?.emit(PoiSocketEvent['map:click'], {
        workspaceId,
        position,
        userId: user.userId,
        userColor,
        userName,
      });
    },
    [workspaceId, user, members]
  );

  const focusPlace = useCallback(
    (bounds: { southWestLatitude: number; southWestLongitude: number; northEastLatitude: number; northEastLongitude: number }, callback: (places: any[]) => void) => {
      if (!user || !socketRef.current?.connected) return;
      const member = members.find((m) => m.id === user.userId);
      const userName = member?.profile.nickname || 'Unknown';

      // 이벤트 리스너를 한 번만 등록
      const handleResponse = (data: { userId: string; userName: string; places?: any[] }) => {
        if (data.userId === user.userId && data.places) {
          callback(data.places);
          socketRef.current?.off(PoiSocketEvent['place:focused'], handleResponse);
        }
      };

      socketRef.current?.on(PoiSocketEvent['place:focused'], handleResponse);

      socketRef.current?.emit(PoiSocketEvent['place:focus'], {
        workspaceId,
        userId: user.userId,
        userName,
        ...bounds,
      });
    },
    [workspaceId, user, members]
  );

  const addRecommendedPoisToDay = useCallback(
    (planDayId: string, recommendedPois: Poi[]) => {
      if (!user?.userId) return;
  
      // Use a set for efficient duplicate checking
      const existingCoordinates = new Set(pois.map(p => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`));
      
      const poisToCreate: { tempId: string, payload: CreatePoiDto }[] = [];
      const newPoisForState: Poi[] = [];

      recommendedPois.forEach((poi) => {
        const newCoord = `${poi.latitude.toFixed(5)},${poi.longitude.toFixed(5)}`;
        if (existingCoordinates.has(newCoord)) {
          console.log(`[addRecommendedPoisToDay] Skipping duplicate POI: ${poi.placeName}`);
          return;
        }
        
        const tempId = `poi-${Date.now()}-${Math.random()}`;
        const payload: CreatePoiDto = {
            workspaceId,
            createdBy: user.userId,
            placeId: poi.placeId, // [추가] placeId 필수
            latitude: poi.latitude,
            longitude: poi.longitude,
            address: poi.address,
            placeName: poi.placeName,
            categoryName: poi.categoryName,
            planDayId: planDayId,
        };

        // For emitting to socket
        poisToCreate.push({ tempId, payload: { ...payload, planDayId: undefined } }); // `planDayId` is handled by `optimisticScheduleRef`

        // For optimistic update
        newPoisForState.push({
            id: tempId,
            status: 'SCHEDULED',
            sequence: 999, // Let server decide final sequence or handle reordering
            isPersisted: false,
            ...payload,
        });

        // Store optimistic schedule info for when the POI is confirmed by the server
        optimisticScheduleRef.current.set(tempId, { planDayId });
      });

      // 1. Perform a single optimistic update for the UI
      if (newPoisForState.length > 0) {
        setPois((prevPois) => [...prevPois, ...newPoisForState]);
      }
  
      // 2. Emit events to the server
      poisToCreate.forEach(({ tempId, payload }) => {
        socketRef.current?.emit(PoiSocketEvent.MARK, { ...payload, tempId });
      });
    },
    [user, workspaceId, pois]
  );

  return {
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
  };
}
