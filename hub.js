'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.1 — HUB (Shelter location between waves)

let hubMode = false;
let hubScene = null;
let hubCamera = null;
let hubPlayer = null;
let hubInteractables = [];
let hubNearest = null;
let hubBobPhase = 0;

// Hub state
let hubCasinoSpins = 0;
let hubDiceRolls = 0;
let hubRangeShots = 0;
let hubRangeHits = 0;
let hubRangeActive = false;
let hubCasinoActive = false;
let hubDiceActive = false;

class Hub {
  constructor(){
    this.group = new THREE.Group();
    this.parts = {};
    this.build();
  }

  // ═══ МАТЕРИАЛЫ ═══
  matFloor(){ return new THREE.MeshStandardMaterial({color:0x1a1a22, roughness:.7, metalness:.6}) }
  matWall(){ return new THREE.MeshStandardMaterial({color:0x2a2028, roughness:.9, metalness:.1}) }
  matBrick(){ return new THREE.MeshStandardMaterial({color:0x3a2a28, roughness:.95}) }
  matMetal(){ return new THREE.MeshStandardMaterial({color:0x4a4a52, roughness:.4, metalness:.9}) }
  matDarkMetal(){ return new THREE.MeshStandardMaterial({color:0x1a1a1e, roughness:.6, metalness:.7}) }
  matNeon(color, emissive){ return new THREE.MeshStandardMaterial({color, emissive:emissive||color, emissiveIntensity:1.2, transparent:true, opacity:.9}) }
  matWood(){ return new THREE.MeshStandardMaterial({color:0x5a3a1a, roughness:.85}) }
  matVelvet(){ return new THREE.MeshStandardMaterial({color:0x6a0a2a, roughness:.9, metalness:.05}) }

  // ═══ ХЕЛПЕРЫ ═══
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

