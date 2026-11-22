"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, ContactShadows, Environment, Lightformer, Line, RoundedBox, useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { INTRO, stageFloat } from "./journeyMath";

/**
 * The revenue cycle as a real-time 3D world (three.js via React Three Fiber). Five platforms,
 * left to right: front desk, coding office, clearinghouse, payer, revenue cycle team. Everything
 * is built from primitives, so there are no model downloads. A claim card rides a tube path
 * between the platforms; the camera follows it. Both are driven by `progress` (0–1), which the
 * page sets from scroll, so this component never re-renders while scrolling.
 */

const NAVY = "#24385a";
const INK = "#4a6382";
const SAGE = "#d7e8e1";
const SKY = "#dce8f5";
const SAND = "#f1e4d3";
const TEAL = "#3e827c";
const WHITE = "#ffffff";
const SKIN = "#e9d3bf";

export const STATIONS: { x: number; z: number; color: string }[] = [
  { x: -9, z: 0.6, color: SAGE },
  { x: -4.5, z: -0.6, color: SKY },
  { x: 0, z: 0.6, color: WHITE },
  { x: 4.5, z: -0.6, color: SAND },
  { x: 9, z: 0.6, color: SKY },
];
/** Which platform each of the ten stages happens on. */
export const STAGE_STATION = [0, 0, 0, 1, 1, 2, 3, 4, 4, 4];

function Mat({ color, rough = 0.75, emissive }: { color: string; rough?: number; emissive?: string }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.02} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.8 : 0} />;
}

function Box({ args, position, color, rough, radius = 0.04 }: { args: [number, number, number]; position: [number, number, number]; color: string; rough?: number; radius?: number }) {
  return (
    <RoundedBox args={args} radius={radius} smoothness={3} position={position} castShadow receiveShadow>
      <Mat color={color} rough={rough} />
    </RoundedBox>
  );
}

type Pose = "stand-woman" | "stand-man" | "stand-woman-2" | "stand-man-2" | "seat-woman" | "seat-man" | "seat-woman-2" | "seat-man-2";
const POSE_SIZE: Record<Pose, [number, number]> = {
  "stand-woman": [0.32, 1.08],
  "stand-man": [0.46, 1.08],
  "stand-woman-2": [0.31, 1.06],
  "stand-man-2": [0.4, 1.1],
  "seat-woman": [0.55, 0.95],
  "seat-man": [0.62, 0.95],
  "seat-woman-2": [0.52, 0.95],
  "seat-man-2": [0.58, 0.95],
};

/** A rendered character (cut out from a generated 3D render) that always faces the camera. */
function Person(props: { position: [number, number, number]; pose: Pose }) {
  return (
    <Suspense fallback={null}>
      <PersonCutout {...props} />
    </Suspense>
  );
}

function PersonCutout({ position, pose }: { position: [number, number, number]; pose: Pose }) {
  const tex = useTexture(`/images/people/${pose}.png`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const [w, h] = POSE_SIZE[pose];
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[w * 0.55, 32]} />
        <meshBasicMaterial color="#142338" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Billboard>
        <mesh position={[0, h / 2, 0.6]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.35} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function Monitor({ position, rotation = 0, glow = false }: { position: [number, number, number]; rotation?: number; glow?: boolean }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box args={[0.5, 0.32, 0.04]} position={[0, 0.2, 0]} color={NAVY} radius={0.02} />
      <mesh position={[0, 0.2, 0.022]}>
        <planeGeometry args={[0.44, 0.26]} />
        <Mat color={glow ? "#cfe6e0" : SKY} emissive={glow ? "#8fd0c4" : undefined} rough={0.4} />
      </mesh>
      <Box args={[0.05, 0.12, 0.05]} position={[0, 0, 0]} color={NAVY} radius={0.01} />
    </group>
  );
}

