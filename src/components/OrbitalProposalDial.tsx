import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cpu,
  Crown,
  Flame,
  Globe2,
  GripHorizontal,
  HardHat,
  Maximize2,
  Minimize2,
  Pickaxe,
  X,
  Zap,
} from 'lucide-react';
import { KhatamProposalDocument } from '../data/khatamProposalsData';

interface OrbitalProposalDialProps {
  proposals: KhatamProposalDocument[];
  activeProposalId: string;
  viewMode: 'interactive' | 'brochure';
  onSelectProposal: (proposalId: string) => void;
  onOpenHub: () => void;
  onToggleViewMode: (mode: 'interactive' | 'brochure') => void;
  onClose?: () => void;
}

interface NodeMeta {
  id: string;
  angleDeg: number;
  shortTitle: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DIAL_ORBITAL_NODES: NodeMeta[] = [
  {
    id: 'khatam-02',
    angleDeg: -90,
    shortTitle: 'ستاد مرکز و معاونت‌ها',
    color: '#0EA5E9',
    icon: Building2,
  },
  {
    id: 'khatam-03',
    angleDeg: -45,
    shortTitle: 'نفت، گاز و پتروشیمی',
    color: '#38BDF8',
    icon: Flame,
  },
  {
    id: 'khatam-04',
    angleDeg: 0,
    shortTitle: 'راه و شهرسازی',
    color: '#14B8A6',
    icon: HardHat,
  },
  {
    id: 'khatam-05',
    angleDeg: 45,
    shortTitle: 'نیرو (آب، برق و کشاورزی)',
    color: '#10B981',
    icon: Zap,
  },
  {
    id: 'khatam-06',
    angleDeg: 90,
    shortTitle: 'هلدینگ تخصصی دریایی',
    color: '#3B82F6',
    icon: Anchor,
  },
  {
    id: 'khatam-07',
    angleDeg: 135,
    shortTitle: 'صنعت و معدن',
    color: '#F59E0B',
    icon: Pickaxe,
  },
  {
    id: 'khatam-08',
    angleDeg: 180,
    shortTitle: 'فناوری اطلاعات (سماوات)',
    color: '#818CF8',
    icon: Cpu,
  },
  {
    id: 'khatam-09',
    angleDeg: -135,
    shortTitle: 'هلدینگ برون‌مرزی',
    color: '#A78BFA',
    icon: Globe2,
  },
];

const DIAL_TICK_ANGLES = Array.from({ length: 24 }, (_, idx) => idx * 15);

export const OrbitalProposalDial: React.FC<OrbitalProposalDialProps> = ({
  proposals,
  activeProposalId,
  viewMode,
  onSelectProposal,
  onOpenHub,
  onToggleViewMode,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1080 : false
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragState = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 20,
    origY: 20,
  });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dialAreaRef = useRef<HTMLDivElement | null>(null);
  const lastWheelAtRef = useRef<number>(0);

  const activeIndex = useMemo(() => {
    const idx = proposals.findIndex((p) => p.id === activeProposalId);
    return idx >= 0 ? idx : 0;
  }, [proposals, activeProposalId]);

  const stepProposalRef = useRef<(delta: number) => void>(() => {});
  stepProposalRef.current = (delta: number) => {
    if (proposals.length === 0) return;
    const nextIdx = (activeIndex + delta + proposals.length) % proposals.length;
    onSelectProposal(proposals[nextIdx].id);
  };

  useEffect(() => {
    const clampPosition = (candidateX: number, candidateY: number) => {
      const panelW = panelRef.current?.offsetWidth || 236;
      const panelH = panelRef.current?.offsetHeight || 310;
      const maxX = Math.max(10, window.innerWidth - panelW - 10);
      const maxY = Math.max(10, window.innerHeight - panelH - 10);
      return {
        x: Math.min(Math.max(10, candidateX), maxX),
        y: Math.min(Math.max(10, candidateY), maxY),
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState.current.active) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = dragState.current.startY - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragState.current.moved = true;
      }
      setPos(
        clampPosition(
          dragState.current.origX + dx,
          dragState.current.origY + dy
        )
      );
    };

    const handlePointerUp = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setIsDragging(false);
    };

