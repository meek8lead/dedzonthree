'use strict';
// INDUSTRIAL ROGUE SHOOTER v5.0 — ENGINE (with Nest synergy system)

// ═══ AUDIO ═══
class AudioManager {
  constructor(){
    this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = .35;
    this.master.connect(this.ctx.destination);
    this.reverb = this.ctx.createDelay();
    this.reverb.delayTime.value = .08;
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = .12;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
    this.reverbGain.connect(this.reverb);
    this.lastPlay = 0;
  }
  _tone(fs,fe,tp,dur,vol,at=0.005){
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.connect(g);g.connect(this.master);g.connect(this.reverb);
    o.type=tp;const t=this.ctx.currentTime;
    o.frequency.setValueAtTime(fs,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,fe),t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+at);
    g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.start(t);o.stop(t+dur+.02);
  }
  _noise(dur,vol,hp=0,lp=20000){
    const n=this.ctx.sampleRate*dur,b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.5);
    const s=this.ctx.createBufferSource();s.buffer=b;
    let out=s;
    if(hp>0){const f=this.ctx.createBiquadFilter();f.type='highpass';f.frequency.value=hp;out.connect(f);out=f}
    if(lp<20000){const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;out.connect(f);out=f}
    const g=this.ctx.createGain();out.connect(g);g.connect(this.master);g.connect(this.reverb);
    g.gain.setValueAtTime(vol,this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+dur);
    s.start();
  }
  play(type){
    const now=performance.now();if(now-this.lastPlay<25)return;this.lastPlay=now;
    const m={
      pistol:()=>{this._tone(880,180,'sawtooth',.12,.35);this._noise(.08,.25,800)},
      revolver:()=>{this._tone(600,90,'sawtooth',.25,.5);this._noise(.15,.4,400)},
      smg:()=>{this._tone(950,200,'sawtooth',.08,.3);this._noise(.05,.2,1200)},
      rifle:()=>{this._tone(700,150,'sawtooth',.15,.4);this._noise(.1,.3,600)},
      burst:()=>{this._tone(750,200,'sawtooth',.12,.35);this._noise(.08,.25,900)},
      shotgun:()=>{this._tone(400,60,'sawtooth',.3,.6);this._noise(.25,.5,200);this._noise(.15,.3,0,400)},
      sniper:()=>{this._tone(1200,120,'sawtooth',.35,.55);this._noise(.2,.4,300)},
      railgun:()=>{this._tone(2000,80,'sawtooth',.5,.5);this._tone(400,60,'sine',.5,.3);this._noise(.3,.3,600)},
      minigun:()=>{this._tone(700,150,'sawtooth',.06,.3);this._noise(.04,.2,900)},
      acid:()=>{this._tone(650,90,'square',.18,.35);this._noise(.15,.3,300,1500)},
      flamethrower:()=>{this._tone(200,80,'sawtooth',.08,.25);this._noise(.1,.35,0,800)},
      icegun:()=>{this._tone(1400,400,'sine',.2,.35);this._tone(700,200,'triangle',.2,.2)},
      grenade:()=>{this._tone(350,60,'sawtooth',.3,.45);this._noise(.2,.35,200)},
      bfg:()=>{this._tone(150,40,'sawtooth',.6,.55);this._tone(300,60,'sine',.6,.3);this._noise(.4,.4,100)},
      plasma:()=>{this._tone(650,180,'sine',.15,.35);this._tone(1300,300,'triangle',.15,.2)},
      saw:()=>{this._tone(300,140,'sawtooth',.18,.35);this._noise(.1,.25,1500)},
      tesla:()=>{this._tone(1000,300,'sawtooth',.15,.4);this._tone(2000,700,'square',.1,.2);this._noise(.1,.3,2000)},
      whip:()=>{this._tone(250,90,'triangle',.2,.3);this._noise(.1,.2,800)},
      melee:()=>{this._tone(180,50,'sawtooth',.25,.5);this._noise(.2,.4,100)},
      laser:()=>{this._tone(1500,500,'sawtooth',.06,.25);this._tone(2500,800,'sine',.06,.15)},
      hammer:()=>{this._tone(100,30,'sawtooth',.5,.6);this._tone(200,40,'sine',.5,.3);this._noise(.4,.4,80)},
      singularity:()=>{this._tone(80,30,'sine',.4,.5);this._tone(160,60,'sawtooth',.4,.2);this._noise(.3,.2,100)},
      acidotronator:()=>{this._tone(450,120,'square',.1,.3);this._tone(800,200,'triangle',.1,.2);this._noise(.08,.15,400,1000)},
      sun:()=>{this._tone(1200,400,'sine',.3,.4);this._tone(2400,800,'sine',.3,.2)},
      turret:()=>{this._tone(1200,800,'sine',.08,.25)},
      crossbow:()=>{this._tone(900,300,'triangle',.15,.35);this._noise(.1,.2,1000)},
      slingshot:()=>{this._tone(500,150,'triangle',.15,.3);this._noise(.08,.2,600)},
      hourglass:()=>{this._tone(300,900,'sine',.3,.35);this._tone(600,1800,'sine',.3,.15)},
      spider:()=>{this._tone(1000,600,'sawtooth',.1,.3)},
      chariot:()=>{this._tone(200,80,'sawtooth',.3,.4);this._noise(.2,.3,200)},
      ninja:()=>{this._tone(1300,700,'sine',.1,.3);this._noise(.08,.2,2000)},
      fortifier:()=>{this._tone(400,200,'sine',.2,.3);this._tone(800,400,'sine',.2,.2)},
      orb:()=>{this._tone(900,400,'sine',.15,.3);this._tone(1800,800,'sine',.15,.15)},
      worm:()=>{this._tone(120,50,'sawtooth',.3,.35);this._noise(.2,.25,50,300)},
      mortar:()=>{this._tone(220,60,'sawtooth',.4,.5);this._noise(.3,.4,80)},
      wallbreaker:()=>{this._tone(250,100,'sawtooth',.15,.4);this._noise(.12,.3,200,800)},
      beam:()=>{this._tone(800,200,'sawtooth',.2,.4);this._tone(1600,400,'square',.2,.2)},
      fartgun:()=>{this._tone(300,120,'sawtooth',.25,.35);this._noise(.15,.3,200,800);this._tone(180,90,'square',.2,.25)},
      lohostvol:()=>{this._tone(450,70,'sawtooth',.3,.55);this._noise(.2,.4,200,600)}
    };
    if(m[type])m[type]();else this._tone(800,100,'sawtooth',.15,.3);
  }
  hit(){this._tone(300,80,'square',.08,.25);this._noise(.05,.15,1000)}
  headshot(){this._tone(1200,300,'sawtooth',.15,.45);this._tone(1800,600,'sine',.12,.3);this._tone(2400,900,'sine',.1,.15)}
  death(){this._tone(500,40,'sawtooth',.4,.4);this._noise(.35,.3,100)}
  reload(){this._tone(200,400,'triangle',.12,.25);setTimeout(()=>this._tone(300,500,'triangle',.1,.2),150);this._noise(.08,.15,500)}
  pickup(){this._tone(600,900,'sine',.1,.4);setTimeout(()=>this._tone(900,1200,'sine',.1,.35),80);setTimeout(()=>this._tone(1200,1600,'sine',.15,.3),160)}
  armorPickup(){this._tone(2400,1800,'triangle',.15,.35);this._tone(3600,2700,'sine',.12,.25);this._noise(.08,.15,3000)}
  explosion(){const now=performance.now();if(this._lastExp&&now-this._lastExp<80)return;this._lastExp=now;this._noise(.6,.55,0,300);this._tone(120,30,'sawtooth',.6,.4)}
  jump(){this._tone(200,400,'sine',.1,.15)}
  land(){this._noise(.15,.2,0,400)}
  dash(){this._tone(100,50,'sawtooth',.2,.3);this._noise(.15,.2,400)}
  swap(){this._tone(500,700,'square',.08,.2)}
  enemyShoot(){this._tone(400,150,'square',.1,.2)}
  wallHit(){this._tone(800,200,'triangle',.08,.15)}
  freeze(){this._tone(1500,400,'sine',.3,.3);this._tone(3000,800,'sine',.3,.2)}
  freezeBurst(){this._tone(2000,600,'sine',.25,.4);this._tone(1000,300,'sine',.3,.25)}
  debug(){this._tone(600,900,'sine',.1,.2)}
  teslaZap(){this._tone(2000+Math.random()*1000,500,'sawtooth',.08,.15)}
  turretDeploy(){this._tone(300,600,'sine',.15,.25)}
  turretShoot(){this._tone(1200,800,'sine',.06,.12)}
  meteorImpact(){this._noise(.4,.5,0,200);this._tone(100,30,'sine',.4,.3)}
  sniperShot(){this._tone(1200,200,'sawtooth',.2,.4);this._noise(.15,.3,300)}
  wormSplit(){this._tone(180,400,'sawtooth',.25,.4);this._tone(90,200,'sine',.25,.3);this._noise(.2,.3,100,800)}
  mortarLaunch(){this._tone(220,60,'sawtooth',.3,.45);this._noise(.25,.4,100,500)}
  mortarLand(){this._noise(.4,.5,0,300);this._tone(150,40,'sawtooth',.35,.4)}
  beamFire(){this._tone(700,1400,'sawtooth',.15,.4);this._tone(1400,700,'square',.15,.25)}
  hourglassFlip(){this._tone(400,1200,'triangle',.2,.4);this._tone(800,2000,'sine',.15,.2)}
  illusion(){this._tone(600,1400,'sine',.3,.35);this._tone(1200,2800,'sine',.3,.2)}
  overheat(){this._tone(400,100,'sawtooth',.5,.6);this._noise(.4,.4,200)}
  tricksterTrap(){
    this._tone(600,1800,'sine',.15,.35);
    this._tone(300,900,'triangle',.15,.25);
    this._noise(.1,.2,400,2000);
    setTimeout(()=>this._tone(1400,300,'sawtooth',.1,.25),80);
  }
  // NEW: Nest sounds
  slotDing(){this._tone(1800,2400,'sine',.12,.5);this._tone(2800,3600,'triangle',.08,.22)}
  slotSpin(){this._tone(400,600,'square',.05,.1)}
  synergyUp(){
    this._tone(800,1200,'sine',.3,.4);
    setTimeout(()=>this._tone(1200,1600,'sine',.3,.35),120);
    setTimeout(()=>this._tone(1600,2200,'sine',.4,.3),240);
  }
  duoUp(){
    this._tone(600,900,'triangle',.15,.4);
    this._tone(1200,1800,'sine',.2,.4);
    setTimeout(()=>this._tone(900,1200,'sawtooth',.15,.3),150);
    setTimeout(()=>this._tone(1800,2400,'sine',.3,.35),300);
  }
  cardPick(){this._tone(1200,1600,'triangle',.1,.3);setTimeout(()=>this._tone(1600,2000,'sine',.15,.25),80)}
  doomWarning(){this._tone(200,150,'sawtooth',.4,.6);this._noise(.4,.4,80,400);this._tone(300,180,'square',.3,.4)}
  reroll(){this._tone(600,900,'triangle',.15,.35);this._noise(.1,.2,500)}
}
const audio = new AudioManager();

