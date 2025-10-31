import { useState } from 'react';
import { MapPin, Navigation, Search, Layers } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Marker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  user: string;
  color: string;
  day: number;
}

const MOCK_MARKERS: Marker[] = [
  { id: 1, lat: 35, lng: 45, name: '해운대 해수욕장', user: '바다조아', color: 'blue', day: 1 },
  { id: 2, lat: 42, lng: 52, name: '광안리 해변', user: '바다조아', color: 'blue', day: 1 },
  { id: 3, lat: 38, lng: 65, name: '태종대', user: '여행러버', color: 'purple', day: 2 },
  { id: 4, lat: 50, lng: 40, name: '감천문화마을', user: '산악인', color: 'green', day: 2 },
];

export function MapPanel() {
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full relative bg-gray-100">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="장소 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white shadow-lg"
          />
        </div>
      </div>

      {/* Layer Control */}
      <div className="absolute top-20 left-4 z-10 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-700">
          <Layers className="w-4 h-4" />
          <span>레이어</span>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setActiveLayer('all')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeLayer === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setActiveLayer(1)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeLayer === 1 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
            }`}
          >
            Day 1
          </button>
          <button
            onClick={() => setActiveLayer(2)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeLayer === 2 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
            }`}
          >
            Day 2
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-full relative overflow-hidden">
        {/* Map Grid Background */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Simulated Map */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 opacity-40" />

        {/* Markers and Paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Draw paths between markers on same day */}
          {MOCK_MARKERS.map((marker, idx) => {
            const nextMarker = MOCK_MARKERS.find(
              (m, i) => i > idx && m.day === marker.day
            );
            if (!nextMarker) return null;
            
            if (activeLayer !== 'all' && marker.day !== activeLayer) return null;

            return (
              <line
                key={`path-${marker.id}`}
                x1={`${marker.lng}%`}
                y1={`${marker.lat}%`}
                x2={`${nextMarker.lng}%`}
                y2={`${nextMarker.lat}%`}
                stroke={marker.color === 'blue' ? '#3b82f6' : marker.color === 'purple' ? '#a855f7' : '#10b981'}
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Markers */}
        {MOCK_MARKERS.map((marker) => {
          if (activeLayer !== 'all' && marker.day !== activeLayer) return null;
          
          const colorClass = 
            marker.color === 'blue' ? 'bg-blue-500' :
            marker.color === 'purple' ? 'bg-purple-500' : 'bg-green-500';

          return (
            <div
              key={marker.id}
              className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group"
              style={{ left: `${marker.lng}%`, top: `${marker.lat}%` }}
              onClick={() => setSelectedMarker(marker)}
            >
              <div className={`relative ${colorClass} w-10 h-10 rounded-full shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform`}>
                <MapPin className="w-6 h-6 text-white" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-inherit rounded-full" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 max-w-sm w-80 z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-gray-900 mb-1">{selectedMarker.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Day {selectedMarker.day}</Badge>
                <span className="text-xs text-gray-500">추가: {selectedMarker.user}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              상세 정보
            </Button>
            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
              일정 추가
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button size="sm" variant="outline" className="bg-white shadow-lg w-10 h-10 p-0">
          <Navigation className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" className="bg-white shadow-lg w-10 h-10 p-0">
          +
        </Button>
        <Button size="sm" variant="outline" className="bg-white shadow-lg w-10 h-10 p-0">
          -
        </Button>
      </div>
    </div>
  );
}
