import { useState } from 'react';
import { MapPanel } from './MapPanel';
import { PlanPanel } from './PlanPanel';
import { ChatPanel } from './ChatPanel';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';

interface WorkspaceProps {
  postId: number | null;
}

const MOCK_PARTICIPANTS = [
  { id: 1, name: '여행러버', online: true },
  { id: 2, name: '산악인', online: true },
  { id: 3, name: '바다조아', online: false },
];

export function Workspace({ postId }: WorkspaceProps) {
  const [showPlanPanel, setShowPlanPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);

  if (!postId) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 mb-2">워크스페이스를 선택해주세요</h3>
          <p className="text-gray-600">참여 중인 여행을 선택하면 워크스페이스가 열립니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Left Panel - Plan */}
      <div className={`transition-all duration-300 ${showPlanPanel ? 'w-80' : 'w-0'} flex-shrink-0`}>
        {showPlanPanel && <PlanPanel />}
      </div>

      {/* Toggle Left Panel */}
      <Button
        variant="outline"
        size="sm"
        className="absolute left-0 top-20 z-10 rounded-l-none shadow-md"
        onClick={() => setShowPlanPanel(!showPlanPanel)}
      >
        {showPlanPanel ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {/* Center Panel - Map */}
      <div className="flex-1 relative">
        {/* Participants Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-600" />
          <div className="flex -space-x-2">
            {MOCK_PARTICIPANTS.map((participant) => (
              <div key={participant.id} className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white" />
                {participant.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                )}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-600">{MOCK_PARTICIPANTS.filter(p => p.online).length}명 참여중</span>
        </div>

        <MapPanel />
      </div>

      {/* Toggle Right Panel */}
      <Button
        variant="outline"
        size="sm"
        className="absolute right-0 top-20 z-10 rounded-r-none shadow-md"
        onClick={() => setShowChatPanel(!showChatPanel)}
      >
        {showChatPanel ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Right Panel - Chat */}
      <div className={`transition-all duration-300 ${showChatPanel ? 'w-96' : 'w-0'} flex-shrink-0`}>
        {showChatPanel && <ChatPanel />}
      </div>
    </div>
  );
}
