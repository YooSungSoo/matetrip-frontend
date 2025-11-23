import { useState, useEffect, useMemo } from 'react'; // useMemo 임포트 추가
import { MapPin, Lightbulb } from 'lucide-react'; // Lightbulb 아이콘 임포트
import client from '../api/client';
import { CategoryIcon } from './CategoryIcon'; // CategoryIcon 임포트

interface InspirationCardProps {
  imageUrl?: string;
  rank?: number; // badgeText 대신 rank prop 추가
  title: string;
  category?: string;
  address: string;
  summary?: string;
  recommendationReasonText?: string; // 추천 이유 전체 메시지
  referencedPlaceInReason?: { title: string; id: string }; // 추천 근거 장소 정보
  onReferencePlaceClick?: (placeId: string) => void; // 추천 근거 장소 클릭 핸들러
  onClick?: () => void;
  isLoading?: boolean;
}

// 메달 아이콘 컴포넌트
const MedalIcon = ({ rank }: { rank: number }) => {
  let bgColor = '';
  let textColor = 'text-white';
  let iconText = '';

  if (rank === 1) {
    bgColor = 'bg-yellow-500'; // Gold
    iconText = '1st';
  } else if (rank === 2) {
    bgColor = 'bg-gray-400'; // Silver
    iconText = '2nd';
  } else if (rank === 3) {
    bgColor = 'bg-amber-700'; // Bronze
    iconText = '3rd';
  } else {
    return null; // Only show for top 3
  }

  return (
    <div
      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${bgColor} ${textColor} shadow-md z-10`}
    >
      {iconText}
    </div>
  );
};

export function InspirationCard({
  imageUrl,
  rank, // rank prop 사용
  title,
  category,
  address,
  summary,
  recommendationReasonText, // 추천 이유 전체 메시지
  referencedPlaceInReason, // 추천 근거 장소 정보
  onReferencePlaceClick, // 추천 근거 장소 클릭 핸들러
  onClick,
  isLoading = false,
}: InspirationCardProps) {
  const [actualImageUrl, setActualImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isImageId =
    imageUrl &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      imageUrl
    );

  useEffect(() => {
    if (!imageUrl) {
      setActualImageUrl(null);
      setIsImageLoading(false);
      return;
    }

    setIsImageLoading(true);
    if (isImageId) {
      const fetchImageUrl = async () => {
        try {
          const response = await client.get(
            `/binary-content/${imageUrl}/presigned-url`
          );
          setActualImageUrl(
            response.data.url || response.data.presignedUrl || response.data
          );
        } catch (error) {
          console.error('Failed to fetch image URL for inspiration:', error);
          setActualImageUrl(null);
        } finally {
          setIsImageLoading(false);
        }
      };
      fetchImageUrl();
    } else {
      setActualImageUrl(imageUrl);
      setIsImageLoading(false);
    }
  }, [imageUrl, isImageId]);

  // 추천 이유 텍스트 렌더링 로직
  const renderRecommendationReason = useMemo(() => {
    if (!recommendationReasonText) return null;

    let displayMessage: React.ReactNode = recommendationReasonText;

    if (referencedPlaceInReason && onReferencePlaceClick) {
      const parts = recommendationReasonText.split(referencedPlaceInReason.title);
      if (parts.length > 1) {
        displayMessage = (
          <>
            {parts[0]}
            <span
              className="text-yellow-300 underline cursor-pointer hover:text-yellow-200"
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 분리
                onReferencePlaceClick(referencedPlaceInReason.id);
              }}
            >
              {referencedPlaceInReason.title}
            </span>
            {parts.slice(1).join(referencedPlaceInReason.title)}
          </>
        );
      }
    }

    return (
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10 max-w-[calc(100%-20px)]">
        <Lightbulb className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{displayMessage}</span>
      </div>
    );
  }, [recommendationReasonText, referencedPlaceInReason, onReferencePlaceClick]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 items-start w-full animate-pulse">
        <div className="h-[252px] rounded-2xl w-full bg-gray-200"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-1"></div> {/* 카테고리 스켈레톤 */}
        <div className="flex items-center gap-1 w-full">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex flex-col w-full cursor-pointer overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-col gap-3 items-start justify-end w-full">
          <div
            className="h-[252px] w-full bg-cover bg-center relative overflow-hidden group" // group 클래스 추가
            style={{
              backgroundColor:
                !actualImageUrl || isImageLoading ? '#E5E7EB' : undefined,
              backgroundImage:
                actualImageUrl && !isImageLoading
                  ? `url(${actualImageUrl})`
                  : undefined,
            }}
          >
            {rank && <MedalIcon rank={rank} />} {/* 메달 아이콘 표시 */}
            
            {renderRecommendationReason} {/* 추천 이유 렌더링 */}

            {/* Hover 시 나타나는 dimmed 배경 및 summary */}
            {summary && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm text-center line-clamp-6">
                  {summary}
                </p>
              </div>
            )}

            {/* 이미지 위에 장소 이름, 카테고리, 주소 표시 (hover 시 사라짐) */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 group-hover:opacity-0">
              <h3 className="font-bold text-lg text-white leading-[1.4] w-full overflow-hidden whitespace-nowrap text-ellipsis">
                {title}
              </h3>
              {category && (
                <div className="flex items-center gap-1 text-sm text-white/90 mt-1">
                  <CategoryIcon category={category} className="w-4 h-4" />
                  <span>{category}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-white/90 mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <p className="overflow-hidden whitespace-nowrap text-ellipsis">
                  {address}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* 기존 카테고리, 주소, summary 렌더링 부분 제거 */}
      </div>
    </div>
  );
}
