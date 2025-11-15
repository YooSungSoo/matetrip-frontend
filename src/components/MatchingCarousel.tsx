import { useRef, useState, useEffect } from 'react';
import { MatchingCard } from './MatchingCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from './ui/carousel';
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

export function MatchingCarousel({
  posts,
  matchingInfoByPostId,
  fallbackMatchingInfo,
  onCardClick,
  // onEnterClick,
  // showEnterButton,
  // buttonText,
}: MatchingCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }

    autoScrollIntervalRef.current = setInterval(() => {
      if (api) {
        api.scrollNext();
      }
    }, 7000); // 5초마다 자동 스크롤
  };

  useEffect(() => {
    if (!api) {
      return;
    }

    resetAutoScroll();

    api.on('select', () => {
      resetAutoScroll();
    });

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [api]);

  return (
    <Carousel
      opts={{
        align: 'start',
        loop: true,
      }}
      setApi={setApi}
      className="w-full"
    >
      <CarouselContent className="-ml-6">
        {posts.map((post, index) => (
          <CarouselItem
            key={post.id}
            className="pl-6 md:basis-1/2 lg:basis-[34%]"
          >
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
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-0" />
      <CarouselNext className="right-0" />
    </Carousel>
  );
}
