import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Send,
  Video,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  MapPin,
  Bot,
  FileText, // 상세보기 아이콘
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/button';
import type { Poi } from '../hooks/usePoiSocket';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { VideoChat } from './VideoChat';
import { type ChatMessage } from '../hooks/useChatSocket';
import type { AiPlace } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { cn } from './ui/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { CategoryIcon } from './CategoryIcon';

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
  onShowDetails: (placeId: string) => void; // 상세보기 핸들러 추가
  setChatAiPlaces: (places: AiPlace[]) => void;
  chatAiPlaces: AiPlace[];
  activeMembers?: Member[];
}

function ChatRecommendedPlaceCard({
  place,
  onAddPoiToItinerary,
  onCardClick,
  onShowDetails, // 상세보기 핸들러 추가
  workspaceId,
  currentUserId,
}: {
  place: AiPlace;
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  onShowDetails: (placeId: string) => void; // 상세보기 핸들러 추가
  workspaceId: string;
  currentUserId: string | undefined;
}) {
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const poi: Poi = {
      id: place.id,
      placeId: place.id,
      placeName: place.title,
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      categoryName: place.category,
      status: 'RECOMMENDED',
      sequence: 0,
      workspaceId,
      createdBy: currentUserId || '',
      isPersisted: false,
    };
    onAddPoiToItinerary(poi);
  };

  const handleShowDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetails(place.id);
  };

  return (
    <div
      className="flex items-center gap-5 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors w-full"
      onClick={() => onCardClick(place)}
    >
      <img
        src={place.imageUrl || 'https://via.placeholder.com/150'}
        alt={place.title}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xl truncate text-gray-800 mb-1.5">
          {place.title}
        </p>
        <div className="flex items-center gap-2 text-base text-gray-500">
          <CategoryIcon category={place.category} className="w-6 h-6" />
          <span className="truncate">{place.category}</span>
        </div>
        <div className="flex items-center gap-2 text-base text-gray-500 mt-1.5">
          <MapPin className="w-6 h-6 flex-shrink-0" />
          <p className="truncate">{place.address}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="w-14 h-14"
          onClick={handleShowDetailsClick}
          aria-label="상세보기"
        >
          <FileText className="size-8 text-gray-600" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="w-14 h-14"
          onClick={handleAddClick}
          aria-label="일정에 추가"
        >
          <PlusCircle className="size-8 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function AiLoadingIndicator() {
  return (
    <>
      <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 px-4 py-2 text-gray-600">
        <span className="dot-animation dot-1 text-base">.</span>
        <span className="dot-animation dot-2 text-base">.</span>
        <span className="dot-animation dot-3 text-base">.</span>
      </div>
    </>
  );
}

