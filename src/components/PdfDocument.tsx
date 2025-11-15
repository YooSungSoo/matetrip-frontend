import React, { useMemo, useEffect, useState } from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import { Clock, Car } from 'lucide-react';
import type { Poi } from '../hooks/usePoiSocket';
import type { DayLayer, RouteSegment } from '../types/map';

interface PdfDocumentProps {
  workspaceName: string;
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  routeSegmentsByDay: Record<string, RouteSegment[]>;
}

const createMarkerImageSrc = (text: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const size = 20;
  const fontSize = 10;

  canvas.width = size;
  canvas.height = size;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI, false);
  ctx.fillStyle = '#F87171';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + 1);

  return canvas.toDataURL('image/png');
};

const PdfInteractiveMap = ({ pois }: { pois: Poi[] }) => {
  const [map, setMap] = useState<kakao.maps.Map>();

  useEffect(() => {
    if (!map || pois.length === 0) return;

    const timer = setTimeout(() => {
      map.relayout();
      const bounds = new window.kakao.maps.LatLngBounds();
      pois.forEach((poi) => {
        bounds.extend(
          new window.kakao.maps.LatLng(poi.latitude, poi.longitude)
        );
      });
      map.setBounds(bounds);
    }, 100);

    return () => clearTimeout(timer);
  }, [map, pois]);

  const markerImages = useMemo(() => {
    return pois.map((_, index) => createMarkerImageSrc(String(index + 1)));
  }, [pois]);

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        width: '90%',
        height: '220px',
        margin: '0 auto 24px',
      }}
    >
      <Map
        center={{ lat: 37.5665, lng: 126.978 }}
        style={{ width: '100%', height: '100%' }}
        isPanto={false}
        draggable={false}
        scrollwheel={false}
        zoomable={false}
        keyboardShortcuts={false}
        onCreate={setMap}
      >
        {pois.map((poi, index) => (
          <MapMarker
            key={poi.id}
            position={{ lat: poi.latitude, lng: poi.longitude }}
            image={{
              src: markerImages[index],
              size: { width: 20, height: 20 },
            }}
          />
        ))}
      </Map>
    </div>
  );
};

export const PdfDocument = React.forwardRef<HTMLDivElement, PdfDocumentProps>(
  ({ workspaceName, itinerary, dayLayers, routeSegmentsByDay }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm',
        }}
      >
        <h1 className="text-xl font-bold mb-6 border-b pb-3">
          {workspaceName} 여행 계획
        </h1>

        {dayLayers.map((day, dayIndex) => {
          const poisForDay = itinerary[day.id] || [];
          const segmentsForDay = routeSegmentsByDay[day.id] || [];
          if (poisForDay.length === 0) return null;

          return (
            <div
              key={day.id}
              className="mb-8"
              style={{ breakInside: 'avoid' }}
            >
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: day.color }}
              >
                {dayIndex + 1}일차 - {day.label}
              </h2>

              <PdfInteractiveMap pois={poisForDay} />

              <div style={{ width: '90%', margin: '0 auto' }}>
                <ul className="space-y-2">
                  {poisForDay.map((poi, index) => (
                    <React.Fragment key={poi.id}>
                      <li className="flex items-start">
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs mr-3 mt-0.5"
                          style={{ backgroundColor: day.color }}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{poi.placeName}</p>
                          <p className="text-xs text-gray-600">
                            {poi.address}
                          </p>
                        </div>
                      </li>
                      {index < poisForDay.length - 1 &&
                        (() => {
                          const nextPoi = poisForDay[index + 1];
                          const segment = segmentsForDay.find(
                            (s) =>
                              s.fromPoiId === poi.id && s.toPoiId === nextPoi.id
                          );
                          if (!segment) return null;

                          const totalMinutes = Math.ceil(
                            segment.duration / 60
                          );
                          const totalKilometers = (
                            segment.distance / 1000
                          ).toFixed(1);

                          return (
                            <li className="flex items-center pl-8 text-xs text-gray-500">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              <span className="mr-3">{`${totalMinutes}분`}</span>
                              <Car className="w-2.5 h-2.5 mr-1" />
                              <span>{`${totalKilometers}km`}</span>
                            </li>
                          );
                        })()}
                    </React.Fragment>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

PdfDocument.displayName = 'PdfDocument';