// ═══ GLITCH / TRICKSTER (unchanged) ═══
let lastGlitchTime = 0;
function damageGlitch(intensity){
  const now = performance.now();
  if(now - lastGlitchTime < 80) return;
  lastGlitchTime = now;
  const el = document.getElementById('glitch-overlay');
  if(!el) return;
  el.classList.add('active');
  const colors = ['#ff0000','#00ffff','#ff00ff','#ffffff','#ffff00'];
  for(let i=0;i<Math.floor(3+intensity*5);i++){
    const block = document.createElement('div');
    block.className = 'glitch-block';
    block.style.left = Math.random()*100+'%';
    block.style.top = Math.random()*100+'%';
    block.style.width = (Math.random()*300+50)+'px';
    block.style.height = (Math.random()*8+2)+'px';
    block.style.background = colors[Math.floor(Math.random()*colors.length)];
    block.style.opacity = (.3+Math.random()*.4).toString();
    document.body.appendChild(block);
    setTimeout(()=>block.remove(), 150+Math.random()*250);
  }
  const filters = [
    `hue-rotate(${Math.random()*60-30}deg) contrast(1.3) saturate(1.5)`,
    `hue-rotate(${-Math.random()*40}deg) contrast(1.5)`,
    `contrast(1.4) brightness(1.2)`
  ];
  document.body.style.filter = filters[Math.floor(Math.random()*filters.length)];
  setTimeout(()=>{el.classList.remove('active');document.body.style.filter=''}, 200);
  audio.hit();
}
let tricksterOverlayTimer = 0;
function triggerTricksterTrap(){
  if(tricksterOverlayTimer>0) return;
  tricksterOverlayTimer = 2 + Math.random()*3;
  const overlay = document.getElementById('trickster-overlay');
  const msgEl = document.getElementById('trick-msg');
  if(!overlay || !msgEl) return;
  overlay.classList.add('active');
  const changeMsg = ()=>{
    if(tricksterOverlayTimer<=0) return;
    msgEl.textContent = TRICK_MSGS[Math.floor(Math.random()*TRICK_MSGS.length)];
    msgEl.style.color = `hsl(${Math.random()*360},100%,60%)`;
    msgEl.style.fontSize = (36+Math.random()*48)+'px';
    setTimeout(changeMsg, 300);
  };
  changeMsg();
  audio.tricksterTrap();
}

// ═══ THREE.JS SETUP ═══
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0510);
scene.fog = new THREE.Fog(0x0a0510, 18, 85);
const camera = new THREE.PerspectiveCamera(78, window.innerWidth/window.innerHeight, .1, 1000);
camera.position.set(0,1.6,0);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x404060, .5));
const dl = new THREE.DirectionalLight(0xffffff, .7);
dl.position.set(10,20,10);
dl.castShadow = true;
dl.shadow.mapSize.set(1024,1024);
scene.add(dl);
[0xff0066, 0x00ff66, 0x6600ff, 0xff6600].forEach((c,i)=>{
  const l = new THREE.PointLight(c, 1.5, 25);
  const a = i/4*Math.PI*2;
  l.position.set(Math.cos(a)*15, 3, Math.sin(a)*15);
  scene.add(l);
});
const legGroup = new THREE.Group();
const legMesh = new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.1), new THREE.MeshStandardMaterial({color:0x555555,metalness:.6,roughness:.4}));
legMesh.position.set(-.35,-.55,-.35);
legGroup.add(legMesh);
const bootMesh = new THREE.Mesh(new THREE.BoxGeometry(.13,.1,.18), new THREE.MeshStandardMaterial({color:0x222222,metalness:.4,roughness:.7}));
bootMesh.position.set(-.35,-.78,-.38);
legGroup.add(bootMesh);
const soleMesh = new THREE.Mesh(new THREE.BoxGeometry(.14,.03,.2), new THREE.MeshStandardMaterial({color:0xcc3333,emissive:0x441111,emissiveIntensity:.3}));
soleMesh.position.set(-.35,-.84,-.38);
legGroup.add(soleMesh);
camera.add(legGroup);
scene.add(camera);

// ═══ DOM CACHE ═══
const DOM = {};
[
  'weapon-name','weapon-type','weapon-damage','weapon-rate','weapon-range',
  'health-bar','health-text','armor-bar','armor-text','ammo-text','reload-status',
  'wave-num','enemies-left','enemies-killed','modifiers-list','health-panel','ammo-panel',
  'crosshair','reload-overlay','dash-fill','slow-indicator',
  'hg-bar-fill','hg-hud','time-freeze-overlay','hg-mode-label',
  'final-wave','final-kills','final-damage-report','game-over',
  'charge-indicator','charge-fill','overheat-indicator','overheat-fill',
  'synergy-hud','synergy-banner','duo-banner',
  'nest-screen','nest-cards','nest-hint','nest-synergy-status',
  'reroll-btn','skip-btn',
  'doom-dialog','curse-indicator'
].forEach(id=>{
  DOM[id.replace(/-([a-z])/g,(m,c)=>c.toUpperCase())] = document.getElementById(id);
});

