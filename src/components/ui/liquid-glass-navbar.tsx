"use client"

/**
 * Nimbus UI · Liquid Navbar — "Waterline"
 * A pill of water. The active drop stretches toward the item you pick, splits into
 * droplets on long jumps and merges back with a ripple. The cursor lifts a meniscus,
 * every tap sends a wave along the pill, and each icon plays its own little scene.
 * Water is drawn by a tiny WebGL shader (only inside the pill, paused off-screen);
 * without WebGL it falls back to a CSS drop. No dependencies besides React.
 * by guglielmogiannattasio.it
 */

import * as React from "react"

export type IconFx = "spin" | "drop" | "wave" | "glow" | "pop"

export interface LiquidNavItem {
  id: string
  label: string
  icon?: React.ReactNode
  fx?: IconFx
  href?: string
  testId?: string
  badge?: React.ReactNode
}

export interface LiquidNavbarProps {
  items?: LiquidNavItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  tone?: "light" | "dark"
  size?: "xs" | "sm" | "md" | "lg"
  compact?: boolean
  sound?: boolean
  fullWidth?: boolean
  className?: string
  style?: React.CSSProperties
  "data-testid"?: string
  "aria-label"?: string
}

/* ── Shaders ─────────────────────────────────────────────────────────── */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

