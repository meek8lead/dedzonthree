'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.0 — WEAPONS

let _shotCounter = 0;
let _iceShotCounter = 0;

function getJam(){ return !!(ownedWeapons[curIdx] && ownedWeapons[curIdx].jammed) }
function setJam(v){ if(ownedWeapons[curIdx]) ownedWeapons[curIdx].jammed = !!v }
function updateJamUI(){
  const el = document.getElementById('jam-overlay');
  if(el) el.style.display = (getJam() && !isNestActive && !hubMode) ? 'block' : 'none';
}

function hasSignature(weaponClass, tag, level){
  return currentWeapon.weaponClass === weaponClass && hasSynergy(tag, level);
}

class WeaponView {
  constructor(){
    this.group = new THREE.Group();
    this.parts = {};
    this.hgPivot = null;
    this.recoilOffset = 0;
    this.aimBlend = 0;
    this.meleeSwingTime = 0;
    camera.add(this.group);
    this.buildWeapon(currentWeapon.weaponClass);
  }
  _matSteel(){ return new THREE.MeshStandardMaterial({color:0x9a9aa8,metalness:.92,roughness:.18}) }
  _matGunmetal(){ return new THREE.MeshStandardMaterial({color:0x3a3a44,metalness:.85,roughness:.35}) }
  _matPolymer(){ return new THREE.MeshStandardMaterial({color:0x1e1e26,metalness:.3,roughness:.7}) }
  _matAccent(){ return new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff3300,emissiveIntensity:.6}) }
  _matWood(){ return new THREE.MeshStandardMaterial({color:0x7a4a2a,roughness:.7,metalness:.15}) }
  _matBrass(){ return new THREE.MeshStandardMaterial({color:0xd4a040,metalness:.9,roughness:.2}) }
  _matBlueGlow(){ return new THREE.MeshBasicMaterial({color:0x00ffff}) }
  _matDarkHole(){ return new THREE.MeshBasicMaterial({color:0x000000}) }
  wA(g,mat,x,y,z,rx,ry,rz,par){
    const m = new THREE.Mesh(g,mat);
    m.position.set(x||0,y||0,z||0);
    m.rotation.set(rx||0,ry||0,rz||0);
    (par||this.group).add(m);
    return m;
  }
  wBox(w,h,d,mat,x,y,z){ return this.wA(new THREE.BoxGeometry(w,h,d),mat,x,y,z) }
  wCyl(rt,rb,h,s,mat,x,y,z,rx){ return this.wA(new THREE.CylinderGeometry(rt,rb,h,s),mat,x,y,z,rx===undefined?Math.PI/2:rx) }
  wTor(r,t,rs,ts,mat,x,y,z,rx,ry,rz){ return this.wA(new THREE.TorusGeometry(r,t,rs,ts),mat,x,y,z,rx,ry,rz) }
  wSph(r,ws,hs,mat,x,y,z){ return this.wA(new THREE.SphereGeometry(r,ws,hs),mat,x,y,z) }
  wCone(r,h,s,mat,x,y,z,rx,ry,rz){ return this.wA(new THREE.ConeGeometry(r,h,s),mat,x,y,z,rx,ry,rz) }
  mkGrip(mat,x,y,z,rx){
    const m = this.wBox(.07,.16,.09,mat,x===undefined?0:x,y===undefined?-.14:y,z===undefined?.05:z);
    m.rotation.x = (rx===undefined?-.3:rx);
    this.parts.grip = m;
    return m;
  }
  mkBarrel(mat,len,r,x,y,z){ return this.wCyl(r||.03,r||.03,len||.5,10,mat,x||0,y===undefined?.05:y,z===undefined?-.4:z) }
  mkBarrelMuzzle(mat,len,r,x,y,z){
    const b = this.wCyl(r||.04,r||.04,len||.4,12,mat,x||0,y===undefined?.05:y,z===undefined?-.4:z);
    this.wCyl((r||.04)*.55,(r||.04)*.55,.02,12,this._matPolymer(),x||0,y===undefined?.05:y,(z===undefined?-.4:z)-(len||.4)/2-.01);
    return b;
  }
  mkStock(mat){ return this.wBox(.09,.14,.3,mat,0,-.02,.32) }
  mkTriggerGuard(mat,x,y,z){ return this.wA(new THREE.TorusGeometry(.045,.007,6,12),mat,x||0,y===undefined?-.06:y,z===undefined?.04:z,Math.PI/2,0,Math.PI/2) }
  mkMag(mat,x,y,z){
    const g = new THREE.Group();
    this.wA(new THREE.BoxGeometry(.075,.2,.09),mat,0,-.08,0,0,0,0,g);
    g.position.set(x===undefined?0:x,y===undefined?-.1:y,z===undefined?.05:z);
    this.parts.magazine = g;
    this.parts.magOrigY = g.position.y;
    return g;
  }
  mkRail(mat,x,y,z,len){ return this.wBox(.08,.02,len||.35,mat,x||0,y===undefined?.11:y,z===undefined?-.1:z) }
  mkAccentStripe(mat,x,y,z,w,d){ return this.wBox(w||.12,.015,d||.3,mat,x||0,y===undefined?.06:y,z||0) }
  disposeChildren(){
    while(this.group.children.length > 0){
      const c = this.group.children[0];
      c.traverse(o=>{
        if(o.geometry && o.geometry.dispose) o.geometry.dispose();
        if(o.material){
          if(Array.isArray(o.material)) o.material.forEach(m=>{if(m&&m.dispose) m.dispose()});
          else if(o.material.dispose) o.material.dispose();
        }
      });
      this.group.remove(c);
    }
  }
  buildWeapon(wc){
    this.disposeChildren();
    this.parts = {};
    this.hgPivot = null;
    this.recoilOffset = 0;
    this.meleeSwingTime = 0;
    this.group.position.set(.3,-.3,-.6);
    this.group.rotation.set(0,0,0);
    const b = {
      pistol:()=>this.bPistol(), revolver:()=>this.bRevolver(), smg:()=>this.bSMG(), rifle:()=>this.bRifle(),
      burst:()=>this.bBurst(), shotgun:()=>this.bShotgun(), sniper:()=>this.bSniper(), railgun:()=>this.bRailgun(),
      minigun:()=>this.bMinigun(), acid:()=>this.bAcid(), acidotronator:()=>this.bAcidotronator(),
      flamethrower:()=>this.bFlame(), icegun:()=>this.bIce(), grenade:()=>this.bGrenade(),
      bfg:()=>this.bBFG(), plasma:()=>this.bPlasma(), saw:()=>this.bSaw(), tesla:()=>this.bTesla(),
      whip:()=>this.bWhip(), laser:()=>this.bLaser(), melee:()=>this.bMelee(), hammer:()=>this.bHammer(),
      singularity:()=>this.bSingularity(), necro:()=>this.bNecro(), sun:()=>this.bSun(),
      turret:()=>this.bTurret(), crossbow:()=>this.bCrossbow(), slingshot:()=>this.bSlingshot(),
      hourglass:()=>this.bHourglass(), fartgun:()=>this.bFartgun(), lohostvol:()=>this.bLohostvol()
    };
    if(b[wc]) b[wc]();
  }

  bPistol(){
    const s=this._matSteel(),p=this._matPolymer(),g=this._matGunmetal(),a=this._matAccent();
    this.wBox(.085,.06,.32,s,0,.06,-.06);
    for(let i=0;i<4;i++) this.wBox(.087,.04,.01,g,0,.06,-.15+i*.02);
    this.wBox(.075,.04,.26,p,0,.01,-.04);
    this.wCyl(.025,.025,.1,12,s,0,.06,-.24);
    this.wCyl(.018,.018,.01,8,this._matDarkHole(),0,.06,-.29);
    this.wCyl(.03,.03,.03,8,a,0,.06,-.22);
    this.wBox(.05,.015,.1,g,0,.095,-.1);
    this.parts.grip=this.wBox(.07,.16,.1,p,0,-.12,.06); this.parts.grip.rotation.x=-.2;
    this.parts.magazine=this.wBox(.065,.12,.085,g,0,-.14,.05); this.parts.magazine.rotation.x=-.2;
    this.parts.magOrigY=-.14;
    this.wBox(.07,.015,.09,s,0,-.23,.03).rotation.x=-.2;
    this.mkTriggerGuard(g,0,-.04,.03);
    this.wBox(.04,.04,.03,g,0,.08,.1); this.wBox(.03,.02,.02,g,0,.1,.08);
    this.wBox(.015,.02,.02,a,0,.1,-.17);
  }
  bRevolver(){
    const s=this._matSteel(),g=this._matGunmetal(),w=this._matWood(),b=this._matBrass(),a=this._matAccent();
    this.wBox(.1,.14,.22,s,0,.04,-.02); this.wBox(.075,.03,.28,s,0,.13,-.04);
    this.wCyl(.04,.04,.32,14,s,0,.1,-.24);
    this.wBox(.02,.015,.28,a,0,.14,-.24);
    this.wBox(.012,.04,.02,g,0,.155,-.36);
    this.wCyl(.025,.025,.01,10,this._matDarkHole(),0,.1,-.41);
    const cyl=new THREE.Group();
    this.wA(new THREE.CylinderGeometry(.075,.075,.12,14),b,0,0,0,Math.PI/2,0,0,cyl);
    for(let i=0;i<6;i++){const ang=i/6*Math.PI*2;
      this.wA(new THREE.CylinderGeometry(.018,.018,.13,8),g,Math.cos(ang)*.045,Math.sin(ang)*.045,0,Math.PI/2,0,0,cyl);
    }
    cyl.position.set(0,.1,-.02); this.group.add(cyl); this.parts.cylinder=cyl;
    this.wCyl(.008,.008,.28,6,g,0,.045,-.2);
    this.wBox(.025,.06,.03,g,0,.16,.06).rotation.x=-.3;
    this.mkTriggerGuard(s,0,-.03,.03);
    this.parts.grip=this.wBox(.08,.2,.1,w,0,-.15,.09); this.parts.grip.rotation.x=-.35;
    this.wBox(.085,.02,.1,b,0,-.25,.13);
  }
  bSMG(){
    const bd=this._matGunmetal(),s=this._matSteel(),p=this._matPolymer(),a=this._matAccent();
    this.wBox(.11,.14,.32,bd,0,.02,-.02); this.wBox(.09,.04,.3,s,0,.1,-.02);
    this.mkBarrelMuzzle(s,.24,.03,0,.08,-.32);
    for(let i=0;i<4;i++) this.wBox(.005,.04,.02,p,-.03+i*.02,.08,-.24);
    this.mkAccentStripe(a,0,.055,-.05,.115,.2);
    this.mkMag(p,0,-.16,-.08);
    this.wBox(.052,.02,.09,a,0,-.27,-.08);
    this.wCyl(.012,.012,.2,6,s,0,.03,.22);
    this.wBox(.04,.12,.03,p,0,.03,.32);
    this.mkGrip(p,0,-.13,.08);
    this.wBox(.05,.03,.06,p,0,.14,-.05);
    this.parts.lens=this.wA(new THREE.CircleGeometry(.02,14),this._matBlueGlow(),0,.145,-.09,-.2,0,0);
  }
  bRifle(){
    const bd=this._matGunmetal(),s=this._matSteel(),p=this._matPolymer(),w=this._matWood(),a=this._matAccent();
    this.wBox(.12,.15,.42,bd,0,.02,0);
    this.mkRail(s,0,.11,-.05,.5);
    this.mkBarrelMuzzle(s,.55,.04,0,.05,-.42);
    for(let i=0;i<5;i++) this.wBox(.08,.02,.03,p,0,.06,-.16-i*.055);
    this.mkAccentStripe(a,0,.075,.02,.125,.35);
    this.mkMag(p,0,-.05,.03);
    this.mkStock(w);
    this.wBox(.06,.04,.24,w,0,.09,.32);
    this.wBox(.1,.16,.03,p,0,-.02,.49);
    this.mkGrip(p,0,-.15,.05,-.25);
    this.wTor(.02,.008,6,10,s,0,.145,-.15);
    this.wBox(.02,.02,.02,this._matBlueGlow(),0,.145,-.15);
    this.wCyl(.008,.008,.04,6,p,0,.14,-.55,0);
  }
  bBurst(){
    const bd=new THREE.MeshStandardMaterial({color:0x22252a,metalness:.88,roughness:.2});
    const ac=new THREE.MeshStandardMaterial({color:0x4a4a5a,metalness:.9,roughness:.15});
    const dk=new THREE.MeshStandardMaterial({color:0x101015,metalness:.7,roughness:.4});
    this.wBox(.1,.12,.5,bd,0,.02,.08);
    this.wBox(.06,.04,.35,bd,0,.13,.05);
    this.wCyl(.02,.02,.25,8,ac,0,.05,-.25);
    this.parts.grip=this.wBox(.06,.15,.08,dk,0,-.1,-.05); this.parts.grip.rotation.x=-.25;
    this.parts.magazine=this.wBox(.06,.18,.1,dk,0,-.15,.15); this.parts.magazine.rotation.x=.1;
    this.parts.magOrigY=-.15;
    this.parts.lens=this.wA(new THREE.CircleGeometry(.02,16),new THREE.MeshBasicMaterial({color:0x00ffff}),0,.15,-.1);
  }
  bShotgun(){
    const s=this._matSteel(),g=this._matGunmetal(),w=this._matWood(),a=this._matAccent();
    this.wCyl(.04,.04,.72,12,s,0,.08,-.35);
    this.wCyl(.028,.028,.6,8,s,0,.03,-.32);
    this.parts.pump=this.wBox(.09,.07,.24,w,0,.03,-.2); this.parts.pumpOrigZ=-.2;
    this.mkAccentStripe(a,0,.075,-.2,.095,.2);
    this.wBox(.11,.15,.24,s,0,.02,0);
    this.wBox(.1,.13,.32,w,0,-.02,.28);
    this.wBox(.105,.14,.02,g,0,-.02,.44);
    this.wTor(.05,.008,6,12,s,0,-.05,.03,Math.PI/2,0,Math.PI/2);
    this.parts.sight=this.wSph(.014,8,8,this._matAccent(),0,.125,-.72);
    this.wBox(.02,.015,.5,g,0,.12,-.35);
  }
  bSniper(){
    const dk=this._matGunmetal(),s=this._matSteel(),sc=this._matPolymer(),a=this._matAccent();
    this.wCyl(.035,.035,.9,12,s,0,.05,-.45);
    this.wCyl(.05,.05,.08,12,dk,0,.05,-.92);
    this.wCyl(.025,.025,.01,10,this._matDarkHole(),0,.05,-.965);
    this.wBox(.11,.11,.32,dk,0,0,0);
    this.mkAccentStripe(a,0,.055,0,.115,.28);
    this.wCyl(.045,.045,.24,14,sc,0,.14,-.06);
    this.wA(new THREE.CircleGeometry(.042,18),this._matBlueGlow(),0,.14,-.185);
    this.wBox(.09,.12,.26,dk,0,-.02,.28);
    this.wBox(.1,.14,.02,dk,0,-.02,.42);
    this.mkGrip(dk,0,-.14,.08);
    this.wBox(.06,.1,.1,dk,0,-.12,.02);
  }
  bRailgun(){
    const m=new THREE.MeshStandardMaterial({color:0x1a1a3a,metalness:.95,roughness:.1});
    const e=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00aaaa,emissiveIntensity:.9});
    this.wCyl(.045,.045,.95,10,m,0,.05,-.48);
    this.wTor(.09,.025,10,14,e,0,.05,-.22);
    this.parts.core=this.wTor(.09,.025,10,14,e,0,.05,-.42);
    this.wBox(.13,.13,.28,m,0,0,0);
  }
  bMinigun(){
    const g=this._matGunmetal(),s=this._matSteel(),p=this._matPolymer(),a=this._matAccent();
    this.wBox(.17,.17,.28,p,0,0,0);
    this.wCyl(.09,.09,.12,12,s,0,.05,.16);
    const bb=new THREE.Group();
    for(let i=0;i<6;i++){const ang=i/6*Math.PI*2;
      this.wA(new THREE.CylinderGeometry(.022,.022,.6,8),s,Math.cos(ang)*.07,Math.sin(ang)*.07,-.32,Math.PI/2,0,0,bb);
    }
    this.wA(new THREE.TorusGeometry(.09,.015,6,20),p,0,0,-.15,Math.PI/2,0,0,bb);
    this.wA(new THREE.TorusGeometry(.09,.015,6,20),p,0,0,-.5,Math.PI/2,0,0,bb);
    this.group.add(bb); this.parts.barrelBlock=bb;
    this.mkAccentStripe(a,0,.06,0,.175,.22);
    this.wBox(.05,.03,.5,s,0,.1,-.15);
  }
  bAcid(){
    const fl=new THREE.MeshStandardMaterial({color:0x3a4a2a,metalness:.3,roughness:.7});
    const df=new THREE.MeshStandardMaterial({color:0x2a1a1a,metalness:.2,roughness:.9});
    const ac=new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00aa00,emissiveIntensity:.8,transparent:true,opacity:.85});
    const bn=new THREE.MeshStandardMaterial({color:0xc4b89a,roughness:.8});
    const bd=this.wBox(.14,.18,.35,fl,0,.05,-.05); bd.scale.set(1,1,1.2); this.parts.bioHead=bd;
    for(let i=0;i<4;i++) this.wCone(.03,.08,6,df,0,.16,.05-i*.06,-.3);
    this.wCyl(.04,.06,.4,8,bn,0,.05,-.3);
    this.wTor(.045,.015,6,12,df,0,.05,-.5,Math.PI/2);
    this.parts.sac=this.wSph(.09,10,10,ac,0,.18,.05);
    this.parts.sacL=this.wSph(.06,8,8,ac,-.08,.1,.15);
    this.parts.sacR=this.wSph(.06,8,8,ac,.08,.1,.15);
    this.parts.bioEye=this.wSph(.035,8,8,new THREE.MeshBasicMaterial({color:0xffff00}),0,.1,-.18);
    this.parts.grip=this.wBox(.07,.14,.08,df,0,-.1,.15); this.parts.grip.rotation.x=-.25;
  }
  bAcidotronator(){
    const r=new THREE.MeshStandardMaterial({color:0x6a3a1a,metalness:.8,roughness:.5});
    const d=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.9,roughness:.3});
    const gr=new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00aa00,emissiveIntensity:1,transparent:true,opacity:.9});
    this.wCyl(.06,.06,.35,8,gr,-.06,.02,.05);
    this.wCyl(.06,.06,.35,8,gr,.06,.02,.05);
    this.wBox(.15,.15,.3,d,0,0,0);
    this.wCyl(.03,.03,.3,8,r,-.04,0,-.25);
    this.wCyl(.03,.03,.3,8,r,.04,0,-.25);
    this.wCyl(.04,.04,.05,8,gr,-.04,0,-.4,0);
    this.wCyl(.04,.04,.05,8,gr,.04,0,-.4,0);
    this.parts.grip=this.wBox(.08,.16,.1,r,0,-.12,.08); this.parts.grip.rotation.x=-.25;
  }
  bFlame(){
    const m=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.7,roughness:.4});
    const d=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.6,roughness:.5});
    const r=new THREE.MeshStandardMaterial({color:0x6a3a1a,metalness:.7,roughness:.6});
    const t=new THREE.MeshStandardMaterial({color:0x8b4513,metalness:.4,roughness:.7});
    this.wCyl(.08,.08,.35,10,m,0,.03,-.1);
    this.parts.nozzle=this.wCyl(.03,.08,.22,10,d,0,.03,-.38);
    this.wTor(.075,.01,6,12,r,0,.03,-.49,Math.PI/2);
    this.parts.pilot=this.wSph(.025,8,8,new THREE.MeshBasicMaterial({color:0xff8800}),.04,.1,-.42);
    this.parts.tank=this.wCyl(.07,.07,.3,10,t,-.13,.02,.05);
    this.parts.grip=this.wBox(.06,.14,.08,d,0,-.12,.08); this.parts.grip.rotation.x=-.3;
  }
  bIce(){
    const b=new THREE.MeshStandardMaterial({color:0x3a4a6a,metalness:.75,roughness:.25});
    const ic=new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x4488ff,emissiveIntensity:.7,transparent:true,opacity:.85});
    const d=new THREE.MeshStandardMaterial({color:0x1a2a3a,metalness:.8,roughness:.4});
    this.wBox(.13,.15,.3,b,0,.02,0);
    for(let i=0;i<4;i++) this.wTor(.08,.008,6,12,d,0,.02,.1-i*.08,Math.PI/2);
    this.wCyl(.045,.045,.4,12,ic,0,.05,-.3);
    this.parts.crystal=this.wA(new THREE.OctahedronGeometry(.08,0),ic,0,.05,-.52);
    this.parts.grip=this.wBox(.07,.14,.09,d,0,-.13,.08); this.parts.grip.rotation.x=-.28;
  }
  bGrenade(){
    const b=new THREE.MeshStandardMaterial({color:0x5a5a42,metalness:.8,roughness:.4});
    const s=new THREE.MeshStandardMaterial({color:0x8a8a92,metalness:.95,roughness:.2});
    const d=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.6,roughness:.5});
    const br=new THREE.MeshStandardMaterial({color:0xc89a3a,metalness:.9,roughness:.25});
    const a=new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:.7});
    this.wCyl(.075,.075,.5,12,b,0,.05,-.28);
    for(let i=0;i<3;i++) this.wTor(.078,.008,6,14,d,0,.05,-.05-i*.1,Math.PI/2);
    this.wTor(.075,.015,8,14,s,0,.05,-.53);
    this.wCyl(.05,.05,.02,12,new THREE.MeshBasicMaterial({color:0}),0,.05,-.54);
    const dr=new THREE.Group(); this.group.add(dr); this.parts.drum=dr;
    this.wA(new THREE.CylinderGeometry(.11,.11,.16,14),br,0,0,0,0,0,Math.PI/2,dr);
    for(let i=0;i<6;i++){const ang=i/6*Math.PI*2;
      this.wA(new THREE.CylinderGeometry(.018,.018,.17,8),d,0,Math.cos(ang)*.06,Math.sin(ang)*.06,0,0,Math.PI/2,dr);
    }
    dr.position.set(0,-.02,.02);
    this.wBox(.1,.15,.25,d,0,-.05,-.02);
    this.parts.grip=this.wBox(.06,.15,.08,d,0,-.15,.1); this.parts.grip.rotation.x=-.3;
  }
  bBFG(){
    const m=new THREE.MeshStandardMaterial({color:0x2a1a3a,metalness:.95,roughness:.08});
    this.wCyl(.09,.09,.65,14,m,0,.05,-.32);
    this.parts.ring=this.wTor(.13,.035,10,18,new THREE.MeshStandardMaterial({color:0xff00ff,emissive:0xaa00aa,emissiveIntensity:.9}),0,.05,-.52);
    this.wBox(.22,.22,.32,m,0,0,0);
    this.parts.core=this.wSph(.08,16,16,new THREE.MeshBasicMaterial({color:0xff00ff}),0,.05,-.52);
  }
  bPlasma(){
    const m=new THREE.MeshStandardMaterial({color:0x1a2a3a,metalness:.85,roughness:.2});
    const e=new THREE.MeshStandardMaterial({color:0x00aaff,emissive:0x0066ff,emissiveIntensity:.8});
    this.wCyl(.03,.03,.5,8,m,-.05,.05,-.25);
    this.wCyl(.03,.03,.5,8,m,.05,.05,-.25);
    this.parts.plasmaCore=this.wSph(.05,12,12,e,0,.05,-.3);
    this.wBox(.14,.13,.28,m,0,0,0);
    this.parts.plasmaCell=this.wCyl(.04,.04,.12,10,e,0,-.02,.12);
  }
  bSaw(){
    const g=this._matGunmetal(),p=this._matPolymer(),a=this._matAccent();
    const sm=new THREE.MeshStandardMaterial({color:0xd0d0d8,metalness:.98,roughness:.06});
    this.wBox(.12,.15,.3,g,0,.02,.05);
    this.parts.grip=this.wBox(.07,.16,.1,p,0,-.12,.1); this.parts.grip.rotation.x=-.3;
    this.wBox(.2,.08,.25,g,0,.08,-.1); this.wBox(.2,.08,.25,g,0,-.04,-.1);
    const bg=new THREE.Group(); bg.position.set(0,.02,-.35); this.group.add(bg);
    this.parts.sawSpinners=[bg];
    bg.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.03,32),sm));
    for(let k=0;k<24;k++){const ang=k/24*Math.PI*2;
      const t=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.06),sm);
      t.position.set(Math.cos(ang)*.3,0,Math.sin(ang)*.3); t.rotation.y=-ang; bg.add(t);
    }
    bg.add(new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.04,16),a));
  }
  bTesla(){
    const m=new THREE.MeshStandardMaterial({color:0x5a5a6a,metalness:.85,roughness:.25});
    const d=new THREE.MeshStandardMaterial({color:0x2a2a3a,metalness:.7,roughness:.4});
    const cu=new THREE.MeshStandardMaterial({color:0xdc9858,metalness:.95,roughness:.2,emissive:0x6a2a00,emissiveIntensity:.3});
    const gl=new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x2255ff,emissiveIntensity:1.2,transparent:true,opacity:.9});
    this.wCyl(.035,.045,.55,10,m,0,.05,-.28);
    this.parts.coilOuter=this.wTor(.10,.02,8,20,cu,0,.05,-.35);
    this.parts.coilInner=this.wTor(.08,.018,8,20,cu,0,.05,-.42);
    this.parts.emitter=this.wSph(.06,14,14,gl,0,.05,-.54);
    this.wBox(.11,.13,.22,d,0,0,0);
  }
  bWhip(){
    const l=new THREE.MeshStandardMaterial({color:0x4a2a1a,roughness:.85});
    const g=new THREE.MeshStandardMaterial({color:0xffd700,metalness:.9,roughness:.15});
    const e=new THREE.MeshStandardMaterial({color:0xffaa00,emissive:0xff6600,emissiveIntensity:1.2,transparent:true,opacity:.9});
    this.wCyl(.04,.045,.28,10,l,0,.02,.14);
    for(let i=0;i<3;i++) this.wTor(.045,.008,6,14,g,0,.02,.22-i*.08,Math.PI/2);
    this.wSph(.05,10,8,g,0,.02,.31);
    const wg=new THREE.Group(); this.group.add(wg); this.parts.whip=wg;
    for(let i=0;i<5;i++){
      this.wA(new THREE.CylinderGeometry(.02-i*.003,.018-i*.003,.12,6),l,0,.02,-.02-i*.12,Math.PI/2,0,0,wg);
      if(i<4) this.wA(new THREE.TorusGeometry(.018-i*.003,.006,6,10),e,0,.02,-.08-i*.12,Math.PI/2,0,0,wg);
    }
    this.parts.tip=this.wSph(.03,10,10,e,0,.02,-.62,wg);
  }
  bLaser(){
    const m=new THREE.MeshStandardMaterial({color:0x1a1a2a,metalness:.95,roughness:.08});
    const d=new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.9,roughness:.2});
    const r=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:.9});
    this.wBox(.12,.14,.32,m,0,.02,0);
    for(let i=0;i<4;i++) this.wTor(.075,.008,6,14,d,0,.02,.1-i*.08,Math.PI/2);
    this.wCyl(.04,.04,.5,10,m,0,.05,-.3);
    for(let i=0;i<3;i++) this.wBox(.02,.02,.08,r,0,.06,-.15-i*.1);
    this.parts.lens=this.wSph(.05,14,14,r,0,.05,-.56);
    this.parts.grip=this.wBox(.07,.15,.09,d,0,-.13,.08); this.parts.grip.rotation.x=-.28;
    this.parts.plasmaCell=this.wBox(.055,.03,.15,r,.1,.1,.05);
  }
  bMelee(){
    const w=new THREE.MeshStandardMaterial({color:0x5a3a1a,roughness:.9});
    const s=new THREE.MeshStandardMaterial({color:0x4a4a52,metalness:.95,roughness:.2});
    const d=new THREE.MeshStandardMaterial({color:0x1a1a1e,metalness:.85,roughness:.3});
    const l=new THREE.MeshStandardMaterial({color:0x2a1a0a,roughness:.8});
    this.wCyl(.035,.05,1.15,10,w,0,0,-.05);
    this.parts.grip=this.wCyl(.05,.055,.28,10,l,0,0,.35);
    for(let i=0;i<4;i++) this.wTor(.055,.006,6,12,d,0,0,.24+i*.07,Math.PI/2);
    this.wSph(.065,10,8,d,0,0,.5);
    this.parts.head=this.wBox(.34,.22,.26,s,0,0,-.58);
    this.wBox(.36,.24,.02,d,0,0,-.72);
  }
  bHammer(){
    const m=new THREE.MeshStandardMaterial({color:0x3a3a3a,metalness:.85,roughness:.25});
    this.wCyl(.035,.035,.45,10,m,0,-.11,0,0);
    this.parts.head=this.wBox(.22,.17,.28,new THREE.MeshStandardMaterial({color:0x5a5a5a,metalness:.95,roughness:.15,emissive:0xff4400,emissiveIntensity:.4}),0,.11,0);
    this.parts.glow=this.wSph(.17,14,14,new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:.35}),0,.11,0);
  }
  bSingularity(){
    const b=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.9,roughness:.3});
    const d=new THREE.MeshStandardMaterial({color:0x111111,metalness:.8,roughness:.2});
    const p=new THREE.MeshStandardMaterial({color:0xcc00ff,emissive:0x8800aa,emissiveIntensity:1.5});
    this.wBox(.18,.18,.35,b,0,0,0);
    this.wBox(.16,.16,.4,d,0,0,.05);
    this.wBox(.14,.14,.15,d,0,0,-.25);
    this.wCyl(.05,.05,.1,8,b,0,0,-.35,0);
    this.parts.coreRing=this.wTor(.08,.02,8,20,p,0,0,-.1,0,Math.PI/2,0);
    this.parts.grip=this.wBox(.08,.16,.1,d,0,-.12,.05); this.parts.grip.rotation.x=-.3;
  }
  bNecro(){
    const d=new THREE.MeshStandardMaterial({color:0x1a0a0a,roughness:.9});
    const b=new THREE.MeshStandardMaterial({color:0xe8dcc0,roughness:.7});
    const r=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0x880000,emissiveIntensity:.7});
    const l=new THREE.MeshStandardMaterial({color:0x2a0a0a,roughness:.95});
    this.parts.book=this.wBox(.18,.24,.12,l,0,0,-.14);
    this.wBox(.02,.24,.12,d,-.1,0,-.14);
    this.wBox(.16,.22,.02,b,0,0,-.19);
    const sk=this.wSph(.06,10,8,b,0,.02,-.06); sk.scale.set(1,1.1,.6);
    this.wSph(.018,6,6,new THREE.MeshBasicMaterial({color:0}),-.025,.03,-.03);
    this.wSph(.018,6,6,new THREE.MeshBasicMaterial({color:0}),.025,.03,-.03);
    for(let i=0;i<5;i++){const ang=i/5*Math.PI*2+Math.PI/2;
      this.parts.symbol=this.wSph(.012,4,4,r,Math.cos(ang)*.06,Math.sin(ang)*.08,-.06);
    }
  }
  bSun(){
    const g=new THREE.MeshStandardMaterial({color:0xffaa00,metalness:.9,roughness:.2,emissive:0xff6600,emissiveIntensity:.4});
    const sm=new THREE.MeshBasicMaterial({color:0xffff00});
    const d=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.8,roughness:.3});
    this.parts.grip=this.wBox(.08,.16,.12,d,0,-.15,.08); this.parts.grip.rotation.x=-.3;
    this.wBox(.085,.02,.12,g,0,-.25,.1);
    this.wCyl(.08,.1,.1,8,g,0,-.04,.02,0);
    const sg=new THREE.Group(); sg.position.set(0,.1,.02); this.group.add(sg); this.parts.sunCore=sg;
    sg.add(new THREE.Mesh(new THREE.SphereGeometry(.08,16,16),sm));
    this.parts.rays=new THREE.Group();
    for(let i=0;i<8;i++){
      const ray=new THREE.Mesh(new THREE.ConeGeometry(.03,.25,4),sm);
      ray.rotation.z=Math.PI/2; ray.rotation.y=i*Math.PI/4;
      ray.position.x=Math.cos(i*Math.PI/4)*.12; ray.position.z=Math.sin(i*Math.PI/4)*.12;
      this.parts.rays.add(ray);
    }
    sg.add(this.parts.rays);
    this.parts.sunRing1=new THREE.Mesh(new THREE.TorusGeometry(.16,.015,8,24),g);
    this.parts.sunRing1.rotation.x=Math.PI/2; sg.add(this.parts.sunRing1);
    this.parts.sunRing2=new THREE.Mesh(new THREE.TorusGeometry(.20,.01,8,24),g);
    this.parts.sunRing2.rotation.y=Math.PI/4; sg.add(this.parts.sunRing2);
    const light=new THREE.PointLight(0xffaa00,2,5); sg.add(light); this.parts.light=light;
  }
  bTurret(){
    const m=new THREE.MeshStandardMaterial({color:0x334455,metalness:.8,roughness:.3});
    const gl=new THREE.MeshStandardMaterial({color:0x00ccff,emissive:0x0088ff,emissiveIntensity:.6});
    this.wCyl(.12,.15,.08,12,m,0,-.05,0,0);
    this.wCyl(.03,.04,.25,8,m,0,.1,0,0);
    this.wBox(.15,.1,.15,m,0,.25,0);
    this.wCyl(.02,.03,.2,8,m,0,.28,-.12);
    this.parts.turretTip=this.wSph(.03,8,8,gl,0,.28,-.22);
  }
  bCrossbow(){
    const w=this._matWood();
    const mt=new THREE.MeshStandardMaterial({color:0x444444,metalness:.9,roughness:.2});
    const bl=new THREE.MeshStandardMaterial({color:0x880000,emissive:0x440000,emissiveIntensity:.3});
    const st=new THREE.MeshBasicMaterial({color:0xcccccc});
    this.wBox(.08,.1,.55,w,0,0,.05);
    this.wBox(.1,.14,.1,w,0,-.01,.3);
    this.parts.grip=this.wBox(.07,.15,.09,w,0,-.11,.13); this.parts.grip.rotation.x=-.2;
    this.wTor(.04,.007,6,12,mt,0,-.06,.14,Math.PI/2,0,Math.PI/2);
    this.wBox(.035,.02,.4,mt,0,.055,.02);
    this.wBox(.14,.08,.1,mt,0,.02,-.22);
    const lp=[new THREE.Vector3(0,.02,-.22),new THREE.Vector3(-.15,.03,-.26),new THREE.Vector3(-.3,.02,-.24),new THREE.Vector3(-.4,0,-.2)];
    this.parts.bowL=this.wA(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp),12,.022,6,false),w,0,0,0);
    const rp=[new THREE.Vector3(0,.02,-.22),new THREE.Vector3(.15,.03,-.26),new THREE.Vector3(.3,.02,-.24),new THREE.Vector3(.4,0,-.2)];
    this.parts.bowR=this.wA(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp),12,.022,6,false),w,0,0,0);
    this.parts.string=this.wA(new THREE.CylinderGeometry(.004,.004,.8,4),st,0,0,-.2,0,0,Math.PI/2);
    this.parts.bolt=this.wCyl(.008,.008,.45,6,bl,0,.065,-.05);
    this.parts.boltTip=this.wCone(.015,.06,6,mt,0,.065,-.28,-Math.PI/2);
  }
  bSlingshot(){
    const w=new THREE.MeshStandardMaterial({color:0xd06000,roughness:.6});
    const c=new THREE.MeshStandardMaterial({color:0x333333,roughness:.7});
    const bd=new THREE.MeshStandardMaterial({color:0xcc2222,roughness:.5});
    const p=new THREE.MeshStandardMaterial({color:0x111111,roughness:.8});
    const r=new THREE.MeshStandardMaterial({color:0xcc2222,roughness:.8});
    this.wCyl(.035,.045,.25,8,w,0,-.1,.05,0);
    const lp=this.wCyl(.025,.035,.25,8,w,-.06,.1,.05,0); lp.rotation.z=.35;
    const rp=this.wCyl(.025,.035,.25,8,w,.06,.1,.05,0); rp.rotation.z=-.35;
    this.wCyl(.03,.03,.04,8,c,-.1,.22,.05,0);
    this.wCyl(.03,.03,.04,8,c,.1,.22,.05,0);
    this.parts.pouch=this.wA(new THREE.BoxGeometry(.05,.03,.02),p,0,.15,.08);
    this.parts.bandL=this.wA(new THREE.BoxGeometry(.01,.01,1),bd,0,0,0);
    this.parts.bandR=this.wA(new THREE.BoxGeometry(.01,.01,1),bd,0,0,0);
    this.parts.rock=this.wSph(.025,6,6,r,0,.15,.08); this.parts.rock.visible=false;
  }
  bHourglass(){
    const dm=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.9,roughness:.2});
    const g=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.95,roughness:.1});
    const gl=new THREE.MeshStandardMaterial({color:0xcceeff,transparent:true,opacity:.4,metalness:.1,roughness:.05,emissive:0x004488,emissiveIntensity:.3});
    const sd=new THREE.MeshStandardMaterial({color:0xe8c84a,roughness:.95,emissive:0xffaa00,emissiveIntensity:.8});
    const e=new THREE.MeshBasicMaterial({color:0x66ccff,transparent:true,opacity:.6,side:THREE.DoubleSide});
    this.parts.grip=this.wCyl(.03,.04,.25,8,dm,.25,-.15,.1,0,0,-.4);
    this.wTor(.035,.005,6,12,g,.25,-.15,.15,Math.PI/2,0,-.4);
    const hp=new THREE.Group(); hp.position.set(0,.1,-.2); hp.scale.set(2.5,2.5,2.5);
    this.group.add(hp); this.hgPivot=hp;
    this.wA(new THREE.TorusGeometry(.06,.01,8,16),g,0,.1,0,Math.PI/2,0,0,hp);
    this.wA(new THREE.TorusGeometry(.06,.01,8,16),g,0,-.1,0,Math.PI/2,0,0,hp);
    for(let i=0;i<3;i++){const ang=i/3*Math.PI*2;
      this.wA(new THREE.CylinderGeometry(.005,.005,.2,6),g,Math.cos(ang)*.06,0,Math.sin(ang)*.06,0,0,0,hp);
    }
    this.wA(new THREE.CylinderGeometry(.05,.015,.08,12),gl,0,.05,0,0,0,0,hp);
    this.wA(new THREE.CylinderGeometry(.015,.05,.08,12),gl,0,-.05,0,0,0,0,hp);
    this.parts.topSand=this.wA(new THREE.ConeGeometry(.04,.06,10),sd,0,.05,0,Math.PI,0,0,hp);
    this.parts.botSand=this.wA(new THREE.ConeGeometry(.04,.06,10),sd,0,-.05,0,0,0,0,hp);
    this.parts.stream=this.wA(new THREE.CylinderGeometry(.003,.003,.1,6),sd,0,0,0,0,0,0,hp);
    this.parts.auraRing1=this.wA(new THREE.RingGeometry(.08,.1,24),e,0,.1,0,Math.PI/2,0,0,hp);
    this.parts.auraRing2=this.wA(new THREE.RingGeometry(.08,.1,24),e,0,-.1,0,Math.PI/2,0,0,hp);
    this.parts.light=new THREE.PointLight(0x66ccff,1.5,3); hp.add(this.parts.light);
  }
  bFartgun(){
    const r=new THREE.MeshStandardMaterial({color:0x5a3a1a,metalness:.55,roughness:.75});
    const gr=new THREE.MeshStandardMaterial({color:0x66aa33,metalness:.25,roughness:.65,emissive:0x224400,emissiveIntensity:.4});
    const d=new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.7,roughness:.5});
    const st=new THREE.MeshStandardMaterial({color:0x3a2a1a,roughness:.85});
    this.wCyl(.08,.065,.7,10,r,0,.02,-.2);
    this.wTor(.085,.01,4,12,st,0,.02,-.4,Math.PI/2);
    const bag=this.wSph(.14,10,8,gr,0,.02,.18); bag.scale.set(1.1,.95,1.35);
    this.wSph(.08,8,6,gr,-.06,.12,.16);
    this.wSph(.09,8,6,gr,.08,.08,.22);
    this.parts.nozzle=this.wTor(.085,.018,6,16,gr,0,.02,-.55,Math.PI/2);
    this.wCyl(.07,.07,.02,10,d,0,.02,-.56,0);
    this.parts.grip=this.wBox(.06,.15,.08,d,0,-.13,.05); this.parts.grip.rotation.x=-.3;
    this.parts.stink=this.wSph(.035,6,6,new THREE.MeshBasicMaterial({color:0x88ff33,transparent:true,opacity:.65}),0,.2,.2);
  }
  bLohostvol(){
    const r=new THREE.MeshStandardMaterial({color:0x6a3a20,metalness:.5,roughness:.85});
    const d=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:.6,roughness:.6});
    const tp=new THREE.MeshStandardMaterial({color:0x121212,metalness:.2,roughness:.95});
    const mt=new THREE.MeshStandardMaterial({color:0x4a4a52,metalness:.85,roughness:.4});
    const w=new THREE.MeshStandardMaterial({color:0x5a3a1a,roughness:.9});
    this.wCyl(.05,.05,.6,10,mt,0,.08,-.25);
    this.wCyl(.05,.05,.6,10,mt,.1,.08,-.25);
    this.wCyl(.055,.055,.02,12,d,0,.08,-.55,0);
    this.wCyl(.055,.055,.02,12,d,.1,.08,-.55,0);
    this.wBox(.24,.16,.18,r,0,.02,.02);
    this.wA(new THREE.TorusGeometry(.07,.014,4,12),tp,-.05,.08,-.1,Math.PI/2,0,0);
    this.wA(new THREE.TorusGeometry(.07,.014,4,12),tp,.05,.08,-.1,Math.PI/2,0,0);
    const stock=this.wBox(.09,.13,.3,w,0,-.02,.32); stock.rotation.z=.12;
    this.parts.pump=this.wBox(.16,.07,.16,r,0,.08,-.2);
    this.parts.pumpOrigZ=-.2;
    this.parts.sight=this.wBox(.02,.05,.02,mt,.05,.16,-.4); this.parts.sight.rotation.z=.35;
  }

  update(dt){
    if(this.meleeSwingTime > 0){
      this.meleeSwingTime -= dt;
      const dur=.42,t=1-Math.max(0,this.meleeSwingTime)/dur;
      let rotX;
      if(t<.25) rotX=-1.8*(t/.25);
      else if(t<.55) rotX=-1.8+((t-.25)/.3)*4;
      else rotX=2.2*(1-(t-.55)/.45);
      this.group.rotation.x=rotX; this.group.rotation.z=0; this.group.rotation.y=0;
      this.group.position.x=.15;
      this.group.position.y=-.25-Math.abs(rotX)*.06+(rotX<-1?Math.abs(rotX+1)*.15:0);
      this.group.position.z=-.55;
      return;
    }
    const targetAim=isAiming?1:0;
    this.aimBlend+=(targetAim-this.aimBlend)*Math.min(1,dt*12);
    const baseX=.3*(1-this.aimBlend),baseY=-.3+this.aimBlend*.08,baseZ=-.6+this.aimBlend*.18;
    if(!player.isMoving && !isReloading){
      this.group.position.x=baseX+Math.sin(Date.now()*.0012)*.004;
      this.group.position.y=baseY+Math.sin(Date.now()*.0018)*.006;
    }
    if(player.isMoving && !isReloading){
      player.bobPhase+=dt*10;
      this.group.position.y=baseY+Math.sin(player.bobPhase)*.014;
      this.group.position.x=baseX+Math.cos(player.bobPhase*.5)*.008;
    }
    if(recoilPitchAccum>0){ recoilPitchAccum*=.88; player.pitch+=recoilPitchAccum*dt*8;
      player.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,player.pitch)); camera.rotation.x=player.pitch;
    }
    if(recoilRollAccum>0){ recoilRollAccum*=.88;
      camera.rotation.z+=recoilRollAccum*dt*6*(Math.random()>.5?1:-1); camera.rotation.z*=.9;
    }
    if(this.recoilOffset>0){ this.recoilOffset*=.85; this.group.position.z=baseZ+this.recoilOffset; this.group.rotation.x=-this.recoilOffset*.5 }
    if(this.recoilOffset<=.001){ this.group.position.z+=(baseZ-this.group.position.z)*.2; this.group.rotation.x*=.8 }
    if(isReloading) this.animateReload();
    const p=this.parts;
    if(p.barrelBlock && currentWeapon.weaponClass==='minigun' && (mouseDown||Date.now()-lastShotTime<100)) p.barrelBlock.rotation.z+=.5;
    if(p.crystal) p.crystal.rotation.y+=.02;
    if(p.coreRing) p.coreRing.rotation.z+=dt*2;
    if(p.tip) p.tip.position.y=.02+Math.sin(Date.now()*.015)*.03;
    if(p.lens) p.lens.material.emissiveIntensity=.5+Math.sin(Date.now()*.02)*.3;
    if(p.head && currentWeapon.weaponClass==='hammer') p.head.rotation.y+=.02;
    if(p.glow) p.glow.material.opacity=.2+Math.sin(Date.now()*.01)*.15;
    if(p.symbol) p.symbol.rotation.z+=.05;
    if(p.nozzle && currentWeapon.weaponClass!=='fartgun') p.nozzle.scale.x=1+Math.sin(Date.now()*.02)*.1;
    if(p.sac) p.sac.scale.setScalar(.85+Math.sin(Date.now()*.006)*.2);
    if(p.sacL) p.sacL.scale.setScalar(.85+Math.sin(Date.now()*.008+1)*.15);
    if(p.sacR) p.sacR.scale.setScalar(.85+Math.sin(Date.now()*.008+2)*.15);
    if(p.bioEye) p.bioEye.material.color.setHSL(.15,.9,.5+Math.sin(Date.now()*.01)*.3);
    if(p.plasmaCore){ const s=.8+Math.sin(Date.now()*.01)*.3; p.plasmaCore.scale.set(s,s,s);
      p.plasmaCore.material.emissiveIntensity=.5+Math.sin(Date.now()*.015)*.4;
    }
    if(p.plasmaCell) p.plasmaCell.material.emissiveIntensity=.4+Math.sin(Date.now()*.008)*.3;
    if(p.drum && Date.now()-lastShotTime<150) p.drum.rotation.x+=.3;
    if(p.sawSpinners) p.sawSpinners.forEach(h=>h.rotation.y+=.15+(chargingState.active?chargingState.charge*1.5:0));
    if(p.coilOuter) p.coilOuter.material.emissiveIntensity=.3+Math.sin(Date.now()*.01)*.3;
    if(p.coilInner) p.coilInner.material.emissiveIntensity=.3+Math.sin(Date.now()*.01+1)*.3;
    if(p.emitter){ p.emitter.material.emissiveIntensity=.6+Math.sin(Date.now()*.02)*.5;
      p.emitter.scale.setScalar(.8+Math.sin(Date.now()*.015)*.3);
    }
    if(p.turretTip) p.turretTip.material.emissiveIntensity=.5+Math.sin(Date.now()*.01)*.4;
    if(p.cylinder && Date.now()-lastShotTime<100) p.cylinder.rotation.z+=.3;
    if(currentWeapon.weaponClass==='sun' && p.sunCore){
      p.sunCore.position.y=.1+Math.sin(Date.now()*.003)*.03;
      if(p.rays) p.rays.rotation.y+=dt*2;
      if(p.sunRing1) p.sunRing1.rotation.z+=dt*3;
      if(p.sunRing2) p.sunRing2.rotation.x+=dt*2;
      if(p.light) p.light.intensity=1.5+Math.sin(Date.now()*.01)*.5;
    }
    if(currentWeapon.weaponClass==='slingshot' && p.pouch && p.bandL && p.bandR){
      const charge=chargingState.active?chargingState.charge:0;
      const pullZ=charge*.15;
      p.pouch.position.set(0,.15,.08+pullZ);
      if(p.rock){ p.rock.visible=charge>0; p.rock.position.copy(p.pouch.position) }
      const prongL=new THREE.Vector3(-.1,.22,.05),prongR=new THREE.Vector3(.1,.22,.05);
      const pouchPos=p.pouch.position.clone();
      p.bandL.position.copy(prongL).lerp(pouchPos,.5); p.bandL.lookAt(pouchPos);
      p.bandL.scale.set(1,1,prongL.distanceTo(pouchPos));
      p.bandR.position.copy(prongR).lerp(pouchPos,.5); p.bandR.lookAt(pouchPos);
      p.bandR.scale.set(1,1,prongR.distanceTo(pouchPos));
    }
    if(currentWeapon.weaponClass==='fartgun'){
      if(p.nozzle){ const pulse=1+Math.sin(Date.now()*.012)*.15; p.nozzle.scale.setScalar(pulse) }
      if(p.stink){ p.stink.position.y=.2+Math.sin(Date.now()*.006)*.04; p.stink.scale.setScalar(.7+Math.sin(Date.now()*.009)*.4) }
    }
    if(currentWeapon.weaponClass==='lohostvol'){
      const jammed=getJam();
      if(p.sight) p.sight.rotation.z=.35+(jammed?Math.sin(Date.now()*.05)*.4:Math.sin(Date.now()*.003)*.03);
      if(p.pump) p.pump.position.z=p.pumpOrigZ+(jammed?Math.sin(Date.now()*.03)*.05:0);
    }
    if(this.hgPivot){
      if(hgFlipAnim>0){ hgFlipAnim-=dt*3; if(hgFlipAnim<0) hgFlipAnim=0;
        const pr=1-hgFlipAnim; const ea=pr<.5?2*pr*pr:1-Math.pow(-2*pr+2,2)/2;
        this.hgPivot.rotation.z=hgTargetRotation*ea;
      } else this.hgPivot.rotation.z=hgTargetRotation;
      if(p.light) p.light.intensity=1+Math.sin(Date.now()*.01)*.5;
      if(p.auraRing1) p.auraRing1.rotation.z+=dt*2;
      if(p.auraRing2) p.auraRing2.rotation.z-=dt*2;
      if(p.topSand && p.botSand && p.stream){
        const cr=hgCharge/HG_MAX_CHARGE;
        if(hgState==='slow'){ p.topSand.scale.setScalar(Math.max(.01,cr)); p.botSand.scale.setScalar(Math.max(.01,1-cr)); p.stream.visible=cr>.01 }
        else if(hgState==='fast'){ p.topSand.scale.setScalar(Math.max(.01,1-cr)); p.botSand.scale.setScalar(Math.max(.01,cr)); p.stream.visible=cr<.99 }
        else { p.topSand.scale.setScalar(1); p.botSand.scale.setScalar(.01); p.stream.visible=false }
      }
    }
    if(p.string && !chargingState.active && Date.now()-lastShotTime<200) p.string.position.x=Math.sin(Date.now()*.05)*.01;
  }

  animateReload(){
    const t=reloadPhase,wc=currentWeapon.weaponClass,p=this.parts;
    if(wc==='pistol'||wc==='revolver'){
      if(p.grip) p.grip.position.y=-.12-Math.sin(t*Math.PI)*.4;
      if(p.magazine) p.magazine.position.y=-.14-Math.sin(t*Math.PI)*.4;
      this.group.rotation.x=Math.sin(t*Math.PI)*.6; this.group.rotation.z=Math.sin(t*Math.PI*2)*.2;
    } else if(wc==='shotgun'){
      if(p.pump) p.pump.position.z=p.pumpOrigZ+Math.sin(t*Math.PI*2)*.35;
      this.group.rotation.x=Math.sin(t*Math.PI)*.3;
    } else if(wc==='smg'){
      if(p.magazine){ if(t<.5) p.magazine.position.y=p.magOrigY-(t/.5)*.4;
        else p.magazine.position.y=p.magOrigY-.4+((t-.5)/.5)*.4 }
      this.group.rotation.x=Math.sin(t*Math.PI)*.3;
    } else if(wc==='rifle'||wc==='burst'){
      if(p.magazine){ if(t<.4) p.magazine.position.y=p.magOrigY-(t/.4)*.5;
        else if(t<.7) p.magazine.position.y=p.magOrigY-.5;
        else p.magazine.position.y=p.magOrigY-.5+((t-.7)/.3)*.5 }
      this.group.rotation.x=Math.sin(t*Math.PI)*.4;
    } else if(wc==='sniper') this.group.rotation.z=Math.sin(t*Math.PI)*.8;
    else if(wc==='acid'){ if(p.sac) p.sac.scale.setScalar(.5+Math.sin(t*Math.PI*3)*.5); this.group.rotation.x=Math.sin(t*Math.PI)*.4 }
    else if(wc==='minigun'){ if(p.barrelBlock) p.barrelBlock.rotation.z=t*Math.PI*10; this.group.rotation.x=Math.sin(t*Math.PI)*.5 }
    else if(wc==='saw'){ if(p.sawSpinners) p.sawSpinners.forEach(h=>h.rotation.y+=t*Math.PI*6); this.group.rotation.x=Math.sin(t*Math.PI)*.35 }
    else if(wc==='hammer') this.group.rotation.x=Math.sin(t*Math.PI*2);
    else if(wc==='fartgun'){
      if(p.grip) p.grip.position.y=-.12-Math.sin(t*Math.PI)*.25;
      if(p.nozzle){ const s=1+Math.sin(t*Math.PI*8)*.4; p.nozzle.scale.setScalar(s) }
      this.group.rotation.x=Math.sin(t*Math.PI)*.5;
    } else if(wc==='lohostvol'){
      if(p.pump) p.pump.position.z=p.pumpOrigZ+Math.sin(t*Math.PI*4)*.3;
      if(p.sight) p.sight.rotation.z=.35+Math.sin(t*Math.PI*6)*.6;
      this.group.rotation.x=Math.sin(t*Math.PI)*.45;
    } else this.group.rotation.z=Math.sin(t*Math.PI)*.5;
  }

  playRecoil(){
    const wc=currentWeapon.weaponClass;
    const rm={pistol:{o:.05,p:.025,r:.01},revolver:{o:.20,p:.14,r:.05},smg:{o:.04,p:.02,r:.015},rifle:{o:.06,p:.03,r:.015},burst:{o:.08,p:.04,r:.02},shotgun:{o:.22,p:.14,r:.07},sniper:{o:.25,p:.20,r:.04},railgun:{o:.30,p:.25,r:.06},minigun:{o:.04,p:.015,r:.02},acid:{o:.07,p:.03,r:.02},acidotronator:{o:.02,p:.01,r:.01},flamethrower:{o:.02,p:.01,r:.01},icegun:{o:.07,p:.03,r:.02},grenade:{o:.18,p:.10,r:.05},bfg:{o:.25,p:.18,r:.08},plasma:{o:.02,p:.01,r:.01},laser:{o:0,p:0,r:0},tesla:{o:.10,p:.06,r:.04},saw:{o:.12,p:.06,r:.04},whip:{o:.10,p:.06,r:.04},melee:{o:0,p:0,r:0},hammer:{o:.28,p:.22,r:.08},singularity:{o:.08,p:.05,r:.02},necro:{o:.06,p:.03,r:.02},sun:{o:.15,p:.08,r:.03},turret:{o:.08,p:.05,r:.03},crossbow:{o:.12,p:.08,r:.03},slingshot:{o:.10,p:.06,r:.03},hourglass:{o:.05,p:.03,r:.02},fartgun:{o:.10,p:.05,r:.03},lohostvol:{o:.26,p:.17,r:.09}};
    const r=rm[wc]||{o:.08,p:.04,r:.02};
    const m=isAiming?.6:1;
    this.recoilOffset=r.o*m;
    recoilPitchAccum+=r.p*m;
    recoilRollAccum+=r.r*m;
    if(r.o>0) cameraShake(r.o*.5*m,r.o*.5);
  }
  finishReload(){
    const p=this.parts;
    if(p.grip) p.grip.position.y=-.12;
    if(p.magazine) p.magazine.position.y=p.magOrigY;
    if(p.pump) p.pump.position.z=p.pumpOrigZ;
    if(p.tank) p.tank.rotation.y=0;
    if(p.plasmaCore) p.plasmaCore.scale.set(1,1,1);
    if(p.sac) p.sac.scale.setScalar(1);
    if(p.bolt){ p.bolt.position.z=-.1; if(p.boltTip) p.boltTip.position.z=-.28 }
    if(p.string) p.string.position.z=-.2;
    if(p.pouch) p.pouch.position.z=.08;
    if(p.rock){ p.rock.position.z=.08; p.rock.visible=false }
    if(this.hgPivot) this.hgPivot.rotation.z=hgTargetRotation;
    this.group.rotation.x=0; this.group.rotation.z=0;
    updateJamUI();
  }
}

