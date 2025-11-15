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
    <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 flex items-center justify-between flex-shrink-0 h-18">
      {/* 왼쪽 영역: 뒤로가기 버튼, 제목 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/60 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-gray-900 text-xl">{title}</h1>
      </div>

      {/* 중앙 영역: 날짜 정보와 참여인원 */}
      <div className="flex items-center gap-3 text-gray-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>
            {startDate} ~ {endDate} ({totalDays}일)
          </span>
        </div>
        {/* // TODO: 나중에 추가 */}
        {/* <span className="text-gray-400">|</span> */}
        {/* <div className="flex items-center gap-2"> */}
        {/*   <Users className="w-4 h-4 text-purple-600" /> */}
        {/*   <span>{currentMembers}/{maxMembers}명</span> */}
        {/* </div> */}
      </div>

      {/* 오른쪽 영역: 접속 중인 멤버 아바타 + 메뉴 버튼 */}
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

        {/* 메뉴 버튼 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onExportPdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>PDF 생성 중...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 mr-2" />
                  <span>PDF로 내보내기</span>
                </>
              )}
            </DropdownMenuItem>

            {isOwner && (
              <DropdownMenuItem onClick={() => setReviewModalOpen(true)}>
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>여행 완료하기</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onExit} className="text-red-600">
              <DoorOpen className="w-5 h-5 mr-2" />
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
