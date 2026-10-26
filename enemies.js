'use strict';
// INDUSTRIAL ROGUE SHOOTER v5.0 — ENEMIES (with synergy effects)

let _icegunShotCounter = 0;

class Enemy {
  constructor(type, position, opts){
    opts = opts || {};
    this.type = type;
    this.isCow = type === 'cow';
    this.dead = false;
    this.group = new THREE.Group();
    this.parts = {};
    this.walkPhase = Math.random()*Math.PI*2;
    this.overload = 0;
    this.lastAttackTime = 0;
    this.damageFlash = 0;
    this.slowTimer = 0;
    this.wiggleOffset = Math.random()*Math.PI*2;
    this.wiggleSpeed = .5+Math.random()*1.5;
    this.strafeDirection = Math.random()>.5?1:-1;
    this.strafeTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnSpread = 0;
    this._burnSpreadApplied = false;
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this.poisonStacks = 1;
    this.bleedTimer = 0;
    this.bleedDps = 0;
    this.spawnTimer = 0;
    this.iceHits = 0;
    this.frozenTimer = 0;
    this.iceResetTimer = 0;
    this._wasFrozen = false;
    this.sawEmbedded = null;
    this.puddleTimer = 0;
    this.puddleInterval = 2+Math.random()*2;
    this.shootTimer = 0;
    this.speedBoost = 0;
    this.chargeTime = 0;
    this.chargeCooldown = 2;
    this.chargeDir = {x:0,z:1};
    this.leapCooldown = 1.5;
    this.dodgeTimer = 0.5+Math.random();
    this.stuckTimer = 0;
    this.unstuckDuration = 0;
    this.unstuckSign = 1;
    this.lastPosCheck = new THREE.Vector3();
    this.lastPosCheck.copy(position);
    this.throwAnim = 0;
    this.baseY = 0;
    this.segmentCount = opts.segmentCount || 8;
    this.segments = [];
    this.segmentWorldPos = [];
    this.lastHitSegment = -1;
    this.copiesLeft = 0;
    this.illusionPhase = 'hidden';
    this.illusionTimer = 0;
    this.mortarCharge = 0;
    this.mortarCharging = false;
    this.wallSide = null;
    this.wallSlideDir = 1;
    this.wallPos = 0;
    this.vkState = 'buried';
    this.vkTimer = 0;
    this.isFlying = false;
    this.wormState = 'approach';
    this.wormTimer = 0;
    this.chessState = 'idle';
    this.chessTimer = 1.5 + Math.random()*2;
    this.chessTarget = null;
    this.chessTelegraph = null;
    this.cheerVel = null;
    this.alienBurstState = 'idle';
    this.alienBurstTimer = 2 + Math.random()*2;
    this.alienBurstCount = 0;
    this.flipState = 'run';
    this.flipTimer = 1 + Math.random();
    this.flipProgress = 0;
    this._ufoInit = false;
    this.cowCooldown = 2 + Math.random()*2;
    this.cowsDropped = 0;

    this.setupStats();
    this.buildModel();

    if(this.type === 'illusionist'){
      this.group.traverse(o=>{
        if(o.material){
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m=>{ m.transparent = true; m.opacity = 0 });
        }
      });
    }
    if(this.parts.bodyMat){
      this.origEmissive = this.parts.bodyMat.emissive.clone();
      this.origEmissiveIntensity = this.parts.bodyMat.emissiveIntensity;
    }
    this.group.position.copy(position);
    this.rotationY = Math.atan2(player.position.x-position.x, player.position.z-position.z);
    this.group.rotation.y = this.rotationY;
    scene.add(this.group);