function applyWeapon(){
  currentWeapon = ownedWeapons[curIdx].def;
  isReloading = false;
  reloadPhase = 0;
  if(DOM.reloadOverlay) DOM.reloadOverlay.style.display = 'none';
  weaponView.buildWeapon(currentWeapon.weaponClass);
  weaponView.finishReload();
  resetChargingState();
  if(currentWeapon.weaponClass === 'hourglass'){
    isAiming = false;
    if(DOM.crosshair) DOM.crosshair.classList.remove('ads');
  }
  updateJamUI();
  updateUI();
}
function switchSlot(dir){
  if(ownedWeapons.length < 2) return;
  curIdx = (curIdx+dir+ownedWeapons.length)%ownedWeapons.length;
  audio.swap();
  applyWeapon();
}
function acquireWeapon(def){
  if(ownedWeapons.length < 2){
    ownedWeapons.push({def, ammo:def.magSize});
    curIdx = ownedWeapons.length-1;
  } else {
    const ri = curIdx === 0 ? 1 : 0;
    ownedWeapons[ri] = {def, ammo:def.magSize};
  }
  applyWeapon();
}
function switchWeapon(dir){
  if(!debugMode) return;
  debugWeaponIdx = (debugWeaponIdx+dir+weapons.length)%weapons.length;
  const def = weapons[debugWeaponIdx];
  ownedWeapons[curIdx] = {def, ammo:def.magSize};
  applyWeapon();
  audio.debug();
  showDebugToast('['+(debugWeaponIdx+1)+'/'+weapons.length+'] '+def.name);
}

