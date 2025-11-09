import { useState } from 'react';
import { Trash2, Save, MapPin, Clock, Car, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { Poi } from '../hooks/usePoiSocket';
import type { DayLayer } from './MapPanel';

interface PlanPanelProps {
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  unmarkPoi: (poiId: number | string) => void;
}

interface PoiCardProps extends PlanPanelProps {
  poi: Poi;
  index: number;
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
};

const formatDistance = (meters: number) => {
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
};

const formatTabDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // '2024-07-25' -> '07-25'
    return date
      .toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
      .replace(/\. /g, '-')
      .replace('.', '');
  } catch (e) {
    return dateString; // 파싱 실패 시 원본 문자열 반환
  }
};

function PoiConnector({ poi }: { poi: Poi }) {
  return (
    <div className="relative flex w-24 flex-shrink-0 flex-col items-center justify-center px-2">
      <div className="w-full border-t-2 border-dashed border-gray-300" />
      {poi.distance && poi.duration && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-start rounded bg-gray-50 px-2 py-1 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDistance(poi.distance)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDuration(poi.duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PoiCard({ poi, index, unmarkPoi }: PoiCardProps) {
  return (
    <div className="group relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow w-72 flex-shrink-0">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <Badge
            variant="secondary"
            className="w-6 h-6 flex items-center justify-center"
          >
            {index + 1}
          </Badge>
          <button className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="pr-8 font-semibold text-gray-900 break-words">
              {poi.placeName}
            </h4>
            <button
              onClick={() => unmarkPoi(poi.id)}
              className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 bg-white hover:bg-gray-100 rounded-full transition-opacity"
              aria-label="장소 삭제"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
            </button>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="break-all">{poi.address}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanPanel({ itinerary, dayLayers, unmarkPoi }: PlanPanelProps) {
  const [selectedDay, setSelectedDay] = useState<string>(dayLayers[0]?.id);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Tabs
        value={selectedDay}
        onValueChange={(v) => setSelectedDay(v)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="bg-gray-100 m-4 mb-0">
          {dayLayers.map((layer, index) => (
            <TabsTrigger
              key={layer.id}
              value={layer.id}
              className="flex-1 flex-col h-auto py-2"
            >
              <span className="text-xs text-gray-500">Day {index + 1}</span>
              <span className="font-semibold">
                {formatTabDate(layer.label)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {dayLayers.map((layer) => (
            <TabsContent key={layer.id} value={layer.id} className="m-0 h-full">
              {itinerary[layer.id] && itinerary[layer.id].length > 0 ? (
                <div className="h-full overflow-x-auto overflow-y-hidden p-4">
                  <div className="flex h-full items-center py-4">
                    {(itinerary[layer.id] || []).map((poi, index) => (
                      <div key={poi.id} className="flex items-center">
                        {index > 0 && <PoiConnector poi={poi} />}
                        <PoiCard
                          poi={poi}
                          index={index}
                          itinerary={itinerary}
                          dayLayers={dayLayers}
                          unmarkPoi={unmarkPoi}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>아직 일정이 없습니다</p>
                  <p className="text-sm">지도에서 장소를 추가해보세요</p>
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Footer */}
      <div className="border-t p-4">
        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4" />
          일정 저장
        </Button>
      </div>
    </div>
  );
}