// ═══ STATE ═══
let recoilPitchAccum = 0, recoilRollAccum = 0;
let isAiming = false;
const player = {
  health:100, maxHealth:100,
  armor:0, maxArmor:100,
  speed:.1,
  position:new THREE.Vector3(0,1.6,0),
  velocity:new THREE.Vector3(0,0,0),
  yaw:0, pitch:0,
  radius:.5,
  isMoving:false, bobPhase:0, isGrounded:true,
  slowTimer:0, freezeTimer:0,
  knockback:new THREE.Vector3()
};

// ═══ SYNERGY SYSTEM STATE ═══
const synergies = {};
SYNERGY_TAGS.forEach(t => { synergies[t] = {count:0, level:0} });
let activeDuos = [];
let curseCounter = 0;
let pendingMemWeapon = false;
let bonusRerolls = 0;
let perditionLevel = 0;
let perditionActive = false;

// ═══ PLAYER BUFFS (от апгрейдов) ═══
const playerBuffs = {
  damageMult: 1.0,
  critChance: 0.0,
  critMult: 3.0,
  speedMult: 1.0,
  reloadMult: 1.0,
  aoeMult: 1.0,
  burnDur: 1.0,
  freezeDur: 1.0,
  poisonDur: 1.0,
  poisonStacks: 1,
  regenRate: 0.0,
  explosionRadius: 1.0,
  maxTurrets: 1,
  maxDashes: 1,
  hgMaxCharge: 1.0,
  dashDist: 1.0,
  medkitHeal: 1.0,
  slowPower: 1.0,
  fireDamageMult: 1.0,
  iceDamageMult: 1.0,
  contactBurn: false,
  disableRegen: false,
  enemySpeedMult: 1.0,
  allShotsSlow: 0,
  killMinions: 0,
  everyNthAoe: 0,
  aoePull: false,
  deathBomb: 0,
  nextWaveSlow: 0,
};

const colliders = [], debris = [], platforms = [], acidPuddles = [], aoeSpheres = [], poisonPuddles = [];
const lightningBolts = [], meteors = [], sandParticles = [], tricksterTraps = [], medkits = [], armorPickups = [], slowTraps = [];
const enemies = [], projectiles = [], particles = [];

let chargingState = {active:false, start:0, charge:0};
let burstFiring = false, burstCount = 0, burstTimer = 0;
let weaponHeat = 0, isOverheated = false;
let activeFortifiers = [];
let damageFrom = {};
let activeTurret = null, turretCooldown = 0;
let hgState = 'idle', hgCharge = HG_MAX_CHARGE, hgFrozen = false;
let hgFlipAnim = 0, hgTargetRotation = 0, hgTimer = 0;
let hitstopTime = 0;
let currentMapStyle = mapStyles[0];
let ownedWeapons = [{def:weapons[0], ammo:weapons[0].magSize}];
let curIdx = 0, currentWeapon = weapons[0], debugWeaponIdx = 0;
let isReloading = false, reloadTimer = 0, reloadPhase = 0, lastShotTime = 0;
let isGameOver = false;
let debugMode = false;
let debugToastTimer = null;
let modifiers = [];
let wave = 1, enemiesKilled = 0, waveTotalEnemies = 0;
let isNestActive = false, nestUsedThisWave = false, isSpinning = false, waveSpawning = false;
let currentDraft = []; // 3-4 cards
let rerollsUsedThisWave = 0;
let isDoomPending = false;
let isDoomActive = false;
let isGoldenDraft = false;
let keys = {};
let mouseDown = false, isPointerLocked = false;
let wasMouseDown = false;
let dashTime = 0, dashCooldown = 0;
let dashDirVector = new THREE.Vector3();
let shakeIntensity = 0, shakeTime = 0;
let lastTime = performance.now(), regenTimer = 0;
let weaponView;

// ═══ HELPERS ═══
function getAmmo(){ return ownedWeapons[curIdx].ammo }
function setAmmo(v){ ownedWeapons[curIdx].ammo = v }
function resetChargingState(){
  chargingState.active = false;
  chargingState.charge = 0;
  if(DOM.chargeIndicator) DOM.chargeIndicator.style.display = 'none';
  if(DOM.chargeFill) DOM.chargeFill.style.width = '0%';
  if(DOM.crosshair) DOM.crosshair.classList.remove('charged');
}
function toggleDebug(){
  debugMode = !debugMode;
  const el = document.getElementById('debug-indicator');
  if(el) el.style.display = debugMode ? 'block' : 'none';
  showDebugToast(debugMode ? 'DEBUG MODE ВКЛ' : 'DEBUG MODE ВЫКЛ');
  audio.debug();
}
function showDebugToast(msg){
  const el = document.getElementById('debug-toast');
  if(!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  if(debugToastTimer) clearTimeout(debugToastTimer);
  debugToastTimer = setTimeout(()=>{
    el.style.opacity = '0';
    setTimeout(()=>{el.style.display='none'}, 300);
  }, 2000);
}

// ═══ SYNERGY SYSTEM ═══
function computeSynergyLevel(count){
  if(count >= SYNERGY_THRESHOLDS[2]) return 3;
  if(count >= SYNERGY_THRESHOLDS[1]) return 2;
  if(count >= SYNERGY_THRESHOLDS[0]) return 1;
  return 0;
}
function addTag(tagId){
  if(!tagId || !synergies[tagId]) return;
  synergies[tagId].count++;
  const newLvl = computeSynergyLevel(synergies[tagId].count);
  if(newLvl > synergies[tagId].level){
    synergies[tagId].level = newLvl;
    triggerSynergyUp(tagId, newLvl);
  }
  renderSynergyHUD();
  checkDuos();
}
function addTags(tagList){
  if(!Array.isArray(tagList)) return;
  tagList.forEach(t => addTag(t));
}
function hasSynergy(tag, level=1){
  return synergies[tag] && synergies[tag].level >= level;
}
function triggerSynergyUp(tag, level){
  const bonus = SYNERGY_BONUSES[tag][level-1];
  const meta = SYNERGY_META[tag];
  showSynergyBanner(meta.icon + ' ' + bonus.name + ' — ' + bonus.desc);
  audio.synergyUp();
  spawnPlayerAura(meta.color);
  // Tank R1/R2 — постоянные бонусы
  if(tag === 'tank'){
    if(level === 1){
      player.maxHealth += 25;
      player.health += 25;
      updateUI();
    } else if(level === 2){
      playerBuffs.regenRate += 1.5;
    }
  }
}
function showSynergyBanner(text){
  const el = DOM.synergyBanner;
  if(!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2500);
}
function showDuoBanner(duo){
  const el = DOM.duoBanner;
  if(!el) return;
  el.textContent = '⚡ DUO: ' + duo.name + ' — ' + duo.desc;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 3000);
}
function checkDuos(){
  DUO_SYNERGIES.forEach(d => {
    if(activeDuos.includes(d.id)) return;
    if(d.tags.every(t => hasSynergy(t, 1))){
      activeDuos.push(d.id);
      showDuoBanner(d);
      audio.duoUp();
      spawnPlayerAura(d.color);
    }
  });
}
function renderSynergyHUD(){
  const el = DOM.synergyHud;
  if(!el) return;
  let html = '';
  SYNERGY_TAGS.forEach(tag => {
    const s = synergies[tag];
    const meta = SYNERGY_META[tag];
    const lvl = s.level;
    const classStr = lvl === 0 ? '' : ('r'+lvl);
    const activeCls = s.count > 0 ? 'active' : '';
    html += `<div class="syn-item ${classStr} ${activeCls}" title="${meta.name}">
      <span class="syn-icon">${meta.icon}</span>
      <span class="syn-count">${Math.min(9,s.count)}/3</span>
    </div>`;
  });
  el.innerHTML = html;
}
function spawnPlayerAura(color){
  const geo = new THREE.SphereGeometry(2, 16, 16);
  const mat = new THREE.MeshBasicMaterial({color:color||0xffffff, transparent:true, opacity:.35, side:THREE.DoubleSide, depthWrite:false});
  const aura = new THREE.Mesh(geo, mat);
  aura.position.copy(player.position);
  aura.position.y = 1;
  scene.add(aura);
  aoeSpheres.push({mesh:aura, life:.8, maxLife:.8});
}
function updateCurseIndicator(){
  const el = DOM.curseIndicator;
  if(!el) return;
  if(curseCounter === 0){
    el.classList.remove('show','critical');
    return;
  }
  el.classList.add('show');
  const mod3 = curseCounter % 3;
  el.textContent = `💀 КУРС: ${curseCounter} (${mod3}/3 до мем-оружия)`;
  if(mod3 === 2) el.classList.add('critical');
  else el.classList.remove('critical');
}