function shoot(){
  if(isGameOver || hubMode) return;
  if(currentWeapon.chargeable) return;
  const now = Date.now();
  if(isReloading || isNestActive) return;
  if(now-lastShotTime < 1000/(currentWeapon.fireRate * (hasSynergy('speed',2)?1.1:1))) return;

  if(currentWeapon.weaponClass === 'lohostvol' && getJam()){
    showDebugToast('⚠ ЗАКЛИНИЛО! Нажми R');
    audio.wallHit();
    return;
  }

  if(playerBuffs.selfDamageOnShot){
    player.health -= playerBuffs.selfDamageOnShot;
    updateUI();
    if(player.health <= 0){ gameOver(); return }
  }

  if(currentWeapon.weaponClass === 'acidotronator'){
    if(isOverheated) return;
    const heatRate = hasSynergy('poison',2) ? HEAT_RATE*0.5 : HEAT_RATE;
    weaponHeat += heatRate;
    if(weaponHeat >= MAX_HEAT){
      weaponHeat = MAX_HEAT;
      isOverheated = true;
      audio.overheat();
      if(hasSynergy('poison',3)){
        createExplosion(player.position);
        createAOESphere(player.position, 5, 0x00ff00);
        enemies.slice().forEach(e=>{
          if(!e.dead && e.group.position.distanceTo(player.position) < 5){
            e.takeDamage(60, e.group.position, 'poison');
            e.poisonTimer = Math.max(e.poisonTimer||0, 5);
          }
        });
      }
    }
  }

  if(currentWeapon.burst){
    if(burstFiring) return;
    if(getAmmo() <= 0 && !modifiers.includes('infinite_ammo')){ reload(); return }
    burstFiring = true;
    burstCount = currentWeapon.burst;
    burstTimer = 0;
    lastShotTime = now;
    return;
  }
  executeShoot();
}

