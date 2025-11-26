import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { WEBSOCKET_CHAT_URL } from '../constants';
import { type ToolCallData } from '../types/chat'; // ToolCallData 타입 가져오기

// AI가 보내주는 장소 데이터 타입
export type AiPlace = {
  id: string;
  title: string;
  address: string;
  summary?: string; // summary는 선택적일 수 있으므로 ? 추가
  imageUrl?: string; // image_url 대신 imageUrl 사용 (프론트엔드 컨벤션에 맞춤)
  longitude: number;
  latitude: number;
  category: string;
  recommendationReason?: string; // recommendationReason 추가
};
const ChatEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  LEAVE: 'leave',
  LEFT: 'left',
  MESSAGE: 'message',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
} as const;

export type ChatMessage = {
  id: string; // 메시지 고유 ID 추가 (낙관적 업데이트 및 중복 방지용)
  username: string;
  message: string;
  createdAt: string; // 클라이언트에서 추가할 필드
  userId?: string; // userId 필드 추가
  role: 'user' | 'ai' | 'system'; // 메시지 역할 추가
  toolData?: ToolCallData[]; // AI 메시지인 경우 도구 데이터 추가
  recommendedPlaces?: AiPlace[]; // [추가] AI가 추천한 장소 목록
  isLoading: boolean; // AI 응답 대기 중 상태 표시 (필수 속성으로 변경)
};

// Backend DTOs (simplified for frontend use)
type CreateMessageReqDto = {
  workspaceId: string;
  username: string;
  userId: string; // userId 추가
  message: string;
  tempId?: string; // [추가] 낙관적 업데이트를 위한 임시 ID
};

type JoinChatReqDto = {
  workspaceId: string;
  username: string;
};

type LeaveChatReqDto = {
  workspaceId: string;
  username: string;
};

// 백엔드에서 수신하는 메시지 페이로드 타입 (AI 응답 포함)
type IncomingChatMessagePayload = {
  id: string; // 백엔드에서 제공하는 고유 ID
  username: string;
  message: string;
  userId?: string;
  role?: 'ai' | 'system' | 'user'; // 백엔드에서 역할 지정 가능
  toolData?: ToolCallData[]; // AI 메시지인 경우 도구 데이터 포함
  tempId?: string; // [추가] 클라이언트가 보낸 임시 ID
  createdAt: string;
};

