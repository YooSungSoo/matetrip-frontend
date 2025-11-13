import type {
  Poi,
  CreatePoiDto,
  MapClickEffect,
  HoveredPoiInfo,
  UserCursor,
} from '../hooks/usePoiSocket';
import type { WorkspaceMember } from './member';

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
}

export interface DayLayer {
  id: string;
  label: string;
  color: string;
}

export interface RouteSegment {
  fromPoiId: string;
  toPoiId: string;
  duration: number; // seconds
  distance: number; // meters
  path: { lat: number; lng: number }[];
}

// 채팅 메시지 타입을 정의합니다.
export interface ChatMessage {
  userId: string;
  message: string;
  avatar?: string; // [추가] 프로필 이미지 URL을 위한 속성
}

// 카카오내비 API 응답 타입을 위한 인터페이스 추가
export interface KakaoNaviRoad {
  name: string;
  distance: number;
  duration: number;
  traffic_speed: number;
  traffic_state: number;
  vertexes: number[];
}

export interface KakaoNaviSection {
  distance: number;
  duration: number;
  roads: KakaoNaviRoad[];
  guides: KakaoNaviGuide[];
}

// [추가] 카카오내비 API 응답 타입 - guides
export interface KakaoNaviGuide {
  name: string;
  x: number;
  y: number;
  distance: number;
  duration: number;
  type: number;
  guidance: string;
  road_index: number;
}

export interface MapPanelProps {
  itinerary: Record<string, Poi[]>;
  dayLayers: DayLayer[];
  pois: Poi[];
  isSyncing: boolean;
  markPoi: (
    poiData: Omit<CreatePoiDto, 'workspaceId' | 'createdBy' | 'id'>
  ) => void;
  selectedPlace: KakaoPlace | null;
  mapRef: React.RefObject<kakao.maps.Map | null>;
  hoveredPoiInfo: HoveredPoiInfo | null;
  unmarkPoi: (poiId: string) => void;
  setSelectedPlace: (place: KakaoPlace | null) => void;
  onRouteInfoUpdate?: (routeInfo: Record<string, RouteSegment[]>) => void;
  onRouteOptimized?: (dayId: string, optimizedPoiIds: string[]) => void;
  optimizingDayId?: string | null;
  onOptimizationComplete?: () => void;
  latestChatMessage?: ChatMessage | null;
  workspaceId: string;
  members: WorkspaceMember[];
  cursors: Record<string, Omit<UserCursor, 'userId'>>;
  moveCursor: (position: { lat: number; lng: number }) => void;
  clickEffects: MapClickEffect[];
  clickMap: (position: { lat: number; lng: number }) => void;
  visibleDayIds: Set<string>;
}

export interface PoiMarkerProps {
  poi: Poi;
  markerLabel?: string;
  markerColor?: string;
  isHovered: boolean;
  unmarkPoi: (poiId: string) => void;
  isOverlayHoveredRef: React.MutableRefObject<boolean>;
}

export interface DayRouteRendererProps {
  layer: DayLayer;
  itinerary: Record<string, Poi[]>;
  dailyRouteInfo: Record<string, RouteSegment[]>;
  visibleDayIds: Set<string>;
}
