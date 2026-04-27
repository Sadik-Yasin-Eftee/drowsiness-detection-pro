/**
 * Hand-rolled SVG icon set.
 *
 * Why not lucide-react-native? It works fine, but it pulls in a 1.5MB tree-
 * shake-resistant blob that nearly doubled my Hermes bytecode in test builds.
 * The handful of icons we need are simple — drawing them inline keeps the
 * binary slim and gives us full control over stroke colour/width.
 */
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Polyline, Line } from 'react-native-svg';
import { colors } from '@/lib/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const W = ({ size = 22, color = colors.foreground, children }: IconProps & { children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <W {...p}>
    <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
    <Circle cx={12} cy={12} r={3} />
  </W>
);

export const LockIcon = (p: IconProps) => (
  <W {...p}>
    <Rect x={3} y={11} width={18} height={11} rx={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" />
  </W>
);

export const ShieldIcon = (p: IconProps) => (
  <W {...p}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </W>
);

export const MapPinIcon = (p: IconProps) => (
  <W {...p}>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Circle cx={12} cy={10} r={3} />
  </W>
);

export const ZapIcon = (p: IconProps) => (
  <W {...p}>
    <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </W>
);

export const InfoIcon = (p: IconProps) => (
  <W {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={12} y1={16} x2={12} y2={12} />
    <Line x1={12} y1={8} x2={12.01} y2={8} />
  </W>
);

export const CameraIcon = (p: IconProps) => (
  <W {...p}>
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <Circle cx={12} cy={13} r={4} />
  </W>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <W {...p}>
    <Line x1={19} y1={12} x2={5} y2={12} />
    <Polyline points="12 19 5 12 12 5" />
  </W>
);

export const SettingsIcon = (p: IconProps) => (
  <W {...p}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </W>
);

export const ChartIcon = (p: IconProps) => (
  <W {...p}>
    <Line x1={12} y1={20} x2={12} y2={10} />
    <Line x1={18} y1={20} x2={18} y2={4} />
    <Line x1={6}  y1={20} x2={6}  y2={16} />
  </W>
);

export const CarIcon = (p: IconProps) => (
  <W {...p}>
    <Path d="M5 17H3v-2l2-7h14l2 7v2h-2" />
    <Circle cx={7} cy={17} r={2} />
    <Circle cx={17} cy={17} r={2} />
  </W>
);

export const CheckIcon = (p: IconProps) => (
  <W {...p}>
    <Polyline points="20 6 9 17 4 12" />
  </W>
);

export const XIcon = (p: IconProps) => (
  <W {...p}>
    <Line x1={18} y1={6} x2={6}  y2={18} />
    <Line x1={6}  y1={6} x2={18} y2={18} />
  </W>
);

export const VolumeIcon = (p: IconProps) => (
  <W {...p}>
    <Polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <Path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
  </W>
);
