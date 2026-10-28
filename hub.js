'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.6 — HUB (fixed limbs, hair, clickable menu buttons)

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
  "Ребята на сцене жарят motorik. Слышишь бас? Это Фил.",
  "Стекло мутное, но басы слышно за версту.",
  "За этой стойкой я уже 300 лет. Не жалуюсь.",
  "А вот этот рифф — моя любимая часть сета.",
  "Девушка слева от меня — Мэй. Не спрашивай что она пьёт.",
  "Ковбой справа — Джек. Он не помнит своего имени. Ирония.",
  "Пёсик бегает — не бойся, он не кусает.",
  "Моторный бит — это тебе не попса.",
  "Вон тот вершок в горшке — тоже из наших. Тихий. Не стреляй.",
  "Дрон под потолком? Это старый разведчик. Он уже 40 лет болтается.",
  "Не наступи на вершка. Он хоть и в горшке, но обидчивый.",
];

// ═══════════════ МОТОРИК-ПРОГ (128 BPM, 16-е) ═══════════════
class HubMusic {
  constructor(){
    this.started = false;
    this.step = 0;
    this.nextNoteTime = 0;
    this.tempo = 128;
    this.stepDur = 60 / this.tempo / 4;
    this.lookahead = 0.15;
    this.gain = null;
    this.interval = null;
    this._volume = 0.4;
    this.bassNotes = [
      [110.00, 110.00, 164.81, 110.00, 130.81, 110.00, 164.81, 110.00],
      [ 87.31,  87.31, 130.81,  87.31, 110.00,  87.31, 130.81,  87.31],
      [ 98.00,  98.00, 146.83,  98.00, 123.47,  98.00, 146.83,  98.00],
      [ 82.41,  82.41, 123.47,  82.41,  98.00,  82.41, 123.47,  82.41],
    ];
    this.padChords = [
      [220.00, 261.63, 329.63, 440.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00],
      [164.81, 196.00, 246.94, 329.63],
    ];
  }
  start(){
    if(this.started) return;
    const ctx = audio.ctx;
    if(!ctx) return;
    if(ctx.state === 'suspended'){ try { ctx.resume(); } catch(e){} }
    this.started = true;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    this.gain.gain.linearRampToValueAtTime(this._volume, ctx.currentTime + 1.4);
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.interval = setInterval(() => this._scheduler(), 50);
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
        this.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      } catch(e){}
      const g = this.gain;
      this.gain = null;
      setTimeout(() => { try { g.disconnect(); } catch(e){} }, 1000);
    }
  }
  _scheduler(){
    if(!this.started || !this.gain) return;
    const ctx = audio.ctx;
    let count = 0;
    while(this.nextNoteTime < ctx.currentTime + this.lookahead && count < 64){
      this._scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += this.stepDur;
      this.step++;
      count++;
    }
  }
  _scheduleStep(step, time){
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    if(s % 4 === 0) this._kick(time, 0.72);
    if(s === 4 || s === 12) this._snare(time);
    if(s % 2 === 0){
      const isOpen = (s === 6 || s === 14);
      this._hat(time, isOpen);
    }
    if(s % 2 === 0){
      const idx = Math.floor(s / 2);
      const note = this.bassNotes[bar][idx];
      this._bass(note, time, this.stepDur * 1.7);
    }
    if(s === 0){
      this._pad(this.padChords[bar], time, this.stepDur * 16 * 0.98);
    }
    if(bar % 2 === 1 && (s === 3 || s === 7 || s === 11 || s === 15)){
      if(Math.random() < 0.35){
        const scale = [440.00, 523.25, 659.25, 783.99, 880.00, 1046.50];
        this._lead(scale[Math.floor(Math.random() * scale.length)], time);
      }
    }
  }
  _kick(t, vol){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + 0.38);
  }
  _snare(t){
    const ctx = audio.ctx;
    const n = Math.floor(ctx.sampleRate * 0.16);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/n, 1.8);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(filt); filt.connect(g); g.connect(this.gain);
    src.start(t); src.stop(t + 0.19);
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 200;
    g2.gain.setValueAtTime(0.28, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g2); g2.connect(this.gain);
    o.start(t); o.stop(t + 0.11);
  }
  _hat(t, isOpen){
    const ctx = audio.ctx;
    const n = Math.floor(ctx.sampleRate * (isOpen ? 0.09 : 0.03));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<n; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(isOpen ? 0.13 : 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.08 : 0.03));
    src.connect(filt); filt.connect(g); g.connect(this.gain);
    src.start(t); src.stop(t + 0.1);
  }
  _bass(freq, t, dur){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o2.type = 'square';
    o2.frequency.value = freq * 0.5;
    o2.detune.value = 5;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1100, t);
    filt.frequency.exponentialRampToValueAtTime(280, t + dur);
    filt.Q.value = 6;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.008);
    g.gain.setValueAtTime(0.28, t + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(filt); o2.connect(filt); filt.connect(g); g.connect(this.gain);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  _pad(freqs, t, dur){
    const ctx = audio.ctx;
    freqs.forEach(freq => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = (Math.random() - 0.5) * 18;
      filt.type = 'lowpass';
      filt.frequency.value = 1400;
      filt.Q.value = 1.5;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.045, t + dur * 0.3);
      g.gain.setValueAtTime(0.045, t + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(filt); filt.connect(g); g.connect(this.gain);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }
  _lead(freq, t){
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2500, t);
    filt.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(filt); filt.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + 0.37);
  }
}