function Desk({ position, rotation = 0, screens = 1 }: { position: [number, number, number]; rotation?: number; screens?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box args={[1.1, 0.06, 0.55]} position={[0, 0.52, 0]} color={WHITE} />
      <Box args={[0.06, 0.5, 0.5]} position={[-0.5, 0.26, 0]} color={WHITE} radius={0.02} />
      <Box args={[0.06, 0.5, 0.5]} position={[0.5, 0.26, 0]} color={WHITE} radius={0.02} />
      {Array.from({ length: screens }, (_, i) => (
        <Monitor key={i} position={[(i - (screens - 1) / 2) * 0.52, 0.56, -0.12]} glow={i === 0} />
      ))}
    </group>
  );
}

function WaitingChair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <Box args={[0.42, 0.07, 0.42]} position={[0, 0.3, 0]} color={SAND} radius={0.03} />
      <Box args={[0.42, 0.38, 0.06]} position={[0, 0.52, -0.19]} color={SAND} radius={0.03} />
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} args={[0.035, 0.3, 0.035]} position={[x, 0.15, z]} color={NAVY} radius={0.01} />
      ))}
    </group>
  );
}

function FrontDesk() {
  return (
    <group>
      <Box args={[1.7, 0.6, 0.5]} position={[0, 0.3, 0.1]} color={NAVY} />
      <Box args={[1.8, 0.06, 0.62]} position={[0, 0.63, 0.1]} color={WHITE} />
      <Monitor position={[-0.2, 0.66, 0.12]} rotation={Math.PI - 0.25} glow />
      <Person position={[-0.15, 0, -0.42]} pose="stand-man-2" />
      <WaitingChair position={[-0.95, 0, 1.25]} />
      <WaitingChair position={[-0.45, 0, 1.25]} />
      <WaitingChair position={[0.05, 0, 1.25]} />
    </group>
  );
}

function CodingOffice() {
  return (
    <group>
      <Desk position={[-0.55, 0, -0.55]} rotation={Math.PI / 2} screens={2} />
      <Person position={[0.05, 0, -0.55]} pose="seat-woman" />
      <Desk position={[-0.55, 0, 0.75]} rotation={Math.PI / 2} screens={1} />
      <Person position={[0.05, 0, 0.75]} pose="seat-man-2" />
      <Box args={[0.3, 1.1, 0.8]} position={[-1.3, 0.55, 0.1]} color={WHITE} />
      <Box args={[0.26, 0.06, 0.7]} position={[-1.26, 0.75, 0.1]} color={SAND} radius={0.01} />
    </group>
  );
}

function Clearinghouse({ progress }: { progress: MutableRefObject<number> }) {
  const leds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    leds.current?.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const on = Math.sin(clock.elapsedTime * 4 + i * 1.7) > 0.2;
      m.emissiveIntensity = on ? 1.4 : 0.1;
    });
    void progress;
  });
  return (
    <group>
      {[-0.75, 0, 0.75].map((x) => (
        <group key={x} position={[x, 0, -0.2]}>
          <Box args={[0.6, 1.6, 0.7]} position={[0, 0.8, 0]} color={WHITE} />
          <Box args={[0.48, 1.4, 0.02]} position={[0, 0.82, 0.36]} color={NAVY} radius={0.01} />
        </group>
      ))}
      <group ref={leds}>
        {[-0.75, 0, 0.75].flatMap((x) =>
          [0.4, 0.75, 1.1, 1.45].map((y) => (
            <mesh key={`${x}-${y}`} position={[x - 0.12, y, 0.375]}>
              <boxGeometry args={[0.08, 0.04, 0.01]} />
              <meshStandardMaterial color={TEAL} emissive="#5fd3bd" emissiveIntensity={1} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function Payer() {
  return (
    <group>
      <Box args={[2.5, 0.14, 1.8]} position={[0, 0.07, 0]} color={"#e8d6bd"} />
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.62]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 1.36, 20]} />
          <Mat color={WHITE} />
        </mesh>
      ))}
      <Box args={[2.6, 0.14, 1.9]} position={[0, 1.56, 0]} color={WHITE} />
      <mesh position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[1, 1, 0.45]} castShadow>
        <cylinderGeometry args={[0.62, 0.62, 2.5, 3]} />
        <Mat color={WHITE} />
      </mesh>
      <Box args={[2.3, 1.36, 0.08]} position={[0, 0.82, -0.8]} color={SAND} />

    </group>
  );
}

