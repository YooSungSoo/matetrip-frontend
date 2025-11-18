import { useEffect, useState, type KeyboardEvent } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type { MatchingInfo } from '../types/matching';
import { API_BASE_URL } from '../api/client';
import type { MatchRecruitingPostDto } from '../types/matchSearch';
import type { Post } from '../types/post';

interface MatchingCardProps {
  /** 추천 카드에 표시할 모집글 정보 (Post 또는 MatchRecruitingPostDto) */
  post: Post | MatchRecruitingPostDto;
  /** 이 카드에만 필요한 매칭 점보 */
  matchingInfo: MatchingInfo;
  /** 카드 클릭 이벤트 핸들러 */
  onClick?: () => void;
  /** 추천 순위 (1부터 시작) */
  rank?: number;
}

const defaultCoverImage = 'https://via.placeholder.com/400x300';

/**
 * 이미지에 표시된 '매칭 스코어' 기반의 추천 카드를 렌더링하는 컴포넌트입니다.
 * WorkspaceCard의 기본 골격(props, 스타일)을 따릅니다.
 */
export function MatchingCard({
  post,
  matchingInfo,
  onClick,
  rank,
}: MatchingCardProps) {
  const { title, location, startDate, endDate, status = '모집중' } = post;
  const { score, tendency, style, vectorscore } = matchingInfo;
  const formatMatchText = (value?: string, fallback = '[ ]') =>
    value && value.trim().length > 0 ? value : fallback;
  const safeScore =
    typeof score === 'number' && !Number.isNaN(score)
      ? Math.min(100, Math.max(0, score))
      : 0;
  const safeVectorScore =
    typeof vectorscore === 'number' && !Number.isNaN(vectorscore)
      ? Math.min(100, Math.max(0, vectorscore))
      : undefined;
  const isInteractive = typeof onClick === 'function';
  const cardClassName = `bg-white rounded-2xl border border-blue-50 shadow-lg overflow-hidden mx-6 relative w-[380px] h-full flex flex-col${
    isInteractive
      ? ' cursor-pointer hover:shadow-xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
      : ''
  }`;

  const rankLabel = rank && rank > 1 ? `${rank}순위 추천` : 'Best Match';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  // WorkspaceCard에서 가져온 총 일수 계산 함수
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const renderDateText = () => {
    if (!startDate || !endDate) {
      return '일정 미정';
    }
    return `${startDate} ~ ${endDate} (${calculateDays()}일)`;
  };

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

  return (
    <div
      className={cardClassName}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      {status && (
        <Badge
          className="absolute top-4 right-4 z-10 px-3 py-1 text-sm font-semibold"
          variant={status === '모집중' ? 'default' : 'secondary'}
        >
          {status}
        </Badge>
      )}
      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pink-500 border border-pink-100">
        <Sparkles className="w-3.5 h-3.5" />
        {rankLabel}
      </div>

      <div className="h-48 overflow-hidden flex-shrink-0">
        <ImageWithFallback
          src={coverImageUrl ?? defaultCoverImage}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-6 space-y-3 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-gray-900 text-xl font-bold leading-snug truncate">
            {title}
          </h3>
          {/* <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-500">
            <Sparkles className="w-3.5 h-3.5" />
            {rankLabel}
          </span> */}
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{renderDateText()}</span>
        </div>

        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              매칭 스코어
            </span>
            <span className="text-3xl font-black text-blue-600">
              {safeScore}%
            </span>
          </div>
          <Progress
            value={safeScore}
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-pink-500"
          />
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
            <span>
              여행 스타일이{' '}
              <span className="font-semibold text-gray-900">
                {formatMatchText(style)}
              </span>
              (으)로 같아요
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              여행 성향이{' '}
              <span className="font-semibold text-gray-900">
                {formatMatchText(tendency)}
              </span>
              (으)로 같아요
            </span>
          </div>
          {safeVectorScore !== undefined && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <span>
                프로필 유사도가{' '}
                <span className="font-semibold text-gray-900">
                  {safeVectorScore}%
                </span>
                예요
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