// ═══ APPLY CARDS ═══
function applyCardEffect(card){
  if(!card) return;
  // 1. Применить теги
  if(card.tags && card.tags.length > 0){
    card.tags.forEach(t => {
      if(t === 'random'){
        const rndTag = SYNERGY_TAGS[Math.floor(Math.random()*SYNERGY_TAGS.length)];
        addTag(rndTag);
      } else if(synergies[t]){
        addTag(t);
      }
    });
  }
  // 2. Применить эффект по типу
  if(card.cardType === 'weapon' && card.weapon){
    applyWeaponCard(card.weapon);
  } else if(card.cardType === 'modifier' && card.modifier){
    applyModifierCard(card.modifier);
  } else if(card.cardType === 'upgrade' && card.upgrade){
    applyUpgradeCard(card.upgrade);
  } else if(card.cardType === 'curse' && card.curse){
    applyCurseCard(card.curse);
  } else if(card.cardType === 'utility' && card.utility){
    applyUtilityCard(card.utility);
  }
  // 3. Handle random tag for curse
  if(card.curse && card.curse.id === 'c_curse'){
    addTag(SYNERGY_TAGS[Math.floor(Math.random()*SYNERGY_TAGS.length)]);
    addTag(SYNERGY_TAGS[Math.floor(Math.random()*SYNERGY_TAGS.length)]);
  }
  updateUI();
}
function applyWeaponCard(weaponDef){
  acquireWeapon(weaponDef);
}
function applyModifierCard(mod){
  if(modifiers.includes(mod.id)) return;
  modifiers.push(mod.id);
  if(mod.id === 'glass_cannon'){
    player.maxHealth = Math.max(20, Math.floor(player.maxHealth*.5));
    player.health = Math.min(player.health, player.maxHealth);
  }
  // Apply permanent effects
  if(mod.id === 'regen') playerBuffs.regenRate += 1;
  if(mod.id === 'more_ammo') {}
}
function applyUpgradeCard(upgrade){
  if(!upgrade) return;
  if(upgrade.effect === 'player'){
    const key = upgrade.key;
    if(upgrade.op === 'add') player[key] = (player[key]||0) + upgrade.value;
    else if(upgrade.op === 'mul') player[key] = (player[key]||0) * upgrade.value;
  } else if(upgrade.effect === 'playerBuff'){
    const key = upgrade.key;
    if(upgrade.op === 'add') playerBuffs[key] = (playerBuffs[key]||0) + upgrade.value;
    else if(upgrade.op === 'mul') playerBuffs[key] = (playerBuffs[key]||1) * upgrade.value;
  }
  // Clamp HP
  if(player.health > player.maxHealth) player.health = player.maxHealth;
}
function applyCurseCard(curse){
  if(!curse) return;
  curseCounter++;
  pendingMemWeapon = (curseCounter % 3 === 0);
  const app = curse.apply || {};
  if(app.player){
    Object.keys(app.player).forEach(k => {
      const v = app.player[k];
      if(typeof v === 'string'){
        if(v.startsWith('*')){
          const m = parseFloat(v.slice(1));
          if(k === 'maxHealth') player.maxHealth = Math.max(20, Math.floor(player.maxHealth * m));
        } else if(v.startsWith('+')){
          const a = parseFloat(v.slice(1));
          player[k] = (player[k]||0) + a;
        } else if(v.startsWith('-')){
          const a = parseFloat(v.slice(1));
          player[k] = Math.max(0, (player[k]||0) - a);
        }
      } else {
        player[k] = v;
      }
    });
  }
  if(app.buffs){
    Object.keys(app.buffs).forEach(k => {
      playerBuffs[k] = app.buffs[k];
    });
  }
  if(app.permanentDrain) playerBuffs.permanentDrain = app.permanentDrain;
  if(app.selfDamageOnDash) playerBuffs.selfDamageOnDash = app.selfDamageOnDash;
  if(app.selfDamageOnShot) playerBuffs.selfDamageOnShot = app.selfDamageOnShot;
  if(app.disableRegen) playerBuffs.disableRegen = true;
  if(app.randomDoubleTag) {}
  // Clamp
  player.maxHealth = Math.max(20, player.maxHealth);
  if(player.health > player.maxHealth) player.health = player.maxHealth;
  updateCurseIndicator();
}
function applyUtilityCard(util){
  if(!util) return;
  const app = util.apply || {};
  if(app.player){
    Object.keys(app.player).forEach(k => {
      const v = app.player[k];
      if(typeof v === 'string' && v.startsWith('+')){
        const a = parseFloat(v.slice(1));
        player[k] = (player[k]||0) + a;
        if(k === 'health') player.health = Math.min(player.maxHealth, player.health);
      }
    });
  }
  if(app.fullAmmo) setAmmo(currentWeapon.magSize);
  if(app.bonusReroll) bonusRerolls += app.bonusReroll;
  if(app.buff && app.buff.deathBomb) playerBuffs.deathBomb = app.buff.deathBomb;
  if(app.buff && app.buff.nextWaveSlow) playerBuffs.nextWaveSlow = app.buff.nextWaveSlow;
}

// ═══ COLLISIONS (unchanged) ═══
function hasLineOfSight(from, to){
  if(modifiers.includes('ghost_bullets')) return true;
  const dir = new THREE.Vector3().subVectors(to, from);
  const dist = dir.length();
  if(dist < 0.1) return true;
  dir.normalize();
  const steps = Math.ceil(dist/.3);
  for(let i=1;i<steps;i++){
    const t = i/steps;
    const cp = from.clone().add(dir.clone().multiplyScalar(dist*t));
    for(let c of colliders){
      if(Math.abs(cp.x-c.position.x)<c.size.x/2+.1 &&
         Math.abs(cp.y-c.position.y)<c.size.y/2+.1 &&
         Math.abs(cp.z-c.position.z)<c.size.z/2+.1) return false;
    }
  }
  return true;
}
function pointInCollider(p){
  for(let c of colliders){
    if(Math.abs(p.x-c.position.x)<c.size.x/2+.1 &&
       Math.abs(p.y-c.position.y)<c.size.y/2+.1 &&
       Math.abs(p.z-c.position.z)<c.size.z/2+.1) return true;
  }
  return false;
}
function checkPositionBlocked(x,z,r){
  for(let c of colliders){
    if(Math.abs(x-c.position.x)<c.size.x/2+r && Math.abs(z-c.position.z)<c.size.z/2+r) return true;
  }
  return false;
}
function checkCollision(p,r){
  for(let c of colliders){
    if(Math.abs(p.x-c.position.x)<c.size.x/2+r && Math.abs(p.z-c.position.z)<c.size.z/2+r) return true;
  }
  return false;
}
function checkPlatform(p){
  for(let pl of platforms){
    if(Math.abs(p.x-pl.position.x)<pl.size.x/2+p.radius &&
       Math.abs(p.z-pl.position.z)<pl.size.z/2+p.radius &&
       p.position.y>=pl.top && p.position.y<pl.top+.5) return pl.top;
  }
  return null;
}

