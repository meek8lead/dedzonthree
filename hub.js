'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.3 — HUB (lava lamp, prog rock, detailed bartender, shooting fixed)

let hubMode = false;
let hubScene = null;
let hubPlayer = null;
let hubInteractables = [];
let hubNearest = null;
let hubBobPhase = 0;

let hubCasinoSpins = 0;
let hubDiceRolls = 0;
let hubCasinoActive = false;
let hubDiceActive = false;
let hubBloodActive = false;

const BAR_ROBOT_LINES = [
  "Слышал, Illusionist копий наплодил? Бей оригинала, не копии.",
  "BFG — легенда. Выпала — бери не думая.",
  "Пиромант + Подрывник = Pyroclasm. Взрывы поджигают. Красота.",
  "Танк не сдохнет. Ну, почти.",
  "Кредиты копятся. Не забудь заглянуть в казино.",
  "Манекен в углу скучает. Проверь ДПС своего ствола.",
  "Некрономикон — это книжка. Смертельная книжка.",
  "Ice Dog кусает больно. Freeze — наше всё.",
  "У Fortifier щит 4 метра. Убивай его первым.",
  "Tank имеет 450 HP. Просто чтоб ты знал.",
  "Wallbreaker стреляет огнём вдоль стены. Не стой на пути.",
  "Трикстеры — хаос. Просто беги.",
  "Синергии решают. 7 карт = уровень 3.",
  "Пити-система: 6 волн без тега = гарантия.",
  "Иллюзионист летает. Доставай что-то дальнее.",
  "Снайпер бьёт точно. Не стой на линии.",
  "Мортирщик стреляет по дуге. Не стой на месте.",
  "Дуо-синергии — сила. Чекни панель.",
  "Станция крови — не для слабых. HP на кредиты.",
  "Кости судьбы — рандом. Но вкусный.",
  "Не забудь: реролл стола карт стоит 20 кредитов.",
  "Одна карта за визит — уже хорошо. Две — прекрасно.",
  "Совет: перед телепортом проверь синергии.",
  "Крит + Огонь = Deadshot. Криты поджигают.",
  "Ice + Explosive = Cryo Blast. Взрывы морозят.",
  "Ребята на сцене жарят прог-рок. Слышишь бас? Это Фил.",
  "Стекло мутное, но басы слышно за версту.",
  "За этой стойкой я уже 300 лет. Не жалуюсь.",
  "А вот этот рифф — моя любимая часть сета.",
  "Гитарист слева — у него волосы длиннее чем мои провода.",
  "Не стой на пути у барабанщика. У него палочки острые.",
];

// ═══════════════ ПРОЦЕДУРНЫЙ ПРОГ-РОК ═══════════════
class HubMusic {
  constructor(){
    this.started = false;
    this.step = 0;
    this.nextNoteTime = 0;
    this.tempo = 84;
    this.stepDur = 60 / this.tempo / 2; // 8-е ноты
    this.lookahead = 0.25;
    this.gain = null;
    this.interval = null;
    this._volume = 0.10;
  }
  start(){
    if(this.started) return;
    const ctx = audio.ctx;
    if(!ctx) return;
    if(ctx.state === 'suspended'){ try { ctx.resume(); } catch(e){} }
    this.started = true;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(audio.master);
    this.gain.gain.linearRampToValueAtTime(this._volume, ctx.currentTime + 1.8);
    this.nextNoteTime = ctx.currentTime + 0.15;
    this.step = 0;
    this.interval = setInterval(() => this._scheduler(), 100);
  }
  stop(){
    if(!this.started) return;
    this.started = false;
    clearInterval(this.interval);
    this.interval = null;
    if(this.gain){
      const ctx = audio.ctx;
      try {
        this.gain.gain.cancelScheduledValues(ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
      } catch(e){}
      const g = this.gain;
      this.gain = null;
      setTimeout(() => { try { g.disconnect(); } catch(e){} }, 1200);
    }
  }
  _scheduler(){
    if(!this.started || !this.gain) return;
    const ctx = audio.ctx;
    const maxSteps = 32;
    let count = 0;
    while(this.nextNoteTime < ctx.currentTime + this.lookahead && count < maxSteps){
      this._scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += this.stepDur;
      this.step++;
      count++;
    }
  }
  _scheduleStep(step, time){
    // 5/4 такт = 10 восьмых
    const s = step % 10;
    const bar = Math.floor(step / 10) % 4;

    // KICK: доли 1 и 4 (восьмые 0 и 6)
    if(s === 0 || s === 6) this._kick(time, 0.55);

    // SNARE: доля 3 (восьмая 4)
    if(s === 4) this._snare(time);

    // HAT: на каждой восьмой
    this._hat(time, s);

    // BASS
    const bassRoots = [55, 43.65, 49, 41.20]; // A1, F1, G1, E1
    const root = bassRoots[bar];
    if(s === 0) this._bass(root, time, this.stepDur * 1.6);
    if(s === 4) this._bass(root * 1.5, time, this.stepDur * 1.2);
    if(s === 6) this._bass(root * 1.335, time, this.stepDur * 1.3);

    // CHORD PAD: старт такта
    if(s === 0){
      const chords = [
        [220, 261.63, 329.63],   // Am
        [174.61, 220, 261.63],   // F
        [196, 246.94, 293.66],   // G
        [164.81, 196, 246.94],   // Em
      ];
      this._pad(chords[bar], time, this.stepDur * 10);
    }

    // LEAD: редкие ноты
    if(Math.random() < 0.07 && (s === 1 || s === 3 || s === 7 || s === 9)){
      const leadScale = [440, 493.88, 523.25, 587.33, 659.25, 783.99];
      this._lead(leadScale[Math.floor(Math.random() * leadScale.length)], time);
    }
  }
  _kick(t, vol){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + 0.35);
  }
  _snare(t){
    const ctx = audio.ctx;
    const n = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/n, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.30, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filt); filt.connect(g); g.connect(this.gain);
    src.start(t); src.stop(t + 0.15);
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 190;
    g2.gain.setValueAtTime(0.20, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g2); g2.connect(this.gain);
    o.start(t); o.stop(t + 0.1);
  }
  _hat(t, s){
    const ctx = audio.ctx;
    const n = Math.floor(ctx.sampleRate * 0.035);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<n; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 8000;
    const g = ctx.createGain();
    const vol = (s % 2 === 0) ? 0.09 : 0.04;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(filt); filt.connect(g); g.connect(this.gain);
    src.start(t); src.stop(t + 0.04);
  }
  _bass(freq, t, dur){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(280, t + dur);
    filt.Q.value = 4;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.20, t + 0.01);
    g.gain.setValueAtTime(0.20, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(filt); filt.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  _pad(freqs, t, dur){
    const ctx = audio.ctx;
    freqs.forEach(freq => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = (Math.random() - .5) * 12;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1100;
      filt.Q.value = 2;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.35);
      g.gain.setValueAtTime(0.035, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(filt); filt.connect(g); g.connect(this.gain);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }
  _lead(freq, t){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1800, t);
    filt.frequency.exponentialRampToValueAtTime(700, t + 0.4);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(filt); filt.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + 0.42);
  }
}

class Hub {
  constructor(){
    this.group = new THREE.Group();
    this.parts = {};
    this.dummyHits = [];
    this.traces = [];
    this.mouseDown = false;
    this.lastShotTime = 0;
    this.robotChatTimer = 20 + Math.random()*15;
    this._chatTimeout = null;
    this.roomRadius = 12;
    this.roomHeight = 5;
    this.hubReloading = false;
    this.hubReloadTimer = 0;
    this.hubReloadBase = 1;
    this.hubRecoilPitch = 0;
    this.music = new HubMusic();
    this.build();
  }

  matFloor(){ return new THREE.MeshStandardMaterial({color:0x1a1a22, roughness:.7, metalness:.6}) }
  matWallBase(){ return new THREE.MeshStandardMaterial({color:0x3a0a14, roughness:.9, metalness:.1, emissive:0x2a0008, emissiveIntensity:.35}) }
  matMetal(){ return new THREE.MeshStandardMaterial({color:0x4a4a52, roughness:.4, metalness:.9}) }
  matDarkMetal(){ return new THREE.MeshStandardMaterial({color:0x1a1a1e, roughness:.6, metalness:.7}) }
  matNeon(color, emissive){ return new THREE.MeshStandardMaterial({color, emissive:emissive||color, emissiveIntensity:1.2, transparent:true, opacity:.9}) }
  matWood(){ return new THREE.MeshStandardMaterial({color:0x5a3a1a, roughness:.85}) }
  matVelvet(){ return new THREE.MeshStandardMaterial({color:0x6a0a2a, roughness:.9, metalness:.05}) }

  a(g, mat, x, y, z, rx, ry, rz, par){
    const m = new THREE.Mesh(g, mat);
    m.position.set(x||0, y||0, z||0);
    m.rotation.set(rx||0, ry||0, rz||0);
    (par || this.group).add(m);
    return m;
  }
  box(w,h,d,mat,x,y,z,par){ return this.a(new THREE.BoxGeometry(w,h,d), mat, x,y,z, 0,0,0, par) }
  cyl(rt,rb,h,s,mat,x,y,z,par,rx){ return this.a(new THREE.CylinderGeometry(rt,rb,h,s), mat, x,y,z, rx===undefined?0:rx, 0,0, par) }
  sph(r,ws,hs,mat,x,y,z,par){ return this.a(new THREE.SphereGeometry(r,ws,hs), mat, x,y,z, 0,0,0, par) }
  cone(r,h,s,mat,x,y,z,par,rx){ return this.a(new THREE.ConeGeometry(r,h,s), mat, x,y,z, rx||0,0,0, par) }
  tor(r,t,rs,ts,mat,x,y,z,par,rx,ry,rz){ return this.a(new THREE.TorusGeometry(r,t,rs,ts), mat, x,y,z, rx,ry,rz, par) }