function OpsFloor({ progress }: { progress: MutableRefObject<number> }) {
  const bars = useRef<THREE.Group>(null);
  const heights = [0.35, 0.5, 0.45, 0.65, 0.8];
  useFrame(() => {
    const p = THREE.MathUtils.clamp((progress.current - 0.62) / 0.3, 0, 1);
    bars.current?.children.forEach((c, i) => {
      const s = THREE.MathUtils.lerp(0.15, 1, THREE.MathUtils.clamp(p * 1.4 - i * 0.12, 0, 1));
      c.scale.y = s;
      c.position.y = 0.95 + (heights[i] * s) / 2;
    });
  });
  return (
    <group>
      <Box args={[2.4, 1.3, 0.1]} position={[0, 1.4, -1.35]} color={NAVY} />
      <group ref={bars} position={[-0.7, 0, -1.28]}>
        {heights.map((h, i) => (
          <mesh key={i} position={[i * 0.35, 0.95 + h / 2, 0]}>
            <boxGeometry args={[0.2, h, 0.04]} />
            <meshStandardMaterial color={i === heights.length - 1 ? "#8fd0c4" : SKY} emissive={i === heights.length - 1 ? "#5fd3bd" : "#000"} emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      {/* analysts at the back, facing their screens */}
      <Desk position={[-0.95, 0, -0.75]} rotation={Math.PI / 2} screens={2} />
      <Person position={[-0.35, 0, -0.75]} pose="seat-woman-2" />
      <Desk position={[-0.95, 0, 0.35]} rotation={Math.PI / 2} screens={2} />
      <Person position={[-0.35, 0, 0.35]} pose="seat-man" />
      {/* two leads in conversation at the front: he faces down-right, she faces down-left */}
      <Person position={[0.45, 0, 1.15]} pose="stand-man" />
      <Person position={[1.1, 0, 0.55]} pose="stand-woman" />
    </group>
  );
}

/** The claim's route as a thin dashed line in the air, flowing toward the next desk. */
function FlightPath({ points }: { points: THREE.Vector3[] }) {
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.material.dashOffset -= dt * 0.35;
  });
  return (
    <Line
      ref={ref as never}
      points={points}
      color="#3e827c"
      lineWidth={1.6}
      dashed
      dashSize={0.14}
      gapSize={0.1}
      transparent
      opacity={0.75}
    />
  );
}

function Platform({ color, children, x, z, index, progress }: { color: string; children: React.ReactNode; x: number; z: number; index: number; progress: MutableRefObject<number> }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const near = 1 - Math.min(1, Math.abs(stationFloat(progress.current) - index));
    const on = progress.current > INTRO * 0.5 ? near : 0;
    if (mat.current) mat.current.emissiveIntensity = THREE.MathUtils.damp(mat.current.emissiveIntensity, on * 0.12, 5, dt);
  });
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[3.4, 0.4, 3.4]} radius={0.2} smoothness={4} position={[0, -0.2, 0]} receiveShadow castShadow>
        <meshStandardMaterial ref={mat} color={color} roughness={0.85} emissive="#8fd0c4" emissiveIntensity={0} />
      </RoundedBox>

      {children}
    </group>
  );
}