// ═══ WORLD EFFECTS ═══
function createAcidPuddle(pos){
  for(const p of acidPuddles){
    const dx = p.mesh.position.x - pos.x, dz = p.mesh.position.z - pos.z;
    if(Math.sqrt(dx*dx+dz*dz) < 2) return;
  }
  while(acidPuddles.length >= 4){
    const old = acidPuddles.shift();
    scene.remove(old.mesh);
  }
  const radius = 2.2;
  const puddle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius,radius,.05,20),
    new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00aa00,emissiveIntensity:.6,transparent:true,opacity:.7})
  );
  puddle.position.set(pos.x,.03,pos.z);
  scene.add(puddle);
  acidPuddles.push({mesh:puddle, life:3.5, maxLife:3.5, radius});
}
function createPoisonPuddle(pos){
  const r = 1.2;
  const puddle = new THREE.Mesh(
    new THREE.CylinderGeometry(r,r,.05,16),
    new THREE.MeshStandardMaterial({color:0x8800ff,emissive:0x6600aa,emissiveIntensity:.6,transparent:true,opacity:.7})
  );
  puddle.position.set(pos.x,.03,pos.z);
  scene.add(puddle);
  poisonPuddles.push({mesh:puddle, life:3+Math.random()*5, maxLife:8, radius:r, dps:8});
}
function createAOESphere(pos, radius, color){
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius,20,20),
    new THREE.MeshBasicMaterial({color:color||0xff8800, transparent:true, opacity:.22, side:THREE.DoubleSide, depthWrite:false})
  );
  sphere.position.copy(pos);
  scene.add(sphere);
  aoeSpheres.push({mesh:sphere, life:.4, maxLife:.4});
}
function createLightningBolt(from, to){
  const points = [];
  const segments = 8;
  for(let i=0;i<=segments;i++){
    const t = i/segments;
    points.push(new THREE.Vector3(
      from.x+(to.x-from.x)*t+(Math.random()-.5)*.4,
      from.y+(to.y-from.y)*t+(Math.random()-.5)*.3,
      from.z+(to.z-from.z)*t+(Math.random()-.5)*.4
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve,12,.03,6,false);
  const mat = new THREE.MeshBasicMaterial({color:0xaaccff, transparent:true, opacity:.9});
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  lightningBolts.push({mesh, life:.15, maxLife:.15});
  audio.teslaZap();
}
function grenadeExplode(p){
  audio.explosion();
  createExplosion(p.position);
  const er = p.userData.aoe || 4;
  createAOESphere(p.position, er);
  enemies.slice().forEach(e=>{
    if(!e.dead && e.group.position.distanceTo(p.position) < er)
      e.takeDamage(p.userData.damage, e.group.position, p.userData.damageType);
  });
  const pd = player.position.distanceTo(p.position);
  if(pd < er) damagePlayer(p.userData.damage*(1-pd/er), null, 1);
}
function embedSaw(enemy, worldPos){
  const sawGroup = new THREE.Group();
  const spinner = new THREE.Group();
  const discM = new THREE.MeshStandardMaterial({color:0x999999, metalness:.95, roughness:.15});
  const teethM = new THREE.MeshStandardMaterial({color:0xbbbbbb, metalness:.95});
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.03,16), discM);
  spinner.add(disc);
  for(let k=0;k<10;k++){
    const a = k/10*Math.PI*2;
    const t = new THREE.Mesh(new THREE.BoxGeometry(.05,.03,.05), teethM);
    t.position.set(Math.cos(a)*.3, 0, Math.sin(a)*.3);
    t.rotation.y = -a;
    spinner.add(t);
  }
  sawGroup.add(spinner);
  const localPos = enemy.group.worldToLocal(worldPos.clone());
  sawGroup.position.copy(localPos);
  enemy.group.add(sawGroup);
  enemy.sawEmbedded = {timer:3, dps:25, mesh:sawGroup, spinner};
}

// ═══ HIT DETECTION ═══
function segmentHitsEnemy(enemy, prevPos, currPos){
  const dx = currPos.x-prevPos.x, dy = currPos.y-prevPos.y, dz = currPos.z-prevPos.z;
  const moveDist = Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(moveDist < 0.15){
    const ht = enemy.checkHit(currPos);
    return ht ? {type:ht, pos:currPos.clone()} : null;
  }
  const steps = Math.min(24, Math.max(2, Math.ceil(moveDist/0.2)));
  const quickR2 = enemy.radius*enemy.radius*4;
  for(let s=0;s<=steps;s++){
    const t = s/steps;
    const tx = prevPos.x+dx*t, ty = prevPos.y+dy*t, tz = prevPos.z+dz*t;
    const qdx = tx-enemy.group.position.x, qdz = tz-enemy.group.position.z;
    if(qdx*qdx+qdz*qdz > quickR2) continue;
    const testPos = new THREE.Vector3(tx,ty,tz);
    const ht = enemy.checkHit(testPos);
    if(ht) return {type:ht, pos:testPos};
  }
  return null;
}
function segmentHitsPlayer(prevPos, currPos, playerPos, playerRadius){
  const dx = currPos.x-prevPos.x, dy = currPos.y-prevPos.y, dz = currPos.z-prevPos.z;
  const moveDist = Math.sqrt(dx*dx+dy*dy+dz*dz);
  const hitR = playerRadius + 0.15;
  if(moveDist < 0.1) return prevPos.distanceTo(playerPos)<hitR || currPos.distanceTo(playerPos)<hitR;
  const steps = Math.min(15, Math.max(2, Math.ceil(moveDist/0.25)));
  for(let s=0;s<=steps;s++){
    const t = s/steps;
    const tx = prevPos.x+dx*t, ty = prevPos.y+dy*t, tz = prevPos.z+dz*t;
    const pdx = tx-playerPos.x, pdy = ty-playerPos.y, pdz = tz-playerPos.z;
    if(pdx*pdx+pdy*pdy+pdz*pdz < hitR*hitR) return true;
  }
  return false;
}
function getFalloffDamage(baseDmg, p, hitPos){
  if(!p.userData.falloff) return baseDmg;
  const dist = hitPos.distanceTo(p.userData.startPos);
  const range = p.userData.weaponRange || 50;
  const startDist = range*0.3;
  const minMult = 0.4;
  if(dist <= startDist) return baseDmg;
  if(dist >= range) return baseDmg*minMult;
  const t = (dist-startDist)/(range-startDist);
  return baseDmg*(1-(1-minMult)*t);
}

// ═══ DAMAGE PLAYER (расширено с TANK R3) ═══
function damagePlayer(dmg, src, glitchIntensity, opts){
  opts = opts || {};
  // TIME TANK duo - reduced damage in slow-time
  if(hgState === 'slow' && activeDuos.includes('timetank')) dmg *= 0.6;
  let armorToTake = 0, hpToTake = dmg;
  const armorEff = hasSynergy('tank',3) ? 0.70 : 0.5;
  if(opts.armorMult !== undefined || opts.hpMult !== undefined){
    armorToTake = dmg*(opts.armorMult||0);
    hpToTake = dmg*(opts.hpMult !== undefined ? opts.hpMult : 1);
  } else if(player.armor > 0){
    armorToTake = Math.min(player.armor, dmg*armorEff);
    hpToTake = dmg-armorToTake;
  }
  if(player.armor > 0 && armorToTake > 0) player.armor -= Math.min(player.armor, armorToTake);
  player.health -= hpToTake;
  // TANK R3 reflect
  if(hasSynergy('tank',3) && hpToTake > 0){
    const reflectDmg = hpToTake * 0.25;
    enemies.slice().forEach(e=>{
      if(!e.dead && e.group.position.distanceTo(player.position) < 3){
        e.takeDamage(reflectDmg, e.group.position, 'reflect');
      }
    });
  }
  // TOXIC TANK duo - poison attackers
  if(activeDuos.includes('toxictank') && hpToTake > 0){
    enemies.slice().forEach(e=>{
      if(!e.dead && e.group.position.distanceTo(player.position) < 3){
        e.poisonTimer = Math.max(e.poisonTimer||0, 2);
      }
    });
  }
  if(opts.knockback) player.knockback.add(opts.knockback);
  if(opts.burn) player.slowTimer = Math.max(player.slowTimer, .5);
  if(src) damageFrom[src] = (damageFrom[src]||0) + hpToTake + Math.min(player.armor, armorToTake);
  if(glitchIntensity) damageGlitch(glitchIntensity);
  updateUI();
  if(player.health <= 0) gameOver();
}