  // ═══ ПОСТРОЙКА ═══
  build(){
    const ROOM_R = 8, ROOM_H = 4.2;

    // ── ПОЛ: круглый металлический с сеткой ──
    const floor = this.cyl(ROOM_R, ROOM_R, .1, 32, this.matFloor(), 0, 0, 0);
    // Плитка-сетка (линии)
    for(let r=1; r<8; r+=1){
      this.tor(r, .015, 4, 32, new THREE.MeshBasicMaterial({color:0x00aa66, transparent:true, opacity:.25}), 0, .06, 0, null, Math.PI/2,0,0);
    }
    for(let i=0; i<8; i++){
      const ang = i/8*Math.PI*2;
      this.box(.02,.02, ROOM_R*2, new THREE.MeshBasicMaterial({color:0x00aa66, transparent:true, opacity:.15}),
        0, .06, 0, null);
    }

    // ── СТЕНЫ: цилиндр ──
    const wall = this.cyl(ROOM_R, ROOM_R, ROOM_H, 32, this.matWall(), 0, ROOM_H/2, 0);
    wall.material.side = THREE.BackSide;
    // Кирпичи — рисуем как декоративные горизонтальные полосы
    for(let h=1; h<ROOM_H; h+=.5){
      this.tor(ROOM_R-.05, .03, 4, 48, new THREE.MeshBasicMaterial({color:0x0a0505}), 0, h, 0, null, Math.PI/2,0,0);
    }

    // ── ПОТОЛОК: полупрозрачный, с трубами ──
    const ceiling = this.cyl(ROOM_R, ROOM_R, .05, 32, new THREE.MeshBasicMaterial({color:0x0a0510, transparent:true, opacity:.85}), 0, ROOM_H, 0);
    // Трубы по потолку
    for(let i=0; i<4; i++){
      const a = i/4*Math.PI*2 + Math.PI/4;
      this.cyl(.08,.08, ROOM_R*1.6, 8, this.matMetal(), 0, ROOM_H-.2, 0, null, 0)
        .rotation.set(0, a, 0);
    }

    // ── ЦЕНТР: логотип SHELTER ──
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.8, 0);
    this.group.add(centerGroup);
    // Кольцо неоновое
    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, .06, 8, 32),
      this.matNeon(0x00ff88, 0x00aa55)
    );
    neonRing.rotation.x = Math.PI/2;
    centerGroup.add(neonRing);
    // Двойное кольцо
    const neonRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(.9, .04, 8, 24),
      this.matNeon(0xff8800, 0xaa4400)
    );
    neonRing2.rotation.x = Math.PI/2;
    centerGroup.add(neonRing2);
    // Вращение
    this.parts.centerRing = neonRing;
    this.parts.centerRing2 = neonRing2;
    // Центральный столб
    this.cyl(.15, .25, 1.4, 12, this.matDarkMetal(), 0, .7, 0);

    // ═══ 5 ИНТЕРАКТИВНЫХ ЗОН ═══
    // 0: Телепортер (север, z=-6)
    this.buildTeleporter(0, -6, 0);
    // 1: Стол карт (СЗ, x=-6, z=-3)
    this.buildCardTable(-6, -3, Math.PI/4);
    // 2: Казино (СВ, x=6, z=-3)
    this.buildCasino(6, -3, -Math.PI/4);
    // 3: Кости (ЮВ, x=6, z=4)
    this.buildDice(6, 4, -Math.PI*3/4);
    // 4: Тир (ЮЗ, x=-6, z=4)
    this.buildRange(-6, 4, Math.PI*3/4);

    // ═══ ДЕКОРАЦИИ: бар, стулья, плакаты ═══
    // Барная стойка (юг)
    const barGroup = new THREE.Group();
    barGroup.position.set(0, 0, 6.5);
    this.group.add(barGroup);
    this.box(4.5, 1.1, .5, this.matWood(), 0, .55, 0, barGroup);
    this.box(4.6, .1, .55, this.matMetal(), 0, 1.15, 0, barGroup);
    // Бутылки на баре
    const bottleColors = [0x00aa55, 0xaa2222, 0x2266aa, 0xaa8800];
    for(let i=0; i<8; i++){
      const b = this.cyl(.05,.06,.3+Math.random()*.2, 6, new THREE.MeshStandardMaterial({color:bottleColors[i%4], emissive:bottleColors[i%4], emissiveIntensity:.3}), -1.8+i*.5, 1.35, 0, barGroup);
    }
    // Барные стулья
    for(let i=0; i<3; i++){
      const sx = -1.4 + i*1.4, sz = 5.6;
      this.cyl(.25,.25,.1,12, this.matMetal(), sx, .55, sz);
      this.cyl(.05,.05,.55,8, this.matMetal(), sx, .25, sz);
      this.cyl(.2,.15,.05,12, this.matDarkMetal(), sx, .05, sz);
    }

    // ═══ ОСВЕЩЕНИЕ ═══
    // Общий ambient хаба
    const amb = new THREE.AmbientLight(0x221122, .6);
    this.group.add(amb);
    // Pointlight в центре
    const centerLight = new THREE.PointLight(0xff8800, 2, 12);
    centerLight.position.set(0, 2.5, 0);
    this.group.add(centerLight);
    this.parts.centerLight = centerLight;
    // По одному на зону
    const zoneLights = [
      {pos:[0,3,-6], color:0x8844ff},   // Телепортер (фиолет)
      {pos:[-6,3,-3], color:0xffaa00},  // Карты (жёлтый)
      {pos:[6,3,-3], color:0xff2266},   // Казино (красный)
      {pos:[6,3,4], color:0x00ddff},    // Кости (циан)
      {pos:[-6,3,4], color:0x88ff00},   // Тир (зелёный)
    ];
    zoneLights.forEach(zl=>{
      const l = new THREE.PointLight(zl.color, 1.5, 6);
      l.position.set(...zl.pos);
      this.group.add(l);
    });

    // ═══ ЗВЁЗДЫ НА ПОТОЛКЕ ═══
    for(let i=0; i<60; i++){
      const theta = Math.random()*Math.PI*2;
      const r = Math.random()*ROOM_R*.9;
      const star = this.sph(.02,4,4, new THREE.MeshBasicMaterial({color:0xffffff}), Math.cos(theta)*r, ROOM_H-.1, Math.sin(theta)*r);
      star.userData.twinkle = Math.random()*Math.PI*2;
    }

    return this.group;
  }

  // ═══ ЗОНЫ ═══
  buildTeleporter(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);

    // Подиум
    this.cyl(1.4, 1.6, .2, 24, this.matDarkMetal(), 0, .1, 0, g);
    this.cyl(1.35, 1.35, .05, 24, this.matMetal(), 0, .22, 0, g);

    // Стойки-арки (2)
    for(let s of [-1, 1]){
      this.cyl(.1,.15, 3, 8, this.matDarkMetal(), s*1.2, 1.5, 0, g);
      // Кольцо сверху
      this.tor(.3, .06, 6, 12, this.matNeon(0x8844ff), s*1.2, 3, 0, g, Math.PI/2,0,0);
    }

    // Энергетическое поле (портал)
    const portalMat = new THREE.MeshBasicMaterial({color:0x8844ff, transparent:true, opacity:.35, side:THREE.DoubleSide, depthWrite:false});
    const portal = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), portalMat);
    portal.position.set(0, 1.6, 0);
    g.add(portal);
    this.parts.portal = portal;

    // Внутреннее свечение
    const glow = new THREE.PointLight(0x8844ff, 3, 4);
    glow.position.set(0, 1.6, 0);
    g.add(glow);

    // Табличка
    this.box(2, .4, .05, new THREE.MeshStandardMaterial({color:0x111, emissive:0x8844ff, emissiveIntensity:.7}), 0, 3.6, -.5, g);

    this.parts.teleporter = g;
    this.registerInteractable('teleporter', g, 'ТЕЛЕПОРТЕР', 1.8, 0x8844ff);
  }

  buildCardTable(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);

    // Ножки стола
    for(let s1 of [-1,1]) for(let s2 of [-1,1]){
      this.cyl(.08,.1,.8,8, this.matMetal(), s1*.7, .4, s2*.5, g);
    }
    // Столешница
    this.box(2, .1, 1.3, this.matWood(), 0, .85, 0, g);
    // Зелёное сукно
    this.box(1.9, .02, 1.2, new THREE.MeshStandardMaterial({color:0x0a5a2a, roughness:.9}), 0, .92, 0, g);

    // 3 карты над столом (голограммы)
    for(let i=0; i<3; i++){
      const card = this.box(.3, .42, .01,
        new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:.6}),
        -.6+i*.6, 1.15, 0, g);
      card.userData.float = i*.8;
      card.userData.origY = 1.15;
    }

    // Табличка
    this.box(2, .35, .05, new THREE.MeshStandardMaterial({color:0x111, emissive:0xffaa00, emissiveIntensity:.7}), 0, 2.2, -.7, g);

    this.parts.cardTable = g;
    this.parts.cardTablePos = new THREE.Vector3(x, 0, z);
    this.registerInteractable('cards', g, 'СТОЛ КАРТ', 2.5, 0xffaa00);
  }

  buildCasino(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);

    // Корпус автомата
    this.box(1.4, 2.2, .8, this.matDarkMetal(), 0, 1.1, 0, g);
    // Верхняя арка (неон)
    this.tor(.7, .05, 8, 16, this.matNeon(0xff2266), 0, 2.3, .35, g);
    // Экран
    this.box(1.2, .9, .05, new THREE.MeshBasicMaterial({color:0x110011}), 0, 1.5, .42, g);
    // 3 барабана (символы)
    this.parts.casinoReels = [];
    for(let i=0; i<3; i++){
      const reel = this.box(.3, .3, .02, new THREE.MeshBasicMaterial({color:0xff2266, transparent:true, opacity:.8}), -.4+i*.4, 1.5, .45, g);
      this.parts.casinoReels.push(reel);
    }
    // Рычаг справа
    this.cyl(.04,.04,.4,6, this.matMetal(), .8, 1.5, 0, g, Math.PI/2);
    this.sph(.1,8,8, new THREE.MeshStandardMaterial({color:0xff2222, emissive:0x880000, emissiveIntensity:.5}), .8, 1.5, .2, g);
    // Панель управления
    this.box(1.2, .3, .15, this.matMetal(), 0, .5, .45, g);
    this.parts.casinoBtn = this.sph(.08,8,8, this.matNeon(0xffaa00), -.3, .5, .55, g);

    // Табличка
    this.box(1.5, .35, .05, new THREE.MeshStandardMaterial({color:0x111, emissive:0xff2266, emissiveIntensity:.8}), 0, 2.9, 0, g);

    this.registerInteractable('casino', g, 'КАЗИНО (10💰)', 2.5, 0xff2266);
  }

  buildDice(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);

    // Подиум
    this.cyl(.8, .9, .4, 16, this.matDarkMetal(), 0, .2, 0, g);
    // Бархатная подушка
    this.sph(.5, 12, 8, this.matVelvet(), 0, .55, 0, g).scale.set(1.2,.4,1.2);
    // Кубик d20
    const diceMat = new THREE.MeshStandardMaterial({color:0xffdd00, metalness:.7, roughness:.3, emissive:0xaa5500, emissiveIntensity:.3});
    const diceGeo = new THREE.IcosahedronGeometry(.3, 0);
    const dice = new THREE.Mesh(diceGeo, diceMat);
    dice.position.set(0, 1.15, 0);
    g.add(dice);
    this.parts.dice = dice;
    // Число на кубике (текстура невозможна, поэтому делаем точечные markers)
    // Свет
    const diceLight = new THREE.PointLight(0xffdd00, 1.5, 3);
    diceLight.position.set(0, 1.5, 0);
    g.add(diceLight);

    // Табличка
    this.box(1.5, .35, .05, new THREE.MeshStandardMaterial({color:0x111, emissive:0x00ddff, emissiveIntensity:.8}), 0, 2.5, 0, g);

    this.registerInteractable('dice', g, 'КОСТИ (5💰)', 2.5, 0x00ddff);
  }

  buildRange(x, z, ry){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.group.add(g);

    // Стрельбище: 3 мишени
    this.parts.rangeTargets = [];
    for(let i=0; i<3; i++){
      const tx = -.8 + i*.8;
      const tz = -2;
      // Стойка
      this.cyl(.06,.08,.5,6, this.matMetal(), tx, .25, tz, g);
      // Мишень — диск с бычком
      const targetMat = new THREE.MeshStandardMaterial({color:0xffcc00, roughness:.5});
      const target = new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.05,16), targetMat);
      target.rotation.x = Math.PI/2;
      target.position.set(tx, 1.1, tz);
      g.add(target);
      // Красный центр
      const centerMat = new THREE.MeshBasicMaterial({color:0xff2200});
      const center = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.06,12), centerMat);
      center.rotation.x = Math.PI/2;
      center.position.set(tx, 1.1, tz+.01);
      g.add(center);
      this.parts.rangeTargets.push({mesh:target, center, baseX:tx, phase:i*Math.PI*2/3});
    }

    // Линия стрельбы (тонкий барьер)
    this.box(2.5, .1, .1, this.matMetal(), 0, 1, 0, g);
    // Подставка для оружия
    this.box(2.8, .15, .3, this.matDarkMetal(), 0, .05, 1.2, g);

    // Табличка
    this.box(1.5, .35, .05, new THREE.MeshStandardMaterial({color:0x111, emissive:0x88ff00, emissiveIntensity:.8}), 0, 2.5, 0, g);

    this.registerInteractable('range', g, 'ТИР', 2.5, 0x88ff00);
  }

  registerInteractable(id, group, label, radius, color){
    hubInteractables.push({
      id, group, label, radius, color,
      worldPos: group.position.clone(),
      hint: null
    });
  }

  // ═══ ВХОД / ВЫХОД ═══
  enter(){
    hubMode = true;

    // Создаём scene хаба (если ещё нет)
    if(!hubScene){
      hubScene = new THREE.Scene();
      hubScene.background = new THREE.Color(0x050308);
      hubScene.fog = new THREE.Fog(0x050308, 6, 20);
      hubScene.add(this.group);
    }

    // Переносим камеру
    if(scene.children.includes(camera)) scene.remove(camera);
    hubScene.add(camera);

    // Инициализируем hub player
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

    // Сброс счётчиков на визит
    hubCasinoSpins = 0;
    hubDiceRolls = 0;
    hubRangeShots = 0;
    hubRangeHits = 0;
    hubCasinoActive = false;
    hubDiceActive = false;
    hubRangeActive = false;

    // Pointer lock
    document.body.requestPointerLock();

    // HUD
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    const zonesEl = document.getElementById('hub-zones');
    if(zonesEl) zonesEl.style.display = 'block';
    updateHubHUD();

    showDebugToast('🏨 УБЕЖИЩЕ — WASD ходьба, E взаимодействие');
    audio.play('sun');
  }

  exit(){
    hubMode = false;
    if(document.pointerLockElement) document.exitPointerLock();

    // Возвращаем камеру на арену
    if(hubScene && hubScene.children.includes(camera)) hubScene.remove(camera);
    if(!scene.children.includes(camera)) scene.add(camera);

    // Восстанавливаем позицию игрока на арене (для startWave не важно)
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // HUD
    const hintEl = document.getElementById('hub-interact-hint');
    if(hintEl) hintEl.style.display = 'none';
    const zonesEl = document.getElementById('hub-zones');
    if(zonesEl) zonesEl.style.display = 'none';

    // Продолжаем
    continueToWave();
  }

  // ═══ UPDATE ═══
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
    if(this.parts.rangeTargets){
      this.parts.rangeTargets.forEach((t,i)=>{
        const x = t.baseX + Math.sin(Date.now()*.002 + t.phase)*.4;
        t.mesh.position.x = x;
        t.center.position.x = x;
      });
    }

    // Ходьба
    if(!hubCasinoActive && !hubDiceActive && !hubRangeActive && !isNestActive && !isSynergyPanelOpen){
      this.updatePlayerMovement(dt);
    }

    // Проверка близости к interactables
    this.checkInteract(dt);

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

      // Проверка коллизий со стенами (R=7.5)
      const nx = hubPlayer.position.clone();
      nx.x += mv.x;
      if(Math.sqrt(nx.x*nx.x + nx.z*nx.z) < 7.5) hubPlayer.position.x = nx.x;

      const nz = hubPlayer.position.clone();
      nz.z += mv.z;
      if(Math.sqrt(nz.x*nz.x + nz.z*nz.z) < 7.5) hubPlayer.position.z = nz.z;

      // Проверка коллизий с зонами (круг 0.8 м у каждого)
      for(const zone of hubInteractables){
        const dx = hubPlayer.position.x - zone.worldPos.x;
        const dz = hubPlayer.position.z - zone.worldPos.z;
        if(Math.sqrt(dx*dx+dz*dz) < 1){
          // Отталкивание
          const len = Math.sqrt(dx*dx+dz*dz) || 1;
          hubPlayer.position.x = zone.worldPos.x + dx/len*1;
          hubPlayer.position.z = zone.worldPos.z + dz/len*1;
        }
      }

      // Боб камеры
      hubBobPhase += dt*10;
      const bobY = Math.sin(hubBobPhase*2)*.03;
      const bobX = Math.cos(hubBobPhase)*.02;
      camera.position.x = hubPlayer.position.x + bobX;
      camera.position.z = hubPlayer.position.z;
      camera.position.y = hubPlayer.position.y + bobY;
    } else {
      camera.position.copy(hubPlayer.position);
    }
  }

  checkInteract(dt){
    hubNearest = null;
    let minDist = 3;

    for(const zone of hubInteractables){
      const dx = hubPlayer.position.x - zone.worldPos.x;
      const dz = hubPlayer.position.z - zone.worldPos.z;
      const d = Math.sqrt(dx*dx+dz*dz);
      if(d < minDist){
        minDist = d;
        hubNearest = zone;
      }
    }

    const hintEl = document.getElementById('hub-interact-hint');
    if(hubNearest && minDist < 2.8){
      if(hintEl){
        hintEl.style.display = 'block';
        hintEl.innerHTML = `<span style="display:inline-block;padding:2px 10px;border:2px solid #fff;border-radius:4px;margin-right:8px">[E]</span><span style="color:${'#'+zone.colorHex(hubNearest.color)}">${hubNearest.label}</span>`;
        hintEl.style.borderColor = '#'+zone.colorHex(hubNearest.color);
        hintEl.style.color = '#'+zone.colorHex(hubNearest.color);
        hintEl.style.boxShadow = `0 0 20px #${zone.colorHex(hubNearest.color)}`;
      }
    } else {
      if(hintEl) hintEl.style.display = 'none';
    }
  }

  // ═══ ВЗАИМОДЕЙСТВИЕ ═══
  interact(){
    if(!hubNearest) return;
    audio.cardPick();

    switch(hubNearest.id){
      case 'teleporter':
        this.exit();
        break;
      case 'cards':
        openHubDraft();
        break;
      case 'casino':
        openCasino();
        break;
      case 'dice':
        openDice();
        break;
      case 'range':
        openRange();
        break;
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
      // JACKPOT
      const legendaries = weapons.filter(w => w.rarity === 'legendary' && !w.memWeapon);
      const w = legendaries[Math.floor(Math.random()*legendaries.length)];
      applyCardEffect({cardType:'weapon', weapon:w, rarity:'legendary', tags:w.tags||[]});
      this.showCasinoMessage(`🎉 ДЖЕКПОТ! ${w.name}`, '#ff0');
      audio.duoUp();
    } else if(maxCount === 2){
      // 2 одинаковых
      const rarities = ['rare', 'epic'];
      const rarity = rarities[Math.floor(Math.random()*rarities.length)];
      const card = rollCardOfType('upgrade');
      const filt = UPGRADE_CARDS.filter(u => u.rarity === rarity);
      const u = filt.length > 0 ? filt[Math.floor(Math.random()*filt.length)] : UPGRADE_CARDS[0];
      applyCardEffect({cardType:'upgrade', upgrade:u, rarity:u.rarity, tags:[u.tag].filter(Boolean)});
      this.showCasinoMessage(`✨ Пара! ${u.name}`, '#8f8');
      audio.pickup();
    } else {
      // Ничего
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

    // Анимация кубика в 3D
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
      // NAT 20
      const legendaries = weapons.filter(w => w.rarity === 'legendary' && !w.memWeapon);
      const w = legendaries[Math.floor(Math.random()*legendaries.length)];
      applyCardEffect({cardType:'weapon', weapon:w, rarity:'legendary', tags:w.tags||[]});
      this.showDiceMessage(`💀 NAT 20! ${w.name}`, '#ff0');
      audio.duoUp();
    } else if(roll >= 16){
      // Legendary
      const pool = UPGRADE_CARDS.filter(u => u.rarity === 'legendary' || u.rarity === 'epic');
      const u = pool[Math.floor(Math.random()*pool.length)];
      applyCardEffect({cardType:'upgrade', upgrade:u, rarity:u.rarity, tags:[u.tag].filter(Boolean)});
      this.showDiceMessage(`🌟 ${roll}! ${u.name}`, '#f80');
      audio.pickup();
    } else if(roll >= 11){
      // Rare card
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
  }

  // ═══ RANGE ═══
  openRange(){
    hubRangeActive = true;
    hubRangeShots = 10;
    hubRangeHits = 0;
    const ov = document.getElementById('range-overlay');
    if(!ov) return;
    ov.style.display = 'block';
    this.updateRangeUI();
    audio.slotDing();
  }

  updateRangeUI(){
    const info = document.getElementById('range-info');
    if(info) info.innerHTML = `Выстрелов: <b style="color:#f80">${hubRangeShots}</b> · Попаданий: <b style="color:#8f8">${hubRangeHits}</b> · +${hubRangeHits*2}💰`;
    const btn = document.getElementById('range-shoot-btn');
    if(btn) btn.disabled = hubRangeShots <= 0;
  }

  shootRange(){
    if(hubRangeShots <= 0) return;
    hubRangeShots--;
    // Имитация стрельбы — просто рандом с ~50% шансом попадания
    const hit = Math.random() < 0.5;
    if(hit){
      hubRangeHits++;
      credits += 2;
      updateHubHUD();
      this.showRangeMessage('🎯 ПОПАДАНИЕ! +2💰', '#8f8');
    } else {
      this.showRangeMessage('💨 Промах', '#888');
    }
    audio.play('pistol');
    if(hubRangeShots === 0){
      setTimeout(()=>{
        this.showRangeMessage(`Итог: ${hubRangeHits}/10 · +${hubRangeHits*2}💰`, '#ff0');
        audio.pickup();
      }, 400);
    }
    this.updateRangeUI();
  }

  showRangeMessage(text, color){
    const msg = document.getElementById('range-msg');
    if(msg){ msg.textContent = text; msg.style.color = color; msg.style.textShadow = `0 0 10px ${color}` }
  }

  closeRange(){
    hubRangeActive = false;
    const ov = document.getElementById('range-overlay');
    if(ov) ov.style.display = 'none';
  }
}

