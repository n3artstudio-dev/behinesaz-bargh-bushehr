import { PAD_DEFS, WORLD_INFO } from "../game/worlds";
import { useGame } from "../game/store";

interface Props {
  size: number;
  labels?: boolean;
  region?: number;
}

// world → map coordinate window
function win(region: number) {
  const info = WORLD_INFO[region - 1];
  return { WX0: -45, WX1: 45, WZ0: info.z0, WZ1: info.z1 };
}

export default function MapView({ size, labels, region = 1 }: Props) {
  const player = useGame((s) => s.playerPos);
  const missions = useGame((s) => s.missions);
  const onRoof = useGame((s) => s.onRoof);
  const neighborhood = useGame((s) => s.neighborhood);
  const worldPads = useGame((s) => s.worldPads);
  const { WX0, WX1, WZ0, WZ1 } = win(region);
  const w = size;
  const h = (size * (WZ1 - WZ0)) / (WX1 - WX0);
  const sx = (x: number) => ((x - WX0) / (WX1 - WX0)) * w;
  const sz = (z: number) => ((z - WZ0) / (WZ1 - WZ0)) * h;
  const activeMission = missions.find((m) => m.state === "active");
  const done1 = missions[0].state === "done";

  // target marker
  let target: { x: number; z: number } | null = null;
  const pads = PAD_DEFS.filter((p) => p.world === region);
  if (region === 1 && activeMission) {
    const o = activeMission.objectives.find((x) => !x.done);
    if (activeMission.id === 1) target = o?.id === "talk" ? { x: -7, z: 12.5 } : { x: -13, z: 16 };
    else if (activeMission.id === 2) target = o?.id === "roof" ? { x: -11.2, z: 8.5 } : { x: -17, z: 15 };
    else target = { x: 10.5, z: 3 };
    // نشانگر مأموریت ایمنی بعد از مأموریت اول
    if (missions[0]?.state === "done") {
      if (!worldPads.includes("safety_kid")) target = { x: -5.0, z: 75 };
      else if (!worldPads.includes("safety_flag")) target = { x: 9.2, z: 96 };
    }
  } else if (region >= 2) {
    const next = pads.find((p) => !worldPads.includes(p.id));
    if (next) target = { x: next.x, z: next.z };
  }

  const houses: [number, number, number, number, string][] = [
    [-23, 10, 14, 12, "#e9dcc0"],
    [-22, -5, 12, 10, "#e9dcc0"],
    [11, 16, 12, 12, "#d7d2c8"],
    [12, 0, 8, 6, "#f2c987"],
    [-23, 35, 12, 10, "#e9dcc0"],
    [11, 38, 12, 12, "#e9dcc0"],
    [-23, 53, 12, 10, "#e9dcc0"],
    [11, 53, 12, 10, "#d7d2c8"],
    [-18, 67, 16, 10, "#e9dcc0"],
    [2, 67, 16, 10, "#e9dcc0"],
  ];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", borderRadius: 14 }}>
      <rect x={0} y={0} width={w} height={h} fill="#d9c79f" />
      {region === 1 && (
        <>
          <rect x={0} y={0} width={w} height={sz(-18)} fill="#1f7fc4" />
          <rect x={sx(6.2)} y={0} width={sx(9.8) - sx(6.2)} height={h} fill="#a4744a" />
          <rect x={sx(-4)} y={0} width={sx(4) - sx(-4)} height={h} fill="#6f7074" />
          <circle cx={sx(0)} cy={sz(48)} r={sx(13) - sx(0)} fill="#9a917f" />
          <circle cx={sx(0)} cy={sz(48)} r={sx(2.5) - sx(0)} fill="#43c7e0" />
          {houses.map(([x, z, hw, hd, c], i) => (
            <rect key={i} x={sx(x)} y={sz(z)} width={sx(x + hw) - sx(x)} height={sz(z + hd) - sz(z)} fill={i === 0 && done1 ? "#bde8a8" : c} stroke="#6b5a3e" strokeWidth={1} rx={2} />
          ))}
          <rect x={sx(-17)} y={sz(46)} width={sx(-11) - sx(-17)} height={sz(50) - sz(46)} fill="#3f7a4a" stroke="#1f3a2a" rx={2} />
          {/* ساختمان شرکت توزیع برق */}
          <rect x={sx(10.4)} y={sz(33.6)} width={sx(24.2) - sx(10.4)} height={sz(46.4) - sz(33.6)} fill="#d9c08a" stroke="#7a5a30" rx={2} />
          {/* مسجد و مأموریت ایمنی */}
          <rect x={sx(9.3)} y={sz(82.8)} width={sx(20.7) - sx(9.3)} height={sz(93.2) - sz(82.8)} fill="#3aa788" stroke="#1d5c4a" rx={8} />
          {!worldPads.includes("safety_kid") && <circle cx={sx(-5.0)} cy={sz(75)} r={6} fill="#7fb6ff" stroke="#1d4f9a" strokeWidth={1.5} />}
          {!worldPads.includes("safety_flag") && <circle cx={sx(9.2)} cy={sz(96)} r={6} fill="#7fb6ff" stroke="#1d4f9a" strokeWidth={1.5} />}
        </>
      )}
      {region === 2 && (
        <>
          <rect x={sx(-4)} y={0} width={sx(4) - sx(-4)} height={h} fill="#6f7074" />
          {[
            [-13, 130],
            [13, 138],
            [-13, 214],
            [13, 222],
          ].map(([x, z], i) => (
            <rect key={i} x={sx(x - 3.5)} y={sz(z - 3.5)} width={sx(x + 3.5) - sx(x - 3.5)} height={sz(z + 3.5) - sz(z - 3.5)} fill="#e9dcc0" stroke="#6b5a3e" rx={2} />
          ))}
          {pads.map((p) => (
            <rect key={p.id} x={sx(p.x - 3)} y={sz(p.z - 2)} width={sx(p.x + 3) - sx(p.x - 3)} height={sz(p.z + 2) - sz(p.z - 2)} fill={worldPads.includes(p.id) ? "#7fc4ff" : "#ffe08a"} stroke="#a07000" rx={2} />
          ))}
        </>
      )}
      {region === 3 && (
        <>
          <rect x={sx(-4)} y={0} width={sx(4) - sx(-4)} height={h} fill="#6f7074" />
          {pads.map((p) => (
            <g key={p.id}>
              <circle cx={sx(p.x)} cy={sz(p.z)} r={7} fill={worldPads.includes(p.id) ? "#8fe6ff" : "#fff"} stroke="#1f7f9e" strokeWidth={2} />
              <text x={sx(p.x)} y={sz(p.z) + 4} fontSize={9} textAnchor="middle">💨</text>
            </g>
          ))}
        </>
      )}
      {region === 4 && (
        <>
          <rect x={sx(-4)} y={0} width={sx(4) - sx(-4)} height={h} fill="#6f7074" />
          <circle cx={sx(-14)} cy={sz(470)} r={sx(11) - sx(0)} fill="#e6ebf2" stroke="#8a93a3" />
          <rect x={sx(-9)} y={sz(456)} width={sx(13) - sx(-9)} height={sz(468) - sz(456)} fill="#e6ebf2" stroke="#8a93a3" />
          {pads.map((p) => (
            <g key={p.id}>
              <rect x={sx(p.x) - 7} y={sz(p.z) - 7} width={14} height={14} rx={3} fill={worldPads.includes(p.id) ? "#d4b3ff" : "#fff"} stroke="#6a3aa0" strokeWidth={2} />
            </g>
          ))}
        </>
      )}
      {region === 5 && (
        <>
          <rect x={sx(-4)} y={0} width={sx(4) - sx(-4)} height={h} fill="#6f7074" />
          {/* ویلا */}
          <rect x={sx(-21.7)} y={sz(568.3)} width={sx(-10.3) - sx(-21.7)} height={sz(581.7) - sz(568.3)} fill="#f4f1ea" stroke="#8a8270" rx={2} />
          {/* تابلوی هوشمند */}
          <rect x={sx(9)} y={sz(545)} width={sx(14) - sx(9)} height={sz(552) - sz(545)} fill="#0c2350" stroke="#ffd23a" rx={2} />
          {pads.map((p) => {
            const done = worldPads.includes(p.id);
            const col = p.id.startsWith("miner") ? (done ? "#9ad6ff" : "#ff8a80") : p.id.startsWith("led") ? (done ? "#7be08a" : "#c9f2c0") : p.id === "crypto_door" ? (done ? "#9ad6ff" : "#ffd23a") : "#fff";
            return <circle key={p.id} cx={sx(p.x)} cy={sz(p.z)} r={6} fill={col} stroke="#7a2020" strokeWidth={1.5} />;
          })}
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
