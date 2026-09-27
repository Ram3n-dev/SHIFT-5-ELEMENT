import type { ReactNode } from 'react'
import type { RaccoonPose } from '../lib/types'

<<<<<<< HEAD
// Енот — маскот Енотономики: круглые очки, жёлтый жилет поверх худи, полосатый хвост.
=======
// Енот — маскот Лимит+: круглые очки, жёлтый жилет поверх худи, полосатый хвост.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
// Поза показывает состояние: спокоен, машет, пересчитывает деньги, думает, «эврика», волнуется,
// пустой кошелёк, радуется, спит. Анимации — CSS-классы rc-* из index.css.

const FUR = '#A4A6AB'
const FUR_DARK = '#6B6E75'
const MASK = '#2B2B2E'
const INK = '#1C1C1E'
const MUZZLE = '#EDEDF0'
const HOODIE = '#4A4C52'
const VEST = '#FFDD2D'
const VEST_SHADE = '#E3C21B'
const BILL = '#F4EBB8'
const BILL_LINE = '#C8B45A'

const TITLES: Record<RaccoonPose, string> = {
  calm: 'Енот спокоен',
  hello: 'Енот машет лапой',
  count: 'Енот пересчитывает деньги',
  think: 'Енот думает',
  eureka: 'Енот: эврика!',
  worried: 'Енот волнуется',
  empty: 'Енот с пустым кошельком',
  celebrate: 'Енот радуется',
  sleep: 'Енот спит',
}

interface RaccoonProps {
  pose?: RaccoonPose
  /** Ширина в пикселях. Высота считается сама. */
  size?: number
  className?: string
  title?: string
}

export default function Raccoon({ pose = 'calm', size = 96, className = '', title }: RaccoonProps) {
  const jumping = pose === 'eureka' || pose === 'celebrate'

  return (
    <svg
      viewBox="0 0 120 132"
      width={size}
      height={Math.round(size * 1.1)}
      role="img"
      aria-label={title ?? TITLES[pose]}
      className={`shrink-0 overflow-visible ${className}`}
    >
      <g className={`rc-part ${jumping ? 'rc-jump' : 'rc-bob'}`}>
        <Tail />
        <Body />
        <Arms pose={pose} />
        <Head pose={pose} />
        <Front pose={pose} />
      </g>
      <Extras pose={pose} />
    </svg>
  )
}

function Tail() {
  const path = 'M36 124 Q8 120 12 88'
  return (
    <g>
      <path d={path} stroke={FUR} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d={path} stroke={MASK} strokeWidth="13" strokeDasharray="5 6" fill="none" />
    </g>
  )
}