export function useChatSocket(workspaceId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthLoading } = useAuthStore(); // isAuthLoading 추가
  // user?.nickname 대신 user?.profile.nickname 사용
  const username = user?.profile?.nickname || 'Anonymous';
  const userId = user?.userId; // user 객체에서 userId를 가져옵니다.

  useEffect(() => {
    // [수정] 인증 정보 로딩이 완료될 때까지 소켓 연결을 지연시킵니다.
    if (isAuthLoading || !workspaceId || !user) {
      console.warn(
        '인증 정보 로딩 중이거나 필수 정보가 없어 채팅 소켓 연결을 대기합니다.'
      );
      return;
    }

    const socket = io(`${WEBSOCKET_CHAT_URL}/chat`, {
			transports: ['websocket'],
			query: { workspaceId, username }, // 초기 연결 시 쿼리 파라미터로 전달
		});
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Chat Socket connected:', socket.id);
      setIsConnected(true);
      // 서버에서 JOIN 이벤트를 처리하므로 클라이언트에서 별도로 emit하지 않아도 됨
      // 하지만, 명시적으로 JOIN 요청을 보내는 것이 더 안전할 수 있음
      socket.emit(ChatEvent.JOIN, { workspaceId, username } as JoinChatReqDto);
    });

    socket.on('disconnect', () => {
      console.log('Chat Socket disconnected');
      setIsConnected(false);
      setMessages([]); // 연결 끊기면 메시지 초기화
    });

    socket.on('error', (error: any) => {
      console.error('Chat Socket error:', error);
    });

    // 메시지 처리 및 액션 실행을 위한 헬퍼 함수
    const processIncomingMessage = (payload: IncomingChatMessagePayload) => {
      setMessages((prevMessages) => {
        // 1. 내가 보낸 메시지인지 확인 (tempId 기준)
        const optimisticUserMessageIndex = payload.tempId
          ? prevMessages.findIndex((msg) => msg.id === payload.tempId)
          : -1;
        
        const newMessage: ChatMessage = {
          id: payload.id,
          username: payload.username || 'Unknown',
          message: payload.message,
          createdAt: payload.createdAt || new Date().toISOString(),
          userId: payload.userId,
          role: payload.role || (payload.username === 'System' ? 'system' : 'user'),
          toolData: payload.toolData,
          recommendedPlaces: [],
          isLoading: false, // 기본값은 false
        };

        // AI 메시지이고, 메시지 내용이 특정 로딩 문구이거나, toolData에 'loading'이 포함되어 있으면 isLoading: true
        if (
          newMessage.role === 'ai' &&
          (newMessage.message === 'AI가 응답을 생성하고 있습니다...' ||
           newMessage.toolData?.some((t) => t.tool_name === 'loading'))
        ) {
          newMessage.isLoading = true;
        }

        // [추가] tool_data가 있고, 추천 장소 정보가 포함된 경우 파싱하여 추가
        if (payload.toolData && payload.toolData.length > 0) {
          const tool = payload.toolData[0];

          const isRecommendationTool =
            tool.tool_name === 'recommend_places_by_all_users' ||
            tool.tool_name === 'recommend_nearby_places' ||
            tool.tool_name === 'recommend_popular_places_in_region';

          if (isRecommendationTool) {
            let placesArray: any[] = [];

            // tool_output이 배열인 경우 (기존 형식)
            if (Array.isArray(tool.tool_output)) {
              placesArray = tool.tool_output;
            }
            // tool_output이 객체이고 data.places 구조인 경우 (새 형식)
            else if (
              tool.tool_output &&
              typeof tool.tool_output === 'object' &&
              tool.tool_output.data &&
              Array.isArray(tool.tool_output.data.places)
            ) {
              placesArray = tool.tool_output.data.places;
            }

            if (placesArray.length > 0) {
              newMessage.recommendedPlaces = placesArray.map((place: any) => ({
                id: place.id,
                title: place.title,
                address: place.address,
                summary: place.summary,
                imageUrl: place.image_url, // image_url를 imageUrl로 변환
                longitude: place.longitude,
                latitude: place.latitude,
                category: place.category,
                recommendationReason: place.recommendationReason,
              })) as AiPlace[];
            }
          } else if (!newMessage.message && typeof tool.tool_output === 'string') {
            newMessage.message = tool.tool_output;
          }
        }

        // 2. 내가 보낸 메시지(낙관적 업데이트)를 서버에서 받은 메시지로 교체
        if (optimisticUserMessageIndex > -1) {
          const updatedMessages = [...prevMessages];
          updatedMessages[optimisticUserMessageIndex] = newMessage;
          return updatedMessages;
        }

        // 3. AI 응답 처리: '대기 중' 메시지를 실제 응답으로 교체
        // AI 응답은 tempId가 'ai-loading-클라이언트tempId' 형태로 올 수 있음
        if (newMessage.role === 'ai') {
          let aiLoadingMessageIndex = -1;

          // 클라이언트가 보낸 사용자 메시지의 tempId가 AI 응답 payload에 포함되어 있다면,
          // 해당 사용자 메시지 다음에 오는 AI 로딩 메시지를 찾습니다.
          if (payload.tempId) {
            // 사용자 메시지의 tempId를 기반으로 AI 로딩 메시지의 ID를 구성
            const expectedAiLoadingId = `ai-loading-${payload.tempId}`;
            aiLoadingMessageIndex = prevMessages.findIndex(
              (msg) => msg.id === expectedAiLoadingId && msg.isLoading
            );
          }
          
          // 만약 tempId 기반으로 찾지 못했거나 tempId가 없다면,
          // 가장 최근의 isLoading: true인 AI 메시지를 찾습니다.
          if (aiLoadingMessageIndex === -1) {
            aiLoadingMessageIndex = prevMessages.findIndex(
              (msg) => msg.role === 'ai' && msg.isLoading
            );
          }

          if (aiLoadingMessageIndex > -1) {
            const updatedMessages = [...prevMessages];
            // 기존 로딩 메시지를 서버에서 받은 실제 응답으로 교체하고 isLoading을 finalIsLoading으로 설정
            updatedMessages[aiLoadingMessageIndex] = { ...newMessage }; // newMessage 자체가 올바른 isLoading을 가지고 있으므로 그대로 사용
            return updatedMessages;
          }
        }

        return [...prevMessages, newMessage];
      });

      // 도구 데이터가 있으면 액션 실행 (이 부분은 기존과 동일)
      if (payload.toolData && payload.toolData.length > 0) {
        payload.toolData.forEach((tool: ToolCallData) => {
          if (tool.frontend_actions && tool.frontend_actions.length > 0) {
            tool.frontend_actions.forEach(() => {
              let outputData = tool.tool_output;
              if (typeof outputData === 'string') {
                try {
                  outputData = JSON.parse(outputData.replace(/'/g, '"'));
                } catch (e) {
                  console.error('Failed to parse tool_output:', e);
                }
              }
            });
          }
        });
      }
    };

    socket.on(
      ChatEvent.JOINED,
      (
        payload:
          | string
          | IncomingChatMessagePayload
          | IncomingChatMessagePayload[]
      ) => {
        try {
          const parsedPayload =
            typeof payload === 'string' ? JSON.parse(payload) : payload;

          if (typeof parsedPayload.data === 'string') {
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                id: `system-join-${Date.now()}-${Math.random()}`,
                username: 'System',
                message: `${parsedPayload.data}님이 채팅방에 입장했습니다.`,
                createdAt: new Date().toISOString(),
                userId: undefined,
                role: 'system',
                isLoading: false, // 시스템 메시지는 로딩 상태가 아님
              },
            ]);
          } else if (Array.isArray(parsedPayload)) {
            const historyMessages: ChatMessage[] = parsedPayload.map(
              (p: IncomingChatMessagePayload) => ({
                id: p.id,
                username: p.username,
                message: p.message,
                createdAt: p.createdAt || new Date().toISOString(),
                userId: p.userId,
                role: p.role || 'user',
                toolData: p.toolData,
                recommendedPlaces: [], // 과거 기록에도 초기화
                isLoading: false, // 과거 기록은 로딩 상태가 아님
              })
            );
            setMessages(historyMessages);
          } else {
            console.warn('Unhandled JOINED payload format:', parsedPayload);
          }
        } catch (e) {
          console.error('Failed to parse JOINED payload:', payload, e);
        }
      }
    );

    socket.on(ChatEvent.LEFT, (payload: { data: string }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `system-left-${Date.now()}-${Math.random()}`,
          username: 'System',
          message: `${payload.data}님이 채팅방을 나갔습니다.`,
          createdAt: new Date().toISOString(),
          userId: undefined,
          role: 'system',
          isLoading: false, // 시스템 메시지는 로딩 상태가 아님
        },
      ]);
    });

    socket.on(ChatEvent.MESSAGE, (payload: IncomingChatMessagePayload) => {
      processIncomingMessage(payload);
    });

    return () => {
      console.log('Disconnecting chat socket...');
      if (socketRef.current?.connected) {
        socketRef.current.emit(ChatEvent.LEAVE, {
          workspaceId,
          username,
        } as LeaveChatReqDto);
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off(ChatEvent.JOINED);
      socket.off(ChatEvent.LEFT);
      socket.off(ChatEvent.MESSAGE);
      socket.disconnect();
    };
  }, [workspaceId, user, isAuthLoading]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socketRef.current && isConnected && message.trim() && userId) {
        const tempMessageId = `client-${Date.now()}-${Math.random()}`;

        const userMessage: ChatMessage = {
          id: tempMessageId,
          username,
          message,
          createdAt: new Date().toISOString(),
          userId,
          role: 'user',
          isLoading: false, // 사용자 메시지는 로딩 상태가 아님
        };
        setMessages((prev) => [...prev, userMessage]);

        if (message.startsWith('@AI')) {
          const aiLoadingMessage: ChatMessage = {
            id: `ai-loading-${tempMessageId}`, // 사용자 메시지의 tempId를 기반으로 AI 로딩 메시지 ID 생성
            username: 'AI',
            message: '',
            createdAt: new Date().toISOString(),
            role: 'ai',
            isLoading: true,
          };
          setMessages((prev) => [...prev, aiLoadingMessage]);
        }

        const messagePayload: CreateMessageReqDto = {
          workspaceId,
          username,
          userId,
          message,
          tempId: tempMessageId,
        };

        socketRef.current.emit(ChatEvent.MESSAGE, messagePayload);
      } else {
        console.warn('[Client] sendMessage condition not met:', {
          socketConnected: !!socketRef.current,
          isConnected,
          messageTrimmed: message.trim(),
          messageContent: message,
          userIdPresent: !!userId,
        });
      }
    },
    [workspaceId, username, isConnected, userId]
  );

  return { messages, sendMessage, isConnected };
}
