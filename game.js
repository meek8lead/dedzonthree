'use strict';
// INDUSTRIAL ROGUE SHOOTER v6.0 — GAME (Pity + Credits + Shop + Hub)

let doomThisWave = false;
let nextWaveDoom = false;
let pendingDoomChoice = false;
let waveCleared = false;
let isWaveTransitioning = false;
let isSynergyPanelOpen = false;
let pickLocked = false;
let waveSpawnTimers = [];

// Кредиты + PITY
let credits = 0;
let _lastEnemiesKilled = 0;
let pityCounters = {};
SYNERGY_TAGS.forEach(t => pityCounters[t] = 0);

// Цены карт
const CARD_PRICES = { common: 20, rare: 40, epic: 70, legendary: 120, curse: 10 };
const REROLL_PRICE = 20;

// PITY SYSTEM
function updatePityAfterPick(pickedCard){
  const pickedTags = (pickedCard && pickedCard.tags) || [];
  for(const tag of SYNERGY_TAGS){
    if(pickedTags.includes(tag)) pityCounters[tag] = 0;
    else pityCounters[tag] = (pityCounters[tag] || 0) + 1;
  }
}

function pickCardForTag(tag){
  const pool = [];
  for(const w of weapons){
    if(w.memWeapon) continue;
    if(w.tags && w.tags.includes(tag)){
      pool.push({cardType:'weapon', weapon:w, rarity:w.rarity, tags:w.tags});
    }
  }
  for(const m of allModifiers){
    if(m.negative) continue;
    if(modifiers.includes(m.id)) continue;
    if(m.tags && m.tags.includes(tag)){
      pool.push({cardType:'modifier', modifier:m, rarity:modifierRarity(m), tags:m.tags});
    }
  }
  for(const u of UPGRADE_CARDS){
    if(u.tag === tag){
      pool.push({cardType:'upgrade', upgrade:u, rarity:u.rarity, tags:[u.tag]});
    }
  }
  if(pool.length === 0) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function rollCardSmart(isElite = false){
  const guaranteed = SYNERGY_TAGS.filter(t => pityCounters[t] >= PITY.guaranteeAfter);
  if(guaranteed.length > 0){
    const tag = guaranteed[Math.floor(Math.random()*guaranteed.length)];
    const card = pickCardForTag(tag);
    if(card){
      card.pityForced = tag;
      return card;
    }
  }
  const boosted = SYNERGY_TAGS.filter(t => pityCounters[t] >= PITY.boostAfter);
  if(boosted.length > 0 && Math.random() < 0.5){
    const tag = boosted[Math.floor(Math.random()*boosted.length)];
    const card = pickCardForTag(tag);
    if(card){
      card.pityBoosted = tag;
      return card;
    }
  }
  return rollCard(isElite);
}

function pickWeighted(arr){
  const total = arr.reduce((s, x) => s + (x.weight || 1), 0);
  let r = Math.random() * total;
  for(const x of arr){ r -= (x.weight || 1); if(r <= 0) return x; }
  return arr[arr.length - 1];
}
function pickByWeightedRarity(weights){
  const total = Object.values(weights).reduce((s,v)=>s+v, 0);
  let r = Math.random() * total;
  for(const k of Object.keys(weights)){ r -= weights[k]; if(r <= 0) return k; }
  return 'common';
}
function modifierRarity(m){
  if(m.weight >= 0.9) return 'common';
  if(m.weight >= 0.7) return 'rare';
  if(m.weight >= 0.4) return 'epic';
  return 'legendary';
}

function rollCardOfType(type){
  const tier = getRarityTier(wave);
  const rw = RARITY_WEIGHTS[tier];
  const rarity = pickByWeightedRarity(rw);
  if(type === 'weapon'){
    const pool = weapons.filter(w => w.rarity === rarity && !w.memWeapon);
    if(pool.length === 0) return rollCardOfType('upgrade');
    const w = pool[Math.floor(Math.random()*pool.length)];
    return {cardType:'weapon', weapon:w, rarity, tags: w.tags || []};
  }
  if(type === 'modifier'){
    const pool = allModifiers.filter(m => !m.negative);
    const m = pickWeighted(pool);
    return {cardType:'modifier', modifier:m, rarity: modifierRarity(m), tags: m.tags || []};
  }
  if(type === 'upgrade'){
    const pool = UPGRADE_CARDS.filter(u => u.rarity === rarity);
    const finalPool = pool.length > 0 ? pool : UPGRADE_CARDS.filter(u => u.rarity === 'common');
    const u = finalPool[Math.floor(Math.random()*finalPool.length)];
    return {cardType:'upgrade', upgrade:u, rarity, tags: u.tag ? [u.tag] : []};
  }
  if(type === 'curse'){
    const pool = CURSE_CARDS.filter(c => c.rarity === rarity);
    const finalPool = pool.length > 0 ? pool : CURSE_CARDS;
    const c = finalPool[Math.floor(Math.random()*finalPool.length)];
    return {cardType:'curse', curse:c, rarity:'epic', tags: c.tags};
  }
  if(type === 'utility'){
    const pool = UTILITY_CARDS.filter(u => u.rarity === rarity);
    const finalPool = pool.length > 0 ? pool : UTILITY_CARDS;
    const u = finalPool[Math.floor(Math.random()*finalPool.length)];
    return {cardType:'utility', utility:u, rarity, tags: []};
  }
  return rollCardOfType('weapon');
}
function rollCard(isElite = false){
  if(isElite){
    const isEpic = Math.random() < 0.5;
    const rar = isEpic ? 'epic' : 'legendary';
    const types = ['weapon','modifier','upgrade','curse'];
    const t = types[Math.floor(Math.random()*types.length)];
    if(t === 'weapon'){
      const pool = weapons.filter(w => w.rarity === rar && !w.memWeapon);
      if(pool.length === 0){
        const anyPool = weapons.filter(w => !w.memWeapon);
        const w = anyPool[Math.floor(Math.random()*anyPool.length)];
        return {cardType:'weapon', weapon:w, rarity:w.rarity, tags: w.tags || []};
      }
      const w = pool[Math.floor(Math.random()*pool.length)];
      return {cardType:'weapon', weapon:w, rarity:rar, tags: w.tags || []};
    }
    if(t === 'modifier'){
      const pool = allModifiers.filter(m => !m.negative && (m.weight < 0.7));
      if(pool.length === 0) return rollCard(false);
      const m = pickWeighted(pool);
      return {cardType:'modifier', modifier:m, rarity: modifierRarity(m), tags: m.tags || []};
    }
    if(t === 'upgrade'){
      const pool = UPGRADE_CARDS.filter(u => u.rarity === rar);
      const finalPool = pool.length > 0 ? pool : UPGRADE_CARDS;
      const u = finalPool[Math.floor(Math.random()*finalPool.length)];
      return {cardType:'upgrade', upgrade:u, rarity:u.rarity, tags: u.tag ? [u.tag] : []};
    }
    if(t === 'curse'){
      const c = CURSE_CARDS[Math.floor(Math.random()*CURSE_CARDS.length)];
      return {cardType:'curse', curse:c, rarity:'epic', tags: c.tags};
    }
    return rollCard(false);
  }
  const r = Math.random();
  let cum = 0;
  for(const t of ['weapon','modifier','upgrade','curse','utility']){
    cum += CARD_WEIGHTS[t];
    if(r < cum) return rollCardOfType(t);
  }
  return rollCardOfType('weapon');
}

function cardPrice(card){
  if(!card) return 0;
  if(card.cardType === 'curse') return CARD_PRICES.curse;
  return CARD_PRICES[card.rarity] || CARD_PRICES.common;
}

function createHitSpark(pos, damageType){
  const colors = {
    acid:0x00ff00, fire:0xff4400, ice:0x88ccff, piercing:0x00ffff,
    explosive:0xff8800, lightning:0xaaccff, holy:0xffffaa, laser:0xff0000,
    gravity:0xcc00ff, dark:0x880088, light:0xffff00
  };
  const color = colors[damageType] || 0xffdd44;
  const flash = new THREE.Mesh(new THREE.SphereGeometry(.18, 6, 6), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.9}));
  flash.position.copy(pos);
  flash.userData.life = 8;
  scene.add(flash);
  particles.push(flash);
  for(let i=0;i<7;i++){
    const pt = new THREE.Mesh(new THREE.SphereGeometry(.035 + Math.random()*.035, 4, 4), new THREE.MeshBasicMaterial({color, transparent:true, opacity:1}));
    pt.position.copy(pos);
    const spd = .35 + Math.random()*.4;
    pt.userData.velocity = new THREE.Vector3((Math.random()-.5)*spd, Math.random()*spd + .15, (Math.random()-.5)*spd);
    pt.userData.life = 15 + Math.random()*12;
    pt.userData.gravity = true;
    scene.add(pt); particles.push(pt);
  }
}