// Хелпер для color->hex
Object.defineProperty(Number.prototype, 'colorHex', {
  get: function(){ return this.toString(16).padStart(6,'0') }
});
function colorHex(num){ return num.toString(16).padStart(6,'0') }
window.colorHex = colorHex;

// ═══ ГЛОБАЛЬНЫЙ ХАБ ═══
let hub = null;

function enterHub(){
  if(!hub){
    hub = new Hub();
  }
  hub.enter();
}

function updateHubHUD(){
  const creditEl = document.getElementById('hub-credits');
  if(creditEl) creditEl.textContent = '💰 ' + credits;
  const waveEl = document.getElementById('hub-wave');
  if(waveEl) waveEl.textContent = 'ВОЛНА ' + wave;
}

// ═══ DRAFT В ХАБЕ (открывает существующий nest screen) ═══
function openHubDraft(){
  // Перенастраиваем nest screen — он уже есть, но используем его в хабе
  if(isNestActive) return;

  // Готовим драфт
  currentDraft = [];
  for(let i=0; i<3; i++){
    currentDraft.push(rollCardSmart(false));
  }
  renderNestScreen(false);

  // Делаем кнопки drafта в стиле хаба
  // (уже стилизованы в nest-screen)

  // Показываем
  isNestActive = true;
  const ns = document.getElementById('nest-screen');
  if(ns) ns.style.display = 'block';
  if(document.pointerLockElement) document.exitPointerLock();
}

