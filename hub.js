'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.1 — HUB (bigger, livelier, prog-rock stage)

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
  "Ребята на сцене жарят прог-рок. Не мешай им.",
  "Стекло мутное, но басы слышно за версту.",
  "За этой стойкой я уже 300 лет. Не жалуюсь.",
];

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
    this.hubRecoilPitch = 0;
    this._dpsEl = null;
    this._hubAmmoEl = null;
    this._hubReloadEl = null;
    this.build();
  }

  matFloor(){ return new THREE.MeshStandardMaterial({color:0x1a1a22, roughness:.7, metalness:.6}) }
  matWall(){ return new THREE.MeshStandardMaterial({color:0x2a2028, roughness:.9, metalness:.1}) }
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
    // Концентрические неоновые кольца на полу
    for(let r=1; r<R; r+=1){
      this.tor(r, .015, 4, 48, new THREE.MeshBasicMaterial({color:0x00aa66, transparent:true, opacity:.25}), 0, .06, 0, null, Math.PI/2,0,0);
    }

    const wall = this.cyl(R, R, H, 48, this.matWall(), 0, H/2, 0);
    wall.material.side = THREE.BackSide;
    for(let h=1; h<H; h+=.5){
      this.tor(R-.05, .03, 4, 56, new THREE.MeshBasicMaterial({color:0x0a0505}), 0, h, 0, null, Math.PI/2,0,0);
    }

    this.cyl(R, R, .05, 48, new THREE.MeshBasicMaterial({color:0x0a0510, transparent:true, opacity:.85}), 0, H, 0);
    // Потолочные балки
    for(let i=0; i<4; i++){
      const a = i/4*Math.PI*2 + Math.PI/4;
      this.cyl(.08,.08, R*1.6, 8, this.matMetal(), 0, H-.2, 0, null, 0).rotation.set(0, a, 0);
    }

    // Центральный столб-хаб
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
    this.buildBar(-2, 8);
    this.buildBarRobot(0, 8.7);
    this.buildStage(0, 11.5);

    // Диско-шар под потолком
    const discoBall = this.sph(.45, 20, 16,
      new THREE.MeshStandardMaterial({color:0x888899, metalness:1, roughness:.1, emissive:0x222244, emissiveIntensity:.4}),
      0, H - 1.2, 0);
    this.parts.discoBall = discoBall;
    const discoLight = new THREE.PointLight(0xff44aa, 2, 10);
    discoLight.position.set(0, H - 1.2, 0);
    this.group.add(discoLight);
    this.parts.discoLight = discoLight;

    // Ambient + центральный свет
    this.group.add(new THREE.AmbientLight(0x221122, .7));
    const centerLight = new THREE.PointLight(0xff8800, 2.5, 15);
    centerLight.position.set(0, 3, 0);
    this.group.add(centerLight);
    this.parts.centerLight = centerLight;

    // Зональные огни
    [
      {pos:[0,3,-9], color:0x8844ff},
      {pos:[-9,3,-4], color:0xffaa00},
      {pos:[9,3,-4], color:0xff2266},
      {pos:[9,3,5], color:0x00ddff},
      {pos:[-9,3,5], color:0xff2222},
      {pos:[-10.5,3,0], color:0x66ccff},
      {pos:[0,3,8], color:0xff8800},
    ].forEach(zl=>{
      const l = new THREE.PointLight(zl.color, 1.6, 7);
      l.position.set(...zl.pos);
      this.group.add(l);
    });

    // Звёзды на потолке
    for(let i=0; i<100; i++){
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

    // Hitbox
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
    // Стойки
    for(let i=0; i<4; i++){
      const sx = -1.8 + i*1.2, sz = -.9;
      this.cyl(.27,.27,.11,12, this.matMetal(), sx, .6, sz, g);
      this.cyl(.055,.055,.6,8, this.matMetal(), sx, .28, sz, g);
      this.cyl(.22,.17,.06,12, this.matDarkMetal(), sx, .06, sz, g);
    }
    // Полка над стойкой
    this.box(5.0, .08, .4, this.matMetal(), 0, 2.2, -.15, g);
    // Неон "BAR"
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
    const chassisM = new THREE.MeshStandardMaterial({color:0x3a3a44, metalness:.85, roughness:.3});
    const headM = new THREE.MeshStandardMaterial({color:0x5a5a66, metalness:.9, roughness:.2});
    const darkM = new THREE.MeshStandardMaterial({color:0x1a1a1e, metalness:.7, roughness:.4});
    const eyeM = new THREE.MeshBasicMaterial({color:0x00ff88});
    const accentM = new THREE.MeshStandardMaterial({color:0xff8800, emissive:0xff4400, emissiveIntensity:.7, metalness:.5, roughness:.3});
    this.cyl(.38, .44, .28, 10, darkM, 0, .14, 0, g);
    this.box(.65, .85, .45, chassisM, 0, .7, 0, g);
    this.box(.44, .32, .05, accentM, 0, .82, .23, g);
    for(let i=0; i<3; i++){
      this.sph(.035, 6, 6, new THREE.MeshBasicMaterial({color:[0xff2222, 0xffaa00, 0x00ff88][i]}), -.13 + i*.13, .82, .26, g);
    }
    this.cyl(.09, .09, .16, 8, darkM, 0, 1.2, 0, g);
    const head = this.sph(.3, 16, 14, headM, 0, 1.55, 0, g);
    this.sph(.075, 8, 8, eyeM, -.13, 1.58, .24, g);
    this.sph(.075, 8, 8, eyeM, .13, 1.58, .24, g);
    for(let i=0; i<4; i++){
      this.box(.055, .017, .02, darkM, -.1 + i*.066, 1.42, .26, g);
    }
    this.cyl(.017, .017, .28, 4, darkM, 0, 1.97, 0, g);
    this.sph(.055, 8, 8, new THREE.MeshBasicMaterial({color:0xff0000}), 0, 2.15, 0, g);
    for(let s of [-1,1]){
      this.cyl(.065, .065, .55, 6, chassisM, s*.46, .85, 0, g, Math.PI/2, 0, Math.PI/2);
      this.cyl(.055, .075, .38, 6, darkM, s*.6, .52, 0, g);
      this.sph(.09, 8, 8, darkM, s*.6, .32, 0, g);
    }
    this.cyl(.065, .065, .13, 8, new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:.5, metalness:.2, roughness:.1}), .9, 1.65, -.32, g);
    this.parts.barRobot = g;
    this.parts.barRobotHead = head;
    this.parts.barRobotEyes = [eyeM];
    const rl = new THREE.PointLight(0x00ff88, .9, 2.5);
    rl.position.set(0, 1.6, 0);
    g.add(rl);
  }

  buildStage(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.group.add(g);

    // Подиум
    this.box(9.5, .4, 2.5, this.matDarkMetal(), 0, .2, 0, g);
    this.box(9.6, .06, 2.6, new THREE.MeshStandardMaterial({color:0x111118, roughness:.7, metalness:.3}), 0, .42, 0, g);

    // Задняя стена сцены
    this.box(9.5, 4.5, .2, new THREE.MeshStandardMaterial({color:0x0a0a15, roughness:.9}), 0, 2.5, 1.2, g);

    // Мутное стекло между игроком и музыкантами
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.32,
      roughness: 0.9, metalness: 0.05,
      emissive: 0x223344, emissiveIntensity: 0.2,
      depthWrite: false, side: THREE.DoubleSide
    });
    const glass = this.a(new THREE.PlaneGeometry(10, 4.5), glassMat, 0, 2.4, -1.2, 0, 0, 0, g);
    this.parts.stageGlass = glass;

    // Рама стекла
    this.box(10.4, .18, .22, this.matMetal(), 0, 4.75, -1.2, g);
    this.box(10.4, .18, .22, this.matMetal(), 0, .05, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), -5.15, 2.4, -1.2, g);
    this.box(.18, 4.8, .22, this.matMetal(), 5.15, 2.4, -1.2, g);
    for (let i = -1; i <= 1; i++) {
      this.box(.06, 4.5, .16, this.matMetal(), i * 2.55, 2.4, -1.2, g);
    }

    // Усилители
    const ampM = new THREE.MeshStandardMaterial({color:0x1a1a1a, metalness:.4, roughness:.8});
    const ampFrontM = new THREE.MeshStandardMaterial({color:0x0a0a0a, metalness:.6, roughness:.5, emissive:0x442200, emissiveIntensity:.4});
    for (let side of [-1, 1]) {
      const ampG = new THREE.Group();
      ampG.position.set(side * 4.0, 0, 0.7);
      g.add(ampG);
      this.box(1.0, 1.6, 0.55, ampM, 0, 1.2, 0, ampG);
      this.box(0.9, 1.4, 0.06, ampFrontM, 0, 1.2, 0.28, ampG);
      for (let i = 0; i < 6; i++) {
        this.tor(.11, .015, 4, 12, this.matDarkMetal(), -0.3 + (i % 3) * 0.3, 1.6 - Math.floor(i / 3) * 0.25, 0.31, ampG, Math.PI/2, 0, 0);
      }
    }

    // Барабаны — будут у барабанщика
    // Музыканты
    this.buildMusicians(g);

    // Сценический свет
    const stageLights = [
      {x: -2.5, color: 0xff22aa, intensity: 3.2},
      {x: 0, color: 0x22ddff, intensity: 2.8},
      {x: 2.5, color: 0xaa44ff, intensity: 3.2}
    ];
    stageLights.forEach(sl => {
      const pl = new THREE.PointLight(sl.color, sl.intensity, 6);
      pl.position.set(sl.x, 3.8, 0);
      g.add(pl);
      // Визуальный источник (маленькая сфера)
      this.sph(.12, 8, 8, new THREE.MeshBasicMaterial({color: sl.color}), sl.x, 4.2, -0.5, g);
    });

    this.registerInteractable('stage', g, 'ПРОГ-РОК СЦЕНА · BROADCAST FROM THE VOID', 4.0, 0xff22aa);
  }

  buildMusicians(parent){
    // Гитарist — левый
    const guitarist = this.buildMusician(-2.6, 0xaa44ff, 'guitar');
    guitarist.group.position.z = 0.4;
    parent.add(guitarist.group);

    // Бассист — правый
    const bassist = this.buildMusician(2.6, 0x22ddff, 'bass');
    bassist.group.position.z = 0.4;
    parent.add(bassist.group);

    // Барабанщик — центр, глубже
    const drummer = this.buildMusician(0, 0xff6622, 'drums');
    drummer.group.position.z = 1.0;
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

    // Ноги
    this.a(new THREE.CylinderGeometry(.11, .1, .95, 6), bodyM, -.17, .48, 0, 0, 0, .05, g);
    this.a(new THREE.CylinderGeometry(.11, .1, .95, 6), bodyM, .17, .48, 0, 0, 0, -.05, g);

    // Торс (короткая куртка)
    this.a(new THREE.CylinderGeometry(.36, .42, 1.05, 8), bodyM, 0, 1.4, 0, 0, 0, 0, g);
    // Пояс
    this.a(new THREE.CylinderGeometry(.44, .44, .08, 10), accentM, 0, .92, 0, 0, 0, 0, g);

    // Голова
    const head = this.sph(.24, 12, 10, skinM, 0, 2.15, 0, g);
    // Длинные волосы (прог-рок!)
    this.a(new THREE.BoxGeometry(.6, 1.1, .28), hairM, 0, 1.75, -.14, 0, 0, 0, g);
    this.a(new THREE.BoxGeometry(.22, .9, .22), hairM, -.31, 1.6, 0, 0, 0, .12, g);
    this.a(new THREE.BoxGeometry(.22, .9, .22), hairM, .31, 1.6, 0, 0, 0, -.12, g);
    // Неоновые глаза
    this.sph(.045, 6, 6, accentM, -.08, 2.2, .21, g);
    this.sph(.045, 6, 6, accentM, .08, 2.2, .21, g);
    // Борода/бакенбарды
    this.a(new THREE.BoxGeometry(.3, .2, .1), hairM, 0, 2.02, .18, 0, 0, 0, g);

    // Руки
    const leftArm = this.a(new THREE.CylinderGeometry(.085, .075, .95, 6), bodyM, -.45, 1.6, 0, 0, 0, .25, g);
    const rightArm = this.a(new THREE.CylinderGeometry(.085, .075, .95, 6), bodyM, .45, 1.6, 0, 0, 0, -.25, g);

    // Инструмент
    let instrument = null;
    if (role === 'guitar' || role === 'bass') {
      const guitarGroup = new THREE.Group();
      // Тело
      this.a(new THREE.BoxGeometry(.55, .38, .12), guitarM, 0, 0, 0, 0, 0, 0, guitarGroup);
      // Гриф
      this.a(new THREE.BoxGeometry(.08, 1.0, .08), guitarM, 0, .68, 0, 0, 0, 0, guitarGroup);
      // Голова грифа
      this.a(new THREE.BoxGeometry(.16, .22, .06), guitarM, 0, 1.28, 0, 0, 0, 0, guitarGroup);
      // Струны (светящиеся)
      const stringMat = new THREE.MeshBasicMaterial({color: accentColor, transparent: true, opacity: .8});
      for (let i = 0; i < 3; i++) {
        this.a(new THREE.BoxGeometry(.01, 1.3, .01), stringMat, -.12 + i*.12, .55, .06, 0, 0, 0, guitarGroup);
      }
      // Точки на ладах
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
      // Бочка
      this.a(new THREE.CylinderGeometry(.48, .48, .55, 16),
        new THREE.MeshStandardMaterial({color:0x1a0a0a, roughness:.8}), 0, .55, 0, Math.PI/2, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.4, .4, .58, 16),
        new THREE.MeshBasicMaterial({color: accentColor, transparent:true, opacity:.3}), 0, .55, 0, Math.PI/2, 0, 0, kit);
      // Малый барабан
      this.a(new THREE.CylinderGeometry(.22, .22, .16, 12),
        new THREE.MeshStandardMaterial({color:0xdddddd, roughness:.5, metalness:.6}), -.45, .65, 0, 0, 0, 0, kit);
      // Том-том
      this.a(new THREE.CylinderGeometry(.22, .22, .16, 12),
        new THREE.MeshStandardMaterial({color:0xdddddd, roughness:.5, metalness:.6}), .45, .65, 0, 0, 0, 0, kit);
      // Хай-хэт / тарелки
      const cymM = new THREE.MeshStandardMaterial({color:0xddaa22, metalness:.9, roughness:.3, emissive:accentColor, emissiveIntensity:.2});
      this.a(new THREE.CylinderGeometry(.3, .3, .04, 20), cymM, -.7, 1.25, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.28, .28, .04, 20), cymM, .7, 1.25, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.02, .02, 1.0, 6), this.matMetal(), -.7, .75, 0, 0, 0, 0, kit);
      this.a(new THREE.CylinderGeometry(.02, .02, 1.0, 6), this.matMetal(), .7, .75, 0, 0, 0, 0, kit);
      // Палочки у рук
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
    // Сброс возможных остатков FPS-отдачи
    recoilPitchAccum = 0;
    recoilRollAccum = 0;
    if(!hubScene){
      hubScene = new THREE.Scene();
      hubScene.background = new THREE.Color(0x050308);
      hubScene.fog = new THREE.Fog(0x050308, 8, 30);
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
    // Бар (объём z 7.7-8.3, x -4.5..0.5, потому что бар смещён на -2)
    if(x > -4.6 && x < 0.6 && z > 7.6 && z < 8.4) return false;
    // Стекло сцены
    if(z > 10.1) return false;
    return true;
  }

  update(dt){
    if(!hubPlayer) return;

    // Анимации декора
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
    if(this.parts.barRobotHead){
      this.parts.barRobotHead.rotation.y = Math.sin(Date.now()*.0008)*.35;
      this.parts.barRobotHead.rotation.x = Math.sin(Date.now()*.0011)*.1;
    }
    if(this.parts.barRobotEyes){
      const flicker = Math.random() < .015 ? .3 : 1;
      this.parts.barRobotEyes.forEach(e=>{ e.color.setRGB(0, flicker, flicker*.6) });
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

    // Анимации музыкантов
    this.updateMusicians(dt);

    // weaponView — но БЕЗ playRecoil, чтобы не сбивать camera.rotation.x
    if(weaponView) weaponView.update(dt);

    // Логика: движение и стрельба
    if(!hubCasinoActive && !hubDiceActive && !hubBloodActive && !isNestActive && !isSynergyPanelOpen){
      this.updatePlayerMovement(dt);
      this.updateShooting(dt);
    } else {
      this.mouseDown = false;
    }

    // Перезарядка
    if(this.hubReloading){
      this.hubReloadTimer -= dt;
      const rlEl = document.getElementById('hub-reloading');
      if(rlEl) rlEl.style.display = 'block';
      if(this.hubReloadTimer <= 0){
        const w = currentWeapon;
        if(w) setAmmo(w.magSize);
        this.hubReloading = false;
        if(weaponView) weaponView.finishReload();
        audio.pickup();
        if(rlEl) rlEl.style.display = 'none';
        this.updateHubAmmoHUD();
      }
    } else {
      const rlEl = document.getElementById('hub-reloading');
      if(rlEl) rlEl.style.display = 'none';
    }

    // Затухание отдачи
    this.hubRecoilPitch *= Math.pow(0.001, dt);
    if(Math.abs(this.hubRecoilPitch) < 0.0005) this.hubRecoilPitch = 0;

    // Переопределяем ориентацию камеры — это ЕДИНСТВЕННОЕ место где camera.rotation задаётся в хабе
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

      // Отталкивание от интерактивных зон (не заходим в них)
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

    // Перезарядка в процессе — выходим
    if(this.hubReloading) return;

    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);

    // Нет патронов — запускаем перезарядку
    if(!noAmmoClass && getAmmo() <= 0){
      this.hubReloading = true;
      this.hubReloadTimer = w.reloadTime || 1.5;
      audio.reload();
      return;
    }

    // Кулдаун
    const rate = w.fireRate || 2;
    const now = performance.now();
    if(now - this.lastShotTime < 1000 / rate) return;
    this.lastShotTime = now;

    // Звук
    audio.play(w.weaponClass);

    // Косметическая отдача ствола (без player.pitch)
    if(weaponView) weaponView.recoilOffset = 0.09;

    // Камера-отдача — накапливается и затухает
    this.hubRecoilPitch = Math.min(0.06, this.hubRecoilPitch + 0.028);

    // Тратим патрон
    if(!noAmmoClass){
      setAmmo(getAmmo() - 1);
      this.updateHubAmmoHUD();
    }

    // Направление
    const from = camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const spread = (w.spread || 0) * .35 + .006;
    dir.x += (Math.random()-.5)*spread;
    dir.y += (Math.random()-.5)*spread*.5;
    dir.z += (Math.random()-.5)*spread;
    dir.normalize();

    const range = Math.min(w.range || 30, 30);
    const endDefault = from.clone().add(dir.clone().multiplyScalar(range));

    // Raycast — попадание в манекен
    let hitPoint = endDefault;
    let hitDummy = false;
    const raycaster = new THREE.Raycaster(from, dir, 0, range);
    const intersects = raycaster.intersectObject(this.dummy.hitMesh, false);
    if(intersects.length > 0){
      hitPoint = intersects[0].point.clone();
      hitDummy = true;
    }

    // Трассер
    this.createTrace(from, hitPoint, hitDummy);

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
  }

  tryReload(){
    if(!hubPlayer) return;
    if(this.hubReloading) return;
    const w = currentWeapon;
    if(!w) return;
    const noAmmoClass = ['melee', 'hourglass', 'turret', 'acidotronator'].includes(w.weaponClass);
    if(noAmmoClass) return;
    if(getAmmo() === w.magSize) return;
    this.hubReloading = true;
    this.hubReloadTimer = w.reloadTime || 1.5;
    audio.reload();
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
  if(hubCasinoActive){
    if(e.code === 'KeyE' || e.code === 'Space'){ hub.spinCasino(); e.preventDefault(); return; }
    if(e.code === 'Escape'){ hub.closeCasino(); e.preventDefault(); return; }
    return;
  }
  if(hubDiceActive){
    if(e.code === 'KeyE' || e.code === 'Space'){ hub.rollDice(); e.preventDefault(); return; }
    if(e.code === 'Escape'){ hub.closeDice(); e.preventDefault(); return; }
    return;
  }
  if(hubBloodActive){
    if(e.code === 'KeyE' || e.code === 'Space'){ hub.donateBlood(); e.preventDefault(); return; }
    if(e.code === 'Escape'){ hub.closeBloodStation(); e.preventDefault(); return; }
    return;
  }
  if(isNestActive) return;
  if(isSynergyPanelOpen) return;
  keys[e.code] = true;
  if(e.code === 'KeyE'){ hub.interact(); e.preventDefault(); return; }
  if(e.code === 'KeyR'){ hub.tryReload(); e.preventDefault(); return; }
  if(e.code === 'Tab'){ e.preventDefault(); return; }
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

console.log('🏨 hub.js загружен (v6.1 — prog rock stage)');
