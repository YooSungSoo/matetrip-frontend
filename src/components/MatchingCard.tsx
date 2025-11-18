import { useEffect, useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, CheckCircle, User, Thermometer } from 'lucide-react';
import type { MatchingInfo } from '../types/matching';
import { API_BASE_URL } from '../api/client';
import type { MatchRecruitingPostDto } from '../types/matchSearch';
import type { Post } from '../types/post';

interface MatchingCardProps {
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
 * 3D 회전 가능한 매칭 카드 컴포넌트
 * - 앞면: 게시글 이미지, 제목, 장소, 기간, 매칭률
 * - 뒷면: 매너온도, 매칭 사유
 */
export function MatchingCard({
  post,
  matchingInfo,
  onClick,
  rank,
}: MatchingCardProps) {
  const { title, location, startDate, endDate } = post;
  const { score, tendency, style, vectorscore, mannerTemperature } = matchingInfo;
  
  const formatMatchText = (value?: string, fallback = '정보 없음') =>
    value && value.trim().length > 0 ? value : fallback;
  
  const safeScore =
    typeof score === 'number' && !Number.isNaN(score)
      ? Math.min(100, Math.max(0, score))
      : 0;
  
  const safeVectorScore =
    typeof vectorscore === 'number' && !Number.isNaN(vectorscore)
      ? Math.min(100, Math.max(0, vectorscore))
      : undefined;

  const safeMannerTemp = mannerTemperature ?? 36.5;

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // 총 일수 계산
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

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
        console.error('MatchingCard cover image load failed:', error);
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

  // TODO: 프로필 이미지 API 연동
  // 향후 post.writerId를 사용해 /profile/user/:userId 호출
  // response.data.profileImage를 writerProfileImageUrl로 전달

  return (
    <div
      className="relative"
      style={{
        width: '240px',
        height: '280px',
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
    >
      {/* ===== 앞면 (Front Face) ===== */}
      <div
        className="absolute inset-0 bg-white rounded-[16px] overflow-hidden shadow-lg"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(0deg)',
        }}
      >
        {/* 이미지 영역 */}
        <div className="relative h-[200px] bg-gray-300 overflow-hidden rounded-[16px]">
          <ImageWithFallback
            src={coverImageUrl ?? defaultCoverImage}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* Best 배지 (rank === 1일 때만) */}
          {rank === 1 && (
            <div className="absolute top-2 right-2 bg-[#101828] rounded-[8px] px-2 py-0.5">
              <p className="text-white text-[12px] font-medium">Best</p>
            </div>
          )}

          {/* 하단 오버레이: 프로필 아이콘 + 매칭률 */}
          <div className="absolute bottom-2 left-2 right-2 flex items-end gap-2">
            {/* 프로필 아이콘 (48px 원형) */}
            <div className="w-12 h-12 bg-white rounded-full border-2 border-white flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gray-400" />
            </div>

            {/* 매칭률 */}
            <div className="flex-1 flex items-end justify-between pb-0.5">
              <p className="text-[11px] font-medium text-white">매칭률</p>
              <div className="flex items-baseline gap-0.5">
                <p className="text-[18px] font-medium text-white leading-[1.4]">
                  {safeScore}
                </p>
                <p className="text-[10px] font-medium text-white leading-[1.6]">
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 카드 하단: 제목, 장소, 기간 */}
        <div className="px-2.5 pt-2 pb-2 space-y-1">
          <h3 className="text-[16px] font-bold text-black leading-[1.3] truncate">
            {title}
          </h3>
          
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
            <p className="text-[12px] font-medium text-black truncate">
              {location}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-black shrink-0" />
            <p className="text-[12px] font-medium text-black truncate">
              {renderDateText()}
            </p>
          </div>
        </div>
      </div>

      {/* ===== 뒷면 (Back Face) ===== */}
      <div
        className="absolute inset-0 bg-white rounded-[16px] shadow-lg px-3 py-4 flex flex-col justify-between"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}
      >
        {/* 상단: 매너온도 */}
        <div className="flex items-end justify-between">
          <p className="text-[12px] font-medium text-black leading-[1.2]">
            매너온도
          </p>
          <div className="flex items-start gap-1">
            <p className="text-[18px] font-medium text-black leading-[1.4]">
              {safeMannerTemp.toFixed(1)}
            </p>
            <Thermometer className="w-4 h-4 text-black" />
          </div>
        </div>

        {/* 하단: 당신과의 매칭 사유 */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-black mb-1.5">
            당신과의 매칭 사유
          </p>
          
          <div className="space-y-2">
            {/* 매칭 사유 1: 여행 스타일 */}
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-black leading-[1.4]">
                여행 스타일: {formatMatchText(style, '정보없음')}
              </p>
            </div>
            
            {/* 매칭 사유 2: 여행 성향 */}
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-black leading-[1.4]">
                여행 성향: {formatMatchText(tendency, '정보없음')}
              </p>
            </div>
            
            {/* 매칭 사유 3: 프로필 유사도 */}
            {safeVectorScore !== undefined && (
              <div className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-black leading-[1.4]">
                  프로필 유사도: {safeVectorScore}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 
          TODO: 매너온도 API 연동
          향후 AIMatchingPage의 fetchMatches에서 /profile/user/:userId 호출 시
          response.data.mannerTemperature 필드를 matchingInfo에 포함하여 전달
        */}
      </div>
    </div>
  );
}