function executeShoot(isBurst = false){
  const now = Date.now();
  if(isGameOver || hubMode) return;
  if(isReloading || isNestActive) return;
  if(currentWeapon.weaponClass === 'lohostvol' && getJam()) return;

  if(currentWeapon.weaponClass === 'hourglass'){
    if(hgFrozen){ showDebugToast('❄ Заморожено — ПКМ'); return }
    toggleHourglass();
    if(!isBurst) lastShotTime = now;
    return;
  }
  if(currentWeapon.weaponClass === 'hammer'){
    castMeteor();
    if(!modifiers.includes('infinite_ammo')) setAmmo(getAmmo()-1);
    if(!isBurst) lastShotTime = now;
    updateUI();
    return;
  }
  if(currentWeapon.weaponClass === 'turret'){ deployTurret(); return }
  if(currentWeapon.weaponClass === 'melee'){ doMeleeAttack(now); return }

  const ghostSave = (hasSynergy('speed',3) || hasSignature('minigun','speed',3)) && Math.random() < 0.30;
  const isAcidO = currentWeapon.weaponClass === 'acidotronator';
  if(!modifiers.includes('infinite_ammo') && !isAcidO && !ghostSave){
    if(getAmmo() <= 0){ reload(); return }
    setAmmo(getAmmo()-1);
  }

  audio.play(currentWeapon.weaponClass);
  weaponView.playRecoil();

  _shotCounter++;

  let dmg = currentWeapon.damage;
  if(modifiers.includes('infinite_ammo')) dmg *= .75;
  if(modifiers.includes('3x_damage')) dmg *= 3;
  if(modifiers.includes('glass_cannon')) dmg *= 2;
  dmg *= playerBuffs.damageMult;

  let critHappened = false;
  const finalCritChance = playerBuffs.critChance + (hasSynergy('crit',1) ? 0.10 : 0) + (modifiers.includes('critical') ? 0.20 : 0);
  if(modifiers.includes('always_crit') || Math.random() < finalCritChance){
    critHappened = true;
    const critMult = hasSynergy('crit',2) ? 4 : playerBuffs.critMult;
    dmg *= critMult;
    cameraShake(.15,.2);
  }

  const baseAoe = currentWeapon.aoe || 0;
  const aoeMult = playerBuffs.aoeMult * (hasSynergy('aoe',1)?1.20:1) * (hasSynergy('explosive',1)?1.25:1);
  const aoeRadius = baseAoe * aoeMult;

  const isBFG = currentWeapon.weaponClass === 'bfg';
  const isSawW = currentWeapon.weaponClass === 'saw';
  const isBeamW = currentWeapon.weaponClass === 'laser' || currentWeapon.weaponClass === 'plasma';
  const isFlamethrower = currentWeapon.weaponClass === 'flamethrower';
  const isFartgun = currentWeapon.weaponClass === 'fartgun';

  const projSize = isBFG ? .5
    : (currentWeapon.weaponClass === 'hammer' || currentWeapon.weaponClass === 'sun') ? .6
    : currentWeapon.weaponClass === 'singularity' ? .4
    : isFlamethrower ? .28
    : isFartgun ? .22 : .1;
  const projSpeed = isBFG ? .5
    : (currentWeapon.weaponClass === 'hammer' || currentWeapon.weaponClass === 'grenade') ? 1.5
    : currentWeapon.weaponClass === 'singularity' ? .8
    : currentWeapon.weaponClass === 'sun' ? .4
    : ['plasma','laser'].includes(currentWeapon.weaponClass) ? 2.5
    : currentWeapon.weaponClass === 'whip' ? 1.8
    : isSawW ? 1.6
    : currentWeapon.weaponClass === 'revolver' ? 3
    : isFlamethrower ? 1.1
    : isFartgun ? 0.55
    : 2;
  const cols = {acid:0x00ff00,fire:0xff4400,ice:0x88ccff,piercing:0x00ffff,explosive:0xff8800,lightning:0xaaccff,holy:0xffffaa,laser:0xff0000,gravity:0xcc00ff,dark:0x880088,light:0xffff00,poison:0x88ff33};

  const pellets = currentWeapon.pellets || 1;
  const spreadVal = currentWeapon.spread || 0;
  const isPhysGrenade = currentWeapon.weaponClass === 'grenade';
  const aimMult = isAiming ? .4 : 1;
  const baseInacc = isAiming ? .012 : .15;
  const moveInacc = (!isAiming && player.isMoving) ? .22 : 0;
  const weaponFalloff = currentWeapon.falloff || false;

  let forceAoe = false;
  if((hasSynergy('explosive',2) && _shotCounter % 5 === 0) ||
     (playerBuffs.everyNthAoe > 0 && _shotCounter % playerBuffs.everyNthAoe === 0)){
    forceAoe = true;
  }

  for(let pIdx=0; pIdx<pellets; pIdx++){
    let p;
    if(isSawW){
      const sg = new THREE.Group();
      const sp = new THREE.Group();
      sp.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.03,16), new THREE.MeshStandardMaterial({color:0x999999,metalness:.95,roughness:.15})));
      const th = new THREE.Mesh(new THREE.TorusGeometry(.3,.02,4,16), new THREE.MeshStandardMaterial({color:0xbbbbbb,metalness:.95}));
      th.rotation.x = Math.PI/2; sp.add(th); sg.add(sp);
      p = sg; p.userData.spinner = null;
    }
    else if(isBeamW){
      const isL = currentWeapon.weaponClass === 'laser';
      p = new THREE.Mesh(new THREE.BoxGeometry(isL?.05:.09,isL?.05:.09,isL?3:2), new THREE.MeshBasicMaterial({color:isL?0xff0000:0x00aaff}));
      p.userData.isBeam = true;
    }
    else if(isFlamethrower){
      p = new THREE.Mesh(new THREE.SphereGeometry(.28,8,8), new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:.85}));
      p.add(new THREE.Mesh(new THREE.SphereGeometry(.14,6,6), new THREE.MeshBasicMaterial({color:0xffdd00})));
    }
    else if(isAcidO){
      const rs = .18 + Math.random()*.27;
      p = new THREE.Mesh(new THREE.SphereGeometry(rs,10,10), new THREE.MeshBasicMaterial({color:0x00ff00,transparent:true,opacity:.85}));
      p.add(new THREE.Mesh(new THREE.SphereGeometry(rs*.55,8,8), new THREE.MeshBasicMaterial({color:0xaaffaa})));
    }
    else if(isFartgun){
      const sz = .22 + Math.random()*.08;
      p = new THREE.Mesh(new THREE.SphereGeometry(sz,8,8), new THREE.MeshBasicMaterial({color:0x88ff33,transparent:true,opacity:.85}));
      p.add(new THREE.Mesh(new THREE.SphereGeometry(sz*.6,6,6), new THREE.MeshBasicMaterial({color:0xccffaa})));
    }
    else if(currentWeapon.weaponClass === 'singularity'){
      p = new THREE.Mesh(new THREE.SphereGeometry(projSize,16,16), new THREE.MeshBasicMaterial({color:0xcc00ff,transparent:true,opacity:.9}));
      p.add(new THREE.Mesh(new THREE.SphereGeometry(projSize*.6,12,12), new THREE.MeshBasicMaterial({color:0})));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(projSize*1.1,projSize*.1,8,20), new THREE.MeshBasicMaterial({color:0xff00ff}));
      ring.rotation.x = Math.PI/2; p.add(ring);
    }
    else if(currentWeapon.weaponClass === 'sun'){
      p = new THREE.Group();
      const sm = new THREE.MeshBasicMaterial({color:0xffff00});
      p.add(new THREE.Mesh(new THREE.SphereGeometry(projSize,16,16), sm));
      const rays = new THREE.Group();
      for(let k=0;k<8;k++){
        const r = new THREE.Mesh(new THREE.ConeGeometry(.1,1.5,4), sm);
        r.rotation.z = Math.PI/2; r.rotation.y = k*Math.PI/4;
        r.position.x = Math.cos(k*Math.PI/4); r.position.z = Math.sin(k*Math.PI/4);
        rays.add(r);
      }
      p.add(rays); p.userData.rays = rays;
      p.add(new THREE.PointLight(0xffaa00,3,8));
      p.userData.isSun = true;
    }
    else {
      p = new THREE.Mesh(new THREE.SphereGeometry(isPhysGrenade?.12:(pellets>1?.06:projSize),8,8), new THREE.MeshBasicMaterial({color:cols[currentWeapon.damageType]||0xffff00}));
    }
    p.position.copy(camera.position);
    const d = new THREE.Vector3(0,0,-1);
    d.applyQuaternion(camera.quaternion);
    const totalSpread = isFlamethrower ? .4 : (spreadVal*aimMult+baseInacc+moveInacc+(pIdx>0?.03:0)) * playerBuffs.spreadMult;
    if(totalSpread > 0){
      d.x += (Math.random()-.5)*totalSpread;
      d.y += (Math.random()-.5)*totalSpread*.5;
      d.z += (Math.random()-.5)*totalSpread;
      d.normalize();
    }

    let speed = projSpeed;
    if(isAcidO){ d.y += .25; d.normalize(); speed = .5 }
    if(isFartgun){ d.y += .08; d.normalize() }
    p.userData.velocity = d.clone().multiplyScalar(speed);

    if(p.userData.isBeam) p.lookAt(p.position.clone().add(p.userData.velocity));

    p.userData.damage = dmg;
    p.userData.damageType = currentWeapon.damageType;
    p.userData.isCrit = critHappened;
    p.userData.life = isBFG ? 300 : isBeamW ? 40 : isFlamethrower ? 12
      : currentWeapon.weaponClass === 'singularity' ? 400
      : currentWeapon.weaponClass === 'sun' ? 400
      : isFartgun ? 180 : 100;

    let finalPiercing = isBFG || isSawW || isBeamW
      || modifiers.includes('piercing') || modifiers.includes('ghost_bullets')
      || currentWeapon.damageType === 'piercing'
      || currentWeapon.weaponClass === 'whip'
      || currentWeapon.weaponClass === 'revolver'
      || currentWeapon.weaponClass === 'singularity'
      || currentWeapon.weaponClass === 'sun';
    if(hasSignature('sniper','crit',3)) finalPiercing = true;
    p.userData.piercing = finalPiercing;

    p.userData.hitEnemies = [];
    p.userData.isGrenade = currentWeapon.weaponClass === 'grenade' || currentWeapon.weaponClass === 'hammer';
    p.userData.gravity = isPhysGrenade || isAcidO;
    p.userData.isPhysicalGrenade = isPhysGrenade;
    p.userData.isSaw = isSawW;
    p.userData.bounces = 3;
    p.userData.isSingularity = currentWeapon.weaponClass === 'singularity';
    p.userData.isNecro = currentWeapon.weaponClass === 'necro';
    p.userData.isSun = currentWeapon.weaponClass === 'sun';
    p.userData.isAcidotronator = isAcidO;
    p.userData.isFart = isFartgun;
    if(isFartgun){ p.userData.isWavy = true; p.userData.spawnTime = Date.now(); p.userData.origVel = {x:p.userData.velocity.x, z:p.userData.velocity.z} }
    p.userData.range = currentWeapon.range;
    p.userData.startPos = camera.position.clone();
    p.userData.aoe = forceAoe ? 3 : aoeRadius;
    p.userData.isPlayerBullet = true;
    p.userData.isFlame = isFlamethrower;
    p.userData.falloff = weaponFalloff;
    p.userData.weaponRange = currentWeapon.range;

    if(hasSynergy('fire',1) && Math.random() < 0.25){
      p.userData.burn = {
        duration: 3 * playerBuffs.burnDur * (hasSynergy('fire',3)?2:1),
        dps: 5 * (hasSynergy('fire',3)?1.5:1) * playerBuffs.fireDamageMult,
        spread: hasSynergy('fire',2) ? 3 : (hasSynergy('fire',3) ? 5 : 0)
      };
    }
    if(hasSynergy('ice',1) && Math.random() < 0.20){
      p.userData.slow = {
        duration: 2 * playerBuffs.freezeDur,
        power: (hasSynergy('ice',3)?0.5:0.4) * playerBuffs.slowPower
      };
    }
    if(hasSynergy('poison',1) && Math.random() < 0.30){
      p.userData.poison = {
        duration: 3 * playerBuffs.poisonDur,
        dps: 4,
        stacks: playerBuffs.poisonStacks
      };
    }
    if(hasSynergy('ice',2)){
      if(!p.userData.slow) p.userData.slow = {duration: .3, power: .3};
    }
    if(playerBuffs.allShotsSlow > 0){
      if(!p.userData.slow) p.userData.slow = {duration: playerBuffs.allShotsSlow, power: .3};
    }
    if(hasSynergy('ice',3) && Math.random() < 0.08){
      p.userData.freezeAoe = 12;
    }
    if(critHappened && activeDuos.includes('deadshot')){
      p.userData.burn = {duration: 3, dps: 6, spread: 0};
    }
    if(critHappened && activeDuos.includes('frostsniper')){
      p.userData.freeze = {duration: 1.5};
    }

    scene.add(p);
    projectiles.push(p);
  }

  if(modifiers.includes('double_shot') && pellets === 1){
    for(let k=0; k<2; k++){
      const d2 = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      d2.x += (k===0 ? .1 : -.1); d2.normalize();
      const p2 = new THREE.Mesh(new THREE.SphereGeometry(projSize,8,8), new THREE.MeshBasicMaterial({color:cols[currentWeapon.damageType]||0xffff00}));
      p2.position.copy(camera.position);
      p2.userData.velocity = d2.multiplyScalar(projSpeed);
      p2.userData.damage = dmg;
      p2.userData.damageType = currentWeapon.damageType;
      p2.userData.life = 100;
      p2.userData.piercing = modifiers.includes('piercing') || modifiers.includes('ghost_bullets');
      p2.userData.hitEnemies = [];
      p2.userData.range = currentWeapon.range;
      p2.userData.startPos = camera.position.clone();
      p2.userData.aoe = aoeRadius;
      p2.userData.isPlayerBullet = true;
      p2.userData.falloff = weaponFalloff;
      p2.userData.weaponRange = currentWeapon.range;
      scene.add(p2);
      projectiles.push(p2);
    }
  }

  createMuzzleFlash();
  updateUI();
  if(!isBurst) lastShotTime = now;

  if(currentWeapon.weaponClass === 'lohostvol' && Math.random() < (currentWeapon.jamChance || 0.25)){
    setJam(true);
    updateJamUI();
    audio.wallHit();
  }
}

