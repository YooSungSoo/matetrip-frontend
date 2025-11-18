import type { TravelStyleType } from '../constants/travelStyle';
import type { TravelTendencyType } from '../constants/travelTendencyType';
import type { KeywordValue } from '../utils/keyword';
import type { PostStatus, Participation } from './post';

export type KeywordType = string;

export interface MatchRecruitingPostDto {
  id: string;
  title: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  maxParticipants: number;
  keywords: KeywordValue[];
  status?: PostStatus;
  imageId?: string | null;
  writerId?: string;
  createdAt?: string;
  content?: string;
  participations?: Participation[];
}

export interface MatchCandidateDto {
  userId: string;
  score: number;
  vectorScore: number;
  styleScore: number;
  tendencyScore: number;
  overlappingTravelStyles: TravelStyleType[];
  overlappingTendencies: TravelTendencyType[];
  mbtiMatchScore: number;
  recruitingPosts?: MatchRecruitingPostDto[];
}

export interface MatchResponseDto {
  matches: MatchCandidateDto[];
}

export interface MatchingInfo {
  /** 매칭 스코어 (0-100) */
  score: number;
  /**
   * 여행 성향 키워드 (예: "즉흥적, 주도적")
   */
  tendency?: string;
  /**
   * 여행 스타일 키워드 (예: "호텔")
   */
  style?: string;
  /**
   * 프로필 유사도 (0-100)
   */
  vectorscore?: number;
  /**
   * 매너온도 (35.0-40.0)
   * TODO: 향후 API 연동 시 백엔드에서 제공
   */
  mannerTemperature?: number;
}