    if(this.type === 'worm' && opts.positions){
      for(let i=0;i<Math.min(this.segmentCount, opts.positions.length);i++){
        this.segmentWorldPos[i] = opts.positions[i].clone();
        const local = opts.positions[i].clone().sub(position);
        this.segments[i].mesh.position.copy(local);
      }
      this.group.position.copy(opts.positions[0]);
      this.segmentWorldPos[0].copy(opts.positions[0]);
    }
    if(this.type === 'wallbreaker'){
      const dN = Math.abs(position.z + 25), dS = Math.abs(position.z - 25);
      const dW = Math.abs(position.x + 25), dE = Math.abs(position.x - 25);
      const mn = Math.min(dN, dS, dW, dE);
      if(mn === dN){ this.wallSide = 'n'; this.group.position.set(position.x, 0.4, -24.4) }
      else if(mn === dS){ this.wallSide = 's'; this.group.position.set(position.x, 0.4, 24.4) }
      else if(mn === dW){ this.wallSide = 'w'; this.group.position.set(-24.4, 0.4, position.z) }
      else { this.wallSide = 'e'; this.group.position.set(24.4, 0.4, position.z) }
      this.wallPos = this.wallSide === 'n' || this.wallSide === 's' ? this.group.position.x : this.group.position.z;
    }
    if(this.type === 'chess_horse' || this.type === 'chess_elephant'){
      this.group.position.x = Math.round(this.group.position.x/2)*2;
      this.group.position.z = Math.round(this.group.position.z/2)*2;
    }
  }

  eA(g,mat,x,y,z,rx,ry,rz,par){
    const m = new THREE.Mesh(g,mat);
    m.position.set(x||0,y||0,z||0);
    m.rotation.set(rx||0,ry||0,rz||0);
    (par||this.group).add(m);
    return m;
  }
  eBox(w,h,d,mat,x,y,z){ return this.eA(new THREE.BoxGeometry(w,h,d),mat,x,y,z) }
  eSph(r,ws,hs,mat,x,y,z){ return this.eA(new THREE.SphereGeometry(r,ws,hs),mat,x,y,z) }
  eCyl(rt,rb,h,s,mat,x,y,z,rx){ return this.eA(new THREE.CylinderGeometry(rt,rb,h,s),mat,x,y,z,rx===undefined?Math.PI/2:rx) }
  eCone(r,h,s,mat,x,y,z,rx){ return this.eA(new THREE.ConeGeometry(r,h,s),mat,x,y,z,rx||0) }

  setupStats(){
    const hm = modifiers.includes('2x_hp') ? 2 : 1;
    const dm = modifiers.includes('2x_damage') ? 2 : 1;
    const sm = modifiers.includes('faster') ? 1.5 : 1;
    const sl = modifiers.includes('slow_time') ? .7 : 1;
    // Global wave scaling (set by game.js)
    const surgeHP = window.waveSurgeHP || 1;
    const surgeDMG = window.waveSurgeDMG || 1;
    const waveHP = (1+(wave-1)*BALANCE.waveHPBase + Math.max(0,wave-10)*BALANCE.waveHPAccel) * surgeHP;
    const waveDMG = (1+(wave-1)*BALANCE.waveDMGBase + Math.max(0,wave-15)*BALANCE.waveDMGAccel) * surgeDMG;
    const S = (b,r)=>(b+Math.random()*r)*sm*sl;
    const stats = {
      human:[54,.03,.01,10,.7,1.75,1.55,.3],robot:[90,.02,.008,15,.9,1.7,1.45,.35],
      runner:[36,.06,.02,8,.6,.7,0,0],tank:[810,.02,.008,25,1.4,2,1.6,.4],
      drone:[45,.04,.015,12,.6,.8,0,0],shooter:[63,.025,.01,15,.7,1.75,1.5,.25],
      bomber:[72,.05,.02,5,.8,1.5,0,0],spitter:[54,.02,.01,20,.7,1.7,1.45,.35],
      gunner:[81,.02,.01,7,.7,1.75,1.55,.3],sniper_enemy:[72,.015,.005,40,.7,1.75,1.55,.3],
      shotgunner:[90,.025,.01,8,.75,1.75,1.55,.3],rocketeer:[99,.02,.01,35,.8,1.8,1.6,.3],
      spawner:[144,.015,.005,5,.9,2,1.6,.35],enemy_shotgunner:[60,.02,.01,7,.7,1.75,1.55,.3],
      slug:[45,.012,.005,8,.65,.55,0,0],trickster:[120,.04,.015,15,.8,1.8,1.6,.35],
      spider:[80,.03,.005,8,.85,1.3,0,0],chariot:[480,.03,.008,28,1.3,1.5,0,0],
      ninja:[55,.055,.01,10,.6,1.7,1.55,.28],fortifier:[120,.012,.005,6,.9,1.7,1.55,.3],
      worm:[75,.09,.02,14,.55,.9,0,0],mortar:[110,.02,.008,22,.75,1.7,1.55,.3],
      illusionist:[130,.03,.01,12,.65,1.75,1.55,.3],illusion_copy:[20,.04,.015,5,.55,1.65,1.5,.25],
      wallbreaker:[140,.01,.005,8,.7,1.4,0,0],verkhushka:[85,.012,.005,18,.6,1.4,0,0],
      chess_horse:[180,0,0,40,.8,2.0,1.85,.4],chess_elephant:[180,0,0,40,.8,2.2,2.0,.4],
      cheerful:[60,.035,.01,25,.9,1.2,0,0],ufo:[200,.03,.005,15,1.5,1.2,0,0],
      cow:[300,0,0,0,1.0,1.5,0,0],green_alien:[40,.035,.01,12,.5,1.4,1.3,.25],
      hothead:[70,.04,.01,15,.6,1.7,1.6,.3]
    };
    const s = stats[this.type] || stats.human;
    this.health = s[0]*hm*waveHP;
    this.speed = S(s[1], s[2]) * (playerBuffs.enemySpeedMult || 1);
    this.damage = s[3]*dm*waveDMG;
    this.radius = s[4];
    this.height = s[5];
    this.headY = s[6] || 0;
    this.headRadius = s[7] || 0;
    if(this.type === 'worm'){
      this.maxHealth = this.health*this.segmentCount/8;
      this.health = this.maxHealth;
    }
    this.maxHealth = this.health;
    if(this.type === 'bomber') this.explodeRadius = 4;
    if(this.type === 'spawner'){
      this.spawnCooldown = 5+Math.random()*3;
      this.spawnCount = 2+Math.floor(Math.random()*2);
    }
    if(['shooter','spitter','gunner','sniper_enemy','shotgunner','rocketeer','enemy_shotgunner','spider','ninja','fortifier'].includes(this.type)){
      const cds = {shooter:[2,1],spitter:[3,1],gunner:[1,.4],sniper_enemy:[4+Math.random()*3,0],shotgunner:[3.2,1.2],rocketeer:[3,1.5],enemy_shotgunner:[3,1],spider:[2.5,1],ninja:[1.8,.8],fortifier:[2.5,1]};
      const cd = cds[this.type];
      this.shootCooldown = cd[0]+(cd[1]>0?Math.random()*cd[1]:0);
      this.weaponType = this.type === 'sniper_enemy' ? 'sniper'
        : this.type === 'shotgunner' ? 'shotgun' : this.type === 'gunner' ? 'rifle'
        : this.type === 'rocketeer' ? 'rocket' : this.type === 'spitter' ? 'acid'
        : this.type === 'enemy_shotgunner' ? 'enemy_shotgun' : this.type === 'spider' ? 'spider_shot'
        : this.type === 'ninja' ? 'ninja_shuriken' : this.type === 'fortifier' ? 'fortifier_bolt' : 'pistol';
    }
    if(this.type === 'tank'){ this.shootCooldown = 10; this.weaponType = 'tank_shell' }
    if(this.type === 'mortar'){ this.shootCooldown = 3.5+Math.random()*1.5 }
    if(this.type === 'illusionist'){ this.shootCooldown = 1.8+Math.random()*.5 }
    if(this.type === 'verkhushka'){ this.shootCooldown = 2.5+Math.random()*1 }
    if(this.type === 'wallbreaker'){ this.shootCooldown = 1.2+Math.random()*.4 }
    if(this.type === 'drone'){ this.isFlying = true; this.baseY = 1.5 + Math.random()*0.4 }
    if(this.type === 'ufo'){ this.isFlying = true; this.baseY = 4 + Math.random()*0.5 }
    this.canDodge = ['runner','spider','gunner','sniper_enemy','spitter','ninja'].includes(this.type);
    this.dodgeChance = this.type === 'ninja' ? .9 : .7;
  }

  buildModel(){
    const b = {human:()=>this.mHuman(),robot:()=>this.mRobot(),runner:()=>this.mRunner(),tank:()=>this.mTank(),drone:()=>this.mDrone(),shooter:()=>this.mShooter(),bomber:()=>this.mBomber(),spitter:()=>this.mSpitter(),gunner:()=>this.mGunner(),sniper_enemy:()=>this.mSniperE(),shotgunner:()=>this.mShotgunner(),rocketeer:()=>this.mRocketeer(),spawner:()=>this.mSpawner(),enemy_shotgunner:()=>this.mEnemyShotgunner(),slug:()=>this.mSlug(),trickster:()=>this.mTrickster(),spider:()=>this.mSpider(),chariot:()=>this.mChariot(),ninja:()=>this.mNinja(),fortifier:()=>this.mFortifier(),worm:()=>this.mWorm(),mortar:()=>this.mMortar(),illusionist:()=>this.mIllusionist(),illusion_copy:()=>this.mIllusionCopy(),wallbreaker:()=>this.mWallbreaker(),verkhushka:()=>this.mVerkhushka(),chess_horse:()=>this.mChessHorse(),chess_elephant:()=>this.mChessElephant(),cheerful:()=>this.mCheerful(),ufo:()=>this.mUFO(),cow:()=>this.mCow(),green_alien:()=>this.mGreenAlien(),hothead:()=>this.mHothead()};
    if(b[this.type]) b[this.type]();
  }

  mHuman(){
    const cm=new THREE.MeshStandardMaterial({color:0x8b0000,roughness:.7});
    const skin=new THREE.MeshStandardMaterial({color:0xaa7755,roughness:.8});
    const dk=new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.6,metalness:.3});
    this.parts.body=this.eBox(.5,.7,.3,cm,0,1,0); this.parts.body.castShadow=true; this.parts.bodyMat=cm;
    this.eBox(.54,.35,.34,dk,0,1.1,0);
    this.parts.head=this.eSph(.18,10,10,skin,0,1.55,0); this.parts.head.scale.set(1,1.1,1);
    const eye=new THREE.MeshBasicMaterial({color:0xff2200});
    this.eSph(.03,6,6,eye,-.07,1.58,.16); this.eSph(.03,6,6,eye,.07,1.58,.16);
    const smile=this.eA(new THREE.TorusGeometry(.06,.012,6,12,Math.PI),new THREE.MeshBasicMaterial({color:0}),0,1.5,.17);
    smile.rotation.z=Math.PI;
    const ag=new THREE.BoxGeometry(.14,.6,.14);
    this.parts.leftArm=this.eA(ag,cm,-.34,1,0); this.parts.rightArm=this.eA(ag,cm,.34,1,0);
    const lg=new THREE.BoxGeometry(.17,.7,.17), lm=new THREE.MeshStandardMaterial({color:0x333333});
    this.parts.leftLeg=this.eA(lg,lm,-.14,.35,0); this.parts.rightLeg=this.eA(lg,lm,.14,.35,0);
    const bm=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.5});
    this.eBox(.2,.15,.25,bm,-.14,.08,0); this.eBox(.2,.15,.25,bm,.14,.08,0);
  }
  mRobot(){
    const m=new THREE.MeshStandardMaterial({color:0x4a4a4a,metalness:.9,roughness:.3,emissive:0x222222});
    this.parts.body=this.eBox(.8,1,.6,m,0,.75,0); this.parts.bodyMat=m;
    this.parts.head=this.eBox(.5,.4,.5,m,0,1.45,0);
    const em=new THREE.MeshBasicMaterial({color:0xff0000});
    this.parts.eyes=[this.eSph(.08,8,8,em,-.12,1.5,.26),this.eSph(.08,8,8,em,.12,1.5,.26)];
    const ag=new THREE.BoxGeometry(.2,.7,.2);
    this.parts.leftArm=this.eA(ag,m,-.55,.75,0); this.parts.rightArm=this.eA(ag,m,.55,.75,0);
    const lg=new THREE.BoxGeometry(.25,.5,.25);
    this.parts.leftLeg=this.eA(lg,m,-.2,.25,0); this.parts.rightLeg=this.eA(lg,m,.2,.25,0);
  }
  mRunner(){
    const m=new THREE.MeshStandardMaterial({color:0x00aaaa,metalness:.5,roughness:.5,emissive:0x004444});
    this.parts.body=this.eBox(.4,.3,.7,m,0,.4,0); this.parts.bodyMat=m;
    this.parts.head=this.eBox(.3,.25,.4,m,0,.5,.4);
    const em=new THREE.MeshBasicMaterial({color:0xff0000});
    this.eSph(.05,6,6,em,-.1,.55,.6); this.eSph(.05,6,6,em,.1,.55,.6);
    this.parts.legs=[];
    [[-.2,.2,.25],[.2,.2,.25],[-.2,.2,-.25],[.2,.2,-.25]].forEach(p=>{
      this.parts.legs.push(this.eA(new THREE.BoxGeometry(.1,.4,.1),m,...p));
    });
  }
  mTank(){
    const m=new THREE.MeshStandardMaterial({color:0x555555,metalness:.8,roughness:.4});
    this.parts.body=this.eBox(1.5,1.2,1.2,m,0,.8,0); this.parts.bodyMat=m;
    this.parts.head=this.eBox(.5,.4,.5,m,0,1.6,0);
    this.eSph(.15,8,8,new THREE.MeshBasicMaterial({color:0xff0000}),0,1.6,.26);
    const ag=new THREE.BoxGeometry(.4,1,.4);
    this.parts.leftArm=this.eA(ag,m,-.95,.8,0); this.parts.rightArm=this.eA(ag,m,.95,.8,0);
    const lg=new THREE.BoxGeometry(.4,.4,.4);
    this.parts.leftLeg=this.eA(lg,m,-.4,.2,0); this.parts.rightLeg=this.eA(lg,m,.4,.2,0);
  }
  mDrone(){
    const m=new THREE.MeshStandardMaterial({color:0x8888ff,metalness:.9,roughness:.2,emissive:0x222244});
    this.parts.body=this.eSph(.4,12,12,m,0,0,0); this.parts.bodyMat=m;
    this.eSph(.15,8,8,new THREE.MeshBasicMaterial({color:0x00ffff}),0,0,.35);
    const p=new THREE.Group();
    for(let i=0;i<4;i++) this.eA(new THREE.BoxGeometry(.6,.02,.08),new THREE.MeshStandardMaterial({color:0x333333}),0,0,0,0,i/4*Math.PI*2,0,p);
    p.position.y=.4; this.group.add(p); this.parts.propeller=p;
  }
  mHumanLike(color,eyeColor){
    const m=new THREE.MeshStandardMaterial({color,metalness:.6,roughness:.5});
    const dk=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.5,roughness:.6});
    const skin=new THREE.MeshStandardMaterial({color:0xd4a574,roughness:.8});
    this.parts.body=this.eBox(.5,.7,.3,m,0,1,0); this.parts.bodyMat=m;
    this.eBox(.54,.4,.34,dk,0,1.05,0);
    this.parts.head=this.eSph(.18,10,10,skin,0,1.55,0); this.parts.head.scale.set(1,1.1,1);
    this.eSph(.05,8,8,new THREE.MeshBasicMaterial({color:eyeColor}),0,1.58,.16);
    this.eSph(.19,10,8,dk,0,1.6,0);
    const ag=new THREE.BoxGeometry(.14,.6,.14);
    this.parts.leftArm=this.eA(ag,m,-.34,1,0); this.parts.rightArm=this.eA(ag,m,.34,1,0);
    const lg=new THREE.BoxGeometry(.17,.7,.17), lm=new THREE.MeshStandardMaterial({color:0x333333,roughness:.7});
    this.parts.leftLeg=this.eA(lg,lm,-.14,.35,0); this.parts.rightLeg=this.eA(lg,lm,.14,.35,0);
  }
  mShooter(){ this.mHumanLike(0x6a4a2a,0xffaa00) }
  mGunner(){ this.mHumanLike(0x4a3a2a,0xff6600) }
  mShotgunner(){ this.mHumanLike(0x5a3a2a,0xff3300) }
  mRocketeer(){ this.mHumanLike(0x3a3a2a,0xff8800) }
  mBomber(){
    const m=new THREE.MeshStandardMaterial({color:0x8b0000,metalness:.3,roughness:.7,emissive:0x440000,emissiveIntensity:.3});
    this.parts.body=this.eSph(.5,12,12,m,0,.75,0); this.parts.bodyMat=m;
    const bm=new THREE.MeshStandardMaterial({color:0x333333,metalness:.8});
    this.eSph(.15,8,8,bm,-.3,.5,.3); this.eSph(.15,8,8,bm,.3,.5,.3);
    this.parts.spark=this.eSph(.05,6,6,new THREE.MeshBasicMaterial({color:0xffaa00}),0,1.2,0);
  }
  mSpitter(){
    const m=new THREE.MeshStandardMaterial({color:0x2a6a2a,metalness:.4,roughness:.6,emissive:0x00aa00,emissiveIntensity:.2});
    this.parts.body=this.eBox(.5,.8,.4,m,0,.9,0); this.parts.bodyMat=m;
    this.parts.head=this.eSph(.25,8,8,m,0,1.45,0);
    this.parts.mouth=this.eSph(.1,8,8,new THREE.MeshBasicMaterial({color:0x00ff00}),0,1.4,.2);
    const ag=new THREE.BoxGeometry(.15,.6,.15);
    this.parts.leftArm=this.eA(ag,m,-.35,.9,0); this.parts.rightArm=this.eA(ag,m,.35,.9,0);
    const lg=new THREE.BoxGeometry(.18,.6,.18);
    this.parts.leftLeg=this.eA(lg,m,-.15,.3,0); this.parts.rightLeg=this.eA(lg,m,.15,.3,0);
  }
  mSniperE(){
    const m=new THREE.MeshStandardMaterial({color:0x1a1a2a,metalness:.6,roughness:.5});
    const cl=new THREE.MeshStandardMaterial({color:0x2a2a3a,roughness:.7});
    this.parts.body=this.eBox(.5,.7,.3,m,0,1,0); this.parts.bodyMat=m;
    this.parts.head=this.eBox(.35,.35,.35,m,0,1.55,0);
    this.eCone(.25,.3,8,cl,0,1.7,0,0);
    this.eSph(.06,8,8,new THREE.MeshBasicMaterial({color:0xff0000}),0,1.6,.18);
    this.eCyl(.03,.03,.7,8,new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.9,roughness:.2}),.35,1.1,-.4);
    const ag=new THREE.BoxGeometry(.15,.6,.15);
    this.parts.leftArm=this.eA(ag,m,-.35,1,0); this.parts.rightArm=this.eA(ag,m,.35,1,0);
    const lg=new THREE.BoxGeometry(.18,.7,.18), lm=new THREE.MeshStandardMaterial({color:0x333333});
    this.parts.leftLeg=this.eA(lg,lm,-.15,.35,0); this.parts.rightLeg=this.eA(lg,lm,.15,.35,0);
  }
  mEnemyShotgunner(){
    const m=new THREE.MeshStandardMaterial({color:0x5a2a1a,metalness:.6,roughness:.5});
    this.parts.body=this.eBox(.55,.75,.35,m,0,1,0); this.parts.bodyMat=m;
    this.parts.head=this.eBox(.35,.35,.35,m,0,1.55,0);
    this.eSph(.08,8,8,new THREE.MeshBasicMaterial({color:0xff4400}),0,1.6,.18);
    this.eCyl(.03,.03,.4,8,new THREE.MeshStandardMaterial({color:0x3a2a1a,metalness:.7,roughness:.4}),.3,1.05,-.25);
    const ag=new THREE.BoxGeometry(.18,.65,.18);
    this.parts.leftArm=this.eA(ag,m,-.4,1,0); this.parts.rightArm=this.eA(ag,m,.4,1,0);
    const lg=new THREE.BoxGeometry(.2,.7,.2), lm=new THREE.MeshStandardMaterial({color:0x333333});
    this.parts.leftLeg=this.eA(lg,lm,-.18,.35,0); this.parts.rightLeg=this.eA(lg,lm,.18,.35,0);
  }
  mSpawner(){
    const m=new THREE.MeshStandardMaterial({color:0x4a004a,metalness:.7,roughness:.4,emissive:0x880088,emissiveIntensity:.3});
    this.parts.body=this.eBox(.8,1.2,.8,m,0,.8,0); this.parts.bodyMat=m;
    this.parts.head=this.eSph(.3,12,12,m,0,1.6,0);
    this.parts.eye=this.eSph(.1,8,8,new THREE.MeshBasicMaterial({color:0xff00ff}),0,1.65,.25);
    const ag=new THREE.BoxGeometry(.2,.8,.2);
    this.parts.leftArm=this.eA(ag,m,-.6,.8,0); this.parts.rightArm=this.eA(ag,m,.6,.8,0);
    const lg=new THREE.BoxGeometry(.25,.6,.25);
    this.parts.leftLeg=this.eA(lg,m,-.25,.3,0); this.parts.rightLeg=this.eA(lg,m,.25,.3,0);
  }
  mSlug(){
    const m=new THREE.MeshStandardMaterial({color:0x6a2a8a,metalness:.3,roughness:.6,emissive:0x440066,emissiveIntensity:.4});
    this.parts.body=this.eSph(.45,12,12,m,0,.25,0); this.parts.body.scale.set(1,.5,1.4);
    this.parts.bodyMat=m;
    const eye=new THREE.MeshBasicMaterial({color:0xff00ff});
    this.parts.eyes=[this.eSph(.06,8,8,eye,-.12,.7,.38),this.eSph(.06,8,8,eye,.12,.7,.38)];
  }
  mTrickster(){
    const m=new THREE.MeshStandardMaterial({color:0xff00ff,emissive:0xff00ff,emissiveIntensity:.4,metalness:.6,roughness:.3});
    this.parts.body=this.eA(new THREE.ConeGeometry(.5,.8,8),m,0,1,0); this.parts.body.rotation.x=Math.PI;
    this.parts.bodyMat=m;
    this.parts.head=this.eA(new THREE.IcosahedronGeometry(.25,0),m,0,1.5,0);
    this.parts.aura=this.eA(new THREE.TorusGeometry(.8,.02,6,16),new THREE.MeshBasicMaterial({color:0xff00ff,transparent:true,opacity:.3}),0,1,0,Math.PI/2);
    const lg=new THREE.BoxGeometry(.15,.6,.15), lm=new THREE.MeshStandardMaterial({color:0x330033});
    this.parts.leftLeg=this.eA(lg,lm,-.2,.3,0); this.parts.rightLeg=this.eA(lg,lm,.2,.3,0);
  }
  mSpider(){
    const bd=new THREE.MeshStandardMaterial({color:0x1a0a1a,metalness:.5,roughness:.6,emissive:0x440022,emissiveIntensity:.4});
    const lg=new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.7,roughness:.4});
    const eye=new THREE.MeshBasicMaterial({color:0xff0000});
    this.parts.body=this.eSph(.55,12,10,bd,0,.6,0); this.parts.body.scale.set(1,.85,1.3); this.parts.bodyMat=bd;
    this.parts.head=this.eSph(.35,10,8,bd,0,.55,.5);
    this.parts.spinneret=this.eSph(.18,8,8,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}),0,.9,-.25);
    this.parts.eyes=[]; for(let i=0;i<4;i++) this.parts.eyes.push(this.eSph(.055,6,6,eye,-.12+i*.08,.72,.75));
    this.parts.legs=[];
    for(let i=0;i<8;i++){
      const side=i<4?-1:1, idx=i%4, baseZ=.3-idx*.2;
      const up=this.eA(new THREE.CylinderGeometry(.05,.04,.6,6),lg,side*.35,.55,baseZ); up.rotation.z=side*.9;
      this.parts.legs.push({mesh:up, phase:i*.8, baseY:.55});
      const lw=this.eA(new THREE.CylinderGeometry(.035,.02,.7,6),lg,side*.75,.2,baseZ); lw.rotation.z=side*1.4;
      this.parts.legs.push({mesh:lw, phase:i*.8+.4, baseY:.2});
    }
  }
  mNinja(){
    const dk=new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.9,metalness:.15});
    const dk2=new THREE.MeshStandardMaterial({color:0x0a0a12,roughness:.85});
    const red=new THREE.MeshStandardMaterial({color:0x8b0000,emissive:0x440000,emissiveIntensity:.5,roughness:.6});
    const st=new THREE.MeshStandardMaterial({color:0x8899aa,metalness:.95,roughness:.15});
    this.parts.body=this.eBox(.5,.55,.32,dk,0,.85,0); this.parts.bodyMat=dk;
    this.eBox(.53,.18,.35,red,0,1,0); this.eBox(.55,.08,.37,red,0,.7,0);
    this.parts.head=this.eSph(.18,10,10,dk,0,1.32,0);
    this.eCone(.22,.3,8,dk2,0,1.42,-.02,0);
    this.parts.bandana=this.eBox(.06,.35,.06,red,-.15,1.36,-.05);
    this.parts.bandana.rotation.z=.35;
    const eye=new THREE.MeshBasicMaterial({color:0xff3333});
    this.parts.eyes=[this.eSph(.03,6,6,eye,-.06,1.33,.14),this.eSph(.03,6,6,eye,.06,1.33,.14)];
    const ag=new THREE.BoxGeometry(.13,.5,.13);
    this.parts.leftArm=this.eA(ag,dk,-.32,.85,0); this.parts.rightArm=this.eA(ag,dk,.32,.85,0);
    const sh=new THREE.Group();
    for(let i=0;i<4;i++) this.eA(new THREE.ConeGeometry(.035,.12,4),st,Math.cos(i/4*Math.PI*2-Math.PI/2)*.05,Math.sin(i/4*Math.PI*2-Math.PI/2)*.05,0,0,0,i/4*Math.PI*2-Math.PI/2,sh);
    sh.position.set(.32,.6,-.15); this.group.add(sh); this.parts.shuriken=sh;
    const lg=new THREE.BoxGeometry(.15,.45,.16);
    this.parts.leftLeg=this.eA(lg,dk,-.13,.22,0); this.parts.leftLeg.rotation.x=.2;
    this.parts.rightLeg=this.eA(lg,dk,.13,.22,0); this.parts.rightLeg.rotation.x=.2;
  }
  mChariot(){
    const bd=new THREE.MeshStandardMaterial({color:0x3a2a1a,metalness:.6,roughness:.5});
    const wd=new THREE.MeshStandardMaterial({color:0x5a3a1a,roughness:.85});
    const mt=new THREE.MeshStandardMaterial({color:0x6a6a72,metalness:.95,roughness:.2});
    const dk=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.8,roughness:.3});
    this.parts.body=this.eBox(1.4,.85,1.8,bd,0,.85,0); this.parts.bodyMat=bd;
    this.eBox(1.45,.1,1.85,mt,0,1.2,0);
    this.parts.wheels=[];
    [-.75,.75].forEach(x=>{
      const w=new THREE.Group();
      this.eA(new THREE.TorusGeometry(.4,.06,8,16),mt,0,0,0,0,0,0,w);
      this.eA(new THREE.TorusGeometry(.36,.08,8,16),dk,0,0,0,0,0,0,w);
      for(let i=0;i<4;i++) this.eA(new THREE.BoxGeometry(.06,.7,.06),wd,0,0,0,0,0,i/4*Math.PI,w);
      this.eA(new THREE.CylinderGeometry(.1,.1,.08,10),mt,0,0,0,Math.PI/2,0,0,w);
      w.position.set(x,.4,.2); w.rotation.y=Math.PI/2;
      this.group.add(w); this.parts.wheels.push(w);
    });
    this.eBox(1.5,.6,.15,mt,0,.7,-1);
    this.parts.head=this.eBox(.35,.35,.35,bd,0,1.4,-.2);
  }
  mFortifier(){
    const bd=new THREE.MeshStandardMaterial({color:0x2a3a4a,metalness:.85,roughness:.3});
    const dk=new THREE.MeshStandardMaterial({color:0x1a2a3a,metalness:.8,roughness:.4});
    const cy=new THREE.MeshStandardMaterial({color:0x44aaff,emissive:0x2288cc,emissiveIntensity:1});
    const co=new THREE.MeshStandardMaterial({color:0x88ddff,emissive:0x44aaff,emissiveIntensity:1.5});
    this.eCyl(.6,.7,.25,12,dk,0,.125,0,0);
    this.parts.body=this.eBox(.8,1.1,.8,bd,0,.8,0); this.parts.bodyMat=bd;
    this.eBox(.85,.1,.85,cy,0,.9,0);
    this.parts.core=this.eSph(.35,16,16,co,0,1.2,0);
    this.parts.coreRing=this.eA(new THREE.TorusGeometry(.45,.06,8,20),cy,0,1.2,0,Math.PI/2);
    this.parts.head=this.eBox(.5,.35,.5,bd,0,1.6,0);
    const eye=new THREE.MeshBasicMaterial({color:0x66ddff});
    this.eSph(.06,8,8,eye,-.12,1.65,.26); this.eSph(.06,8,8,eye,.12,1.65,.26);
    this.parts.orbs=[];
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2; this.parts.orbs.push({mesh:this.eSph(.12,10,10,cy,Math.cos(a),1,Math.sin(a)), phase:a}) }
    const ag=new THREE.BoxGeometry(.2,.7,.2);
    this.parts.leftArm=this.eA(ag,bd,-.6,.8,0); this.parts.rightArm=this.eA(ag,bd,.6,.8,0);
    const lg=new THREE.BoxGeometry(.28,.5,.28);
    this.parts.leftLeg=this.eA(lg,dk,-.24,.25,0); this.parts.rightLeg=this.eA(lg,dk,.24,.25,0);
    this.parts.shield=this.eA(new THREE.IcosahedronGeometry(FORTIFIER_SHIELD_RADIUS,2),new THREE.MeshBasicMaterial({color:0x44aaff,wireframe:true,transparent:true,opacity:.18,depthWrite:false}),0,1,0);
  }
  mWorm(){
    const head=new THREE.MeshStandardMaterial({color:0xaa4455,emissive:0x660033,emissiveIntensity:.5,roughness:.5,metalness:.2});
    const seg=new THREE.MeshStandardMaterial({color:0x8a3a4a,emissive:0x440022,emissiveIntensity:.3,roughness:.7,metalness:.1});
    const sp=this.group.position.clone();
    this.segments=[]; this.segmentWorldPos=[];
    for(let i=0;i<this.segmentCount;i++){
      const s=new THREE.Mesh(new THREE.SphereGeometry(.32,10,10),i===0?head:seg);
      s.castShadow=true; s.position.set(0,0,i*.55);
      this.group.add(s);
      this.segments.push({mesh:s,isHead:i===0});
      const wp=sp.clone(); wp.z+=i*.55; wp.y=.4;
      this.segmentWorldPos.push(wp);
    }
    this.parts.body=this.segments[0].mesh; this.parts.bodyMat=head;
    const eye=new THREE.MeshBasicMaterial({color:0xffdd00});
    this.segments[0].mesh.add(new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),eye).translateX(-.13).translateY(.1).translateZ(.22));
    this.segments[0].mesh.add(new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),eye).translateX(.13).translateY(.1).translateZ(.22));
  }
  mMortar(){
    const bd=new THREE.MeshStandardMaterial({color:0x3a3a4a,metalness:.7,roughness:.4});
    const dk=new THREE.MeshStandardMaterial({color:0x1a1a2a,metalness:.8,roughness:.3});
    const or=new THREE.MeshStandardMaterial({color:0xff8800,emissive:0xff5500,emissiveIntensity:.7});
    this.parts.body=this.eBox(.9,1.2,.7,bd,0,.9,0); this.parts.bodyMat=bd;
    this.eBox(.5,.35,.4,dk,0,.6,0);
    const lg=new THREE.BoxGeometry(.2,.6,.2);
    this.parts.leftLeg=this.eA(lg,dk,-.3,.3,0); this.parts.rightLeg=this.eA(lg,dk,.3,.3,0);
    this.parts.head=this.eBox(.4,.35,.4,dk,0,1.7,0);
    this.eSph(.06,6,6,new THREE.MeshBasicMaterial({color:0xff3300}),-.1,1.75,.22);
    this.eSph(.06,6,6,new THREE.MeshBasicMaterial({color:0xff3300}),.1,1.75,.22);
    this.parts.tube=new THREE.Group();
    this.eCyl(.11,.11,1.2,10,bd,0,0,-.3,0,0,0,this.parts.tube);
    this.eCyl(.15,.15,.15,10,dk,0,0,-.9,0,0,0,this.parts.tube);
    this.parts.muzzle=this.eSph(.13,10,10,or,0,0,-.95,0,0,0,this.parts.tube);
    this.parts.tube.position.set(.35,1.55,0); this.group.add(this.parts.tube);
    this.parts.chargeGlow=this.eSph(.15,10,10,new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:0}),0,0,-.95,0,0,0,this.parts.tube);
  }
  mIllusionist(){
    const bd=new THREE.MeshStandardMaterial({color:0x4a2a6a,metalness:.4,roughness:.6,emissive:0x2a0a4a,emissiveIntensity:.4});
    const cl=new THREE.MeshStandardMaterial({color:0x3a1a5a,roughness:.85,metalness:.2,emissive:0x1a0a2a,emissiveIntensity:.3});
    const eye=new THREE.MeshBasicMaterial({color:0xdd66ff});
    this.parts.body=this.eA(new THREE.ConeGeometry(.6,.35,8),bd,0,.4,0); this.parts.body.rotation.x=Math.PI;
    this.parts.body2=this.eA(new THREE.ConeGeometry(.5,1.0,8),cl,0,1.0,0);
    this.parts.bodyMat=bd;
    this.parts.head=this.eSph(.22,10,10,bd,0,1.65,0);
    this.eSph(.05,6,6,eye,-.08,1.68,.2); this.eSph(.05,6,6,eye,.08,1.68,.2);
    this.parts.hood=this.eA(new THREE.ConeGeometry(.3,.4,8),cl,0,1.85,0);
    this.parts.leftHand=this.eSph(.12,8,8,bd,-.55,1.1,0); this.parts.rightHand=this.eSph(.12,8,8,bd,.55,1.1,0);
    this.parts.aura=this.eA(new THREE.TorusGeometry(.9,.025,6,20),new THREE.MeshBasicMaterial({color:0xbb44ff,transparent:true,opacity:.4}),0,1.0,0,Math.PI/2);
  }
  mIllusionCopy(){
    const bd=new THREE.MeshStandardMaterial({color:0x4a2a6a,metalness:.4,roughness:.6,emissive:0x2a0a4a,emissiveIntensity:.4,transparent:true,opacity:.55});
    const cl=new THREE.MeshStandardMaterial({color:0x3a1a5a,roughness:.85,metalness:.2,emissive:0x1a0a2a,emissiveIntensity:.3,transparent:true,opacity:.55});
    const eye=new THREE.MeshBasicMaterial({color:0xdd66ff,transparent:true,opacity:.7});
    this.parts.body=this.eA(new THREE.ConeGeometry(.6,.35,8),bd,0,.4,0); this.parts.body.rotation.x=Math.PI;
    this.parts.body2=this.eA(new THREE.ConeGeometry(.5,1.0,8),cl,0,1.0,0);
    this.parts.bodyMat=bd;
    this.parts.head=this.eSph(.22,10,10,bd,0,1.65,0);
    this.eSph(.05,6,6,eye,-.08,1.68,.2); this.eSph(.05,6,6,eye,.08,1.68,.2);
    this.parts.hood=this.eA(new THREE.ConeGeometry(.3,.4,8),cl,0,1.85,0);
    this.parts.leftHand=this.eSph(.12,8,8,bd,-.55,1.1,0); this.parts.rightHand=this.eSph(.12,8,8,bd,.55,1.1,0);
  }
  mWallbreaker(){
    const bd=new THREE.MeshStandardMaterial({color:0x4a3a2a,metalness:.7,roughness:.4});
    const dk=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.8,roughness:.3});
    this.parts.body=this.eCyl(.8,.8,.15,16,bd,0,0,0,0); this.parts.bodyMat=bd;
    this.eCyl(.25,.25,.2,8,dk,0,.15,0,0);
    this.parts.head=this.eBox(.4,.3,.4,dk,0,.3,0);
    this.parts.nozzle=this.eCyl(.08,.08,.5,8,dk,0,.3,.4,0);
    this.parts.pilot=this.eSph(.06,8,8,new THREE.MeshBasicMaterial({color:0xff8800}),0,.3,.65);
  }
  mVerkhushka(){
    const bd=new THREE.MeshStandardMaterial({color:0x6a4a1a,metalness:.2,roughness:.9});
    const lf=new THREE.MeshStandardMaterial({color:0x2a8a2a,emissive:0x115511,emissiveIntensity:.3,roughness:.6});
    const eye=new THREE.MeshBasicMaterial({color:0xffdd00});
    this.parts.body=this.eSph(.5,10,10,bd,0,0,0); this.parts.body.scale.set(1,1.2,1); this.parts.bodyMat=bd;
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2;
      const l=this.eA(new THREE.ConeGeometry(.12,.8,4),lf,Math.cos(a)*.2,.7,Math.sin(a)*.2);
      l.rotation.z=Math.cos(a)*.5; l.rotation.x=Math.sin(a)*.5;
    }
    this.parts.eyeL=this.eSph(.07,6,6,eye,-.15,.15,.4); this.parts.eyeL.visible=false;
    this.parts.eyeR=this.eSph(.07,6,6,eye,.15,.15,.4); this.parts.eyeR.visible=false;
    this.parts.emitter=this.eSph(.12,10,10,new THREE.MeshBasicMaterial({color:0xffdd00,transparent:true,opacity:0}),0,.05,.5); this.parts.emitter.visible=false;
    this.group.position.y=-.85;
  }
  mChessHorse(){
    const mr=new THREE.MeshStandardMaterial({color:0xe8dfc8,metalness:.2,roughness:.5,emissive:0x442211,emissiveIntensity:.1});
    const dk=new THREE.MeshStandardMaterial({color:0x2a1a0a,metalness:.4,roughness:.6});
    const eye=new THREE.MeshBasicMaterial({color:0xff4400});
    this.parts.body=this.eCyl(.6,.7,.25,16,mr,0,.125,0,0); this.parts.bodyMat=mr;
    this.eCyl(.5,.55,.12,16,dk,0,.31,0,0);
    this.eCyl(.36,.42,.5,12,mr,0,.62,0,0);
    this.eBox(.7,.45,.5,mr,0,1.1,0);
    const nk=this.eCyl(.2,.28,.55,10,mr,0,1.5,.08,0); nk.rotation.x=-.35;
    this.parts.head=this.eBox(.35,.32,.6,mr,0,1.85,.32);
    this.eBox(.28,.22,.22,mr,0,1.72,.68);
    this.eBox(.2,.15,.15,dk,0,1.6,.78);
    this.eCone(.07,.18,6,mr,-.1,2.05,.15,0); this.eCone(.07,.18,6,mr,.1,2.05,.15,0);
    this.eSph(.04,6,6,eye,-.1,1.9,.52); this.eSph(.04,6,6,eye,.1,1.9,.52);
  }
  mChessElephant(){
    const mr=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.4,roughness:.4,emissive:0x110022,emissiveIntensity:.2});
    const lt=new THREE.MeshStandardMaterial({color:0xd8d0c0,metalness:.3,roughness:.5});
    const eye=new THREE.MeshBasicMaterial({color:0x00aaff});
    this.parts.body=this.eCyl(.6,.7,.25,16,mr,0,.125,0,0); this.parts.bodyMat=mr;
    this.eCyl(.5,.55,.12,16,lt,0,.31,0,0);
    this.eCyl(.3,.5,.85,12,mr,0,.8,0,0);
    this.eSph(.34,14,12,mr,0,1.35,0);
    this.parts.head=this.eCone(.3,.7,12,mr,0,1.72,0);
    this.eBox(.05,.25,.35,lt,0,1.85,0);
    this.eSph(.11,10,10,lt,0,2.13,0);
    this.eSph(.04,6,6,eye,-.12,1.38,.28); this.eSph(.04,6,6,eye,.12,1.38,.28);
  }
  mCheerful(){
    const yl=new THREE.MeshStandardMaterial({color:0xffdd00,metalness:.3,roughness:.4,emissive:0xaa7700,emissiveIntensity:.4});
    const bl=new THREE.MeshBasicMaterial({color:0});
    const wh=new THREE.MeshBasicMaterial({color:0xffffff});
    const pk=new THREE.MeshBasicMaterial({color:0xff6666});
    this.parts.body=this.eSph(.9,22,22,yl,0,.9,0); this.parts.bodyMat=yl;
    this.eSph(.14,10,10,bl,-.28,1.12,.78); this.eSph(.14,10,10,bl,.28,1.12,.78);
    this.eSph(.05,8,8,wh,-.24,1.18,.86); this.eSph(.05,8,8,wh,.32,1.18,.86);
    const sm=this.eA(new THREE.TorusGeometry(.4,.07,10,20,Math.PI),bl,0,.88,.72); sm.rotation.z=Math.PI;
    this.eSph(.11,8,8,pk,-.42,.78,.66); this.eSph(.11,8,8,pk,.42,.78,.66);
  }
  mUFO(){
    const hl=new THREE.MeshStandardMaterial({color:0x999aa2,metalness:.95,roughness:.15});
    const tr=new THREE.MeshStandardMaterial({color:0x4a4a52,metalness:.9,roughness:.3});
    const dm=new THREE.MeshStandardMaterial({color:0x66ccff,metalness:.4,roughness:.1,emissive:0x2266aa,emissiveIntensity:.7,transparent:true,opacity:.85});
    const li=new THREE.MeshBasicMaterial({color:0xffaa00});
    this.parts.body=this.eCyl(1.2,1.2,.3,24,hl,0,0,0,0); this.parts.bodyMat=hl;
    this.eCyl(.75,1.2,.28,24,hl,0,.28,0,0);
    this.eCyl(1.2,.7,.2,24,hl,0,-.24,0,0);
    this.eCyl(.7,.72,.1,20,tr,0,-.4,0,0);
    const d=this.eSph(.6,18,14,dm,0,.35,0); d.scale.set(1,.75,1);
    this.parts.lights=[];
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
      this.parts.lights.push(this.eSph(.1,6,6,li,Math.cos(a)*1.15,.05,Math.sin(a)*1.15));
    }
  }
  mCow(){
    const wh=new THREE.MeshStandardMaterial({color:0xf0f0e8,roughness:.85});
    const bl=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.85});
    const pk=new THREE.MeshStandardMaterial({color:0xffaabb,roughness:.8});
    const hn=new THREE.MeshStandardMaterial({color:0xd8d0c0,roughness:.6});
    this.parts.body=this.eBox(1.0,.8,1.4,wh,0,.7,0); this.parts.bodyMat=wh;
    this.eBox(.35,.35,.2,bl,-.2,.78,.5); this.eBox(.4,.3,.2,bl,.3,.72,-.3);
    this.parts.head=this.eBox(.6,.5,.5,wh,0,.95,.9);
    this.eBox(.35,.2,.2,pk,0,.8,1.15);
    this.eSph(.06,6,6,bl,-.16,1.05,.94); this.eSph(.06,6,6,bl,.16,1.05,.94);
    this.eCone(.06,.25,6,hn,-.22,1.28,.85,-.3); this.eCone(.06,.25,6,hn,.22,1.28,.85,-.3);
    this.eBox(.2,.5,.2,wh,-.35,.25,.5); this.eBox(.2,.5,.2,wh,.35,.25,.5);
    this.eBox(.2,.5,.2,wh,-.35,.25,-.5); this.eBox(.2,.5,.2,wh,.35,.25,-.5);
  }
  mGreenAlien(){
    const gr=new THREE.MeshStandardMaterial({color:0x33cc33,roughness:.6,emissive:0x116611,emissiveIntensity:.25});
    const dk=new THREE.MeshStandardMaterial({color:0x1a3a1a,metalness:.6,roughness:.4});
    const eye=new THREE.MeshBasicMaterial({color:0});
    const gl=new THREE.MeshBasicMaterial({color:0x00ff00});
    this.parts.body=this.eBox(.4,.6,.3,gr,0,.7,0); this.parts.bodyMat=gr;
    this.parts.head=this.eSph(.3,14,12,gr,0,1.3,0); this.parts.head.scale.set(1,.92,.88);
    const el=this.eSph(.11,10,10,eye,-.14,1.35,.2); el.scale.set(1,.55,.8);
    const er=this.eSph(.11,10,10,eye,.14,1.35,.2); er.scale.set(1,.55,.8);
    this.eBox(.06,.1,.42,dk,.35,.8,-.15);
    this.eSph(.04,6,6,gl,.35,.8,-.36);
  }
  mHothead(){
    const sk=new THREE.MeshStandardMaterial({color:0xffaa77,roughness:.7});
    const sh=new THREE.MeshStandardMaterial({color:0xff2266,roughness:.5,emissive:0x550022,emissiveIntensity:.35});
    const pt=new THREE.MeshStandardMaterial({color:0x2266ff,roughness:.5});
    const gl=new THREE.MeshStandardMaterial({color:0x111111,metalness:.95,roughness:.1});
    const hr=new THREE.MeshStandardMaterial({color:0x111111,roughness:.9});
    this.parts.body=this.eBox(.5,.6,.3,sh,0,1,0); this.parts.bodyMat=sh;
    this.eBox(.52,.15,.32,pt,0,.7,0);
    this.parts.head=this.eSph(.22,14,12,sk,0,1.5,0); this.parts.head.scale.set(1,1.08,1);
    this.eBox(.42,.12,.05,gl,0,1.53,.2);
    for(let i=0;i<5;i++){ const a=(i/5)*Math.PI-Math.PI/2;
      const spike=this.eCone(.05,.18,4,hr,Math.cos(a)*.12,1.72,.08,0); spike.rotation.x=-.2;
    }
    this.parts.leftArm=this.eBox(.14,.5,.14,sk,-.32,1.1,0); this.parts.rightArm=this.eBox(.14,.5,.14,sk,.32,1.1,0);
    this.parts.leftLeg=this.eBox(.16,.6,.16,pt,-.13,.35,0); this.parts.rightLeg=this.eBox(.16,.6,.16,pt,.13,.35,0);
  }

  getHitboxBounds(){
    if(this.isFlying) return {minY:this.group.position.y-this.height/2, maxY:this.group.position.y+this.height/2, headWorldY:this.group.position.y+this.height/4};
    return {minY:this.group.position.y, maxY:this.group.position.y+this.height, headWorldY:this.group.position.y+(this.headY||this.height*.85)};
  }
  checkHit(hitPoint){
    if(this.type === 'worm'){
      for(let i=0;i<this.segments.length;i++){
        const wp=this.segmentWorldPos[i];
        if(wp.distanceTo(hitPoint) < .55){ this.lastHitSegment=i; return i===0?'head':'body' }
      }
      return null;
    }
    const dx=hitPoint.x-this.group.position.x, dz=hitPoint.z-this.group.position.z;
    const distXZ=Math.sqrt(dx*dx+dz*dz);
    if(distXZ > this.radius*1.8) return null;
    const b=this.getHitboxBounds();
    if(hitPoint.y < b.minY-.2 || hitPoint.y > b.maxY+.2) return null;
    if(this.headY && this.headRadius){
      const dy=hitPoint.y-b.headWorldY;
      if(Math.sqrt(dx*dx+dz*dz+dy*dy) < this.headRadius*1.65) return 'head';
    }
    const tb=b.minY+this.height*.35, tt=b.maxY-this.height*.1;
    if(hitPoint.y >= tb && hitPoint.y <= tt && distXZ < this.radius) return 'body';
    if(hitPoint.y >= b.minY-.1 && hitPoint.y < tb && distXZ < this.radius*.9) return 'legs';
    return null;
  }
  checkEnemyCollision(np){
    for(let e of enemies){
      if(e === this || e.dead || e.isCow) continue;
      const dx=np.x-e.group.position.x, dz=np.z-e.group.position.z;
      const dist=Math.sqrt(dx*dx+dz*dz), md=this.radius+e.radius;
      if(dist < md && dist > 0){
        this.group.position.x += dx/dist*(md-dist)*.5;
        this.group.position.z += dz/dist*(md-dist)*.5;
      }
    }
  }
  checkColliderCollision(pos){
    for(let c of colliders){
      if(Math.abs(pos.x-c.position.x)<c.size.x/2+this.radius && Math.abs(pos.z-c.position.z)<c.size.z/2+this.radius) return true;
    }
    return false;
  }
  pushOutOfCollider(){
    for(let c of colliders){
      const dx=this.group.position.x-c.position.x, dz=this.group.position.z-c.position.z;
      const hw=c.size.x/2+this.radius, hd=c.size.z/2+this.radius;
      if(Math.abs(dx)<hw && Math.abs(dz)<hd){
        const ox=hw-Math.abs(dx), oz=hd-Math.abs(dz);
        if(ox < oz) this.group.position.x += Math.sign(dx)*ox;
        else this.group.position.z += Math.sign(dz)*oz;
      }
    }
  }
  facePlayer(dt, lerpSpeed=6){
    if(this.dead) return;
    const ty=Math.atan2(player.position.x-this.group.position.x, player.position.z-this.group.position.z);
    if(!isFinite(ty)) return;
    this.rotationY += (((ty-this.rotationY+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*lerpSpeed);
    this.group.rotation.y=this.rotationY;
  }
  spawnMinions(){
    const count=this.spawnCount||2, types=['runner','drone','spider'];
    for(let i=0;i<count;i++){
      const t=types[Math.floor(Math.random()*types.length)];
      const ang=Math.random()*Math.PI*2, d=1.5;
      const x=this.group.position.x+Math.cos(ang)*d, z=this.group.position.z+Math.sin(ang)*d;
      enemies.push(new Enemy(t,new THREE.Vector3(x,0,z)));
    }
  }
  spawnIllusionCopies(){
    const count=2+Math.floor(Math.random()*2);
    for(let i=0;i<count;i++){
      const ang=(i/count)*Math.PI*2+Math.random()*.4, d=2.5+Math.random()*1.5;
      const cx=this.group.position.x+Math.cos(ang)*d, cz=this.group.position.z+Math.sin(ang)*d;
      const copy=new Enemy('illusion_copy',new THREE.Vector3(cx,0,cz));
      copy.parentIllusionist=this;
      enemies.push(copy);
      this.copiesLeft++;
    }
  }
  splitAt(idx){
    if(idx<=0 || idx>=this.segments.length) return;
    const fc=idx, bp=this.segmentWorldPos.slice(idx+1), bc=bp.length;
    audio.wormSplit();
    if(bc >= 2){
      const bw=new Enemy('worm',bp[0].clone(),{segmentCount:bc});
      for(let i=0;i<bc;i++){ bw.segmentWorldPos[i]=bp[i].clone(); bw.segments[i].mesh.position.copy(bp[i].clone().sub(bp[0])) }
      bw.group.position.copy(bp[0]);
      bw.maxHealth=bw.maxHealth*bc/8; bw.health=bw.maxHealth;
      enemies.push(bw);
    }
    if(fc < 2){
      this.dead=true; scene.remove(this.group);
      const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
      enemiesKilled++; audio.death();
      createBloodEffect(this.segmentWorldPos[0]||this.group.position,'human');
      updateUI(); return;
    }
    for(let i=idx;i<this.segments.length;i++){ this.group.remove(this.segments[i].mesh); disposeGroup(this.segments[i].mesh) }
    this.segments=this.segments.slice(0,fc); this.segmentWorldPos=this.segmentWorldPos.slice(0,fc);
    this.segmentCount=fc; this.maxHealth=this.maxHealth*fc/8; this.health=Math.min(this.health,this.maxHealth);
    createBloodEffect(this.segmentWorldPos[fc-1]||this.group.position,'human');
    cameraShake(.2,.3);
  }

  getChessMoves(){
    if(this.type === 'chess_horse') return [[2,4],[4,2],[4,-2],[2,-4],[-2,-4],[-4,-2],[-4,2],[-2,4]];
    if(this.type === 'chess_elephant'){ const m=[]; for(let n=1;n<=3;n++) m.push([2*n,2*n],[2*n,-2*n],[-2*n,2*n],[-2*n,-2*n]); return m }
    return [];
  }
  updateChess(dt, dx, dz, dist){
    this.chessTimer -= dt;
    if(this.chessState === 'idle'){
      if(this.chessTimer <= 0){
        const moves=this.getChessMoves();
        let best=null, bd=Infinity;
        for(const [mx,mz] of moves){
          const tx=this.group.position.x+mx, tz=this.group.position.z+mz;
          if(Math.abs(tx) > 23 || Math.abs(tz) > 23) continue;
          if(checkPositionBlocked(tx,tz,this.radius)) continue;
          const d=Math.sqrt((tx-player.position.x)**2+(tz-player.position.z)**2);
          if(d < bd){ bd=d; best=[tx,tz] }
        }
        if(best){
          this.chessTarget=best; this.chessState='telegraph'; this.chessTimer=1.5;
          const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
          m.rotation.x=-Math.PI/2; m.position.set(best[0],.06,best[1]);
          scene.add(m); this.chessTelegraph=m;
        } else this.chessTimer=2;
      }
    } else if(this.chessState === 'telegraph'){
      if(this.chessTelegraph) this.chessTelegraph.material.opacity=.5+Math.sin(Date.now()*.02)*.4;
      if(this.chessTimer <= 0){
        if(this.chessTelegraph){ scene.remove(this.chessTelegraph); this.chessTelegraph.geometry.dispose(); this.chessTelegraph.material.dispose(); this.chessTelegraph=null }
        if(this.chessTarget){
          this.group.position.x=this.chessTarget[0]; this.group.position.z=this.chessTarget[1];
          const pd=Math.sqrt((this.group.position.x-player.position.x)**2+(this.group.position.z-player.position.z)**2);
          if(pd < 2){
            const kb=new THREE.Vector3(player.position.x-this.group.position.x,0,player.position.z-this.group.position.z).normalize();
            damagePlayer(this.damage,this.type,1.0,{knockback:kb.multiplyScalar(30)});
          }
          this.chessTarget=null;
        }
        this.chessState='idle'; this.chessTimer=3+Math.random();
      }
    }
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }
  updateCheerful(dt, dx, dz, dist){
    if(!this.cheerVel){ this.cheerVel={x:0,z:0};
      if(dist > .1){ this.cheerVel.x=dx/dist*.18; this.cheerVel.z=dz/dist*.18 }
      else { this.cheerVel.x=(Math.random()-.5)*.2; this.cheerVel.z=(Math.random()-.5)*.2 }
    }
    const np=this.group.position.clone();
    np.x+=this.cheerVel.x*dt*60; np.z+=this.cheerVel.z*dt*60;
    if(np.x < -23 || np.x > 23){ this.cheerVel.x*=-1; np.x=Math.max(-23,Math.min(23,np.x)) }
    if(np.z < -23 || np.z > 23){ this.cheerVel.z*=-1; np.z=Math.max(-23,Math.min(23,np.z)) }
    for(const c of colliders){
      const dxc=np.x-c.position.x, dzc=np.z-c.position.z;
      const hw=c.size.x/2+this.radius, hd=c.size.z/2+this.radius;
      if(Math.abs(dxc)<hw && Math.abs(dzc)<hd){
        const ox=hw-Math.abs(dxc), oz=hd-Math.abs(dzc);
        if(ox < oz){ this.cheerVel.x*=-1; np.x=c.position.x+Math.sign(dxc)*hw }
        else { this.cheerVel.z*=-1; np.z=c.position.z+Math.sign(dzc)*hd }
        audio.wallHit();
      }
    }
    this.group.position.x=np.x; this.group.position.z=np.z;
    if(dist < 1.4){
      const pd=new THREE.Vector3(dx,0,dz).normalize();
      player.knockback.add(pd.multiplyScalar(-15));
      damagePlayer(this.damage*.3, this.type, .6);
      this.cheerVel.x*=-1; this.cheerVel.z*=-1;
    }
    this.group.rotation.x += this.cheerVel.z*dt*6;
    this.group.rotation.z -= this.cheerVel.x*dt*6;
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }
  updateUFO(dt, dx, dz, dist){
    const np=this.group.position.clone();
    const td=8;
    if(dist > td){ np.x+=(dx/dist)*this.speed*40*dt; np.z+=(dz/dist)*this.speed*40*dt }
    else if(dist < td-3){ np.x-=(dx/dist)*this.speed*30*dt; np.z-=(dz/dist)*this.speed*30*dt }
    const ang=Date.now()*.0008;
    np.x+=Math.cos(ang)*.02; np.z+=Math.sin(ang)*.02;
    if(Math.abs(np.x)<22 && Math.abs(np.z)<22){ this.group.position.x=np.x; this.group.position.z=np.z }
    this.group.position.y=this.baseY+Math.sin(Date.now()*.002)*.3;
    this.group.rotation.y+=dt*1.5;
    if(this.parts.lights){
      this.parts.lights.forEach((l,i)=>{
        const ph=(Date.now()*.008+i*.7)%(Math.PI*2);
        l.material.color.setHSL(.1,1,.5+Math.sin(ph)*.3);
      });
    }
    this.cowCooldown -= dt;
    if(this.cowCooldown <= 0 && this.cowsDropped < 3){
      this.cowCooldown=2.5+Math.random()*2; this.cowsDropped++;
      audio.enemyShoot();
      const cow=new Enemy('cow',new THREE.Vector3(this.group.position.x,0,this.group.position.z));
      enemies.push(cow);
    }
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }
  updateCow(dt){
    if(this.parts.head) this.parts.head.rotation.z = Math.sin(Date.now()*.002+this.wiggleOffset)*.05;
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }
  updateGreenAlien(dt, dx, dz, dist){
    this.alienBurstTimer -= dt;
    if(this.alienBurstState === 'idle'){
      if(dist > 8){
        const np=this.group.position.clone();
        const s=this.speed*60*dt;
        np.x+=(dx/dist)*s; np.z+=(dz/dist)*s;
        if(Math.abs(np.x)<22 && Math.abs(np.z)<22 && !this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z }
      }
      if(this.alienBurstTimer <= 0 && dist < 20){ this.alienBurstState='burst'; this.alienBurstCount=4; this.alienBurstTimer=.15 }
    } else if(this.alienBurstState === 'burst'){
      if(this.alienBurstTimer <= 0){
        audio.play('laser');
        const from=this.group.position.clone(); from.y+=1.0;
        const to=new THREE.Vector3(player.position.x,player.position.y,player.position.z);
        const dir=to.clone().sub(from).normalize();
        const p=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.75),new THREE.MeshBasicMaterial({color:0x00ff00}));
        p.position.copy(from); p.lookAt(from.clone().add(dir));
        p.userData.velocity=dir.multiplyScalar(.9);
        p.userData.damage=this.damage;
        p.userData.isEnemyProjectile=true;
        p.userData.sourceType='green_alien';
        p.userData.life=200;
        p.userData.isAlienBolt=true;
        scene.add(p); projectiles.push(p);
        this.alienBurstCount--;
        this.alienBurstTimer=.15;
        if(this.alienBurstCount <= 0){ this.alienBurstState='idle'; this.alienBurstTimer=2+Math.random()*2 }
      }
    }
    this.facePlayer(dt,5);
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }
  updateHothead(dt, dx, dz, dist){
    this.flipTimer -= dt;
    if(this.flipState === 'run'){
      const np=this.group.position.clone();
      const wob=Math.sin(Date.now()*.005+this.wiggleOffset)*.5;
      const px=-dz/Math.max(.01,dist), pz=dx/Math.max(.01,dist);
      const s=this.speed*50*dt;
      np.x+=(dx/Math.max(.01,dist))*s+px*wob*dt*10;
      np.z+=(dz/Math.max(.01,dist))*s+pz*wob*dt*10;
      if(Math.abs(np.x)<22 && Math.abs(np.z)<22 && !this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z }
      if(this.flipTimer <= 0){ this.flipTimer=1.5+Math.random(); this.flipState='flip'; this.flipProgress=0; audio.jump() }
    } else if(this.flipState === 'flip'){
      this.flipProgress += dt*2;
      this.group.rotation.x = -this.flipProgress*Math.PI*2;
      this.group.position.y = Math.sin(this.flipProgress*Math.PI)*1.5;
      const np=this.group.position.clone();
      np.x+=(dx/Math.max(.01,dist))*this.speed*30*dt;
      np.z+=(dz/Math.max(.01,dist))*this.speed*30*dt;
      if(Math.abs(np.x)<22 && Math.abs(np.z)<22){ this.group.position.x=np.x; this.group.position.z=np.z }
      if(this.flipProgress >= 1){ this.flipState='run'; this.group.rotation.x=0; this.group.position.y=0 }
    }
    if(dist < 1.5 && Date.now()-this.lastAttackTime > 800){ this.lastAttackTime=Date.now(); damagePlayer(this.damage,this.type,.5) }
    this.facePlayer(dt,6);
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }

  update(dt){
    if(this.dead) return;

    if(this.frozenTimer > 0){
      this.frozenTimer -= dt;
      if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(.3,.6,1); this.parts.bodyMat.emissiveIntensity=.7 }
      if(this.frozenTimer <= 0 && this.parts.bodyMat){ this.parts.bodyMat.emissive.copy(this.origEmissive); this.parts.bodyMat.emissiveIntensity=this.origEmissiveIntensity }
      if(!this._wasFrozen){
        this._wasFrozen = true;
        // ICE R3: крио-взрыв при заморозке
        if(hasSynergy('ice',3)){
          createAOESphere(this.group.position, 4, 0x88ccff);
          enemies.slice().forEach(e=>{
            if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 4){
              e.takeDamage(40, e.group.position, 'ice');
            }
          });
        }
      }
      return;
    }
    if(this._wasFrozen){ this._wasFrozen = false }
    if(this.iceResetTimer > 0){ this.iceResetTimer -= dt; if(this.iceResetTimer <= 0) this.iceHits = 0 }

    // BURN DOT
    if(this.burnTimer > 0){
      this.burnTimer -= dt;
      if(!isEnemyShielded(this)){
        this.health -= dt * (this.burnDps || 10);
        if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,.4,0); this.parts.bodyMat.emissiveIntensity=.6 }
      }
      // FIRE R2 spread
      if(this.burnSpread > 0 && !this._burnSpreadApplied){
        this._burnSpreadApplied = true;
        enemies.slice().forEach(e=>{
          if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < this.burnSpread){
            if(e.burnTimer <= 0){ e.burnTimer = 1.5; e.burnDps = 3; e.burnSpread = 0 }
          }
        });
      }
      if(this.burnTimer <= 0 && this.parts.bodyMat){ this.parts.bodyMat.emissive.copy(this.origEmissive); this.parts.bodyMat.emissiveIntensity=this.origEmissiveIntensity }
      if(this.health <= 0){ this.die(); return }
    }
    // POISON DOT
    if(this.poisonTimer > 0){
      this.poisonTimer -= dt;
      if(!isEnemyShielded(this)){
        this.health -= dt * (this.poisonDps || 12) * (this.poisonStacks || 1);
        if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(.2,1,.2); this.parts.bodyMat.emissiveIntensity=.6 }
      }
      if(this.poisonTimer <= 0 && this.parts.bodyMat){ this.parts.bodyMat.emissive.copy(this.origEmissive); this.parts.bodyMat.emissiveIntensity=this.origEmissiveIntensity }
      if(this.health <= 0){ this.die(); return }
    }
    // BLEED DOT (CRIT R3)
    if(this.bleedTimer > 0){
      this.bleedTimer -= dt;
      this.health -= dt * (this.bleedDps || 5);
      if(this.health <= 0){ this.die(); return }
    }
    if(this.sawEmbedded){
      this.sawEmbedded.timer -= dt;
      if(!isEnemyShielded(this)) this.health -= this.sawEmbedded.dps*dt;
      this.sawEmbedded.spinner.rotation.y += .6;
      if(this.sawEmbedded.timer <= 0){ this.group.remove(this.sawEmbedded.mesh); this.sawEmbedded=null }
      if(this.health <= 0){ this.die(); return }
    }
    if(this.throwAnim > 0) this.throwAnim -= dt;

    const dx=player.position.x-this.group.position.x;
    const dz=player.position.z-this.group.position.z;
    const dist=Math.sqrt(dx*dx+dz*dz);

    let sm=1;
    if(this.slowTimer > 0){ this.slowTimer -= dt; sm=.5 }
    if(modifiers.includes('ice_aura') && dist < 5) sm *= .5;
    // TIME R1: аура замедления вокруг игрока
    if(hasSynergy('time',1) && dist < 4) sm *= .85;
    // CHRONOS curse
    if(playerBuffs.enemySpeedMult > 1) sm *= playerBuffs.enemySpeedMult;
    if(this.type !== 'trickster' && !hgFrozen){
      if(hgState === 'slow') sm *= SLOW_TIMESCALE;
      else if(hgState === 'fast') sm *= FAST_TIMESCALE;
    }

    if(this.type === 'chess_horse' || this.type === 'chess_elephant'){ this.updateChess(dt,dx,dz,dist); return }
    if(this.type === 'cheerful'){ this.updateCheerful(dt,dx,dz,dist); return }
    if(this.type === 'ufo'){ this.updateUFO(dt,dx,dz,dist); return }
    if(this.type === 'cow'){ this.updateCow(dt); return }
    if(this.type === 'green_alien'){ this.updateGreenAlien(dt,dx,dz,dist); return }
    if(this.type === 'hothead'){ this.updateHothead(dt,dx,dz,dist); return }

    if(this.type === 'worm'){
      this.group.rotation.y=0;
      if(this.segmentWorldPos.length === 0) return;
      const hp=this.segmentWorldPos[0];
      const toP=new THREE.Vector3(player.position.x-hp.x,0,player.position.z-hp.z);
      const len=toP.length();
      let mv=new THREE.Vector3();
      if(this.wormState === 'approach'){
        if(len > .01){ toP.normalize();
          const wig=Math.sin(Date.now()*.008+this.wiggleOffset)*.4;
          const perp=new THREE.Vector3(-toP.z,0,toP.x).multiplyScalar(wig);
          mv=toP.clone().add(perp).normalize().multiplyScalar(this.speed*50*sm*dt);
        }
        if(len < 2){ this.wormState='bite'; this.wormTimer=.5; damagePlayer(this.damage*.3,'worm',.5); audio.play('worm') }
      } else if(this.wormState === 'bite'){
        this.wormTimer -= dt;
        if(this.wormTimer <= 0){ this.wormState='retreat'; this.wormTimer=1.5 }
      } else if(this.wormState === 'retreat'){
        this.wormTimer -= dt;
        if(len > .01){ toP.normalize(); mv=toP.clone().multiplyScalar(-this.speed*35*sm*dt) }
        if(this.wormTimer <= 0){ this.wormState='cooldown'; this.wormTimer=2 }
      } else if(this.wormState === 'cooldown'){
        this.wormTimer -= dt;
        if(this.wormTimer <= 0) this.wormState='approach';
      }
      if(mv.lengthSq() > 1e-5){
        const nh=new THREE.Vector3(hp.x+mv.x,.4,hp.z+mv.z);
        let bl=false;
        for(let c of colliders){ if(Math.abs(nh.x-c.position.x)<c.size.x/2+this.radius && Math.abs(nh.z-c.position.z)<c.size.z/2+this.radius){ bl=true; break } }
        if(!bl) hp.copy(nh);
        else {
          const pp=new THREE.Vector3(-mv.z,0,mv.x);
          const alt=new THREE.Vector3(hp.x+pp.x,.4,hp.z+pp.z);
          let bl2=false;
          for(let c of colliders){ if(Math.abs(alt.x-c.position.x)<c.size.x/2+this.radius && Math.abs(alt.z-c.position.z)<c.size.z/2+this.radius){ bl2=true; break } }
          if(!bl2) hp.copy(alt); else hp.x+=mv.x*.3;
        }
        hp.x=Math.max(-24,Math.min(24,hp.x)); hp.z=Math.max(-24,Math.min(24,hp.z));
      }
      const spc=.55;
      for(let i=1;i<this.segmentWorldPos.length;i++){
        const pr=this.segmentWorldPos[i-1], cu=this.segmentWorldPos[i];
        if(pr.distanceTo(cu) > spc){
          const tw=new THREE.Vector3().subVectors(pr,cu).normalize();
          cu.copy(pr).sub(tw.multiplyScalar(spc));
        }
        cu.y=.4;
      }
      this.group.position.set(hp.x,0,hp.z);
      for(let i=0;i<this.segments.length;i++){ this.segments[i].mesh.position.copy(this.segmentWorldPos[i].clone().sub(this.group.position)) }
      if(this.segments[0] && mv.lengthSq() > 1e-5) this.segments[0].mesh.rotation.y=Math.atan2(mv.x,mv.z);
      this.walkPhase += dt*20;
      return;
    }

    if(this.type === 'mortar'){
      let nearby=false;
      for(const e of enemies){ if(e === this || e.dead) continue; if(e.group.position.distanceTo(this.group.position) < 4){ nearby=true; break } }
      let md=null;
      if(nearby){
        let nn=null, nd=Infinity;
        for(const e of enemies){ if(e === this || e.dead) continue; const d=e.group.position.distanceTo(this.group.position); if(d < nd){ nd=d; nn=e } }
        if(nn){ const aw=this.group.position.clone().sub(nn.group.position); aw.y=0; aw.normalize(); md=aw }
      } else if(dist < 15){ md=new THREE.Vector3(-dx/dist,0,-dz/dist) }
      else if(dist > 30){ md=new THREE.Vector3(dx/dist,0,dz/dist) }
      if(md){
        const np=this.group.position.clone();
        np.x+=md.x*this.speed*80*sm*dt; np.z+=md.z*this.speed*80*sm*dt;
        let bl=false;
        for(let c of colliders){ if(Math.abs(np.x-c.position.x)<c.size.x/2+this.radius && Math.abs(np.z-c.position.z)<c.size.z/2+this.radius){ bl=true; break } }
        if(!bl && Math.abs(np.x)<24 && Math.abs(np.z)<24){ this.group.position.x=np.x; this.group.position.z=np.z }
      }
      this.parts.tube.rotation.order='YXZ';
      this.parts.tube.rotation.y=Math.atan2(player.position.x-this.group.position.x, player.position.z-this.group.position.z);
      this.shootTimer += dt;
      if(!this.mortarCharging && this.shootTimer >= this.shootCooldown && dist < 35 && dist > 10){
        this.mortarCharging=true; this.mortarCharge=0;
      }
      if(this.mortarCharging){
        this.mortarCharge += dt;
        if(this.parts.chargeGlow) this.parts.chargeGlow.material.opacity=Math.min(1,this.mortarCharge/1.5);
        if(this.mortarCharge >= 1.5){
          audio.mortarLaunch();
          const from=this.group.position.clone(); from.y=2.2;
          const dir=new THREE.Vector3(player.position.x-from.x,0,player.position.z-from.z);
          const hd=dir.length(); dir.normalize();
          const vel=new THREE.Vector3(dir.x*(hd/60),.55,dir.z*(hd/60));
          const p=new THREE.Mesh(new THREE.SphereGeometry(.25,10,10),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff3300,emissiveIntensity:.8,metalness:.7,roughness:.3}));
          p.position.copy(from);
          p.userData.velocity=vel;
          p.userData.damage=this.damage;
          p.userData.isEnemyProjectile=true;
          p.userData.sourceType='mortar';
          p.userData.life=400;
          p.userData.isMortar=true;
          p.userData.gravity=true;
          scene.add(p); projectiles.push(p);
          this.mortarCharging=false; this.mortarCharge=0; this.shootTimer=0; this.shootCooldown=3.5+Math.random()*1.5;
          if(this.parts.chargeGlow) this.parts.chargeGlow.material.opacity=0;
        }
      }
      this.facePlayer(dt,5);
      if(this.damageFlash > 0){ this.damageFlash -= dt; if(this.parts.bodyMat){ this.parts.bodyMat.emissive.setRGB(1,1,1); this.parts.bodyMat.emissiveIntensity=this.damageFlash*5 } }
      return;
    }

    if(this.type === 'illusionist'){
      if(this.illusionPhase === 'hidden'){
        this.illusionTimer += dt;
        if(this.illusionTimer > .3){
          this.illusionPhase='copies'; this.spawnIllusionCopies();
          this.group.traverse(o=>{ if(o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>{ m.opacity=1 }) } });
        }
        const ang=Date.now()*.002+this.wiggleOffset;
        const np=this.group.position.clone();
        np.x+=Math.cos(ang)*this.speed*40*dt; np.z+=Math.sin(ang)*this.speed*40*dt;
        if(!this.checkColliderCollision(np) && Math.abs(np.x)<24 && Math.abs(np.z)<24){ this.group.position.x=np.x; this.group.position.z=np.z }
        return;
      }
      if(this.illusionPhase === 'copies'){
        const np=this.group.position.clone();
        if(dist < 8){ np.x-=dx/dist*this.speed*60*sm*dt; np.z-=dz/dist*this.speed*60*sm*dt }
        let cc=0; for(const e of enemies) if(!e.dead && e.type==='illusion_copy' && e.parentIllusionist===this) cc++;
        if(cc === 0){ this.illusionPhase='flying'; this.isFlying=true; this.baseY=this.group.position.y; audio.illusion() }
        this.facePlayer(dt,5);
        return;
      }
      if(this.illusionPhase === 'flying'){
        this.group.position.y=Math.min(3.5,this.group.position.y+dt*1.5);
        this.shootTimer += dt;
        if(this.shootTimer >= this.shootCooldown && dist < 20){
          this.shootTimer=0;
          const from=this.group.position.clone(); from.y+=1.2;
          const dir=new THREE.Vector3(player.position.x-from.x,player.position.y+.5-from.y,player.position.z-from.z).normalize();
          const p=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),new THREE.MeshBasicMaterial({color:0xdd66ff}));
          p.position.copy(from); p.userData.velocity=dir.multiplyScalar(.6);
          p.userData.damage=this.damage*.5;
          p.userData.isEnemyProjectile=true;
          p.userData.sourceType='illusionist';
          p.userData.life=150;
          scene.add(p); projectiles.push(p);
        }
        this.facePlayer(dt,5);
        return;
      }
    }

    if(this.type === 'illusion_copy'){
      const np=this.group.position.clone();
      if(dist > 3){ np.x+=dx/dist*this.speed*60*sm*dt; np.z+=dz/dist*this.speed*60*sm*dt }
      if(!this.checkColliderCollision(np) && Math.abs(np.x)<24 && Math.abs(np.z)<24){ this.group.position.x=np.x; this.group.position.z=np.z }
      this.shootTimer += dt;
      if(this.shootTimer >= 1.5 && dist < 12){
        this.shootTimer=0;
        const from=this.group.position.clone(); from.y+=1.2;
        const dir=new THREE.Vector3(player.position.x-from.x,player.position.y+.5-from.y,player.position.z-from.z).normalize();
        const p=new THREE.Mesh(new THREE.SphereGeometry(.09,6,6),new THREE.MeshBasicMaterial({color:0xdd66ff,transparent:true,opacity:.7}));
        p.position.copy(from); p.userData.velocity=dir.multiplyScalar(.5);
        p.userData.damage=this.damage;
        p.userData.isEnemyProjectile=true;
        p.userData.sourceType='illusion_copy';
        p.userData.life=150;
        scene.add(p); projectiles.push(p);
      }
      if(dist < 1.2 && Date.now()-this.lastAttackTime > 800){ this.lastAttackTime=Date.now(); damagePlayer(this.damage,'illusion_copy',.3) }
      this.facePlayer(dt,5);
      return;
    }

    if(this.type === 'wallbreaker'){
      this.wallSlideDir = (this.wallSide==='n'||this.wallSide==='s') ? Math.sign(player.position.x-this.wallPos) : Math.sign(player.position.z-this.wallPos);
      if(this.wallSlideDir === 0) this.wallSlideDir=1;
      this.wallPos += this.wallSlideDir*this.speed*40*sm*dt;
      this.wallPos = Math.max(-24,Math.min(24,this.wallPos));
      if(this.wallSide === 'n') this.group.position.set(this.wallPos,.4,-24.4);
      else if(this.wallSide === 's') this.group.position.set(this.wallPos,.4,24.4);
      else if(this.wallSide === 'e') this.group.position.set(24.4,.4,this.wallPos);
      else this.group.position.set(-24.4,.4,this.wallPos);
      this.group.rotation.y=Math.atan2(player.position.x-this.group.position.x, player.position.z-this.group.position.z);
      this.shootTimer += dt;
      if(this.shootTimer >= this.shootCooldown && dist < 12){
        this.shootTimer=0;
        audio.play('flamethrower');
        const from=this.group.position.clone(); from.y+=.3;
        const dir=new THREE.Vector3(player.position.x-from.x,0,player.position.z-from.z).normalize();
        for(let k=0;k<3;k++){
          const sd=dir.clone(); sd.x+=(Math.random()-.5)*.3; sd.z+=(Math.random()-.5)*.3; sd.normalize();
          const p=new THREE.Mesh(new THREE.SphereGeometry(.15,6,6),new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:.85}));
          p.position.copy(from); p.userData.velocity=sd.multiplyScalar(1.5);
          p.userData.damage=this.damage*.4;
          p.userData.isEnemyProjectile=true;
          p.userData.sourceType='wallbreaker';
          p.userData.life=5;
          scene.add(p); projectiles.push(p);
        }
      }
      return;
    }

    if(this.type === 'verkhushka'){
      if(this.vkState === 'buried'){
        const alive=enemies.filter(e=>!e.dead && e!==this).length;
        if(waveTotalEnemies > 0 && (alive < waveTotalEnemies*.2 || alive === 0)){
          this.vkState='emerging'; this.vkTimer=0; audio.play('beam');
        }
        return;
      }
      if(this.vkState === 'emerging'){
        this.vkTimer += dt;
        const t=Math.min(1,this.vkTimer/2.5);
        this.group.position.y=-.85+t*1.2;
        if(t >= 1){
          this.vkState='active'; this.vkTimer=0;
          if(this.parts.eyeL) this.parts.eyeL.visible=true;
          if(this.parts.eyeR) this.parts.eyeR.visible=true;
          if(this.parts.emitter){ this.parts.emitter.visible=true; this.parts.emitter.material.opacity=1 }
          audio.beamFire();
        }
        return;
      }
      if(this.vkState === 'active'){
        this.facePlayer(dt,4);
        this.group.position.y=.35+Math.sin(Date.now()*.003)*.05;
        this.group.rotation.z=Math.sin(Date.now()*.01)*.3;
        this.shootTimer += dt;
        if(this.shootTimer >= this.shootCooldown && dist < 25){
          this.shootTimer=0;
          audio.beamFire();
          const from=this.group.position.clone(); from.y+=.3;
          const to=player.position.clone(); to.y-=.4;
          const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from,to]),8,.05,6,false);
          const beam=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffdd00,transparent:true,opacity:.9}));
          scene.add(beam);
          lightningBolts.push({mesh:beam, life:.2, maxLife:.2});
          damagePlayer(this.damage,'verkhushka',.7,{armorMult:2.0,hpMult:.25,burn:true});
        }
        return;
      }
    }

    if(this.canDodge && !hgFrozen){
      this.dodgeTimer -= dt;
      if(this.dodgeTimer <= 0){
        this.dodgeTimer = this.type === 'ninja' ? .25 : .3;
        let inc=null;
        for(const p of projectiles){
          if(!p.userData.isPlayerBullet) continue;
          const tMe=this.group.position.clone().sub(p.position), d=tMe.length();
          if(d > 6 || d < .5) continue;
          if(tMe.clone().normalize().dot(p.userData.velocity.clone().normalize()) > .8){ inc=p.userData.velocity.clone().normalize(); break }
        }
        if(inc && Math.random() < this.dodgeChance){
          const perp=new THREE.Vector3(-inc.z,0,inc.x);
          if(Math.random() < .5) perp.negate();
          const np=this.group.position.clone();
          const amt=this.type === 'ninja' ? this.speed*6 : this.speed*4;
          np.x+=perp.x*amt; np.z+=perp.z*amt;
          if(!this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z }
        }
      }
    }

    const moved=this.group.position.distanceTo(this.lastPosCheck);
    this.lastPosCheck.copy(this.group.position);
    if(moved < this.speed*.3 && dist > 4 && this.type !== 'sniper_enemy'){
      this.stuckTimer += dt;
      if(this.stuckTimer > .6){ this.unstuckDuration=1.2; this.unstuckSign=Math.random() < .5?1:-1; this.stuckTimer=0 }
    } else if(moved > this.speed*.5) this.stuckTimer=Math.max(0,this.stuckTimer-dt*2);

    let tdx=player.position.x-this.group.position.x;
    let tdz=player.position.z-this.group.position.z;
    if(this.unstuckDuration > 0){
      this.unstuckDuration -= dt;
      const px=-tdz/dist, pz=tdx/dist;
      tdx=px*dist*this.unstuckSign; tdz=pz*dist*this.unstuckSign;
    }
    this.wiggleOffset += dt*this.wiggleSpeed;
    this.strafeTimer += dt;
    if(this.strafeTimer > 2+Math.random()*2){ this.strafeTimer=0; this.strafeDirection*=-1 }

    if(this.type === 'spider'){
      this.leapCooldown -= dt;
      if(this.leapCooldown <= 0 && dist < 6 && dist > 1){
        const np=this.group.position.clone();
        np.x-=tdx/dist*2; np.z-=tdz/dist*2;
        if(!this.checkColliderCollision(np)) this.group.position.copy(np);
        this.leapCooldown=2+Math.random();
        audio.jump();
      }
      if(this.parts.legs){
        this.parts.legs.forEach((leg,i)=>{
          const by=leg.baseY||.5;
          leg.mesh.position.y=by+Math.sin(Date.now()*.02+leg.phase)*.12;
        });
      }
    }

    if(this.type === 'chariot'){
      if(this.chargeTime > 0){
        this.chargeTime -= dt;
        const np=this.group.position.clone();
        np.x+=this.chargeDir.x*this.speed*2.5*60*dt; np.z+=this.chargeDir.z*this.speed*2.5*60*dt;
        if(!this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z }
        if(this.group.position.distanceTo(player.position) < 1.8){ damagePlayer(this.damage,'chariot',1.5); cameraShake(.4,.5); this.chargeTime=0; this.chargeCooldown=5 }
        this.parts.wheels.forEach(w=>w.rotation.x-=.5);
        this.facePlayer(dt,4); return;
      }
      if(this.chargeCooldown > 0) this.chargeCooldown -= dt;
      if(this.chargeCooldown <= 0 && dist < 16 && dist > 3){
        this.chargeTime=1.3; this.chargeCooldown=5;
        this.chargeDir={x:tdx/dist,z:tdz/dist};
        audio.dash();
      }
      if(this.parts.wheels) this.parts.wheels.forEach(w=>w.rotation.x-=this.speed*30);
    }

    if(this.type === 'spawner'){
      this.spawnTimer += dt;
      if(this.spawnTimer >= this.spawnCooldown){ this.spawnTimer=0; this.spawnMinions() }
    }

    if(this.type === 'sniper_enemy'){
      this.shootTimer += dt;
      if(this.shootTimer >= this.shootCooldown && dist < 30){ this.shootTimer=0; this.shootCooldown=4+Math.random()*3; this.shootAtPlayer() }
      if(dist < 15){
        const np=this.group.position.clone();
        np.x-=tdx/dist*this.speed*sm; np.z-=tdz/dist*this.speed*sm;
        if(Math.abs(np.x)<24 && Math.abs(np.z)<24 && !this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z }
        this.facePlayer(dt,8); return;
      }
    }

    if(this.shootCooldown !== undefined && this.type !== 'sniper_enemy'){
      this.shootTimer += dt;
      if(this.shootTimer >= this.shootCooldown && dist < 25){ this.shootTimer=0; this.shootAtPlayer() }
    }

    if(this.type === 'bomber' && dist < 2){ this.explodeBomber(); return }

    const mt = this.type === 'spider' ? 10 : this.type === 'ninja' ? 8 : this.type === 'fortifier' ? 6 : 2;
    let walking=false;
    if(dist > mt){
      walking=true;
      let mx=tdx/dist*this.speed*sm, mz=tdz/dist*this.speed*sm;
      const w=Math.sin(this.wiggleOffset)*.02;
      mx+=Math.cos(Math.atan2(tdz,tdx)+Math.PI/2)*w;
      mz+=Math.sin(Math.atan2(tdz,tdx)+Math.PI/2)*w;
      const np=this.group.position.clone();
      np.x+=mx; np.z+=mz;
      let mo=false;
      if(Math.abs(np.x)<24 && Math.abs(np.z)<24){
        if(!this.checkColliderCollision(np)){ this.group.position.x=np.x; this.group.position.z=np.z; mo=true }
        else { this.pushOutOfCollider(); mo=true }
      }
      if(mo) this.checkEnemyCollision(this.group.position);
      this.walkPhase += dt*this.speed*100;
      this.animateWalk();
    } else if(!this.shootCooldown && !['bomber','spawner','slug','sniper_enemy','chariot','spider','ninja','fortifier','worm','mortar','illusionist','illusion_copy','wallbreaker','verkhushka'].includes(this.type)){
      const now=Date.now();
      if(now-this.lastAttackTime > 1000){ this.lastAttackTime=now; damagePlayer(this.damage,this.type,.5) }
    }

    const nb=['drone','slug','spider','chariot'].includes(this.type);
    if(!nb && !this.isFlying){
      if(walking) this.group.position.y=Math.abs(Math.sin(this.walkPhase*2))*.04;
      else this.group.position.y=Math.sin(Date.now()*.002+this.wiggleOffset)*.01;
    }
    this.facePlayer(dt,this.type === 'ninja' ? 8 : 6);
    if(this.isFlying) this.group.position.y=this.baseY+Math.sin(Date.now()*.002)*.3;

    const p=this.parts;
    if(p.eyes){ const i=.5+Math.sin(Date.now()*.005)*.5; p.eyes.forEach(e=>e.material.color.setRGB(1,i*.3,i*.3)) }
    if(p.eye){ const i=.5+Math.sin(Date.now()*.008)*.5; p.eye.material.color.setRGB(i,0,i) }
    if(p.propeller) p.propeller.rotation.y+=.5;
    if(p.spark) p.spark.material.color.setRGB(1,.5+Math.sin(Date.now()*.02)*.5,0);
    if(p.bandana) p.bandana.rotation.z=.35+Math.sin(Date.now()*.008)*.15;
    if(p.shuriken) p.shuriken.rotation.z+=.15;
    if(this.throwAnim > 0 && p.rightArm) p.rightArm.rotation.x=-1.5*Math.max(0,this.throwAnim/.3);
    if(p.shield){ p.shield.rotation.y+=dt*.3; const pu=1+Math.sin(Date.now()*.003)*.03; p.shield.scale.setScalar(pu) }
    if(p.core){ const ps=1+Math.sin(Date.now()*.005)*.1; p.core.scale.setScalar(ps) }
    if(p.coreRing) p.coreRing.rotation.z+=dt*.5;
    if(p.orbs) p.orbs.forEach(o=>{ const t=Date.now()*.001+o.phase; o.mesh.position.set(Math.cos(t),1+Math.sin(t*2)*.15,Math.sin(t)) });
    if(this.damageFlash > 0){ this.damageFlash -= dt; if(p.bodyMat){ p.bodyMat.emissive.setRGB(1,1,1); p.bodyMat.emissiveIntensity=this.damageFlash*5 } }
  }

  shootAtPlayer(){
    if(!hasLineOfSight(this.group.position, player.position)) return;
    audio.enemyShoot();
    const target=new THREE.Vector3(player.position.x,1.2,player.position.z);
    const sp=this.group.position.clone(); sp.y+=1.2;
    const dir=target.clone().sub(sp).normalize();
    const mk=(spd,sz,col,life,extra)=>{
      const p=new THREE.Mesh(new THREE.SphereGeometry(sz,8,8),new THREE.MeshBasicMaterial({color:col}));
      p.position.copy(sp); p.userData.velocity=dir.clone().multiplyScalar(spd);
      p.userData.damage=this.damage;
      p.userData.isEnemyProjectile=true;
      p.userData.life=life;
      p.userData.sourceType=this.type;
      if(extra) Object.assign(p.userData,extra);
      scene.add(p); projectiles.push(p);
      return p;
    };
    if(this.weaponType === 'pistol') mk(.45,.12,0xffaa00,200);
    else if(this.weaponType === 'acid') mk(.37,.15,0x00ff00,200);
    else if(this.weaponType === 'rifle') mk(.67,.1,0xff6600,180);
    else if(this.weaponType === 'spider_shot') mk(.10,.28,0xffffff,600,{slowsPlayer:true});
    else if(this.weaponType === 'fortifier_bolt') mk(.4,.14,0x66ddff,220);
    else if(this.weaponType === 'sniper'){
      audio.sniperShot();
      const bg=new THREE.Group();
      this.eA(new THREE.CylinderGeometry(.02,.02,.8,8),new THREE.MeshBasicMaterial({color:0xff0000}),0,0,0,Math.PI/2,0,0,bg);
      bg.position.copy(sp); bg.lookAt(target);
      bg.userData.velocity=dir.clone().multiplyScalar(1.2);
      bg.userData.damage=this.damage;
      bg.userData.isEnemyProjectile=true;
      bg.userData.sourceType='sniper_enemy';
      bg.userData.life=200;
      scene.add(bg); projectiles.push(bg);
    }
    else if(this.weaponType === 'tank_shell') mk(.35,.35,0xff6600,300,{isRocket:true,tankShell:true,explodeRadius:4.5});
    else if(this.weaponType === 'shotgun'){
      for(let i=0;i<4;i++){
        const sd=dir.clone();
        sd.x+=(Math.random()-.5)*.3; sd.y+=(Math.random()-.5)*.15; sd.z+=(Math.random()-.5)*.3;
        sd.normalize();
        mk(.37,.08,0xff3300,100);
      }
    }
    else if(this.weaponType === 'rocket') mk(.3,.2,0xff4400,300,{isRocket:true});
  }

  explodeBomber(){
    if(this.dead) return;
    this.dead=true;
    audio.explosion();
    cameraShake(.4,.6);
    createExplosion(this.group.position);
    const d=player.position.distanceTo(this.group.position);
    if(d < this.explodeRadius) damagePlayer(this.damage*(1-d/this.explodeRadius),'bomber',1);
    this.scatter();
    scene.remove(this.group);
    const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
    enemiesKilled++; updateUI();
  }

  animateWalk(){
    const p=this.walkPhase;
    if(['human','robot','shooter','spitter','gunner','sniper_enemy','shotgunner','rocketeer','spawner','enemy_shotgunner','trickster','ninja','fortifier'].includes(this.type)){
      if(this.parts.leftArm && !(this.type==='ninja'&&this.throwAnim>0)) this.parts.leftArm.rotation.x=Math.sin(p)*.5;
      if(this.parts.rightArm && !(this.type==='ninja'&&this.throwAnim>0)) this.parts.rightArm.rotation.x=-Math.sin(p)*.5;
      if(this.parts.leftLeg) this.parts.leftLeg.rotation.x=-Math.sin(p)*.5;
      if(this.parts.rightLeg) this.parts.rightLeg.rotation.x=Math.sin(p)*.5;
    } else if(this.type === 'runner' && this.parts.legs){
      this.parts.legs.forEach((l,i)=>{ l.rotation.x=Math.sin(p*2+(i<2?0:Math.PI))*(i%2===0?1:-1)*.7 });
    } else if(this.type === 'tank'){
      if(this.parts.leftArm) this.parts.leftArm.rotation.x=Math.sin(p*.5)*.3;
      if(this.parts.rightArm) this.parts.rightArm.rotation.x=-Math.sin(p*.5)*.3;
    } else if(this.type === 'bomber') this.group.rotation.z=Math.sin(p*2)*.2;
    else if(this.type === 'slug') this.group.scale.y=1+Math.sin(p*2)*.15;
  }

  // ═══ TAKE DAMAGE — главный апдейт фазы 2 ═══
  takeDamage(dmg, hitPoint, damageType, opts){
    if(this.dead) return false;
    opts = opts || {};

    // Whip signature — 1-shot на <50 HP
    if(currentWeapon && currentWeapon.weaponClass === 'whip' && hasSignature('whip','crit',2)){
      if(this.health < 50){
        spawnDamageNumber(hitPoint, 9999, true);
        this.die();
        return true;
      }
    }

    // Cheerful whip = insta
    if(this.type === 'cheerful' && currentWeapon && currentWeapon.weaponClass === 'whip'){
      spawnDamageNumber(hitPoint, 9999, true);
      this.die();
      return true;
    }

    if(this.type !== 'fortifier'){
      for(const f of activeFortifiers){
        if(f.dead) continue;
        if(f.group.position.distanceTo(this.group.position) < FORTIFIER_SHIELD_RADIUS){
          if(dmg > 2) createShieldImpact(hitPoint.clone());
          return false;
        }
      }
    }
    const ht = this.checkHit(hitPoint);
    if(!ht) return false;

    if(this.type === 'worm'){
      if(this.lastHitSegment === 0){ audio.hit(); spawnDamageNumber(hitPoint,dmg,true); this.die(); return true }
      else if(this.lastHitSegment > 0){
        audio.hit(); spawnDamageNumber(hitPoint,dmg,false);
        this.health -= dmg;
        this.damageFlash=.15;
        if(this.health <= 0){ this.splitAt(this.lastHitSegment); return true }
        return false;
      }
      return false;
    }

    const _dt = damageType !== undefined ? damageType : (currentWeapon ? currentWeapon.damageType : undefined);
    let fd = dmg;

    // ═══ THERMAL SHOCK ═══
    if(this.burnTimer > 0 && _dt === 'ice') fd *= 1.3;
    if(this.frozenTimer > 0 && _dt === 'fire') fd *= 1.5;
    if(this.poisonTimer > 0 && _dt === 'explosive') fd *= 1.3;
    if(this.slowTimer > 0 && opts.isCrit) fd *= 1.2;

    // Headshot
    if(ht === 'head'){
      fd *= 2.5;
      audio.headshot();
      createBloodEffect(hitPoint, 'headshot');
      cameraShake(.15,.2);
      showHitmarker(true);
      showHeadshotText();
    } else if(ht === 'legs'){
      fd *= .7;
      audio.hit();
      createBloodEffect(hitPoint, ['robot','tank','drone','spawner','trickster','chariot','fortifier','mortar','wallbreaker','ufo'].includes(this.type)?'robot':'human');
      showHitmarker(false);
    } else {
      audio.hit();
      createBloodEffect(hitPoint, ['robot','tank','drone','spawner','trickster','chariot','fortifier','mortar','wallbreaker','ufo'].includes(this.type)?'robot':'human');
      showHitmarker(false);
    }

    if(modifiers.includes('always_crit') || (modifiers.includes('critical') && Math.random()<.2)){ fd *= 3; cameraShake(.1,.2) }
    if(modifiers.includes('lifesteal')){ player.health=Math.min(player.maxHealth,player.health+5); updateUI() }

    // Apply status effects from opts (set by weapons.js via game.js)
    if(opts.burn){ this.burnTimer=Math.max(this.burnTimer, opts.burn.duration); this.burnDps=opts.burn.dps; this.burnSpread=opts.burn.spread||0; this._burnSpreadApplied=false }
    if(opts.poison){
      this.poisonTimer=Math.max(this.poisonTimer, opts.poison.duration);
      this.poisonDps=opts.poison.dps;
      this.poisonStacks=Math.min(5, (this.poisonStacks||1) + (opts.poison.stacks||1) - 1);
    }
    if(opts.slow){
      this.slowTimer=Math.max(this.slowTimer, opts.slow.duration);
      this.iceHits++;
      this.iceResetTimer=2;
      // ICE R2: 3 замедления → заморозка
      if(hasSynergy('ice',2) && this.iceHits >= 3){
        this.frozenTimer=Math.max(this.frozenTimer, 2);
        this.iceHits=0;
        audio.freeze();
        showFreezeText();
      }
    }
    if(opts.freeze){
      this.frozenTimer=Math.max(this.frozenTimer, opts.freeze.duration);
      audio.freeze();
    }
    if(opts.freezeAoe){
      enemies.slice().forEach(e=>{
        if(!e.dead && e.group.position.distanceTo(this.group.position) < opts.freezeAoe){
          e.frozenTimer=Math.max(e.frozenTimer, .5);
        }
      });
    }
    // CRIT R3: криты накладывают кровотечение
    if(opts.isCrit && hasSynergy('crit',3)){
      this.bleedTimer=Math.max(this.bleedTimer, 5);
      this.bleedDps=5;
    }
    // Icegun signature — каждый 3-й выстрел = заморозка
    if(currentWeapon && currentWeapon.weaponClass === 'icegun'){
      _icegunShotCounter++;
      if(hasSignature('icegun','ice',2) && _icegunShotCounter % 3 === 0){
        this.frozenTimer=Math.max(this.frozenTimer, 1.5);
        audio.freeze();
      }
    }

    // Legacy damage type effects
    if(_dt === 'fire') this.burnTimer=Math.max(this.burnTimer, 3);
    if(_dt === 'acid') this.poisonTimer=Math.max(this.poisonTimer, 3);
    if(_dt === 'ice'){
      this.slowTimer=3; this.iceHits++; this.iceResetTimer=2;
      if(this.iceHits >= 3){ this.frozenTimer=3; this.iceHits=0; audio.freeze(); showFreezeText() }
    }
    if(modifiers.includes('fire_trail')) this.burnTimer=3;

    this.health -= fd;
    this.damageFlash = .15;
    spawnDamageNumber(hitPoint, fd, ht === 'head');

    if(['robot','drone'].includes(this.type)){
      this.overload += fd;
      if(this.overload > 50){ this.explode(); return true }
    }
    if(this.health <= 0){ this.die(); return true }
    return false;
  }

  explode(){
    if(this.dead) return;
    this.dead=true;
    audio.explosion();
    cameraShake(.3,.5);
    createExplosion(this.group.position);
    enemies.slice().forEach(e=>{ if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 3) e.takeDamage(30, e.group.position) });
    this.scatter();
    scene.remove(this.group);
    const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
    enemiesKilled++; updateUI();
  }

  die(){
    if(this.dead) return;
    if(this.chessTelegraph){ scene.remove(this.chessTelegraph); this.chessTelegraph.geometry.dispose(); this.chessTelegraph.material.dispose(); this.chessTelegraph=null }
    if(this.type === 'bomber'){ this.explodeBomber(); return }
    if(this.type === 'illusion_copy'){
      this.dead=true;
      const d=player.position.distanceTo(this.group.position);
      if(d < 4){
        player.freezeTimer=Math.max(player.freezeTimer,2);
        audio.freezeBurst();
        const ring=new THREE.Mesh(new THREE.RingGeometry(.3,3,24),new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
        ring.rotation.x=-Math.PI/2; ring.position.copy(this.group.position); ring.position.y=.1;
        scene.add(ring); aoeSpheres.push({mesh:ring, life:.6, maxLife:.6});
        cameraShake(.15,.25);
      }
      audio.death();
      createBloodEffect(this.group.position,'robot');
      this.scatter(); scene.remove(this.group);
      const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
      enemiesKilled++; updateUI();
      return;
    }

    this.dead=true;
    audio.death();
    createBloodEffect(this.group.position, ['robot','tank','drone','spawner','trickster','chariot','fortifier','mortar','wallbreaker','ufo'].includes(this.type)?'robot':'human');
    cameraShake(.1,.2);
    hitstopTime = Math.max(hitstopTime, .07);

    // BERZERKER duo — огонь лечит
    if(activeDuos.includes('berzerker') && this.burnTimer > 0){
      player.health = Math.min(player.maxHealth, player.health + Math.floor(this.maxHealth * 0.1));
      updateUI();
    }

    // POISON R2 — лужа при убийстве
    if(hasSynergy('poison',2) && (this.poisonTimer > 0 || currentWeapon && currentWeapon.damageType === 'acid')){
      createPoisonPuddle(this.group.position.clone());
    }
    // FIRE R3 — огненный взрыв
    if(hasSynergy('fire',3) && this.burnTimer > 0){
      createExplosion(this.group.position);
      createAOESphere(this.group.position, 3, 0xff4400);
      enemies.slice().forEach(e=>{
        if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 3)
          e.takeDamage(30, e.group.position, 'fire');
      });
    }
    // EXPLOSIVE R3 — взрыв при смерти
    if(hasSynergy('explosive',3)){
      createExplosion(this.group.position);
      createAOESphere(this.group.position, 3, 0xff8800);
      enemies.slice().forEach(e=>{
        if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 3)
          e.takeDamage(40, e.group.position, 'explosive');
      });
    }
    // SUMMON R3 — миньон
    if(hasSynergy('summon',3)){
      const mn = new Enemy('runner', this.group.position.clone().add(new THREE.Vector3(1,0,0)), {friendlyMinion:true});
      mn.isFriendlyMinion = true;
      mn.health = 20; mn.maxHealth = 20; mn.damage = 15;
      mn.parts.bodyMat.color.setHex(0x00ff66);
      enemies.push(mn);
    }
    // Necro signature — зомби
    if(currentWeapon && currentWeapon.weaponClass === 'necro' && hasSignature('necro','poison',3)){
      const z = new Enemy('runner', this.group.position.clone(), {friendlyMinion:true});
      z.isFriendlyMinion = true;
      z.health = 20; z.maxHealth = 20; z.damage = 15;
      z.parts.bodyMat.color.setHex(0x66cc00);
      enemies.push(z);
    }
    // AOE R3 — стягивание при убийстве
    if(hasSynergy('aoe',3)){
      enemies.slice().forEach(e=>{
        if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 6){
          const pull = this.group.position.clone().sub(e.group.position);
          pull.y = 0; pull.normalize();
          e.group.position.add(pull.multiplyScalar(1.5));
        }
      });
    }
    // Death bomb utility
    if(playerBuffs.deathBomb > 0 && this.type === 'bomber'){
      // handled by bomber explode
    }

    if(modifiers.includes('vampire')) player.health=Math.min(player.maxHealth,player.health+10);
    if(modifiers.includes('vampire_plus')) player.health=Math.min(player.maxHealth,player.health+20);
    if(modifiers.includes('armor_on_kill')) player.armor=Math.min(player.maxArmor,player.armor+10);
    if(modifiers.includes('poison')) createPoisonCloud(this.group.position);
    if(modifiers.includes('aoe_kill')){
      audio.explosion();
      createExplosion(this.group.position);
      enemies.slice().forEach(e=>{ if(!e.dead && e !== this && e.group.position.distanceTo(this.group.position) < 4) e.takeDamage(50, e.group.position) });
    }
    if(this.type === 'trickster'){
      const trap=new THREE.Mesh(new THREE.CylinderGeometry(4,4,.02,20),new THREE.MeshBasicMaterial({color:0xff00ff,transparent:true,opacity:.08}));
      trap.position.set(this.group.position.x,.02,this.group.position.z);
      scene.add(trap);
      tricksterTraps.push({mesh:trap, life:15, radius:4, cooldown:0});
      audio.tricksterTrap();
    }
    if(this.type === 'fortifier'){
      spawnSlowTrap(this.group.position.clone());
      audio.wallHit();
      if(this.parts.shield){ this.group.remove(this.parts.shield); disposeGroup(this.parts.shield); this.parts.shield=null }
    }
    if(this.type === 'ufo'){
      audio.explosion();
      createExplosion(this.group.position);
      const count=2+Math.floor(Math.random()*2);
      for(let i=0;i<count;i++){
        const ang=(i/count)*Math.PI*2, r=1.5;
        const al=new Enemy('green_alien', new THREE.Vector3(this.group.position.x+Math.cos(ang)*r,0,this.group.position.z+Math.sin(ang)*r));
        enemies.push(al);
      }
    }
    const dc = MEDKIT_CHANCE[this.type];
    if(dc !== undefined && Math.random() < dc) spawnMedkit(this.group.position.clone());
    const ac = ARMOR_CHANCE[this.type];
    if(ac !== undefined && Math.random() < ac) spawnArmorPickup(this.group.position.clone());
    this.scatter();
    scene.remove(this.group);
    const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
    enemiesKilled++;
    updateUI();
  }

  scatter(){
    this.group.children.forEach(c=>{
      if(c.isMesh){
        const d={mesh:c.clone(),velocity:new THREE.Vector3((Math.random()-.5)*.3,Math.random()*.3+.2,(Math.random()-.5)*.3),angularVelocity:new THREE.Vector3((Math.random()-.5)*.2,(Math.random()-.5)*.2,(Math.random()-.5)*.2),life:300,grounded:false};
        d.mesh.position.copy(c.getWorldPosition(new THREE.Vector3()));
        scene.add(d.mesh);
        debris.push(d);
      }
    });
  }

  remove(){
    if(this.dead && enemies.indexOf(this) === -1) return;
    this.dead=true;
    scene.remove(this.group);
    const i=enemies.indexOf(this); if(i>-1) enemies.splice(i,1);
  }
}