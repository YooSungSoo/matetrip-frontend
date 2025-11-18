import {
  ArrowLeft,
  MoreVertical,
  Calendar,
  CheckCircle,
  DoorOpen,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { TripReviewModal } from './TripReviewModal';
import { useAuthStore } from '../store/authStore';

interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface PlanRoomHeaderProps {
  workspaceId: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  currentMembers: number;
  maxMembers: number;
  onExit: () => void;
  onBack: () => void;
  isOwner?: boolean;
  activeMembers?: Member[];
  onExportPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function PlanRoomHeader({
  workspaceId,
  title,
  startDate,
  endDate,
  totalDays,
  onExit,
  onBack,
  isOwner = false,
  activeMembers = [],
  onExportPdf,
  isGeneratingPdf = false,
}: PlanRoomHeaderProps) {
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const { user } = useAuthStore();

  // 리뷰 대상에서 자기 자신을 제외합니다.
  const membersToReview = activeMembers.filter(
    (member) => member.id !== user?.userId
  );

  return (
    <div className="border-b border-gray-700 bg-gray-900 px-6 py-3 flex items-center justify-between flex-shrink-0 h-18 text-white relative">
      {/* 왼쪽 영역: 뒤로가기 버튼, 제목 */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-white text-2xl font-bold truncate">{title}</h1>
      </div>

      {/* 중앙 영역: 날짜 정보와 참여인원 */}
      <div className="flex-grow flex justify-center items-center gap-2 text-gray-400 px-4">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>
          {startDate} ~ {endDate} ({totalDays}일)
        </span>
      </div>

      {/* 오른쪽 영역: 접속 중인 멤버 아바타 + 메뉴 버튼 */}
      <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
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

        {/* 메뉴 버튼 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-10 h-10">
              <MoreVertical className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white text-gray-900"
          >
            <DropdownMenuItem
              onClick={onExportPdf}
              disabled={isGeneratingPdf}
              className="border-b border-gray-100 hover:bg-gray-100 focus:bg-gray-100 py-3 px-4 text-base"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  <span>PDF 생성 중...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-6 h-6 mr-3" />
                  <span>PDF로 내보내기</span>
                </>
              )}
            </DropdownMenuItem>

            {isOwner && (
              <DropdownMenuItem
                onClick={() => setReviewModalOpen(true)}
                className="border-b border-gray-100 hover:bg-gray-100 focus:bg-gray-100 py-3 px-4 text-base"
              >
                <CheckCircle className="w-6 h-6 mr-3" />
                <span>여행 완료하기</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onExit}
              className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 py-3 px-4 text-base"
            >
              <DoorOpen className="w-6 h-6 mr-3" />
              <span>이 여행에서 나가기</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 여행 완료 모달 */}
      <TripReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        workspaceId={workspaceId}
        membersToReview={membersToReview}
        onComplete={onBack}
      />
    </div>
  );
}