// ═══════════════ МИНИ-ЛЕДЯНОЙ ПЁС ═══════════════
class MiniIceDog {
  constructor(parent){
    this.group = new THREE.Group();
    this.group.position.set(3.5, 0, 1.5);
    this.group.scale.setScalar(0.4);
    this.state = 'idle';
    this.stateTimer = 1 + Math.random() * 2;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.legs = [];
    this.tail = null;
    this.targetX = 3.5;
    this.targetZ = 1.5;
    this.build();
    parent.add(this.group);
  }
  build(){
    const furM = new THREE.MeshStandardMaterial({color:0x6a8aa8, roughness:.7, metalness:.15, emissive:0x1a2a4a, emissiveIntensity:.4});
    const darkFurM = new THREE.MeshStandardMaterial({color:0x3a4a6a, roughness:.75, metalness:.2});
    const iceM = new THREE.MeshStandardMaterial({color:0xaaddff, emissive:0x4488ff, emissiveIntensity:.8, transparent:true, opacity:.85});
    const eyeM = new THREE.MeshBasicMaterial({color:0x00ffff});

    const body = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 10), furM);
    body.position.set(0, .62, 0);
    body.scale.set(1.3, .95, 1.6);
    this.group.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(.38, 10, 8), furM);
    belly.position.set(0, .58, .32);
    this.group.add(belly);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .35, 8), furM);
    neck.position.set(0, .78, .48);
    neck.rotation.x = -.6;
    this.group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), furM);
    head.position.set(0, .82, .82);
    head.scale.set(1.15, 1, 1.2);
    this.group.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(.22, .18, .3), furM);
    snout.position.set(0, .74, 1.08);
    this.group.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 8), darkFurM);
    nose.position.set(0, .68, 1.2);
    this.group.add(nose);

    for(let s of [-1, 1]){
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), eyeM);
      eye.position.set(s * .13, .95, .95);
      this.group.add(eye);
    }
    for(let s of [-1, 1]){
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 5), darkFurM);
      ear.position.set(s * .16, 1.06, .74);
      ear.rotation.x = -.2;
      this.group.add(ear);
    }
    for(let i=0; i<5; i++){
      const angle = (i/5) * Math.PI - Math.PI/2;
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(.06 + Math.random()*.03, .18 + Math.random()*.12, 4),
        iceM
      );
      crystal.position.set(Math.cos(angle)*.15, .95 - i*.05, -.15 + i*.1);
      crystal.rotation.z = Math.cos(angle)*.3;
      crystal.rotation.x = .1;
      this.group.add(crystal);
    }
    const bigCrystal = new THREE.Mesh(new THREE.ConeGeometry(.1, .35, 5), iceM);
    bigCrystal.position.set(0, 1.05, -.05);
    bigCrystal.rotation.x = -.1;
    this.group.add(bigCrystal);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.06, .02, .55, 6), iceM);
    tail.position.set(0, .85, -.65);
    tail.rotation.x = -1.2;
    this.group.add(tail);
    this.tail = tail;

    const legPos = [[-.28, .22, .35], [.28, .22, .35], [-.28, .22, -.25], [.28, .22, -.25]];
    legPos.forEach((p, i) => {
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(.09, .075, .4, 6), darkFurM);
      upper.position.set(p[0], .42, p[2]);
      upper.rotation.x = .05;
      this.group.add(upper);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(.06, .04, .35, 6), furM);
      lower.position.set(p[0], .14, p[2]);
      this.group.add(lower);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(.1, 6, 6), darkFurM);
      paw.position.set(p[0], .04, p[2] + .05);
      paw.scale.set(1, .5, 1.4);
      this.group.add(paw);
      this.legs.push({upper, lower, paw, phase: i * .5});
    });

    const frost = new THREE.Mesh(
      new THREE.SphereGeometry(.5, 10, 10),
      new THREE.MeshBasicMaterial({color:0x88ccff, transparent:true, opacity:.15, side:THREE.BackSide, depthWrite:false})
    );
    frost.position.set(0, .5, 0);
    frost.scale.set(1.5, 1, 2);
    this.group.add(frost);
  }
  pickNewTarget(){
    let attempts = 0;
    while(attempts < 12){
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.5 + Math.random() * 7;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      if(tx*tx + tz*tz < 80 && tz < 5.5 && tz > -8){
        this.targetX = tx;
        this.targetZ = tz;
        return;
      }
      attempts++;
    }
    this.targetX = 0;
    this.targetZ = 0;
  }
  update(dt){
    if(this.state === 'idle'){
      this.stateTimer -= dt;
      this.legs.forEach(leg => { leg.upper.rotation.x *= .9; leg.lower.rotation.x *= .9; });
      this.group.position.y *= .9;
      if(this.stateTimer <= 0){
        this.pickNewTarget();
        this.state = 'walk';
      }
    } else {
      const dx = this.targetX - this.group.position.x;
      const dz = this.targetZ - this.group.position.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if(dist < 0.4){
        this.state = 'idle';
        this.stateTimer = 1.5 + Math.random() * 3;
      } else {
        const speed = 1.6 * dt;
        const nx = this.group.position.x + (dx/dist) * speed;
        const nz = this.group.position.z + (dz/dist) * speed;
        if(nx*nx + nz*nz < 90 && nz < 5.8 && nz > -9){
          this.group.position.x = nx;
          this.group.position.z = nz;
        } else {
          this.pickNewTarget();
        }
        const targetYaw = Math.atan2(dx, dz);
        const curYaw = this.group.rotation.y;
        let diff = targetYaw - curYaw;
        while(diff > Math.PI) diff -= Math.PI * 2;
        while(diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, dt * 4);
        this.bobPhase += dt * 14;
        this.legs.forEach((leg, i) => {
          leg.upper.rotation.x = Math.sin(this.bobPhase + i * Math.PI * 0.5) * 0.5;
          leg.lower.rotation.x = Math.sin(this.bobPhase + i * Math.PI * 0.5 + 0.3) * 0.3;
        });
        this.group.position.y = Math.abs(Math.sin(this.bobPhase * 2)) * 0.06;
      }
    }
    if(this.tail){
      this.tail.rotation.z = Math.sin(Date.now() * 0.008) * 0.5;
      this.tail.rotation.x = -1.2 + Math.sin(Date.now() * 0.005) * 0.2;
    }
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
    this.barmaid = null;
    this.cowboy = null;
    this.miniDog = null;
    this.pottedVerkhushka = null;
    this.hangingDrone = null;
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

    const wall = this.cyl(R, R, H, 48, this.matWallBase(), 0, H/2, 0);
    wall.material.side = THREE.BackSide;
    for(let h=1; h<H; h+=.6){
      this.tor(R-.08, .04, 4, 56, new THREE.MeshBasicMaterial({color:0xff3300, transparent:true, opacity:.15}), 0, h, 0, null, Math.PI/2,0,0);
    }
    this.parts.lavaBlobs = [];
    const lavaColors = [0xff2200, 0xff5500, 0xff8800, 0xaa0044, 0xaa00aa, 0xff2266];
    for(let i=0; i<90; i++){
      const angle = (i / 90) * Math.PI * 2 + (Math.random() - .5) * .3;
      const dist = R - 0.25 - Math.random() * 0.4;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const size = 0.15 + Math.random() * 0.5;
      const color = lavaColors[Math.floor(Math.random() * lavaColors.length)];
      const blobMat = new THREE.MeshBasicMaterial({color, transparent: true, opacity: .55 + Math.random() * .3, depthWrite: false});
      const blob = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), blobMat);
      blob.position.set(x, Math.random() * H, z);
      blob.scale.set(1, 1 + Math.random() * 1.2, .4);
      blob.userData = {
        baseY: Math.random() * H,
        speed: .1 + Math.random() * .25,
        phase: Math.random() * Math.PI * 2,
        baseSize: size,
        colorHSL: Math.random() * 0.08,
      };
      this.group.add(blob);
      this.parts.lavaBlobs.push(blob);
    }

    this.cyl(R, R, .05, 48, new THREE.MeshBasicMaterial({color:0x0a0510, transparent:true, opacity:.85}), 0, H, 0);
    for(let i=0; i<4; i++){
      const a = i/4*Math.PI*2 + Math.PI/4;
      this.cyl(.08,.08, R*1.6, 8, this.matMetal(), 0, H-.2, 0, null, 0).rotation.set(0, a, 0);
    }

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

    this.buildTeleporter(0, -9, 0);
    this.buildCardTable(-9, -4, Math.PI/4);
    this.buildCasino(9, -4, -Math.PI/4);
    this.buildDice(9, 5, -Math.PI*3/4);
    this.buildBloodStation(-9, 5, Math.PI*3/4);
    this.buildDummy(-10.5, 0);
    this.buildBar(-2, 7.5);
    this.buildBarRobot(-2, 8.3);
    this.buildBarmaid(-3.8, 7.0);
    this.buildCowboy(-0.2, 7.0);
    this.buildStage(0, 10);
    this.buildPottedVerkhushka(7, -8);
    this.buildHangingDrone(3, 3.5, 0);
    this.miniDog = new MiniIceDog(this.group);

    const discoBall = this.sph(.45, 20, 16,
      new THREE.MeshStandardMaterial({color:0x888899, metalness:1, roughness:.1, emissive:0x222244, emissiveIntensity:.4}),
      0, H - 1.2, 0);
    this.parts.discoBall = discoBall;
    const discoLight = new THREE.PointLight(0xff44aa, 2, 12);
    discoLight.position.set(0, H - 1.2, 0);
    this.group.add(discoLight);
    this.parts.discoLight = discoLight;

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
      {pos:[-3.8,2.5,7.0], color:0xff4466},
      {pos:[-0.2,2.5,7.0], color:0xffaa44},
      {pos:[0,3.5,10], color:0xff22aa},
      {pos:[7,1.5,-8], color:0x88ff88},
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
      group: g, hitMesh, bodyMesh: torso, headMesh: head,
      flashTimer: 0, origBodyEmissive: bodyM.emissive.clone(),
      bodyMat: bodyM, headMat: headM,
    };
  }

  buildPottedVerkhushka(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);

    const potM = new THREE.MeshStandardMaterial({color:0x8a3a1a, roughness:.85, metalness:.05});
    const potRimM = new THREE.MeshStandardMaterial({color:0x6a2a10, roughness:.8, metalness:.1});
    const soilM = new THREE.MeshStandardMaterial({color:0x2a1a0a, roughness:.95});
    const bodyM = new THREE.MeshStandardMaterial({color:0xd4a574, roughness:.7, metalness:.05});
    const bodyShadowM = new THREE.MeshStandardMaterial({color:0xb88858, roughness:.75});
    const leafM = new THREE.MeshStandardMaterial({color:0x2a8a2a, emissive:0x115511, emissiveIntensity:.35, roughness:.6});
    const eyeM = new THREE.MeshBasicMaterial({color:0xffdd00});
    const eyePupilM = new THREE.MeshBasicMaterial({color:0x1a0a00});
    const blushM = new THREE.MeshBasicMaterial({color:0xff8888, transparent:true, opacity:.5});

    this.cyl(.32, .22, .38, 16, potM, 0, .19, 0, g);
    this.tor(.32, .035, 6, 24, potRimM, 0, .38, 0, g, Math.PI/2, 0, 0);
    this.cyl(.28, .28, .02, 16, soilM, 0, .375, 0, g);

    const verkhG = new THREE.Group();
    verkhG.position.set(0, .5, 0);
    g.add(verkhG);

    const body = this.sph(.28, 14, 12, bodyM, 0, .08, 0, verkhG);
    body.scale.set(1, 1.2, 1);
    this.sph(.22, 12, 8, bodyShadowM, 0, -.08, 0, verkhG).scale.set(1, .6, 1);

    const eyeL = this.sph(.055, 10, 10, eyeM, -.1, .15, .22, verkhG);
    const eyeR = this.sph(.055, 10, 10, eyeM, .1, .15, .22, verkhG);
    this.sph(.028, 8, 8, eyePupilM, -.09, .15, .27, verkhG);
    this.sph(.028, 8, 8, eyePupilM, .11, .15, .27, verkhG);
    this.sph(.01, 6, 6, new THREE.MeshBasicMaterial({color:0xffffff}), -.085, .17, .28, verkhG);
    this.sph(.01, 6, 6, new THREE.MeshBasicMaterial({color:0xffffff}), .115, .17, .28, verkhG);

    const smile = this.tor(.07, .012, 4, 12, new THREE.MeshBasicMaterial({color:0x4a1a10}), 0, .02, .26, verkhG, Math.PI/2, 0, 0);
    smile.scale.set(1.2, .6, 1);

    this.sph(.05, 8, 8, blushM, -.15, .04, .22, verkhG);
    this.sph(.05, 8, 8, blushM, .15, .04, .22, verkhG);

    const leaves = [];
    for(let i=0; i<5; i++){
      const a = i/5 * Math.PI * 2 + Math.PI/4;
      const leafG = new THREE.Group();
      leafG.position.set(Math.cos(a)*.12, .35, Math.sin(a)*.12);
      leafG.rotation.z = Math.cos(a) * .5;
      leafG.rotation.x = Math.sin(a) * .5;
      verkhG.add(leafG);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(.08, .65, 4), leafM);
      blade.position.y = .3;
      leafG.add(blade);
      leaves.push(leafG);
    }
    const centerLeaf = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 5), leafM);
    centerLeaf.position.set(0, .55, 0);
    verkhG.add(centerLeaf);

    this.parts.pottedVerkhushka = {
      group: g, verkhGroup: verkhG, body,
      eyeL, eyeR, leaves,
      phase: Math.random() * Math.PI * 2,
      blinkTimer: 2 + Math.random() * 3,
    };

    const light = new THREE.PointLight(0x88ff88, .35, 1.2);
    light.position.set(0, .7, 0);
    g.add(light);
  }

  buildHangingDrone(x, y, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);

    const ropeM = new THREE.MeshStandardMaterial({color:0x3a2a1a, roughness:.95, metalness:.05});
    const ropeLen = this.roomHeight - y;
    this.cyl(.012, .012, ropeLen, 6, ropeM, 0, y + ropeLen/2, 0, g);
    this.tor(.05, .008, 6, 12, ropeM, 0, this.roomHeight - .02, 0, g, Math.PI/2, 0, 0);

    const droneG = new THREE.Group();
    droneG.position.set(0, y, 0);
    g.add(droneG);

    const bodyM = new THREE.MeshStandardMaterial({color:0x8888ff, metalness:.9, roughness:.2, emissive:0x222244, emissiveIntensity:.4});
    const eyeM = new THREE.MeshBasicMaterial({color:0x00ffff});
    const propM = new THREE.MeshStandardMaterial({color:0x333333, metalness:.7, roughness:.4});
    const accentM = new THREE.MeshStandardMaterial({color:0xccccff, metalness:.9, roughness:.15});

    this.sph(.4, 14, 12, bodyM, 0, 0, 0, droneG);
    this.cyl(.06, .06, .18, 6, ropeM, 0, .38, 0, droneG);
    this.cyl(.09, .09, .04, 8, accentM, 0, .29, 0, droneG);
    this.sph(.14, 12, 10, eyeM, 0, 0, .34, droneG);
    this.tor(.17, .022, 6, 16, accentM, 0, 0, .32, droneG, 0, 0, 0);

    const propG = new THREE.Group();
    propG.position.y = .38;
    droneG.add(propG);
    const propellers = [];
    for(let i=0; i<4; i++){
      const a = i/4 * Math.PI * 2 + Math.PI/4;
      const armG = new THREE.Group();
      armG.rotation.y = a;
      propG.add(armG);
      this.cyl(.018, .018, .3, 6, propM, .15, 0, 0, armG, Math.PI/2);
      this.cyl(.055, .055, .1, 8, accentM, .3, 0, 0, armG, 0);
      const blade1 = this.box(.28, .012, .06, propM, .3, .06, 0, armG);
      const blade2 = this.box(.06, .012, .28, propM, .3, .06, 0, armG);
      propellers.push({group: armG, blades: [blade1, blade2]});
    }

    const blinkLights = [];
    for(let i=0; i<4; i++){
      const a = i/4 * Math.PI * 2;
      const lightMesh = this.sph(.045, 6, 6, new THREE.MeshBasicMaterial({color: i % 2 === 0 ? 0xff2222 : 0x22ff22}), Math.cos(a)*.35, -.15, Math.sin(a)*.35, droneG);
      blinkLights.push(lightMesh);
    }

    this.sph(.2, 10, 8, accentM, 0, -.22, 0, droneG).scale.set(1, .5, 1);

    const droneLight = new THREE.PointLight(0x8888ff, .8, 2.5);
    droneLight.position.set(0, y - .1, 0);
    g.add(droneLight);

    this.parts.hangingDrone = {
      group: g, droneGroup: droneG, propellers, blinkLights,
      baseY: y, phase: Math.random() * Math.PI * 2,
      swingPhase: Math.random() * Math.PI * 2, light: droneLight,
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

    this.cyl(.5, .55, .3, 14, dark, 0, .15, 0, g);
    this.tor(.52, .04, 6, 16, accentO, 0, .15, 0, g, Math.PI/2, 0, 0);
    this.cyl(.18, .22, .8, 10, metalD, 0, .7, 0, g);
    this.box(.7, .4, .5, metalD, 0, 1.2, 0, g);
    this.box(.9, .55, .55, metalL, 0, 1.65, 0, g);
    this.box(.6, .3, .06, accentO, 0, 1.65, .29, g);

    this.parts.barRobotLeds = [];
    for(let i=0; i<5; i++){
      const led = this.sph(.03, 6, 6,
        new THREE.MeshBasicMaterial({color:[0xff0000, 0xff8800, 0xffdd00, 0x00ff00, 0x0088ff][i]}),
        -.24 + i*.12, 1.65, .32, g);
      this.parts.barRobotLeds.push(led);
    }

    this.cyl(.09, .09, .15, 8, chrome, 0, 2.0, 0, g);
    this.tor(.1, .02, 4, 12, dark, 0, 2.08, 0, g, Math.PI/2, 0, 0);
    this.cyl(.09, .09, .15, 8, chrome, 0, 2.15, 0, g);
    this.tor(.1, .02, 4, 12, dark, 0, 2.23, 0, g, Math.PI/2, 0, 0);

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

    this.sph(.14, 10, 8, chrome, -.48, 1.85, 0, g);
    this.sph(.14, 10, 8, chrome, .48, 1.85, 0, g);

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

  // ═══════════════ БАРМЕНША (иерархия конечностей, чистые волосы) ═══════════════
  buildBarmaid(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI * 0.8;
    this.group.add(g);

    const skinM = new THREE.MeshStandardMaterial({color:0xddb894, roughness:.55, metalness:.05});
    const hairM = new THREE.MeshStandardMaterial({color:0x2a1008, roughness:.65, metalness:.15});
    const hairHiM = new THREE.MeshStandardMaterial({color:0x4a2510, roughness:.6, metalness:.2});
    const dressM = new THREE.MeshStandardMaterial({color:0xcc1133, roughness:.45, metalness:.25, emissive:0x440010, emissiveIntensity:.35});
    const dressDarkM = new THREE.MeshStandardMaterial({color:0x7a0022, roughness:.5, metalness:.2});
    const chromeM = new THREE.MeshStandardMaterial({color:0x9a9aa6, metalness:1, roughness:.1});
    const seatM = new THREE.MeshStandardMaterial({color:0x4a0a14, roughness:.75, metalness:.15});
    const lipM = new THREE.MeshBasicMaterial({color:0xcc0022});
    const eyeM = new THREE.MeshBasicMaterial({color:0x1a0a05});
    const eyeWhiteM = new THREE.MeshBasicMaterial({color:0xf8f8f0});
    const whiteM = new THREE.MeshBasicMaterial({color:0xffffff});
    const blushM = new THREE.MeshBasicMaterial({color:0xdd6688, transparent:true, opacity:.35});
    const goldM = new THREE.MeshStandardMaterial({color:0xffd700, metalness:.95, roughness:.15});
    const drinkM = new THREE.MeshStandardMaterial({color:0xffaa22, transparent:true, opacity:.85, metalness:.1, roughness:.05, emissive:0xff6600, emissiveIntensity:.2});
    const glassM = new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:.4, metalness:.3, roughness:.05});
    const oliveM = new THREE.MeshStandardMaterial({color:0x6a8a0a, roughness:.6});
    const shoesM = new THREE.MeshStandardMaterial({color:0x1a0000, roughness:.4, metalness:.6});

    // Стул
    this.cyl(.32, .38, .05, 16, chromeM, 0, .025, 0, g);
    this.cyl(.055, .055, .8, 8, chromeM, 0, .45, 0, g);
    this.tor(.2, .022, 6, 20, chromeM, 0, .28, 0, g, Math.PI/2, 0, 0);
    this.cyl(.28, .26, .12, 20, seatM, 0, .89, 0, g);
    this.tor(.27, .02, 6, 24, goldM, 0, .94, 0, g, Math.PI/2, 0, 0);
    this.cyl(.03, .03, .3, 6, chromeM, -.2, 1.05, -.22, g);
    this.cyl(.03, .03, .3, 6, chromeM, .2, 1.05, -.22, g);
    this.cyl(.22, .22, .1, 16, seatM, 0, 1.25, -.22, g);

    // Таз
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 12), dressM);
    pelvis.position.set(0, 1.0, 0);
    pelvis.scale.set(1.25, .75, 1.15);
    g.add(pelvis);

    // ─── ПРАВАЯ НОГА ───
    const hipR = new THREE.Group();
    hipR.position.set(.13, .95, 0);
    hipR.rotation.x = .35;
    g.add(hipR);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(.1, .085, .45, 10), skinM);
    thighR.position.set(0, -.225, 0);
    hipR.add(thighR);
    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), skinM);
    kneeR.position.set(0, -.45, 0);
    hipR.add(kneeR);
    const shinR = new THREE.Group();
    shinR.position.set(0, -.45, 0);
    shinR.rotation.x = -.35;
    hipR.add(shinR);
    const shinRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.08, .06, .45, 10), skinM);
    shinRMesh.position.set(0, -.225, 0);
    shinR.add(shinRMesh);
    const ankleR = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), skinM);
    ankleR.position.set(0, -.45, 0);
    shinR.add(ankleR);
    const footR = new THREE.Group();
    footR.position.set(0, -.45, 0);
    shinR.add(footR);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(.1, .08, .22), shoesM);
    shoeR.position.set(0, -.04, .1);
    footR.add(shoeR);
    const heelR = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .05), shoesM);
    heelR.position.set(0, -.07, -.02);
    footR.add(heelR);
    const toeR = new THREE.Mesh(new THREE.ConeGeometry(.045, .1, 8), shoesM);
    toeR.position.set(0, -.04, .22);
    toeR.rotation.x = Math.PI/2;
    footR.add(toeR);

    // ─── ЛЕВАЯ НОГА (чуть закинута) ───
    const hipL = new THREE.Group();
    hipL.position.set(-.13, .95, 0);
    hipL.rotation.x = .5;
    hipL.rotation.z = .12;
    g.add(hipL);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(.1, .085, .45, 10), skinM);
    thighL.position.set(0, -.225, 0);
    hipL.add(thighL);
    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), skinM);
    kneeL.position.set(0, -.45, 0);
    hipL.add(kneeL);
    const shinL = new THREE.Group();
    shinL.position.set(0, -.45, 0);
    shinL.rotation.x = -.6;
    shinL.rotation.z = -.12;
    hipL.add(shinL);
    const shinLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.08, .06, .45, 10), skinM);
    shinLMesh.position.set(0, -.225, 0);
    shinL.add(shinLMesh);
    const ankleL = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), skinM);
    ankleL.position.set(0, -.45, 0);
    shinL.add(ankleL);
    const footL = new THREE.Group();
    footL.position.set(0, -.45, 0);
    shinL.add(footL);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(.1, .08, .22), shoesM);
    shoeL.position.set(0, -.04, .1);
    footL.add(shoeL);
    const heelL = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .05), shoesM);
    heelL.position.set(0, -.07, -.02);
    footL.add(heelL);
    const toeL = new THREE.Mesh(new THREE.ConeGeometry(.045, .1, 8), shoesM);
    toeL.position.set(0, -.04, .22);
    toeL.rotation.x = Math.PI/2;
    footL.add(toeL);

    // ─── ТОРС ───
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, .2, 16), dressM);
    skirt.position.set(0, 1.16, 0);
    g.add(skirt);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(.19, .22, .18, 14), dressM);
    waist.position.set(0, 1.34, 0);
    g.add(waist);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(.24, .2, .25, 14), dressM);
    chest.position.set(0, 1.52, 0);
    g.add(chest);
    const bustL = new THREE.Mesh(new THREE.SphereGeometry(.115, 12, 10), dressM);
    bustL.position.set(-.1, 1.57, .14);
    bustL.scale.set(1, 1, 1.1);
    g.add(bustL);
    const bustR = new THREE.Mesh(new THREE.SphereGeometry(.115, 12, 10), dressM);
    bustR.position.set(.1, 1.57, .14);
    bustR.scale.set(1, 1, 1.1);
    g.add(bustR);
    const neckLine = new THREE.Mesh(new THREE.BoxGeometry(.3, .04, .05), skinM);
    neckLine.position.set(0, 1.64, .12);
    g.add(neckLine);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .035, 14), dressDarkM);
    belt.position.set(0, 1.23, 0);
    g.add(belt);

    // Плечи
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), skinM);
    shoulderL.position.set(-.24, 1.68, 0);
    g.add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), skinM);
    shoulderR.position.set(.24, 1.68, 0);
    g.add(shoulderR);

    // ─── ПРАВАЯ РУКА (на бедре) ───
    const armR = new THREE.Group();
    armR.position.set(.24, 1.68, 0);
    armR.rotation.z = -.12;
    armR.rotation.x = .1;
    g.add(armR);
    const upperArmRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.055, .05, .34, 10), skinM);
    upperArmRMesh.position.set(0, -.17, 0);
    armR.add(upperArmRMesh);
    const elbowR = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), skinM);
    elbowR.position.set(0, -.34, 0);
    armR.add(elbowR);
    const forearmR = new THREE.Group();
    forearmR.position.set(0, -.34, 0);
    forearmR.rotation.x = -.25;
    forearmR.rotation.z = -.08;
    armR.add(forearmR);
    const foreArmRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.05, .042, .3, 10), skinM);
    foreArmRMesh.position.set(0, -.15, 0);
    forearmR.add(foreArmRMesh);
    const wristR = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 8), skinM);
    wristR.position.set(0, -.3, 0);
    forearmR.add(wristR);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), skinM);
    handR.position.set(0, -.36, .02);
    handR.scale.set(1, .9, .7);
    forearmR.add(handR);
    for(let i=0; i<4; i++){
      const f = new THREE.Mesh(new THREE.CylinderGeometry(.011, .009, .06, 6), skinM);
      f.position.set(-.02 + i*.015, -.4, .04);
      f.rotation.x = .35;
      forearmR.add(f);
    }

    // ─── ЛЕВАЯ РУКА (с бокалом) ───
    const armL = new THREE.Group();
    armL.position.set(-.24, 1.68, 0);
    armL.rotation.z = .12;
    g.add(armL);
    const upperArmLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.055, .05, .34, 10), skinM);
    upperArmLMesh.position.set(0, -.17, 0);
    armL.add(upperArmLMesh);
    const elbowL = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), skinM);
    elbowL.position.set(0, -.34, 0);
    armL.add(elbowL);
    const forearmL = new THREE.Group();
    forearmL.position.set(0, -.34, 0);
    forearmL.rotation.x = -1.3;
    armL.add(forearmL);
    const foreArmLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.05, .042, .3, 10), skinM);
    foreArmLMesh.position.set(0, -.15, 0);
    forearmL.add(foreArmLMesh);
    const wristL = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 8), skinM);
    wristL.position.set(0, -.3, 0);
    forearmL.add(wristL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), skinM);
    handL.position.set(0, -.35, .02);
    handL.scale.set(1, .9, .8);
    forearmL.add(handL);

    // Бокал — дочерний к forearmL
    const drinkG = new THREE.Group();
    drinkG.position.set(0, -.35, .06);
    forearmL.add(drinkG);
    const drinkBase = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .01, 14), glassM);
    drinkG.add(drinkBase);
    const drinkStem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .1, 8), glassM);
    drinkStem.position.set(0, .055, 0);
    drinkG.add(drinkStem);
    const drinkCup = new THREE.Mesh(new THREE.CylinderGeometry(.1, .012, .14, 14), glassM);
    drinkCup.position.set(0, .17, 0);
    drinkG.add(drinkCup);
    const drinkLiquid = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 10), drinkM);
    drinkLiquid.position.set(0, .17, 0);
    drinkG.add(drinkLiquid);
    const drinkOlive = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 8), oliveM);
    drinkOlive.position.set(.02, .22, .03);
    drinkG.add(drinkOlive);
    const drinkStick = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .12, 4), goldM);
    drinkStick.position.set(-.02, .21, -.02);
    drinkStick.rotation.z = .3;
    drinkG.add(drinkStick);

    // Шея
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .12, 10), skinM);
    neck.position.set(0, 1.79, 0);
    g.add(neck);
    this.tor(.08, .008, 4, 16, goldM, 0, 1.75, .02, g, Math.PI/2, 0, 0);
    this.sph(.022, 8, 8, goldM, 0, 1.69, .1, g);

    // ─── ГОЛОВА ───
    const headG = new THREE.Group();
    headG.position.set(0, 1.94, 0);
    g.add(headG);
    this.parts.barmaidHead = headG;

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(.16, 18, 16), skinM);
    headMesh.scale.set(.92, 1.08, .98);
    headG.add(headMesh);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), skinM);
    jaw.position.set(0, -.08, .06);
    headG.add(jaw);

    // Глаза
    for(let s of [-1, 1]){
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(.038, 12, 10), eyeWhiteM);
      eyeW.position.set(s*.065, .02, .13);
      eyeW.scale.set(1, .85, .7);
      headG.add(eyeW);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), eyeM);
      eye.position.set(s*.065, .02, .14);
      headG.add(eye);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 6), whiteM);
      spark.position.set(s*.06, .03, .158);
      headG.add(spark);
      for(let j=0; j<3; j++){
        const lash = new THREE.Mesh(new THREE.CylinderGeometry(.004, .001, .04, 4), eyeM);
        lash.position.set(s*.055 + j*s*.018, .055, .148);
        lash.rotation.z = s * (.15 + j*.15);
        lash.rotation.x = -.3;
        headG.add(lash);
      }
      const brow = new THREE.Mesh(new THREE.BoxGeometry(.06, .008, .015), hairM);
      brow.position.set(s*.065, .08, .14);
      brow.rotation.z = s * .12;
      headG.add(brow);
    }

    // Нос
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 8), skinM);
    nose.position.set(0, -.02, .16);
    nose.scale.set(.8, 1, 1.1);
    headG.add(nose);

    // Губы
    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), lipM);
    upperLip.position.set(0, -.07, .145);
    upperLip.scale.set(1.1, .35, .55);
    headG.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), lipM);
    lowerLip.position.set(0, -.085, .145);
    lowerLip.scale.set(1.15, .4, .6);
    headG.add(lowerLip);

    // Румянец
    const blushL = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 8), blushM);
    blushL.position.set(-.1, -.01, .12);
    headG.add(blushL);
    const blushR = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 8), blushM);
    blushR.position.set(.1, -.01, .12);
    headG.add(blushR);

    // ─── ВОЛОСЫ (полусферы: макушка + затылок, лицо чистое) ───
    // Задняя половина (затылок, z<0) — полусфера phi π..2π
    const hairBackHalf = new THREE.Mesh(
      new THREE.SphereGeometry(.17, 20, 16, Math.PI, Math.PI, 0, Math.PI),
      new THREE.MeshStandardMaterial({color:0x2a1008, roughness:.65, metalness:.15, side: THREE.DoubleSide})
    );
    hairBackHalf.position.set(0, .02, -.01);
    hairBackHalf.scale.set(1.05, 1.12, 1.0);
    headG.add(hairBackHalf);

    // Верхняя крышка (макушка) — полусфера theta 0..π/2, не заходит на лицо
    const hairTopCap = new THREE.Mesh(
      new THREE.SphereGeometry(.17, 20, 12, 0, Math.PI*2, 0, Math.PI*0.5),
      hairM
    );
    hairTopCap.position.set(0, .05, -.02);
    hairTopCap.scale.set(1.06, .8, 1.06);
    headG.add(hairTopCap);

    // Длинная масса сзади до плеч
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(.3, .55, .14), hairM);
    hairBack.position.set(0, -.35, -.15);
    hairBack.rotation.x = -.08;
    headG.add(hairBack);

    // Пряди каскадом
    const hairLocks = [];
    for(let i=0; i<5; i++){
      const lock = new THREE.Mesh(
        new THREE.CylinderGeometry(.03 - i*.003, .015, .35 - i*.03, 6),
        i%2===0 ? hairM : hairHiM
      );
      lock.position.set(-.15 + i*.075, -.25, -.18 + i*.01);
      lock.rotation.x = -.05 + i*.02;
      lock.rotation.z = (i - 2) * .08;
      headG.add(lock);
      hairLocks.push(lock);
    }

    // Боковые пряди
    for(let s of [-1, 1]){
      const sideLock = new THREE.Mesh(new THREE.CylinderGeometry(.035, .02, .3, 6), hairM);
      sideLock.position.set(s*.16, -.2, -.02);
      sideLock.rotation.z = s * .1;
      headG.add(sideLock);
    }

    // Передние пряди (по бокам от лица, не на глазах)
    for(let s of [-1, 1]){
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(.025, .018, .22, 6), hairM);
      strand.position.set(s*.15, -.04, .06);
      strand.rotation.z = s * .12;
      strand.rotation.x = -.08;
      headG.add(strand);
    }

    // Серьги
    for(let s of [-1, 1]){
      const earringTop = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 6), goldM);
      earringTop.position.set(s*.16, -.05, 0);
      headG.add(earringTop);
      const earringLink = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .04, 4), goldM);
      earringLink.position.set(s*.16, -.08, 0);
      headG.add(earringLink);
      const earringDrop = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), goldM);
      earringDrop.position.set(s*.16, -.12, 0);
      earringDrop.scale.set(1, 1.4, .8);
      headG.add(earringDrop);
    }

    this.barmaid = {
      group: g, headGroup: headG,
      hairBack, hairTopCap, hairBackHalf, hairLocks,
      drink: drinkG,
      armL, armR, forearmL, forearmR,
      hipL, hipR, shinL, shinR,
      phase: Math.random() * Math.PI * 2,
    };
  }

  // ═══════════════ КОВБОЙ (иерархия конечностей) ═══════════════
  buildCowboy(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI * 0.75;
    this.group.add(g);

    const skinM = new THREE.MeshStandardMaterial({color:0xc89860, roughness:.7, metalness:.05});
    const hatM = new THREE.MeshStandardMaterial({color:0x3a2010, roughness:.85, metalness:.1});
    const hatBandM = new THREE.MeshStandardMaterial({color:0x0a0a0a, roughness:.6, metalness:.3});
    const shirtM = new THREE.MeshStandardMaterial({color:0x884422, roughness:.85, metalness:.05});
    const shirtLineM = new THREE.MeshStandardMaterial({color:0x5a2a10, roughness:.85});
    const bandanaM = new THREE.MeshStandardMaterial({color:0xcc2222, roughness:.75, metalness:.05});
    const jeansM = new THREE.MeshStandardMaterial({color:0x3a4a8a, roughness:.8, metalness:.1});
    const bootsM = new THREE.MeshStandardMaterial({color:0x4a2a10, roughness:.6, metalness:.2});
    const buckleM = new THREE.MeshStandardMaterial({color:0xddb84a, metalness:.95, roughness:.2});
    const chromeM = new THREE.MeshStandardMaterial({color:0x9a9aa6, metalness:1, roughness:.1});
    const seatM = new THREE.MeshStandardMaterial({color:0x3a2a18, roughness:.8, metalness:.1});
    const whiskeyM = new THREE.MeshStandardMaterial({color:0xcc8822, transparent:true, opacity:.85, metalness:.1, roughness:.1, emissive:0x442200, emissiveIntensity:.2});
    const glassM = new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:.4, metalness:.3, roughness:.05});
    const hairM = new THREE.MeshStandardMaterial({color:0x2a1a0a, roughness:.9, metalness:.05});
    const iceM = new THREE.MeshStandardMaterial({color:0xcceeff, transparent:true, opacity:.7});
    const mouthM = new THREE.MeshBasicMaterial({color:0x4a1a10});
    const eyeWhiteM = new THREE.MeshBasicMaterial({color:0xf8f8f0});
    const irisM = new THREE.MeshBasicMaterial({color:0x2a1a0a});
    const whiteM = new THREE.MeshBasicMaterial({color:0xffffff});
    const nostrilM = new THREE.MeshBasicMaterial({color:0x4a2a10});
    const stubM = new THREE.MeshBasicMaterial({color:0x1a0a05});

    // Стул
    this.cyl(.32, .38, .05, 16, chromeM, 0, .025, 0, g);
    this.cyl(.055, .055, .8, 8, chromeM, 0, .45, 0, g);
    this.tor(.2, .022, 6, 20, chromeM, 0, .28, 0, g, Math.PI/2, 0, 0);
    this.cyl(.28, .26, .12, 20, seatM, 0, .89, 0, g);
    this.cyl(.03, .03, .3, 6, chromeM, -.2, 1.05, -.22, g);
    this.cyl(.03, .03, .3, 6, chromeM, .2, 1.05, -.22, g);
    this.cyl(.22, .22, .1, 16, seatM, 0, 1.25, -.22, g);

    // Таз
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.26, 14, 12), jeansM);
    pelvis.position.set(0, 1.02, 0);
    pelvis.scale.set(1.3, .75, 1.2);
    g.add(pelvis);

    // ─── ПРАВАЯ НОГА ───
    const hipR = new THREE.Group();
    hipR.position.set(.14, .98, 0);
    hipR.rotation.x = .3;
    g.add(hipR);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(.11, .09, .55, 10), jeansM);
    thighR.position.set(0, -.275, 0);
    hipR.add(thighR);
    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), jeansM);
    kneeR.position.set(0, -.55, 0);
    hipR.add(kneeR);
    const shinR = new THREE.Group();
    shinR.position.set(0, -.55, 0);
    shinR.rotation.x = -.3;
    hipR.add(shinR);
    const shinRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.09, .08, .45, 10), jeansM);
    shinRMesh.position.set(0, -.225, 0);
    shinR.add(shinRMesh);
    const bootR = new THREE.Group();
    bootR.position.set(0, -.45, 0);
    shinR.add(bootR);
    const bootBodyR = new THREE.Mesh(new THREE.BoxGeometry(.11, .12, .28), bootsM);
    bootBodyR.position.set(0, -.04, .1);
    bootR.add(bootBodyR);
    const bootToeR = new THREE.Mesh(new THREE.ConeGeometry(.055, .1, 8), bootsM);
    bootToeR.position.set(0, -.06, .28);
    bootToeR.rotation.x = Math.PI/2;
    bootR.add(bootToeR);
    const bootTopR = new THREE.Mesh(new THREE.CylinderGeometry(.09, .085, .18, 10), bootsM);
    bootTopR.position.set(0, .07, 0);
    bootR.add(bootTopR);

    // ─── ЛЕВАЯ НОГА (согнута) ───
    const hipL = new THREE.Group();
    hipL.position.set(-.14, .98, 0);
    hipL.rotation.x = .55;
    g.add(hipL);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(.11, .09, .55, 10), jeansM);
    thighL.position.set(0, -.275, 0);
    hipL.add(thighL);
    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), jeansM);
    kneeL.position.set(0, -.55, 0);
    hipL.add(kneeL);
    const shinL = new THREE.Group();
    shinL.position.set(0, -.55, 0);
    shinL.rotation.x = -.9;
    hipL.add(shinL);
    const shinLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.09, .08, .45, 10), jeansM);
    shinLMesh.position.set(0, -.225, 0);
    shinL.add(shinLMesh);
    const bootL = new THREE.Group();
    bootL.position.set(0, -.45, 0);
    shinL.add(bootL);
    const bootBodyL = new THREE.Mesh(new THREE.BoxGeometry(.11, .12, .28), bootsM);
    bootBodyL.position.set(0, -.04, .1);
    bootL.add(bootBodyL);
    const bootToeL = new THREE.Mesh(new THREE.ConeGeometry(.055, .1, 8), bootsM);
    bootToeL.position.set(0, -.06, .28);
    bootToeL.rotation.x = Math.PI/2;
    bootL.add(bootToeL);
    const bootTopL = new THREE.Mesh(new THREE.CylinderGeometry(.09, .085, .18, 10), bootsM);
    bootTopL.position.set(0, .07, 0);
    bootL.add(bootTopL);

    // ─── ТОРС ───
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(.26, .27, .08, 14), hatM);
    belt.position.set(0, 1.24, 0);
    g.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(.12, .08, .03), buckleM);
    buckle.position.set(0, 1.24, .15);
    g.add(buckle);
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, .55, 12), shirtM);
    shirt.position.set(0, 1.55, 0);
    g.add(shirt);
    for(let i=0; i<3; i++){
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.245 - i*.005, .245 - i*.005, .02, 12), shirtLineM);
      stripe.position.set(0, 1.35 + i*.15, 0);
      g.add(stripe);
    }
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(.02, .5, .02), shirtLineM);
    zipper.position.set(0, 1.55, .16);
    g.add(zipper);

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), shirtM);
    shoulderL.position.set(-.26, 1.76, 0);
    g.add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), shirtM);
    shoulderR.position.set(.26, 1.76, 0);
    g.add(shoulderR);

    // Бандана
    const bandana = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .08, 12), bandanaM);
    bandana.position.set(0, 1.82, .02);
    g.add(bandana);
    const bandanaTail1 = new THREE.Mesh(new THREE.ConeGeometry(.06, .15, 4), bandanaM);
    bandanaTail1.position.set(0, 1.72, -.14);
    g.add(bandanaTail1);
    const bandanaTail2 = new THREE.Mesh(new THREE.ConeGeometry(.04, .1, 4), bandanaM);
    bandanaTail2.position.set(.03, 1.72, -.15);
    g.add(bandanaTail2);

    // ─── ПРАВАЯ РУКА (на бедре) ───
    const armR = new THREE.Group();
    armR.position.set(.26, 1.76, 0);
    armR.rotation.z = -.12;
    armR.rotation.x = .1;
    g.add(armR);
    const upperArmRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, .34, 10), shirtM);
    upperArmRMesh.position.set(0, -.17, 0);
    armR.add(upperArmRMesh);
    const elbowR = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), shirtM);
    elbowR.position.set(0, -.34, 0);
    armR.add(elbowR);
    const forearmR = new THREE.Group();
    forearmR.position.set(0, -.34, 0);
    forearmR.rotation.x = -.25;
    armR.add(forearmR);
    const foreArmRMesh = new THREE.Mesh(new THREE.CylinderGeometry(.06, .052, .32, 10), skinM);
    foreArmRMesh.position.set(0, -.16, 0);
    forearmR.add(foreArmRMesh);
    const wristR = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 8), skinM);
    wristR.position.set(0, -.32, 0);
    forearmR.add(wristR);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), skinM);
    handR.position.set(0, -.38, .02);
    handR.scale.set(1, .9, .7);
    forearmR.add(handR);

    // ─── ЛЕВАЯ РУКА (с виски) ───
    const armL = new THREE.Group();
    armL.position.set(-.26, 1.76, 0);
    armL.rotation.z = .12;
    g.add(armL);
    const upperArmLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, .34, 10), shirtM);
    upperArmLMesh.position.set(0, -.17, 0);
    armL.add(upperArmLMesh);
    const elbowL = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), shirtM);
    elbowL.position.set(0, -.34, 0);
    armL.add(elbowL);
    const forearmL = new THREE.Group();
    forearmL.position.set(0, -.34, 0);
    forearmL.rotation.x = -1.2;
    armL.add(forearmL);
    const foreArmLMesh = new THREE.Mesh(new THREE.CylinderGeometry(.06, .052, .3, 10), skinM);
    foreArmLMesh.position.set(0, -.15, 0);
    forearmL.add(foreArmLMesh);
    const wristL = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 8), skinM);
    wristL.position.set(0, -.3, 0);
    forearmL.add(wristL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), skinM);
    handL.position.set(0, -.35, .02);
    handL.scale.set(1, .9, .8);
    forearmL.add(handL);

    // Виски
    const drinkG = new THREE.Group();
    drinkG.position.set(0, -.35, .06);
    forearmL.add(drinkG);
    const glassBody = new THREE.Mesh(new THREE.CylinderGeometry(.07, .065, .12, 12), glassM);
    drinkG.add(glassBody);
    const whiskey = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, .08, 12), whiskeyM);
    whiskey.position.set(0, -.015, 0);
    drinkG.add(whiskey);
    const ice1 = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .04), iceM);
    ice1.position.set(.02, .01, 0);
    drinkG.add(ice1);
    const ice2 = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .035), iceM);
    ice2.position.set(-.025, .015, .01);
    drinkG.add(ice2);

    // Шея
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .12, 10), skinM);
    neck.position.set(0, 1.92, 0);
    g.add(neck);

    // ─── ГОЛОВА ───
    const headG = new THREE.Group();
    headG.position.set(0, 2.08, 0);
    g.add(headG);
    this.parts.cowboyHead = headG;

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(.16, 18, 16), skinM);
    headMesh.scale.set(.95, 1.05, .98);
    headG.add(headMesh);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), skinM);
    jaw.position.set(0, -.08, .06);
    headG.add(jaw);

    // Глаза
    for(let s of [-1, 1]){
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), eyeWhiteM);
      eyeW.position.set(s*.06, .02, .13);
      eyeW.scale.set(1, .85, .7);
      headG.add(eyeW);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), irisM);
      eye.position.set(s*.06, .02, .14);
      headG.add(eye);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(.007, 6, 6), whiteM);
      spark.position.set(s*.055, .03, .158);
      headG.add(spark);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(.07, .014, .02), hairM);
      brow.position.set(s*.06, .08, .14);
      brow.rotation.z = s * .2;
      headG.add(brow);
    }

    // Нос
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.024, 8, 8), skinM);
    nose.position.set(0, -.02, .16);
    nose.scale.set(.9, 1, 1.1);
    headG.add(nose);
    for(let s of [-1, 1]){
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 6), nostrilM);
      nostril.position.set(s*.02, -.03, .17);
      headG.add(nostril);
    }

    // Усы
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(.13, .03, .03), hairM);
    mustache.position.set(0, -.06, .155);
    headG.add(mustache);
    for(let s of [-1, 1]){
      const curl = new THREE.Mesh(new THREE.CylinderGeometry(.012, .008, .05, 6), hairM);
      curl.position.set(s*.07, -.045, .155);
      curl.rotation.z = s * .8;
      headG.add(curl);
    }

    // Рот
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(.05, .008, .01), mouthM);
    mouth.position.set(0, -.09, .155);
    headG.add(mouth);

    // Щетина
    for(let i=0; i<8; i++){
      const angle = -Math.PI/4 + i * Math.PI/16;
      const stub = new THREE.Mesh(new THREE.SphereGeometry(.008, 4, 4), stubM);
      stub.position.set(Math.cos(angle)*.11, -.13, .13);
      headG.add(stub);
    }

    // Шляпа
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, .18, 14), hatM);
    hatTop.position.set(0, .17, 0);
    headG.add(hatTop);
    const hatDent = new THREE.Mesh(new THREE.BoxGeometry(.14, .06, .02), hatM);
    hatDent.position.set(0, .2, 0);
    headG.add(hatDent);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .025, 24), hatM);
    brim.position.set(0, .08, 0);
    headG.add(brim);
    for(let i=0; i<8; i++){
      const a = i/8 * Math.PI * 2;
      const curl = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .015, 6), hatM);
      curl.position.set(Math.cos(a)*.3, .085, Math.sin(a)*.3);
      headG.add(curl);
    }
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .04, 14), hatBandM);
    hatBand.position.set(0, .1, 0);
    headG.add(hatBand);
    const hatBuckle = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .015), buckleM);
    hatBuckle.position.set(.12, .1, .1);
    headG.add(hatBuckle);
    const shadow = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 12), new THREE.MeshBasicMaterial({color:0x1a1208, transparent:true, opacity:.35}));
    shadow.position.set(0, .08, .06);
    shadow.rotation.x = -.05;
    headG.add(shadow);

    // Волосы под шляпой
    const hairUnder = new THREE.Mesh(new THREE.BoxGeometry(.3, .08, .14), hairM);
    hairUnder.position.set(0, .05, -.1);
    headG.add(hairUnder);

    this.cowboy = {
      group: g, headGroup: headG, drink: drinkG,
      armL, armR, forearmL, forearmR,
      hipL, hipR, shinL, shinR,
      phase: Math.random() * Math.PI * 2,
    };
  }

  buildStage(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);

    this.box(8.0, .4, 2.0, this.matDarkMetal(), 0, .2, 0, g);
    this.box(8.1, .06, 2.1, new THREE.MeshStandardMaterial({color:0x111118, roughness:.7, metalness:.3}), 0, .42, 0, g);
    this.box(8.0, 4.5, .2, new THREE.MeshStandardMaterial({color:0x0a0a15, roughness:.9}), 0, 2.5, 1.15, g);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.30,
      roughness: 0.9, metalness: 0.05,
      emissive: 0x223344, emissiveIntensity: 0.22,
      depthWrite: false, side: THREE.DoubleSide
    });
    const glass = this.a(new THREE.PlaneGeometry(9, 4.5), glassMat, 0, 2.4, -1.2, 0, 0, 0, g);
    this.parts.stageGlass = glass;

    this.box(9.4, .18, .22, this.matMetal(), 0, 4.75, -1.2, g);
    this.box(9.4, .18, .22, this.matMetal(), 0, .05, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), -4.65, 2.4, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), 4.65, 2.4, -1.2, g);
    for (let i = -1; i <= 1; i++) {
      this.box(.06, 4.5, .16, this.matMetal(), i * 2.3, 2.4, -1.2, g);
    }

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

    this.registerInteractable('stage', g, 'MOTORIK ПРОГ-СЦЕНА · BROADCAST FROM THE VOID', 4.0, 0xff22aa);
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
      group: g, leftArm, rightArm, head, instrument, role,
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
    if(z > 6.8) return false;
    const dxPot = x - 7, dzPot = z + 8;
    if(dxPot*dxPot + dzPot*dzPot < 0.55*0.55) return false;
    return true;
  }

  update(dt){
    if(!hubPlayer) return;

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

    if(this.parts.lavaBlobs){
      const t = Date.now() * .001;
      this.parts.lavaBlobs.forEach((blob, i) => {
        const ud = blob.userData;
        const y = ud.baseY + Math.sin(t * ud.speed + ud.phase) * 1.8;
        blob.position.y = ((y % this.roomHeight) + this.roomHeight) % this.roomHeight;
        const pulse = 1 + Math.sin(t * (ud.speed * 2) + ud.phase * 1.3) * .35;
        blob.scale.x = pulse;
        blob.scale.y = (1 + Math.sin(t * ud.speed * 1.4 + ud.phase) * .5);
        blob.scale.z = .4;
        const hueShift = (Math.sin(t * .3 + ud.phase) + 1) * .5;
        const hue = ud.colorHSL + hueShift * .05;
        blob.material.color.setHSL(hue, 1, .5 + Math.sin(t * 2 + ud.phase) * .15);
      });
    }

    this.updateBarRobot(dt);
    this.updateBarmaid(dt);
    this.updateCowboy(dt);
    this.updatePottedVerkhushka(dt);
    this.updateHangingDrone(dt);
    if(this.miniDog) this.miniDog.update(dt);

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

    player.isMoving = hubPlayer.isMoving;
    player.bobPhase = hubBobPhase;

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

    if(!hubCasinoActive && !hubDiceActive && !hubBloodActive && !isNestActive && !isSynergyPanelOpen){
      this.updatePlayerMovement(dt);
      this.updateShooting(dt);
    } else {
      this.mouseDown = false;
    }

    this.hubRecoilPitch *= Math.pow(0.001, dt);
    if(Math.abs(this.hubRecoilPitch) < 0.0005) this.hubRecoilPitch = 0;

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

  updatePottedVerkhushka(dt){
    if(!this.parts.pottedVerkhushka) return;
    const pv = this.parts.pottedVerkhushka;
    const t = Date.now() * 0.001 + pv.phase;
    if(pv.verkhGroup){
      pv.verkhGroup.rotation.z = Math.sin(t * 0.8) * 0.06;
      pv.verkhGroup.rotation.x = Math.sin(t * 1.1) * 0.04;
    }
    if(pv.leaves){
      pv.leaves.forEach((leaf, i) => {
        const ph = t * 1.4 + i * 0.7;
        leaf.rotation.z = Math.cos(i * Math.PI * 2 / 5 + Math.PI/4) * .5 + Math.sin(ph) * 0.08;
        leaf.rotation.x = Math.sin(i * Math.PI * 2 / 5 + Math.PI/4) * .5 + Math.cos(ph * 1.3) * 0.08;
      });
    }
    pv.blinkTimer -= dt;
    if(pv.blinkTimer <= 0){
      pv.blinkTimer = 2.5 + Math.random() * 4;
      if(pv.eyeL && pv.eyeR){
        pv.eyeL.scale.y = 0.1;
        pv.eyeR.scale.y = 0.1;
        setTimeout(() => {
          if(pv.eyeL) pv.eyeL.scale.y = 1;
          if(pv.eyeR) pv.eyeR.scale.y = 1;
        }, 130);
      }
    }
  }

  updateHangingDrone(dt){
    if(!this.parts.hangingDrone) return;
    const hd = this.parts.hangingDrone;
    const t = Date.now() * 0.001;
    if(hd.droneGroup){
      const swing = Math.sin(t * 0.7 + hd.swingPhase) * 0.12;
      hd.droneGroup.position.x = Math.sin(t * 0.7 + hd.swingPhase) * 0.35;
      hd.droneGroup.position.z = Math.cos(t * 0.55 + hd.swingPhase * 1.2) * 0.3;
      hd.droneGroup.rotation.z = -swing;
      hd.droneGroup.rotation.x = Math.cos(t * 0.55 + hd.swingPhase * 1.2) * 0.08;
      hd.droneGroup.position.y = hd.baseY + Math.sin(t * 1.3 + hd.phase) * 0.06;
    }
    if(hd.propellers){
      hd.propellers.forEach(p => {
        p.group.rotation.y += dt * 32;
      });
    }
    if(hd.blinkLights){
      hd.blinkLights.forEach((l, i) => {
        const isRed = i % 2 === 0;
        const on = Math.sin(Date.now() * 0.006 + i * 1.5) > 0;
        l.material.color.setRGB(
          isRed ? (on ? 1 : 0.1) : 0.05,
          isRed ? 0.05 : (on ? 1 : 0.1),
          0.05
        );
      });
    }
    if(hd.light){
      hd.light.intensity = 0.6 + Math.sin(t * 2 + hd.phase) * 0.3;
    }
  }

  updateBarmaid(dt){
    if(!this.barmaid) return;
    const t = Date.now() * 0.001 + this.barmaid.phase;
    if(this.barmaid.headGroup){
      this.barmaid.headGroup.rotation.y = Math.sin(t * 0.7) * 0.15;
      this.barmaid.headGroup.rotation.z = Math.sin(t * 0.9) * 0.04;
      this.barmaid.headGroup.rotation.x = Math.sin(t * 1.1) * 0.03;
    }
    if(this.barmaid.group){
      this.barmaid.group.position.y = Math.sin(t * 1.8) * 0.005;
    }
    if(this.barmaid.hairBack){
      this.barmaid.hairBack.rotation.z = Math.sin(t * 1.2) * 0.03;
    }
    if(this.barmaid.forearmL){
      this.barmaid.forearmL.rotation.x = -1.3 + Math.sin(t * 0.8) * 0.08;
    }
    if(this.barmaid.armR){
      this.barmaid.armR.rotation.z = -.12 + Math.sin(t * 1.4) * 0.02;
    }
    if(this.barmaid.drink){
      this.barmaid.drink.rotation.z = Math.sin(t * 1.3) * 0.04;
    }
  }

  updateCowboy(dt){
    if(!this.cowboy) return;
    const t = Date.now() * 0.001 + this.cowboy.phase;
    if(this.cowboy.headGroup){
      this.cowboy.headGroup.rotation.y = Math.sin(t * 0.5) * 0.2;
      this.cowboy.headGroup.rotation.z = Math.sin(t * 0.7) * 0.05;
      this.cowboy.headGroup.rotation.x = Math.sin(t * 0.9) * 0.02;
    }
    if(this.cowboy.group){
      this.cowboy.group.position.y = Math.sin(t * 1.5) * 0.004;
    }
    if(this.cowboy.forearmL){
      const sip = Math.sin(t * 0.4);
      const sipAmount = sip > 0.85 ? (sip - 0.85) * 6.6 : 0;
      this.cowboy.forearmL.rotation.x = -1.2 - sipAmount * 0.5;
    }
    if(this.cowboy.drink){
      this.cowboy.drink.rotation.z = Math.sin(t * 0.6) * 0.05;
    }
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
      this.parts.barRobotArmR.rotation.x = -.3 + Math.sin(t*1.5)*.15;
      if(this.parts.barRobotForearmR) this.parts.barRobotForearmR.rotation.x = -.5 + Math.sin(t*2.4)*.2;
    }
    if(this.parts.barRobotArmL){
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

    const raycaster = new THREE.Raycaster(from, dir, 0, range);
    const dummyHit = raycaster.intersectObject(this.dummy.hitMesh, false);
    let hitDummy = false;
    let hitPoint = null;
    if(dummyHit.length > 0){
      hitDummy = true;
      hitPoint = dummyHit[0].point.clone();
    }

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

  tryReload(){ this._startReload(); }

  updateHubAmmoHUD(){
    const el = document.getElementById('hub-ammo');
    if(!el) return;
    const w = currentWeapon;
    if(!w){ el.textContent = '🔫 —'; return; }
    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);
    if(noAmmoClass) el.textContent = '🔫 ∞';
    else el.textContent = '🔫 ' + getAmmo() + '/' + w.magSize;
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

// ═══════════════ ОБРАБОТЧИКИ КНОПОК ═══════════════
// Кнопки action в менюшках работают ТОЛЬКО через клик мыши
(function registerMenuClickHandlers(){
  function bind(id, handler){
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      handler();
    });
  }
  bind('casino-spin-btn', ()=>{ if(hub && hubCasinoActive) hub.spinCasino(); });
  bind('dice-roll-btn', ()=>{ if(hub && hubDiceActive) hub.rollDice(); });
  bind('blood-donate-btn', ()=>{ if(hub && hubBloodActive) hub.donateBlood(); });

  // Кнопки закрытия — через querySelector внутри оверлеев
  const casinoClose = document.querySelector('#casino-overlay .mini-close');
  if(casinoClose){
    casinoClose.removeAttribute('onclick');
    casinoClose.addEventListener('click', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      if(hub) hub.closeCasino();
    });
  }
  const diceClose = document.querySelector('#dice-overlay .mini-close');
  if(diceClose){
    diceClose.removeAttribute('onclick');
    diceClose.addEventListener('click', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      if(hub) hub.closeDice();
    });
  }
  const bloodClose = document.querySelector('#blood-overlay .mini-close');
  if(bloodClose){
    bloodClose.removeAttribute('onclick');
    bloodClose.addEventListener('click', (e)=>{
      e.stopPropagation();
      e.preventDefault();
      if(hub) hub.closeBloodStation();
    });
  }
})();

document.addEventListener('keydown', e=>{
  if(!hubMode) return;
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

console.log('🏨 hub.js загружен (v6.6 — limbs hierarchy, clean hair, clickable menu buttons)');
