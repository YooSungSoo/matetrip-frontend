import { useState } from 'react';
import { Calendar, MapPin, Clock, GripVertical, Trash2, Plus, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface PlaceItem {
  id: number;
  name: string;
  time: string;
  duration: string;
  distance?: string;
}

const MOCK_PLAN = {
  day1: [
    { id: 1, name: '해운대 해수욕장', time: '09:00', duration: '2시간' },
    { id: 2, name: '광안리 해변', time: '12:00', duration: '1.5시간', distance: '7.2km, 15분' },
    { id: 3, name: '센텀시티', time: '15:00', duration: '2시간', distance: '3.5km, 10분' },
  ],
  day2: [
    { id: 4, name: '태종대', time: '10:00', duration: '2시간' },
    { id: 5, name: '감천문화마을', time: '14:00', duration: '2시간', distance: '12.3km, 25분' },
  ],
};

export function PlanPanel() {
  const [activeDay, setActiveDay] = useState('day1');

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('placeId', id.toString());
  };

  return (
    <div className="h-full bg-white border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-gray-900">여행 일정</h3>
        </div>
        
        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="w-full">
            <TabsTrigger value="day1" className="flex-1">Day 1</TabsTrigger>
            <TabsTrigger value="day2" className="flex-1">Day 2</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plan List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {(activeDay === 'day1' ? MOCK_PLAN.day1 : MOCK_PLAN.day2).map((place, index) => (
            <div key={place.id}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, place.id)}
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-move group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 mt-1">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-gray-900 text-sm truncate">{place.name}</h4>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{place.time}</span>
                        <Badge variant="secondary" className="text-xs h-5">
                          {place.duration}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distance Info */}
              {place.distance && (
                <div className="flex items-center gap-2 py-2 px-3 ml-12 text-xs text-gray-500">
                  <div className="w-px h-4 bg-gray-300" />
                  <MapPin className="w-3 h-3" />
                  <span>{place.distance}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Place Button */}
        <Button
          variant="outline"
          className="w-full mt-4 border-dashed"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          장소 추가
        </Button>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Sparkles className="w-4 h-4 mr-2" />
          AI 경로 최적화
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            불러오기
          </Button>
          <Button variant="outline" className="flex-1" size="sm">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