const ChatMessageItem = memo(function ChatMessageItem({
  msg,
  currentUserId,
  activeMembers,
  onAddPoiToItinerary,
  onCardClick,
  onShowDetails, // 상세보기 핸들러 추가
  workspaceId,
}: {
  msg: ChatMessage;
  currentUserId: string | undefined;
  activeMembers: Member[];
  onAddPoiToItinerary: (poi: Poi) => void;
  onCardClick: (poi: Pick<Poi, 'latitude' | 'longitude'>) => void;
  onShowDetails: (placeId: string) => void; // 상세보기 핸들러 추가
  workspaceId: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();

  const isAi = msg.role === 'ai';
  const isMe = currentUserId != null && msg.userId === currentUserId;
  const isSystem = msg.username === 'System';
  const isAiRecommendation =
    isAi && msg.recommendedPlaces && msg.recommendedPlaces.length > 0;

  let sender: Member | null = null;
  if (!isMe && !isSystem) {
    sender = activeMembers.find((m) => m.id === msg.userId) || null;
  }

  let avatarSrc = '';
  let avatarAlt = '';
  let showAvatar = false;

  if (isAi) {
    avatarSrc = '/ai-avatar.png';
    avatarAlt = 'AI';
    showAvatar = true;
  } else if (isMe && user?.avatar) {
    avatarSrc = user.avatar;
    avatarAlt = user.profile?.nickname || '';
    showAvatar = true;
  } else if (sender?.avatar) {
    avatarSrc = sender.avatar;
    avatarAlt = sender.name || '';
    showAvatar = true;
  }

  const shouldRenderAvatar = showAvatar && avatarSrc !== '';

  const formatTimestamp = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const isSameDay =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();
    return isSameDay
      ? messageDate.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : `${messageDate.toLocaleDateString('ko-KR')} ${messageDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderMessageContent = () => {
    if (msg.role === 'user' && msg.message.startsWith('@AI')) {
      const aiPrefix = '@AI';
      const restOfMessage = msg.message.substring(aiPrefix.length);
      return (
        <p className="text-2xl" style={{ wordBreak: 'break-word' }}>
          <span className="text-primary font-bold">{aiPrefix}</span>
          {restOfMessage}
        </p>
      );
    }

    if (msg.role === 'ai') {
      return (
        <div className="prose prose-lg max-w-none text-gray-900">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-4xl font-bold mt-6 mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-3xl font-bold mt-5 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-2xl font-bold mt-4 mb-2">{children}</h3>,
              p: ({ children }) => <p className="text-lg leading-relaxed mb-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-2">{children}</ol>,
              li: ({ children }) => <li className="text-lg">{children}</li>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => <code className="bg-gray-200 px-2 py-1 rounded text-base font-mono">{children}</code>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-4 border-gray-300" />,
            }}
          >
            {msg.message}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <p className="text-2xl" style={{ wordBreak: 'break-word' }}>
        {msg.message}
      </p>
    );
  };

  return (
    <div className="flex gap-3 items-start">
      <div className="w-10 h-10 flex-shrink-0">
        {isAi ? (
          <Avatar className="w-10 h-10 border border-primary/20 bg-primary/10 text-primary">
            <div className="flex h-full w-full items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
          </Avatar>
        ) : shouldRenderAvatar ? (
          <Avatar className="w-10 h-10 border border-gray-300">
            <AvatarImage src={avatarSrc} alt={avatarAlt} />
            <AvatarFallback>{avatarAlt.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : null}
      </div>
      <div
        className={cn(
          'flex flex-col items-start',
          isAiRecommendation ? 'w-full' : 'max-w-[85%]'
        )}
      >
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-semibold text-gray-800">
            {msg.username}
          </span>
          <span className="text-xl text-gray-500">|</span>
          <span className="text-lg text-gray-500">
            {formatTimestamp(msg.createdAt)}
          </span>
        </div>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isSystem
              ? 'bg-gray-100 text-gray-700 italic'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          {msg.isLoading ? <AiLoadingIndicator /> : renderMessageContent()}
        </div>
        {isAiRecommendation && (
          <div className="w-full border border-primary rounded-lg bg-primary-10 overflow-hidden mt-2">
            <div className="p-3 border-b border-gray-200">
              <span className="font-semibold text-xl text-gray-800">
                추천 장소 ({msg.recommendedPlaces?.length || 0}개)
              </span>
            </div>
            <div
              className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[480px] overflow-y-auto'}`}
            >
              <div className="p-3 grid grid-cols-1 gap-2">
                {msg.recommendedPlaces?.map((place, placeIndex) => (
                  <ChatRecommendedPlaceCard
                    key={placeIndex}
                    place={place}
                    onAddPoiToItinerary={onAddPoiToItinerary}
                    onCardClick={onCardClick}
                    onShowDetails={onShowDetails} // 상세보기 핸들러 전달
                    workspaceId={workspaceId}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full rounded-t-none text-sm text-gray-600 hover:bg-primary/20"
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronUp className="w-4 h-4 mr-2" />
              )}
              {isCollapsed ? '펼치기' : '접기'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export const ChatPanel = memo(function ChatPanel({
  messages,
  sendMessage,
  isChatConnected,
  workspaceId,
  onAddPoiToItinerary,
  onCardClick,
  onShowDetails, // 상세보기 핸들러 받기
  activeMembers = [],
}: ChatPanelProps) {
  const [isVCCallActive, setIsVCCallActive] = useState(false);
  const [hasVCCallBeenInitiated, setHasVCCallBeenInitiated] = useState(false);
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
      <div className=" px-4 py-2 flex items-center justify-between flex-shrink-0 h-24 text-primary relative backdrop-blur-sm">
        <h1 className="text-3xl font-bold truncate">채팅</h1>
        <div className="flex items-center gap-5">
          {activeMembers.length > 0 && (
            <div className="flex items-center">
              {activeMembers.map((member, index) => (
                <Avatar
                  key={member.id}
                  className="w-12 h-12 border-[3px] border-primary"
                  style={{
                    marginLeft: index > 0 ? '-12px' : '0',
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
            variant="outline"
            className="text-primary text-xl flex items-center gap-3 border-primary bg-transparent"
          >
            {isChatConnected ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span>연결됨</span>
              </>
            ) : (
              '연결 중...'
            )}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="xl-icon"
              variant={isVCCallActive ? 'secondary' : 'ghost'}
              className="hover:bg-primary-foreground/10"
              onClick={handleToggleVideoCall}
            >
              <Video className="size-7 text-primary" />
            </Button>
          </div>
        </div>
      </div>

      {isVCCallActive && (
        <div className={cn('bg-gray-50 border-b transition-all duration-300')}>
          <div className="p-3">
            <VideoChat
              workspaceId={workspaceId}
              onClose={handleCloseVideoCall}
              activeMembers={activeMembers}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {messages.map((msg, index) => {
          return (
            <ChatMessageItem
              key={msg.id || index}
              msg={msg}
              currentUserId={currentUserId}
              activeMembers={activeMembers}
              onAddPoiToItinerary={onAddPoiToItinerary}
              onCardClick={onCardClick}
              onShowDetails={onShowDetails} // 상세보기 핸들러 전달
              workspaceId={workspaceId}
            />
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
            size="icon"
            disabled={!isChatConnected || !currentMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
