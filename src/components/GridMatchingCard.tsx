import { useEffect, useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, User } from 'lucide-react';
import type { MatchingInfo } from '../types/matching';
import { API_BASE_URL } from '../api/client';
import type { MatchRecruitingPostDto } from '../types/matchSearch';
import type { Post } from '../types/post';

interface GridMatchingCardProps {
  /** 추천 카드에 표시할 모집글 정보 (Post 또는 MatchRecruitingPostDto) */
  post: Post | MatchRecruitingPostDto;
  /** 이 카드에만 필요한 매칭 정보 */
  matchingInfo: MatchingInfo;
  /** 카드 클릭 이벤트 핸들러 */
  onClick?: () => void;
  /** 추천 순위 (1부터 시작) */
  rank?: number;
}

const defaultCoverImage = 'https://via.placeholder.com/400x300';

/**
 * 그리드용 평면 매칭 카드 컴포넌트 (Figma 디자인 기반)
 * - 3D 구조 없음
 * - 이미지, 제목, 장소, 기간, 매칭률 표시
 */
export function GridMatchingCard({
  post,
  matchingInfo,
  onClick,
  rank,
}: GridMatchingCardProps) {
  const { title, location, startDate, endDate } = post;
  const { score } = matchingInfo;
  
  const safeScore =
    typeof score === 'number' && !Number.isNaN(score)
      ? Math.min(100, Math.max(0, score))
      : 0;

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const renderDateText = () => {
    if (!startDate || !endDate) {
      return '일정 미정';
    }
    return `${startDate} ~ ${endDate}`;
  };

  // 게시글 이미지 로드
  useEffect(() => {
    let cancelled = false;

    const fetchCoverImage = async () => {
      if (!post.imageId) {
        setCoverImageUrl(null);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/binary-content/${post.imageId}/presigned-url`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('게시글 이미지를 불러오지 못했습니다.');
        }

        const payload = await response.json();
        const { url } = payload;
        if (!cancelled) {
          setCoverImageUrl(url);
        }
      } catch (error) {
        console.error('GridMatchingCard cover image load failed:', error);
        if (!cancelled) {
          setCoverImageUrl(null);
        }
      }
    };

    fetchCoverImage();

    return () => {
      cancelled = true;
    };
  }, [post.imageId]);

  return (
    <div
      className="flex flex-col gap-3 w-full cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      {/* 이미지 영역 */}
      <div className="relative h-[290px] bg-gray-300 rounded-[16px] overflow-hidden w-full">
        <ImageWithFallback
          src={coverImageUrl ?? defaultCoverImage}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {/* Best 배지 (rank === 1일 때만) */}
        {rank === 1 && (
          <div className="absolute top-2 right-2 bg-[#101828] px-3 py-1 rounded-[8px]">
            <p className="text-white text-[16px] font-medium">Best</p>
          </div>
        )}
        
        {/* 2nd, 3rd, 4th... 배지 */}
        {rank && rank > 1 && rank <= 9 && (
          <div className="absolute top-2 right-2 bg-[#101828] px-3 py-1 rounded-[8px]">
            <p className="text-white text-[16px] font-medium">
              {rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
            </p>
          </div>
        )}

        {/* 하단 오버레이: 프로필 아이콘 + 매칭률 */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-[14px]">
          {/* 프로필 아이콘 (64px 원형) */}
          <div className="w-16 h-16 bg-white rounded-full border-4 border-white flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-gray-400" />
          </div>

          {/* 매칭률 */}
          <div className="flex-1 flex items-end justify-between pb-1">
            <p className="text-[14px] font-medium text-white leading-[1.2]">매칭률</p>
            <div className="flex items-baseline gap-1">
              <p className="text-[24px] font-medium text-white leading-[1.4]">
                {safeScore}
              </p>
              <p className="text-[12px] font-medium text-white leading-[1.6]">
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-col gap-[10px] w-full">
        <div className="flex flex-col gap-[6px]">
          <h3 className="text-[24px] font-bold text-black leading-[1.4] truncate">
            {title}
          </h3>
          <div className="flex flex-col gap-[2px]">
            <div className="flex items-center gap-1">
              <MapPin className="w-5 h-5 text-black shrink-0" />
              <p className="text-[16px] font-medium text-black truncate">
                {location}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-5 h-5 text-black shrink-0" />
              <p className="text-[16px] font-medium text-black truncate">
                {renderDateText()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

