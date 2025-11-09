import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  X,
  Map as MapIcon,
  MessageCircle,
  Search,
  Calendar,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MapPanel, type DayLayer } from './MapPanel';
import type { PlanDayDto } from '../types/workspace';
import { ChatPanel } from './ChatPanel';
import { PlanPanel } from './PlanPanel';
import { type Poi, usePoiSocket } from '../hooks/usePoiSocket.ts';

interface WorkspaceProps {
  workspaceId: string;
  workspaceName: string;
  planDayDtos: PlanDayDto[];
  onEndTrip: () => void;
}

const MOCK_MEMBERS = [
  { id: 1, name: '여행러버', isAuthor: true },
  { id: 2, name: '바다조아', isAuthor: false },
  { id: 3, name: '제주사랑', isAuthor: false },
];

/**
 * 주어진 문자열(예: day.id)을 기반으로 일관된 색상을 생성합니다.
 * @param str - 색상을 생성할 기반이 되는 문자열
 * @returns 16진수 색상 코드 (e.g., '#RRGGBB')
 */
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // 간단한 해시 함수(djb2)를 사용하여 문자열을 숫자로 변환합니다.
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    // 해시 값을 사용하여 RGB 각 채널의 색상 값을 생성합니다.
    const value = (hash >> (i * 8)) & 0xff;
    // 값을 128-255 범위로 조정하여 너무 어두운 색상을 방지합니다.
    const brightValue = Math.floor(value / 2) + 128;
    // 값을 16진수로 변환하고, 한 자리 수일 경우 앞에 '0'을 붙여 두 자리로 만듭니다.
    color += brightValue.toString(16).padStart(2, '0');
  }
  return color.toUpperCase();
};

export function Workspace({
  workspaceId,
  workspaceName,
  planDayDtos,
  onEndTrip,
}: WorkspaceProps) {
  const [showMembers, setShowMembers] = useState(false);

  // MapPanel과 PlanPanel이 공유할 일정 상태를 Workspace 컴포넌트로 이동
  const [itinerary, setItinerary] = useState<Record<string, Poi[]>>({});

  // 소켓은 최상위 컴포넌트에서 한 번만 연결하고,
  // 모든 반환값을 하위 컴포넌트에 props로 전달합니다.
  const { pois, connections, isSyncing, markPoi, unmarkPoi, connectPoi } =
    usePoiSocket(workspaceId);

  // planDayDtos가 변경될 때마다 dayLayers를 다시 계산합니다.
  // useMemo를 사용하여 planDayDtos가 실제로 변경되었을 때만 map 함수가 실행되도록 최적화합니다.
  const dayLayers = useMemo(
    () =>
      planDayDtos.map((day) => ({
        id: day.id,
        label: day.planDate,
        color: generateColorFromString(day.id),
      })),
    [planDayDtos]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-gray-900">{workspaceName}</h2>
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
              <MapPanel
                itinerary={itinerary}
                setItinerary={setItinerary}
                dayLayers={dayLayers}
                pois={pois}
                connections={connections}
                isSyncing={isSyncing}
                markPoi={markPoi}
                unmarkPoi={unmarkPoi}
                connectPoi={connectPoi}
              />
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
              <PlanPanel
                itinerary={itinerary}
                dayLayers={dayLayers}
                unmarkPoi={unmarkPoi}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
