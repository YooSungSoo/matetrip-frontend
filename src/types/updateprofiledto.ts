import type { GenderType } from '../constants/gender';
import type { MbtiType } from '../constants/mbti';
import type { TravelStyleType } from '../constants/travelStyle';
import type { TravelTendencyType } from '../constants/travelTendencyType';
export interface UpdateProfileDto {
  nickname: string;
  //gender: GenderType; // '남성' | '여성' (서버 enum 값과 동일)
  intro: string;
  description: string;
  travelStyles: TravelStyleType[]; // 서버 TravelStyleType enum 값 배열
  tendency: TravelTendencyType[]; // 서버 TendencyType 값 배열
  //mbtiTypes: MbtiType; // 16가지 MBTI 중 하나
  profileImageId: string | null; // 없으면 null로 보내면 OK
}