function disposeGroup(group){
  group.traverse(o=>{
    if(o.geometry && o.geometry.dispose) o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material)) o.material.forEach(m=>{if(m&&m.dispose) m.dispose()});
      else if(o.material.dispose) o.material.dispose();
    }
  });
}
function disposeProjectile(p){
  if(!p) return;
  p.traverse && p.traverse(o=>{
    if(o.geometry && o.geometry.dispose) o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material)) o.material.forEach(m=>{if(m&&m.dispose) m.dispose()});
      else if(o.material.dispose) o.material.dispose();
    }
  });
  scene.remove(p);
}

// ═══ PICKUPS (unchanged) ═══
function spawnMedkit(pos){
  while(medkits.length >= 3){
    const old = medkits.shift();
    disposeGroup(old.mesh);
    scene.remove(old.mesh);
  }
  const group = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.2,emissive:0x330000,emissiveIntensity:.3});
  const box = new THREE.Mesh(new THREE.BoxGeometry(.8,.65,.5), boxMat);
  box.castShadow = true;
  group.add(box);
  const crossMat = new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xcc0000,emissiveIntensity:1.0,roughness:.3});
  const mk = (w,h,d,x,y,z)=>{const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),crossMat); m.position.set(x,y,z); group.add(m);};
  mk(.16,.5,.02,0,0,.26); mk(.5,.16,.02,0,0,.26);
  mk(.16,.5,.02,0,0,-.26); mk(.5,.16,.02,0,0,-.26);
  const metalMat = new THREE.MeshStandardMaterial({color:0x666666,metalness:.9,roughness:.3});
  for(let sx of [-1,1]) for(let sy of [-1,1]){
    const b = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.08),metalMat);
    b.position.set(sx*.36, sy*.29, .26);
    group.add(b);
  }
  const glowMat = new THREE.MeshBasicMaterial({color:0xff3333, transparent:true, opacity:.6, side:THREE.DoubleSide, depthWrite:false});
  const glow = new THREE.Mesh(new THREE.RingGeometry(.6,1.0,24), glowMat);
  glow.rotation.x = -Math.PI/2;
  glow.position.y = -0.55;
  group.add(glow);
  const light = new THREE.PointLight(0xff3333, 1.5, 5);
  group.add(light);
  group.rotation.y = Math.random()*Math.PI*2;
  group.position.set(pos.x, 1.0, pos.z);
  scene.add(group);
  medkits.push({mesh:group, glow, light, life:25, maxLife:25, healAmount:Math.floor(45*playerBuffs.medkitHeal), bobPhase:Math.random()*Math.PI*2});
}
function spawnArmorPickup(pos, amount){
  amount = amount || (5 + Math.floor(Math.random()*6));
  while(armorPickups.length >= 4){
    const old = armorPickups.shift();
    disposeGroup(old.mesh);
    scene.remove(old.mesh);
  }
  const group = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({color:0xffdd00,emissive:0xffaa00,emissiveIntensity:.8,metalness:.9,roughness:.2});
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.55,.65,.08), plateMat);
  plate.castShadow = true;
  group.add(plate);
  const rimMat = new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffff88,emissiveIntensity:.6,metalness:.9,roughness:.1});
  const rimGeo = new THREE.BoxGeometry(.6,.1,.1);
  const rimT = new THREE.Mesh(rimGeo, rimMat); rimT.position.y = .35; group.add(rimT);
  const rimB = new THREE.Mesh(rimGeo, rimMat); rimB.position.y = -.35; group.add(rimB);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(.45,.7,24),
    new THREE.MeshBasicMaterial({color:0xffdd00, transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false})
  );
  glow.rotation.x = -Math.PI/2;
  glow.position.y = -.5;
  group.add(glow);
  const light = new THREE.PointLight(0xffdd00, 1.2, 4);
  group.add(light);
  group.rotation.y = Math.random()*Math.PI*2;
  group.position.set(pos.x, 1.0, pos.z);
  scene.add(group);
  armorPickups.push({mesh:group, glow, light, life:25, maxLife:25, amount, bobPhase:Math.random()*Math.PI*2});
}
function spawnSlowTrap(pos){
  const radius = 2.8;
  const group = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({color:0x4488cc,emissive:0x2266cc,emissiveIntensity:.9,transparent:true,opacity:.7});
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.08,24), ringMat);
  ring.position.y = .04;
  group.add(ring);
  const innerMat = new THREE.MeshBasicMaterial({color:0x66aaff,transparent:true,opacity:.3,side:THREE.DoubleSide});
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(radius*.6,radius*.85,24), innerMat);
  innerRing.rotation.x = -Math.PI/2;
  innerRing.position.y = .1;
  group.add(innerRing);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.2,6),
    new THREE.MeshStandardMaterial({color:0x4488cc,metalness:.8,roughness:.3}));
  pole.position.y = .6;
  group.add(pole);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.15,10,10), new THREE.MeshBasicMaterial({color:0x88ddff}));
  beacon.position.y = 1.2;
  group.add(beacon);
  const light = new THREE.PointLight(0x4488cc, 1.0, 5);
  light.position.y = 1.0;
  group.add(light);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  slowTraps.push({group, ring, beacon, light, life:10, maxLife:10, radius});
}

// ═══ SHIELD / TURRET / EFFECTS (unchanged) ═══
function createShieldImpact(pos){
  const now = performance.now();
  if(!createShieldImpact._last || now-createShieldImpact._last > 50){
    createShieldImpact._last = now;
    for(let i=0;i<5;i++){
      const pt = new THREE.Mesh(
        new THREE.SphereGeometry(.05,4,4),
        new THREE.MeshBasicMaterial({color:0x66ddff, transparent:true, opacity:1})
      );
      pt.position.copy(pos);
      pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*.25,(Math.random()-.5)*.25,(Math.random()-.5)*.25);
      pt.userData.life = 15;
      scene.add(pt);
      particles.push(pt);
    }
  }
}
function isEnemyShielded(enemy){
  if(enemy.type === 'fortifier') return false;
  for(const f of activeFortifiers){
    if(f.dead) continue;
    if(f.group.position.distanceTo(enemy.group.position) < FORTIFIER_SHIELD_RADIUS) return true;
  }
  return false;
}

// ═══ FLOATING NUMBERS ═══
function spawnHealNumber(pos, amount, color){
  const vec = pos.clone().project(camera);
  if(vec.z<0||vec.z>1) return;
  const x = (vec.x*.5+.5)*window.innerWidth;
  const y = (-vec.y*.5+.5)*window.innerHeight;
  const el = document.createElement('div');
  el.className = 'dmg-num';
  el.textContent = '+'+Math.round(amount);
  el.style.left = x+'px';
  el.style.top = y+'px';
  el.style.color = color||'#0f0';
  el.style.fontSize = '26px';
  el.style.textShadow = `0 0 8px ${color||'#0f0'}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 750);
}
function spawnDamageNumber(pos, dmg, isHead){
  if(dmg < 1.5) return;
  const vec = pos.clone().project(camera);
  if(vec.z<0||vec.z>1) return;
  const x = (vec.x*.5+.5)*window.innerWidth;
  const y = (-vec.y*.5+.5)*window.innerHeight;
  const el = document.createElement('div');
  const color = isHead ? '#ffdd00' : '#ffffff';
  el.className = 'dmg-num';
  el.textContent = Math.round(dmg);
  el.style.left = x+'px';
  el.style.top = y+'px';
  el.style.color = color;
  el.style.fontSize = (isHead?26:18)+'px';
  el.style.textShadow = `0 0 6px ${color}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 750);
}

