import { useState } from 'react';
import { MatchingCard } from './MatchingCard';
import type { Post } from '../types/post';
import type { MatchingInfo } from '../types/matching';

interface MatchingCarouselProps {
  posts: Post[];
  matchingInfoByPostId?: Record<string, MatchingInfo>;
  fallbackMatchingInfo?: MatchingInfo;
  onCardClick?: (post: Post) => void;
  onEnterClick?: (post: Post) => void;
  showEnterButton?: boolean;
  buttonText?: string;
}

const DEFAULT_MATCHING_INFO: MatchingInfo = {
  score: 0,
};

/**
 * 3D 회전 캐러셀 컴포넌트
 * - MatchingCard를 Y축 기준으로 원형 배치하여 회전
 * - 호버 시 회전 정지
 */
export function MatchingCarousel({
  posts,
  matchingInfoByPostId,
  fallbackMatchingInfo,
  onCardClick,
}: MatchingCarouselProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 최대 6개 카드 표시
  const displayPosts = posts.slice(0, 7);
  const angleStep = 360 / displayPosts.length;
  const radius = 300; // 원형 궤도 반지름

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
      {/* 3D Perspective Container */}
      <div
        className="relative w-full h-full"
        style={{
          perspective: '1200px',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Rotating Container */}
        <div
          className="absolute top-1/2 left-1/2 w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translate(-50%, -50%)',
            animation: 'rotate3d 30s linear infinite',
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        >
          {displayPosts.map((post, index) => {
            const angle = index * angleStep;
            
            return (
              <div
                key={post.id}
                className="absolute top-1/2 left-1/2"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `
                    translate(-50%, -50%)
                    rotateY(${angle}deg)
                    translateZ(${radius}px)
                  `,
                }}
              >
                {/* MatchingCard가 앞면/뒷면을 모두 처리 */}
                <MatchingCard
                  post={post}
                  rank={index + 1}
                  matchingInfo={
                    matchingInfoByPostId?.[post.id] ??
                    fallbackMatchingInfo ??
                    DEFAULT_MATCHING_INFO
                  }
                  onClick={() => onCardClick?.(post)}
                />
              </div>
            );
          })}
        </div>

        {/* Hover Hint
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm text-gray-500">
            {isHovered ? '회전 정지됨' : '마우스를 올리면 회전이 멈춥니다'}
          </p>
        </div> */}
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes rotate3d {
          from {
            transform: translate(-50%, -50%) rotateY(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}