function fireChargedShot(charge){
  if(isGameOver || isNestActive || isReloading || hubMode) return;
  if(!currentWeapon.chargeable) return;
  const now = Date.now();
  if(now-lastShotTime < 1000/currentWeapon.fireRate) return;
  const wc = currentWeapon.weaponClass;

  if(wc === 'crossbow' || wc === 'slingshot'){
    if(getAmmo() <= 0 && !modifiers.includes('infinite_ammo')){ reload(); return }
    if(!modifiers.includes('infinite_ammo')) setAmmo(getAmmo()-1);
    lastShotTime = now;
    audio.play(wc === 'crossbow' ? 'crossbow' : 'slingshot');
    weaponView.playRecoil();

    let dmg = currentWeapon.damage * playerBuffs.damageMult;
    let dmgMult, spdMult, rngMult;
    if(wc === 'crossbow'){
      dmgMult = 1+charge*2; spdMult = 1+charge*2; rngMult = 1+charge*1.5;
      const hpRatio = player.health/player.maxHealth;
      dmgMult *= (1+(1-hpRatio)*2);
    } else {
      dmgMult = 1+charge*3; spdMult = 1+charge*2.5; rngMult = 1+charge*1;
    }
    dmg *= dmgMult;
    if(modifiers.includes('3x_damage')) dmg *= 3;
    if(modifiers.includes('glass_cannon')) dmg *= 2;
    const finalCC = playerBuffs.critChance + (hasSynergy('crit',1)?0.10:0);
    if(modifiers.includes('always_crit') || Math.random() < finalCC){
      dmg *= hasSynergy('crit',2) ? 4 : playerBuffs.critMult;
      cameraShake(.15,.2);
    }
    const baseSpeed = wc === 'crossbow' ? 2 : 1.5;
    const speed = baseSpeed*spdMult;
    const range = currentWeapon.range*rngMult;
    const d = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const spread = ((isAiming?0.01:0.04) + (currentWeapon.spread||0)*(isAiming?0.4:1)) * playerBuffs.spreadMult;
    if(spread > 0){ d.x += (Math.random()-.5)*spread; d.y += (Math.random()-.5)*spread*.5; d.z += (Math.random()-.5)*spread; d.normalize() }

    let proj;
    if(wc === 'crossbow'){
      const bg = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.4,6), new THREE.MeshStandardMaterial({color:0x880000}));
      sh.rotation.x = -Math.PI/2; bg.add(sh);
      const tp = new THREE.Mesh(new THREE.ConeGeometry(.025,.08,6), new THREE.MeshStandardMaterial({color:0x444444,metalness:.9}));
      tp.rotation.x = -Math.PI/2; tp.position.z = -.24; bg.add(tp);
      proj = bg;
    } else {
      proj = new THREE.Mesh(new THREE.SphereGeometry(0.08,6,5), new THREE.MeshStandardMaterial({color:0x888888,roughness:0.95}));
    }
    proj.position.copy(camera.position);
    proj.lookAt(camera.position.clone().add(d));
    proj.userData.velocity = d.clone().multiplyScalar(speed);
    proj.userData.damage = dmg;
    proj.userData.damageType = currentWeapon.damageType;
    proj.userData.life = 100;
    proj.userData.piercing = modifiers.includes('piercing') || modifiers.includes('ghost_bullets');
    proj.userData.hitEnemies = [];
    proj.userData.range = range;
    proj.userData.weaponRange = currentWeapon.range;
    proj.userData.startPos = camera.position.clone();
    proj.userData.aoe = 0;
    proj.userData.isPlayerBullet = true;
    proj.userData.falloff = false;
    if(hasSynergy('fire',1) && Math.random() < 0.25){
      proj.userData.burn = {duration: 3*playerBuffs.burnDur*(hasSynergy('fire',3)?2:1), dps: 5*(hasSynergy('fire',3)?1.5:1), spread: hasSynergy('fire',2)?3:0};
    }
    if(hasSynergy('ice',1) && Math.random() < 0.20){
      proj.userData.slow = {duration: 2*playerBuffs.freezeDur, power: (hasSynergy('ice',3)?0.5:0.4)};
    }
    if(hasSynergy('poison',1) && Math.random() < 0.30){
      proj.userData.poison = {duration: 3*playerBuffs.poisonDur, dps: 4, stacks: playerBuffs.poisonStacks};
    }
    scene.add(proj);
    projectiles.push(proj);
    createMuzzleFlash();
    updateUI();
  } else if(wc === 'saw'){
    let ammo = getAmmo();
    let sawsToFire;
    if(modifiers.includes('infinite_ammo')) sawsToFire = Math.max(1, Math.ceil(charge*currentWeapon.magSize));
    else { if(ammo <= 0){ reload(); return } sawsToFire = Math.max(1, Math.ceil(charge*ammo)); setAmmo(ammo-sawsToFire) }
    lastShotTime = now;
    audio.play('saw');
    weaponView.playRecoil();
    cameraShake(.15+charge*.15,.15);
    for(let k=0; k<sawsToFire; k++){
      const sg = new THREE.Group(), sp = new THREE.Group();
      sp.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.03,16), new THREE.MeshStandardMaterial({color:0x999999,metalness:.95,roughness:.15})));
      sg.add(sp);
      const d = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      const inacc = (isAiming?0.02:0.08)+(currentWeapon.spread||0)*(isAiming?0.4:1);
      d.x += (Math.random()-.5)*inacc; d.y += (Math.random()-.5)*inacc*.5; d.z += (Math.random()-.5)*inacc;
      d.normalize();
      let dmg = currentWeapon.damage * playerBuffs.damageMult;
      sg.position.copy(camera.position);
      sg.position.x += (k-(sawsToFire-1)/2)*0.05;
      sg.userData.velocity = d.clone().multiplyScalar(1.6);
      sg.userData.damage = dmg;
      sg.userData.damageType = 'piercing';
      sg.userData.life = 60;
      sg.userData.piercing = false;
      sg.userData.hitEnemies = [];
      sg.userData.range = currentWeapon.range;
      sg.userData.weaponRange = currentWeapon.range;
      sg.userData.startPos = camera.position.clone();
      sg.userData.aoe = 0;
      sg.userData.isPlayerBullet = true;
      sg.userData.isSaw = true;
      sg.userData.spinner = sp;
      sg.userData.falloff = false;
      scene.add(sg);
      projectiles.push(sg);
    }
    createMuzzleFlash();
    updateUI();
  }
}