// ═══ TURRET ═══
class Turret {
  constructor(pos){
    this.group = new THREE.Group();
    this.hp = TURRET_HP;
    this.maxHp = TURRET_HP;
    this.fireTimer = 0;
    this.target = null;
    this.buildModel();
    this.group.position.copy(pos);
    this.group.position.y = 0;
    scene.add(this.group);
    audio.turretDeploy();
  }
  buildModel(){
    const baseMat = new THREE.MeshStandardMaterial({color:0x334455,metalness:.8,roughness:.3});
    const glowMat = new THREE.MeshStandardMaterial({color:0x00ccff,emissive:0x0088ff,emissiveIntensity:.6});
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.4,.5,.15,12), baseMat);
    base.position.y = .075;
    base.castShadow = true;
    this.group.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.6,8), baseMat);
    pole.position.y = .45;
    this.group.add(pole);
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = .8;
    this.group.add(this.headGroup);
    const headBody = new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.3), baseMat);
    this.headGroup.add(headBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.4,8), baseMat);
    barrel.rotation.x = Math.PI/2;
    barrel.position.set(0,.05,-.25);
    this.headGroup.add(barrel);
    this.muzzle = new THREE.Mesh(new THREE.SphereGeometry(.06,10,10), glowMat);
    this.muzzle.position.set(0,.05,-.45);
    this.headGroup.add(this.muzzle);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(.2,.015,6,16), glowMat);
    this.ring.rotation.x = Math.PI/2;
    this.ring.position.y = .1;
    this.headGroup.add(this.ring);
  }
  update(dt){
    this.headGroup.rotation.y += dt*.5;
    this.ring.rotation.z += dt*2;
    let nearest = null, nearDist = TURRET_RANGE;
    enemies.forEach(e=>{
      if(e.dead) return;
      const d = e.group.position.distanceTo(this.group.position);
      if(d < nearDist){ nearDist = d; nearest = e; }
    });
    this.target = nearest;
    if(nearest){
      const dx = nearest.group.position.x - this.group.position.x;
      const dz = nearest.group.position.z - this.group.position.z;
      this.headGroup.rotation.y = Math.atan2(dx,dz)+Math.PI;
      const fireRate = hasSynergy('summon',1) ? TURRET_FIRE_RATE*1.5 : TURRET_FIRE_RATE;
      this.fireTimer += dt;
      if(this.fireTimer >= fireRate){
        this.fireTimer = 0;
        this.shoot(nearest);
      }
    }
  }
  shoot(target){
    if(target.dead) return;
    audio.turretShoot();
    const from = this.group.position.clone(); from.y += .85;
    const to = target.group.position.clone(); to.y += target.height*.5;
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from,to]),4,.02,6,false);
    const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:0x00ccff, transparent:true, opacity:.6}));
    scene.add(beam);
    setTimeout(()=>{scene.remove(beam);beam.geometry.dispose();beam.material.dispose()}, 100);
    let dmg = 30;
    // SNIPER TURRETS duo - crits
    if(activeDuos.includes('sniturrets') && Math.random() < 0.25) dmg *= 3;
    target.takeDamage(dmg, to);
  }
  takeDamage(dmg){
    this.hp -= dmg;
    if(this.hp <= 0) this.destroy();
  }
  destroy(){
    audio.explosion();
    createExplosion(this.group.position);
    scene.remove(this.group);
    if(activeTurret === this) activeTurret = null;
    turretCooldown = TURRET_COOLDOWN_MAX;
  }
}

// ═══ EFFECTS ═══
function showHitmarker(isHead){
  const hm = document.getElementById('hitmarker');
  if(!hm) return;
  hm.querySelector('svg').querySelectorAll('line').forEach(l=>l.setAttribute('stroke', isHead?'#ff0':'#fff'));
  hm.classList.add('show');
  setTimeout(()=>hm.classList.remove('show'), 150);
}
function showHeadshotText(){
  const ht = document.getElementById('headshot-text');
  if(!ht) return;
  ht.classList.add('show');
  setTimeout(()=>ht.classList.remove('show'), 800);
}
function showFreezeText(){
  const el = document.getElementById('freeze-overlay');
  if(!el) return;
  el.style.display = 'block';
  setTimeout(()=>{el.style.display='none'}, 1000);
}
function createBloodEffect(p, t){
  const count = t === 'headshot' ? 35 : 20;
  for(let i=0;i<count;i++){
    const pt = new THREE.Mesh(
      new THREE.SphereGeometry(t==='headshot'?.08:.06,4,4),
      new THREE.MeshBasicMaterial({color: t==='robot'?0xffff00 : t==='headshot'?0xff2200 : 0xff0000, transparent:true, opacity:1})
    );
    pt.position.copy(p);
    const spd = t==='headshot'?.7:.5;
    pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*spd, Math.random()*spd, (Math.random()-.5)*spd);
    pt.userData.life = 40;
    pt.userData.gravity = true;
    scene.add(pt);
    particles.push(pt);
  }
}
function createExplosion(p){
  for(let i=0;i<30;i++){
    const pt = new THREE.Mesh(
      new THREE.SphereGeometry(.12,4,4),
      new THREE.MeshBasicMaterial({color:0xff8800, transparent:true, opacity:1})
    );
    pt.position.copy(p);
    pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*.8, Math.random()*.6, (Math.random()-.5)*.8);
    pt.userData.life = 50;
    pt.userData.gravity = true;
    scene.add(pt);
    particles.push(pt);
  }
}
function createPoisonCloud(p){
  for(let i=0;i<20;i++){
    const pt = new THREE.Mesh(
      new THREE.SphereGeometry(.25,6,6),
      new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:.6})
    );
    pt.position.copy(p);
    pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*.15, Math.random()*.08, (Math.random()-.5)*.15);
    pt.userData.life = 120;
    pt.userData.isPoison = true;
    scene.add(pt);
    particles.push(pt);
  }
}
function createMuzzleFlash(){
  const cols = {
    acid:0x00ff00, fire:0xff4400, ice:0x88ccff, lightning:0xaaccff, holy:0xffffaa,
    laser:0xff0000, gravity:0xcc00ff, dark:0x880088, light:0xffff00,
    piercing:0x00ffff, explosive:0xff8800, poison:0x88ff33
  };
  const color = cols[currentWeapon.damageType] || 0xffff00;
  // Bigger, longer-lived flash
  const f = new THREE.Mesh(new THREE.SphereGeometry(.48,8,8), new THREE.MeshBasicMaterial({color, transparent:true, opacity:1}));
  f.position.copy(camera.position);
  const d = new THREE.Vector3(0,0,-1);
  d.applyQuaternion(camera.quaternion);
  f.position.add(d.clone().multiplyScalar(1.1));
  f.userData.life = 10;
  scene.add(f);
  particles.push(f);
  // Additional side sparks
  for(let i=0;i<4;i++){
    const sp = new THREE.Mesh(new THREE.SphereGeometry(.1,4,4), new THREE.MeshBasicMaterial({color, transparent:true, opacity:1}));
    sp.position.copy(camera.position).add(d.clone().multiplyScalar(1.1));
    sp.userData.velocity = new THREE.Vector3(
      d.x*.15 + (Math.random()-.5)*.15,
      d.y*.15 + (Math.random()-.5)*.15,
      d.z*.15 + (Math.random()-.5)*.15
    );
    sp.userData.life = 6 + Math.random()*4;
    scene.add(sp);
    particles.push(sp);
  }
  const flash = new THREE.PointLight(color, 4, 5);
  flash.position.copy(camera.position).add(d.clone().multiplyScalar(1.1));
  scene.add(flash);
  setTimeout(()=>scene.remove(flash), 80);

  // ═══ PISTOL SMOKE ═══
  if(currentWeapon.weaponClass === 'pistol' || currentWeapon.weaponClass === 'revolver'){
    for(let i=0;i<5;i++){
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(.14 + Math.random()*.1, 6, 6),
        new THREE.MeshBasicMaterial({color:0xaaaaaa, transparent:true, opacity:.35})
      );
      smoke.position.copy(camera.position).add(d.clone().multiplyScalar(1.2));
      const spread = .3;
      smoke.userData.velocity = new THREE.Vector3(
        d.x*.15 + (Math.random()-.5)*spread,
        d.y*.15 + (Math.random()-.5)*spread + .08,
        d.z*.15 + (Math.random()-.5)*spread
      );
      smoke.userData.life = 30 + Math.random()*20;
      scene.add(smoke);
      particles.push(smoke);
    }
  }

  DOM.crosshair.classList.add('fire');
  setTimeout(()=>DOM.crosshair.classList.remove('fire'), 120);
}
function createWallSpark(p){
  for(let i=0;i<8;i++){
    const pt = new THREE.Mesh(
      new THREE.SphereGeometry(.03,4,4),
      new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:1})
    );
    pt.position.copy(p);
    pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*.3, Math.random()*.3, (Math.random()-.5)*.3);
    pt.userData.life = 15;
    pt.userData.gravity = true;
    scene.add(pt);
    particles.push(pt);
  }
}
function cameraShake(i, t){
  shakeIntensity = Math.max(shakeIntensity, i);
  shakeTime = Math.max(shakeTime, t);
}
function findSafeSpawnPosition(){
  for(let attempt=0;attempt<100;attempt++){
    const radius = attempt<50 ? 3 : 18;
    const a = Math.random()*Math.PI*2;
    const d = Math.random()*radius;
    const x = Math.cos(a)*d, z = Math.sin(a)*d;
    if(!checkPositionBlocked(x,z,1)) return {x,z};
  }
  return {x:0,z:0};
}