// Переопределяем continueToWave для работы из хаба
const _originalContinueToWave = continueToWave;
continueToWave = function(){
  if(hubMode){
    // Возврат в хаб — nest screen закрывается, игрок остаётся в хабе
    const ns = document.getElementById('nest-screen');
    if(ns) ns.style.display = 'none';
    isNestActive = false;
    pickLocked = false;
    if(!document.pointerLockElement) document.body.requestPointerLock();
    return;
  }
  _originalContinueToWave.apply(this, arguments);
};

// ═══ KEYBOARD / MOUSE для хаба ═══
document.addEventListener('keydown', e=>{
  if(!hubMode) return;

  // Мини-игры
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
  if(hubRangeActive){
    if(e.code === 'KeyE' || e.code === 'Space'){ hub.shootRange(); e.preventDefault(); return; }
    if(e.code === 'Escape'){ hub.closeRange(); e.preventDefault(); return; }
    return;
  }

  // Драфт (nest screen)
  if(isNestActive) return; // game.js уже обрабатывает

  // Хаб
  keys[e.code] = true;
  if(e.code === 'KeyE'){ hub.interact(); e.preventDefault(); return; }
  if(e.code === 'Tab'){ /* TODO: синергии */ e.preventDefault(); return; }
});

// Перехват keyup для хаба (иначе keys залипнут)
document.addEventListener('keyup', e=>{
  if(hubMode) keys[e.code] = false;
});

document.addEventListener('mousemove', e=>{
  if(!hubMode || hubCasinoActive || hubDiceActive || hubRangeActive || isNestActive) return;
  if(!document.pointerLockElement) return;

  hubPlayer.yaw -= e.movementX * .002;
  hubPlayer.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, hubPlayer.pitch - e.movementY * .002));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = hubPlayer.yaw;
  camera.rotation.x = hubPlayer.pitch;
});

document.addEventListener('mousedown', e=>{
  if(!hubMode) return;
  if(hubCasinoActive || hubDiceActive || hubRangeActive || isNestActive) return;
  // Перезапрашиваем pointer lock
  if(!document.pointerLockElement) document.body.requestPointerLock();
});

console.log('🏨 hub.js загружен');
