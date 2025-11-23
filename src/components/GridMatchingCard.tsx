import { useEffect, useState, useMemo } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  MapPin,
  Calendar,
  User,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from './ui/badge';
import type { MatchingInfo } from '../types/matching';
import { API_BASE_URL } from '../api/client';
import type { MatchRecruitingPostDto } from '../types/matchSearch';
import type { Post } from '../types/post';
import { Button } from './ui/button';

interface GridMatchingCardProps {
  post: Post | MatchRecruitingPostDto;
  matchingInfo: MatchingInfo;
  onClick?: () => void;
  rank?: number; // rank is kept for API compatibility, but not used for display
  writerProfileImageUrl?: string | null;
  writerNickname?: string | null;
}

const defaultCoverImage = 'https://via.placeholder.com/400x300';

export function GridMatchingCard({
  post,
  matchingInfo,
  onClick,
  writerProfileImageUrl,
  writerNickname,
}: GridMatchingCardProps) {
  const {
    title,
    location,
    startDate,
    endDate,
    writer,
    participations,
    maxParticipants,
  } = post;
  const { score, tendency, style, vectorScore } = matchingInfo;

  const safeScore =
    typeof score === 'number' && !Number.isNaN(score)
      ? Math.min(100, Math.max(0, score))
      : 0;
  const safeVectorScore =
    typeof vectorScore === 'number' && !Number.isNaN(vectorScore)
      ? Math.min(100, Math.max(0, vectorScore))
      : null;

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentParticipants =
    1 + (participations?.filter((p) => p.status === '승인').length ?? 0);

  const renderDateText = () => {
    if (!startDate || !endDate) {
      return '일정 미정';
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return `${startDate} ~ ${endDate}`;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${startDate} ~ ${endDate} (${diffDays}일)`;
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
          { credentials: 'include' }
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

  const hasMatchingKeywords = useMemo(() => {
    return (
      (tendency && tendency.length > 0) ||
      (style && style.length > 0) ||
      (safeVectorScore !== null && safeVectorScore > 0)
    );
  }, [tendency, style, safeVectorScore]);

  return (
    <div
      className="group flex flex-col w-full cursor-pointer overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      {/* 이미지 영역 */}
      <div className="relative h-[200px] bg-gray-300 overflow-hidden w-full">
        <ImageWithFallback
          src={coverImageUrl ?? defaultCoverImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-col flex-1 gap-4 w-full p-4">
        {/* 상단 정보 (제목, 기본 정보) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-gray-800 leading-snug -mt-1 truncate">
            {title}
          </h3>

          <div className="flex flex-col gap-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{renderDateText()}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>
                  {currentParticipants} / {maxParticipants || 'N'}명
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 (작성자, 매칭률, 펼치기/접기, 매칭 키워드) */}
        <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
          {/* 작성자, 매칭률, 펼치기 버튼 */}
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gray-200">
                {writerProfileImageUrl ? (
                  <ImageWithFallback
                    src={writerProfileImageUrl}
                    alt="작성자 프로필"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-700 truncate">
                {writerNickname ?? writer?.profile?.nickname ?? '익명'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1.5">
                <p className="text-base font-semibold text-gray-500">매칭률</p>
                <p className="text-2xl font-bold text-blue-600">
                  {safeScore}%
                </p>
              </div>
              {hasMatchingKeywords && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 매칭 키워드 (펼쳐졌을 때) */}
          {isExpanded && hasMatchingKeywords && (
            <div className="flex flex-col gap-3 w-full pt-2 animate-in fade-in-50 duration-300">
              {style && style.length > 0 && (
                <div className="flex flex-col items-start gap-1.5">
                  <p className="text-gray-500 text-xs font-bold">
                    여행 스타일
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {style.split(', ').map((s, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 font-medium"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {tendency && tendency.length > 0 && (
                <div className="flex flex-col items-start gap-1.5">
                  <p className="text-gray-500 text-xs font-bold">여행 성향</p>
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {tendency.split(', ').map((t, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-700 text-xs px-2 py-0.5 font-medium"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {safeVectorScore !== null && (
                <div className="flex flex-col items-start gap-1.5">
                  <p className="text-gray-500 text-xs font-bold">
                    프로필 유사도
                  </p>
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700 text-xs px-2 py-0.5 font-medium"
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    {safeVectorScore}%
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
