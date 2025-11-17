import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Send, Phone, Video, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { VideoChat } from './VideoChat';
import { type ChatMessage } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { RecommendedPlaceCard } from './RecommendedPlaceCard'; // [신규] 추천 장소 카드 컴포넌트
import { cn } from './ui/utils';

interface ChatPanelProps {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  workspaceId: string;
  onAddPoiToItinerary: (poi: any) => void;
  onCardClick: (poi: any) => void;
}

export const ChatPanel = memo(function ChatPanel({
  messages,
  sendMessage,
  isChatConnected,
  workspaceId,
  onAddPoiToItinerary,
  onCardClick,
}: ChatPanelProps) {
  const [isVCCallActive, setIsVCCallActive] = useState(false);
  const [hasVCCallBeenInitiated, setHasVCCallBeenInitiated] = useState(false);
  const [isVCPanelExpanded, setIsVCPanelExpanded] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const currentUserId = user?.userId;

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
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleToggleVideoCall = useCallback(() => {
    if (!hasVCCallBeenInitiated) {
      setHasVCCallBeenInitiated(true);
    }
    setIsVCCallActive((prev) => !prev);
  }, [hasVCCallBeenInitiated]);

  const handleCloseVideoCall = useCallback(() => {
    setIsVCCallActive(false);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b p-3 flex items-center justify-between">
        <h3 className="text-gray-900 font-semibold">채팅</h3>
        <div className="flex items-center gap-3">
          <Badge variant={isChatConnected ? 'default' : 'destructive'}>
            {isChatConnected ? '연결됨' : '연결 끊김'}
          </Badge>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="w-8 h-8" disabled>
              <Phone className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              size="icon"
              variant={isVCCallActive ? 'secondary' : 'ghost'}
              className="w-8 h-8"
              onClick={handleToggleVideoCall}
            >
              <Video className="w-4 h-4 text-gray-600" />
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
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMe = currentUserId != null && msg.userId === currentUserId;
          const isSystem = msg.username === 'System';
          // [추가] AI 추천 메시지인지 확인
          const isAiRecommendation =
            msg.role === 'ai' &&
            msg.recommendedPlaces &&
            msg.recommendedPlaces.length > 0;

          return (
            <div
              key={msg.id || index} // [개선] key로 고유 ID 사용
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={cn(
                  !isAiRecommendation && 'max-w-[70%]', // [수정] AI 추천이 아닐 때만 너비 제한
                  isMe ? 'order-2' : ''
                )}
              >
                {!isMe && !isSystem && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600">
                      {msg.username}
                    </span>
                  </div>
                )}
                <div
                  className={cn( // [수정] className 문법 오류 수정
                    'rounded-lg px-4 py-2',
                    isAiRecommendation && 'w-full bg-transparent p-0',
                    isMe
                      ? 'bg-blue-600 text-white'
                      : isSystem
                      ? 'bg-gray-100 text-gray-700 italic'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  {!isAiRecommendation && <p className="text-sm">{msg.message}</p>}
                  {/* [신규] AI 추천 장소가 있을 경우 렌더링 */}
                  {isAiRecommendation && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-900 bg-gray-100 rounded-lg px-4 py-2">{msg.message}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.recommendedPlaces?.map((place, placeIndex) => (
                          <RecommendedPlaceCard
                            key={placeIndex}
                            place={place}
                            onAddPoiToItinerary={onAddPoiToItinerary}
                            onCardClick={onCardClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs text-gray-500 mt-1 block ${
                    isMe ? 'text-right' : 'text-left'
                  }`}
                >
                  {formatTimestamp(msg.timestamp)}
                </span>
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