  build(){
    const R = this.roomRadius, H = this.roomHeight;

    this.cyl(R, R, .1, 48, this.matFloor(), 0, 0, 0);
    for(let r=1; r<R; r+=1){
      this.tor(r, .015, 4, 48, new THREE.MeshBasicMaterial({color:0x00aa66, transparent:true, opacity:.22}), 0, .06, 0, null, Math.PI/2,0,0);
    }

    // ═══ ЛАВАЛАМПА-СТЕНА ═══
    const wall = this.cyl(R, R, H, 48, this.matWallBase(), 0, H/2, 0);
    wall.material.side = THREE.BackSide;
    // Горизонтальные светящиеся полосы
    for(let h=1; h<H; h+=.6){
      this.tor(R-.08, .04, 4, 56, new THREE.MeshBasicMaterial({color:0xff3300, transparent:true, opacity:.15}), 0, h, 0, null, Math.PI/2,0,0);
    }
    // Лава-капли: 90 сфер вдоль стены
    this.parts.lavaBlobs = [];
    const lavaColors = [0xff2200, 0xff5500, 0xff8800, 0xaa0044, 0xaa00aa, 0xff2266];
    for(let i=0; i<90; i++){
      const angle = (i / 90) * Math.PI * 2 + (Math.random() - .5) * .3;
      const dist = R - 0.25 - Math.random() * 0.4;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const size = 0.15 + Math.random() * 0.5;
      const color = lavaColors[Math.floor(Math.random() * lavaColors.length)];
      const blobMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: .55 + Math.random() * .3,
        depthWrite: false
      });
      const blob = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), blobMat);
      blob.position.set(x, Math.random() * H, z);
      blob.scale.set(1, 1 + Math.random() * 1.2, .4);
      blob.userData = {
        baseY: Math.random() * H,
        speed: .1 + Math.random() * .25,
        phase: Math.random() * Math.PI * 2,
        baseSize: size,
        colorHSL: Math.random() * 0.08, // красный-оранжевый
      };
      this.group.add(blob);
      this.parts.lavaBlobs.push(blob);
    }

    // Потолок с балками
    this.cyl(R, R, .05, 48, new THREE.MeshBasicMaterial({color:0x0a0510, transparent:true, opacity:.85}), 0, H, 0);
    for(let i=0; i<4; i++){
      const a = i/4*Math.PI*2 + Math.PI/4;
      this.cyl(.08,.08, R*1.6, 8, this.matMetal(), 0, H-.2, 0, null, 0).rotation.set(0, a, 0);
    }

    // Центр
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 2.0, 0);
    this.group.add(centerGroup);
    const neonRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, .07, 8, 40), this.matNeon(0x00ff88, 0x00aa55));
    neonRing.rotation.x = Math.PI/2;
    centerGroup.add(neonRing);
    const neonRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, .05, 8, 28), this.matNeon(0xff8800, 0xaa4400));
    neonRing2.rotation.x = Math.PI/2;
    centerGroup.add(neonRing2);
    this.parts.centerRing = neonRing;
    this.parts.centerRing2 = neonRing2;
    this.cyl(.18, .3, 1.6, 12, this.matDarkMetal(), 0, .8, 0);

    // Зоны
    this.buildTeleporter(0, -9, 0);
    this.buildCardTable(-9, -4, Math.PI/4);
    this.buildCasino(9, -4, -Math.PI/4);
    this.buildDice(9, 5, -Math.PI*3/4);
    this.buildBloodStation(-9, 5, Math.PI*3/4);
    this.buildDummy(-10.5, 0);
    this.buildBar(-2, 7.5);
    this.buildBarRobot(-2, 8.3);
    this.buildStage(0, 10);

    // Диско-шар
    const discoBall = this.sph(.45, 20, 16,
      new THREE.MeshStandardMaterial({color:0x888899, metalness:1, roughness:.1, emissive:0x222244, emissiveIntensity:.4}),
      0, H - 1.2, 0);
    this.parts.discoBall = discoBall;
    const discoLight = new THREE.PointLight(0xff44aa, 2, 12);
    discoLight.position.set(0, H - 1.2, 0);
    this.group.add(discoLight);
    this.parts.discoLight = discoLight;

    // Освещение
    this.group.add(new THREE.AmbientLight(0x2a1020, .8));
    const centerLight = new THREE.PointLight(0xff6600, 2.5, 15);
    centerLight.position.set(0, 3, 0);
    this.group.add(centerLight);
    this.parts.centerLight = centerLight;

    [
      {pos:[0,3,-9], color:0x8844ff},
      {pos:[-9,3,-4], color:0xffaa00},
      {pos:[9,3,-4], color:0xff2266},
      {pos:[9,3,5], color:0x00ddff},
      {pos:[-9,3,5], color:0xff2222},
      {pos:[-10.5,3,0], color:0x66ccff},
      {pos:[-2,3,7.5], color:0xff8800},
      {pos:[0,3.5,10], color:0xff22aa},
    ].forEach(zl=>{
      const l = new THREE.PointLight(zl.color, 1.8, 8);
      l.position.set(...zl.pos);
      this.group.add(l);
    });

    for(let i=0; i<80; i++){
      const theta = Math.random()*Math.PI*2;
      const r = Math.random()*R*.9;
      this.sph(.02,4,4, new THREE.MeshBasicMaterial({color:0xffffff}), Math.cos(theta)*r, H-.1, Math.sin(theta)*r);
    }

    return this.group;
  }

  buildTeleporter(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.cyl(1.6, 1.8, .22, 28, this.matDarkMetal(), 0, .11, 0, g);
    this.cyl(1.5, 1.5, .06, 28, this.matMetal(), 0, .24, 0, g);
    for(let s of [-1, 1]){
      this.cyl(.12,.18, 3.4, 8, this.matDarkMetal(), s*1.4, 1.7, 0, g);
      this.tor(.32, .06, 6, 14, this.matNeon(0x8844ff), s*1.4, 3.4, 0, g, Math.PI/2,0,0);
    }
    const portal = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({color:0x8844ff, transparent:true, opacity:.35, side:THREE.DoubleSide, depthWrite:false}));
    portal.position.set(0, 1.8, 0);
    g.add(portal);
    this.parts.portal = portal;
    const glow = new THREE.PointLight(0x8844ff, 4, 5);
    glow.position.set(0, 1.8, 0);
    g.add(glow);
    this.parts.teleporter = g;
    this.registerInteractable('teleporter', g, 'ТЕЛЕПОРТЕР → СЛЕД. ВОЛНА', 2.0, 0x8844ff);
  }

  buildCardTable(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    for(let s1 of [-1,1]) for(let s2 of [-1,1]){
      this.cyl(.09,.11,.85,8, this.matMetal(), s1*.75, .42, s2*.55, g);
    }
    this.box(2.2, .1, 1.4, this.matWood(), 0, .9, 0, g);
    this.box(2.05, .02, 1.3, new THREE.MeshStandardMaterial({color:0x0a5a2a, roughness:.9}), 0, .97, 0, g);
    for(let i=0; i<3; i++){
      this.box(.34, .46, .01, new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:.7}), -.7+i*.7, 1.22, 0, g);
    }
    const l = new THREE.PointLight(0xffaa00, 1.2, 4);
    l.position.set(0, 1.6, 0);
    g.add(l);
    this.registerInteractable('cards', g, 'СТОЛ КАРТ — КУПИТЬ КАРТУ', 2.7, 0xffaa00);
  }

  buildCasino(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.box(1.6, 2.4, .9, this.matDarkMetal(), 0, 1.2, 0, g);
    this.tor(.8, .06, 8, 20, this.matNeon(0xff2266), 0, 2.55, .4, g);
    this.box(1.35, 1.0, .05, new THREE.MeshBasicMaterial({color:0x110011}), 0, 1.65, .46, g);
    this.parts.casinoReels = [];
    for(let i=0; i<3; i++){
      const reel = this.box(.34, .34, .02, new THREE.MeshBasicMaterial({color:0xff2266, transparent:true, opacity:.8}), -.45+i*.45, 1.65, .5, g);
      this.parts.casinoReels.push(reel);
    }
    this.cyl(.05,.05,.45,6, this.matMetal(), .9, 1.65, 0, g, Math.PI/2);
    this.sph(.12,8,8, new THREE.MeshStandardMaterial({color:0xff2222, emissive:0x880000, emissiveIntensity:.6}), .9, 1.65, .25, g);
    this.box(1.35, .35, .18, this.matMetal(), 0, .55, .5, g);
    this.registerInteractable('casino', g, 'КАЗИНО (10💰/спин)', 2.7, 0xff2266);
  }

  buildDice(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.cyl(.9, 1.0, .45, 16, this.matDarkMetal(), 0, .225, 0, g);
    this.sph(.55, 12, 8, this.matVelvet(), 0, .6, 0, g).scale.set(1.2,.4,1.2);
    const diceMat = new THREE.MeshStandardMaterial({color:0xffdd00, metalness:.7, roughness:.3, emissive:0xaa5500, emissiveIntensity:.4});
    const dice = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 0), diceMat);
    dice.position.set(0, 1.25, 0);
    g.add(dice);
    this.parts.dice = dice;
    const diceLight = new THREE.PointLight(0xffdd00, 1.8, 3.5);
    diceLight.position.set(0, 1.6, 0);
    g.add(diceLight);
    this.registerInteractable('dice', g, 'КОСТИ СУДЬБЫ (5💰/бросок)', 2.7, 0x00ddff);
  }

  buildBloodStation(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    const metalM = new THREE.MeshStandardMaterial({color:0x2a2a30, metalness:.9, roughness:.2});
    const bloodM = new THREE.MeshStandardMaterial({color:0x8a0000, emissive:0xff0000, emissiveIntensity:.6, transparent:true, opacity:.9});
    const glassM = new THREE.MeshStandardMaterial({color:0xff2222, transparent:true, opacity:.35, metalness:.1, roughness:.05});
    this.box(1.8, .28, 1.1, this.matDarkMetal(), 0, .14, 0, g);
    this.cyl(.6, .75, 2.0, 12, metalM, 0, 1.28, 0, g);
    this.cyl(.44, .44, 1.3, 16, glassM, 0, 1.28, .55, g);
    this.cyl(.32, .32, 1.1, 16, bloodM, 0, 1.12, .55, g);
    for(let s of [-1,1]){
      this.tor(.16, .03, 6, 12, bloodM, s*.38, 1.65, .32, g, Math.PI/2, 0, 0);
    }
    this.cone(.11, .38, 8, metalM, 0, 2.38, 0, g);
    this.cyl(.022, .022, .55, 6, metalM, 0, 2.83, 0, g);
    const beacon = this.sph(.11, 8, 8, new THREE.MeshBasicMaterial({color:0xff0000}), 0, 3.28, 0, g);
    this.parts.bloodBeacon = beacon;
    const light = new THREE.PointLight(0xff0000, 2.2, 4.5);
    light.position.set(0, 1.6, 0);
    g.add(light);
    this.parts.bloodLight = light;
    this.parts.bloodDrops = [];
    for(let i=0; i<4; i++){
      const drop = this.sph(.045, 6, 6, bloodM, (Math.random()-.5)*.3, 1.7 + Math.random()*.4, .55);
      this.parts.bloodDrops.push({mesh: drop, phase: Math.random()});
    }
    this.registerInteractable('blood', g, 'СТАНЦИЯ КРОВИ — HP НА 💰', 2.7, 0xff2222);
  }

  buildDummy(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);
    const padM = new THREE.MeshStandardMaterial({color:0x2a2a30, metalness:.8, roughness:.3});
    const bodyM = new THREE.MeshStandardMaterial({color:0xc8a878, roughness:.85, metalness:.1});
    const tapeM = new THREE.MeshStandardMaterial({color:0x8b2020, roughness:.6, metalness:.15});
    const headM = new THREE.MeshStandardMaterial({color:0xd4b890, roughness:.85, metalness:.1});
    const eyeM = new THREE.MeshBasicMaterial({color:0});
    this.cyl(.75, .95, .16, 16, padM, 0, .08, 0, g);
    this.cyl(.09, .11, .6, 8, padM, 0, .46, 0, g);
    const torso = this.cyl(.46, .55, 1.4, 14, bodyM, 0, 1.42, 0, g);
    for(let i=0; i<4; i++){
      this.tor(.55 - i*.02, .033, 6, 16, tapeM, 0, .98 + i*.3, 0, g, Math.PI/2, 0, 0);
    }
    const head = this.sph(.3, 14, 12, headM, 0, 2.32, 0, g);
    this.box(.11, .045, .02, eyeM, -.11, 2.38, .28, g);
    this.box(.045, .11, .02, eyeM, -.11, 2.38, .28, g);
    this.box(.11, .045, .02, eyeM, .11, 2.38, .28, g);
    this.box(.045, .11, .02, eyeM, .11, 2.38, .28, g);
    const targetM = new THREE.MeshBasicMaterial({color:0xff2222});
    this.tor(.27, .033, 6, 24, targetM, 0, 1.47, .54, g, Math.PI/2, 0, 0);
    this.tor(.16, .022, 6, 24, targetM, 0, 1.47, .55, g, Math.PI/2, 0, 0);
    this.sph(.055, 8, 8, targetM, 0, 1.47, .54, g);
    this.cyl(.022, .022, 1.6, 4, this.matMetal(), -.6, 1.95, -.22, g);
    this.box(.38, .24, .01, new THREE.MeshBasicMaterial({color:0xff8800, side:THREE.DoubleSide}), -.38, 2.6, -.22, g);

    const hitGeo = new THREE.CylinderGeometry(.6, .6, 2.7, 12);
    const hitMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false});
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, 1.4, 0);
    g.add(hitMesh);

    this.dummy = {
      group: g,
      hitMesh: hitMesh,
      bodyMesh: torso,
      headMesh: head,
      flashTimer: 0,
      origBodyEmissive: bodyM.emissive.clone(),
      bodyMat: bodyM,
      headMat: headM,
    };
  }

  buildBar(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);
    this.box(5.0, 1.2, .55, this.matWood(), 0, .6, 0, g);
    this.box(5.1, .12, .6, this.matMetal(), 0, 1.26, 0, g);
    const bottleColors = [0x00aa55, 0xaa2222, 0x2266aa, 0xaa8800, 0x88aaff, 0xffaa22];
    for(let i=0; i<12; i++){
      this.cyl(.055,.07,.3+Math.random()*.25, 6,
        new THREE.MeshStandardMaterial({color:bottleColors[i%6], emissive:bottleColors[i%6], emissiveIntensity:.35}),
        -2.1 + i*.4, 1.5, 0, g);
    }
    for(let i=0; i<4; i++){
      const sx = -1.8 + i*1.2, sz = -.9;
      this.cyl(.27,.27,.11,12, this.matMetal(), sx, .6, sz, g);
      this.cyl(.055,.055,.6,8, this.matMetal(), sx, .28, sz, g);
      this.cyl(.22,.17,.06,12, this.matDarkMetal(), sx, .06, sz, g);
    }
    this.box(5.0, .08, .4, this.matMetal(), 0, 2.2, -.15, g);
    const neonM = new THREE.MeshBasicMaterial({color:0xff44aa, transparent:true, opacity:.9});
    this.box(2.4, .04, .04, neonM, 0, 2.6, -.15, g);
    this.box(.04, .5, .04, neonM, -1.2, 2.35, -.15, g);
    this.box(.04, .5, .04, neonM, 1.2, 2.35, -.15, g);
    const barLight = new THREE.PointLight(0xff44aa, 1.5, 6);
    barLight.position.set(0, 2.3, 0);
    g.add(barLight);
  }

  buildBarRobot(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI;
    this.group.add(g);

    const metalD = new THREE.MeshStandardMaterial({color:0x2a2a34, metalness:.9, roughness:.3});
    const metalL = new THREE.MeshStandardMaterial({color:0x5a5a66, metalness:.85, roughness:.25});
    const chrome = new THREE.MeshStandardMaterial({color:0x9a9aa6, metalness:1, roughness:.1});
    const dark = new THREE.MeshStandardMaterial({color:0x0a0a0e, metalness:.7, roughness:.5});
    const accentO = new THREE.MeshStandardMaterial({color:0xff8800, emissive:0xff4400, emissiveIntensity:.8, metalness:.6, roughness:.3});
    const eyeM = new THREE.MeshBasicMaterial({color:0x00ff88});
    const eyeM2 = new THREE.MeshBasicMaterial({color:0xff3300});

    // Основание
    this.cyl(.5, .55, .3, 14, dark, 0, .15, 0, g);
    this.tor(.52, .04, 6, 16, accentO, 0, .15, 0, g, Math.PI/2, 0, 0);

    // Колонна
    this.cyl(.18, .22, .8, 10, metalD, 0, .7, 0, g);

    // Торс — 2 сегмента
    this.box(.7, .4, .5, metalD, 0, 1.2, 0, g);
    this.box(.9, .55, .55, metalL, 0, 1.65, 0, g);
    this.box(.6, .3, .06, accentO, 0, 1.65, .29, g);

    // LED-индикаторы
    this.parts.barRobotLeds = [];
    for(let i=0; i<5; i++){
      const led = this.sph(.03, 6, 6,
        new THREE.MeshBasicMaterial({color:[0xff0000, 0xff8800, 0xffdd00, 0x00ff00, 0x0088ff][i]}),
        -.24 + i*.12, 1.65, .32, g);
      this.parts.barRobotLeds.push(led);
    }

    // Шея — сегменты
    this.cyl(.09, .09, .15, 8, chrome, 0, 2.0, 0, g);
    this.tor(.1, .02, 4, 12, dark, 0, 2.08, 0, g, Math.PI/2, 0, 0);
    this.cyl(.09, .09, .15, 8, chrome, 0, 2.15, 0, g);
    this.tor(.1, .02, 4, 12, dark, 0, 2.23, 0, g, Math.PI/2, 0, 0);

    // Голова
    const headG = new THREE.Group();
    headG.position.set(0, 2.48, 0);
    g.add(headG);
    this.parts.barRobotHead = headG;

    const skull = this.sph(.32, 16, 14, metalL, 0, 0, 0, headG);
    skull.scale.set(1, .9, 1.05);
    this.box(.5, .16, .05, dark, 0, 0, .28, headG);
    const eyeL = this.sph(.07, 8, 8, eyeM, -.12, 0, .31, headG);
    const eyeR = this.sph(.07, 8, 8, eyeM, .12, 0, .31, headG);
    this.parts.barRobotEyes = [eyeL.material, eyeR.material];

    for(let s of [-1, 1]){
      const ear = this.cyl(.11, .11, .08, 12, dark, s*.32, 0, 0, headG, 0);
      ear.rotation.z = Math.PI/2;
      const earTrim = this.cyl(.07, .07, .01, 8, chrome, s*.37, 0, 0, headG, 0);
      earTrim.rotation.z = Math.PI/2;
    }
    for(let i=0; i<4; i++){
      this.box(.05, .012, .02, dark, -.1 + i*.065, -.13, .3, headG);
    }
    this.cyl(.015, .015, .35, 4, chrome, 0, .5, 0, headG);
    const antBall = this.sph(.06, 8, 8, eyeM2, 0, .7, 0, headG);
    this.parts.barRobotAntenna = antBall;

    // Плечи
    this.sph(.14, 10, 8, chrome, -.48, 1.85, 0, g);
    this.sph(.14, 10, 8, chrome, .48, 1.85, 0, g);

    // Левая рука (держит кружку)
    const armL = new THREE.Group();
    armL.position.set(-.48, 1.85, 0);
    g.add(armL);
    this.parts.barRobotArmL = armL;
    this.cyl(.06, .06, .35, 6, metalL, 0, -.2, 0, armL);
    this.sph(.08, 8, 8, chrome, 0, -.4, 0, armL);
    const forearmL = new THREE.Group();
    forearmL.position.set(0, -.4, 0);
    armL.add(forearmL);
    this.parts.barRobotForearmL = forearmL;
    const foreL = this.cyl(.05, .05, .3, 6, metalL, 0, -.15, .05, forearmL);
    foreL.rotation.x = .3;
    this.sph(.09, 8, 8, dark, 0, -.3, .1, forearmL);
    const mug = new THREE.Group();
    mug.position.set(0, -.3, .25);
    forearmL.add(mug);
    this.cyl(.08, .07, .15, 12, chrome, 0, 0, 0, mug);
    this.tor(.05, .015, 6, 12, chrome, .09, 0, 0, mug, Math.PI/2, 0, 0);
    this.cyl(.075, .075, .01, 12, new THREE.MeshBasicMaterial({color:0x553300}), 0, .076, 0, mug);
    this.parts.barRobotMug = mug;

    // Правая рука (протирает стойку)
    const armR = new THREE.Group();
    armR.position.set(.48, 1.85, 0);
    g.add(armR);
    this.parts.barRobotArmR = armR;
    this.cyl(.06, .06, .35, 6, metalL, 0, -.2, 0, armR);
    this.sph(.08, 8, 8, chrome, 0, -.4, 0, armR);
    const forearmR = new THREE.Group();
    forearmR.position.set(0, -.4, 0);
    armR.add(forearmR);
    this.parts.barRobotForearmR = forearmR;
    const foreR = this.cyl(.05, .05, .35, 6, metalL, 0, -.17, .08, forearmR);
    foreR.rotation.x = .4;
    this.sph(.09, 8, 8, dark, 0, -.35, .15, forearmR);
    const ragM = new THREE.MeshStandardMaterial({color:0xcc3333, roughness:.9});
    this.box(.16, .02, .16, ragM, 0, -.42, .2, forearmR);

    this.parts.barRobot = g;

    const rl = new THREE.PointLight(0x00ff88, .6, 2.5);
    rl.position.set(0, 2.5, 0);
    g.add(rl);
  }

  buildStage(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);

    // Подиум 8×2
    this.box(8.0, .4, 2.0, this.matDarkMetal(), 0, .2, 0, g);
    this.box(8.1, .06, 2.1, new THREE.MeshStandardMaterial({color:0x111118, roughness:.7, metalness:.3}), 0, .42, 0, g);

    // Задняя стена сцены
    this.box(8.0, 4.5, .2, new THREE.MeshStandardMaterial({color:0x0a0a15, roughness:.9}), 0, 2.5, 1.15, g);

    // Мутное стекло
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.30,
      roughness: 0.9, metalness: 0.05,
      emissive: 0x223344, emissiveIntensity: 0.22,
      depthWrite: false, side: THREE.DoubleSide
    });
    const glass = this.a(new THREE.PlaneGeometry(9, 4.5), glassMat, 0, 2.4, -1.2, 0, 0, 0, g);
    this.parts.stageGlass = glass;

    // Рама стекла
    this.box(9.4, .18, .22, this.matMetal(), 0, 4.75, -1.2, g);
    this.box(9.4, .18, .22, this.matMetal(), 0, .05, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), -4.65, 2.4, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), 4.65, 2.4, -1.2, g);
    for (let i = -1; i <= 1; i++) {
      this.box(.06, 4.5, .16, this.matMetal(), i * 2.3, 2.4, -1.2, g);
    }

    // Усилители
    const ampM = new THREE.MeshStandardMaterial({color:0x1a1a1a, metalness:.4, roughness:.8});
    const ampFrontM = new THREE.MeshStandardMaterial({color:0x0a0a0a, metalness:.6, roughness:.5, emissive:0x442200, emissiveIntensity:.4});
    for (let side of [-1, 1]) {
      const ampG = new THREE.Group();
      ampG.position.set(side * 3.5, 0, .7);
      g.add(ampG);
      this.box(1.0, 1.6, 0.55, ampM, 0, 1.2, 0, ampG);
      this.box(0.9, 1.4, 0.06, ampFrontM, 0, 1.2, 0.28, ampG);
      for (let i = 0; i < 6; i++) {
        this.tor(.11, .015, 4, 12, this.matDarkMetal(), -0.3 + (i % 3) * 0.3, 1.6 - Math.floor(i / 3) * 0.25, 0.31, ampG, Math.PI/2, 0, 0);
      }
    }

    this.buildMusicians(g);

    const stageLights = [
      {x: -2.5, color: 0xff22aa, intensity: 3.2},
      {x: 0, color: 0x22ddff, intensity: 2.8},
      {x: 2.5, color: 0xaa44ff, intensity: 3.2}
    ];
    stageLights.forEach(sl => {
      const pl = new THREE.PointLight(sl.color, sl.intensity, 6);
      pl.position.set(sl.x, 3.8, 0);
      g.add(pl);
      this.sph(.12, 8, 8, new THREE.MeshBasicMaterial({color: sl.color}), sl.x, 4.2, -0.5, g);
    });

    this.registerInteractable('stage', g, 'ПРОГ-РОК СЦЕНА · BROADCAST FROM THE VOID', 4.0, 0xff22aa);
  }

  buildMusicians(parent){
    const guitarist = this.buildMusician(-2.4, 0xaa44ff, 'guitar');
    guitarist.group.position.z = 0.35;
    parent.add(guitarist.group);

    const bassist = this.buildMusician(2.4, 0x22ddff, 'bass');
    bassist.group.position.z = 0.35;
    parent.add(bassist.group);

    const drummer = this.buildMusician(0, 0xff6622, 'drums');
    drummer.group.position.z = 0.85;
    parent.add(drummer.group);

    this.parts.musicians = { guitarist, bassist, drummer };
  }

  buildMusician(x, accentColor, role){
    const g = new THREE.Group();
    g.position.set(x, 0.4, 0);
    g.rotation.y = Math.PI;

    const bodyM = new THREE.MeshStandardMaterial({color: 0x0a0a15, roughness: .95, metalness: .1});
    const hairM = new THREE.MeshStandardMaterial({color: 0x141420, roughness: .95});
    const accentM = new THREE.MeshStandardMaterial({color: accentColor, emissive: accentColor, emissiveIntensity: 1.5, metalness: .6, roughness: .3});
    const guitarM = new THREE.MeshStandardMaterial({color: 0x2a1a0a, metalness: .5, roughness: .4, emissive: accentColor, emissiveIntensity: .15});
    const skinM = new THREE.MeshStandardMaterial({color: 0x1a1210, roughness: .95});

    this.a(new THREE.CylinderGeometry(.11, .1, .95, 6), bodyM, -.17, .48, 0, 0, 0, .05, g);
    this.a(new THREE.CylinderGeometry(.11, .1, .95, 6), bodyM, .17, .48, 0, 0, 0, -.05, g);

    this.a(new THREE.CylinderGeometry(.36, .42, 1.05, 8), bodyM, 0, 1.4, 0, 0, 0, 0, g);
    this.a(new THREE.CylinderGeometry(.44, .44, .08, 10), accentM, 0, .92, 0, 0, 0, 0, g);

    const head = this.sph(.24, 12, 10, skinM, 0, 2.15, 0, g);
    this.a(new THREE.BoxGeometry(.6, 1.1, .28), hairM, 0, 1.75, -.14, 0, 0, 0, g);
    this.a(new THREE.BoxGeometry(.22, .9, .22), hairM, -.31, 1.6, 0, 0, 0, .12, g);
    this.a(new THREE.BoxGeometry(.22, .9, .22), hairM, .31, 1.6, 0, 0, 0, -.12, g);
    this.sph(.045, 6, 6, accentM, -.08, 2.2, .21, g);
    this.sph(.045, 6, 6, accentM, .08, 2.2, .21, g);
    this.a(new THREE.BoxGeometry(.3, .2, .1), hairM, 0, 2.02, .18, 0, 0, 0, g);

    const leftArm = this.a(new THREE.CylinderGeometry(.085, .075, .95, 6), bodyM, -.45, 1.6, 0, 0, 0, .25, g);
    const rightArm = this.a(new THREE.CylinderGeometry(.085, .075, .95, 6), bodyM, .45, 1.6, 0, 0, 0, -.25, g);

    let instrument = null;
    if (role === 'guitar' || role === 'bass') {
      const guitarGroup = new THREE.Group();
      this.a(new THREE.BoxGeometry(.55, .38, .12), guitarM, 0, 0, 0, 0, 0, 0, guitarGroup);
      this.a(new THREE.BoxGeometry(.08, 1.0, .08), guitarM, 0, .68, 0, 0, 0, 0, guitarGroup);
      this.a(new THREE.BoxGeometry(.16, .22, .06), guitarM, 0, 1.28, 0, 0, 0, 0, guitarGroup);
      const stringMat = new THREE.MeshBasicMaterial({color: accentColor, transparent: true, opacity: .8});
      for (let i = 0; i < 3; i++) {
        this.a(new THREE.BoxGeometry(.01, 1.3, .01), stringMat, -.12 + i*.12, .55, .06, 0, 0, 0, guitarGroup);
      }
      for (let i = 0; i < 4; i++) {
        this.sph(.022, 4, 4, accentM, 0, .4 + i*.22, .045, guitarGroup);
      }
      guitarGroup.position.set(0, 1.35, .35);
      guitarGroup.rotation.z = -.22;
      guitarGroup.rotation.x = -.15;
      g.add(guitarGroup);
      instrument = guitarGroup;
    } else if (role === 'drums') {
      const kit = new THREE.Group();
      kit.position.set(0, 0, .55);
      this.a(new THREE.CylinderGeometry(.48, .48, .55, 16),
        new THREE.MeshStandardMaterial({color:0x1a0a0a, roughness:.8}), 0, .55, 0, Math.PI/2, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.4, .4, .58, 16),
        new THREE.MeshBasicMaterial({color: accentColor, transparent:true, opacity:.3}), 0, .55, 0, Math.PI/2, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.22, .22, .16, 12),
        new THREE.MeshStandardMaterial({color:0xdddddd, roughness:.5, metalness:.6}), -.45, .65, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.22, .22, .16, 12),
        new THREE.MeshStandardMaterial({color:0xdddddd, roughness:.5, metalness:.6}), .45, .65, 0, 0, 0, 0, kit);
      const cymM = new THREE.MeshStandardMaterial({color:0xddaa22, metalness:.9, roughness:.3, emissive:accentColor, emissiveIntensity:.2});
      this.a(new THREE.CylinderGeometry(.3, .3, .04, 20), cymM, -.7, 1.25, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.28, .28, .04, 20), cymM, .7, 1.25, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.02, .02, 1.0, 6), this.matMetal(), -.7, .75, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.02, .02, 1.0, 6), this.matMetal(), .7, .75, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.015, .015, .6, 6), this.matWood(), -.45, .55, .3, .3, 0, .3, kit);
      this.a(new THREE.CylinderGeometry(.015, .015, .6, 6), this.matWood(), .45, .55, .3, .3, 0, -.3, kit);
      g.add(kit);
      instrument = kit;
    }

    return {
      group: g,
      leftArm, rightArm, head,
      instrument, role,
      phase: Math.random() * Math.PI * 2,
      accentColor,
    };
  }

  registerInteractable(id, group, label, radius, color){
    hubInteractables.push({
      id, group, label, radius, color,
      worldPos: group.position.clone(),
    });
  }

  enter(){
    hubMode = true;
    recoilPitchAccum = 0;
    recoilRollAccum = 0;
    if(!hubScene){
      hubScene = new THREE.Scene();
      hubScene.background = new THREE.Color(0x0a0510);
      hubScene.fog = new THREE.Fog(0x0a0510, 10, 32);
      hubScene.add(this.group);
    }
    if(scene.children.includes(camera)) scene.remove(camera);
    hubScene.add(camera);
    hubPlayer = {
      position: new THREE.Vector3(0, 1.6, -7),
      velocity: new THREE.Vector3(),
      yaw: Math.PI,
      pitch: 0,
      isMoving: false,
      speed: .09
    };
    camera.position.copy(hubPlayer.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = hubPlayer.yaw;
    camera.rotation.x = hubPlayer.pitch;
    camera.rotation.z = 0;
    hubCasinoSpins = 0;
    hubDiceRolls = 0;
    hubCasinoActive = false;
    hubDiceActive = false;
    hubBloodActive = false;
    this.mouseDown = false;
    this.dummyHits = [];
    this.robotChatTimer = 15 + Math.random()*10;
    this.hubReloading = false;
    this.hubReloadTimer = 0;
    this.hubRecoilPitch = 0;
    isReloading = false;
    reloadPhase = 0;
    // Музыка
    try { this.music.start(); } catch(e){ console.warn('Music start failed:', e); }
    document.body.requestPointerLock();
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    document.body.classList.add('hub-mode');
    updateHubHUD();
    showDebugToast('🏨 УБЕЖИЩЕ — WASD ходьба · ЛКМ стрельба · [R] перезарядка · [E] взаимодействие');
    audio.play('sun');
  }

  exit(){
    hubMode = false;
    this.mouseDown = false;
    this.hubReloading = false;
    isReloading = false;
    reloadPhase = 0;
    try { this.music.stop(); } catch(e){}
    if(document.pointerLockElement) document.exitPointerLock();
    if(hubScene && hubScene.children.includes(camera)) hubScene.remove(camera);
    if(!scene.children.includes(camera)) scene.add(camera);
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.rotation.z = 0;
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    const dpsEl = document.getElementById('dps-display');
    if(dpsEl) dpsEl.style.display = 'none';
    const rlEl = document.getElementById('hub-reloading');
    if(rlEl) rlEl.style.display = 'none';
    document.body.classList.remove('hub-mode');
    continueToWave();
  }

  isPlayerPosFree(x, z){
    if(x*x + z*z > (this.roomRadius - .6) * (this.roomRadius - .6)) return false;
    // Блок: бар + сцена (не пропускаем за стойку бара)
    if(z > 6.8) return false;
    return true;
  }

  update(dt){
    if(!hubPlayer) return;

    // Анимации
    if(this.parts.centerRing) this.parts.centerRing.rotation.z += dt*1.2;
    if(this.parts.centerRing2) this.parts.centerRing2.rotation.z -= dt*.8;
    if(this.parts.portal){
      this.parts.portal.rotation.z += dt*.5;
      this.parts.portal.material.opacity = .25 + Math.sin(Date.now()*.003)*.15;
    }
    if(this.parts.centerLight){
      this.parts.centerLight.intensity = 2 + Math.sin(Date.now()*.004)*.5;
    }
    if(this.parts.dice){
      this.parts.dice.rotation.y += dt*.8;
      this.parts.dice.rotation.x += dt*.5;
    }
    if(this.parts.casinoReels){
      this.parts.casinoReels.forEach((r,i)=>{
        if(hubCasinoActive) r.position.y = 1.65 + Math.sin(Date.now()*.02 + i*2)*.08;
        else r.position.y = 1.65;
      });
    }
    if(this.parts.bloodBeacon){
      this.parts.bloodBeacon.material.color.setHSL(0, 1, .4 + Math.sin(Date.now()*.008)*.3);
    }
    if(this.parts.bloodLight){
      this.parts.bloodLight.intensity = 1.8 + Math.sin(Date.now()*.006)*.6;
    }
    if(this.parts.bloodDrops){
      this.parts.bloodDrops.forEach(d=>{
        d.phase += dt*.6;
        if(d.phase > 1){ d.phase = 0; d.mesh.position.y = 2.1; }
        d.mesh.position.y = Math.max(.6, 2.1 - d.phase*1.5);
      });
    }
    if(this.parts.discoBall){
      this.parts.discoBall.rotation.y += dt*1.5;
      this.parts.discoBall.rotation.x += dt*.7;
    }
    if(this.parts.discoLight){
      const h = (Date.now()*.0003) % 1;
      this.parts.discoLight.color.setHSL(h, 1, .5);
      this.parts.discoLight.intensity = 1.5 + Math.sin(Date.now()*.008)*.8;
    }

    // ═══ ЛАВАЛАМПА ═══
    if(this.parts.lavaBlobs){
      const t = Date.now() * .001;
      this.parts.lavaBlobs.forEach((blob, i) => {
        const ud = blob.userData;
        // Медленный подъём-спуск по синусоиде
        const y = ud.baseY + Math.sin(t * ud.speed + ud.phase) * 1.8;
        blob.position.y = ((y % this.roomHeight) + this.roomHeight) % this.roomHeight;
        // Пульс размера
        const pulse = 1 + Math.sin(t * (ud.speed * 2) + ud.phase * 1.3) * .35;
        blob.scale.x = pulse;
        blob.scale.y = (1 + Math.sin(t * ud.speed * 1.4 + ud.phase) * .5);
        blob.scale.z = .4;
        // Меняем цвет по HSL — красный → оранжевый → фиолетовый
        const hueShift = (Math.sin(t * .3 + ud.phase) + 1) * .5;
        const hue = ud.colorHSL + hueShift * .05;
        blob.material.color.setHSL(hue, 1, .5 + Math.sin(t * 2 + ud.phase) * .15);
      });
    }

    // Бармен
    this.updateBarRobot(dt);

    // Манекен
    if(this.dummy){
      if(this.dummy.flashTimer > 0){
        this.dummy.flashTimer -= dt;
        if(this.dummy.bodyMat) this.dummy.bodyMat.emissive.setRGB(1,.5,.2);
        if(this.dummy.headMat) this.dummy.headMat.emissive.setRGB(1,.5,.2);
      } else {
        if(this.dummy.bodyMat) this.dummy.bodyMat.emissive.copy(this.dummy.origBodyEmissive);
        if(this.dummy.headMat) this.dummy.headMat.emissive.setRGB(0,0,0);
      }
    }

    this.updateMusicians(dt);

    // Обновляем оружие ДО камеры
    // Синхронизируем bob с хабом
    player.isMoving = hubPlayer.isMoving;
    player.bobPhase = hubBobPhase;

    // ТИК ПЕРЕЗАРЯДКИ
    if(this.hubReloading){
      this.hubReloadTimer -= dt;
      const rlEl = document.getElementById('hub-reloading');
      if(rlEl) rlEl.style.display = 'block';
      reloadPhase = Math.max(0, Math.min(1, 1 - this.hubReloadTimer / this.hubReloadBase));
      if(this.hubReloadTimer <= 0){
        const w = currentWeapon;
        if(w) setAmmo(w.magSize);
        this.hubReloading = false;
        isReloading = false;
        reloadPhase = 0;
        if(weaponView) weaponView.finishReload();
        audio.pickup();
        if(rlEl) rlEl.style.display = 'none';
        this.updateHubAmmoHUD();
      }
    } else {
      const rlEl = document.getElementById('hub-reloading');
      if(rlEl) rlEl.style.display = 'none';
    }

    if(weaponView) weaponView.update(dt);

    // Логика
    if(!hubCasinoActive && !hubDiceActive && !hubBloodActive && !isNestActive && !isSynergyPanelOpen){
      this.updatePlayerMovement(dt);
      this.updateShooting(dt);
    } else {
      this.mouseDown = false;
    }

    // Затухание отдачи
    this.hubRecoilPitch *= Math.pow(0.001, dt);
    if(Math.abs(this.hubRecoilPitch) < 0.0005) this.hubRecoilPitch = 0;

    // ЕДИНСТВЕННОЕ место, где camera.rotation задаётся в хабе
    camera.rotation.order = 'YXZ';
    camera.rotation.y = hubPlayer.yaw;
    camera.rotation.x = hubPlayer.pitch + this.hubRecoilPitch;
    camera.rotation.z = 0;

    this.updateTraces(dt);
    this.updateDpsDisplay();
    this.updateRobotChat(dt);
    this.checkInteract();
    updateHubHUD();
  }

  updateBarRobot(dt){
    const t = Date.now() * 0.001;
    if(this.parts.barRobotHead){
      this.parts.barRobotHead.rotation.y = Math.sin(t*.9)*.4;
      this.parts.barRobotHead.rotation.x = Math.sin(t*1.3)*.12;
      this.parts.barRobotHead.rotation.z = Math.sin(t*.6)*.05;
    }
    if(this.parts.barRobotEyes){
      const blink = (Date.now() % 4000) < 90 ? 0 : 1;
      this.parts.barRobotEyes.forEach(m => m.color.setRGB(0, blink, blink*.6));
    }
    if(this.parts.barRobotLeds){
      this.parts.barRobotLeds.forEach((led, i) => {
        const ph = (Date.now()*.003 + i*.5) % (Math.PI*2);
        led.material.color.setHSL(i/5, 1, .5 + Math.sin(ph)*.3);
      });
    }
    if(this.parts.barRobotAntenna){
      const pulse = .7 + Math.sin(Date.now()*.004)*.3;
      this.parts.barRobotAntenna.material.color.setRGB(pulse, 0, 0);
    }
    if(this.parts.barRobotArmR){
      // протирает стойку
      this.parts.barRobotArmR.rotation.x = -.3 + Math.sin(t*1.5)*.15;
      if(this.parts.barRobotForearmR) this.parts.barRobotForearmR.rotation.x = -.5 + Math.sin(t*2.4)*.2;
    }
    if(this.parts.barRobotArmL){
      // кружка покачивается
      this.parts.barRobotArmL.rotation.z = -.1 + Math.sin(t*1.1)*.06;
    }
    if(this.parts.barRobotMug){
      this.parts.barRobotMug.rotation.z = Math.sin(t*1.8)*.12;
    }
  }

  updateMusicians(dt){
    if(!this.parts.musicians) return;
    const t = Date.now() * 0.001;
    const { guitarist, bassist, drummer } = this.parts.musicians;

    if(guitarist){
      const strum = Math.sin(t * 7 + guitarist.phase);
      guitarist.rightArm.rotation.x = strum * 0.35;
      guitarist.leftArm.rotation.x = Math.sin(t * 7 + guitarist.phase + .4) * 0.15;
      guitarist.head.rotation.y = Math.sin(t * 1.8) * 0.25;
      guitarist.head.rotation.z = Math.sin(t * 1.8 + 1) * 0.08;
      guitarist.group.position.y = 0.4 + Math.sin(t * 3.5) * 0.04;
    }
    if(bassist){
      const strum = Math.sin(t * 4.5 + bassist.phase + 2);
      bassist.rightArm.rotation.x = strum * 0.28;
      bassist.leftArm.rotation.x = Math.sin(t * 4.5 + bassist.phase + 2.4) * 0.12;
      bassist.head.rotation.y = Math.sin(t * 1.3 + 1) * 0.22;
      bassist.group.rotation.z = Math.sin(t * 2.1) * 0.04;
      bassist.group.position.y = 0.4 + Math.sin(t * 2.8 + 1) * 0.035;
    }
    if(drummer){
      const hit = Math.abs(Math.sin(t * 9 + drummer.phase));
      const hit2 = Math.abs(Math.sin(t * 9 + drummer.phase + Math.PI));
      drummer.leftArm.rotation.x = -hit * 0.7;
      drummer.rightArm.rotation.x = -hit2 * 0.7;
      drummer.head.rotation.y = Math.sin(t * 2.5) * 0.15;
      drummer.head.rotation.x = hit * 0.1;
    }
  }

  updatePlayerMovement(dt){
    const mv = new THREE.Vector3();
    if(keys['KeyW']) mv.z -= 1;
    if(keys['KeyS']) mv.z += 1;
    if(keys['KeyA']) mv.x -= 1;
    if(keys['KeyD']) mv.x += 1;
    hubPlayer.isMoving = mv.length() > 0;
    if(hubPlayer.isMoving){
      mv.normalize();
      mv.applyAxisAngle(new THREE.Vector3(0,1,0), hubPlayer.yaw);
      mv.multiplyScalar(hubPlayer.speed);

      const nx = hubPlayer.position.x + mv.x;
      if(this.isPlayerPosFree(nx, hubPlayer.position.z)) hubPlayer.position.x = nx;
      const nz = hubPlayer.position.z + mv.z;
      if(this.isPlayerPosFree(hubPlayer.position.x, nz)) hubPlayer.position.z = nz;

      for(const zone of hubInteractables){
        const dx = hubPlayer.position.x - zone.worldPos.x;
        const dz = hubPlayer.position.z - zone.worldPos.z;
        const d = Math.sqrt(dx*dx+dz*dz);
        const minD = 1.2;
        if(d < minD && d > 0.001){
          hubPlayer.position.x = zone.worldPos.x + dx/d*minD;
          hubPlayer.position.z = zone.worldPos.z + dz/d*minD;
        }
      }

      hubBobPhase += dt*10;
      const bobY = Math.sin(hubBobPhase*2)*.035;
      const bobX = Math.cos(hubBobPhase)*.05;
      camera.position.x = hubPlayer.position.x + bobX;
      camera.position.z = hubPlayer.position.z;
      camera.position.y = hubPlayer.position.y + bobY;
    } else {
      camera.position.copy(hubPlayer.position);
    }
  }

  updateShooting(dt){
    if(!this.dummy) return;
    if(!document.pointerLockElement) return;
    if(!this.mouseDown) return;

    const w = currentWeapon;
    if(!w) return;

    if(this.hubReloading) return;

    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);

    // Авто-перезарядка при пустом магазине
    if(!noAmmoClass && getAmmo() <= 0){
      this._startReload();
      return;
    }

    const rate = w.fireRate || 2;
    const now = performance.now();
    if(now - this.lastShotTime < 1000 / rate) return;
    this.lastShotTime = now;

    audio.play(w.weaponClass);
    if(weaponView) weaponView.recoilOffset = 0.09;

    this.hubRecoilPitch = Math.min(0.06, this.hubRecoilPitch + 0.028);

    if(!noAmmoClass){
      setAmmo(getAmmo() - 1);
      this.updateHubAmmoHUD();
    }

    const from = camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const spread = (w.spread || 0) * .35 + .006;
    dir.x += (Math.random()-.5)*spread;
    dir.y += (Math.random()-.5)*spread*.5;
    dir.z += (Math.random()-.5)*spread;
    dir.normalize();

    const range = Math.min(w.range || 30, 30);

    // Raycast — манекен
    const raycaster = new THREE.Raycaster(from, dir, 0, range);
    const dummyHit = raycaster.intersectObject(this.dummy.hitMesh, false);
    let hitDummy = false;
    let hitPoint = null;
    if(dummyHit.length > 0){
      hitDummy = true;
      hitPoint = dummyHit[0].point.clone();
    }

    // Трассер до стены/пола/потолка
    const R = this.roomRadius - 0.05;
    const a2 = dir.x*dir.x + dir.z*dir.z;
    const b2 = 2*(from.x*dir.x + from.z*dir.z);
    const c2 = from.x*from.x + from.z*from.z - R*R;
    let wallT = null;
    if(a2 > 1e-6){
      const disc = b2*b2 - 4*a2*c2;
      if(disc >= 0){
        const t = (-b2 + Math.sqrt(disc)) / (2*a2);
        if(t > 0 && t < range) wallT = t;
      }
    }
    if(dir.y < -1e-6){
      const tf = (0.06 - from.y) / dir.y;
      if(tf > 0 && tf < range && (wallT === null || tf < wallT)) wallT = tf;
    }
    if(dir.y > 1e-6){
      const tc = (this.roomHeight - .06 - from.y) / dir.y;
      if(tc > 0 && tc < range && (wallT === null || tc < wallT)) wallT = tc;
    }
    let endPoint;
    if(hitDummy && (wallT === null || hitPoint.distanceTo(from) < wallT)){
      endPoint = hitPoint;
    } else if(wallT !== null){
      endPoint = from.clone().add(dir.clone().multiplyScalar(wallT));
    } else {
      endPoint = from.clone().add(dir.clone().multiplyScalar(range));
    }

    this.createTrace(from, endPoint, hitDummy);

    if(hitDummy){
      let dmg = (w.damage || 10) * playerBuffs.damageMult;
      const critChance = playerBuffs.critChance + (hasSynergy('crit', 1) ? .10 : 0);
      const isCrit = Math.random() < critChance;
      if(isCrit) dmg *= playerBuffs.critMult;

      this.dummy.flashTimer = .09;
      this.dummyHits.push({ time: performance.now(), dmg });
      if(this.dummyHits.length > 200) this.dummyHits.shift();

      spawnDamageNumber(hitPoint, dmg, isCrit);
      if(isCrit) audio.headshot();
      else audio.hit();
    }

    // Автоматическая перезарядка если магазин опустел
    if(!noAmmoClass && getAmmo() <= 0){
      this._startReload();
    }
  }

  _startReload(){
    if(this.hubReloading) return;
    const w = currentWeapon;
    if(!w) return;
    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);
    if(noAmmoClass) return;
    if(getAmmo() === w.magSize) return;
    this.hubReloading = true;
    this.hubReloadBase = w.reloadTime || 1.5;
    this.hubReloadTimer = this.hubReloadBase;
    isReloading = true;
    reloadPhase = 0;
    audio.reload();
  }

  tryReload(){
    this._startReload();
  }

  updateHubAmmoHUD(){
    const el = document.getElementById('hub-ammo');
    if(!el) return;
    const w = currentWeapon;
    if(!w){ el.textContent = '🔫 —'; return; }
    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);
    if(noAmmoClass){
      el.textContent = '🔫 ∞';
    } else {
      el.textContent = '🔫 ' + getAmmo() + '/' + w.magSize;
    }
  }

  createTrace(from, to, hit){
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const color = hit ? 0xff8800 : 0xffdd44;
    const mat = new THREE.LineBasicMaterial({color, transparent:true, opacity:.85});
    const line = new THREE.Line(geo, mat);
    hubScene.add(line);
    this.traces.push({mesh: line, life: .09, maxLife: .09});
  }

  updateTraces(dt){
    for(let i=this.traces.length-1; i>=0; i--){
      const t = this.traces[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / t.maxLife) * .85;
      if(t.life <= 0){
        hubScene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.traces.splice(i, 1);
      }
    }
  }

  updateDpsDisplay(){
    const el = document.getElementById('dps-display');
    if(!el || !this.dummy) return;
    const now = performance.now();
    const windowMs = 3000;
    while(this.dummyHits.length > 0 && now - this.dummyHits[0].time > windowMs){
      this.dummyHits.shift();
    }
    const totalDmg = this.dummyHits.reduce((s, h) => s + h.dmg, 0);
    const dps = this.dummyHits.length > 0 ? Math.round(totalDmg / (windowMs/1000)) : 0;

    const worldPos = this.dummy.group.position.clone().add(new THREE.Vector3(0, 3.4, 0));
    const vec = worldPos.project(camera);
    if(vec.z >= -1 && vec.z <= 1 && vec.x >= -1.5 && vec.x <= 1.5){
      const x = (vec.x * .5 + .5) * window.innerWidth;
      const y = (-vec.y * .5 + .5) * window.innerHeight;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.display = 'block';
      const val = el.querySelector('.dps-val');
      if(val) val.textContent = dps;
      el.style.borderColor = dps > 100 ? '#ff0' : (dps > 30 ? '#f80' : '#f60');
    } else {
      el.style.display = 'none';
    }
  }

  updateRobotChat(dt){
    this.robotChatTimer -= dt;
    if(this.robotChatTimer <= 0){
      this.robotChatTimer = 25 + Math.random()*20;
      this.showRobotLine();
    }
  }

  showRobotLine(){
    const el = document.getElementById('bar-robot-chat');
    if(!el) return;
    const line = BAR_ROBOT_LINES[Math.floor(Math.random()*BAR_ROBOT_LINES.length)];
    el.innerHTML = `<span class="chat-name">🤖 БАРМЕН:</span>${line}`;
    el.style.display = 'block';
    if(this._chatTimeout) clearTimeout(this._chatTimeout);
    this._chatTimeout = setTimeout(()=>{ el.style.display = 'none' }, 7000);
  }

  checkInteract(){
    const hintEl = document.getElementById('hub-interact-hint');
    if(isNestActive || hubCasinoActive || hubDiceActive || hubBloodActive){
      if(hintEl) hintEl.style.display = 'none';
      hubNearest = null;
      return;
    }
    hubNearest = null;
    let minDist = 3.5;
    for(const zone of hubInteractables){
      const dx = hubPlayer.position.x - zone.worldPos.x;
      const dz = hubPlayer.position.z - zone.worldPos.z;
      const d = Math.sqrt(dx*dx+dz*dz);
      if(d < minDist){ minDist = d; hubNearest = zone }
    }
    if(hubNearest && minDist < 3.2){
      if(hintEl){
        const c = colorHex(hubNearest.color);
        hintEl.style.display = 'block';
        hintEl.innerHTML = `<span style="display:inline-block;padding:2px 10px;border:2px solid #fff;border-radius:4px;margin-right:8px">[E]</span><span style="color:#${c}">${hubNearest.label}</span>`;
        hintEl.style.borderColor = '#'+c;
        hintEl.style.color = '#'+c;
        hintEl.style.boxShadow = `0 0 20px #${c}`;
      }
    } else {
      if(hintEl) hintEl.style.display = 'none';
    }
  }

  interact(){
    if(!hubNearest) return;
    audio.cardPick();
    switch(hubNearest.id){
      case 'teleporter': this.exit(); break;
      case 'cards': openHubDraft(); break;
      case 'casino': this.openCasino(); break;
      case 'dice': this.openDice(); break;
      case 'blood': this.openBloodStation(); break;
      case 'stage': this.showRobotLine(); break;
    }
  }

  openCasino(){
    hubCasinoActive = true;
    hubCasinoSpins = 0;
    const ov = document.getElementById('casino-overlay');
    if(!ov) return;
    ov.style.display = 'block';
    this.updateCasinoUI();
    audio.slotDing();
    if(document.pointerLockElement) document.exitPointerLock();
  }

  spinCasino(){
    if(credits < 10){ this.showCasinoMessage('Недостаточно кредитов!', '#f00'); return }
    if(hubCasinoSpins >= 5){ this.showCasinoMessage('Лимит 5 спинов за визит', '#f80'); return }
    credits -= 10;
    hubCasinoSpins++;
    updateHubHUD();
    const reelEls = document.querySelectorAll('#casino-overlay .casino-reel');
    const symbols = ['🍒','🍋','🍊','🍇','🍎','🍉','💀','🔔'];
    const results = [];
    let stopped = 0;
    reelEls.forEach((el, i)=>{
      const interval = setInterval(()=>{
        el.textContent = symbols[Math.floor(Math.random()*symbols.length)];
      }, 60);
      setTimeout(()=>{
        clearInterval(interval);
        const sym = symbols[Math.floor(Math.random()*symbols.length)];
        el.textContent = sym;
        results.push(sym);
        audio.slotDing();
        stopped++;
        if(stopped === 3){
          setTimeout(()=> this.resolveCasino(results), 300);
        }
      }, 800 + i*400);
    });
  }

  resolveCasino(results){
    const counts = {};
    results.forEach(r => counts[r] = (counts[r]||0) + 1);
    const maxCount = Math.max(...Object.values(counts));
    if(maxCount === 3){
      const legendaries = weapons.filter(w => w.rarity === 'legendary' && !w.memWeapon);
      const w = legendaries[Math.floor(Math.random()*legendaries.length)];
      applyCardEffect({cardType:'weapon', weapon:w, rarity:'legendary', tags:w.tags||[]});
      this.showCasinoMessage(`🎉 ДЖЕКПОТ! ${w.name}`, '#ff0');
      audio.duoUp();
    } else if(maxCount === 2){
      const rarities = ['rare', 'epic'];
      const rarity = rarities[Math.floor(Math.random()*rarities.length)];
      const filt = UPGRADE_CARDS.filter(u => u.rarity === rarity);
      const u = filt.length > 0 ? filt[Math.floor(Math.random()*filt.length)] : UPGRADE_CARDS[0];
      applyCardEffect({cardType:'upgrade', upgrade:u, rarity:u.rarity, tags:[u.tag].filter(Boolean)});
      this.showCasinoMessage(`✨ Пара! ${u.name}`, '#8f8');
      audio.pickup();
    } else {
      this.showCasinoMessage('💨 Ничего... Попробуй ещё', '#888');
    }
    this.updateCasinoUI();
  }

  updateCasinoUI(){
    const info = document.getElementById('casino-info');
    if(info) info.innerHTML = `Кредиты: <b style="color:#ff0">${credits}💰</b> · Спин: <b>${hubCasinoSpins}/5</b>`;
    const btn = document.getElementById('casino-spin-btn');
    if(btn) btn.disabled = credits < 10 || hubCasinoSpins >= 5;
  }

  showCasinoMessage(text, color){
    const msg = document.getElementById('casino-msg');
    if(msg){ msg.textContent = text; msg.style.color = color; msg.style.textShadow = `0 0 10px ${color}` }
  }

  closeCasino(){
    hubCasinoActive = false;
    const ov = document.getElementById('casino-overlay');
    if(ov) ov.style.display = 'none';
    if(!document.pointerLockElement) document.body.requestPointerLock();
  }

  openDice(){
    hubDiceActive = true;
    hubDiceRolls = 0;
    const ov = document.getElementById('dice-overlay');
    if(!ov) return;
    ov.style.display = 'block';
    this.updateDiceUI();
    audio.slotDing();
    if(document.pointerLockElement) document.exitPointerLock();
  }

  rollDice(){
    if(credits < 5){ this.showDiceMessage('Недостаточно кредитов!', '#f00'); return }
    if(hubDiceRolls >= 5){ this.showDiceMessage('Лимит 5 бросков за визит', '#f80'); return }
    credits -= 5;
    hubDiceRolls++;
    updateHubHUD();
    const diceEl = document.getElementById('dice-result');
    if(diceEl) diceEl.textContent = '?';
    audio.slotDing();
    const originalRot = this.parts.dice.rotation.clone();
    const startTime = Date.now();
    const animInterval = setInterval(()=>{
      const t = (Date.now() - startTime)/1000;
      if(t < 1.2){
        this.parts.dice.rotation.x = Math.random()*Math.PI*2;
        this.parts.dice.rotation.y = Math.random()*Math.PI*2;
        this.parts.dice.position.y = 1.25 + Math.abs(Math.sin(t*8))*.3;
      } else {
        clearInterval(animInterval);
        this.parts.dice.rotation.set(originalRot.x, originalRot.y, originalRot.z);
        this.parts.dice.position.y = 1.25;
        this.resolveDice();
      }
    }, 50);
  }

  resolveDice(){
    const roll = 1 + Math.floor(Math.random()*20);
    const diceEl = document.getElementById('dice-result');
    if(diceEl){
      diceEl.textContent = roll;
      diceEl.style.animation = 'none';
      void diceEl.offsetWidth;
      diceEl.style.animation = 'dicePop .5s ease-out';
    }
    audio.slotDing();
    if(roll === 20){
      const legendaries = weapons.filter(w => w.rarity === 'legendary' && !w.memWeapon);
      const w = legendaries[Math.floor(Math.random()*legendaries.length)];
      applyCardEffect({cardType:'weapon', weapon:w, rarity:'legendary', tags:w.tags||[]});
      this.showDiceMessage(`💀 NAT 20! ${w.name}`, '#ff0');
      audio.duoUp();
    } else if(roll >= 16){
      const pool = UPGRADE_CARDS.filter(u => u.rarity === 'legendary' || u.rarity === 'epic');
      const u = pool[Math.floor(Math.random()*pool.length)];
      applyCardEffect({cardType:'upgrade', upgrade:u, rarity:u.rarity, tags:[u.tag].filter(Boolean)});
      this.showDiceMessage(`🌟 ${roll}! ${u.name}`, '#f80');
      audio.pickup();
    } else if(roll >= 11){
      const u = UPGRADE_CARDS.filter(u => u.rarity === 'rare')[Math.floor(Math.random()*3)];
      applyCardEffect({cardType:'upgrade', upgrade:u, rarity:'rare', tags:[u.tag].filter(Boolean)});
      this.showDiceMessage(`✨ ${roll}! ${u.name}`, '#8f8');
      audio.pickup();
    } else if(roll >= 6){
      credits += 10;
      this.showDiceMessage(`💰 ${roll}! +10 кредитов`, '#0ff');
      updateHubHUD();
      audio.pickup();
    } else {
      this.showDiceMessage(`💨 ${roll}... ничего`, '#888');
    }
    this.updateDiceUI();
  }

  updateDiceUI(){
    const info = document.getElementById('dice-info');
    if(info) info.innerHTML = `Кредиты: <b style="color:#ff0">${credits}💰</b> · Бросок: <b>${hubDiceRolls}/5</b>`;
    const btn = document.getElementById('dice-roll-btn');
    if(btn) btn.disabled = credits < 5 || hubDiceRolls >= 5;
  }

  showDiceMessage(text, color){
    const msg = document.getElementById('dice-msg');
    if(msg){ msg.textContent = text; msg.style.color = color; msg.style.textShadow = `0 0 10px ${color}` }
  }

  closeDice(){
    hubDiceActive = false;
    const ov = document.getElementById('dice-overlay');
    if(ov) ov.style.display = 'none';
    if(!document.pointerLockElement) document.body.requestPointerLock();
  }

  openBloodStation(){
    hubBloodActive = true;
    const ov = document.getElementById('blood-overlay');
    if(!ov) return;
    ov.style.display = 'block';
    this.updateBloodUI();
    audio.slotDing();
    if(document.pointerLockElement) document.exitPointerLock();
  }

  donateBlood(){
    const HP_COST = 20;
    const CREDIT_GAIN = 10;
    const MIN_HP = 30;
    if(player.health - HP_COST < MIN_HP){
      this.showBloodMessage(`Нельзя: HP упадёт ниже ${MIN_HP}`, '#f00');
      audio.wallHit();
      return;
    }
    player.health -= HP_COST;
    credits += CREDIT_GAIN;
    updateUI();
    updateHubHUD();
    audio.pickup();
    this.showBloodMessage(`+${CREDIT_GAIN}💰 · -${HP_COST} HP`, '#8f8');
    spawnHealNumber(player.position.clone().add(new THREE.Vector3(0, 1, 0)), -HP_COST, '#f00');
    this.updateBloodUI();
  }

  updateBloodUI(){
    const info = document.getElementById('blood-info');
    if(info) info.innerHTML = `HP: <b style="color:#f00">${Math.floor(player.health)}/${player.maxHealth}</b> · Кредиты: <b style="color:#ff0">${credits}💰</b>`;
    const btn = document.getElementById('blood-donate-btn');
    if(btn) btn.disabled = player.health - 20 < 30;
  }

  showBloodMessage(text, color){
    const msg = document.getElementById('blood-msg');
    if(msg){ msg.textContent = text; msg.style.color = color; msg.style.textShadow = `0 0 10px ${color}` }
  }

  closeBloodStation(){
    hubBloodActive = false;
    const ov = document.getElementById('blood-overlay');
    if(ov) ov.style.display = 'none';
    if(!document.pointerLockElement) document.body.requestPointerLock();
  }
}

