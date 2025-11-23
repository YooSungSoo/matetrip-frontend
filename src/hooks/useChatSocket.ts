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
  summary: string;
  image_url: string;
  longitude: number;
  latitude: number;
  category: string;
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
  isLoading?: boolean; // AI 응답 대기 중 상태 표시
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
        const optimisticMessageIndex = payload.tempId
          ? prevMessages.findIndex((msg) => msg.id === payload.tempId)
          : -1;
        console.log(`payload2`, payload);
        const newMessage: ChatMessage = {
          id: payload.id,
          username: payload.username || 'Unknown',
          message: payload.message,
          createdAt: payload.createdAt || new Date().toISOString(), // 서버 타임스탬프가 있다면 그것을 사용
          userId: payload.userId,
          role:
            payload.role || (payload.username === 'System' ? 'system' : 'user'), // 역할 지정
          toolData: payload.toolData,
          recommendedPlaces: [], // [추가] 초기화
          isLoading: false, // 실제 메시지이므로 isLoading은 false
        };

        // [추가] tool_data가 있고, 추천 장소 정보가 포함된 경우 파싱하여 추가
        if (payload.toolData && payload.toolData.length > 0) {
          const tool = payload.toolData[0];
          
          if (
            (tool.tool_name === 'recommend_places_by_all_users' ||
              tool.tool_name === 'recommend_nearby_places' ||
              tool.tool_name === 'recommend_popular_places_in_region') &&
            Array.isArray(tool.tool_output)
          ) {
            newMessage.recommendedPlaces = tool.tool_output as AiPlace[];
          }
          // [추가] message가 비어있고 tool_output이 문자열이면, tool_output을 message로 사용
          else if (!newMessage.message && typeof tool.tool_output === 'string') {
            newMessage.message = tool.tool_output;
          }
        }

        // 2. 내가 보낸 메시지(낙관적 업데이트)를 서버에서 받은 메시지로 교체
        if (optimisticMessageIndex > -1) {
          const updatedMessages = [...prevMessages];
          updatedMessages[optimisticMessageIndex] = newMessage;
          return updatedMessages;
        }

        // 3. AI 응답 처리: '대기 중' 메시지를 실제 응답으로 교체
        if (newMessage.role === 'ai') {
          const loadingMessageIndex = prevMessages.findIndex(
            (msg) => msg.role === 'ai' && msg.isLoading
          );
          if (loadingMessageIndex > -1) {
            const updatedMessages = [...prevMessages];
            updatedMessages[loadingMessageIndex] = newMessage;
            return updatedMessages;
          }
        }

        // 4. 위 경우에 해당하지 않는 모든 새 메시지(다른 사용자 메시지, 시스템 메시지 등) 추가
        return [...prevMessages, newMessage];
      });

      // 도구 데이터가 있으면 액션 실행
      if (payload.toolData && payload.toolData.length > 0) {
        payload.toolData.forEach((tool: ToolCallData) => {
          if (tool.frontend_actions && tool.frontend_actions.length > 0) {
            tool.frontend_actions.forEach(() => {
              // tool_output이 문자열일 경우 JSON으로 파싱
              let outputData = tool.tool_output;
              if (typeof outputData === 'string') {
                try {
                  outputData = JSON.parse(outputData.replace(/'/g, '"'));
                } catch (e) {
                  console.error('Failed to parse tool_output:', e);
                }
              }
              // executeFrontendAction(action, outputData); // [제거] 더 이상 호출하지 않음
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
        console.log('[Event] JOINED 수신:', payload); // payload: string | IncomingChatMessagePayload
        try {
          const parsedPayload =
            typeof payload === 'string' ? JSON.parse(payload) : payload;

          if (typeof parsedPayload.data === 'string') {
            // 시스템 입장 메시지
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                id: `system-join-${Date.now()}-${Math.random()}`,
                username: 'System',
                message: `${parsedPayload.data}님이 채팅방에 입장했습니다.`,
                createdAt: new Date().toISOString(),
                userId: undefined,
                role: 'system',
              },
            ]);
          } else if (Array.isArray(parsedPayload)) {
            // [수정] 과거 채팅 기록 (배열) 처리
            console.log('과거 채팅 기록 수신:', parsedPayload);
            const historyMessages: ChatMessage[] = parsedPayload.map(
              (p: IncomingChatMessagePayload) => ({
                id: p.id,
                username: p.username,
                message: p.message,
                createdAt: p.createdAt || new Date().toISOString(), // TODO: 서버에서 타임스탬프를 준다면 그것을 사용
                userId: p.userId,
                role: p.role || 'user',
                toolData: p.toolData,
              })
            );
            // 과거 기록은 액션을 실행하지 않고 메시지 목록만 설정합니다.
            setMessages(historyMessages);
          } else {
            // payload가 예상치 못한 형식일 경우를 대비한 로그
            console.warn('Unhandled JOINED payload format:', parsedPayload);
          }
        } catch (e) {
          console.error('Failed to parse JOINED payload:', payload, e);
        }
      }
    );

    socket.on(ChatEvent.LEFT, (payload: { data: string }) => {
      // payload: { data: string }
      console.log('[Event] LEFT 수신:', payload);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `system-left-${Date.now()}-${Math.random()}`, // 시스템 메시지 고유 ID
          username: 'System',
          message: `${payload.data}님이 채팅방을 나갔습니다.`,
          createdAt: new Date().toISOString(),
          userId: undefined, // 시스템 메시지는 userId가 없을 수 있음
          role: 'system',
        },
      ]);
    });

    socket.on(ChatEvent.MESSAGE, (payload: IncomingChatMessagePayload) => {
      // payload: IncomingChatMessagePayload
      console.log(`processIncomingMessage 실행!`);
      console.log(`payload`, payload);
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
  }, [workspaceId, user, isAuthLoading]); // [수정] 의존성 배열에서 executeFrontendAction 제거

  const sendMessage = useCallback(
    (message: string) => {
      if (socketRef.current && isConnected && message.trim() && userId) {
        // userId가 있는지 확인
        const tempMessageId = `client-${Date.now()}-${Math.random()}`; // 낙관적 업데이트를 위한 임시 ID

        // 1. 사용자 메시지를 즉시 UI에 추가 (낙관적 업데이트)
        const userMessage: ChatMessage = {
          id: tempMessageId,
          username,
          message,
          createdAt: new Date().toISOString(),
          userId,
          role: 'user',
        };
        setMessages((prev) => [...prev, userMessage]);

        // 2. '@AI'로 시작하는 경우, AI 응답 대기 메시지를 추가
        if (message.startsWith('@AI')) {
          const aiLoadingMessage: ChatMessage = {
            id: `ai-loading-${Date.now()}`,
            username: 'AI',
            message: 'AI가 응답을 생성하고 있습니다...',
            createdAt: new Date().toISOString(),
            role: 'ai',
            isLoading: true, // 로딩 상태임을 표시
          };
          setMessages((prev) => [...prev, aiLoadingMessage]);
        }

        // 3. 서버로 메시지 전송
        const messagePayload: CreateMessageReqDto = {
          workspaceId,
          username,
          userId, // userId 추가
          message,
          tempId: tempMessageId, // [추가] 임시 ID를 payload에 포함
        };

        console.log('[Client] Sending MESSAGE event:', messagePayload);
        socketRef.current.emit(ChatEvent.MESSAGE, messagePayload);
      } else {
        console.warn('[Client] sendMessage condition not met:', {
          socketConnected: !!socketRef.current,
          isConnected,
          messageTrimmed: message.trim(),
          messageContent: message,
          userIdPresent: !!userId, // userId 존재 여부도 로그에 추가
        });
      }
    },
    [workspaceId, username, isConnected, userId] // 의존성 배열에 userId 추가
  );

  return { messages, sendMessage, isConnected };
}
