import { useState } from 'react';
import {
  Users,
  X,
  Map as MapIcon,
  MessageCircle,
  Search,
  Calendar,
} from 'lucide-react';
import { Button } from './ui/button';
import { DayLayer } from '@/hooks/usePoiSocket';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MapPanel } from './MapPanel';
import { ChatPanel } from './ChatPanel';
import { PlanPanel } from './PlanPanel';

interface WorkspaceProps {
  postId: string;
  onEndTrip: () => void;
}

const MOCK_MEMBERS = [
  { id: 1, name: '여행러버', isAuthor: true },
  { id: 2, name: '바다조아', isAuthor: false },
  { id: 3, name: '제주사랑', isAuthor: false },
];

export function Workspace({ postId, onEndTrip }: WorkspaceProps) {
  const [showMembers, setShowMembers] = useState(false);
  // DayLayers 상태를 최상위 공통 부모인 Workspace 컴포넌트에서 관리합니다.
  const [dayLayers, setDayLayers] = useState<DayLayer[]>(() => {
    // 여행 일수만큼 UUID를 생성하여 초기 레이어를 설정합니다.
    // 이 로직은 Workspace가 렌더링될 때 한 번만 실행됩니다.
    // !! 중요: 모든 사용자가 동일한 ID를 공유해야 하므로, 시뮬레이션 단계에서는 UUID 대신 고정된 문자열 ID를 사용합니다.
    const initialDays = 2;
    return Array.from({ length: initialDays }, (_, i) => ({
      id: `day-${i + 1}`, // 예: 'day-1', 'day-2'
      label: `Day ${i + 1}`,
      color: i % 2 === 0 ? '#FF5733' : '#3357FF',
    }));
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-gray-900">제주도 힐링 여행</h2>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">{MOCK_MEMBERS.length}명</span>
          </button>
        </div>

        <Button variant="destructive" size="sm" onClick={onEndTrip}>
          여행 종료하기
        </Button>
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="absolute top-16 left-4 z-10 bg-white rounded-lg shadow-lg border p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">참여 인원</h3>
            <button onClick={() => setShowMembers(false)}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="space-y-2">
            {MOCK_MEMBERS.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{member.name}</div>
                </div>
                {member.isAuthor && (
                  <Badge variant="secondary" className="text-xs">
                    방장
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="map" className="h-full flex flex-col">
          <TabsList className="bg-white border-b rounded-none w-full justify-start px-4">
            <TabsTrigger value="map" className="gap-2">
              <MapIcon className="w-4 h-4" />
              지도
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              채팅
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              검색
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <Calendar className="w-4 h-4" />
              일정
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="map" className="h-full m-0">
              <MapPanel workspaceId={postId} dayLayers={dayLayers} />
            </TabsContent>

            <TabsContent value="chat" className="h-full m-0">
              <ChatPanel />
            </TabsContent>

            <TabsContent value="search" className="h-full m-0 p-4">
              <div className="h-full flex items-center justify-center text-gray-500">
                검색 기능 (개발 예정)
              </div>
            </TabsContent>

            <TabsContent value="plan" className="h-full m-0">
              <PlanPanel dayLayers={dayLayers} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