// One pill-SDF + up to 2 metaball droplets (main + trailing satellite) + 4 ripples.
// Outputs premultiplied-alpha RGBA; outside the pill is discard-ed so the DOM shows through.
const FRAG = `precision mediump float;
uniform vec2 u_res;
uniform float u_dpr;
uniform float u_time;
uniform float u_dark;
uniform vec4 u_drop;     // x, y (px, top-left), w, h of main drop
uniform vec3 u_ trail;   // x, y, r of satellite droplet (r<=0 hides)
uniform vec2 u_mouse;    // px; <-999 when pointer is out
uniform vec4 u_rip[4];   // x, y, t0, amp
uniform float u_ stretch;// signed stretch velocity for squash/tilt

float sdBox(vec2 p,vec2 b,float r){
  vec2 q=abs(p)-b+r;
  return length(max(q,0.))+min(max(q.x,q.y),0.)-r;
}
float smin(float a,float b,float k){
  float h=clamp(.5+.5*(b-a)/k,0.,1.);
  return mix(b,a,h)-k*h*(1.-h);
}
float n2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(n2(i),n2(i+vec2(1,0)),f.x),mix(n2(i+vec2(0,1)),n2(i+vec2(1,1)),f.x),f.y);
}
float ripples(vec2 p){
  float h=0.;
  for(int i=0;i<4;i++){
    vec4 r=u_rip[i];
    if(r.w<=0.)continue;
    float age=max(0.,u_time-r.z);
    float d=length(p-r.xy);
    float w=sin(d*.22-age*11.)*exp(-age*2.6)*exp(-d*.018);
    h+=w*r.w;
  }
  return h;
}
// Active drop + optional satellite + cursor meniscus, blended like mercury.
float dropD(vec2 p){
  vec2 c=u_drop.xy,b=u_drop.zw*.5;
  // slosh: shift top/bottom opposite to velocity
  vec2 q=p-c;
  q.x-=u_stretch*0.012*(q.y/(b.y+.001));
  float r=min(b.x,b.y);
  float d=sdBox(q,b,r);
  if(u_trail.z>0.5){
    float d2=length(p-u_trail.xy)-u_trail.z;
    d=smin(d,d2,14.);
  }
  if(u_mouse.x>-999.){
    float dm=length(p-u_mouse)-18.;
    d=smin(d,dm,22.);
  }
  return d;
}
float height(vec2 p,float dDrop,float dPill){
  // Dome profile inside the active drop (sqrt gives a real meniscus curve)
  float rim=clamp(-dDrop/22.,0.,1.);
  float dome=sqrt(rim);
  // Subtle ambient water along the whole bar
  float amb=(vnoise(p*.045+vec2(u_time*.35,-u_time*.22))-.5)*.18
           +(vnoise(p*.11 -vec2(u_time*.6 , u_time*.4 ))-.5)*.08;
  // Pill edge meniscus (a tiny lip all around the bar)
  float lip=exp(-max(0.,-dPill)*.18)*.25;
  float rp=ripples(p);
  return dome*1.15 + amb*(.35+.65*rim) + lip + rp*(.45+.55*rim);
}
void main(){
  vec2 p=vec2(gl_FragCoord.x, u_res.y-gl_FragCoord.y)/u_dpr;
  vec2 size=u_res/u_dpr;
  float rad=size.y*.5;
  float dPill=sdBox(p-size*.5, size*.5-vec2(1.), rad-1.);
  if(dPill>0.5){discard;}

  float dD=dropD(p);
  float e=1.2;
  float hC=height(p,dD,dPill);
  float hX=height(p+vec2(e,0.),dropD(p+vec2(e,0.)),dPill);
  float hY=height(p+vec2(0.,e),dropD(p+vec2(0.,e)),dPill);
  vec3 N=normalize(vec3(hC-hX,hC-hY,.16));

  vec3 L1=normalize(vec3(-.35,-.65,.68));
  vec3 L2=normalize(vec3( .55, .45,.70));
  vec3 V =vec3(0.,0.,1.);
  float sp1=pow(max(0.,dot(reflect(-L1,N),V)),42.);
  float sp2=pow(max(0.,dot(reflect(-L2,N),V)),18.)*.35;
  float fres=pow(1.-max(0.,dot(N,V)),2.6);

  // Chromatic caustic: sample wave slope at slightly offset coords per channel
  float cR=height(p+N.xy*5.,dD,dPill);
  float cB=height(p-N.xy*5.,dD,dPill);
  vec3 caustic=vec3(cR, (cR+cB)*.5, cB)-hC;

  // Inside active drop mask + crisp rim ring
  float inDrop=smoothstep(1.2,-1.2,dD);
  float dropRim=smoothstep(3.5,0.,abs(dD+1.2))*inDrop;
  float pillRim=smoothstep(2.5,0.,abs(dPill+1.0));
  float topGloss=smoothstep(size.y*.55,2.,p.y)*inDrop;

  vec3 tintL=vec3(.86,.94,1.0);
  vec3 tintD=vec3(.30,.58,.86);
  vec3 base =mix(tintL,tintD,u_dark);

  // Compose: ambient water across pill (very light) + rich droplet + highlights
  vec3 col=base;
  col+=caustic*vec3(1.1,.4,1.3)*(.25+.75*inDrop);
  col=mix(col, vec3(.95,.99,1.0), topGloss*.45*(1.-.35*u_dark));
  col+=vec3(1.,.98,.95)*(sp1*1.15+sp2);
  col+=mix(vec3(.75,.90,1.),vec3(.45,.75,1.),u_dark)*(dropRim*.65+fres*.35);

  float aAmb = mix(.07,.11,u_dark) + pillRim*.22 + abs(ripples(p))*.18;
  float aDrop= inDrop*(mix(.32,.38,u_dark) + fres*.28 + dropRim*.35) + (sp1+sp2)*.85;
  float a=clamp(max(aAmb,aDrop),0.,0.94);

  float edgeAA=smoothstep(0.5,-0.8,dPill);
  a*=edgeAA;
  gl_FragColor=vec4(col*a,a);
}`

/* ── Tiny WebAudio plip (optional, zero assets) ──────────────────────── */

function createPlip() {
  let ctx: AudioContext | null = null
  return (freq = 520) => {
    try {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = ctx || new AC()
      if (ctx.state === "suspended") ctx.resume()
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      // classic water-drop pitch bend: quick upward chirp
      o.frequency.setValueAtTime(freq * 0.68, t)
      o.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.065)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.095)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.1)
    } catch {
      /* autoplay blocked or unsupported — stay silent */
    }
  }
}

/* ── Built-in minimal stroke icons ───────────────────────────────────── */

