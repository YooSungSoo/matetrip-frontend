import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Plus,
  Maximize2,
  Layers,
  ListOrdered,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button'; // prettier-ignore
import {
  Map as KakaoMap,
  MapMarker,
  Polyline,
  CustomOverlayMap,
} from 'react-kakao-maps-sdk'; // prettier-ignore
import {
  type Poi,
  type PoiConnection,
  type CreatePoiConnectionDto,
} from '../hooks/usePoiSocket';
import { Input } from './ui/input';
import { KAKAO_REST_API_KEY } from '../constants';
import { useDirections } from '../hooks/useDirections';

export type DayLayer = {
  id: string; // UUID
  label: string;
  color: string;
};

// 카카오 장소 검색 결과 타입을 정의합니다.
type KakaoPlace = kakao.maps.services.PlacesSearchResultItem;
type KakaoPagination = kakao.maps.Pagination;

const KAKAO_MAP_SERVICES_STATUS = window.kakao?.maps.services.Status;

// 여행 일정 목록을 보여주는 새로운 컴포넌트
function ItineraryPanel({
  itinerary,
  dayLayers,
  onPoiClick,
}: {
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  onPoiClick: (poi: Poi) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3 space-y-2 w-60 max-h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <ListOrdered className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold">여행 일정</span>
      </div>
      <div className="space-y-3">
        {dayLayers.map((layer) => (
          <div key={layer.id}>
            <h3
              className="text-sm font-bold mb-2 pb-1 border-b"
              style={{ borderBottomColor: layer.color }}
            >
              {layer.label}
            </h3>
            <ul className="space-y-2">
              {itinerary[layer.id] && itinerary[layer.id].length > 0 ? (
                itinerary[layer.id].map((poi, index) => (
                  <li
                    key={poi.id}
                    className="flex items-center gap-2 text-xs p-1 rounded-md cursor-pointer hover:bg-gray-100"
                    onClick={() => onPoiClick(poi)}
                  >
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs"
                      style={{ backgroundColor: layer.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate">{poi.placeName}</span>
                  </li>
                ))
              ) : (
                <p className="text-xs text-gray-500">추가된 장소가 없습니다.</p>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// 장소 검색 패널 컴포넌트
function SearchPanel({
  onPlaceClick,
}: {
  onPlaceClick: (place: KakaoPlace) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [pagination, setPagination] = useState<KakaoPagination | null>(null);
  const [isResultsVisible, setIsResultsVisible] = useState(true);

  const handleSearch = useCallback(() => {
    if (!keyword.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    // 검색 시 결과 창을 항상 펼칩니다.
    setIsResultsVisible(true);

    if (
      !window.kakao ||
      !window.kakao.maps ||
      !window.kakao.maps.services ||
      !KAKAO_MAP_SERVICES_STATUS
    ) {
      alert('카카오 지도 서비스가 로드되지 않았습니다.');
      return;
    }

    const places = new window.kakao.maps.services.Places();
    // 페이지네이션 콜백 함수
    const searchCallback = (
      data: KakaoPlace[],
      status: kakao.maps.services.Status,
      pagi: KakaoPagination
    ) => {
      if (
        KAKAO_MAP_SERVICES_STATUS &&
        status === KAKAO_MAP_SERVICES_STATUS.OK
      ) {
        setResults(data);
        setPagination(pagi);
      } else if (status === KAKAO_MAP_SERVICES_STATUS.ZERO_RESULT) {
        alert('검색 결과가 없습니다.');
        setResults([]);
        setPagination(null);
      } else {
        alert('검색 중 오류가 발생했습니다.');
        setResults([]);
        setPagination(null);
      }
    };

    places.keywordSearch(keyword, searchCallback);
  }, [keyword]);

  return (
    <div className="absolute top-4 left-40 z-10 bg-white rounded-lg shadow-lg p-3 space-y-2 w-64 max-h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold">장소 검색</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="장소, 주소 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-9"
        />
        <Button size="sm" onClick={handleSearch} className="h-9">
          검색
        </Button>
      </div>
      {/* 검색 결과가 있을 때만 접기/펴기 버튼을 표시합니다. */}
      {results.length > 0 && (
        <div className="border-t pt-1">
          <Button
            variant="ghost"
            className="w-full h-6"
            onClick={() => setIsResultsVisible(!isResultsVisible)}
          >
            {isResultsVisible ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </Button>
        </div>
      )}
      {isResultsVisible && (
        <>
          <ul className="overflow-y-auto space-y-2 pt-2 max-h-[400px]">
            {results.map((place) => (
              <li
                key={place.id}
                className="p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => onPlaceClick(place)}
              >
                <div className="text-sm font-semibold truncate">
                  {place.place_name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {place.road_address_name || place.address_name}
                </div>
              </li>
            ))}
          </ul>
          {pagination && results.length > 0 && (
            <div className="flex justify-center items-center gap-3 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => pagination.gotoPage(pagination.current - 1)}
                disabled={!pagination.hasPrevPage}
                className="h-7 px-2"
              >
                이전
              </Button>
              <span className="text-xs">
                {pagination.current} / {Math.ceil(pagination.totalCount / 15)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => pagination.gotoPage(pagination.current + 1)}
                disabled={!pagination.hasNextPage}
                className="h-7 px-2"
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// MapUI 컴포넌트가 selectedLayer 상태와 상태 변경 함수를 props로 받도록 수정
function MapUI({
  selectedLayer,
  setSelectedLayer,
  UILayers,
}: {
  // 2. MapUI 컴포넌트의 props 타입도 동적으로 변경된 타입에 맞게 수정합니다.
  selectedLayer: 'all' | string;
  setSelectedLayer: React.Dispatch<React.SetStateAction<'all' | string>>;
  UILayers: { id: 'all' | DayLayer['id']; label: string }[];
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

export function MapPanel({
  workspaceId,
  itinerary,
  setItinerary,
  dayLayers,
  pois,
  connections,
  isSyncing,
  markPoi,
  unmarkPoi,
  connectPoi,
}: {
  itinerary: Record<string, Poi[]>;
  setItinerary: React.Dispatch<React.SetStateAction<Record<string, Poi[]>>>;
  dayLayers: DayLayer[];
  pois: Poi[];
  connections: Record<string, PoiConnection[]>;
  isSyncing: boolean;
  markPoi: (
    poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy' | 'id'>
  ) => void;
  unmarkPoi: (poiId: string | number) => void;
  connectPoi: (
    connectionData: Omit<CreatePoiConnectionDto, 'workspaceId'>
  ) => void;
}) {
  // '전체' 레이어를 포함한 전체 UI용 레이어 목록
  const UILayers: { id: 'all' | DayLayer['id']; label: string }[] = [
    { id: 'all', label: '전체' },
    ...dayLayers,
  ];

  // 1. selectedLayer의 타입을 DayLayer['id'] 에서 동적으로 추론하도록 변경
  //    'all' 타입을 포함하여 유연성을 확보합니다.
  const [selectedLayer, setSelectedLayer] = useState<'all' | string>('all');

  // pois와 connections 데이터가 변경될 때마다 itinerary를 재구성합니다.
  // 이 로직 덕분에 새로고침 후에도 일정이 복원됩니다.
  React.useEffect(() => {
    const newItinerary: Record<string, Poi[]> = dayLayers.reduce(
      (acc, layer) => ({ ...acc, [layer.id]: [] }),
      {}
    );

    if (!pois || pois.length === 0 || !connections) {
      setItinerary(newItinerary);
      return;
    }

    const poiMap = new Map(pois.map((p) => [p.id, p]));

    for (const dayId in connections) {
      // newItinerary에 해당 dayId가 없으면 건너뜁니다. (오류 방지)
      if (!newItinerary[dayId]) {
        continue;
      }

      const dayConnections = connections[dayId] || [];
      if (dayConnections.length === 0) continue;

      // 모든 prev와 next ID를 집합으로 만듭니다.
      const allNextPoiIds = new Set(dayConnections.map((c) => c.nextPoiId));
      const allPrevPoiIds = new Set(dayConnections.map((c) => c.prevPoiId));

      // 경로의 시작점들을 찾습니다 (다른 연결의 next가 아닌 prev들).
      const startNodeIds = [...allPrevPoiIds].filter(
        (id) => !allNextPoiIds.has(id)
      );

      const visited = new Set(); // 순환 참조 방지를 위한 방문 기록

      // 각 시작점에서부터 경로를 재구성합니다.
      for (const startId of startNodeIds) {
        let currentPoiId: string | number | undefined = startId;
        while (currentPoiId && !visited.has(currentPoiId)) {
          visited.add(currentPoiId);
          const nextConnection = dayConnections.find(
            (c) => c.prevPoiId === currentPoiId
          );
          const poi = poiMap.get(currentPoiId);

          if (poi) {
            // 이전 POI에서 현재 POI로 오는 connection 정보를 찾습니다.
            const inboundConnection = dayConnections.find(
              (c) => c.nextPoiId === currentPoiId
            );
            // connection에 있는 distance와 duration을 poi 객체에 복사합니다.
            newItinerary[dayId].push({
              ...poi,
              // inboundConnection이 없을 수도 있으므로 optional chaining을 사용합니다.
              distance: inboundConnection?.distance,
              duration: inboundConnection?.duration,
            });
          }
          currentPoiId = nextConnection?.nextPoiId;
        }
      }
    }
    setItinerary(newItinerary);
  }, [pois, connections, dayLayers]);

  // 3. useDirections 훅을 사용하여 itinerary 기반으로 전체 경로를 가져옵니다.
  const { routePaths } = useDirections(itinerary);

  // 여행 일정에 장소를 추가하는 함수
  const addToItinerary = async (markerToAdd: Poi) => {
    if (!KAKAO_REST_API_KEY) {
      console.error('Kakao REST API Key가 설정되지 않았습니다.');
      alert('경로 계산 기능을 사용할 수 없습니다. API 키를 확인해주세요.');
      return;
    }

    const isAlreadyAdded = Object.values(itinerary)
      .flat()
      .some((item) => item.id === markerToAdd.id);

    if (isAlreadyAdded) {
      alert('이미 일정에 추가된 장소입니다.');
      return;
    }

    const targetDayId = markerToAdd.planDayId;
    if (!targetDayId) {
      alert('이 장소는 특정 날짜에 속해있지 않아 일정에 추가할 수 없습니다.');
      return;
    }

    const currentDayItinerary = itinerary[targetDayId] || [];
    const lastPoiInDay = currentDayItinerary[currentDayItinerary.length - 1];

    if (lastPoiInDay) {
      // 마지막 장소가 있으면, 카카오 API로 거리/시간을 계산한 후 서버로 보냅니다.
      let distance: number | undefined;
      let duration: number | undefined;

      try {
        const response = await axios.get(
          'https://apis-navi.kakaomobility.com/v1/directions',
          {
            headers: {
              Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
              'Content-Type': 'application/json',
            },
            params: {
              origin: `${lastPoiInDay.longitude},${lastPoiInDay.latitude}`,
              destination: `${markerToAdd.longitude},${markerToAdd.latitude}`,
            },
          }
        );

        const route = response.data.routes[0];
        if (route) {
          distance = route.summary.distance; // 미터(m) 단위
          duration = route.summary.duration; // 초(s) 단위
          console.log(
            `[${lastPoiInDay.placeName} -> ${markerToAdd.placeName}] 거리: ${distance}m, 시간: ${duration}s`
          );
        }
      } catch (error) {
        console.error('경로 거리/시간 계산 중 오류 발생:', error);
        // 오류가 발생해도 연결은 시도하되, 거리/시간 정보는 보내지 않습니다.
      }

      connectPoi({
        prevPoiId: lastPoiInDay.id,
        nextPoiId: markerToAdd.id,
        planDayId: targetDayId,
        distance,
        duration,
      });
    } else {
      // 해당 날짜의 첫 번째 장소이므로, 연결 정보 없이 마커 정보만 상태에 반영
      // (연결은 두 개 이상의 POI가 있을 때만 의미가 있음)
    }

    // 로컬 상태를 즉시 업데이트하여 UI에 반영합니다.
    // 어차피 'CONNECTED' 이벤트가 발생하면 useEffect에 의해 다시 계산되지만,
    // 사용자 경험을 위해 즉시 반영하는 것이 좋습니다.
    const newItineraryForDay = [...(itinerary[targetDayId] || []), markerToAdd];
    setItinerary({ ...itinerary, [targetDayId]: newItineraryForDay });
  };

  // 선택된 레이어에 따라 표시할 마커들을 결정
  const markersToDisplay =
    selectedLayer === 'all'
      ? pois || []
      : (pois || []).filter((p) => p.planDayId === selectedLayer);

  // 마커 위에 정보창(infowindow)을 표시하기 위한 상태
  const [openInfoWindow, setOpenInfoWindow] = useState<string | number | null>(
    null
  );

  // 지도 객체를 저장하기 위한 ref
  const mapRef = useRef<kakao.maps.Map>(null);

  // 검색 결과 클릭 시 지도를 해당 위치로 이동시키는 함수
  const handlePlaceClick = (place: KakaoPlace) => {
    const map = mapRef.current;
    if (!map) return;
    const moveLatLon = new window.kakao.maps.LatLng(
      Number(place.y),
      Number(place.x)
    );
    map.panTo(moveLatLon);
  };

  // 일정 패널의 POI 클릭 시 지도를 해당 위치로 이동시키는 함수
  const handlePoiClick = (poi: Poi) => {
    const map = mapRef.current;
    if (!map) return;
    const moveLatLon = new window.kakao.maps.LatLng(
      poi.latitude,
      poi.longitude
    );
    map.panTo(moveLatLon);
  };

  return (
    <div className="h-full relative">
      {isSyncing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="mt-4 text-lg text-gray-700">
            워크스페이스 데이터를 동기화하는 중입니다...
          </p>
        </div>
      )}

      <KakaoMap
        className="w-full h-full"
        ref={mapRef}
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
              if (
                !KAKAO_MAP_SERVICES_STATUS ||
                status !== KAKAO_MAP_SERVICES_STATUS.OK
              ) {
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

                  if (
                    KAKAO_MAP_SERVICES_STATUS &&
                    status === KAKAO_MAP_SERVICES_STATUS.OK
                  ) {
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
                  //    markPoi 함수를 호출하여 서버에 'mark' 이벤트를 보낸다.
                  //    id는 서버에서 생성되므로, 여기서는 제외한다.
                  markPoi({
                    planDayId: selectedLayer, // 현재 선택된 레이어 ID 저장
                    latitude: latlng.getLat(),
                    longitude: latlng.getLng(),
                    address: address,
                    categoryName: categoryName,
                    placeName: placeName, // 마커에 표시될 내용은 장소 이름으로 설정
                  });
                },
                {
                  location: latlng, // 현재 클릭한 좌표를 중심으로
                  radius: 50, // 50미터 반경 내에서 검색합니다.
                  sort: window.kakao.maps.services.SortBy?.DISTANCE, // 거리순으로 정렬
                }
              );
            }
          );
        }}
      >
        {markersToDisplay.map((marker) => (
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
                    {marker.categoryName && (
                      <div className="text-xs text-gray-500 mb-1">
                        {
                          // "음식점 > 한식 > 냉면" 같은 카테고리 문자열에서 마지막 부분만 추출
                          marker.categoryName.split(' > ').pop()
                        }
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mb-3">
                      {marker.address}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
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
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          unmarkPoi(marker.id);
                        }}
                      >
                        마커 삭제
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

        {/* useDirections 훅에서 받아온 실제 경로를 Polyline으로 렌더링 */}
        {dayLayers.map((layer) => {
          const shouldDisplay =
            selectedLayer === 'all' || selectedLayer === layer.id;
          const dayPath = routePaths[layer.id];
          return (
            shouldDisplay &&
            dayPath && (
              <Polyline
                key={layer.id}
                path={dayPath}
                strokeWeight={4} // 경로가 잘 보이도록 두께 조정
                strokeColor={layer.color}
                strokeOpacity={0.8}
                strokeStyle={'solid'}
              />
            )
          );
        })}

        <MapUI
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          UILayers={UILayers}
        />
        <SearchPanel onPlaceClick={handlePlaceClick} />
        <ItineraryPanel
          itinerary={itinerary}
          dayLayers={dayLayers}
          onPoiClick={handlePoiClick}
        />
      </KakaoMap>
    </div>
  );
}