    const handleResize = () => {
      setPos((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Attach native non-passive wheel listener so mouse-wheel rotation stops page scroll cleanly
  useEffect(() => {
    const el = dialAreaRef.current;
    if (!el || isMinimized) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastWheelAtRef.current < 110) return;
      lastWheelAtRef.current = now;

      if (e.deltaY > 0 || e.deltaX > 0) {
        stepProposalRef.current(1);
      } else if (e.deltaY < 0 || e.deltaX < 0) {
        stepProposalRef.current(-1);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isMinimized]);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) {
      return;
    }
    e.preventDefault();
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setIsDragging(true);
  };

  const displayId = hoveredId || activeProposalId || 'khatam-01';
  const activeProposal = useMemo(
    () => proposals.find((p) => p.id === displayId) || proposals[0],
    [proposals, displayId]
  );
  const activeOrbitalMeta = useMemo(
    () => DIAL_ORBITAL_NODES.find((n) => n.id === displayId) || null,
    [displayId]
  );
  const selectedOrbitalMeta = useMemo(
    () => DIAL_ORBITAL_NODES.find((n) => n.id === activeProposalId) || null,
    [activeProposalId]
  );

  const dialSize = 208;
  const center = dialSize / 2;
  const orbitRadius = 75;

  // CSS rotate angle where 0deg points straight up (12 o'clock / khatam-02 at -90deg)
  const pointerRotationCssDeg = useMemo(() => {
    const target = activeOrbitalMeta || selectedOrbitalMeta;
    if (!target) return 0;
    return target.angleDeg + 90;
  }, [activeOrbitalMeta, selectedOrbitalMeta]);

  const showOrbitalNeedle = Boolean(activeOrbitalMeta || selectedOrbitalMeta);

  if (isMinimized) {
    const CurrentIcon =
      DIAL_ORBITAL_NODES.find((n) => n.id === activeProposalId)?.icon || Crown;
    const currentNum =
      proposals.find((p) => p.id === activeProposalId)?.proposalNum || '۱';

    return (
      <div
        ref={panelRef}
        style={{
          left: `${pos.x}px`,
          bottom: `${pos.y}px`,
        }}
        className="no-print no-print-admin-ignore fixed z-40 select-none touch-none"
      >
        <div
          onPointerDown={startDrag}
          className={`group relative flex items-center gap-2 p-1 pr-2.5 rounded-full bg-[#071928]/95 backdrop-blur-md border border-[#37A3DC]/55 shadow-2xl text-white transition-transform duration-150 ${
            isDragging ? 'cursor-grabbing scale-[1.03]' : 'cursor-grab'
          }`}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="بستن پنل ولوم"
              className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <div className="text-right pl-0.5">
            <span className="text-[9.5px] text-amber-300 font-extrabold block leading-tight tabular-nums">
              پروپوزال {currentNum} از ۹
            </span>
            <span className="text-[10.5px] font-extrabold text-white max-w-[106px] truncate block leading-tight">
              {activeProposal?.recipientShortOnCover}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="باز کردن کنترلر دایره‌ای ولوم پروپوزال‌ها"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0284C7] via-[#0E7490] to-[#0B253A] border border-sky-300/70 flex items-center justify-center relative shadow-md hover:scale-105 transition-transform cursor-pointer shrink-0"
          >
            <CurrentIcon className="w-4 h-4 text-white" />
            <Maximize2 className="w-2.5 h-2.5 text-amber-300 absolute bottom-0.5 right-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        left: `${pos.x}px`,
        bottom: `${pos.y}px`,
      }}
      className="no-print no-print-admin-ignore fixed z-40 w-[236px] select-none"
    >
      <div
        onPointerDown={startDrag}
        className={`rounded-3xl bg-gradient-to-b from-[#071928]/95 via-[#0B253A]/95 to-[#0D2C44]/95 backdrop-blur-md border border-[#37A3DC]/50 shadow-[0_20px_48px_rgba(7,25,40,0.55)] text-white overflow-hidden transition-transform duration-150 ${
          isDragging ? 'cursor-grabbing scale-[1.01]' : 'cursor-grab'
        }`}
      >
        {/* Top Handle & Window Actions */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 touch-none"
          title="برای جابجایی پنل روی صفحه بکشید"
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-sky-200">
            <GripHorizontal className="w-3.5 h-3.5 text-[#37A3DC]" />
            <span>ولوم چرخان ۹ پروپوزال</span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onOpenHub}
              title="بازگشت به نمای دایره‌ای تمام‌صفحه"
              className="p-1 rounded-lg hover:bg-white/15 text-sky-300 hover:text-white transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="کوچک‌سازی به دکمه شناور"
              className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="مخفی‌سازی پنل"
                className="p-1 rounded-lg hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Rotary Knob + Orbital Mini-Hub */}
        <div
          ref={dialAreaRef}
          className="relative flex items-center justify-center py-2"
          title="با چرخ ماوس روی دایره یا کلیک روی هر گره بین ۹ پروپوزال جابجا شوید"
        >
          <div
            className="relative"
            style={{ width: `${dialSize}px`, height: `${dialSize}px` }}
          >
            {/* Precision Bezel SVG: Glow, Ticks, Rings & Radial Spokes */}
            <svg
              viewBox={`0 0 ${dialSize} ${dialSize}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <radialGradient id="miniDialGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#37A3DC" stopOpacity="0.34" />
                  <stop offset="68%" stopColor="#0284C7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#071928" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle
                cx={center}
                cy={center}
                r={96}
                fill="url(#miniDialGlow)"
              />

              {/* Outer fine instrument bezel tick marks */}
              {DIAL_TICK_ANGLES.map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const isMajor = deg % 45 === 0;
                const rInner = isMajor ? 88 : 90;
                const rOuter = 94;
                return (
                  <line
                    key={deg}
                    x1={center + rInner * Math.cos(rad)}
                    y1={center + rInner * Math.sin(rad)}
                    x2={center + rOuter * Math.cos(rad)}
                    y2={center + rOuter * Math.sin(rad)}
                    stroke={isMajor ? '#38BDF8' : '#FFFFFF'}
                    strokeOpacity={isMajor ? '0.45' : '0.16'}
                    strokeWidth={isMajor ? '1.3' : '0.8'}
                  />
                );
              })}

              {/* Dashed orbital ring connecting nodes 02..09 */}
              <circle
                cx={center}
                cy={center}
                r={orbitRadius}
                fill="none"
                stroke="#37A3DC"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />

              {/* Inner bezel ring around central core rotary knob */}
              <circle
                cx={center}
                cy={center}
                r={40}
                fill="none"
                stroke={
                  displayId === 'khatam-01' ? '#FBBF24' : '#38BDF8'
                }
                strokeOpacity={displayId === 'khatam-01' ? '0.75' : '0.35'}
                strokeWidth={displayId === 'khatam-01' ? '1.6' : '1'}
              />

              {/* 8 Radial spokes */}
              {DIAL_ORBITAL_NODES.map((node) => {
                const rad = (node.angleDeg * Math.PI) / 180;
                const x1 = center + 39 * Math.cos(rad);
                const y1 = center + 39 * Math.sin(rad);
                const x2 = center + (orbitRadius - 16) * Math.cos(rad);
                const y2 = center + (orbitRadius - 16) * Math.sin(rad);
                const isNodeActive = displayId === node.id;

                return (
                  <line
                    key={node.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isNodeActive ? '#FBBF24' : '#38BDF8'}
                    strokeOpacity={isNodeActive ? '0.95' : '0.26'}
                    strokeWidth={isNodeActive ? '2.1' : '1'}
                  />
                );
              })}
            </svg>

            {/* Rotating Rotary Volume Indicator Pointer */}
            {showOrbitalNeedle && (
              <div
                style={{
                  transform: `rotate(${pointerRotationCssDeg}deg)`,
                }}
                className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out flex items-start justify-center"
              >
                <div className="mt-[55px] flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#FBBF24] border border-white" />
                  <div className="w-[2px] h-2.5 bg-gradient-to-b from-amber-300 to-transparent" />
                </div>
              </div>
            )}

            {/* Central Rotary Core Knob: Proposal 01 (Supreme Command Core) */}
            <button
              type="button"
              onClick={() => onSelectProposal('khatam-01')}
              onMouseEnter={() => setHoveredId('khatam-01')}
              onMouseLeave={() => setHoveredId(null)}
              title="پروپوزال ۱: فرماندهی عالی و شورای عالی قرارگاه"
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66px] h-[66px] rounded-full flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer ${
                activeProposalId === 'khatam-01'
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 ring-4 ring-amber-300/35 shadow-[0_0_22px_rgba(251,191,36,0.45)] scale-105'
                  : 'bg-gradient-to-b from-[#123A5A] to-[#081F32] text-white border-2 border-amber-400/60 hover:border-amber-300 hover:scale-105 shadow-lg'
              }`}
            >
              <Crown
                className={`w-3.5 h-3.5 mb-0.5 ${
                  activeProposalId === 'khatam-01'
                    ? 'text-slate-950'
                    : 'text-amber-300'
                }`}
              />
              <span className="text-[9.5px] font-black leading-none">
                هسته ۰۱
              </span>
              <span
                className={`text-[8px] font-bold mt-0.5 leading-none ${
                  activeProposalId === 'khatam-01'
                    ? 'text-slate-900'
                    : 'text-sky-200'
                }`}
              >
                کمیته عالی
              </span>
            </button>

            {/* 8 Orbital Rotary Buttons (Proposals 02..09) */}
            {DIAL_ORBITAL_NODES.map((node) => {
              const rad = (node.angleDeg * Math.PI) / 180;
              const nx = center + orbitRadius * Math.cos(rad);
              const ny = center + orbitRadius * Math.sin(rad);
              const prop = proposals.find((p) => p.id === node.id);
              const isSelected = activeProposalId === node.id;
              const isHovered = hoveredId === node.id;
              const IconComp = node.icon;

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectProposal(node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    left: `${nx}px`,
                    top: `${ny}px`,
                  }}
                  title={`پروپوزال ${prop?.proposalNum || ''} — ${node.shortTitle}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full flex flex-col items-center justify-center transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#0B253A] ring-2 ring-[#37A3DC] shadow-[0_0_16px_rgba(56,189,248,0.7)] scale-110 z-20'
                      : isHovered
                        ? 'bg-[#1D4760] text-white border border-sky-300 scale-110 z-20'
                        : 'bg-[#0D2C44] text-slate-200 border border-white/25 hover:border-sky-300'
                  }`}
                >
                  <IconComp
                    className={`w-3 h-3 ${
                      isSelected ? 'text-[#0284C7]' : 'text-sky-300'
                    }`}
                  />
                  <span
                    className={`text-[8px] font-black leading-none mt-0.5 tabular-nums ${
                      isSelected ? 'text-[#0B253A]' : 'text-white'
                    }`}
                  >
                    {prop?.proposalNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Digital Readout + Prev/Next Rotary Step + Quick View Mode */}
        <div className="px-3 pb-2.5 pt-1.5 border-t border-white/10 bg-[#061420]/75 space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => stepProposalRef.current(-1)}
              title="چرخاندن به پروپوزال قبلی"
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sky-200 transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="text-[9.5px] font-extrabold text-amber-300 leading-tight tabular-nums">
                پروپوزال {activeProposal?.proposalNum} از ۹
              </div>
              <div className="text-[10.5px] font-extrabold text-white truncate leading-snug mt-0.5">
                {activeOrbitalMeta
                  ? activeOrbitalMeta.shortTitle
                  : 'فرماندهی عالی و شورای عالی'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => stepProposalRef.current(1)}
              title="چرخاندن به پروپوزال بعدی"
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sky-200 transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onToggleViewMode('brochure')}
              className={`py-1 px-1.5 rounded-lg text-[9.5px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'brochure'
                  ? 'bg-[#37A3DC] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
              }`}
            >
              ایبوک ۲۲ صفحه
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('interactive')}
              className={`py-1 px-1.5 rounded-lg text-[9.5px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'interactive'
                  ? 'bg-[#37A3DC] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
              }`}
            >
              نمای وب تعاملی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
