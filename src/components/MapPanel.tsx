import React, { useState, useRef, useCallback } from 'react';
import { Plus, Maximize2, Layers } from 'lucide-react';
import { Button } from './ui/button';
import {
  Map,
  MapMarker,
  Polyline,
  CustomOverlayMap,
} from 'react-kakao-maps-sdk';
import { usePoiSocket, Poi } from '../hooks/usePoiSocket';

export type DayLayer = {
  id: string; // UUID
  label: string;
  color: string;
};

export function MapPanel({ workspaceId, dayLayers }: { workspaceId: string, dayLayers: DayLayer[] }) {
  // 2. usePoiSocket 훅을 사용하여 소켓 통신 로직을 가져온다.
  // 이제 pois 상태는 웹소켓을 통해 서버와 동기화된다.
  const { pois, markPoi, unmarkPoi } = usePoiSocket(workspaceId);

  // '전체' 레이어를 포함한 전체 UI용 레이어 목록
  const UILayers: { id: 'all' | DayLayer['id']; label: string }[] = [
    { id: 'all', label: '전체' },
    ...dayLayers,
  ];

  // 1. selectedLayer의 타입을 DayLayer['id'] 에서 동적으로 추론하도록 변경
  //    'all' 타입을 포함하여 유연성을 확보합니다.
  const [selectedLayer, setSelectedLayer] = useState<'all' | string>(
    'all'
  );

  // 최종 여행 계획(일정)을 저장할 상태
  const [itinerary, setItinerary] = useState<Record<string, Poi[]>>(
    () => dayLayers.reduce((acc, layer) => ({ ...acc, [layer.id]: [] }), {})
  );

  // 여행 일정에 장소를 추가하는 함수
  const addToItinerary = (markerToAdd: Poi) => {
    // 모든 Day를 통틀어 이미 추가된 장소인지 확인
    const isAlreadyAdded = Object.values(itinerary)
      .flat()
      .some((item) => item.id === markerToAdd.id);

    if (isAlreadyAdded) {
      alert('이미 일정에 추가된 장소입니다.');
      return;
    }

    const targetDay = markerToAdd.planDayId;
    setItinerary((prev) => {
      const newItineraryForDay = [...(prev[targetDay] || []), markerToAdd];
      const updatedItinerary = { ...prev, [targetDay]: newItineraryForDay };

      // --- POI Connection 전체 데이터 시뮬레이션 ---
      const simulatedConnections = newItineraryForDay.map((poi, index, arr) => {
        // 각 POI를 기준으로 prev와 next를 결정합니다.
        const prevPoiId = index > 0 ? arr[index - 1].id : null;
        const nextPoiId = index < arr.length - 1 ? arr[index + 1].id : null;

        return {
          // 이 객체는 각 POI가 가지는 연결 정보를 나타냅니다.
          // 실제 테이블에서는 이 관계를 기반으로 레코드가 생성/업데이트됩니다.
          poi_id: poi.id, // 어떤 POI에 대한 연결 정보인지 명시
          placeName: poi.placeName, // 이해를 돕기 위해 장소 이름 추가
          prev_poi_id: prevPoiId,
          next_poi_id: nextPoiId,
          plan_day_id: targetDay,
        };
      });

      console.log(
        `[시뮬레이션] Day ${targetDay.slice(-1)}의 전체 POI_Connection 테이블 데이터:`,
        simulatedConnections
      );
      // -----------------------------------------

      return updatedItinerary;
    });
  };

  // MapUI 컴포넌트가 selectedLayer 상태와 상태 변경 함수를 props로 받도록 수정
  function MapUI({
    selectedLayer,
    setSelectedLayer,
  }: {
    // 2. MapUI 컴포넌트의 props 타입도 동적으로 변경된 타입에 맞게 수정합니다.
    selectedLayer: 'all' | string;
    setSelectedLayer: React.Dispatch<React.SetStateAction<'all' | string>>;
  }) {
    return (
      <>
        {/* Layer Controls */}
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3 space-y-2 w-32">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <span className="text-sm">레이어</span>
          </div>
          {UILayers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                selectedLayer === layer.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            여행지 추가
          </Button>
          <Button size="sm" variant="outline" className="gap-2 bg-white">
            <Maximize2 className="w-4 h-4" />
            전체 화면
          </Button>
        </div>
      </>
    );
  }

  // 선택된 레이어에 따라 표시할 마커들을 결정
  const markersToDisplay =
    selectedLayer === 'all' // 4. pois 배열을 필터링하여 현재 레이어에 맞는 마커만 표시하기
      ? pois
      : pois.filter((p) => p.planDayId === selectedLayer);

  // itinerary 데이터를 기반으로 Polyline 경로를 동적으로 생성
  const polylinePaths = dayLayers.reduce(
    (acc, layer) => {
      const path =
        itinerary[layer.id]?.map((m) => ({
          lat: m.latitude,
          lng: m.longitude,
        })) || [];
      return { ...acc, [layer.id]: path };
    },
    {} as Record<DayLayer['id'], { lat: number; lng: number }[]>
  );

  // 마커 위에 정보창(infowindow)을 표시하기 위한 상태
  const [openInfoWindow, setOpenInfoWindow] = useState<string | number | null>(
    null
  );

  return (
    <div className="h-full relative">
      <Map
        className="w-full h-full"
        center={{
          lat: 33.450701, // latitude
          lng: 126.570667, // longitude
        }}
        level={1}
        onClick={(_t, mouseEvent) => {
          // '전체' 레이어에서는 마커 추가를 방지
          if (selectedLayer === 'all') {
            return;
          }

          // Geocoder 라이브러리 로드 확인
          if (
            !window.kakao ||
            !window.kakao.maps ||
            !window.kakao.maps.services
          ) {
            alert('Kakao Maps services 라이브러리가 로드되지 않았습니다.');
            return;
          }

          const latlng = mouseEvent.latLng;
          const geocoder = new window.kakao.maps.services.Geocoder();

          // 좌표를 주소로 변환
          geocoder.coord2Address(
            latlng.getLng(),
            latlng.getLat(),
            (result, status) => {
              if (status !== window.kakao.maps.services.Status.OK) {
                console.error(
                  'Geocoder가 주소를 가져오는 데 실패했습니다. 상태:',
                  status
                );
                return;
              }

              const addressResult = result[0];
              const address =
                addressResult?.road_address?.address_name ||
                addressResult?.address?.address_name;
              // 건물 이름이 있으면 검색 정확도를 위해 건물 이름을, 없으면 주소를 검색 키워드로 사용
              const searchKeyword =
                addressResult?.road_address?.building_name || address;

              console.log('클릭한 위치의 주소:', address);
              console.log('장소 검색 키워드:', searchKeyword);

              const places = new window.kakao.maps.services.Places();
              // 키워드로 장소를 검색합니다. 검색 옵션으로 현재 좌표를 제공하여 정확도를 높입니다.
              places.keywordSearch(
                searchKeyword,
                (data, status) => {
                  let placeName = searchKeyword;
                  let categoryName: string | undefined = undefined;

                  if (status === window.kakao.maps.services.Status.OK) {
                    // 검색 결과 중 첫 번째 장소의 정보를 사용합니다.
                    const place = data[0];
                    placeName = place.place_name;
                    categoryName = place.category_name;
                    console.log(
                      '검색된 장소:',
                      placeName,
                      '| 카테고리:',
                      categoryName
                    );
                  }

                  // 5. 새 마커 정보를 로컬 상태에 바로 추가하는 대신,
                  // markPoi 함수를 호출하여 서버에 'mark' 이벤트를 보낸다.
                  // id는 서버에서 생성되므로, 여기서는 제외한다.
                  markPoi({
                    planDayId: selectedLayer, // 현재 선택된 레이어 ID 저장
                    latitude: latlng.getLat(),
                    longitude: latlng.getLng(),
                    address: address,
                    placeName: placeName, // 마커에 표시될 내용은 장소 이름으로 설정
                    // category는 새로운 DTO에 없으므로 제거
                  });
                },
                {
                  location: latlng, // 현재 클릭한 좌표를 중심으로
                  radius: 50, // 50미터 반경 내에서 검색합니다.
                  sort: window.kakao.maps.services.SortBy.DISTANCE, // 거리순으로 정렬합니다.
                }
              );
            }
          );
        }}
      >
        {markersToDisplay.map((marker, index) => (
          <MapMarker
            key={`marker-${marker.id}`} // key는 고유해야 합니다.
            position={{ lat: marker.latitude, lng: marker.longitude }}
            onMouseOver={() => setOpenInfoWindow(marker.id)}
            onMouseOut={() => setOpenInfoWindow(null)}
          >
            {openInfoWindow === marker.id && (
              <CustomOverlayMap
                position={{ lat: marker.latitude, lng: marker.longitude }}
                yAnchor={1.2} // 마커와 정보창 사이의 간격을 줄여 마우스 이동이 편하도록 조정
                zIndex={2} // 정보창이 다른 오버레이보다 위에 표시되도록 z-index 설정
                clickable={true} // 이 오버레이 클릭 시 맵 클릭 이벤트가 발생하지 않도록 설정
              >
                <div
                  className="bg-white rounded-lg border border-gray-300 shadow-md min-w-[200px] text-black overflow-hidden"
                  onMouseOver={() => setOpenInfoWindow(marker.id)}
                  onMouseOut={() => setOpenInfoWindow(null)}
                >
                  <div className="p-3">
                    <div className="font-bold text-sm mb-1">
                      {marker.placeName}
                    </div>
                    <div className="text-xs text-gray-600 mb-3">
                      {marker.address}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        className={`flex-1 h-8 text-xs ${
                          Object.values(itinerary)
                            .flat()
                            .some((item) => item.id === marker.id)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToItinerary(marker);
                        }}
                        disabled={Object.values(itinerary)
                          .flat()
                          .some((item) => item.id === marker.id)}
                      >
                        {Object.values(itinerary)
                          .flat()
                          .some((item) => item.id === marker.id)
                          ? '추가됨'
                          : '일정에 추가'}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          unmarkPoi(marker.id);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </CustomOverlayMap>
            )}
          </MapMarker>
        ))}

        {/* 여행 계획(itinerary)에 포함된 마커에 순서 번호 표시 */}
        {Object.entries(itinerary).map(([layerId, dayItinerary]) => {
          const shouldDisplay =
            selectedLayer === 'all' || selectedLayer === layerId;
          return (
            shouldDisplay &&
            dayItinerary.map((marker, index) => (
              <CustomOverlayMap
                key={`order-overlay-${marker.id}`}
                position={{ lat: marker.latitude, lng: marker.longitude }}
                yAnchor={2.5} // 마커 아이콘 위로 오버레이를 올립니다.
                zIndex={1} // 마커보다 위에 표시되도록 z-index 설정
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.25rem', // w-5
                    height: '1.25rem', // h-5
                    backgroundColor: 'black',
                    color: 'white',
                    fontSize: '0.75rem', // text-xs
                    borderRadius: '9999px', // rounded-full
                    boxShadow:
                      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // shadow-md
                  }}
                >
                  {index + 1}
                </div>
              </CustomOverlayMap>
            ))
          );
        })}

        {/* 모든 Day 레이어를 순회하며 Polyline을 동적으로 렌더링 */}
        {dayLayers.map((layer) => {
          const shouldDisplay =
            selectedLayer === 'all' || selectedLayer === layer.id;
          const dayPath = polylinePaths[layer.id];
          return (
            shouldDisplay &&
            dayPath.length > 1 &&
            // 경로를 구간별로 나누어 각각의 Polyline으로 렌더링합니다.
            dayPath.map((_, index) => {
              if (index === 0) return null; // 첫 번째 점에서는 시작만 하므로 선을 그리지 않습니다.
              const segmentPath = [dayPath[index - 1], dayPath[index]];
              return (
                <Polyline
                  key={`polyline-${layer.id}-${index}`}
                  path={segmentPath}
                  strokeWeight={3}
                  strokeColor={layer.color}
                  strokeOpacity={0.8}
                  strokeStyle={'solid'}
                  endArrow={true} // 선의 끝에 화살표를 추가합니다.
                />
              );
            })
          );
        })}

        <MapUI
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
        />
      </Map>
    </div>
  );
}