function reload(){
  if(isGameOver || hubMode) return;
  resetChargingState();
  if(currentWeapon.weaponClass === 'hourglass' || currentWeapon.weaponClass === 'melee') return;
  const jammed = getJam();
  if(isReloading || (!jammed && getAmmo() === currentWeapon.magSize) || isNestActive
     || modifiers.includes('infinite_ammo') || currentWeapon.weaponClass === 'acidotronator') return;
  isReloading = true;
  let rt = currentWeapon.reloadTime * playerBuffs.reloadMult;
  if(currentWeapon.weaponClass === 'crossbow'){
    const hpRatio = player.health/player.maxHealth;
    rt *= (.3+hpRatio*.7);
  }
  if(currentWeapon.magSize === 1) rt *= .5;
  if(modifiers.includes('fast_reload')) rt *= .5;
  reloadTimer = rt;
  reloadPhase = 0;
  audio.reload();
  if(DOM.reloadOverlay) DOM.reloadOverlay.style.display = 'block';
  if(jammed){ setJam(false); updateJamUI() }
  updateUI();
}

function doMeleeAttack(now){
  lastShotTime = now;
  audio.play('melee');
  weaponView.meleeSwingTime = .42;
  cameraShake(.15,.12);
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  dir.y = 0; dir.normalize();
  let hitAny = false;
  const meleeDmg = currentWeapon.damage * playerBuffs.damageMult;
  enemies.slice().forEach(e=>{
    if(e.dead) return;
    const toE = e.group.position.clone().sub(player.position);
    toE.y = 0;
    const dist = toE.length();
    if(dist > currentWeapon.range+e.radius) return;
    toE.normalize();
    if(toE.dot(dir) > .35){
      e.takeDamage(meleeDmg, e.group.position);
      e.group.position.add(toE.multiplyScalar(.8));
      hitAny = true;
    }
  });
  if(hitAny){
    const slamPos = player.position.clone().add(dir.clone().multiplyScalar(currentWeapon.range*.7));
    slamPos.y = .1;
    const slam = new THREE.Mesh(new THREE.RingGeometry(.1,1.5,16), new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:.8,side:THREE.DoubleSide}));
    slam.rotation.x = -Math.PI/2; slam.position.copy(slamPos);
    scene.add(slam);
    aoeSpheres.push({mesh:slam, life:.3, maxLife:.3});
    createExplosion(slamPos);
  }
  createMuzzleFlash();
  updateUI();
}

