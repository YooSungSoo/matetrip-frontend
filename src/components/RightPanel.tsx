import { memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MessageCircle } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { type ChatMessage } from '../hooks/useChatSocket';
import { type usePoiSocket } from '../hooks/usePoiSocket';

interface RightPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatConnected: boolean;
  workspaceId: string;
  onAddPoiToItinerary: (poi: any) => void;
  onCardClick: (poi: any) => void;
}

export const RightPanel = memo(function RightPanel({
  isOpen,
  messages,
  sendMessage,
  isChatConnected,
  workspaceId,
  onAddPoiToItinerary,
  onCardClick,
}: RightPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
        <TabsList className="w-full justify-around rounded-none bg-gray-50 border-b">
          <TabsTrigger value="chat" className="flex-1 gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>채팅 with AI Agent</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 overflow-auto m-0">
          <ChatPanel
            messages={messages}
            sendMessage={sendMessage}
            isChatConnected={isChatConnected}
            workspaceId={workspaceId}
            onAddPoiToItinerary={onAddPoiToItinerary}
            onCardClick={onCardClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});
