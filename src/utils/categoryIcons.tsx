import type { CSSProperties, ComponentType } from 'react';
import {
  GraduationCap,
  BookOpen,
  Settings2,
  Server,
  Handshake,
  PlayCircle,
  CheckCircle2,
  Smile,
  Compass,
  Sparkles,
  MapPin,
  Factory,
  Globe2,
  Layers,
} from 'lucide-react';

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

// 지표 대분류 이름에 포함된 키워드로 아이콘을 매칭한다 (실제 시트 문구가 조금씩 달라도
// 대응하도록 정확한 이름이 아닌 키워드 포함 여부로 판단). 위에서부터 먼저 매칭되는 규칙이 적용된다.
const RULES: [string, IconComponent][] = [
  ['교원', GraduationCap],
  ['교육과정', BookOpen],
  ['제도', Settings2],
  ['인프라', Server],
  ['산학', Handshake],
  ['콘텐츠', PlayCircle],
  ['이수', CheckCircle2],
  ['만족도', Smile],
  ['진로', Compass],
  ['대학혁신', Sparkles],
  ['지역혁신', MapPin],
  ['산업혁신', Factory],
  ['글로벌', Globe2],
];

export function getCategoryIcon(category: string): IconComponent {
  const normalized = category.replace(/[\s·]+/g, '');
  const match = RULES.find(([keyword]) => normalized.includes(keyword));
  return match ? match[1] : Layers;
}