/** A claim form drawn onto canvas: header, member and payer fields, service lines, totals. */
function useClaimTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 680;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 512, 680);
    g.fillStyle = "#142338";
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = "#ffffff";
    g.font = "600 22px Georgia, serif";
    g.fillText("Health insurance claim", 24, 40);
    g.font = "500 15px monospace";
    g.fillStyle = "#9fd8cc";
    g.fillText("#20481", 418, 40);
    const line = (y: number, w = 464, col = "#dce3ea") => {
      g.fillStyle = col;
      g.fillRect(24, y, w, 2);
    };
    const field = (x: number, y: number, label: string, val: string, w = 210) => {
      g.fillStyle = "#64758a";
      g.font = "500 11px monospace";
      g.fillText(label, x, y);
      g.fillStyle = "#142338";
      g.font = "600 16px sans-serif";
      g.fillText(val, x, y + 22);
      g.fillStyle = "#dce3ea";
      g.fillRect(x, y + 30, w, 1.5);
    };
    field(24, 96, "PATIENT", "J. Sample");
    field(278, 96, "MEMBER ID", "SPA-0000-1");
    field(24, 150, "PAYER", "Sample Payer A");
    field(278, 150, "AUTHORIZATION", "PA-77812");
    g.fillStyle = "#eef2f5";
    g.fillRect(24, 206, 464, 30);
    g.fillStyle = "#64758a";
    g.font = "600 11px monospace";
    ["CPT", "ICD-10", "UNITS", "CHARGE"].forEach((h, i) => g.fillText(h, 34 + i * 116, 226));
    const rows = [
      ["93306", "I50.9", "1", "$1,240.00"],
      ["93000", "R00.2", "1", "$86.40"],
      ["99214", "I50.9", "1", "$210.00"],
    ];
    rows.forEach((r, j) => {
      const y = 266 + j * 40;
      if (j === 0) {
        g.fillStyle = "#e2efec";
        g.fillRect(24, y - 24, 464, 36);
      }
      g.fillStyle = "#142338";
      g.font = "500 15px monospace";
      r.forEach((v, i) => g.fillText(v, 34 + i * 116, y));
      line(y + 12);
    });
    g.fillStyle = "#64758a";
    g.font = "600 11px monospace";
    g.fillText("TOTAL CHARGES", 278, 420);
    g.fillStyle = "#142338";
    g.font = "600 24px Georgia, serif";
    g.fillText("$1,536.40", 278, 452);
    g.fillStyle = "#3e827c";
    g.fillRect(24, 410, 180, 50);
    g.fillStyle = "#ffffff";
    g.font = "600 14px sans-serif";
    g.fillText("837 · SUBMITTED", 40, 441);
    for (let y = 496; y < 640; y += 26) line(y, 300 + ((y / 26) % 3) * 50);
    g.fillStyle = "#64758a";
    g.font = "500 10px monospace";
    g.fillText("ILLUSTRATIVE TEACHING DATA · NOT A REAL CLAIM", 24, 664);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

function Claim({ curve, progress }: { curve: THREE.CatmullRomCurve3; progress: MutableRefObject<number> }) {
  const g = useRef<THREE.Group>(null);
  const smooth = useRef(0);
  const tex = useClaimTexture();
  useFrame(({ clock }, dt) => {
    smooth.current = THREE.MathUtils.damp(smooth.current, stationFloat(progress.current) / 4, 6, dt);
    const t = THREE.MathUtils.clamp(smooth.current, 0, 1);
    const p = curve.getPoint(t);
    const ahead = curve.getPoint(Math.min(1, t + 0.004));
    if (!g.current) return;
    const time = clock.elapsedTime;
    g.current.position.set(p.x, p.y + Math.sin(time * 2) * 0.05, p.z);
    g.current.lookAt(ahead.x, g.current.position.y, ahead.z);
    g.current.rotateY(Math.PI / 2);
    g.current.rotateZ(Math.sin(time * 1.3) * 0.06);
    g.current.rotateX(0.35 + Math.sin(time * 1.7) * 0.05);
  });
  const W = 0.78;
  const H = W * (680 / 512);
  return (
    <group ref={g}>
      <mesh castShadow>
        <boxGeometry args={[W, 0.012, H]} />
        <meshStandardMaterial color="#f4f6f9" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.0065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
      <mesh position={[W / 2 - 0.07, 0.012, -H / 2 + 0.07]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <circleGeometry args={[0.07, 3]} />
        <meshStandardMaterial color="#dce3ea" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Scroll progress (0–1) → a position along the five platforms (0–4). */
export function stationFloat(p: number) {
  const f = stageFloat(p);
  const i = Math.floor(f);
  const a = STAGE_STATION[i];
  const b = STAGE_STATION[Math.min(i + 1, STAGE_STATION.length - 1)];
  return a + (b - a) * (f - i);
}

function Rig({ progress, pointer }: { progress: MutableRefObject<number>; pointer: MutableRefObject<[number, number]> }) {
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3(STATIONS[0].x, 0, STATIONS[0].z));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const s = stationFloat(progress.current);
    const i = Math.floor(s);
    const a = STATIONS[Math.min(i, 4)];
    const b = STATIONS[Math.min(i + 1, 4)];
    const f = s - i;
    // Wide at the very start (the whole cycle), then close on the claim's platform.
    const intro = THREE.MathUtils.clamp(progress.current / INTRO, 0, 1);
    // In the intro frame the whole cycle sits to the right of the headline (camera aims left of
    // centre); once the journey starts it centres on the claim's platform.
    const introX = size.width > 900 ? -7.5 : 0;
    tmp.set(THREE.MathUtils.lerp(introX, THREE.MathUtils.lerp(a.x, b.x, f), intro), 0.4, THREE.MathUtils.lerp(0, THREE.MathUtils.lerp(a.z, b.z, f), intro));
    target.current.x = THREE.MathUtils.damp(target.current.x, tmp.x, 4, dt);
    target.current.z = THREE.MathUtils.damp(target.current.z, tmp.z, 4, dt);
    const [px, py] = pointer.current;
    camera.position.set(target.current.x + 10 + px * 0.8, 9 + py * 0.5, target.current.z + 10);
    camera.lookAt(target.current.x, 0.4, target.current.z);
    const cam = camera as THREE.OrthographicCamera;
    const wide = size.width > 900 ? size.width / 30 : size.width / 22;
    const close = size.width < 640 ? Math.min(size.width / 4.6, size.height / 5) : Math.min(size.width / 7.5, size.height / 4.2);
    cam.zoom = THREE.MathUtils.damp(cam.zoom, THREE.MathUtils.lerp(wide, close, intro), 4, dt);
    cam.updateProjectionMatrix();
  });
  return null;
}