function deployTurret(){
  if(turretCooldown > 0 || isGameOver) return;
  if(activeTurret){ activeTurret.destroy(); activeTurret = null }
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  dir.y = 0; dir.normalize();
  const pos = player.position.clone().add(dir.multiplyScalar(2));
  pos.y = 0;
  activeTurret = new Turret(pos);
  turretCooldown = 0;
  setAmmo(0);
  updateUI();
}

function castMeteor(){
  audio.meteorImpact();
  let targetPos = player.position.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(8));
  let nearest = null, nearDist = 20;
  enemies.forEach(e=>{
    if(e.dead) return;
    const d = e.group.position.distanceTo(player.position);
    if(d < nearDist){ nearDist = d; nearest = e }
  });
  if(nearest) targetPos = nearest.group.position.clone();
  const mg = new THREE.Group();
  mg.add(new THREE.Mesh(new THREE.SphereGeometry(.4,12,12), new THREE.MeshStandardMaterial({color:0x884422,emissive:0xff4400,emissiveIntensity:.6})));
  const trail = new THREE.Mesh(new THREE.ConeGeometry(.2,.8,8), new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:.6}));
  trail.rotation.x = Math.PI; trail.position.y = .6; mg.add(trail);
  mg.position.set(targetPos.x,15,targetPos.z);
  const aoeMult = playerBuffs.aoeMult * (hasSynergy('aoe',1)?1.2:1) * (hasSynergy('explosive',1)?1.25:1);
  mg.userData = {targetY:0, damage:500, aoe:8*aoeMult, targetPos};
  scene.add(mg);
  meteors.push(mg);
}

