'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.0 — HUB (Shelter location between waves)

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
    const ROOM_R = 8, ROOM_H = 4.2;

    this.cyl(ROOM_R, ROOM_R, .1, 32, this.matFloor(), 0, 0, 0);
    for(let r=1; r<8; r+=1){
      this.tor(r, .015, 4, 32, new THREE.MeshBasicMaterial({color:0x00aa66, transparent:true, opacity:.25}), 0, .06, 0, null, Math.PI/2,0,0);
    }

    const wall = this.cyl(ROOM_R, ROOM_R, ROOM_H, 32, this.matWall(), 0, ROOM_H/2, 0);
    wall.material.side = THREE.BackSide;
    for(let h=1; h<ROOM_H; h+=.5){
      this.tor(ROOM_R-.05, .03, 4, 48, new THREE.MeshBasicMaterial({color:0x0a0505}), 0, h, 0, null, Math.PI/2,0,0);
    }

    this.cyl(ROOM_R, ROOM_R, .05, 32, new THREE.MeshBasicMaterial({color:0x0a0510, transparent:true, opacity:.85}), 0, ROOM_H, 0);
    for(let i=0; i<4; i++){
      const a = i/4*Math.PI*2 + Math.PI/4;
      this.cyl(.08,.08, ROOM_R*1.6, 8, this.matMetal(), 0, ROOM_H-.2, 0, null, 0).rotation.set(0, a, 0);
    }

    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.8, 0);
    this.group.add(centerGroup);
    const neonRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, .06, 8, 32), this.matNeon(0x00ff88, 0x00aa55));
    neonRing.rotation.x = Math.PI/2;
    centerGroup.add(neonRing);
    const neonRing2 = new THREE.Mesh(new THREE.TorusGeometry(.9, .04, 8, 24), this.matNeon(0xff8800, 0xaa4400));
    neonRing2.rotation.x = Math.PI/2;
    centerGroup.add(neonRing2);
    this.parts.centerRing = neonRing;
    this.parts.centerRing2 = neonRing2;
    this.cyl(.15, .25, 1.4, 12, this.matDarkMetal(), 0, .7, 0);

    this.buildTeleporter(0, -6, 0);
    this.buildCardTable(-6, -3, Math.PI/4);
    this.buildCasino(6, -3, -Math.PI/4);
    this.buildDice(6, 4, -Math.PI*3/4);
    this.buildBloodStation(-6, 4, Math.PI*3/4);
    this.buildDummy(-5.5, -5.5);
    this.buildBarRobot(0, 7.2);

    const barGroup = new THREE.Group();
    barGroup.position.set(0, 0, 6.5);
    this.group.add(barGroup);
    this.box(4.5, 1.1, .5, this.matWood(), 0, .55, 0, barGroup);
    this.box(4.6, .1, .55, this.matMetal(), 0, 1.15, 0, barGroup);
    const bottleColors = [0x00aa55, 0xaa2222, 0x2266aa, 0xaa8800];
    for(let i=0; i<8; i++){
      this.cyl(.05,.06,.3+Math.random()*.2, 6, new THREE.MeshStandardMaterial({color:bottleColors[i%4], emissive:bottleColors[i%4], emissiveIntensity:.3}), -1.8+i*.5, 1.35, 0, barGroup);
    }
    for(let i=0; i<3; i++){
      const sx = -1.4 + i*1.4, sz = 5.6;
      this.cyl(.25,.25,.1,12, this.matMetal(), sx, .55, sz);
      this.cyl(.05,.05,.55,8, this.matMetal(), sx, .25, sz);
      this.cyl(.2,.15,.05,12, this.matDarkMetal(), sx, .05, sz);
    }

    const amb = new THREE.AmbientLight(0x221122, .6);
    this.group.add(amb);
    const centerLight = new THREE.PointLight(0xff8800, 2, 12);
    centerLight.position.set(0, 2.5, 0);
    this.group.add(centerLight);
    this.parts.centerLight = centerLight;

    const zoneLights = [
      {pos:[0,3,-6], color:0x8844ff},
      {pos:[-6,3,-3], color:0xffaa00},
      {pos:[6,3,-3], color:0xff2266},
      {pos:[6,3,4], color:0x00ddff},
      {pos:[-6,3,4], color:0xff2222},
      {pos:[-5.5,3,-5.5], color:0x66ccff},
    ];
    zoneLights.forEach(zl=>{
      const l = new THREE.PointLight(zl.color, 1.5, 6);
      l.position.set(...zl.pos);
      this.group.add(l);
    });

    for(let i=0; i<60; i++){
      const theta = Math.random()*Math.PI*2;
      const r = Math.random()*ROOM_R*.9;
      this.sph(.02,4,4, new THREE.MeshBasicMaterial({color:0xffffff}), Math.cos(theta)*r, ROOM_H-.1, Math.sin(theta)*r);
    }

    return this.group;
  }

  buildTeleporter(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.cyl(1.4, 1.6, .2, 24, this.matDarkMetal(), 0, .1, 0, g);
    this.cyl(1.35, 1.35, .05, 24, this.matMetal(), 0, .22, 0, g);
    for(let s of [-1, 1]){
      this.cyl(.1,.15, 3, 8, this.matDarkMetal(), s*1.2, 1.5, 0, g);
      this.tor(.3, .06, 6, 12, this.matNeon(0x8844ff), s*1.2, 3, 0, g, Math.PI/2,0,0);
    }
    const portal = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({color:0x8844ff, transparent:true, opacity:.35, side:THREE.DoubleSide, depthWrite:false}));
    portal.position.set(0, 1.6, 0);
    g.add(portal);
    this.parts.portal = portal;
    const glow = new THREE.PointLight(0x8844ff, 3, 4);
    glow.position.set(0, 1.6, 0);
    g.add(glow);
    this.parts.teleporter = g;
    this.registerInteractable('teleporter', g, 'ТЕЛЕПОРТЕР → СЛЕД. ВОЛНА', 1.8, 0x8844ff);
  }

  buildCardTable(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    for(let s1 of [-1,1]) for(let s2 of [-1,1]){
      this.cyl(.08,.1,.8,8, this.matMetal(), s1*.7, .4, s2*.5, g);
    }
    this.box(2, .1, 1.3, this.matWood(), 0, .85, 0, g);
    this.box(1.9, .02, 1.2, new THREE.MeshStandardMaterial({color:0x0a5a2a, roughness:.9}), 0, .92, 0, g);
    for(let i=0; i<3; i++){
      this.box(.3, .42, .01, new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:.6}), -.6+i*.6, 1.15, 0, g);
    }
    this.registerInteractable('cards', g, 'СТОЛ КАРТ — КУПИТЬ КАРТУ', 2.5, 0xffaa00);
  }

  buildCasino(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.box(1.4, 2.2, .8, this.matDarkMetal(), 0, 1.1, 0, g);
    this.tor(.7, .05, 8, 16, this.matNeon(0xff2266), 0, 2.3, .35, g);
    this.box(1.2, .9, .05, new THREE.MeshBasicMaterial({color:0x110011}), 0, 1.5, .42, g);
    this.parts.casinoReels = [];
    for(let i=0; i<3; i++){
      const reel = this.box(.3, .3, .02, new THREE.MeshBasicMaterial({color:0xff2266, transparent:true, opacity:.8}), -.4+i*.4, 1.5, .45, g);
      this.parts.casinoReels.push(reel);
    }
    this.cyl(.04,.04,.4,6, this.matMetal(), .8, 1.5, 0, g, Math.PI/2);
    this.sph(.1,8,8, new THREE.MeshStandardMaterial({color:0xff2222, emissive:0x880000, emissiveIntensity:.5}), .8, 1.5, .2, g);
    this.box(1.2, .3, .15, this.matMetal(), 0, .5, .45, g);
    this.registerInteractable('casino', g, 'КАЗИНО (10💰/спин)', 2.5, 0xff2266);
  }

  buildDice(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    this.cyl(.8, .9, .4, 16, this.matDarkMetal(), 0, .2, 0, g);
    this.sph(.5, 12, 8, this.matVelvet(), 0, .55, 0, g).scale.set(1.2,.4,1.2);
    const diceMat = new THREE.MeshStandardMaterial({color:0xffdd00, metalness:.7, roughness:.3, emissive:0xaa5500, emissiveIntensity:.3});
    const dice = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), diceMat);
    dice.position.set(0, 1.15, 0);
    g.add(dice);
    this.parts.dice = dice;
    const diceLight = new THREE.PointLight(0xffdd00, 1.5, 3);
    diceLight.position.set(0, 1.5, 0);
    g.add(diceLight);
    this.registerInteractable('dice', g, 'КОСТИ СУДЬБЫ (5💰/бросок)', 2.5, 0x00ddff);
  }

  buildBloodStation(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);
    const metalM = new THREE.MeshStandardMaterial({color:0x2a2a30, metalness:.9, roughness:.2});
    const bloodM = new THREE.MeshStandardMaterial({color:0x8a0000, emissive:0xff0000, emissiveIntensity:.5, transparent:true, opacity:.9});
    const glassM = new THREE.MeshStandardMaterial({color:0xff2222, transparent:true, opacity:.35, metalness:.1, roughness:.05});
    // Станина
    this.box(1.6, .25, 1.0, this.matDarkMetal(), 0, .125, 0, g);
    // Тело
    this.cyl(.55, .7, 1.8, 12, metalM, 0, 1.15, 0, g);
    // Стеклянный цилиндр с кровью
    this.cyl(.4, .4, 1.2, 16, glassM, 0, 1.15, .5, g);
    this.cyl(.3, .3, 1.0, 16, bloodM, 0, 1.0, .5, g);
    // Трубки
    for(let s of [-1,1]){
      const t = this.tor(.15, .03, 6, 12, bloodM, s*.35, 1.5, .3, g, Math.PI/2, 0, 0);
    }
    // Игла / шприц сверху
    this.cone(.1, .35, 8, metalM, 0, 2.15, 0, g);
    this.cyl(.02, .02, .5, 6, metalM, 0, 2.55, 0, g);
    // Мигающий индикатор
    const beacon = this.sph(.1, 8, 8, new THREE.MeshBasicMaterial({color:0xff0000}), 0, 2.95, 0, g);
    this.parts.bloodBeacon = beacon;
    // Свет
    const light = new THREE.PointLight(0xff0000, 1.8, 4);
    light.position.set(0, 1.5, 0);
    g.add(light);
    this.parts.bloodLight = light;
    // Капли анимация
    this.parts.bloodDrops = [];
    for(let i=0; i<4; i++){
      const drop = this.sph(.04, 6, 6, bloodM, (Math.random()-.5)*.3, 1.5 + Math.random()*.4, .5);
      this.parts.bloodDrops.push({mesh: drop, phase: Math.random()});
    }
    this.registerInteractable('blood', g, 'СТАНЦИЯ КРОВИ — HP НА 💰', 2.5, 0xff2222);
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
    // Основание
    this.cyl(.7, .9, .15, 16, padM, 0, .075, 0, g);
    // Стойка
    this.cyl(.08, .1, .55, 8, padM, 0, .4, 0, g);
    // Туловище (бочка)
    const torso = this.cyl(.42, .5, 1.3, 14, bodyM, 0, 1.3, 0, g);
    // Обмотки
    for(let i=0; i<4; i++){
      this.tor(.5 - i*.02, .03, 6, 16, tapeM, 0, .9 + i*.28, 0, g, Math.PI/2, 0, 0);
    }
    // Голова
    const head = this.sph(.28, 14, 12, headM, 0, 2.15, 0, g);
    // Глаза-крестики
    this.box(.1, .04, .02, eyeM, -.1, 2.2, .26, g);
    this.box(.04, .1, .02, eyeM, -.1, 2.2, .26, g);
    this.box(.1, .04, .02, eyeM, .1, 2.2, .26, g);
    this.box(.04, .1, .02, eyeM, .1, 2.2, .26, g);
    // Мишень на груди
    const targetM = new THREE.MeshBasicMaterial({color:0xff2222});
    this.tor(.25, .03, 6, 24, targetM, 0, 1.35, .5, g, Math.PI/2, 0, 0);
    this.tor(.15, .02, 6, 24, targetM, 0, 1.35, .51, g, Math.PI/2, 0, 0);
    this.sph(.05, 8, 8, targetM, 0, 1.35, .5, g);
    // Флажки
    this.cyl(.02, .02, 1.5, 4, this.matMetal(), -.55, 1.8, -.2, g);
    const flag = this.box(.35, .22, .01, new THREE.MeshBasicMaterial({color:0xff8800, side:THREE.DoubleSide}), -.35, 2.4, -.2, g);
    // Hitbox
    const hitGeo = new THREE.CylinderGeometry(.55, .55, 2.5, 12);
    const hitMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false});
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(0, 1.3, 0);
    g.add(hitMesh);

    this.dummy = {
      group: g,
      hitMesh: hitMesh,
      bodyMesh: torso,
      headMesh: head,
      flashTimer: 0
    };

    // Мигание при попадании — сохраняем цвет
    this.dummy.origBodyEmissive = bodyM.emissive.clone();
    this.dummy.bodyMat = bodyM;
    this.dummy.headMat = headM;
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
    // Основание-гусеница
    this.cyl(.35, .4, .25, 10, darkM, 0, .125, 0, g);
    // Торс
    this.box(.6, .8, .4, chassisM, 0, .65, 0, g);
    // Грудная панель
    this.box(.4, .3, .05, accentM, 0, .75, .21, g);
    // Индикаторы
    for(let i=0; i<3; i++){
      this.sph(.03, 6, 6, new THREE.MeshBasicMaterial({color:[0xff2222, 0xffaa00, 0x00ff88][i]}), -.12 + i*.12, .75, .24, g);
    }
    // Шея
    this.cyl(.08, .08, .15, 8, darkM, 0, 1.12, 0, g);
    // Голова (сфера)
    const head = this.sph(.28, 16, 14, headM, 0, 1.45, 0, g);
    // Глаза
    this.sph(.07, 8, 8, eyeM, -.12, 1.48, .22, g);
    this.sph(.07, 8, 8, eyeM, .12, 1.48, .22, g);
    // Рот — решётка
    for(let i=0; i<4; i++){
      this.box(.05, .015, .02, darkM, -.09 + i*.06, 1.32, .24, g);
    }
    // Антенна
    this.cyl(.015, .015, .25, 4, darkM, 0, 1.85, 0, g);
    this.sph(.05, 8, 8, new THREE.MeshBasicMaterial({color:0xff0000}), 0, 2.0, 0, g);
    // Руки-манипуляторы
    for(let s of [-1,1]){
      this.cyl(.06, .06, .5, 6, chassisM, s*.42, .8, 0, g, Math.PI/2, 0, Math.PI/2);
      this.cyl(.05, .07, .35, 6, darkM, s*.55, .5, 0, g);
      this.sph(.08, 8, 8, darkM, s*.55, .3, 0, g);
    }
    // Стакан на стойке перед ним
    const glass = this.cyl(.06, .06, .12, 8, new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:.5, metalness:.2, roughness:.1}), .8, 1.55, -.3, g);
    this.parts.barRobot = g;
    this.parts.barRobotHead = head;
    this.parts.barRobotEyes = [eyeM];
    const rl = new THREE.PointLight(0x00ff88, .8, 2);
    rl.position.set(0, 1.5, 0);
    g.add(rl);
  }

  registerInteractable(id, group, label, radius, color){
    hubInteractables.push({
      id, group, label, radius, color,
      worldPos: group.position.clone(),
    });
  }

  enter(){
    hubMode = true;
    if(!hubScene){
      hubScene = new THREE.Scene();
      hubScene.background = new THREE.Color(0x050308);
      hubScene.fog = new THREE.Fog(0x050308, 6, 20);
      hubScene.add(this.group);
    }
    if(scene.children.includes(camera)) scene.remove(camera);
    hubScene.add(camera);
    hubPlayer = {
      position: new THREE.Vector3(0, 1.6, -4.5),
      velocity: new THREE.Vector3(),
      yaw: Math.PI,
      pitch: 0,
      isMoving: false,
      speed: .08
    };
    camera.position.copy(hubPlayer.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = hubPlayer.yaw;
    camera.rotation.x = hubPlayer.pitch;
    hubCasinoSpins = 0;
    hubDiceRolls = 0;
    hubCasinoActive = false;
    hubDiceActive = false;
    hubBloodActive = false;
    this.mouseDown = false;
    this.dummyHits = [];
    this.robotChatTimer = 20 + Math.random()*15;
    document.body.requestPointerLock();
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    document.body.classList.add('hub-mode');
    updateHubHUD();
    showDebugToast('🏨 УБЕЖИЩЕ — WASD ходьба · ЛКМ стрельба · [E] взаимодействие');
    audio.play('sun');
  }

  exit(){
    hubMode = false;
    this.mouseDown = false;
    if(document.pointerLockElement) document.exitPointerLock();
    if(hubScene && hubScene.children.includes(camera)) hubScene.remove(camera);
    if(!scene.children.includes(camera)) scene.add(camera);
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    const dpsEl = document.getElementById('dps-display');
    if(dpsEl) dpsEl.style.display = 'none';
    document.body.classList.remove('hub-mode');
    continueToWave();
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
      this.parts.centerLight.intensity = 1.8 + Math.sin(Date.now()*.004)*.5;
    }
    if(this.parts.dice){
      this.parts.dice.rotation.y += dt*.8;
      this.parts.dice.rotation.x += dt*.5;
    }
    if(this.parts.casinoReels){
      this.parts.casinoReels.forEach((r,i)=>{
        if(hubCasinoActive) r.position.y = 1.5 + Math.sin(Date.now()*.02 + i*2)*.08;
        else r.position.y = 1.5;
      });
    }
    if(this.parts.bloodBeacon){
      this.parts.bloodBeacon.material.color.setHSL(0, 1, .4 + Math.sin(Date.now()*.008)*.3);
    }
    if(this.parts.bloodLight){
      this.parts.bloodLight.intensity = 1.5 + Math.sin(Date.now()*.006)*.6;
    }
    if(this.parts.bloodDrops){
      this.parts.bloodDrops.forEach(d=>{
        d.phase += dt*.5;
        if(d.phase > 1){ d.phase = 0; d.mesh.position.y = 1.9; }
        d.mesh.position.y = Math.max(.6, 1.9 - d.phase*1.3);
      });
    }
    if(this.parts.barRobotHead){
      this.parts.barRobotHead.rotation.y = Math.sin(Date.now()*.0008)*.3;
    }
    if(this.parts.barRobotEyes){
      const flicker = Math.random() < .02 ? .3 : 1;
      this.parts.barRobotEyes.forEach(e=>{ e.color.setRGB(0, flicker, flicker*.6) });
    }
    // Манекен вспышка
    if(this.dummy){
      if(this.dummy.flashTimer > 0){
        this.dummy.flashTimer -= dt;
        if(this.dummy.bodyMat) this.dummy.bodyMat.emissive.setRGB(1,1,1);
        if(this.dummy.headMat) this.dummy.headMat.emissive.setRGB(1,1,1);
      } else {
        if(this.dummy.bodyMat) this.dummy.bodyMat.emissive.copy(this.dummy.origBodyEmissive);
        if(this.dummy.headMat) this.dummy.headMat.emissive.setRGB(0,0,0);
      }
    }

    if(weaponView) weaponView.update(dt);

    if(!hubCasinoActive && !hubDiceActive && !hubBloodActive && !isNestActive && !isSynergyPanelOpen){
      this.updatePlayerMovement(dt);
      this.updateShooting(dt);
    } else {
      this.mouseDown = false;
    }

    this.updateTraces(dt);
    this.updateDpsDisplay();
    this.updateRobotChat(dt);
    this.checkInteract();
    updateHubHUD();
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
      const nx = hubPlayer.position.clone(); nx.x += mv.x;
      if(Math.sqrt(nx.x*nx.x + nx.z*nx.z) < 7.5) hubPlayer.position.x = nx.x;
      const nz = hubPlayer.position.clone(); nz.z += mv.z;
      if(Math.sqrt(nz.x*nz.x + nz.z*nz.z) < 7.5) hubPlayer.position.z = nz.z;
      for(const zone of hubInteractables){
        const dx = hubPlayer.position.x - zone.worldPos.x;
        const dz = hubPlayer.position.z - zone.worldPos.z;
        if(Math.sqrt(dx*dx+dz*dz) < 1){
          const len = Math.sqrt(dx*dx+dz*dz) || 1;
          hubPlayer.position.x = zone.worldPos.x + dx/len*1;
          hubPlayer.position.z = zone.worldPos.z + dz/len*1;
        }
      }
      hubBobPhase += dt*10;
      const bobY = Math.sin(hubBobPhase*2)*.03;
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
    const rate = w.fireRate || 2;
    const now = performance.now();
    if(now - this.lastShotTime < 1000/rate) return;
    this.lastShotTime = now;

    audio.play(w.weaponClass);
    if(weaponView) weaponView.playRecoil();

    // Направление из камеры
    const from = camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Разброс
    const spread = (w.spread || 0) * .3 + .005;
    dir.x += (Math.random()-.5)*spread;
    dir.y += (Math.random()-.5)*spread*.5;
    dir.z += (Math.random()-.5)*spread;
    dir.normalize();

    const range = Math.min(w.range || 30, 30);
    const endDefault = from.clone().add(dir.clone().multiplyScalar(range));

    // Raycast на манекен
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
      // Рассчитываем урон
      let dmg = (w.damage || 10) * playerBuffs.damageMult;
      const critChance = playerBuffs.critChance + (hasSynergy('crit', 1) ? .10 : 0);
      const isCrit = Math.random() < critChance;
      if(isCrit) dmg *= playerBuffs.critMult;

      // Попадание — визуальный эффект
      this.dummy.flashTimer = .08;
      this.dummyHits.push({ time: performance.now(), dmg });
      if(this.dummyHits.length > 200) this.dummyHits.shift();

      spawnDamageNumber(hitPoint, dmg, isCrit);
      if(isCrit) audio.headshot();
      else audio.hit();
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
    // Очищаем старые хиты
    const now = performance.now();
    const windowMs = 3000;
    while(this.dummyHits.length > 0 && now - this.dummyHits[0].time > windowMs){
      this.dummyHits.shift();
    }
    const totalDmg = this.dummyHits.reduce((s, h) => s + h.dmg, 0);
    const dps = this.dummyHits.length > 0 ? Math.round(totalDmg / (windowMs/1000)) : 0;

    // Позиция — над манекеном
    const worldPos = this.dummy.group.position.clone().add(new THREE.Vector3(0, 3.2, 0));
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
      this.robotChatTimer = 20 + Math.random()*15;
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
    this._chatTimeout = setTimeout(()=>{ el.style.display = 'none' }, 6500);
  }

  checkInteract(){
    const hintEl = document.getElementById('hub-interact-hint');
    if(isNestActive || hubCasinoActive || hubDiceActive || hubBloodActive){
      if(hintEl) hintEl.style.display = 'none';
      hubNearest = null;
      return;
    }
    hubNearest = null;
    let minDist = 3;
    for(const zone of hubInteractables){
      const dx = hubPlayer.position.x - zone.worldPos.x;
      const dz = hubPlayer.position.z - zone.worldPos.z;
      const d = Math.sqrt(dx*dx+dz*dz);
      if(d < minDist){ minDist = d; hubNearest = zone }
    }
    if(hubNearest && minDist < 2.8){
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
    }
  }

  // ═══ CASINO ═══
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

  // ═══ DICE ═══
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
        this.parts.dice.position.y = 1.15 + Math.abs(Math.sin(t*8))*.3;
      } else {
        clearInterval(animInterval);
        this.parts.dice.rotation.set(originalRot.x, originalRot.y, originalRot.z);
        this.parts.dice.position.y = 1.15;
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

  // ═══ BLOOD STATION ═══
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
  if(e.code === 'Tab'){ e.preventDefault(); return; }
});

document.addEventListener('keyup', e=>{
  if(hubMode) keys[e.code] = false;
});

document.addEventListener('mousemove', e=>{
  if(!hubMode || hubCasinoActive || hubDiceActive || hubBloodActive || isNestActive) return;
  if(!document.pointerLockElement) return;
  hubPlayer.yaw -= e.movementX * .002;
  hubPlayer.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, hubPlayer.pitch - e.movementY * .002));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = hubPlayer.yaw;
  camera.rotation.x = hubPlayer.pitch;
});

document.addEventListener('mousedown', e=>{
  if(!hubMode) return;
  if(hubCasinoActive || hubDiceActive || hubBloodActive || isNestActive) return;
  if(!document.pointerLockElement){
    if(e.button === 0) document.body.requestPointerLock();
    return;
  }
  if(e.button === 0){ hub.mouseDown = true; }
  if(e.button === 2){ hub.isAiming = true; }
});

document.addEventListener('mouseup', e=>{
  if(!hubMode) return;
  if(e.button === 0){ if(hub) hub.mouseDown = false; }
  if(e.button === 2){ if(hub) hub.isAiming = false; }
});

console.log('🏨 hub.js загружен');