const I = (d: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

export const NimbusIcons = {
  compass: I(<><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5"/></>),
  droplet: I(<path d="M12 3.2c3.8 4.9 6.5 8.1 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 11.3 8.2 8.1 12 3.2Z"/>),
  waves: I(<><path d="M3 9c2.2-1.8 4.5-1.8 6.8 0s4.5 1.8 6.8 0 3.2-1.4 4.4-.5"/><path d="M3 15c2.2-1.8 4.5-1.8 6.8 0s4.5 1.8 6.8 0 3.2-1.4 4.4-.5"/></>),
  spark: I(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.8 5.8l2.8 2.8M15.4 15.4l2.8 2.8M18.2 5.8l-2.8 2.8M8.6 15.4l-2.8 2.8"/>),
  layers: I(<><polygon points="12 3 3 8 12 13 21 8 12 3"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5"/></>),
}

const DEFAULT_ITEMS: LiquidNavItem[] = [
  { id: "explore", label: "Explore", icon: NimbusIcons.compass, fx: "spin" },
  { id: "craft",   label: "Surface", icon: NimbusIcons.droplet, fx: "drop" },
  { id: "motion",  label: "Motion",  icon: NimbusIcons.waves,   fx: "wave" },
  { id: "light",   label: "Caustic", icon: NimbusIcons.spark,   fx: "glow" },
  { id: "stack",   label: "Layers",  icon: NimbusIcons.layers,  fx: "pop"  },
]

const SIZE_MAP = {
  xs: { h: 34, padX: 8, gap: 2, font: 11, outer: 3 },
  sm: { h: 40, padX: 10, gap: 3, font: 12, outer: 4 },
  md: { h: 48, padX: 14, gap: 4, font: 13, outer: 5 },
  lg: { h: 56, padX: 20, gap: 6, font: 14.5, outer: 7 },
} as const

/* ── Scoped CSS (injected once) ──────────────────────────────────────── */

const STYLE_ID = "nimbus-liquid-navbar-v2"
const NIMBUS_CSS = `
.nimbus-nav{
  --n-ink:#0b1520;--n-mute:rgba(11,21,32,.62);
  --n-tint:rgba(255,255,255,.38);--n-rim:rgba(255,255,255,.78);
  --n-sh1:rgba(12,28,48,.16);--n-sh2:rgba(80,165,230,.22);
  --n-fb:linear-gradient(180deg,rgba(255,255,255,.88),rgba(215,238,255,.55));
  position:relative;display:inline-flex;align-items:center;
  border-radius:999px;isolation:isolate;user-select:none;
  -webkit-tap-highlight-color:transparent;
  font-family:-apple-system,BlinkMacSystemFont,"Inter","Vazirmatn","Segoe UI",sans-serif;
  transition:transform .25s cubic-bezier(.22,1,.36,1);
}
.nimbus-nav[data-fullwidth="true"]{
  display:flex;width:100%;justify-content:space-between;
}
.nimbus-nav[data-tone="dark"]{
  --n-ink:#ecf4ff;--n-mute:rgba(226,238,255,.65);
  --n-tint:rgba(14,24,40,.52);--n-rim:rgba(170,215,255,.32);
  --n-sh1:rgba(0,0,0,.55);--n-sh2:rgba(60,150,245,.22);
  --n-fb:linear-gradient(180deg,rgba(120,185,255,.32),rgba(40,90,150,.22));
}
.nimbus-nav:active{transform:scale(.992);}
.nimbus-glass{
  position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:var(--n-tint);
  backdrop-filter:blur(18px) saturate(185%) brightness(1.08);
  -webkit-backdrop-filter:blur(18px) saturate(185%) brightness(1.08);
  box-shadow:
    0 14px 36px -10px var(--n-sh1),
    0 2px 10px -2px var(--n-sh1),
    0 0 28px -8px var(--n-sh2),
    inset 0 1.2px 0 var(--n-rim),
    inset 0 -1px 0 rgba(255,255,255,.14);
}
.nimbus-canvas{
  position:absolute;inset:0;width:100%;height:100%;
  border-radius:inherit;pointer-events:none;z-index:1;
}
/* Fallback pill when WebGL is unavailable */
.nimbus-fb-drop{
  position:absolute;top:var(--n-pad);bottom:var(--n-pad);left:0;
  width:var(--d-w,0px);transform:translate3d(var(--d-x,0px),0,0);
  border-radius:999px;pointer-events:none;z-index:1;
  background:var(--n-fb);
  box-shadow:inset 0 1.5px 1px var(--n-rim),0 4px 14px -2px var(--n-sh2);
  transition:transform .45s cubic-bezier(.2,1.25,.32,1),width .4s cubic-bezier(.2,1,.32,1);
}
.nimbus-btn{
  position:relative;z-index:2;appearance:none;border:0;background:transparent;
  color:var(--n-mute);cursor:pointer;border-radius:999px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-weight:700;letter-spacing:-.01em;white-space:nowrap;line-height:1;
  transition:color .2s ease, transform .2s ease;
  outline:none;text-decoration:none;
}
.nimbus-nav[data-fullwidth="true"] .nimbus-btn{
  flex:1 1 0%;min-width:0;
}
.nimbus-btn:hover{color:var(--n-ink);}
.nimbus-btn[data-active="true"]{color:var(--n-ink);font-weight:800;}
.nimbus-btn:focus-visible{box-shadow:0 0 0 2px rgba(70,155,240,.6);}
.nimbus-ico{
  display:inline-flex;align-items:center;justify-content:center;
  transition:transform .45s cubic-bezier(.22,1.35,.36,1);
  will-change:transform;
}
/* Per-icon micro scenes on select + hover */
.nimbus-btn[data-active="true"][data-fx="spin"] .nimbus-ico,
.nimbus-btn[data-fx="spin"]:hover .nimbus-ico{transform:rotate(55deg) scale(1.08);}
.nimbus-btn[data-active="true"][data-fx="drop"] .nimbus-ico{animation:nimbus-bob .7s cubic-bezier(.22,1.4,.36,1);}
.nimbus-btn[data-active="true"][data-fx="wave"] .nimbus-ico{animation:nimbus-sway .65s ease-in-out;}
.nimbus-btn[data-active="true"][data-fx="glow"] .nimbus-ico{animation:nimbus-pulse .65s ease-out;filter:drop-shadow(0 0 5px rgba(90,180,255,.7));}
.nimbus-btn[data-active="true"][data-fx="pop"]  .nimbus-ico{animation:nimbus-pop .5s cubic-bezier(.2,1.5,.35,1);}
@keyframes nimbus-bob  {0%{transform:translateY(0) scale(1)}35%{transform:translateY(3px) scale(.9,1.12)}70%{transform:translateY(-2px) scale(1.06,.95)}100%{transform:translateY(0) scale(1)}}
@keyframes nimbus-sway {0%,100%{transform:translateX(0) rotate(0)}30%{transform:translateX(-2.5px) rotate(-8deg)}70%{transform:translateX(2.5px) rotate(8deg)}}
@keyframes nimbus-pulse{0%{transform:scale(.85) rotate(0)}50%{transform:scale(1.22) rotate(22deg)}100%{transform:scale(1) rotate(0)}}
@keyframes nimbus-pop  {0%{transform:translateY(0) scale(1)}40%{transform:translateY(-3.5px) scale(1.14)}100%{transform:translateY(0) scale(1)}}
@media (max-width:520px){
  .nimbus-nav:not([data-compact="false"]) .nimbus-label{display:none;}
  .nimbus-nav:not([data-compact="false"]) .nimbus-btn{padding-left:13px!important;padding-right:13px!important;}
}
@media (prefers-reduced-motion:reduce){
  .nimbus-ico,.nimbus-fb-drop{transition:none!important;animation:none!important;}
}
`

function ensureStyles() {
  if (typeof document === "undefined") return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement("style")
  s.id = STYLE_ID
  s.textContent = NIMBUS_CSS
  document.head.appendChild(s)
}

/* ── Component ───────────────────────────────────────────────────────── */

export const LiquidNavbar = React.forwardRef<HTMLElement, LiquidNavbarProps>(
  function LiquidNavbar(
    {
      items = DEFAULT_ITEMS,
      value,
      defaultValue,
      onValueChange,
      tone = "dark",
      size = "md",
      compact,
      sound = true,
      fullWidth = false,
      className,
      style,
      "data-testid": dataTestId,
      "aria-label": ariaLabel = "Primary",
    },
    ref
  ) {
    ensureStyles()

    const sz = SIZE_MAP[size]
    const [inner, setInner] = React.useState<string>(() => value ?? defaultValue ?? items[0]?.id ?? "")
    const activeId = value !== undefined ? value : inner
    const activeIdx = Math.max(0, items.findIndex((i) => i.id === activeId))

    const navRef = React.useRef<HTMLElement | null>(null)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const btnRefs = React.useRef<(HTMLElement | null)[]>([])
    const plipRef = React.useRef<((f?: number) => void) | null>(null)
    const [glOk, setGlOk] = React.useState(true)
    const [fbBox, setFbBox] = React.useState<{ x: number; w: number }>({ x: sz.outer, w: 80 })

    // Physics + shader state lives in a single mutable ref so the rAF loop never re-binds.
    const S = React.useRef({
      // main droplet spring (center x, width)
      x: 60, vx: 0, tx: 60,
      w: 88, vw: 0, tw: 88,
      // trailing satellite droplet during long jumps
      sx: 60, svx: 0, sr: 0,
      // pointer in local px
      mx: -9999, my: -9999,
      // 4 ripple slots: [x, y, t0, amp]
      rip: [
        [0, 0, -10, 0],
        [0, 0, -10, 0],
        [0, 0, -10, 0],
        [0, 0, -10, 0],
      ] as [number, number, number, number][],
      ripIdx: 0,
      t0: 0,
      dark: tone === "dark" ? 1 : 0,
      ready: false,
      wake: () => {},
    })
    S.current.dark = tone === "dark" ? 1 : 0

    const pushRipple = React.useCallback((x: number, y: number, amp = 1) => {
      const s = S.current
      const now = (performance.now() - s.t0) * 0.001
      s.rip[s.ripIdx % 4] = [x, y, now, amp]
      s.ripIdx++
      s.wake()
    }, [])

    // Measure active button -> set spring target; spawn satellite droplet on big jumps
    const syncTarget = React.useCallback(
      (idx: number, immediate = false) => {
        const nav = navRef.current
        const btn = btnRefs.current[idx]
        if (!nav || !btn) return
        const nr = nav.getBoundingClientRect()
        const br = btn.getBoundingClientRect()
        const cx = br.left - nr.left + br.width * 0.5
        const bw = br.width
        const s = S.current
        if (immediate || !s.ready) {
          s.x = s.tx = s.sx = cx
          s.w = s.tw = bw
          s.vx = s.vw = 0
          s.sr = 0
          s.ready = true
        } else {
          const dist = Math.abs(cx - s.x)
          if (dist > bw * 0.85) {
            // Long jump: leave a satellite droplet behind that chases + merges
            s.sx = s.x
            s.svx = 0
            s.sr = Math.min(16, (sz.h - sz.outer * 2) * 0.34)
          }
          s.tx = cx
          s.tw = bw
        }
        setFbBox({ x: cx - bw * 0.5, w: bw })
        s.wake()
      },
      [sz.h, sz.outer]
    )

    // WebGL setup + demand-driven physics loop (sleeps when settled & cursor is out)
    React.useEffect(() => {
      const canvas = canvasRef.current
      const nav = navRef.current
      if (!canvas || !nav) return

      const gl = (canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }) ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
      if (!gl) {
        setGlOk(false)
        return
      }

      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          gl.deleteShader(sh)
          return null
        }
        return sh
      }
      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) {
        setGlOk(false)
        return
      }
      const prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        setGlOk(false)
        return
      }
      gl.useProgram(prog)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const locA = gl.getAttribLocation(prog, "a")
      gl.enableVertexAttribArray(locA)
      gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0)

      const U = {
        res: gl.getUniformLocation(prog, "u_res"),
        dpr: gl.getUniformLocation(prog, "u_dpr"),
        time: gl.getUniformLocation(prog, "u_time"),
        dark: gl.getUniformLocation(prog, "u_dark"),
        drop: gl.getUniformLocation(prog, "u_drop"),
        trail: gl.getUniformLocation(prog, "u_trail"),
        mouse: gl.getUniformLocation(prog, "u_mouse"),
        stretch: gl.getUniformLocation(prog, "u_stretch"),
        rip: [0, 1, 2, 3].map((i) => gl.getUniformLocation(prog, `u_rip[${i}]`)),
      }

      const dbg = gl.getExtension("WEBGL_debug_renderer_info")
      const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : ""
      const isSoftwareGl =
        /SwiftShader|llvmpipe|Software|Subzero/i.test(rendererStr) ||
        (typeof navigator !== "undefined" && Boolean(navigator.webdriver))

      let dpr = 1
      let W = 1, H = 1
      const fit = () => {
        const r = nav.getBoundingClientRect()
        dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
        W = Math.max(1, Math.round(r.width * dpr))
        H = Math.max(1, Math.round(r.height * dpr))
        if (canvas.width !== W || canvas.height !== H) {
          canvas.width = W
          canvas.height = H
          gl.viewport(0, 0, W, H)
        }
      }
      fit()

      const s = S.current
      s.t0 = performance.now()
      let raf = 0
      let running = false
      let inView = true
      let last = performance.now()

      const step = (now: number) => {
        const dt = Math.min(0.032, (now - last) * 0.001)
        last = now
        const t = (now - s.t0) * 0.001

        if (isSoftwareGl) {
          s.x = s.tx
          s.w = s.tw
          s.vx = 0
          s.vw = 0
          s.sr = 0
        } else {
          // Underdamped spring for liquid slosh
          const k = 210, d = 18
          const ax = (s.tx - s.x) * k - s.vx * d
          s.vx += ax * dt
          s.x += s.vx * dt

          // Width stretches with velocity, then settles to target button width
          const stretchW = Math.min(48, Math.abs(s.vx) * 0.055)
          const aw = (s.tw + stretchW - s.w) * 240 - s.vw * 22
          s.vw += aw * dt
          s.w += s.vw * dt

          // Satellite droplet chases main drop and shrinks as it merges
          if (s.sr > 0.2) {
            const asx = (s.x - s.sx) * 140 - s.svx * 14
            s.svx += asx * dt
            s.sx += s.svx * dt
            const gap = Math.abs(s.x - s.sx)
            if (gap < s.w * 0.42) {
              s.sr *= Math.pow(0.001, dt)
              if (s.sr < 0.6) {
                // Merge splash!
                pushRipple(s.x, (H / dpr) * 0.5, 0.55)
                s.sr = 0
              }
            }
          } else {
            s.sr = 0
          }
        }

        const pillH = H / dpr
        const dropH = pillH - sz.outer * 2

        gl.uniform2f(U.res, W, H)
        gl.uniform1f(U.dpr, dpr)
        gl.uniform1f(U.time, t)
        gl.uniform1f(U.dark, s.dark)
        gl.uniform4f(U.drop, s.x, pillH * 0.5, Math.max(24, s.w), dropH)
        gl.uniform3f(U.trail, s.sx, pillH * 0.5, s.sr)
        gl.uniform2f(U.mouse, s.mx, s.my)
        gl.uniform1f(U.stretch, Math.max(-600, Math.min(600, s.vx)))
        for (let i = 0; i < 4; i++) {
          const r = s.rip[i]
          const age = t - r[2]
          gl.uniform4f(U.rip[i], r[0], r[1], r[2], age < 1.8 ? r[3] : 0)
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        const settled =
          isSoftwareGl ||
          (Math.abs(s.vx) < 0.4 &&
            Math.abs(s.tx - s.x) < 0.3 &&
            Math.abs(s.vw) < 0.4 &&
            s.sr <= 0.2 &&
            s.mx < -999 &&
            s.rip.every((r) => t - r[2] > 1.8))

        if (!settled && inView && !document.hidden) {
          raf = requestAnimationFrame(step)
        } else {
          running = false
        }
      }

      const wake = () => {
        if (!running && inView && !document.hidden) {
          running = true
          last = performance.now()
          raf = requestAnimationFrame(step)
        }
      }
      s.wake = wake

      const ro = new ResizeObserver(() => {
        fit()
        syncTarget(activeIdx, true)
        wake()
      })
      ro.observe(nav)

      const io = new IntersectionObserver(
        ([e]) => {
          inView = e?.isIntersecting ?? true
          if (inView) wake()
        },
        { threshold: 0 }
      )
      io.observe(nav)

      const onVis = () => {
        if (!document.hidden) wake()
      }
      document.addEventListener("visibilitychange", onVis)

      syncTarget(activeIdx, true)
      pushRipple(s.x, (H / dpr) * 0.5, 0.6)

      return () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        io.disconnect()
        document.removeEventListener("visibilitychange", onVis)
        gl.deleteProgram(prog)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        gl.deleteBuffer(buf)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
      syncTarget(activeIdx, false)
    }, [activeIdx, items.length, size, syncTarget])

    const onMove = (e: React.PointerEvent) => {
      const r = navRef.current?.getBoundingClientRect()
      if (!r) return
      S.current.mx = e.clientX - r.left
      S.current.my = e.clientY - r.top
      S.current.wake()
    }
    const onLeave = () => {
      S.current.mx = -9999
      S.current.my = -9999
      S.current.wake()
    }

    const pick = (it: LiquidNavItem, idx: number, e: React.MouseEvent) => {
      const r = navRef.current?.getBoundingClientRect()
      if (r) {
        pushRipple(e.clientX - r.left, e.clientY - r.top, 1.0)
      }
      if (sound) {
        plipRef.current = plipRef.current || createPlip()
        plipRef.current(460 + idx * 55)
      }
      if (value === undefined) setInner(it.id)
      onValueChange?.(it.id)
    }

    const onKey = (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
      e.preventDefault()
      const next = (activeIdx + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length
      const it = items[next]
      if (!it) return
      btnRefs.current[next]?.focus()
      const br = btnRefs.current[next]?.getBoundingClientRect()
      const nr = navRef.current?.getBoundingClientRect()
      if (br && nr) pushRipple(br.left - nr.left + br.width * 0.5, nr.height * 0.5, 0.85)
      if (sound) {
        plipRef.current = plipRef.current || createPlip()
        plipRef.current(460 + next * 55)
      }
      if (value === undefined) setInner(it.id)
      onValueChange?.(it.id)
    }

    return (
      <nav
        ref={(node) => {
          navRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node
        }}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        data-tone={tone}
        data-compact={compact === undefined ? undefined : String(compact)}
        data-fullwidth={fullWidth ? "true" : undefined}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onKeyDown={onKey}
        className={["nimbus-nav", className].filter(Boolean).join(" ")}
        style={{
          height: sz.h,
          padding: sz.outer,
          gap: sz.gap,
          fontSize: sz.font,
          ["--n-pad" as string]: `${sz.outer}px`,
          ...style,
        }}
      >
        {/* Hidden SVG lens filter — gives real backdrop refraction in Chromium */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
          <defs>
            <filter id="nimbus-refract" x="-15%" y="-30%" width="130%" height="160%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves={2} seed={7} result="noise" />
              <feGaussianBlur in="noise" stdDeviation="1.5" result="soft" />
              <feDisplacementMap in="SourceGraphic" in2="soft" scale={14} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <div className="nimbus-glass" aria-hidden />
        {glOk ? (
          <canvas ref={canvasRef} className="nimbus-canvas" aria-hidden />
        ) : (
          <div
            className="nimbus-fb-drop"
            style={{ ["--d-x" as string]: `${fbBox.x}px`, ["--d-w" as string]: `${fbBox.w}px` }}
            aria-hidden
          />
        )}

        {items.map((it, idx) => {
          const active = it.id === activeId
          const fx: IconFx = it.fx ?? (["spin", "drop", "wave", "glow", "pop"][idx % 5] as IconFx)
          const common = {
            ref: (el: HTMLElement | null) => {
              btnRefs.current[idx] = el
            },
            className: "nimbus-btn",
            "data-active": active,
            "data-fx": fx,
            "data-testid": it.testId,
            "aria-current": active ? ("page" as const) : undefined,
            onClick: (e: React.MouseEvent) => pick(it, idx, e),
            style: { height: sz.h - sz.outer * 2, padding: `0 ${sz.padX}px` },
          }
          const body = (
            <>
              {it.icon && <span className="nimbus-ico">{it.icon}</span>}
              <span className="nimbus-label">{it.label}</span>
              {it.badge}
            </>
          )
          return it.href ? (
            <a key={it.id} href={it.href} {...common}>
              {body}
            </a>
          ) : (
            <button key={it.id} type="button" {...common}>
              {body}
            </button>
          )
        })}
      </nav>
    )
  }
)

export default LiquidNavbar