function colorHex(num){ return num.toString(16).padStart(6,'0') }
window.colorHex = colorHex;

let hub = null;

function enterHub(){
  if(!hub){ hub = new Hub() }
  hub.enter();
}

function updateHubHUD(){
  const creditEl = document.getElementById('hub-credits');
  if(creditEl) creditEl.textContent = '💰 ' + credits;
  const waveEl = document.getElementById('hub-wave');
  if(waveEl) waveEl.textContent = 'ВОЛНА ' + wave;
  const hpEl = document.getElementById('hub-hp');
  if(hpEl) hpEl.textContent = '❤ HP: ' + Math.floor(player.health) + '/' + player.maxHealth;
  if(hub) hub.updateHubAmmoHUD();
}

function openHubDraft(){
  if(isNestActive) return;
  if(currentDraft.length === 0){
    generateDraft();
  }
  isNestActive = true;
  renderNestScreen();
  const ns = document.getElementById('nest-screen');
  if(ns) ns.style.display = 'block';
  if(document.pointerLockElement) document.exitPointerLock();
}

document.addEventListener('keydown', e=>{
  if(!hubMode) return;
  // В менюшках никаких клавиш — только мышь
  if(hubCasinoActive) return;
  if(hubDiceActive) return;
  if(hubBloodActive) return;
  if(isNestActive) return;
  if(isSynergyPanelOpen) return;
  keys[e.code] = true;
  if(e.code === 'KeyE'){ hub.interact(); e.preventDefault(); return; }
  if(e.code === 'KeyR'){ hub.tryReload(); e.preventDefault(); return; }
});

document.addEventListener('keyup', e=>{
  if(hubMode) keys[e.code] = false;
});

document.addEventListener('mousemove', e=>{
  if(!hubMode || hubCasinoActive || hubDiceActive || hubBloodActive || isNestActive) return;
  if(!document.pointerLockElement) return;
  hubPlayer.yaw -= e.movementX * .002;
  hubPlayer.pitch = Math.max(-Math.PI/2 + .05, Math.min(Math.PI/2 - .05, hubPlayer.pitch - e.movementY * .002));
});

document.addEventListener('mousedown', e=>{
  if(!hubMode) return;
  if(hubCasinoActive || hubDiceActive || hubBloodActive || isNestActive) return;
  if(!document.pointerLockElement){
    if(e.button === 0) document.body.requestPointerLock();
    return;
  }
  if(e.button === 0){ hub.mouseDown = true; }
});

document.addEventListener('mouseup', e=>{
  if(!hubMode) return;
  if(e.button === 0){ if(hub) hub.mouseDown = false; }
});

console.log('🏨 hub.js загружен (v6.3 — lava lamp, prog rock, detailed bartender)');