function startWave(){
  waveSpawnTimers.forEach(t => clearTimeout(t));
  waveSpawnTimers = [];
  waveCleared = false;
  isWaveTransitioning = false;
  waveSpawning = true;
  isSpinning = false;
  damageFrom = {};

  const isSurge = (wave % BALANCE.surgeEvery === 0);

  let hpMult = 1, dmgMult = 1, countMult = 1;
  if(isSurge){ hpMult *= BALANCE.surgeHP; dmgMult *= BALANCE.surgeDMG; countMult *= BALANCE.surgeCount }
  window.waveSurgeHP = hpMult;
  window.waveSurgeDMG = dmgMult;

  let ec = 5 + wave*3;
  if(modifiers.includes('more_enemies')) ec = Math.floor(ec*1.5);
  ec = Math.floor(ec * countMult);

  const types = ['human','robot'];
  if(modifiers.includes('runner_wave')) types.push('runner','runner');
  if(modifiers.includes('tank_wave')) types.push('tank');
  if(modifiers.includes('flying')) types.push('drone','drone');
  if(modifiers.includes('spawner_wave')) types.push('spawner','spawner');
  if(modifiers.includes('slug_wave')) types.push('slug','slug');
  if(modifiers.includes('trickster_wave')) types.push('trickster');
  if(modifiers.includes('spider_wave')) types.push('spider','spider','spider','spider','spider','spider');
  if(modifiers.includes('chariot_wave')) types.push('chariot');
  if(modifiers.includes('ninja_wave')) types.push('ninja','ninja','ninja');
  if(modifiers.includes('chess_horse_wave')) types.push('chess_horse','chess_horse');
  if(modifiers.includes('chess_elephant_wave')) types.push('chess_elephant','chess_elephant');
  if(modifiers.includes('cheerful_wave')) types.push('cheerful','cheerful');
  if(modifiers.includes('ufo_wave')) types.push('ufo');
  if(modifiers.includes('hothead_wave')) types.push('hothead','hothead','hothead');
  if(modifiers.includes('ice_dog_wave')) types.push('ice_dog','ice_dog','ice_dog');
  if(wave>=2) types.push('shooter','gunner','enemy_shotgunner','slug','spider','worm','mortar');
  if(wave>=3) types.push('spitter','shotgunner','spider','ninja','fortifier','fortifier','wallbreaker','illusionist');
  if(wave>=5) types.push('ice_dog','rocketeer','spider','spider','ninja','wallbreaker');
  if(wave>=4) types.push('bomber','sniper_enemy','worm','mortar');
  if(wave>=6) types.push('chariot','mortar','illusionist','ice_dog');

  let spawnedCount = 0;
  waveTotalEnemies = ec;
  for(let i=0;i<ec;i++){
    const timerId = setTimeout(()=>{
      try{
        const t = types[Math.floor(Math.random()*types.length)];
        let x, z, a = 0;
        do {
          const ang = Math.random()*Math.PI*2;
          const d = 20+Math.random()*5;
          x = Math.cos(ang)*d;
          z = Math.sin(ang)*d;
          a++;
        } while(checkPositionBlocked(x,z,1.5) && a<20);
        if(a>=20){ x = 0; z = 20 }
        enemies.push(new Enemy(t, new THREE.Vector3(x,0,z)));
        updateUI();
      } catch(err){ console.error('Spawn failed:', err) }
      spawnedCount++;
      if(spawnedCount >= ec) waveSpawning = false;
    }, i*500);
    waveSpawnTimers.push(timerId);
  }
  if(wave >= 3){
    const vCount = 1+Math.floor(Math.random()*2);
    for(let i=0;i<vCount;i++){
      const timerId = setTimeout(()=>{
        let x, z, a = 0;
        do {
          const ang = Math.random()*Math.PI*2;
          const d = 8+Math.random()*10;
          x = Math.cos(ang)*d;
          z = Math.sin(ang)*d;
          a++;
        } while(checkPositionBlocked(x,z,1.5) && a<20);
        if(a<20){
          enemies.push(new Enemy('verkhushka', new THREE.Vector3(x,0,z)));
          waveTotalEnemies++;
          updateUI();
        }
      }, i*300+200);
      waveSpawnTimers.push(timerId);
    }
  }
  updateUI();
}

function onWaveCleared(){
  if(waveCleared) return;
  waveCleared = true;
  isWaveTransitioning = true;
  waveSpawnTimers.forEach(t => clearTimeout(t));
  waveSpawnTimers = [];

  credits += 15;

  keys = {};
  mouseDown = false;
  wasMouseDown = false;
  resetChargingState();

  currentDraft = [];
  generateDraft();

  enterHub();
}

let _lastAmmoForUI = -1;

function updateWeaponSlotsUI(){
  let html = '';
  ownedWeapons.forEach((w,i)=>{
    const active = i === curIdx;
    const rar = w.def.rarity || 'common';
    const rc = {common:'#888', rare:'#48f', epic:'#c4f', legendary:'#f80'}[rar];
    const jam = w.jammed ? ' <span style="color:#f00">⚠КЛИН</span>' : '';
    html += '<div class="wslot'+(active?' active':'')+'" style="'+(active?'':`border-color:${rc}33;color:${rc}99`)+'">';
    html += '['+(i+1)+'] <span style="color:'+rc+'">'+w.def.name+'</span>'+jam+'<br>';
    html += w.ammo+' / '+w.def.magSize;
    html += '</div>';
  });
  const wsEl = document.getElementById('weapon-slots');
  if(wsEl) wsEl.innerHTML = html;
}

function updateUI(){
  const w = currentWeapon;
  if(DOM.weaponName) DOM.weaponName.textContent = w.name;
  if(DOM.weaponType) DOM.weaponType.textContent = w.type+(w.chargeable?' ⚡':'');
  if(DOM.weaponDamage) DOM.weaponDamage.textContent = w.damage;
  if(DOM.weaponRate) DOM.weaponRate.textContent = w.fireRate.toFixed(1);
  if(DOM.weaponRange) DOM.weaponRange.textContent = w.range;
  if(DOM.healthText) DOM.healthText.textContent = Math.floor(player.health)+' / '+player.maxHealth;
  if(DOM.healthBar) DOM.healthBar.style.width = Math.max(0, player.health/player.maxHealth*100)+'%';
  if(DOM.armorText) DOM.armorText.textContent = Math.floor(player.armor)+' / '+player.maxArmor;
  if(DOM.armorBar) DOM.armorBar.style.width = player.armor/player.maxArmor*100+'%';
  const isMelee = w.weaponClass === 'melee';
  const isHg = w.weaponClass === 'hourglass';
  const isAcid = w.weaponClass === 'acidotronator';
  const curAmmo = getAmmo();
  if(DOM.ammoText){
    DOM.ammoText.textContent = isMelee ? '∞ / ∞'
      : (isHg ? '— / —'
      : ((modifiers.includes('infinite_ammo') || isAcid) ? '∞' : curAmmo+' / '+w.magSize));
    if(curAmmo !== _lastAmmoForUI && !isMelee && !isHg && !isAcid){
      DOM.ammoText.classList.remove('changed');
      void DOM.ammoText.offsetWidth;
      DOM.ammoText.classList.add('changed');
    }
    _lastAmmoForUI = curAmmo;
  }
  if(DOM.reloadStatus) DOM.reloadStatus.textContent = isReloading ? 'ПЕРЕЗАРЯДКА' : '';
  if(DOM.waveNum) DOM.waveNum.textContent = wave;
  if(DOM.enemiesLeft) DOM.enemiesLeft.textContent = enemies.filter(e=>!e.dead && !e.isCow && !e.isFriendlyMinion).length;
  if(DOM.enemiesKilled) DOM.enemiesKilled.textContent = enemiesKilled;
  if(DOM.modifiersList) DOM.modifiersList.innerHTML = modifiers.map(m=>{
    const md = allModifiers.find(x=>x.id===m);
    return `<div style="color:${md?md.color:'#0f0'}">• ${md?md.name:m}</div>`;
  }).join('');
  if(DOM.healthPanel) DOM.healthPanel.classList.toggle('warning', player.health < 30);
  if(DOM.ammoPanel) DOM.ammoPanel.classList.toggle('warning',
    curAmmo<=2 && !modifiers.includes('infinite_ammo') && !isMelee && !isHg && !isAcid);
  const creditEl = document.getElementById('credits-display');
  if(creditEl) creditEl.textContent = '💰 ' + credits;
  updateWeaponSlotsUI();
  renderSynergyHUD();
  updateCurseIndicator();
  if(typeof hubMode !== 'undefined' && hubMode && typeof updateHubHUD === 'function') updateHubHUD();
}

