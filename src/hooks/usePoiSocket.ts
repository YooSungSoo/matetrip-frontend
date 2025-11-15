import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore'; // isAuthLoading 제거
import { WEBSOCKET_POI_URL } from '../constants';
import type { WorkspaceMember as OriginalWorkspaceMember } from '../types/member.ts';
import { API_BASE_URL } from '../api/client';

// color 속성을 포함하는 새로운 타입을 정의합니다.
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
  POI_HOVER: 'poi:hover', // POI 호버 이벤트 추가
  POI_HOVERED: 'poi:hovered', // POI 호버 수신 이벤트 추가
  MAP_CLICK: 'map:click', // 지도 클릭 이벤트 추가
  MAP_CLICKED: 'map:clicked', // 지도 클릭 수신 이벤트 추가
} as const;

export type Poi = {
  id: string;
  workspaceId: string;
  createdBy: string;
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
  planDayId?: string;
  categoryName?: string;
  status: 'MARKED' | 'UNMARKED' | 'SCHEDULED';
  sequence: number;
  isPersisted: boolean;
};

export type CreatePoiDto = {
  workspaceId: string;
  createdBy: string;
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

// 다른 사용자가 호버한 POI 정보를 저장할 타입
export interface HoveredPoiInfo {
  poiId: string;
  userId: string;
  userName: string;
  userColor: string;
}

// 지도 클릭 효과를 위한 타입
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
  const [cursors, setCursors] = useState<Record<string, Omit<UserCursor, 'userId'>>>({});
  const [hoveredPoiInfo, setHoveredPoiInfo] = useState<HoveredPoiInfo | null>(null);
  const [clickEffects, setClickEffects] = useState<MapClickEffect[]>([]); // 지도 클릭 효과 상태

  // useCallback을 사용하여 members 상태가 변경될 때마다 함수를 재생성합니다.
  // useEffect 밖으로 이동시킵니다.
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
        }
      } else {
        // data가 null이거나 내 이벤트일 경우 호버 정보 초기화
        setHoveredPoiInfo(null);
      }
    },
    [members, user?.userId] // members가 변경될 때마다 이 함수를 다시 생성합니다.
  );

  useEffect(() => {
    const socket = io(`${WEBSOCKET_POI_URL}/poi`, {  path: '/ws/poi',transports: ['websocket'] });
    socketRef.current = socket;

    const handleSync = (payload: { pois: Poi[] }) => {
      console.log('[Event] SYNC 수신:', payload);
      setPois(payload.pois || []);
      setIsSyncing(false);
    };

    const handleMarked = (newPoi: Poi) => {
      console.log('[Event] MARKED 수신:', newPoi);
      if (newPoi && newPoi.id) {
        setPois((prevPois) => {
          // Ensure the new POI has a status, defaulting to 'MARKED' if not provided
          const poiWithStatus = {
            ...newPoi,
            status: newPoi.status || 'MARKED',
          };
          if (prevPois.some((p) => p.id === poiWithStatus.id)) {
            return prevPois.map((p) =>
              p.id === poiWithStatus.id ? poiWithStatus : p
            );
          }
          return [...prevPois, poiWithStatus];
        });
      }
    };

    const handleUnmarked = (poiId: string) => {
      // data 객체 대신 poiId 문자열을 직접 받도록 변경
      console.log('[Event] UNMARKED 수신:', poiId);
      if (poiId) {
        // poiId가 유효한지 확인
        setPois((prevPois) => prevPois.filter((p) => p.id !== poiId));
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
      if (data.userId === user?.userId) return; // 내 커서는 표시하지 않음
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
      // 내 클릭 이벤트는 로컬에서 즉시 처리되므로, 다른 사용자의 이벤트만 처리합니다.
      if (data.userId === user?.userId) return;

      const effectId = `${data.userId}-${Date.now()}`;
      const newEffect: MapClickEffect = { ...data, id: effectId };
      setClickEffects((prev) => [...prev, newEffect]);

      setTimeout(() => setClickEffects((prev) => prev.filter((effect) => effect.id !== effectId)), 1000); // 1초 후 효과 제거
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
    socket.on(PoiSocketEvent.POI_HOVERED, handlePoiHovered);
    socket.on(PoiSocketEvent.MAP_CLICKED, handleMapClicked);

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
      socket.off(PoiSocketEvent.POI_HOVERED, handlePoiHovered);
      socket.off(PoiSocketEvent.MAP_CLICKED, handleMapClicked);
      socket.disconnect();
    };
  }, [workspaceId, user?.userId, handlePoiHovered]); // useEffect의 의존성 배열에 handlePoiHovered를 추가합니다.

  const markPoi = useCallback(
    (poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy' | 'id'>) => {
      if (!user?.userId) {
        console.error('인증된 사용자 정보가 없습니다.');
        return;
      }
      const payload = { ...poiData, workspaceId, createdBy: user.userId };
      socketRef.current?.emit(
        PoiSocketEvent.MARK,
        payload,
        (response: Poi | { error: string }) => {
          console.log('[Ack] MARK 응답:', response);
        }
      );
    },
    [workspaceId, user?.userId]
  );

  const unmarkPoi = useCallback(
    (poiId: number | string) => {
      socketRef.current?.emit(PoiSocketEvent.UNMARK, { workspaceId, poiId });
    },
    [workspaceId]
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
      socketRef.current?.emit(PoiSocketEvent.REORDER, {
        workspaceId,
        planDayId,
        poiIds,
      });
    },
    [workspaceId]
  );

  const moveCursor = useCallback(
    (position: CursorPosition) => {
      if (isAuthLoading || !user || !socketRef.current?.connected) return;

      const currentUserMemberInfo = members.find((member) => member.id === user.userId);

      const userAvatarUrl = currentUserMemberInfo?.profile.profileImageId
        ? `${API_BASE_URL}/binary-content/${currentUserMemberInfo.profile.profileImageId}/presigned-url`
        : `https://ui-avatars.com/api/?name=${currentUserMemberInfo?.profile.nickname || 'User'}&background=random`;

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
      socketRef.current?.emit(PoiSocketEvent.POI_HOVER, {
        workspaceId,
        poiId,
        userId: user.userId,
      });
      // 내가 호버한 아이템은 로컬에서 바로 반영하여 즉각적인 UI 반응을 유도
      const member = members.find((m) => m.id === user.userId);
      if (poiId && member) {
        setHoveredPoiInfo({ poiId, userId: user.userId, userName: member.profile.nickname, userColor: member.color });
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

      // 로컬에서 즉시 효과를 보여주기 위함
      const effectId = `${user.userId}-${Date.now()}`;
      const newEffect: MapClickEffect = { id: effectId, position, userId: user.userId, userColor, userName };
      setClickEffects((prev) => [...prev, newEffect]);
      setTimeout(() => setClickEffects((prev) => prev.filter((effect) => effect.id !== effectId)), 1000);
      console.log('[Event] MAP_CLICK 송신:', { workspaceId, position, userId: user.userId, userColor, userName });

      // 다른 사용자에게 이벤트 전파
      socketRef.current?.emit(PoiSocketEvent.MAP_CLICK, {
        workspaceId,
        position,
        userId: user.userId,
        userColor,
        userName,
      });
    }, [workspaceId, user, members]);

  return {
    pois,
    setPois,
    isSyncing,
    markPoi,
    unmarkPoi,
    addSchedule,
    removeSchedule,
    reorderPois,
    cursors,
    moveCursor,
    hoveredPoiInfo,
    hoverPoi,
    clickEffects, // 반환값에 추가
    clickMap, // 반환값에 추가
  };
}