export default function CycleWorld({ progress, still = false, active = true }: { progress: MutableRefObject<number>; still?: boolean; active?: boolean }) {
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
  const pointer = useRef<[number, number]>([0, 0]);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        STATIONS.flatMap((s, i) => {
          const here = new THREE.Vector3(s.x, 2.0, s.z + 0.15);
          const n = STATIONS[i + 1];
          return n ? [here, new THREE.Vector3((s.x + n.x) / 2, 2.8, (s.z + n.z) / 2 + 0.15)] : [here];
        }),
        false,
        "catmullrom",
        0.5,
      ),
    [],
  );
  const flight = useMemo(() => curve.getPoints(260), [curve]);

  return (
    <Canvas
      orthographic
      shadows
      dpr={phone ? [1, 1.5] : [1, 1.75]}
      frameloop={!active ? "never" : still ? "demand" : "always"}
      camera={{ position: [10, 9, 10], zoom: 50, near: -100, far: 200 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMove={(e) => {
        const r = (e.target as HTMLElement).getBoundingClientRect();
        pointer.current = [((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2];
      }}
      aria-hidden
    >
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 6]} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#dce8f5" position={[8, 2, -4]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      </Environment>
      <hemisphereLight args={["#ffffff", "#e4ebf2", 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} castShadow shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0004} shadow-radius={6} />
      <Rig progress={progress} pointer={pointer} />

      <Platform {...STATIONS[0]} index={0} progress={progress}>
        <FrontDesk />
      </Platform>
      <Platform {...STATIONS[1]} index={1} progress={progress}>
        <CodingOffice />
      </Platform>
      <Platform {...STATIONS[2]} index={2} progress={progress}>
        <Clearinghouse progress={progress} />
      </Platform>
      <Platform {...STATIONS[3]} index={3} progress={progress}>
        <Payer />
      </Platform>
      <Platform {...STATIONS[4]} index={4} progress={progress}>
        <OpsFloor progress={progress} />
      </Platform>

      <FlightPath points={flight} />
      <Claim curve={curve} progress={progress} />

      <ContactShadows position={[0, -0.41, 0]} opacity={0.38} scale={44} blur={3} far={8} resolution={phone ? 512 : 1024} />
    </Canvas>
  );
}