// ═══ LEVEL GENERATION ═══
function generateLevel(){
  colliders.length = 0;
  platforms.length = 0;
  const toRemove = [];
  scene.traverse(obj=>{
    if(obj.userData && obj.userData.isMapElement) toRemove.push(obj);
  });
  toRemove.forEach(o=>scene.remove(o));

  currentMapStyle = mapStyles[Math.floor(Math.random()*mapStyles.length)];
  const styleEl = document.getElementById('map-style');
  if(styleEl){
    styleEl.innerHTML = '⚠ '+currentMapStyle.name+' ⚠<div id="map-sub">'+currentMapStyle.sub+'</div>';
    styleEl.classList.add('show');
    setTimeout(()=>styleEl.classList.remove('show'), 3000);
  }

  const fg = new THREE.Group();
  fg.userData.isMapElement = true;
  for(let x=-25;x<25;x+=2){
    for(let z=-25;z<25;z+=2){
      const t = new THREE.Mesh(
        new THREE.PlaneGeometry(2,2),
        new THREE.MeshStandardMaterial({
          color:(Math.floor(x/2)+Math.floor(z/2))%2===0
            ? currentMapStyle.floor
            : new THREE.Color(currentMapStyle.floor).multiplyScalar(.7).getHex(),
          roughness:.8, metalness:.2
        })
      );
      t.rotation.x = -Math.PI/2;
      t.position.set(x+1,0,z+1);
      t.receiveShadow = true;
      fg.add(t);
    }
  }
  scene.add(fg);

  const wh = 4, as = 25;
  const cm = new THREE.MeshStandardMaterial({color:currentMapStyle.wall,roughness:.6,metalness:.4,emissive:currentMapStyle.accent,emissiveIntensity:.2});
  [
    {p:[0,2,-as], s:[50,wh,1], c:currentMapStyle.accent},
    {p:[0,2,as],  s:[50,wh,1], c:currentMapStyle.accent2},
    {p:[-as,2,0], s:[1,wh,50], c:currentMapStyle.accent},
    {p:[as,2,0],  s:[1,wh,50], c:currentMapStyle.accent2}
  ].forEach(w=>{
    const wl = new THREE.Mesh(
      new THREE.BoxGeometry(...w.s),
      new THREE.MeshStandardMaterial({color:currentMapStyle.wall,roughness:.7,metalness:.3,emissive:w.c,emissiveIntensity:.2})
    );
    wl.position.set(...w.p);
    wl.castShadow = true;
    wl.receiveShadow = true;
    wl.userData.isMapElement = true;
    scene.add(wl);
    colliders.push({position:wl.position, size:new THREE.Vector3(...w.s)});
  });

  const addWall = (x,y,z,w,h,d)=>{
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), cm);
    wall.position.set(x,y,z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.isMapElement = true;
    scene.add(wall);
    colliders.push({position:wall.position, size:new THREE.Vector3(w,h,d)});
  };

  const layoutType = currentMapStyle.sub==='АРЕНА'?0
    : currentMapStyle.sub==='ЛАБИРИНТ'?1
    : currentMapStyle.sub==='БУНКЕР'?2
    : currentMapStyle.sub==='СКЛАД'?3 : 4;

  if(layoutType === 0){
    for(let i=0;i<8;i++){
      const a = i/8*Math.PI*2+Math.PI/8;
      const r = 9+Math.random()*3;
      addWall(Math.cos(a)*r, 1.5, Math.sin(a)*r, 1.5+Math.random()*.5, 3, 1.5+Math.random()*.5);
    }
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
      addWall(sx*19, 1.5, sz*19, 3, 3, 3);
    });
  } else if(layoutType === 1){
    for(let i=-2;i<=2;i++){
      for(let j=-2;j<=2;j++){
        if(Math.abs(i)<2 && Math.abs(j)<2) continue;
        if(Math.random()<.5) addWall(i*7, 1.5, j*7+(Math.random()>.5?2:-2), 5, 3, .6);
        if(Math.random()<.5) addWall(i*7+(Math.random()>.5?2:-2), 1.5, j*7, .6, 3, 5);
      }
    }
  } else if(layoutType === 2){
    const size = 7;
    addWall(-3.5,1.5,-size,5,3,.6); addWall(3.5,1.5,-size,5,3,.6);
    addWall(-3.5,1.5,size,5,3,.6); addWall(3.5,1.5,size,5,3,.6);
    addWall(-size,1.5,-3.5,.6,3,5); addWall(-size,1.5,3.5,.6,3,5);
    addWall(size,1.5,-3.5,.6,3,5); addWall(size,1.5,3.5,.6,3,5);
    addWall(-3,1,-3,1.5,2,1.5);
    addWall(3,1,3,1.5,2,1.5);
  } else if(layoutType === 3){
    for(let i=0;i<4;i++){
      const z = -12+i*8;
      addWall(-12,1.5,z,6,3,.6);
      addWall(-2,1.5,z,6,3,.6);
      addWall(8,1.5,z,6,3,.6);
    }
  } else {
    const ringR = 9, numSegments = 16;
    for(let i=0;i<numSegments;i++){
      const skipGap = (i<1 || i>=numSegments-1)
        || (Math.abs(i-numSegments/4)<1)
        || (Math.abs(i-numSegments/2)<1)
        || (Math.abs(i-3*numSegments/4)<1);
      if(skipGap) continue;
      const a = i/numSegments*Math.PI*2;
      addWall(Math.cos(a)*ringR, 1.5, Math.sin(a)*ringR, 1.5, 3, 1.5);
    }
    addWall(3,2,0,2,4,2);
    addWall(-3,2,0,2,4,2);
  }

  for(let i=0;i<8+Math.floor(Math.random()*5);i++){
    let x, z, a = 0;
    do { x = (Math.random()-.5)*40; z = (Math.random()-.5)*40; a++; }
    while((checkPositionBlocked(x,z,1.5) || Math.sqrt(x*x+z*z)<3) && a<30);
    if(a<30){
      const r = .3+Math.random()*.3;
      const h = .6+Math.random()*.8;
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(r,r,h,12),
        new THREE.MeshStandardMaterial({color:currentMapStyle.accent,roughness:.7,metalness:.3,emissive:currentMapStyle.accent,emissiveIntensity:.1})
      );
      drum.position.set(x, h/2, z);
      drum.castShadow = true;
      drum.userData.isMapElement = true;
      scene.add(drum);
      colliders.push({position:drum.position, size:new THREE.Vector3(r*2,h,r*2)});
    }
  }
}
