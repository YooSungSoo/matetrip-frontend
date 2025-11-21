import { useEffect, useCallback, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import type { PlaceDto } from '../types/place';
import { CATEGORY_INFO } from '../types/place';
import { Button } from './ui/button';

interface FamousPlacesCarouselProps {
  places: PlaceDto[];
  onPlaceSelect: (place: PlaceDto) => void;
}

const PlaceCard = ({ place }: { place: PlaceDto }) => {
  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
      <div className="relative h-32 flex-shrink-0">
        <img
          src={place.image_url}
          alt={place.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3 text-white">
          <h3 className="font-bold text-lg leading-tight">{place.title}</h3>
          <p className="text-xs">
            {CATEGORY_INFO[place.category as keyof typeof CATEGORY_INFO]
              ?.name || place.category}
          </p>
        </div>
      </div>
      <div className="p-3 flex-grow flex flex-col justify-between">
        <p className="text-xs text-gray-600 line-clamp-2">{place.address}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-bold ml-1">
              {place.popularityScore?.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FamousPlacesCarousel = ({
  places,
  onPlaceSelect,
}: FamousPlacesCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: places.length > 1,
    align: 'center',
    containScroll: 'trimSnaps',
  });

  // places 배열의 내용이 변경될 때만 새로운 값을 갖는 안정적인 의존성 생성
  const placesIdString = useMemo(
    () => JSON.stringify(places.map((p) => p.id)),
    [places]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // 사용자가 캐러셀을 넘길 때(select 이벤트) 호출되는 효과
  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      if (places[newIndex]) {
        onPlaceSelect(places[newIndex]);
      }
    };

    emblaApi.on('select', handleSelect);
    return () => {
      emblaApi.off('select', handleSelect);
    };
  }, [emblaApi, places, onPlaceSelect]);

  // places 목록이 실제로 변경되었을 때 캐러셀을 리셋하는 효과
  useEffect(() => {
    if (emblaApi && places.length > 0) {
      emblaApi.reInit();
      emblaApi.scrollTo(0);
      onPlaceSelect(places[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, placesIdString, onPlaceSelect]);

  if (places.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-5 left-0 w-full z-10">
      <div className="relative w-full max-w-xs mx-auto">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex">
            {places.map((place) => (
              <div
                key={place.id}
                className="relative flex-[0_0_100%]"
                style={{ height: '220px' }}
              >
                <PlaceCard place={place} />
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={scrollPrev}
          className="absolute top-1/2 -translate-y-1/2 -left-10 bg-white/80 hover:bg-white rounded-full shadow-md"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollNext}
          className="absolute top-1/2 -translate-y-1/2 -right-10 bg-white/80 hover:bg-white rounded-full shadow-md"
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
        </Button>
      </div>
    </div>
  );
};
