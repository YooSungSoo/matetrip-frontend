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
  FLUSH: 'flush',
  FLUSHED: 'flushed',
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
  const poisRef = useRef(pois);

  useEffect(() => {
    poisRef.current = pois;
  }, [pois]);

  const [isSyncing, setIsSyncing] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const [cursors, setCursors] = useState<
    Record<string, Omit<UserCursor, 'userId'>>
  >({});
  const [hoveredPoiInfo, setHoveredPoiInfo] = useState<HoveredPoiInfo | null>(
    null
  );
  const [clickEffects, setClickEffects] = useState<MapClickEffect[]>([]);

  const optimisticScheduleRef = useRef<Map<string, { planDayId: string }>>(
    new Map()
  );

  const addSchedule = useCallback(
    (poiId: string, planDayId: string) => {
      socketRef.current?.emit(PoiSocketEvent.ADD_SCHEDULE, {
        workspaceId,
        poiId,
        planDayId,
      });
    },
    [workspaceId]
  );

  const flushPois = useCallback(() => {
    if (!workspaceId) {
      console.error('[usePoiSocket] flushPois: 유효하지 않은 workspaceId입니다.');
      return;
    }
    if (!socketRef.current?.connected) {
      console.error('[usePoiSocket] flushPois: 소켓이 연결되지 않았습니다.');
      return;
    }
    console.log(
      `[usePoiSocket] [flushPois] Firing FLUSH event for workspaceId: ${workspaceId}`
    );
    socketRef.current?.emit(PoiSocketEvent.FLUSH, { workspaceId });
  }, [workspaceId]);

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
        console.error('[usePoiSocket] 인증된 사용자 정보가 없습니다.');
        return;
      }

      const tempId = `poi-${Date.now()}-${Math.random()}`;
      const payload = { ...poiData, workspaceId, createdBy: user.userId };

      if (options.targetDayId) {
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

      socketRef.current?.emit(PoiSocketEvent.MARK, { ...payload, tempId });
    },
    [workspaceId, user?.userId]
  );

  useEffect(() => {
    if (isAuthLoading) {
      console.log('[usePoiSocket] 인증 정보 로딩 중... 소켓 연결을 대기합니다.');
      return;
    }

    const socket = io(`${WEBSOCKET_POI_URL}/poi`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const handleSync = (payload: { pois: Poi[] }) => {
      console.log('[usePoiSocket] [Event] SYNC 또는 FLUSHED 수신:', payload);
      setPois(payload.pois || []);
      setIsSyncing(false);
    };

    const handleMarked = (data: Poi & { tempId?: string }) => {
      const newPoiData = { ...data, isPersisted: true };
      setPois((prevPois) => {
        let tempPoi: Poi | undefined;
        if (data.tempId) {
          tempPoi = prevPois.find((p) => p.id === data.tempId);
        }
        if (!tempPoi) {
          const COORDINATE_TOLERANCE = 0.000001;
          tempPoi = prevPois.find(
            (p) =>
              !p.isPersisted &&
              Math.abs(p.latitude - newPoiData.latitude) <
                COORDINATE_TOLERANCE &&
              Math.abs(p.longitude - newPoiData.longitude) <
                COORDINATE_TOLERANCE
          );
        }

        if (tempPoi) {
          const tempId = tempPoi.id;
          const optimisticData = optimisticScheduleRef.current.get(tempId);
          if (optimisticData) {
            optimisticScheduleRef.current.delete(tempId);
          }
          return prevPois.map((p) =>
            p.id === tempId
              ? {
                  ...newPoiData,
                  planDayId: optimisticData?.planDayId || p.planDayId,
                  status: optimisticData?.planDayId
                    ? 'SCHEDULED'
                    : newPoiData.status,
                  categoryName: p.categoryName,
                }
              : p
          );
        }

        const existingPoiIndex = prevPois.findIndex(
          (p) => p.id === newPoiData.id
        );
        if (existingPoiIndex > -1) {
          return prevPois.map((p, index) =>
            index === existingPoiIndex
              ? {
                  ...p,
                  ...newPoiData,
                  categoryName: p.categoryName || newPoiData.categoryName,
                }
              : p
          );
        }
        return [...prevPois, newPoiData];
      });
    };

    const handleUnmarked = (data: string | { poiId: string }) => {
      const idToRemove = typeof data === 'string' ? data : data?.poiId;
      if (idToRemove) {
        setPois((prevPois) => prevPois.filter((p) => p.id !== idToRemove));
      }
    };

    const handleAddSchedule = (data: { poiId: string; planDayId: string }) => {
      console.log('[usePoiSocket] [Event] ADD_SCHEDULE 수신:', data);
      const poiExists = poisRef.current.some((p) => p.id === data.poiId);

      if (poiExists) {
        setPois((currentPois) => {
          console.log(`[usePoiSocket] [handleAddSchedule] Found POI ${data.poiId}. Updating status to SCHEDULED.`);
          return currentPois.map((p) =>
            p.id === data.poiId
              ? {
                  ...p,
                  planDayId: data.planDayId,
                  status: 'SCHEDULED',
                  categoryName: p.categoryName,
                }
              : p
          );
        });
      } else {
        console.warn(`[usePoiSocket] [handleAddSchedule] WARNING: POI with id ${data.poiId} not found. Re-joining room to force SYNC.`);
        socket.emit(PoiSocketEvent.JOIN, { workspaceId });
      }
    };

    const handleRemoveSchedule = (data: {
      poiId: string;
      planDayId: string;
    }) => {
      setPois((prevPois) =>
        prevPois.map((p) =>
          p.id === data.poiId
            ? { ...p, planDayId: undefined, status: 'MARKED' }
            : p
        )
      );
    };

    const handleReorder = (data: { planDayId: string; poiIds: string[] }) => {
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

    const handlePlaceFocused = (data: {
      userId: string;
      userName: string;
      places?: any[];
    }) => {
      if (data.userId === user?.userId) return;
    };

    socket.on('connect', () => {
      console.log('[usePoiSocket] Socket connected:', socket.id);
      socket.emit(PoiSocketEvent.JOIN, { workspaceId });
    });

    socket.on(PoiSocketEvent.SYNC, handleSync);
    socket.on(PoiSocketEvent.FLUSHED, handleSync);
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
      console.log('[usePoiSocket] Disconnecting socket...');
      socket.emit(PoiSocketEvent.LEAVE, { workspaceId });
      socket.off(PoiSocketEvent.SYNC, handleSync);
      socket.off(PoiSocketEvent.FLUSHED, handleSync);
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
  }, [workspaceId, user?.userId, isAuthLoading]);

  const unmarkPoi = useCallback(
    (poiId: number | string) => {
      if (hoveredPoiInfo?.poiId === poiId) {
        setHoveredPoiInfo(null);
      }
      setPois((prevPois) => prevPois.filter((p) => p.id !== poiId));
      socketRef.current?.emit(PoiSocketEvent.UNMARK, { workspaceId, poiId });
    },
    [workspaceId, hoveredPoiInfo?.poiId]
  );

  const removeSchedule = useCallback(
    (poiId: string, planDayId: string) => {
      if (hoveredPoiInfo?.poiId === poiId) {
        setHoveredPoiInfo(null);
      }
      setPois((prevPois) =>
        prevPois.map((p) =>
          p.id === poiId
            ? { ...p, planDayId: undefined, status: 'MARKED' }
            : p
        )
      );
      socketRef.current?.emit(PoiSocketEvent.REMOVE_SCHEDULE, {
        workspaceId,
        poiId,
        planDayId,
      });
    },
    [workspaceId, hoveredPoiInfo?.poiId]
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

        const updatedPois = [...otherPois, ...reorderedPois];
        return updatedPois;
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

        const updatedPois = [...scheduledPois, ...reorderedMarkedPois];
        return updatedPois;
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
    (
      bounds: {
        southWestLatitude: number;
        southWestLongitude: number;
        northEastLatitude: number;
        northEastLongitude: number;
      },
      callback: (places: any[]) => void
    ) => {
      if (!user || !socketRef.current?.connected) return;
      const member = members.find((m) => m.id === user.userId);
      const userName = member?.profile.nickname || 'Unknown';

      const handleResponse = (data: {
        userId: string;
        userName: string;
        places?: any[];
      }) => {
        if (data.userId === user.userId && data.places) {
          callback(data.places);
          socketRef.current?.off(
            PoiSocketEvent['place:focused'],
            handleResponse
          );
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
    (
      planDayId: string,
      recommendedPois: Poi[]
    ): { success: boolean; message?: string } => {
      if (!user?.userId) {
        return {
          success: false,
          message: '사용자 인증 정보가 없어 추가할 수 없습니다.',
        };
      }

      const existingCoordinates = new Set(
        pois.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
      );

      const poisToCreate: {
        tempId: string;
        payload: Omit<CreatePoiDto, 'planDayId'>;
      }[] = [];
      const newPoisForState: Poi[] = [];
      const skippedPois: string[] = [];

      recommendedPois.forEach((poi) => {
        const newCoord = `${poi.latitude.toFixed(5)},${poi.longitude.toFixed(
          5
        )}`;
        if (existingCoordinates.has(newCoord)) {
          skippedPois.push(poi.placeName || '이름 없는 장소');
          return;
        }

        const tempId = `poi-${Date.now()}-${Math.random()}`;
        const payload: CreatePoiDto = {
          workspaceId,
          createdBy: user.userId,
          placeId: poi.placeId,
          latitude: poi.latitude,
          longitude: poi.longitude,
          address: poi.address,
          placeName: poi.placeName,
          categoryName: poi.categoryName,
          planDayId: planDayId,
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { planDayId: _, ...payloadForMark } = payload;

        poisToCreate.push({
          tempId,
          payload: payloadForMark,
        });

        newPoisForState.push({
          id: tempId,
          status: 'SCHEDULED',
          sequence: 999,
          isPersisted: false,
          ...payload,
        });

        optimisticScheduleRef.current.set(tempId, { planDayId });
      });

      if (newPoisForState.length === 0 && skippedPois.length > 0) {
        return {
          success: false,
          message: `'${skippedPois[0]}'은(는) 이미 일정에 추가된 장소입니다.`,
        };
      }

      if (newPoisForState.length > 0) {
        setPois((prevPois) => [...prevPois, ...newPoisForState]);
      }

      if (poisToCreate.length > 0) {
        poisToCreate.forEach(({ tempId, payload }) => {
          socketRef.current?.emit(PoiSocketEvent.MARK, { ...payload, tempId });
        });
      }

      return { success: true };
    },
    [user, workspaceId, pois, setPois]
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
    flushPois,
  };
}