function toggleHourglass(){
  if(currentWeapon.weaponClass !== 'hourglass' || hgFrozen) return;
  audio.hourglassFlip();
  hgFlipAnim = 1;
  if(hgState === 'slow'){
    hgState = 'fast'; hgTargetRotation = 0;
    if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = 'fast';
    if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '⚡ УСКОРЕНИЕ ×2.0'; DOM.hgModeLabel.style.color = '#f80' }
    hgTimer = 0;
  } else if(hgState === 'fast' || hgState === 'idle'){
    if(hgCharge > 0){
      hgState = 'slow'; hgTargetRotation = Math.PI;
      if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = 'slow';
      if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '⏳ ЗАМЕДЛЕНИЕ ×0.5'; DOM.hgModeLabel.style.color = '#6cf' }
      hgTimer = 0;
    }
  }
}

function hourglassReload(){
  if(currentWeapon.weaponClass !== 'hourglass') return;
  if(hgState !== 'slow') return;
  hgFrozen = !hgFrozen;
  if(hgFrozen){
    if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = '';
    if(DOM.hgHud) DOM.hgHud.style.display = 'block';
    if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '❄ ЗАМОРОЖЕНО — ПКМ разморозить'; DOM.hgModeLabel.style.color = '#8af' }
  } else {
    if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = 'slow';
    if(DOM.hgHud) DOM.hgHud.style.display = 'block';
    if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '⏳ ЗАМЕДЛЕНИЕ ×0.5'; DOM.hgModeLabel.style.color = '#6cf' }
  }
}