function Body() {
  return (
    <g>
      {/* Худи */}
      <path d="M30 131 Q28 97 60 91 Q92 97 90 131 Z" fill={HOODIE} />
      {/* Жилет */}
      <path d="M33 131 Q31 102 50 94 L55 131 Z" fill={VEST} />
      <path d="M87 131 Q89 102 70 94 L65 131 Z" fill={VEST} />
      <path d="M38 117 h10" stroke={VEST_SHADE} strokeWidth="2" strokeLinecap="round" />
      {/* Шнурки капюшона */}
      <path d="M56 96 L55 108 M64 96 L65 108" stroke="#D5D6DA" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

/** Рукав худи от плеча до лапы. */
function Arm({ d, paw, className }: { d: string; paw: [number, number]; className?: string }) {
  return (
    <g className={className}>
      <path d={d} stroke={HOODIE} strokeWidth="10" strokeLinecap="round" fill="none" />
      <ellipse cx={paw[0]} cy={paw[1]} rx="6" ry="5.5" fill={MASK} />
    </g>
  )
}

function Arms({ pose }: { pose: RaccoonPose }) {
  switch (pose) {
    case 'hello':
      return (
        <>
          <Arm d="M38 100 Q33 112 46 118" paw={[47, 118]} />
          <Arm d="M82 100 Q96 94 100 78" paw={[100, 73]} className="rc-part rc-wave" />
        </>
      )
    case 'count':
      return (
        <>
          <Arm d="M38 100 Q38 110 47 107" paw={[48, 106]} />
          <Arm d="M82 100 Q82 110 73 107" paw={[72, 106]} />
        </>
      )
    case 'think':
      return (
        <>
          <Arm d="M38 100 Q33 112 46 118" paw={[47, 118]} />
          <Arm d="M82 100 Q90 94 74 92" paw={[71, 91]} />
        </>
      )
    case 'eureka':
      return (
        <>
          <Arm d="M38 100 Q26 94 24 80" paw={[24, 75]} />
          <Arm d="M82 100 Q94 94 96 80" paw={[96, 75]} />
        </>
      )
    case 'celebrate':
      return (
        <>
          <Arm d="M38 100 Q24 90 21 74" paw={[21, 69]} />
          <Arm d="M82 100 Q96 90 99 74" paw={[99, 69]} />
        </>
      )
    case 'worried':
      return (
        <>
          <Arm d="M38 100 Q42 110 54 106" paw={[55, 105]} />
          <Arm d="M82 100 Q78 110 66 106" paw={[65, 105]} />
        </>
      )
    case 'empty':
      return (
        <>
          <Arm d="M38 100 Q34 110 42 112" paw={[43, 112]} />
          <Arm d="M82 100 Q86 110 78 112" paw={[77, 112]} />
        </>
      )
    default:
      return (
        <>
          <Arm d="M38 100 Q33 112 46 118" paw={[47, 118]} />
          <Arm d="M82 100 Q87 112 74 118" paw={[73, 118]} />
        </>
      )
  }
}

function Head({ pose }: { pose: RaccoonPose }) {
  return (
    <g>
      {/* Уши */}
      <polygon points="30,48 36,20 54,38" fill={FUR_DARK} />
      <polygon points="35,44 38,28 48,38" fill={MASK} />
      <polygon points="90,48 84,20 66,38" fill={FUR_DARK} />
      <polygon points="85,44 82,28 72,38" fill={MASK} />

      {/* Голова, пушистые щёки, полоска на лбу */}
      <ellipse cx="60" cy="62" rx="33" ry="29" fill={FUR} />
      <path d="M28 64 L19 72 L30 75 Z M92 64 L101 72 L90 75 Z" fill={FUR} />
      <path d="M57 34 Q60 32 63 34 L61.5 50 L58.5 50 Z" fill={FUR_DARK} />

      {/* Морда и маска */}
      <ellipse cx="60" cy="78" rx="19" ry="12" fill={MUZZLE} />
      <path d="M24 62 Q60 42 96 62 Q89 76 73 72 Q60 68 47 72 Q31 76 24 62 Z" fill={MASK} />

      {/* Очки */}
      <path d="M36 61 L28 57 M84 61 L92 57" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="62" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
      <circle cx="74" cy="62" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
      <path d="M56 61 L64 61" stroke={INK} strokeWidth="2.5" />

      <Eyes pose={pose} />
      <Brows pose={pose} />

      {/* Нос */}
      <ellipse cx="60" cy="75" rx="5" ry="3.6" fill={INK} />
      <ellipse cx="58.6" cy="74" rx="1.4" ry="0.8" fill="#5A5C61" />

      <Mouth pose={pose} />
    </g>
  )
}

function Pupils({ dx = 0, dy = 0, r = 3.6, blink = false }: { dx?: number; dy?: number; r?: number; blink?: boolean }) {
  return (
    <g className={blink ? 'rc-part rc-blink' : undefined}>
      <circle cx={46 + dx} cy={63 + dy} r={r} fill={INK} />
      <circle cx={74 + dx} cy={63 + dy} r={r} fill={INK} />
      <circle cx={47.3 + dx} cy={61.7 + dy} r="1.1" fill="#FFFFFF" />
      <circle cx={75.3 + dx} cy={61.7 + dy} r="1.1" fill="#FFFFFF" />
    </g>
  )
}

function ClosedEyes({ happy }: { happy: boolean }) {
  const d = happy ? 'M41 65 Q46 58 51 65 M69 65 Q74 58 79 65' : 'M41 62 Q46 67 51 62 M69 62 Q74 67 79 62'
  return <path d={d} stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
}

function Eyes({ pose }: { pose: RaccoonPose }) {
  switch (pose) {
    case 'celebrate':
      return <ClosedEyes happy />
    case 'sleep':
      return <ClosedEyes happy={false} />
    case 'think':
      return <Pupils dx={-2} dy={-3.5} />
    case 'count':
    case 'empty':
      return <Pupils dy={2.5} blink={pose === 'count'} />
    case 'eureka':
      return <Pupils r={4.4} />
    case 'worried':
      return <Pupils r={3.1} dy={0.5} />
    default:
      return <Pupils blink />
  }
}

function Brows({ pose }: { pose: RaccoonPose }) {
  if (pose === 'worried' || pose === 'empty') {
    return <path d="M38 48 L52 44 M82 48 L68 44" stroke={MASK} strokeWidth="2.6" strokeLinecap="round" />
  }
  if (pose === 'think') {
    return <path d="M68 44 Q75 40 82 43" stroke={MASK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
  }
  if (pose === 'eureka') {
    return <path d="M38 45 Q45 41 52 44 M68 44 Q75 41 82 45" stroke={MASK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
  }
  return null
}

function Mouth({ pose }: { pose: RaccoonPose }) {
  const line = (d: string) => <path d={d} stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

  switch (pose) {
    case 'eureka':
    case 'celebrate':
      return (
        <g>
          <path d="M53 80 Q60 93 67 80 Z" fill={INK} />
          <path d="M56 86.5 Q60 90.5 64 86.5 Q60 84.5 56 86.5 Z" fill="#E48B8B" />
        </g>
      )
    case 'think':
      return line('M55 84 Q61 82 66 84')
    case 'worried':
      return line('M52 85 Q56 82 60 85 Q64 88 68 85')
    case 'empty':
      return line('M53 87 Q60 81 67 87')
    case 'sleep':
      return line('M57 84 Q60 86 63 84')
    default:
      return line('M53 81 Q56.5 85 60 81 Q63.5 85 67 81')
  }
}

/** То, что Енот держит в лапах: деньги или пустой кошелёк. Рисуется поверх тела. */
function Front({ pose }: { pose: RaccoonPose }) {
  if (pose === 'count') {
    return (
      <g>
        <rect x="45" y="101" width="30" height="9" rx="1.5" fill={BILL} stroke={BILL_LINE} strokeWidth="1.2" />
        <g className="rc-part rc-count">
          <rect x="47" y="94" width="26" height="8" rx="1.5" fill={BILL} stroke={BILL_LINE} strokeWidth="1.2" />
          <circle cx="60" cy="98" r="2" fill="none" stroke={BILL_LINE} strokeWidth="1.2" />
        </g>
        <g className="rc-part rc-count-late">
          <rect x="49" y="97" width="24" height="7" rx="1.5" fill={BILL} stroke={BILL_LINE} strokeWidth="1.2" />
        </g>
        <ellipse cx="48" cy="106" rx="6" ry="5.5" fill={MASK} />
        <ellipse cx="72" cy="106" rx="6" ry="5.5" fill={MASK} />
      </g>
    )
  }

  if (pose === 'empty') {
    return (
      <g>
        <rect x="42" y="100" width="36" height="22" rx="4" fill={FUR_DARK} />
        <path d="M42 106 H78" stroke={MASK} strokeWidth="2" />
        <rect x="47" y="96" width="26" height="6" rx="2" fill="#3A3B40" />
        <ellipse cx="43" cy="112" rx="6" ry="5.5" fill={MASK} />
        <ellipse cx="77" cy="112" rx="6" ry="5.5" fill={MASK} />
        {/* Моль вылетает из кошелька */}
        <g className="rc-part rc-float">
          <ellipse cx="91" cy="88" rx="5" ry="3.2" fill="#C9CACE" transform="rotate(-25 91 88)" />
          <ellipse cx="99" cy="88" rx="5" ry="3.2" fill="#C9CACE" transform="rotate(25 99 88)" />
          <path d="M95 84 V93" stroke={MASK} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
    )
  }

  return null
}

/** Детали вокруг Енота: лампочка, мысли, капля пота, конфетти, «z-z». */
function Extras({ pose }: { pose: RaccoonPose }) {
  let content: ReactNode = null

  if (pose === 'think') {
    content = (
      <g>
        <circle className="rc-dot" cx="94" cy="28" r="2.4" fill={FUR_DARK} />
        <circle className="rc-dot" cx="101" cy="20" r="3.1" fill={FUR_DARK} />
        <circle className="rc-dot" cx="109" cy="11" r="3.9" fill={FUR_DARK} />
      </g>
    )
  } else if (pose === 'eureka') {
    content = (
      <g>
        <circle className="rc-glow" cx="60" cy="12" r="13" fill={VEST} opacity="0.35" />
        <circle cx="60" cy="12" r="8" fill={VEST} />
        <rect x="56.5" y="19" width="7" height="5" rx="1" fill={FUR_DARK} />
        <path
          d="M60 -4 V-1 M46 2 L48.5 4.5 M74 2 L71.5 4.5 M42 13 H45 M78 13 H75"
          stroke={VEST_SHADE}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    )
  } else if (pose === 'worried') {
    content = <path className="rc-part rc-float" d="M96 34 Q100.5 42 96 45.5 Q91.5 42 96 34 Z" fill="#8EC5F0" />
  } else if (pose === 'celebrate') {
    const pieces: [number, number, string, number][] = [
      [12, 30, VEST, 20],
      [104, 22, MASK, -25],
      [26, 10, FUR_DARK, 40],
      [96, 46, VEST, -10],
      [8, 56, MASK, 15],
      [110, 60, FUR_DARK, 35],
    ]
    content = (
      <g>
        {pieces.map(([x, y, color, angle], index) => (
          <g key={index} className="rc-part rc-float" style={{ animationDelay: `${index * 0.25}s` }}>
            <rect
              x={x}
              y={y}
              width="5"
              height="9"
              rx="1.5"
              fill={color}
              transform={`rotate(${angle} ${x + 2.5} ${y + 4.5})`}
            />
          </g>
        ))}
      </g>
    )
  } else if (pose === 'sleep') {
    content = (
      <g fill={FUR_DARK} fontWeight="700" fontFamily="Onest, sans-serif">
        <text className="rc-part rc-float" x="88" y="32" fontSize="11">
          z
        </text>
        <text className="rc-part rc-float" style={{ animationDelay: '0.6s' }} x="98" y="20" fontSize="15">
          z
        </text>
      </g>
    )
  }

  return content
}
