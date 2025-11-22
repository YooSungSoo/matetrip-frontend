import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Send, Phone, Video, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import type { Poi } from '../hooks/usePoiSocket';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { VideoChat } from './VideoChat';
import { type ChatMessage } from '../hooks/useChatSocket';
import type { AiPlace } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { RecommendedPlaceCard } from './RecommendedPlaceCard';
import { cn } from './ui/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
// API_BASE_URL은 이제 authStore에서 avatar를 생성하므로 ChatPanel에서는 필요 없습니다.
// import { API_BASE_URL } from '../api/client'; 

interface Member {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  profileId?: string;
  userId?: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  workspaceId: string;
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  setChatAiPlaces: (places: AiPlace[]) => void;
  chatAiPlaces: AiPlace[];
  activeMembers?: Member[];
}

export const ChatPanel = memo(function ChatPanel({
  messages,
  sendMessage,
  isChatConnected,
  workspaceId,
  onAddPoiToItinerary,
  onCardClick,
  activeMembers = [],
}: ChatPanelProps) {
  const [isVCCallActive, setIsVCCallActive] = useState(false);
  const [hasVCCallBeenInitiated, setHasVCCallBeenInitiated] = useState(false);
  const [isVCPanelExpanded, setIsVCPanelExpanded] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const currentUserId = user?.userId;
  const [isAiCardCollapsed, setIsAiCardCollapsed] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (currentMessage.trim() && isChatConnected) {
      sendMessage(currentMessage);
      setCurrentMessage('');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();

    const isSameDay =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    if (isSameDay) {
      return messageDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return messageDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }) + ' ' + messageDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleToggleVideoCall = useCallback(() => {
    if (!hasVCCallBeenInitiated) {
      setHasVCCallBeenInitiated(true);
      setIsVCCallActive(true);
    } else {
      setIsVCCallActive((prev) => !prev);
    }
  }, [hasVCCallBeenInitiated]);

  const handleCloseVideoCall = useCallback(() => {
    setIsVCCallActive(false);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
        <h3 className="font-semibold">채팅</h3>
        <div className="flex items-center gap-3">
          {/* 접속 중인 멤버 아바타 */}
          {activeMembers.length > 0 && (
            <div className="flex items-center">
              {activeMembers.map((member, index) => (
                <Avatar
                  key={member.id}
                  className="w-8 h-8 border-2 border-white"
                  style={{
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: activeMembers.length - index,
                  }}
                >
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          <Badge
            variant={isChatConnected ? 'outline' : 'destructive'}
            className="text-white text-sm flex items-center gap-2"
          >
            {isChatConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>연결됨</span>
              </>
            ) : (
              '연결 끊김'
            )}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant={isVCCallActive ? 'secondary' : 'ghost'}
              className="w-9 h-9 text-white hover:bg-blue-800"
              onClick={handleToggleVideoCall}
            >
              <Video className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {hasVCCallBeenInitiated && (
        <div
          className={cn(
            'bg-gray-50 border-b transition-all duration-300',
            !isVCCallActive && 'invisible h-0 p-0 border-none'
          )}
        >
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold">화상 통화</h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-gray-600 hover:bg-gray-200"
                onClick={() => setIsVCPanelExpanded(!isVCPanelExpanded)}
              >
                {isVCPanelExpanded ? '접기' : '펼치기'}
                {isVCPanelExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div
              className={cn(
                'transition-[height]',
                !isVCPanelExpanded && 'h-0 overflow-hidden'
              )}
            >
              <VideoChat
                workspaceId={workspaceId}
                onClose={handleCloseVideoCall}
                activeMembers={activeMembers}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {messages.map((msg, index) => {
          const isMe = currentUserId != null && msg.userId === currentUserId;
          const isSystem = msg.username === 'System';
          const isAiRecommendation =
            msg.role === 'ai' &&
            msg.recommendedPlaces &&
            msg.recommendedPlaces.length > 0;

          // Declare sender at the top of the scope
          let sender: Member | null = null;
          if (!isMe && !isSystem) {
            sender = activeMembers.find((m) => m.id === msg.userId) || null;
          }

          // Determine avatar source and whether to show it
          let avatarSrc = '';
          let avatarAlt = '';
          let showAvatar = false;

          // [수정] user.avatar 사용
          if (isMe && user?.avatar) { 
            avatarSrc = user.avatar;
            avatarAlt = user.profile?.nickname || ''; // user.profile.nickname 사용
            showAvatar = true;
          } else if (sender?.avatar) {
            avatarSrc = sender.avatar;
            avatarAlt = sender.name || '';
            showAvatar = true;
          }

          // Only render Avatar if showAvatar is true AND avatarSrc is not empty
          const shouldRenderAvatar = showAvatar && avatarSrc !== '';

          return (
            <div
              key={msg.id || index}
              // 모든 메시지를 왼쪽으로 정렬
              className={`flex gap-3 justify-start`}
            >
              {shouldRenderAvatar && (
                <img 
                  src={avatarSrc} 
                  alt={avatarAlt} 
                  className="w-10 h-10 self-start rounded-full object-cover border border-gray-300" // 크기 w-10 h-10으로 변경
                />
              )}
              {/* 중복 렌더링을 유발하던 Avatar 컴포넌트 블록 제거 */}
              <div
                className={cn(
                  'flex flex-col',
                  // 모든 메시지 내부 콘텐츠를 왼쪽으로 정렬
                  'items-start',
                  !isAiRecommendation && 'max-w-[70%]'
                )}
              >
                {/* 모든 메시지 (사용자, AI, 시스템): 닉네임 | 날짜 시간 */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-base font-semibold text-gray-800">
                    {msg.username}
                  </span>
                  <span className="text-sm text-gray-500">|</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(msg.createdAt)}
                  </span>
                </div>

                {/* 메시지 버블 */}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2',
                    isAiRecommendation
                      ? 'w-full bg-transparent p-0' // AI 추천 메시지
                      : isSystem
                        ? 'bg-gray-100 text-gray-700 italic' // 시스템 메시지
                        : 'bg-gray-100 text-gray-900' // 모든 사용자 메시지 (나 포함)
                  )}
                >
                  <p className="text-sm" style={{ wordBreak: 'break-word' }}>
                    {msg.message}
                  </p>
                  {isAiRecommendation && (
                    <div className="mt-2">
                      {!isAiCardCollapsed && (
                        <div className="grid grid-cols-1 gap-2">
                          {msg.recommendedPlaces?.map(
                            (place, placeIndex) => (
                              <RecommendedPlaceCard
                                key={placeIndex}
                                place={place}
                                onAddPoiToItinerary={onAddPoiToItinerary}
                                onCardClick={onCardClick}
                              />
                            )
                          )}
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setIsAiCardCollapsed((prev) => !prev)
                          }
                        >
                          {isAiCardCollapsed ? '펼치기' : '접기'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder={
              isChatConnected
                ? '메시지를 입력하세요...'
                : '채팅 서버에 연결 중...'
            }
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={!isChatConnected}
          />
          <Button
            onClick={handleSend}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={!isChatConnected || !currentMessage.trim()}
          >
            <Send className="w-4 h-4" />
            전송
          </Button>
        </div>
      </div>
    </div>
  );
});