function updateRadar(){
  const c = document.getElementById('radar-canvas');
  if(!c) return;
  const ctx = c.getContext('2d');
  const sz = 180, ct = 90, rng = 30;
  ctx.clearRect(0,0,sz,sz);
  const g = ctx.createRadialGradient(ct,ct,0,ct,ct,ct);
  g.addColorStop(0, 'rgba(0,40,0,.8)');
  g.addColorStop(1, 'rgba(0,20,0,.9)');
  ctx.fillStyle = g; ctx.fillRect(0,0,sz,sz);
  ctx.strokeStyle = 'rgba(0,100,0,.3)'; ctx.lineWidth = 1;
  for(let i=0;i<=6;i++){
    const p = i/6*sz;
    ctx.beginPath(); ctx.moveTo(p,0); ctx.lineTo(p,sz); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,p); ctx.lineTo(sz,p); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(100,100,100,.6)';
  colliders.forEach(co=>{
    const dx = co.position.x-player.position.x, dz = co.position.z-player.position.z;
    if(Math.sqrt(dx*dx+dz*dz) < rng){
      const rx = ct+dx/rng*85, ry = ct+dz/rng*85;
      const w = co.size.x/rng*85, h = co.size.z/rng*85;
      ctx.fillRect(rx-w/2, ry-h/2, w, h);
    }
  });
  const ecols = {human:'#f00',robot:'#ff0',runner:'#0ff',tank:'#888',drone:'#88f',shooter:'#fa0',bomber:'#f44',spitter:'#0f0',gunner:'#f80',sniper_enemy:'#0ff',shotgunner:'#f30',rocketeer:'#f60',spawner:'#f0f',enemy_shotgunner:'#f44',slug:'#a0f',trickster:'#f0f',spider:'#a4a',chariot:'#886',ninja:'#666',fortifier:'#4af',worm:'#d44',mortar:'#f80',illusionist:'#c4f',illusion_copy:'#84f',wallbreaker:'#a53',verkhushka:'#4a4',chess_horse:'#eea',chess_elephant:'#aae',cheerful:'#ff0',ufo:'#0f8',cow:'#fff',green_alien:'#0f0',hothead:'#f6c',ice_dog:'#8cf'};
  enemies.forEach(e=>{
    if(e.dead) return;
    if(e.type === 'worm' && e.segmentWorldPos){
      e.segmentWorldPos.forEach((wp,i)=>{
        const dx = wp.x-player.position.x, dz = wp.z-player.position.z;
        if(Math.sqrt(dx*dx+dz*dz) < rng){
          const rx = ct+dx/rng*85, ry = ct+dz/rng*85;
          ctx.fillStyle = i===0 ? '#f44' : '#a33';
          ctx.beginPath(); ctx.arc(rx,ry,i===0?4:2.5,0,Math.PI*2); ctx.fill();
        }
      });
      return;
    }
    const dx = e.group.position.x-player.position.x, dz = e.group.position.z-player.position.z;
    if(Math.sqrt(dx*dx+dz*dz) < rng){
      const rx = ct+dx/rng*85, ry = ct+dz/rng*85;
      ctx.fillStyle = e.isFriendlyMinion ? '#0f0' : (ecols[e.type] || '#f00');
      const sz2 = ['tank','chariot','fortifier','ufo','cow','ice_dog'].includes(e.type) ? 6
        : ['spawner','trickster','spider','verkhushka','chess_horse','chess_elephant','cheerful'].includes(e.type) ? 5 : 3;
      ctx.beginPath(); ctx.arc(rx,ry,sz2,0,Math.PI*2); ctx.fill();
    }
  });
  medkits.forEach(mk=>{
    const dx = mk.mesh.position.x-player.position.x, dz = mk.mesh.position.z-player.position.z;
    if(Math.sqrt(dx*dx+dz*dz) < rng){
      const rx = ct+dx/rng*85, ry = ct+dz/rng*85;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx,ry,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f00';
      ctx.fillRect(rx-1,ry-2.5,2,5); ctx.fillRect(rx-2.5,ry-1,5,2);
    }
  });
  armorPickups.forEach(mk=>{
    const dx = mk.mesh.position.x-player.position.x, dz = mk.mesh.position.z-player.position.z;
    if(Math.sqrt(dx*dx+dz*dz) < rng){
      const rx = ct+dx/rng*85, ry = ct+dz/rng*85;
      ctx.fillStyle = '#ffdd00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx,ry-4); ctx.lineTo(rx+3,ry); ctx.lineTo(rx,ry+4); ctx.lineTo(rx-3,ry);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  });
  ctx.save();
  ctx.translate(ct,ct);
  ctx.rotate(-player.yaw);
  ctx.fillStyle = '#0f0';
  ctx.beginPath();
  ctx.moveTo(0,-8); ctx.lineTo(-5,5); ctx.lineTo(5,5); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;
  ctx.strokeRect(0,0,sz,sz);
}

function cardWillTriggerSynergy(card){
  if(!card || !card.tags) return false;
  for(const t of card.tags){
    if(t === 'random' || !synergies[t]) continue;
    const after = synergies[t].count + 1;
    if(computeSynergyLevel(after) > computeSynergyLevel(synergies[t].count)) return true;
  }
  return false;
}
function renderCardTags(tags){
  if(!tags || tags.length === 0) return '';
  return tags.map(t => {
    if(t === 'random') return '<span class="nest-tag">🎲</span>';
    const meta = SYNERGY_META[t];
    if(!meta) return '';
    return `<span class="nest-tag ${t}">${meta.icon} ${meta.name}</span>`;
  }).join('');
}
function createCardElement(card, idx){
  const el = document.createElement('div');
  el.className = 'nest-card ' + (card.rarity || 'common');
  if(card.cardType === 'curse') el.classList.add('curse');
  if(cardWillTriggerSynergy(card)) el.classList.add('synergy-ready');
  if(card.bought) el.classList.add('bought');
  const price = cardPrice(card);
  const canAfford = credits >= price;
  if(!card.bought && !canAfford) el.classList.add('no-money');
  el.style.animationDelay = (Math.random() * 1.5).toFixed(2) + 's';
  el.style.animationDuration = (2.6 + Math.random() * 1.2).toFixed(2) + 's';
  el.dataset.idx = idx;
  let icon = '📦', typeName = '', cardName = '', cardDesc = '';
  if(card.cardType === 'weapon'){
    icon = '🎖'; typeName = 'ОРУЖИЕ';
    cardName = card.weapon.name;
    cardDesc = `${card.weapon.type} | Урон: ${card.weapon.damage}`;
  } else if(card.cardType === 'modifier'){
    icon = '⚙'; typeName = 'МОДИФИКАТОР';
    cardName = card.modifier.name;
    cardDesc = card.modifier.desc;
  } else if(card.cardType === 'upgrade'){
    icon = '📈'; typeName = 'АПГРЕЙД';
    cardName = card.upgrade.name;
    cardDesc = 'Постоянный буст';
  } else if(card.cardType === 'curse'){
    icon = '☠'; typeName = 'КУРС-КАРТА';
    cardName = card.curse.name;
    cardDesc = card.curse.desc;
  } else if(card.cardType === 'utility'){
    icon = '💊'; typeName = 'УТИЛИТА';
    cardName = card.utility.name;
    cardDesc = card.utility.desc;
  }
  if(card.isMemWeapon) typeName = '💀 МЕМ-ОРУЖИЕ';
  const keyLabels = ['Q', 'W', 'E', 'R', 'T'];
  let pityHint = '';
  if(card.pityForced) pityHint = `<div class="nest-card-hint" style="color:#0ff">🎁 ГАРАНТИЯ: ${SYNERGY_META[card.pityForced].icon}</div>`;
  else if(card.pityBoosted) pityHint = `<div class="nest-card-hint" style="color:#8f8">✨ БУСТ: ${SYNERGY_META[card.pityBoosted].icon}</div>`;
  const priceClass = canAfford ? '' : 'poor';
  const priceLabel = card.bought ? '✓ КУПЛЕНО' : `💰 ${price}  [${keyLabels[idx] || '?'}]`;
  el.innerHTML = `
    <div class="nest-card-key">${keyLabels[idx] || '?'}</div>
    <div class="nest-card-icon">${icon}</div>
    <div class="nest-card-type">${typeName}</div>
    <div class="nest-card-name">${cardName}</div>
    <div class="nest-card-desc">${cardDesc}</div>
    <div class="nest-card-tags">${renderCardTags(card.tags)}</div>
    ${pityHint || (cardWillTriggerSynergy(card) ? '<div class="nest-card-hint">✨ АКТИВИРУЕТ СИНЕРГИЮ!</div>' : '')}
    <div class="nest-card-price ${priceClass}">${priceLabel}</div>
  `;
  return el;
}
function renderNestSynergyStatus(){
  const el = DOM.nestSynergyStatus;
  if(!el) return;
  const active = SYNERGY_TAGS
    .filter(t => synergies[t].count > 0)
    .map(t => `${SYNERGY_META[t].icon} ${synergies[t].count}/${SYNERGY_THRESHOLDS[0]}`)
    .join('  ');
  el.textContent = 'СИНЕРГИИ: ' + (active || 'нет') + `  |  💰 ${credits}`;
}
function updateRerollButton(){
  const btn = DOM.rerollBtn;
  if(!btn) return;
  const canAfford = credits >= REROLL_PRICE;
  btn.disabled = !canAfford;
  btn.innerHTML = `🔄 РЕРОЛЛ (-${REROLL_PRICE}💰) <span class="key-hint">[A]</span>`;
}
function renderNestScreen(){
  if(!DOM.nestScreen) return;
  DOM.nestScreen.style.display = 'block';
  DOM.nestHint.innerHTML = `Выбери карту для покупки: <span class="key-hint">Q</span> <span class="key-hint">W</span> <span class="key-hint">E</span> <span class="key-hint">R</span> <span class="key-hint">T</span>  |  💰 <span style="color:#ff0">${credits}</span>`;
  const cardsEl = DOM.nestCards;
  cardsEl.innerHTML = '';
  cardsEl.classList.remove('waiting-y');
  currentDraft.forEach((card, i) => {
    const cardEl = createCardElement(card, i);
    cardEl.style.opacity = '0';
    cardsEl.appendChild(cardEl);
    setTimeout(() => {
      cardEl.style.transition = 'opacity .4s';
      cardEl.style.opacity = '1';
      audio.slotDing();
    }, i * 280);
  });
  updateRerollButton();
  renderNestSynergyStatus();
}

function generateDraft(){
  const isGolden = (wave % BALANCE.goldenEvery === 0);
  const cardCount = 3;
  currentDraft = [];
  for(let i = 0; i < cardCount; i++){
    let card;
    if(isGolden && i === cardCount - 1) card = rollCardSmart(true);
    else card = rollCardSmart(false);
    currentDraft.push(card);
  }
  if(pendingMemWeapon){
    pendingMemWeapon = false;
    const memWeapons = weapons.filter(w => w.memWeapon);
    if(memWeapons.length > 0){
      const chosen = memWeapons[Math.floor(Math.random()*memWeapons.length)];
      currentDraft.push({
        cardType: 'weapon', weapon: chosen, rarity: 'legendary', tags: chosen.tags || [], isMemWeapon: true,
      });
      showDebugToast('💀 МЕМ-ОРУЖИЕ ДОСТУПНО!');
    }
  }
}

function pickCard(idx){
  if(!isNestActive || pickLocked) return;
  const card = currentDraft[idx];
  if(!card || card.bought) return;
  const price = cardPrice(card);
  if(credits < price){
    showDebugToast(`Не хватает 💰 (нужно ${price})`);
    audio.wallHit();
    return;
  }
  credits -= price;
  applyCardEffect(card);
  updatePityAfterPick(card);
  card.bought = true;
  audio.cardPick();
  updateUI();
  // Перерисовываем — купленная карта становится серой
  renderNestScreen();
  renderNestSynergyStatus();
}

function rerollNest(){
  if(!isNestActive || pickLocked) return;
  if(credits < REROLL_PRICE){
    showDebugToast(`Нужно ${REROLL_PRICE}💰 для реролла`);
    audio.wallHit();
    return;
  }
  credits -= REROLL_PRICE;
  audio.reroll();
  generateDraft();
  renderNestScreen();
  updateUI();
}

function exitNest(){
  if(!isNestActive || pickLocked) return;
  closeDraft();
}

function closeDraft(){
  const ns = document.getElementById('nest-screen');
  if(ns) ns.style.display = 'none';
  const synEl = document.getElementById('nest-synergy-panel');
  if(synEl) synEl.classList.remove('show');
  isNestActive = false;
  isSynergyPanelOpen = false;
  pickLocked = false;
  if(hubMode && !document.pointerLockElement){
    document.body.requestPointerLock();
  }
}

// continueToWave вызывается ИЗ hub.exit() при телепорте — стартует следующую волну
function continueToWave(){
  const ns = document.getElementById('nest-screen');
  if(ns) ns.style.display = 'none';
  const synEl = document.getElementById('nest-synergy-panel');
  if(synEl) synEl.classList.remove('show');
  isNestActive = false;
  isSynergyPanelOpen = false;
  isWaveTransitioning = false;
  pickLocked = false;
  turretCooldown = 0;

  keys = {};
  mouseDown = false;
  wasMouseDown = false;

  wave++;
  startWave();
  updateUI();
}

function renderSynergyPanel(){
  const body = document.getElementById('nest-synergy-panel-body');
  if(!body) return;
  let html = '';

  html += '<div class="syn-panel-section">';
  html += '<div class="syn-panel-section-title">🔥 ТЕГИ СИНЕРГИЙ (2 / 4 / 7 карт)</div>';
  SYNERGY_TAGS.forEach(tag => {
    const s = synergies[tag];
    const meta = SYNERGY_META[tag];
    const lvl = s.level;
    const pity = pityCounters[tag] || 0;
    let pityStr = '';
    if(pity >= PITY.guaranteeAfter) pityStr = ' <span style="color:#0ff">🎁 ГАРАНТИЯ</span>';
    else if(pity >= PITY.boostAfter) pityStr = ' <span style="color:#8f8">✨ БУСТ</span>';
    html += `<div class="syn-panel-tag">`;
    html += `<div class="syn-panel-tag-icon">${meta.icon}</div>`;
    html += `<div class="syn-panel-tag-body">`;
    html += `<div class="syn-panel-tag-name" style="color:${meta.color}">${meta.name} — ${s.count} карт${pityStr}</div>`;
    html += `<div class="syn-panel-tag-progress">Уровень: ${lvl}/3 · Pity: ${pity}/${PITY.guaranteeAfter}</div>`;
    SYNERGY_BONUSES[tag].forEach((bonus, i) => {
      const need = SYNERGY_THRESHOLDS[i];
      if(lvl > i) html += `<div class="syn-panel-tag-bonus">✓ R${i+1} <b>${bonus.name}</b>: ${bonus.desc}</div>`;
      else html += `<div class="syn-panel-tag-locked">○ R${i+1} (${need} карт): ${bonus.name} — ${bonus.desc}</div>`;
    });
    html += `</div></div>`;
  });
  html += '</div>';

  html += '<div class="syn-panel-section">';
  html += '<div class="syn-panel-section-title">⚡ ДУО-СИНЕРГИИ</div>';
  if(activeDuos.length === 0){
    html += '<div style="color:#555;font-style:italic;padding:8px">Нет активных дуо. Активируются при 2+ тегах R1.</div>';
  } else {
    activeDuos.forEach(id => {
      const duo = DUO_SYNERGIES.find(d => d.id === id);
      if(duo){
        html += `<div class="syn-panel-duo">`;
        html += `<div class="syn-panel-duo-name">⚡ ${duo.name}</div>`;
        html += `<div class="syn-panel-duo-desc">${duo.desc}</div>`;
        html += `</div>`;
      }
    });
  }
  html += '</div>';

  html += '<div class="syn-panel-section">';
  html += '<div class="syn-panel-section-title">📈 СТАТЫ</div>';
  html += '<div class="syn-panel-buffs">';
  const buffList = [
    ['damageMult', 'УРОН', (v) => `×${v.toFixed(2)}`],
    ['critChance', 'КРИТ ШАНС', (v) => `${(v*100).toFixed(0)}%`],
    ['critMult', 'КРИТ УРОН', (v) => `×${v.toFixed(1)}`],
    ['speedMult', 'СКОРОСТЬ', (v) => `×${v.toFixed(2)}`],
    ['reloadMult', 'ПЕРЕЗАРЯДКА', (v) => `×${v.toFixed(2)}`],
    ['aoeMult', 'РАДИУС AOE', (v) => `×${v.toFixed(2)}`],
    ['regenRate', 'РЕГЕН', (v) => `+${v.toFixed(1)}/с`],
    ['maxDashes', 'РЫВКИ', (v) => `${v}`],
    ['burnDur', 'ВРЕМЯ ОГНЯ', (v) => `×${v.toFixed(2)}`],
    ['freezeDur', 'ВРЕМЯ ЛЬДА', (v) => `×${v.toFixed(2)}`],
    ['poisonDur', 'ВРЕМЯ ЯДА', (v) => `×${v.toFixed(2)}`],
    ['poisonStacks', 'СТАК ЯДА', (v) => `${v}`],
    ['medkitHeal', 'МЕДКИТЫ', (v) => `×${v.toFixed(2)}`],
    ['slowPower', 'ЗАМЕДЛЕНИЕ', (v) => `×${v.toFixed(2)}`],
    ['iceDamageMult', 'УРОН ЛЬДОМ', (v) => `×${v.toFixed(2)}`],
    ['aoeDamageMult', 'УРОН AOE', (v) => `×${v.toFixed(2)}`],
  ];
  let hasBuff = false;
  buffList.forEach(([key, label, fmt]) => {
    const v = playerBuffs[key];
    if(v !== undefined && v !== 1 && v !== 0){
      html += `<div class="syn-panel-buff"><span class="syn-panel-buff-label">${label}</span><span class="syn-panel-buff-val">${fmt(v)}</span></div>`;
      hasBuff = true;
    }
  });
  if(!hasBuff) html += '<div style="color:#555;font-style:italic;padding:8px">Нет активных апгрейдов.</div>';
  html += '</div></div>';

  if(curseCounter > 0){
    html += '<div class="syn-panel-section" style="border-left-color:#f00">';
    html += '<div class="syn-panel-section-title" style="color:#f00">💀 КУРС-СЧЁТЧИК</div>';
    html += `<div style="color:#fc8;font-size:12px;padding:4px">Взято курс-карт: <b style="color:#f00">${curseCounter}</b> (${curseCounter%3}/3 до мем-оружия)</div>`;
    html += '</div>';
  }

  body.innerHTML = html;
  body.scrollTop = 0;
}
function toggleSynergyPanel(){
  if(!isNestActive) return;
  isSynergyPanelOpen = !isSynergyPanelOpen;
  const panel = document.getElementById('nest-synergy-panel');
  if(!panel) return;
  if(isSynergyPanelOpen){
    renderSynergyPanel();
    panel.classList.add('show');
  } else {
    panel.classList.remove('show');
  }
}

function gameOver(){
  if(isGameOver) return;
  isGameOver = true;
  audio.death();
  resetChargingState();
  if(modifiers.includes('death_explosion')){
    audio.explosion();
    createExplosion(player.position);
    enemies.slice().forEach(e=>{
      if(!e.dead && e.group.position.distanceTo(player.position) < 6) e.takeDamage(100, e.group.position);
    });
  }
  if(DOM.finalWave) DOM.finalWave.textContent = wave;
  if(DOM.finalKills) DOM.finalKills.textContent = enemiesKilled;
  const entries = Object.entries(damageFrom).filter(([k,v])=>v>.5).sort((a,b)=>b[1]-a[1]);
  let total = 0;
  let html = '<h3 style="margin:0 0 8px 0;color:#f80;font-size:16px">💥 УРОН ЗА ВОЛНУ '+wave+'</h3>';
  if(entries.length === 0) html += '<p style="color:#888;margin:5px 0">Не получил урона 😎</p>';
  else {
    html += '<ul style="list-style:none;padding:0;margin:0">';
    entries.forEach(([type,dmg])=>{
      html += `<li style="padding:3px 0;color:#fc8">${DMG_SOURCE_NAMES[type]||type}: <span style="color:#f00;font-weight:bold">${Math.floor(dmg)}</span></li>`;
      total += dmg;
    });
    html += '</ul>';
    html += `<p style="margin:10px 0 0;padding-top:8px;border-top:1px solid #500;color:#f00;font-weight:bold;font-size:17px">ВСЕГО: ${Math.floor(total)}</p>`;
  }
  if(DOM.finalDamageReport) DOM.finalDamageReport.innerHTML = html;
  if(DOM.gameOver) DOM.gameOver.style.display = 'block';
  if(document.pointerLockElement) document.exitPointerLock();
  damageGlitch(2);
}

let _hgHudVisible = null;
let _radarFrame = 0;

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const realDt = (now-lastTime)/1000;
  lastTime = now;
  let dt = Math.min(realDt, .1);
  if(hitstopTime > 0){ hitstopTime -= realDt; dt = Math.min(realDt, .1)*.08 }
  if(isGameOver){ renderer.render(scene, camera); return }

  // HUB MODE
  if(hubMode){
    if(hub) hub.update(dt);
    renderer.render(hubScene, camera);
    return;
  }

  if(enemiesKilled > _lastEnemiesKilled){
    credits += (enemiesKilled - _lastEnemiesKilled);
    _lastEnemiesKilled = enemiesKilled;
    const creditEl = document.getElementById('credits-display');
    if(creditEl) creditEl.textContent = '💰 ' + credits;
  }

  if(turretCooldown > 0) turretCooldown -= dt;
  if(activeTurret && activeTurret.hp > 0) activeTurret.update(dt);
  activeFortifiers = enemies.filter(e=>!e.dead && e.type === 'fortifier');

  if(player.slowTimer > 0) player.slowTimer -= dt;
  if(player.freezeTimer > 0) player.freezeTimer -= dt;

  if(playerBuffs.regenRate > 0 && !playerBuffs.disableRegen){
    regenTimer += dt;
    if(regenTimer >= 1){
      regenTimer = 0;
      player.health = Math.min(player.maxHealth, player.health + playerBuffs.regenRate);
      updateUI();
    }
  }
  if(playerBuffs.permanentDrain){
    player.health -= playerBuffs.permanentDrain * dt;
    if(player.health <= 0) gameOver();
  }

  if(player.knockback.lengthSq() > 1e-4){
    const kb = player.knockback.clone().multiplyScalar(dt);
    const nx = player.position.clone();
    nx.x += kb.x;
    if(!checkCollision(nx, player.radius)) player.position.x = nx.x;
    const nz = player.position.clone();
    nz.z += kb.z;
    if(!checkCollision(nz, player.radius)) player.position.z = nz.z;
    player.knockback.multiplyScalar(.88);
  } else player.knockback.set(0,0,0);

  if(DOM.slowIndicator){
    DOM.slowIndicator.classList.toggle('active', player.slowTimer>0 || player.freezeTimer>0);
    DOM.slowIndicator.classList.toggle('frozen', player.freezeTimer>0);
  }

  const targetFOV = isAiming ? 55 : 78;
  if(Math.abs(camera.fov-targetFOV) > .1){
    camera.fov += (targetFOV-camera.fov)*Math.min(1, realDt*12);
    camera.updateProjectionMatrix();
  }

  const _hgVis = currentWeapon.weaponClass === 'hourglass';
  if(_hgHudVisible !== _hgVis){
    if(DOM.hgHud) DOM.hgHud.style.display = _hgVis ? 'block' : 'none';
    _hgHudVisible = _hgVis;
  }

  if(hgState === 'slow' && !hgFrozen){
    hgTimer += dt;
    if(hgTimer >= HG_TIME_PER_CHARGE){
      hgTimer = 0;
      hgCharge -= 1;
      if(hgCharge <= 0){
        hgCharge = 0; hgState = 'fast'; hgTargetRotation = 0; hgFlipAnim = 1;
        if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = 'fast';
        if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '⚡ УСКОРЕНИЕ ×2.0'; DOM.hgModeLabel.style.color = '#f80' }
      }
    }
  } else if(hgState === 'fast' && !hgFrozen){
    hgTimer += dt;
    if(hgTimer >= HG_TIME_PER_CHARGE){
      hgTimer = 0; hgCharge += 1;
      if(hgCharge >= HG_MAX_CHARGE){
        hgCharge = HG_MAX_CHARGE; hgState = 'idle'; hgTargetRotation = 0; hgFlipAnim = 1;
        if(DOM.timeFreezeOverlay) DOM.timeFreezeOverlay.className = '';
        if(DOM.hgBarFill) DOM.hgBarFill.style.width = '100%';
        if(DOM.hgModeLabel){ DOM.hgModeLabel.textContent = '⏳ ГОТОВО'; DOM.hgModeLabel.style.color = '#ffd700' }
      }
    }
  }
  if(!hgFrozen && DOM.hgBarFill){
    let pct = Math.max(0, Math.min(100, (hgCharge / HG_MAX_CHARGE) * 100));
    DOM.hgBarFill.style.width = pct + '%';
    DOM.hgBarFill.style.background = hgState === 'slow' ? '#6cf' : hgState === 'fast' ? '#f80' : '#ffd700';
  }

  if(currentWeapon.weaponClass === 'acidotronator'){
    if(DOM.overheatIndicator) DOM.overheatIndicator.style.display = 'block';
    if(isOverheated){
      weaponHeat -= COOL_RATE*1.2*dt;
      if(weaponHeat <= 0){ weaponHeat = 0; isOverheated = false }
    } else {
      weaponHeat -= COOL_RATE*dt;
      if(weaponHeat < 0) weaponHeat = 0;
    }
    if(DOM.overheatFill){
      DOM.overheatFill.style.width = (weaponHeat / MAX_HEAT * 100) + '%';
      DOM.overheatFill.style.background = isOverheated ? '#f00' : (weaponHeat > 70 ? '#f80' : '#0f0');
    }
  } else {
    if(DOM.overheatIndicator) DOM.overheatIndicator.style.display = 'none';
  }

  if(tricksterOverlayTimer > 0){
    tricksterOverlayTimer -= dt;
    if(tricksterOverlayTimer <= 0){
      tricksterOverlayTimer = 0;
      const el = document.getElementById('trickster-overlay');
      if(el) el.classList.remove('active');
    }
  }
  for(let i=tricksterTraps.length-1;i>=0;i--){
    const trap = tricksterTraps[i];
    trap.life -= dt;
    trap.mesh.material.opacity = .04+Math.sin(Date.now()*.003)*.04;
    trap.mesh.rotation.y += dt*.5;
    if(trap.cooldown > 0) trap.cooldown -= dt;
    const dx = player.position.x-trap.mesh.position.x;
    const dz = player.position.z-trap.mesh.position.z;
    if(dx*dx+dz*dz < trap.radius*trap.radius && player.isGrounded && trap.cooldown <= 0){
      triggerTricksterTrap();
      trap.cooldown = 5;
    }
    if(trap.life <= 0){ scene.remove(trap.mesh); tricksterTraps.splice(i,1) }
  }

  for(let i=medkits.length-1;i>=0;i--){
    const mk = medkits[i];
    if(!isNestActive) mk.life -= dt;
    mk.mesh.rotation.y += dt*2.5;
    mk.bobPhase += dt*3;
    mk.mesh.position.y = 1+Math.sin(mk.bobPhase)*.15;
    const pulse = .5+Math.sin(Date.now()*.005)*.3;
    const lifeRatio = Math.max(0, mk.life/mk.maxLife);
    mk.glow.material.opacity = pulse*lifeRatio;
    mk.glow.scale.setScalar(1+Math.sin(Date.now()*.004)*.15);
    mk.light.intensity = 1.2+Math.sin(Date.now()*.006)*.5;
    if(mk.life < 5) mk.mesh.visible = Math.floor(mk.life*4)%2 === 0;
    else mk.mesh.visible = true;
    const pdx = player.position.x-mk.mesh.position.x;
    const pdz = player.position.z-mk.mesh.position.z;
    if(!isNestActive && Math.sqrt(pdx*pdx+pdz*pdz) < 1.8){
      const heal = Math.min(mk.healAmount, player.maxHealth-player.health);
      if(heal > 0){
        player.health = Math.min(player.maxHealth, player.health+mk.healAmount);
        updateUI();
        audio.pickup();
        spawnHealNumber(mk.mesh.position, mk.healAmount, '#0f0');
        for(let k=0;k<12;k++){
          const pt = new THREE.Mesh(new THREE.SphereGeometry(.08,4,4), new THREE.MeshBasicMaterial({color:0xff4444, transparent:true, opacity:1}));
          pt.position.copy(mk.mesh.position);
          const ang = k/12*Math.PI*2;
          pt.userData.velocity = new THREE.Vector3(Math.cos(ang)*.15, .2, Math.sin(ang)*.15);
          pt.userData.life = 30; pt.userData.gravity = true;
          scene.add(pt); particles.push(pt);
        }
        disposeGroup(mk.mesh); scene.remove(mk.mesh); medkits.splice(i,1);
        continue;
      }
    }
    if(mk.life <= 0){ disposeGroup(mk.mesh); scene.remove(mk.mesh); medkits.splice(i,1) }
  }

  for(let i=armorPickups.length-1;i>=0;i--){
    const mk = armorPickups[i];
    if(!isNestActive) mk.life -= dt;
    mk.mesh.rotation.y += dt*3;
    mk.bobPhase += dt*3.5;
    mk.mesh.position.y = 1+Math.sin(mk.bobPhase)*.18;
    const pulse = .5+Math.sin(Date.now()*.006)*.3;
    const lifeRatio = Math.max(0, mk.life/mk.maxLife);
    mk.glow.material.opacity = pulse*lifeRatio;
    mk.glow.scale.setScalar(1+Math.sin(Date.now()*.005)*.18);
    mk.light.intensity = 1+Math.sin(Date.now()*.007)*.5;
    if(mk.life < 5) mk.mesh.visible = Math.floor(mk.life*4)%2 === 0;
    else mk.mesh.visible = true;
    const pdx = player.position.x-mk.mesh.position.x;
    const pdz = player.position.z-mk.mesh.position.z;
    if(!isNestActive && Math.sqrt(pdx*pdx+pdz*pdz) < 1.8){
      const gain = Math.min(mk.amount, player.maxArmor-player.armor);
      if(gain > 0){
        player.armor = Math.min(player.maxArmor, player.armor+mk.amount);
        updateUI();
        audio.armorPickup();
        spawnHealNumber(mk.mesh.position, mk.amount, '#ffdd00');
        for(let k=0;k<12;k++){
          const pt = new THREE.Mesh(new THREE.SphereGeometry(.07,4,4), new THREE.MeshBasicMaterial({color:0xffdd00, transparent:true, opacity:1}));
          pt.position.copy(mk.mesh.position);
          const ang = k/12*Math.PI*2;
          pt.userData.velocity = new THREE.Vector3(Math.cos(ang)*.15, .25, Math.sin(ang)*.15);
          pt.userData.life = 30; pt.userData.gravity = true;
          scene.add(pt); particles.push(pt);
        }
        disposeGroup(mk.mesh); scene.remove(mk.mesh); armorPickups.splice(i,1);
        continue;
      }
    }
    if(mk.life <= 0){ disposeGroup(mk.mesh); scene.remove(mk.mesh); armorPickups.splice(i,1) }
  }

  for(let i=slowTraps.length-1;i>=0;i--){
    const tr = slowTraps[i];
    tr.life -= dt;
    const pulse = 1+Math.sin(Date.now()*.004)*.05;
    tr.ring.scale.setScalar(pulse);
    tr.beacon.material.color.setHSL(.58, 1, .5+Math.sin(Date.now()*.006)*.2);
    tr.light.intensity = .8+Math.sin(Date.now()*.005)*.4;
    if(tr.life < 3) tr.group.visible = Math.floor(tr.life*4)%2 === 0;
    else tr.group.visible = true;
    const pdx = player.position.x-tr.group.position.x;
    const pdz = player.position.z-tr.group.position.z;
    if(Math.sqrt(pdx*pdx+pdz*pdz) < tr.radius && player.isGrounded)
      player.slowTimer = Math.max(player.slowTimer, .15);
    if(tr.life <= 0){ disposeGroup(tr.group); scene.remove(tr.group); slowTraps.splice(i,1) }
  }

  if(DOM.dashFill) DOM.dashFill.style.width = Math.max(0, 1-dashCooldown/DASH_COOLDOWN_MAX)*100 + '%';

  if(!isNestActive){
    if(!isReloading && getAmmo() <= 0
       && currentWeapon.weaponClass !== 'hourglass'
       && currentWeapon.weaponClass !== 'turret'
       && currentWeapon.weaponClass !== 'melee'
       && currentWeapon.weaponClass !== 'acidotronator'
       && !modifiers.includes('infinite_ammo')) reload();

    const mv = new THREE.Vector3();
    if(keys['KeyW']) mv.z -= 1;
    if(keys['KeyS']) mv.z += 1;
    if(keys['KeyA']) mv.x -= 1;
    if(keys['KeyD']) mv.x += 1;
    player.isMoving = mv.length() > 0;
    const frozen = player.freezeTimer > 0;

    if(dashCooldown > 0) dashCooldown -= dt;
    if(!frozen){
      if(dashTime > 0){
        dashTime -= dt;
        const dm = dashDirVector.clone().multiplyScalar(DASH_SPEED*dt);
        const nx = player.position.clone();
        nx.x += dm.x;
        if(!checkCollision(nx, player.radius)) player.position.x = nx.x;
        const nz = player.position.clone();
        nz.z += dm.z;
        if(!checkCollision(nz, player.radius)) player.position.z = nz.z;
      }
      if((keys['ShiftLeft']||keys['ShiftRight']) && dashCooldown<=0 && player.isGrounded && player.isMoving && dashTime<=0){
        dashDirVector.copy(mv).normalize().applyAxisAngle(new THREE.Vector3(0,1,0), player.yaw);
        dashTime = DASH_DURATION;
        dashCooldown = DASH_COOLDOWN_MAX * (hasSynergy('speed',2) ? 0.5 : 1);
        audio.dash();
        cameraShake(.1,.15);
        if(playerBuffs.selfDamageOnDash){
          player.health -= playerBuffs.selfDamageOnDash;
          updateUI();
          if(player.health <= 0) gameOver();
        }
      }
      if(player.isMoving && player.isGrounded && dashTime <= 0){
        player.bobPhase += dt*10;
        const bobY = Math.sin(player.bobPhase*2)*.04;
        const bobX = Math.cos(player.bobPhase)*.03;
        camera.position.x = player.position.x+bobX;
        camera.position.y = player.position.y+bobY;
        camera.rotation.z = Math.sin(player.bobPhase)*.015;
      } else {
        player.bobPhase = 0;
        camera.position.x += (player.position.x-camera.position.x)*.2;
        camera.position.y += (player.position.y-camera.position.y)*.2;
        camera.rotation.z *= .8;
      }
      if(player.isMoving && dashTime <= 0){
        mv.normalize();
        mv.applyAxisAngle(new THREE.Vector3(0,1,0), player.yaw);
        let speed = player.speed * playerBuffs.speedMult;
        if(modifiers.includes('speed_boost')) speed *= 1.5;
        if(hasSynergy('speed',1)) speed *= 1.15;
        if(player.slowTimer > 0) speed *= .55;
        mv.multiplyScalar(speed);
        const nx = player.position.clone();
        nx.x += mv.x;
        if(!checkCollision(nx, player.radius)) player.position.x = nx.x;
        const nz = player.position.clone();
        nz.z += mv.z;
        if(!checkCollision(nz, player.radius)) player.position.z = nz.z;
      }
      if(!player.isGrounded){
        player.velocity.y -= .015;
        player.position.y += player.velocity.y;
        const pt = checkPlatform(player);
        if(pt !== null && player.velocity.y < 0){
          player.position.y = pt; player.velocity.y = 0; player.isGrounded = true; audio.land();
        } else if(player.position.y <= 1.6){
          player.position.y = 1.6; player.velocity.y = 0; player.isGrounded = true; audio.land();
        }
      }
      camera.position.z = player.position.z;

      if(burstFiring){
        burstTimer -= dt;
        if(burstTimer <= 0){
          executeShoot(true);
          burstCount--;
          if(burstCount <= 0) burstFiring = false;
          else burstTimer = 0.08;
        }
      }

      if(player.freezeTimer > 0) resetChargingState();
      else if(currentWeapon.chargeable && !isReloading){
        if(mouseDown){
          if(!chargingState.active){ chargingState.active = true; chargingState.start = now }
          const elapsed = (now-chargingState.start)/1000;
          const maxT = currentWeapon.maxChargeTime || 1.0;
          chargingState.charge = Math.min(1, elapsed/maxT);
          if(DOM.chargeIndicator) DOM.chargeIndicator.style.display = 'block';
          if(DOM.chargeFill) DOM.chargeFill.style.width = (chargingState.charge*100)+'%';
          if(chargingState.charge >= 1) DOM.crosshair.classList.add('charged');
          else DOM.crosshair.classList.remove('charged');
        } else if(chargingState.active){
          const ch = chargingState.charge;
          resetChargingState();
          fireChargedShot(ch);
        } else {
          if(DOM.chargeIndicator) DOM.chargeIndicator.style.display = 'none';
        }
      } else {
        if(chargingState.active) resetChargingState();
        if(mouseDown){
          if(currentWeapon.auto) shoot();
          else if(!wasMouseDown) shoot();
        }
      }
    }
    wasMouseDown = mouseDown;

    if(isReloading){
      reloadTimer -= dt;
      const baseTime = currentWeapon.reloadTime * (currentWeapon.magSize===1?.5:1) * (modifiers.includes('fast_reload')?.5:1) * playerBuffs.reloadMult;
      reloadPhase = Math.max(0, Math.min(1, 1-reloadTimer/baseTime));
      if(reloadTimer <= 0){
        isReloading = false;
        reloadPhase = 0;
        setAmmo(currentWeapon.magSize);
        if(modifiers.includes('more_ammo')) setAmmo(Math.floor(currentWeapon.magSize*1.5));
        weaponView.finishReload();
        if(DOM.reloadOverlay) DOM.reloadOverlay.style.display = 'none';
        updateUI();
      }
    }

    if(weaponView) weaponView.update(dt);
    enemies.slice().forEach(e=>{ if(e && !e.dead) e.update(dt) });

    for(let i=meteors.length-1;i>=0;i--){
      const m = meteors[i];
      m.position.y -= dt*12;
      m.rotation.x += dt*3; m.rotation.z += dt*2;
      if(m.position.y <= m.userData.targetY){
        audio.meteorImpact();
        createExplosion(m.userData.targetPos);
        createAOESphere(m.userData.targetPos, m.userData.aoe);
        enemies.slice().forEach(e=>{
          if(!e.dead && e.group.position.distanceTo(m.userData.targetPos) < m.userData.aoe)
            e.takeDamage(m.userData.damage, e.group.position);
        });
        const pd = player.position.distanceTo(m.userData.targetPos);
        if(pd < m.userData.aoe){
          player.health -= m.userData.damage*(1-pd/m.userData.aoe);
          updateUI();
          if(player.health <= 0) gameOver();
        }
        cameraShake(.3,.4);
        scene.remove(m); meteors.splice(i,1);
      }
    }

    for(let i=lightningBolts.length-1;i>=0;i--){
      const lb = lightningBolts[i];
      lb.life -= dt;
      lb.mesh.material.opacity = lb.life/lb.maxLife;
      if(lb.life <= 0){
        scene.remove(lb.mesh); lb.mesh.geometry.dispose(); lb.mesh.material.dispose(); lightningBolts.splice(i,1);
      }
    }

    for(let i=aoeSpheres.length-1;i>=0;i--){
      const s = aoeSpheres[i];
      s.life -= dt;
      const t = Math.max(0, s.life/s.maxLife);
      s.mesh.scale.setScalar(1+(1-t)*.25);
      s.mesh.material.opacity = .22*t;
      if(s.life <= 0){
        scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); aoeSpheres.splice(i,1);
      }
    }

    for(let i=acidPuddles.length-1;i>=0;i--){
      const puddle = acidPuddles[i];
      puddle.life -= dt;
      puddle.mesh.material.opacity = Math.min(.7, puddle.life/puddle.maxLife*.7);
      enemies.slice().forEach(e=>{
        if(e.dead) return;
        const dx = e.group.position.x-puddle.mesh.position.x;
        const dz = e.group.position.z-puddle.mesh.position.z;
        if(Math.sqrt(dx*dx+dz*dz) < puddle.radius) e.takeDamage(dt*40, e.group.position, 'acid');
      });
      if(puddle.life <= 0){ scene.remove(puddle.mesh); acidPuddles.splice(i,1) }
    }
    for(let i=poisonPuddles.length-1;i>=0;i--){
      const puddle = poisonPuddles[i];
      puddle.life -= dt;
      puddle.mesh.material.opacity = Math.min(.7, puddle.life/puddle.maxLife*.7);
      const dx = player.position.x-puddle.mesh.position.x;
      const dz = player.position.z-puddle.mesh.position.z;
      if(Math.sqrt(dx*dx+dz*dz) < puddle.radius && player.isGrounded)
        damagePlayer(puddle.dps*dt, 'slug', 0);
      if(puddle.isFriendly !== false){
        enemies.slice().forEach(e=>{
          if(e.dead || e.isFriendlyMinion) return;
          const edx = e.group.position.x-puddle.mesh.position.x;
          const edz = e.group.position.z-puddle.mesh.position.z;
          if(Math.sqrt(edx*edx+edz*edz) < puddle.radius){
            if(!e.poisonTimer || e.poisonTimer < 0.5){
              e.poisonTimer = Math.max(e.poisonTimer || 0, 1);
              e.poisonDps = Math.max(e.poisonDps || 0, 8);
            }
          }
        });
      }
      if(puddle.life <= 0){ scene.remove(puddle.mesh); poisonPuddles.splice(i,1) }
    }

    for(let i=projectiles.length-1;i>=0;i--){
      const p = projectiles[i];
      const prevP = p.position.clone();
      p.position.add(p.userData.velocity);
      if(p.userData.gravity){ p.userData.velocity.y -= .012 }
      if(p.userData.tankShell && p.userData.isEnemyProjectile) p.userData.velocity.y -= .003;
      if(p.userData.isShuriken){ p.rotation.z += .5; p.rotation.x += .05 }
      if(p.userData.isMortar){ p.rotation.x += dt*4; p.rotation.z += dt*3 }
      if(p.userData.isSaw && p.userData.spinner) p.userData.spinner.rotation.y += .8;
      if(p.userData.isAlienBolt){ p.rotation.z += dt*0.5 }
      if(p.userData.isIceDisc){ p.rotation.z += dt*3 }
      if(p.userData.isStone){ p.rotation.x += dt*4; p.rotation.y += dt*2 }

      if(p.userData.isWavy){
        const elapsed = (Date.now() - p.userData.spawnTime) * 0.001;
        const freq = typeof FARTGUN_WAVE_FREQ !== 'undefined' ? FARTGUN_WAVE_FREQ : 3.5;
        const amp = typeof FARTGUN_WAVE_AMP !== 'undefined' ? FARTGUN_WAVE_AMP : 0.06;
        const wobble = Math.sin(elapsed * freq) * amp;
        if(p.userData._lastWobble === undefined) p.userData._lastWobble = 0;
        const delta = wobble - p.userData._lastWobble;
        p.userData._lastWobble = wobble;
        const dirX = p.userData.origVel.x, dirZ = p.userData.origVel.z;
        const len = Math.sqrt(dirX*dirX + dirZ*dirZ) || 1;
        const perpX = -dirZ/len, perpZ = dirX/len;
        p.position.x += perpX * delta;
        p.position.z += perpZ * delta;
      }

      if(p.userData.isEnemyProjectile && !p.userData.gravity && !p.userData.isRocket && !p.userData.isMortar){
        if(p.userData._wallGrace === undefined) p.userData._wallGrace = 2;
        if(p.userData._wallGrace > 0){ p.userData._wallGrace--; }
        else if(pointInCollider(p.position)){
          createWallSpark(p.position);
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
      }

      if(p.userData.isSingularity){
        const pulse = .8+Math.sin(Date.now()*.005)*.3;
        p.scale.setScalar(pulse);
        p.rotation.x += dt*2; p.rotation.y += dt*3;
        enemies.slice().forEach(e=>{
          if(e.dead) return;
          const dist = e.group.position.distanceTo(p.position);
          if(dist < 8){
            const pullDir = p.position.clone().sub(e.group.position);
            pullDir.y = 0; pullDir.normalize();
            const ps = .05*(1-dist/8);
            e.group.position.add(pullDir.multiplyScalar(ps));
          }
        });
      }
      if(p.userData.isAcidotronator){ p.rotation.x += dt*5; p.rotation.z += dt*3 }
      if(p.userData.isSun){
        if(p.userData.rays){ p.userData.rays.rotation.y += dt*3; p.userData.rays.rotation.x += dt*1.5 }
        const pulse = 1+Math.sin(Date.now()*0.01)*0.1;
        p.scale.set(pulse,pulse,pulse);
        enemies.slice().forEach(e=>{
          if(e.dead) return;
          const dist = e.group.position.distanceTo(p.position);
          if(dist < p.userData.aoe){
            if(!e.sunDamageCooldown) e.sunDamageCooldown = 0;
            if(Date.now()-e.sunDamageCooldown > 250){
              e.takeDamage(p.userData.damage, e.group.position, 'fire', {burn: {duration: 2, dps: 5, spread: 0}});
              e.sunDamageCooldown = Date.now();
            }
          }
        });
      }
      if(p.userData.isSaw || p.userData.isPhysicalGrenade){
        if(pointInCollider(p.position)){
          p.userData.velocity.multiplyScalar(-.6);
          p.position.add(p.userData.velocity.clone().multiplyScalar(3));
          if(p.userData.isSaw){
            p.userData.bounces--;
            audio.wallHit();
            createWallSpark(p.position);
            if(p.userData.bounces <= 0){ disposeProjectile(p); projectiles.splice(i,1); continue }
          } else {
            p.userData.bounces--;
            audio.wallHit();
            createWallSpark(p.position);
          }
        }
      }
      if(p.userData.isPhysicalGrenade){
        p.rotation.x += .2; p.rotation.z += .15;
        if(p.position.y < .15 && p.userData.velocity.y < 0){
          p.position.y = .15;
          p.userData.velocity.y = Math.abs(p.userData.velocity.y)*.5;
          p.userData.velocity.x *= .6; p.userData.velocity.z *= .6;
        }
      }
      if(p.userData.isPlayerBullet && !p.userData.piercing && !modifiers.includes('ghost_bullets') && !p.userData.isPhysicalGrenade){
        if(pointInCollider(p.position)){
          if(p.userData.damageType === 'acid' && !p.userData.isAcidotronator && !p.userData.isSun)
            createAcidPuddle(p.position);
          audio.wallHit();
          createWallSpark(p.position);
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
      }
      p.userData.life--;
      if(p.userData.range && p.userData.startPos){
        const dFS = p.position.distanceTo(p.userData.startPos);
        if(dFS > p.userData.range){
          if(p.userData.damageType === 'acid' && !p.userData.isAcidotronator && !p.userData.isSun)
            createAcidPuddle(p.position);
          if((p.userData.isGrenade || p.userData.isNecro) && !p.userData.isEnemyProjectile)
            grenadeExplode(p);
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
      }
      if(p.userData.isEnemyProjectile){
        if(!hgFrozen && hgState === 'slow')
          p.position.add(p.userData.velocity.clone().multiplyScalar(SLOW_TIMESCALE-1));
        else if(!hgFrozen && hgState === 'fast')
          p.position.add(p.userData.velocity.clone().multiplyScalar(FAST_TIMESCALE-1));
        if(segmentHitsPlayer(prevP, p.position, player.position, player.radius)){
          if(p.userData.slowsPlayer) player.slowTimer = Math.max(player.slowTimer, 3);
          if(p.userData.isMortar){
            const kbDir = new THREE.Vector3(player.position.x-p.position.x, 0, player.position.z-p.position.z).normalize();
            damagePlayer(p.userData.damage, p.userData.sourceType||'unknown', 1, {knockback:kbDir.multiplyScalar(35)});
            audio.mortarLand();
            createExplosion(p.position);
            createAOESphere(p.position, 2);
          } else {
            const dmgOpts = {};
            if(p.userData.armorMult !== undefined) dmgOpts.armorMult = p.userData.armorMult;
            if(p.userData.hpMult !== undefined) dmgOpts.hpMult = p.userData.hpMult;
            damagePlayer(p.userData.damage, p.userData.sourceType||'unknown', .7, dmgOpts);
          }
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
        const prevPC = p.position.clone().sub(p.userData.velocity);
        if(p.userData.isRocket && (p.position.y < .3 || pointInCollider(p.position) || pointInCollider(prevPC))){
          audio.explosion();
          createExplosion(p.position);
          const er = p.userData.explodeRadius || 3.5;
          createAOESphere(p.position, er);
          const d = p.position.distanceTo(player.position);
          if(d < er) damagePlayer(p.userData.damage*(1-d/er), p.userData.sourceType||'unknown', 1);
          enemies.slice().forEach(e=>{
            if(!e.dead && e.group.position.distanceTo(p.position) < er)
              e.takeDamage(p.userData.damage*.5, e.group.position);
          });
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
        if(p.userData.isMortar && p.position.y < .15){
          audio.mortarLand();
          createExplosion(p.position);
          createAOESphere(p.position, 2);
          const d = p.position.distanceTo(player.position);
          if(d < 2){
            const kbDir = new THREE.Vector3(player.position.x-p.position.x, 0, player.position.z-p.position.z).normalize();
            damagePlayer(p.userData.damage, p.userData.sourceType||'unknown', 1, {knockback:kbDir.multiplyScalar(35)});
          }
          disposeProjectile(p); projectiles.splice(i,1);
          continue;
        }
        continue;
      }
      if(p.userData.life <= 0 || p.position.y < 0){
        if(p.userData.damageType === 'acid' && !p.userData.isAcidotronator && !p.userData.isSun)
          createAcidPuddle(p.position);
        if(p.userData.isRocket && p.userData.isEnemyProjectile){
          audio.explosion(); createExplosion(p.position);
          createAOESphere(p.position, p.userData.explodeRadius||3.5);
        } else if((p.userData.isGrenade || p.userData.isNecro) && p.userData.life <= 0){
          grenadeExplode(p);
        }
        disposeProjectile(p); projectiles.splice(i,1);
        continue;
      }

      let hs = false;
      const _enemySnap = enemies.slice();
      for(let j=_enemySnap.length-1;j>=0;j--){
        const e = _enemySnap[j];
        if(!e || e.dead) continue;
        if(e.isFriendlyMinion) continue;
        const hitResult = segmentHitsEnemy(e, prevP, p.position);
        if(hitResult){
          if(p.userData.isSingularity){
            const _now = Date.now();
            if(!p.userData.cooldowns) p.userData.cooldowns = {};
            const lastHit = p.userData.cooldowns[e.id] || 0;
            if(_now-lastHit > 300){
              p.userData.cooldowns[e.id] = _now;
              const hitDmg = getFalloffDamage(p.userData.damage, p, hitResult.pos);
              const opts = buildOpts(p);
              e.takeDamage(hitDmg, hitResult.pos, p.userData.damageType, opts);
              createHitSpark(hitResult.pos, p.userData.damageType);
              createBloodEffect(hitResult.pos, 'robot');
            }
          } else if(p.userData.isSun){
            // proximity handled
          } else {
            if(p.userData.hitEnemies && p.userData.hitEnemies.includes(e)) continue;
            const hitDmg = getFalloffDamage(p.userData.damage, p, hitResult.pos);
            const hitOpts = buildOpts(p);
            if(currentWeapon.weaponClass === 'tesla'){
              createLightningBolt(hitResult.pos, e.group.position);
              enemies.slice().forEach(ee=>{
                if(!ee.dead && ee !== e && !ee.isFriendlyMinion && ee.group.position.distanceTo(e.group.position) < 6){
                  createLightningBolt(e.group.position, ee.group.position);
                  ee.takeDamage(hitDmg*.4, ee.group.position, p.userData.damageType, hitOpts);
                }
              });
            }
            if(p.userData.isSaw){
              embedSaw(e, hitResult.pos);
              e.takeDamage(hitDmg, hitResult.pos, p.userData.damageType, hitOpts);
              createHitSpark(hitResult.pos, p.userData.damageType);
              audio.hit(); hs = true; break;
            }
            e.takeDamage(hitDmg, hitResult.pos, p.userData.damageType, hitOpts);
            createHitSpark(hitResult.pos, p.userData.damageType);
            if(p.userData.hitEnemies) p.userData.hitEnemies.push(e);
            if(p.userData.aoe && p.userData.aoe > 0) grenadeExplode(p);
            if(modifiers.includes('chain_lightning')){
              enemies.slice().forEach(ee=>{
                if(!ee.dead && ee !== e && !ee.isFriendlyMinion && ee.group.position.distanceTo(e.group.position) < 4)
                  ee.takeDamage(hitDmg*.3, ee.group.position, p.userData.damageType, hitOpts);
              });
            }
            if(modifiers.includes('explosive') && !(p.userData.aoe > 0)){
              audio.explosion();
              createExplosion(hitResult.pos);
              enemies.slice().forEach(ee=>{
                if(!ee.dead && ee !== e && !ee.isFriendlyMinion && ee.group.position.distanceTo(hitResult.pos) < 2)
                  ee.takeDamage(hitDmg*.5, ee.group.position, p.userData.damageType, hitOpts);
              });
            }
            if(!p.userData.piercing){ hs = true; break }
          }
        }
      }
      if(hs){ disposeProjectile(p); projectiles.splice(i,1); updateUI() }
    }

    const maxParts = (typeof BALANCE !== 'undefined' && BALANCE.maxParticles) ? BALANCE.maxParticles : 250;
    const overflow = particles.length - maxParts;
    if(overflow > 0){
      for(let k=0;k<overflow;k++){
        const old = particles.shift();
        if(old){
          scene.remove(old);
          if(old.geometry && old.geometry.dispose) old.geometry.dispose();
          if(old.material){
            if(Array.isArray(old.material)) old.material.forEach(m=>m&&m.dispose&&m.dispose());
            else if(old.material.dispose) old.material.dispose();
          }
        }
      }
    }
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      if(p.userData.velocity){
        p.position.add(p.userData.velocity);
        if(p.userData.gravity) p.userData.velocity.y -= .015;
        if(p.userData.isPoison){
          p.userData.velocity.multiplyScalar(.95);
          enemies.slice().forEach(e=>{
            if(!e.dead && e.group.position.distanceTo(p.position) < 1)
              e.takeDamage(.5, p.position, 'poison');
          });
        }
      }
      p.userData.life--;
      if(p.material && p.material.opacity !== undefined) p.material.opacity = p.userData.life/40;
      if(p.userData.life <= 0){ scene.remove(p); particles.splice(i,1) }
    }

    const maxDeb = (typeof BALANCE !== 'undefined' && BALANCE.maxDebris) ? BALANCE.maxDebris : 500;
    const debrisOverflow = debris.length - maxDeb;
    if(debrisOverflow > 0){
      for(let k=0;k<debrisOverflow;k++){
        const old = debris.shift();
        if(old){
          scene.remove(old.mesh);
          if(old.mesh.geometry) old.mesh.geometry.dispose();
          if(old.mesh.material) old.mesh.material.dispose();
        }
      }
    }
    for(let i=debris.length-1;i>=0;i--){
      const d = debris[i];
      if(!d.grounded){
        d.velocity.y -= .015;
        d.mesh.position.add(d.velocity);
        d.mesh.rotation.x += d.angularVelocity.x;
        d.mesh.rotation.y += d.angularVelocity.y;
        d.mesh.rotation.z += d.angularVelocity.z;
        if(d.mesh.position.y < .1){ d.mesh.position.y = .1; d.grounded = true; d.velocity.set(0,0,0) }
      }
      d.life--;
      if(d.life <= 0){
        scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        debris.splice(i,1);
      }
    }

    if(shakeTime > 0){
      shakeTime -= dt;
      camera.position.x += (Math.random()-.5)*shakeIntensity;
      camera.position.y += (Math.random()-.5)*shakeIntensity;
      shakeIntensity *= .9;
    }
  }

  const liveEnemies = enemies.filter(e=>!e.dead && !e.isCow && !e.isFriendlyMinion);
  if(liveEnemies.length === 0 && wave > 0 && !waveCleared && !waveSpawning && !isGameOver){
    onWaveCleared();
  }

  if(++_radarFrame % 2 === 0) updateRadar();
  renderer.render(scene, camera);
}

function buildOpts(p){
  const opts = {};
  if(p.userData.burn) opts.burn = p.userData.burn;
  if(p.userData.poison) opts.poison = p.userData.poison;
  if(p.userData.slow) opts.slow = p.userData.slow;
  if(p.userData.freeze) opts.freeze = p.userData.freeze;
  if(p.userData.freezeAoe) opts.freezeAoe = p.userData.freezeAoe;
  if(p.userData.isCrit) opts.isCrit = true;
  return opts;
}

document.addEventListener('keydown', e=>{
  if(hubMode) return;
  if(isSynergyPanelOpen){
    if(e.code === 'KeyD' || e.code === 'Escape'){ toggleSynergyPanel(); e.preventDefault(); return; }
    const panel = document.getElementById('nest-synergy-panel');
    if(panel){
      if(e.code === 'ArrowUp'){ panel.scrollTop -= 60; e.preventDefault(); return; }
      if(e.code === 'ArrowDown'){ panel.scrollTop += 60; e.preventDefault(); return; }
      if(e.code === 'PageUp'){ panel.scrollTop -= 400; e.preventDefault(); return; }
      if(e.code === 'PageDown'){ panel.scrollTop += 400; e.preventDefault(); return; }
    }
    return;
  }
  const nestEl = document.getElementById('nest-screen');
  if(isNestActive && nestEl && nestEl.style.display === 'block'){
    const idxMap = {KeyQ:0, KeyW:1, KeyE:2, KeyR:3, KeyT:4};
    if(idxMap[e.code] !== undefined){
      const idx = idxMap[e.code];
      if(idx < currentDraft.length) pickCard(idx);
      e.preventDefault();
      return;
    }
    if(e.code === 'KeyA'){ rerollNest(); e.preventDefault(); return; }
    if(e.code === 'KeyS' || e.code === 'Escape'){ exitNest(); e.preventDefault(); return; }
    if(e.code === 'KeyD'){ toggleSynergyPanel(); e.preventDefault(); return; }
    return;
  }
  keys[e.code] = true;
  if(e.code === 'KeyR' && !isGameOver && !isNestActive) reload();
  if(e.code === 'Space' && !isGameOver && !isNestActive){
    if(player.isGrounded){ player.velocity.y = .25; player.isGrounded = false; audio.jump() }
    else if(modifiers.includes('double_jump')){ player.velocity.y = .2; audio.jump() }
  }
  if(e.code === 'KeyL') toggleDebug();
  if(debugMode){
    if(e.code === 'Comma') switchWeapon(-1);
    if(e.code === 'Period') switchWeapon(1);
  }
});
document.addEventListener('keyup', e=>{ if(!hubMode) keys[e.code] = false; });
document.addEventListener('mousedown', e=>{
  if(hubMode) return;
  if(isNestActive || isSynergyPanelOpen || isGameOver) return;
  if(e.target.tagName !== 'BUTTON'){
    if(e.button === 0) mouseDown = true;
    if(e.button === 2){
      if(currentWeapon.weaponClass === 'hourglass') hourglassReload();
      else { isAiming = true; if(DOM.crosshair) DOM.crosshair.classList.add('ads') }
    }
  }
});
document.addEventListener('mouseup', e=>{
  if(e.button === 0) mouseDown = false;
  if(e.button === 2){
    if(currentWeapon.weaponClass !== 'hourglass'){
      isAiming = false;
      if(DOM.crosshair) DOM.crosshair.classList.remove('ads');
    }
  }
});
document.addEventListener('contextmenu', e=>e.preventDefault());
document.addEventListener('wheel', e=>{
  if(hubMode) return;
  if(isNestActive || ownedWeapons.length < 2) return;
  switchSlot(e.deltaY > 0 ? 1 : -1);
});
document.addEventListener('click', e=>{
  if(hubMode) return;
  if(e.target.tagName !== 'BUTTON' && !isNestActive && !isPointerLocked && !isGameOver)
    document.body.requestPointerLock();
});
document.addEventListener('mousemove', e=>{
  if(hubMode) return;
  if(isPointerLocked && !isNestActive && !isGameOver){
    player.yaw -= e.movementX*.002;
    player.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.pitch-e.movementY*.002));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }
});
document.addEventListener('pointerlockchange', ()=>{ isPointerLocked = !!document.pointerLockElement });

if(DOM.rerollBtn) DOM.rerollBtn.addEventListener('click', e=>{ e.stopPropagation(); if(isNestActive) rerollNest() });
const exitBtn = document.getElementById('exit-btn');
if(exitBtn) exitBtn.addEventListener('click', e=>{ e.stopPropagation(); if(isNestActive) exitNest() });
const infoBtn = document.getElementById('info-btn');
if(infoBtn) infoBtn.addEventListener('click', e=>{ e.stopPropagation(); if(isNestActive) toggleSynergyPanel() });

// Устаревшие doom-функции (диалог убран)
function doomAccept(){ pendingDoomChoice = false; nextWaveDoom = true; }
function doomSkip(){ pendingDoomChoice = false; nextWaveDoom = false; }

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

try {
  generateLevel();
  const sp = findSafeSpawnPosition();
  player.position.set(sp.x, 1.6, sp.z);
  camera.position.copy(player.position);
  weaponView = new WeaponView();
  renderSynergyHUD();
  updateCurseIndicator();
  startWave();
  updateUI();
  animate();
} catch(err){
  console.error('Bootstrap failed:', err);
  const banner = document.getElementById('js-error-banner');
  if(banner){
    banner.style.display = 'block';
    banner.textContent = '❌ BOOTSTRAP: ' + err.message + ' — ' + (err.stack||'').split('\n')[1];
  }
}

const GameLogger = {
  logs: [], maxLogs: 500,
  log(level, msg){
    const entry = `[${new Date().toISOString()}] [${level}] ${msg}`;
    this.logs.push(entry);
    if(this.logs.length > this.maxLogs) this.logs.shift();
    if(level === 'ERROR') console.error(entry);
    else if(level === 'WARN') console.warn(entry);
    else console.log(entry);
  },
  info(m){ this.log('INFO', m) }, warn(m){ this.log('WARN', m) }, error(m){ this.log('ERROR', m) },
  downloadLog(){
    const blob = new Blob([this.logs.join('\n')], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crash_${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
window.onerror = function(message, source, lineno, colno, error){
  GameLogger.error(`CRASH: ${message} @ ${source}:${lineno}:${colno}`);
  GameLogger.error(`Stack: ${error ? error.stack : 'No stack'}`);
  let btn = document.getElementById('crash-log-btn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'crash-log-btn';
    btn.textContent = '📥 СКАЧАТЬ ЛОГ';
    btn.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;padding:15px 30px;background:#f00;color:#fff;border:none;font-size:18px;cursor:pointer;font-family:monospace;';
    btn.onclick = ()=>GameLogger.downloadLog();
    document.body.appendChild(btn);
  }
};
window.addEventListener('unhandledrejection', event=>{ GameLogger.error(`UNHANDLED PROMISE: ${event.reason}`) });
GameLogger.info('=== v6.1 STARTED (Hub economy + combat sandbox) ===');
window.GameLogger = GameLogger;
