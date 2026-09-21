import { useGame } from "../game/store";

interface Props {
  size: number;
  labels?: boolean;
}

// world → map: x ∈ [-45,45], z ∈ [-48,92]
const WX0 = -45,
  WX1 = 45,
  WZ0 = -48,
  WZ1 = 92;

export default function MapView({ size, labels }: Props) {
  const player = useGame((s) => s.playerPos);
  const missions = useGame((s) => s.missions);
  const onRoof = useGame((s) => s.onRoof);
  const neighborhood = useGame((s) => s.neighborhood);
  const w = size;
  const h = (size * (WZ1 - WZ0)) / (WX1 - WX0);
  const sx = (x: number) => ((x - WX0) / (WX1 - WX0)) * w;
  const sz = (z: number) => ((z - WZ0) / (WZ1 - WZ0)) * h;
  const active = missions.find((m) => m.state === "active");
  let target: { x: number; z: number } | null = null;
  if (active) {
    const o = active.objectives.find((x) => !x.done);
    if (active.id === 1) target = o?.id === "talk" ? { x: -7, z: 12.5 } : { x: -13, z: 16 };
    else if (active.id === 2) target = o?.id === "roof" ? { x: -11.2, z: 8.5 } : { x: -17, z: 15 };
    else target = { x: 10.5, z: 3 };
  }
  const houses: [number, number, number, number, string, string][] = [
    [-23, 10, 14, 12, "#e9dcc0", "خانه فاطمه"],
    [-22, -5, 12, 10, "#e9dcc0", ""],
    [11, 16, 12, 12, "#d7d2c8", "آپارتمان"],
    [12, 0, 8, 6, "#f2c987", "فروشگاه"],
    [-23, 35, 12, 10, "#e9dcc0", ""],
    [11, 38, 12, 12, "#e9dcc0", ""],
    [-23, 53, 12, 10, "#e9dcc0", ""],
    [11, 53, 12, 10, "#d7d2c8", ""],
    [-18, 67, 16, 10, "#e9dcc0", ""],
    [2, 67, 16, 10, "#e9dcc0", ""],
  ];
  const done1 = missions[0].state === "done";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", borderRadius: 14 }}>
      <defs>
        <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a63b8" />
          <stop offset="1" stopColor="#38d0d8" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="#d9c79f" />
      <rect x={0} y={0} width={w} height={sz(-18)} fill="url(#seaG)" />
      <rect x={0} y={sz(-18)} width={w} height={sz(-8) - sz(-18)} fill="#b8ad95" />
      <rect x={sx(6.2)} y={sz(-43)} width={sx(9.8) - sx(6.2)} height={sz(-17) - sz(-43)} fill="#a4744a" />
      <rect x={sx(-4)} y={sz(-8)} width={sx(4) - sx(-4)} height={sz(72) - sz(-8)} fill="#6f7074" />
      <circle cx={sx(0)} cy={sz(48)} r={sx(13) - sx(0)} fill="#9a917f" />
      <circle cx={sx(0)} cy={sz(48)} r={sx(2.5) - sx(0)} fill="#43c7e0" />
      {houses.map(([x, z, hw, hd, c, l], i) => (
        <g key={i}>
          <rect x={sx(x)} y={sz(z)} width={sx(x + hw) - sx(x)} height={sz(z + hd) - sz(z)} fill={i === 0 && done1 ? "#bde8a8" : c} stroke="#6b5a3e" strokeWidth={1} rx={2} />
          {labels && l && (
            <text x={sx(x + hw / 2)} y={sz(z + hd / 2) + 4} fontSize={11} textAnchor="middle" fill="#1b2a44" fontWeight={700}>
              {l}
            </text>
          )}
        </g>
      ))}
      <rect x={sx(-17)} y={sz(46)} width={sx(-11) - sx(-17)} height={sz(50) - sz(46)} fill="#3f7a4a" stroke="#1f3a2a" rx={2} />
      {labels && (
        <>
          <text x={sx(-14)} y={sz(53)} fontSize={10} textAnchor="middle" fill="#1b2a44" fontWeight={700}>
            پست برق
          </text>
          <text x={sx(0)} y={sz(-30)} fontSize={13} textAnchor="middle" fill="#ffffff" fontWeight={900}>
            خلیج فارس
          </text>
          <text x={sx(8)} y={sz(-45)} fontSize={9} textAnchor="middle" fill="#fff">
            اسکله
          </text>
          <text x={sx(0)} y={sz(60)} fontSize={10} textAnchor="middle" fill="#1b2a44" fontWeight={700}>
            میدان محله
          </text>
          <text x={sx(0)} y={sz(30)} fontSize={9} textAnchor="middle" fill="#fff" transform={`rotate(90 ${sx(0)} ${sz(30)})`}>
            خیابان نخل
          </text>
        </>
      )}
      {target && (
        <g transform={`translate(${sx(target.x)} ${sz(target.z)})`}>
          <circle r={7} fill="#ffd23a" stroke="#7a4a00" strokeWidth={2}>
            <animate attributeName="r" values="6;9;6" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <text y={4} fontSize={9} textAnchor="middle" fontWeight={900} fill="#5a3200">
            !
          </text>
        </g>
      )}
      <g transform={`translate(${sx(player.x)} ${sz(player.z)}) rotate(${(-player.yaw * 180) / Math.PI + 180})`}>
        <polygon points="0,-8 6,6 0,3 -6,6" fill={onRoof ? "#ff7ad9" : "#ff3ea5"} stroke="#fff" strokeWidth={1.5} />
      </g>
      {labels && (
        <text x={w - 6} y={h - 8} fontSize={10} textAnchor="end" fill="#1b2a44" fontWeight={700}>
          پیشرفت محله {Math.round(neighborhood)}٪
        </text>
      )}
    </svg>
  );
}
