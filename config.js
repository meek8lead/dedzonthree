'use strict';
// INDUSTRIAL ROGUE SHOOTER v5.0 — CONFIG (Nest System)

// ═══ CONSTANTS ═══
const FORTIFIER_SHIELD_RADIUS = 5.0;
const HG_MAX_CHARGE = 5;
const HG_TIME_PER_CHARGE = 3;
const SLOW_TIMESCALE = 0.5;
const FAST_TIMESCALE = 2.0;
const MAX_HEAT = 100;
const HEAT_RATE = 10;
const COOL_RATE = 10;
const TURRET_COOLDOWN_MAX = 10;
const TURRET_HP = 50;
const TURRET_RANGE = 18;
const TURRET_FIRE_RATE = 2;
const DASH_COOLDOWN_MAX = 2;
const DASH_DURATION = .18;
const DASH_SPEED = 22;
const FARTGUN_WAVE_AMP = 0.06;
const FARTGUN_WAVE_FREQ = 3.5;

// ═══ BALANCE ═══
const BALANCE = {
  waveHPBase: 0.15, waveDMGBase: 0.07,
  waveHPAccel: 0.05, waveDMGAccel: 0.04,
  surgeEvery: 5, surgeHP: 1.30, surgeDMG: 1.25, surgeCount: 1.40,
  maxParticles: 250, maxDebris: 500,
  doomEvery: 3, doomHP: 1.5, doomDMG: 1.3,
  goldenEvery: 5,
  bossEvery: 15,
  perditionEvery: 1,
};

// ═══ MAP STYLES ═══
const mapStyles = [
  {name:'СУПЕРМАРКЕТ',sub:'АРЕНА',floor:0x888888,wall:0xaaaaaa,accent:0xff6600,accent2:0xffff00},
  {name:'ГОРОДСКАЯ УЛИЦА',sub:'ЛАБИРИНТ',floor:0x333333,wall:0x666666,accent:0xffff00,accent2:0xff0000},
  {name:'СРЕДНЕВЕКОВЫЙ ЗАМОК',sub:'БУНКЕР',floor:0x5a4a3a,wall:0x7a6a5a,accent:0xffaa00,accent2:0x880000},
  {name:'КОСМИЧЕСКАЯ СТАНЦИЯ',sub:'СКЛАД',floor:0x2a2a4a,wall:0x4a4a6a,accent:0x00ffff,accent2:0xff00ff},
  {name:'БИОМЕХАНИЧЕСКАЯ ЛАБОРАТОРИЯ',sub:'КОЛЬЦО',floor:0x3a2a3a,wall:0x5a3a5a,accent:0xff00ff,accent2:0x00ff00}
];

// ═══ SYNERGY TAGS ═══
const SYNERGY_TAGS = ['fire','ice','poison','explosive','crit','tank','speed','aoe','summon','time'];
const SYNERGY_META = {
  fire:      {name:'ПИРОМАНТ',     icon:'🔥', color:'#f60'},
  ice:       {name:'ЛЕДЯНОЙ',      icon:'❄', color:'#6cf'},
  poison:    {name:'ТОКСИК',       icon:'☢', color:'#8f3'},
  explosive: {name:'ПОДРЫВНИК',    icon:'💥', color:'#f80'},
  crit:      {name:'СНАЙПЕР',      icon:'🎯', color:'#ff0'},
  tank:      {name:'ТАНК',         icon:'🛡', color:'#48f'},
  speed:     {name:'СКОРОХОД',     icon:'⚡', color:'#0ff'},
  aoe:       {name:'ШИРОКИЙ',      icon:'🌀', color:'#c4f'},
  summon:    {name:'ПРИЗЫВАТЕЛЬ',  icon:'🔮', color:'#f0f'},
  time:      {name:'ХРОНОС',       icon:'⏳', color:'#8af'},
};
const SYNERGY_THRESHOLDS = [3, 6, 9];
const SYNERGY_BONUSES = {
  fire: [
    {level:1, name:'PYROMANIAC', desc:'25% шанс поджога (5 dmg × 3с)'},
    {level:2, name:'FIRE STORM',  desc:'Огонь распространяется на 3м'},
    {level:3, name:'INFERNO',     desc:'Огонь ×2 время, ×1.5 урон'},
  ],
  ice: [
    {level:1, name:'FROSTBITE',   desc:'20% шанс замедления (40% × 2с)'},
    {level:2, name:'DEEP FREEZE', desc:'3 замедления → заморозка 2с'},
    {level:3, name:'BLIZZARD',    desc:'Крио-взрыв при заморозке (AOE 4м)'},
  ],
  poison: [
    {level:1, name:'TOXIC',       desc:'30% шанс яда (4 dmg × 3с)'},
    {level:2, name:'VENOM',       desc:'Убийство = кислотная лужа'},
    {level:3, name:'PLAGUE',      desc:'Цепной яд (3 прыжка)'},
  ],
  explosive: [
    {level:1, name:'BOOM',        desc:'+25% радиус всех AOE'},
    {level:2, name:'CHAIN REACTION', desc:'Каждый 5-й выстрел = взрыв'},
    {level:3, name:'NUCLEAR',     desc:'AOE +50%, убийство = взрыв'},
  ],
  crit: [
    {level:1, name:'SHARPSHOOTER', desc:'+10% шанс крита'},
    {level:2, name:'LETHAL',       desc:'Криты ×4 (было ×3)'},
    {level:3, name:'DEADSHOT',     desc:'Криты накладывают кровотечение'},
  ],
  tank: [
    {level:1, name:'JUGGERNAUT',  desc:'+25 max HP'},
    {level:2, name:'REGENERATOR', desc:'+1.5 HP/сек, +15% броня'},
    {level:3, name:'FORTRESS',    desc:'Отражаешь 25% урона, броня 70%'},
  ],
  speed: [
    {level:1, name:'NIMBLE',      desc:'+15% скорость'},
    {level:2, name:'ADRENALINE',  desc:'Рывок -50%, +10% fire rate'},
    {level:3, name:'GHOST',       desc:'30% не тратить патрон'},
  ],
  aoe: [
    {level:1, name:'WIDE',        desc:'+20% радиус AOE'},
    {level:2, name:'BURN ZONE',   desc:'AOE поджигает'},
    {level:3, name:'BLACK HOLE',  desc:'Убийство в AOE стягивает'},
  ],
  summon: [
    {level:1, name:'TINKERER',    desc:'Турели ×1.5 fire rate'},
    {level:2, name:'ARMY',        desc:'2 турели + авто-ловушки'},
    {level:3, name:'NECROMANCER', desc:'Убийство = миньон'},
  ],
  time: [
    {level:1, name:'CHRONO',      desc:'Враги в 4м замедлены 15%'},
    {level:2, name:'STASIS',      desc:'Попадание замедляет 0.3с'},
    {level:3, name:'TIME LORD',   desc:'8% шанс заморозки в 12м'},
  ],
};

// ═══ DUO SYNERGIES ═══
const DUO_SYNERGIES = [
  {id:'pyroclasm',  tags:['fire','explosive'],      name:'PYROCLASM',     desc:'Взрывы поджигают 3м',        color:'#f80'},
  {id:'cryoblast',  tags:['ice','explosive'],       name:'CRYO BLAST',    desc:'Взрывы замораживают 1с',     color:'#6cf'},
  {id:'toxicbomb',  tags:['poison','explosive'],    name:'TOXIC BOMB',    desc:'Взрывы = кислотная лужа',    color:'#8f3'},
  {id:'assassin',   tags:['crit','speed'],          name:'ASSASSIN',      desc:'Убийство = +50% speed 2с',   color:'#ff0'},
  {id:'deadshot',   tags:['crit','fire'],           name:'DEADSHOT',      desc:'Криты поджигают',            color:'#fa0'},
  {id:'frostsniper',tags:['crit','ice'],            name:'FROST SNIPER',  desc:'Криты замораживают',         color:'#8df'},
  {id:'berzerker',  tags:['tank','fire'],           name:'BERZERKER',     desc:'Огонь лечит тебя 50%',       color:'#f60'},
  {id:'timetank',   tags:['tank','time'],           name:'TIME TANK',     desc:'-40% урона в slow-time',     color:'#8af'},
  {id:'plaguedoc',  tags:['summon','poison'],       name:'PLAGUE DOCTOR', desc:'Миньоны травят',             color:'#af3'},
  {id:'sniturrets', tags:['summon','crit'],         name:'SNIPER TURRETS',desc:'Турели критуют',             color:'#fd0'},
  {id:'dirtybomb',  tags:['aoe','explosive'],       name:'DIRTY BOMB',    desc:'AOE всегда поджигает',       color:'#f80'},
  {id:'blizzard',   tags:['aoe','ice'],             name:'BLIZZARD',      desc:'AOE замедляет 40%',          color:'#8df'},
  {id:'timewarp',   tags:['speed','time'],          name:'TIME WARP',     desc:'Рывок замедляет, +HG заряд', color:'#8af'},
  {id:'burningtime',tags:['fire','time'],           name:'BURNING TIME',  desc:'Урон огнём ×2 в slow-time',  color:'#f80'},
  {id:'toxictank',  tags:['poison','tank'],         name:'TOXIC TANK',    desc:'Получаешь урон = травишь 3м',color:'#8f3'},
];

// ═══ SIGNATURE COMBOS ═══
const SIGNATURE_COMBOS = [
  {weaponClass:'whip',       tag:'crit',      level:2, desc:'1-shot на врагах <50 HP'},
  {weaponClass:'minigun',    tag:'speed',     level:3, desc:'30% не тратить патрон'},
  {weaponClass:'flamethrower',tag:'fire',     level:2, desc:'+40% ширина конуса'},
  {weaponClass:'icegun',     tag:'ice',       level:2, desc:'3-й выстрел = заморозка'},
  {weaponClass:'sniper',     tag:'crit',      level:3, desc:'Пробивает 3 врагов'},
  {weaponClass:'bfg',        tag:'explosive', level:3, desc:'Оставляет горящую землю'},
  {weaponClass:'hourglass',  tag:'time',      level:2, desc:'Заряд HG +50%'},
  {weaponClass:'necro',      tag:'poison',    level:3, desc:'Убийство = зомби-миньон'},
  {weaponClass:'hammer',     tag:'explosive', level:2, desc:'2 метеора'},
  {weaponClass:'melee',      tag:'tank',      level:3, desc:'+30% отражённый урон'},
];

// ═══ WEAPONS (с тегами) ═══
const weapons = [
  {name:"ПИСТОЛЕТ",type:"Базовый",damage:25,fireRate:8.0,magSize:12,reloadTime:1.5,weaponClass:"pistol",spread:0,auto:false,range:50,aoe:0,rarity:'common',tags:[]},
  {name:"РЕВОЛЬВЕР 'МИРОТВОРЕЦ'",type:"Точный",damage:130,fireRate:1.2,magSize:6,reloadTime:2.5,weaponClass:"revolver",spread:0,auto:false,range:60,aoe:0,rarity:'rare',tags:['crit']},
  {name:"ПП 'ОСА'",type:"Автоматический",damage:14,fireRate:5.5,magSize:40,reloadTime:1.8,weaponClass:"smg",spread:.07,auto:true,range:35,aoe:0,rarity:'common',falloff:true,tags:['speed']},
  {name:"АВТОМАТ 'МЯСОРУБКА'",type:"Автоматический",damage:26,fireRate:2.0,magSize:30,reloadTime:2.5,weaponClass:"rifle",spread:.04,auto:true,range:40,aoe:0,rarity:'common',falloff:true,tags:[]},
  {name:"БЁРСТ 'ТРИПЛЕТ'",type:"Очередь",damage:26,fireRate:2,magSize:24,reloadTime:2.2,weaponClass:"burst",spread:.02,auto:false,range:50,aoe:0,burst:3,rarity:'rare',tags:['crit']},
  {name:"ДРОБОВИК 'ГРОМ'",type:"Дробовик",damage:38,fireRate:1.0,magSize:6,reloadTime:2.2,weaponClass:"shotgun",spread:.2,auto:false,range:15,aoe:0,pellets:10,rarity:'common',tags:['aoe']},
  {name:"СНАЙПЕРСКАЯ 'ПРОБОЙ'",type:"Точная",damage:120,fireRate:.5,magSize:5,reloadTime:4,weaponClass:"sniper",spread:0,auto:false,range:100,aoe:0,rarity:'rare',tags:['crit']},
  {name:"РЕЛЬСОТРОН",type:"Энергия",damage:200,fireRate:.3,magSize:3,reloadTime:6,damageType:"piercing",weaponClass:"railgun",spread:0,auto:false,range:150,aoe:0,rarity:'epic',tags:['aoe','crit']},
  {name:"МИНИГАН 'ИНДУСТРИЯ'",type:"Тяжелый",damage:32,fireRate:7,magSize:100,reloadTime:5,weaponClass:"minigun",spread:.06,auto:true,range:45,aoe:0,rarity:'rare',falloff:true,tags:['speed']},
  {name:"КИСЛОТНЫЙ ПЛЕВОК",type:"Химический",damage:35,fireRate:3,magSize:20,reloadTime:2,damageType:"acid",weaponClass:"acid",spread:.03,auto:false,range:25,aoe:0,rarity:'common',tags:['poison']},
  {name:"КИСЛОТРОНАТОР",type:"Химический",damage:12,fireRate:6.0,magSize:999,reloadTime:0,damageType:"acid",weaponClass:"acidotronator",spread:.08,auto:true,range:40,aoe:0,rarity:'rare',tags:['poison']},
  {name:"ОГНЕМЁТ 'АД'",type:"Огонь",damage:14,fireRate:8,magSize:80,reloadTime:4,damageType:"fire",weaponClass:"flamethrower",spread:.25,auto:true,range:11,aoe:0,pellets:4,rarity:'rare',falloff:true,tags:['fire','aoe']},
  {name:"ЛЕДЯНАЯ ПУШКА",type:"Крио",damage:20,fireRate:4,magSize:15,reloadTime:2.5,damageType:"ice",weaponClass:"icegun",spread:.02,auto:false,range:30,aoe:0,rarity:'common',tags:['ice']},
  {name:"ГРАНАТОМЁТ 'КАРТЕЛЬ'",type:"Взрывной",damage:80,fireRate:.6,magSize:4,reloadTime:5,damageType:"explosive",weaponClass:"grenade",spread:.02,auto:false,range:35,aoe:4,rarity:'common',tags:['explosive']},
  {name:"BFG 'СУДНЫЙ ДЕНЬ'",type:"Плазма",damage:300,fireRate:.2,magSize:2,reloadTime:8,damageType:"explosive",weaponClass:"bfg",spread:0,auto:false,range:60,aoe:8,rarity:'legendary',tags:['explosive','aoe']},
  {name:"ПЛАЗМА-ПУШКА",type:"Энергия",damage:35,fireRate:8.0,magSize:40,reloadTime:3,damageType:"fire",weaponClass:"plasma",spread:.15,auto:true,range:45,aoe:0,rarity:'rare',tags:['explosive']},
  {name:"ЛАЗЕР 'ГЛАЗ БОГА'",type:"Энергия",damage:15,fireRate:18.0,magSize:60,reloadTime:4,damageType:"laser",weaponClass:"laser",spread:.01,auto:true,range:55,aoe:0,rarity:'rare',tags:['speed']},
  {name:"ТЕСЛА-ПУШКА 'ГРОМОВЕРЖЕЦ'",type:"Молния",damage:50,fireRate:3,magSize:20,reloadTime:3,damageType:"lightning",weaponClass:"tesla",spread:.01,auto:false,range:35,aoe:0,rarity:'rare',falloff:true,tags:['explosive','time']},
  {name:"ПИЛО-МЁТ 'ЦИРКУЛЯРКА'",type:"Зарядный",damage:45,fireRate:2,magSize:10,reloadTime:3.5,damageType:"piercing",weaponClass:"saw",spread:.06,auto:false,range:30,aoe:0,rarity:'rare',chargeable:true,maxChargeTime:1.2,tags:['crit']},
  {name:"ПЛЕТЬ БОГА",type:"Божественный",damage:150,fireRate:1.2,magSize:10,reloadTime:3,damageType:"holy",weaponClass:"whip",spread:.08,auto:false,range:12,aoe:3,rarity:'epic',tags:['crit']},
  {name:"КУВАЛДА",type:"Ближний бой",damage:180,fireRate:.7,magSize:999,reloadTime:.4,weaponClass:"melee",spread:0,auto:false,range:4,aoe:0,rarity:'common',tags:['tank']},
  {name:"МЕТЕОРИТНЫЙ МОЛОТ",type:"Космический",damage:500,fireRate:.15,magSize:1,reloadTime:10,damageType:"explosive",weaponClass:"hammer",spread:0,auto:false,range:40,aoe:10,rarity:'epic',tags:['explosive']},
  {name:"СИНГУЛЯТОР",type:"Гравитация",damage:60,fireRate:1.5,magSize:8,reloadTime:2.5,damageType:"gravity",weaponClass:"singularity",spread:0,auto:false,range:80,aoe:0,rarity:'epic',tags:['time']},
  {name:"НЕКРОНОМИКОН",type:"Тёмная магия",damage:80,fireRate:.7,magSize:8,reloadTime:5,damageType:"dark",weaponClass:"necro",spread:.03,auto:false,range:30,aoe:5,rarity:'epic',tags:['poison','summon']},
  {name:"СОЛНЦЕ В КАРМАНЕ",type:"Свет",damage:50,fireRate:0.5,magSize:3,reloadTime:7,damageType:"fire",weaponClass:"sun",spread:0,auto:false,range:70,aoe:4,rarity:'legendary',tags:['fire','aoe']},
  {name:"ВЫКИДНАЯ ТУРЕЛЬ",type:"Тактика",damage:30,fireRate:0.25,magSize:1,reloadTime:10,weaponClass:"turret",spread:0,auto:false,range:18,aoe:0,rarity:'rare',tags:['summon']},
  {name:"КРОВАВОЙ АРБАЛЕТ",type:"Зарядный",damage:40,fireRate:2,magSize:1,reloadTime:0.8,weaponClass:"crossbow",spread:.02,auto:false,range:40,aoe:0,rarity:'rare',chargeable:true,maxChargeTime:1.4,tags:['crit']},
  {name:"РОГАТКА 'КАМЕННЫЙ ВЕК'",type:"Зарядная",damage:12,fireRate:1.5,magSize:1,reloadTime:0.9,weaponClass:"slingshot",spread:.02,auto:false,range:35,aoe:0,rarity:'common',chargeable:true,maxChargeTime:1.0,tags:[]},
  {name:"ПЕСОЧНЫЕ ЧАСЫ",type:"Время",damage:0,fireRate:2,magSize:1,reloadTime:1,weaponClass:"hourglass",spread:0,auto:false,range:0,aoe:0,rarity:'epic',tags:['time']},
  {name:"ПЕРДОМЕТ",type:"Меметичный",damage:18,fireRate:1.5,magSize:8,reloadTime:1.2,damageType:"poison",weaponClass:"fartgun",spread:.05,auto:false,range:25,aoe:0,rarity:'common',wavy:true,tags:['poison'],memWeapon:true},
  {name:"ЛОХО-СТВОЛ",type:"Дробовик-мем",damage:42,fireRate:1.2,magSize:4,reloadTime:2.5,weaponClass:"lohostvol",spread:.22,auto:false,range:14,aoe:0,pellets:7,rarity:'common',jamChance:0.25,tags:['aoe'],memWeapon:true}
];

// ═══ MODIFIERS (с тегами) ═══
const allModifiers=[
  {id:'2x_hp',name:'⚠ 2x HP врагов',desc:'Враги живучее в 2 раза',color:'#f80',weight:1,negative:true,tags:[]},
  {id:'2x_damage',name:'⚠ 2x урон врагов',desc:'Враги бьют сильнее',color:'#f00',weight:1,negative:true,tags:[]},
  {id:'faster',name:'⚠ Быстрые враги',desc:'Враги на 50% быстрее',color:'#ff0',weight:1,negative:true,tags:[]},
  {id:'flying',name:'⚠ ОРБ-ДРОНЫ',desc:'Появляются летающие орб-дроны',color:'#88f',weight:.8,negative:true,tags:[]},
  {id:'more_enemies',name:'⚠ Больше врагов',desc:'+50% врагов',color:'#f0f',weight:1,negative:true,tags:[]},
  {id:'tank_wave',name:'⚠ Танки',desc:'Появляются тяжёлые враги',color:'#888',weight:.8,negative:true,tags:[]},
  {id:'runner_wave',name:'⚠ Бегуны',desc:'Появляются быстрые враги',color:'#0ff',weight:.8,negative:true,tags:[]},
  {id:'spawner_wave',name:'⚠ СПАВНЕРЫ',desc:'Появляются спавнеры',color:'#f0f',weight:.5,negative:true,tags:[]},
  {id:'slug_wave',name:'⚠ СЛИЗНИ',desc:'Ядовитые слизни',color:'#a0f',weight:.7,negative:true,tags:[]},
  {id:'trickster_wave',name:'⚠ ТРИКСТЕРЫ',desc:'Хаотичные трикстеры',color:'#f0f',weight:.5,negative:true,tags:[]},
  {id:'spider_wave',name:'⚠ ПАУКИ',desc:'Гигантские пауки',color:'#a4a',weight:.7,negative:true,tags:[]},
  {id:'chariot_wave',name:'⚠ КОЛЕСНИЦЫ',desc:'Тараны-колесницы',color:'#886',weight:.5,negative:true,tags:[]},
  {id:'ninja_wave',name:'⚠ НИНДЗЯ',desc:'Быстрые ниндзя',color:'#666',weight:.7,negative:true,tags:[]},
  {id:'chess_horse_wave',name:'⚠ ШАХМАТНЫЙ КОНЬ',desc:'Ход L-образно',color:'#ccc',weight:.6,negative:true,tags:[]},
  {id:'chess_elephant_wave',name:'⚠ ШАХМАТНЫЙ СЛОН',desc:'Ход по диагонали',color:'#ccc',weight:.6,negative:true,tags:[]},
  {id:'cheerful_wave',name:'⚠ ВЕСЕЛЬЧАК',desc:'Катящийся смайлик',color:'#ff0',weight:.5,negative:true,tags:[]},
  {id:'ufo_wave',name:'⚠ ИНОПЛАНЕТЯНЕ',desc:'НЛО сбрасывают коров',color:'#0f0',weight:.4,negative:true,tags:[]},
  {id:'hothead_wave',name:'⚠ ГОРЯЧИЕ ГОЛОВЫ',desc:'Акробаты-позёры',color:'#f80',weight:.5,negative:true,tags:[]},
  {id:'piercing',name:'Пронзающие пули',desc:'Пули проходят сквозь',color:'#0f0',weight:1,negative:false,tags:['crit']},
  {id:'double_shot',name:'Двойной выстрел',desc:'Каждый выстрел ×2',color:'#ff0',weight:1,negative:false,tags:['crit']},
  {id:'vampire',name:'Вампиризм',desc:'Лечение при убийстве',color:'#f0f',weight:1,negative:false,tags:['tank']},
  {id:'explosive',name:'Разрывные пули',desc:'Пули взрываются',color:'#f80',weight:1,negative:false,tags:['explosive']},
  {id:'more_ammo',name:'+50% магазин',desc:'Больше патронов',color:'#0f0',weight:1,negative:false,tags:[]},
  {id:'fast_reload',name:'Быстрая перезарядка',desc:'-50% время',color:'#0ff',weight:1,negative:false,tags:['speed']},
  {id:'critical',name:'Критические удары',desc:'Шанс крита ×3',color:'#ff0',weight:1,negative:false,tags:['crit']},
  {id:'poison',name:'Ядовитое облако',desc:'Яд при убийстве',color:'#0f0',weight:1,negative:false,tags:['poison']},
  {id:'ricochet',name:'Рикошет',desc:'Пули отскакивают',color:'#fff',weight:1,negative:false,tags:['crit']},
  {id:'3x_damage',name:'3x урон игрока',desc:'Твой урон ×3',color:'#f00',weight:.7,negative:false,tags:['crit']},
  {id:'vampire_plus',name:'Супер вампиризм',desc:'+20 HP за убийство',color:'#f0f',weight:.7,negative:false,tags:['tank','tank']},
  {id:'double_jump',name:'Двойной прыжок',desc:'Прыжок в воздухе',color:'#88f',weight:.8,negative:false,tags:['speed']},
  {id:'chain_lightning',name:'Цепная молния',desc:'Урон по цепочке',color:'#ff0',weight:.8,negative:false,tags:['explosive','time']},
  {id:'fire_trail',name:'Огненный след',desc:'Враги горят',color:'#f80',weight:.8,negative:false,tags:['fire']},
  {id:'ice_aura',name:'Ледяная аура',desc:'Замедление рядом',color:'#0ff',weight:.8,negative:false,tags:['ice']},
  {id:'always_crit',name:'100% крит',desc:'Все попадания крит',color:'#ff0',weight:.5,negative:false,tags:['crit','crit']},
  {id:'aoe_kill',name:'Взрыв при убийстве',desc:'AOE при смерти врага',color:'#f80',weight:.7,negative:false,tags:['aoe','explosive']},
  {id:'regen',name:'Регенерация',desc:'+1 HP/сек',color:'#0f0',weight:.9,negative:false,tags:['tank']},
  {id:'armor_on_kill',name:'Броня за убийство',desc:'+10 брони',color:'#00f',weight:.8,negative:false,tags:['tank']},
  {id:'ghost_bullets',name:'Призрачные пули',desc:'Сквозь стены',color:'#fff',weight:.6,negative:false,tags:[]},
  {id:'death_explosion',name:'Взрыв смерти',desc:'Взрыв при твоей смерти',color:'#f00',weight:.5,negative:false,tags:['explosive']},
  {id:'lifesteal',name:'Кража жизни',desc:'+5 HP за попадание',color:'#f0f',weight:.7,negative:false,tags:['tank']},
  {id:'slow_time',name:'Замедление времени',desc:'Враги медленнее',color:'#88f',weight:.8,negative:false,tags:['time']},
  {id:'speed_boost',name:'Скорость +50%',desc:'Быстрее бегаешь',color:'#ff0',weight:.9,negative:false,tags:['speed']},
  {id:'glass_cannon',name:'💎 Стеклянная пушка',desc:'+100% урон, -50% HP',color:'#8cf',weight:.6,negative:false,tags:['crit','crit']},
  {id:'infinite_ammo',name:'∞ МАГАЗИН',desc:'Не перезаряжаться (-25% урон)',color:'#f0f',weight:.08,negative:false,tags:[]}
];

// ═══ UPGRADE CARDS (25) ═══
const UPGRADE_CARDS = [
  {id:'u_dmg_12',   name:'+12% УРОН',          tag:'crit',      rarity:'common',icon:'⚔️', effect:'playerBuff', key:'damageMult', op:'mul', value:1.12},
  {id:'u_hp_18',    name:'+18 HP',             tag:'tank',      rarity:'common',icon:'❤️', effect:'player',     key:'maxHealth',  op:'add', value:18},
  {id:'u_spd_10',   name:'+10% СКОРОСТЬ',      tag:'speed',     rarity:'common',icon:'💨', effect:'playerBuff', key:'speedMult',  op:'mul', value:1.10},
  {id:'u_rld_15',   name:'+15% СКОРОСТЬ ПЕРЕЗАРЯДКИ',tag:'speed',rarity:'common',icon:'⚙️',effect:'playerBuff',key:'reloadMult', op:'mul', value:0.85},
  {id:'u_aoe_20',   name:'+20% РАДИУС AOE',    tag:'aoe',       rarity:'common',icon:'🌀', effect:'playerBuff', key:'aoeMult',    op:'mul', value:1.20},
  {id:'u_crit_10',  name:'+10% КРИТ',          tag:'crit',      rarity:'rare',  icon:'🎯', effect:'playerBuff', key:'critChance', op:'add', value:0.10},
  {id:'u_arm_15',   name:'+15 БРОНЯ',          tag:'tank',      rarity:'common',icon:'🛡', effect:'player',     key:'armor',      op:'add', value:15},
  {id:'u_reg_2',    name:'+2 HP/сек',          tag:'tank',      rarity:'rare',  icon:'💚', effect:'playerBuff', key:'regenRate',  op:'add', value:2},
  {id:'u_burn_15',  name:'+15% ГОРЕНИЕ',       tag:'fire',      rarity:'rare',  icon:'🔥', effect:'playerBuff', key:'burnDur',    op:'mul', value:1.15},
  {id:'u_frz_20',   name:'+20% ЗАМОРОЗКА',     tag:'ice',       rarity:'rare',  icon:'❄', effect:'playerBuff', key:'freezeDur',  op:'mul', value:1.20},
  {id:'u_psn_20',   name:'+20% ВРЕМЯ ЯДА',     tag:'poison',    rarity:'rare',  icon:'☢', effect:'playerBuff', key:'poisonDur',  op:'mul', value:1.20},
  {id:'u_tur_1',    name:'+1 ТУРЕЛЬ',          tag:'summon',    rarity:'epic',  icon:'🔮', effect:'playerBuff', key:'maxTurrets', op:'add', value:1},
  {id:'u_dash_30',  name:'+30% РЫВОК',         tag:'speed',     rarity:'rare',  icon:'🏃', effect:'playerBuff', key:'dashDist',   op:'mul', value:1.30},
  {id:'u_dash_1',   name:'+1 РЫВОК',           tag:'speed',     rarity:'epic',  icon:'⚡', effect:'playerBuff', key:'maxDashes',  op:'add', value:1},
  {id:'u_hg_25',    name:'+25% ЗАРЯД HG',      tag:'time',      rarity:'rare',  icon:'⏳', effect:'playerBuff', key:'hgMaxCharge',op:'mul', value:1.25},
  {id:'u_crit_15',  name:'+15% УРОН КРИТОВ',   tag:'crit',      rarity:'rare',  icon:'💥', effect:'playerBuff', key:'critMult',   op:'add', value:0.15},
  {id:'u_expl_50',  name:'+50% РАДИУС ВЗРЫВОВ',tag:'explosive', rarity:'rare',  icon:'💣', effect:'playerBuff', key:'explosionRadius', op:'mul', value:1.50},
  {id:'u_medkit_20',name:'+20% HP МЕДКИТОВ',   tag:null,        rarity:'common',icon:'💊', effect:'playerBuff', key:'medkitHeal', op:'mul', value:1.20},
  {id:'u_psn_stk',  name:'+1 СТАК ЯДА',        tag:'poison',    rarity:'epic',  icon:'🧪', effect:'playerBuff', key:'poisonStacks',op:'add', value:1},
  {id:'u_slow_30',  name:'+30% ЗАМЕДЛЕНИЕ',    tag:'ice',       rarity:'rare',  icon:'🥶', effect:'playerBuff', key:'slowPower',  op:'mul', value:1.30},
  {id:'u_dmg_25',   name:'+25% УРОН',          tag:'crit',      rarity:'epic',  icon:'🗡️', effect:'playerBuff', key:'damageMult', op:'mul', value:1.25},
  {id:'u_hp_50',    name:'+50 HP',             tag:'tank',      rarity:'epic',  icon:'💖', effect:'player',     key:'maxHealth',  op:'add', value:50},
  {id:'u_crit_25',  name:'+25% КРИТ',          tag:'crit',      rarity:'epic',  icon:'🏹', effect:'playerBuff', key:'critChance', op:'add', value:0.25},
  {id:'u_spd_30',   name:'+30% СКОРОСТЬ',      tag:'speed',     rarity:'epic',  icon:'🌟', effect:'playerBuff', key:'speedMult',  op:'mul', value:1.30},
  {id:'u_dmg_50',   name:'+50% УРОН',          tag:'crit',      rarity:'legendary',icon:'⚡', effect:'playerBuff',key:'damageMult',op:'mul', value:1.50},
];

// ═══ CURSE CARDS (10) ═══
const CURSE_CARDS = [
  {id:'c_glass2',  name:'💎 СТЕКЛЯННАЯ ПУШКА+', tags:['crit','crit'], rarity:'epic',
   desc:'-50% max HP, +100% урон, криты ×5',
   apply:{ player:{maxHealth:'*0.5'}, buffs:{damageMult:2.0, critMult:5} }},
  {id:'c_pyro',    name:'🔥 ПИРОМАНЬЯК',         tags:['fire','fire'], rarity:'epic',
   desc:'-1 HP/сек, +50% урон огнём, поджог при касании',
   apply:{ buffs:{fireDamageMult:1.5, contactBurn:true}, permanentDrain:1 }},
  {id:'c_adren',   name:'⚡ АДРЕНАЛИН',           tags:['speed','speed'], rarity:'rare',
   desc:'10 урона при рывке, но рывок 0.3с',
   apply:{ buffs:{dashCooldownOverride:0.3}, selfDamageOnDash:10 }},
  {id:'c_iceheart',name:'❄ ЛЕДЯНОЕ СЕРДЦЕ',       tags:['ice','ice'], rarity:'epic',
   desc:'-25% скорость, аура замедления 3м',
   apply:{ buffs:{speedMult:0.75, iceAura:3} }},
  {id:'c_curse',   name:'☠ ПРОКЛЯТИЕ',            tags:['random','random'], rarity:'rare',
   desc:'-30% max HP, +2 случайных тега',
   apply:{ player:{maxHealth:'*0.7'}, randomDoubleTag:true }},
  {id:'c_blood',   name:'💀 КРОВАВЫЙ ПАКТ',       tags:['crit','crit'], rarity:'epic',
   desc:'Нет регена, криты ×5, +30% крит',
   apply:{ buffs:{critMult:5, critChance:0.3}, disableRegen:true }},
  {id:'c_chronos', name:'⏳ ХРОНОС',              tags:['time','time'], rarity:'epic',
   desc:'Враги +20% быстрее, попадания замедляют 0.5с',
   apply:{ buffs:{enemySpeedMult:1.2, allShotsSlow:0.5} }},
  {id:'c_cult',    name:'🔮 КУЛЬТ',               tags:['summon','summon'], rarity:'epic',
   desc:'-40 max HP, убийство = 2 миньона',
   apply:{ player:{maxHealth:'-40'}, buffs:{killMinions:2} }},
  {id:'c_berserk', name:'💥 БЕРСЕРК',             tags:['explosive','explosive'], rarity:'epic',
   desc:'15 урона при выстреле, каждый 3-й = AOE',
   apply:{ selfDamageOnShot:15, buffs:{everyNthAoe:3} }},
  {id:'c_blackhole',name:'🌀 ЧЁРНАЯ ДЫРА',        tags:['aoe','aoe'], rarity:'epic',
   desc:'-30% точность, AOE притягивает',
   apply:{ buffs:{spreadMult:1.3, aoePull:true} }},
];

// ═══ UTILITY CARDS (6) ═══
const UTILITY_CARDS = [
  {id:'ut_medkit', name:'💊 АПТЕЧКА',         rarity:'common', desc:'+60 HP',        apply:{player:{health:'+60'}}},
  {id:'ut_armor',  name:'🛡 БРОНЯ',            rarity:'common', desc:'+60 броня',     apply:{player:{armor:'+60'}}},
  {id:'ut_ammo',   name:'📦 ПАТРОНЫ',          rarity:'common', desc:'Полный магазин',apply:{fullAmmo:true}},
  {id:'ut_bomb',   name:'💣 БОМБА',            rarity:'rare',   desc:'Смерть = AOE 100',apply:{buff:{deathBomb:100}}},
  {id:'ut_luck',   name:'🍀 УДАЧА',            rarity:'rare',   desc:'+1 реролл',     apply:{bonusReroll:1}},
  {id:'ut_time',   name:'⏰ УСКОРЕНИЕ',        rarity:'common', desc:'5с замедл. след. волны',apply:{buff:{nextWaveSlow:5}}},
];

// ═══ CARD ROLL WEIGHTS ═══
const CARD_WEIGHTS = { weapon:0.20, modifier:0.35, upgrade:0.28, curse:0.10, utility:0.07 };
const RARITY_WEIGHTS = {
  early:  {common:70, rare:25, epic:5,  legendary:0},
  mid:    {common:50, rare:35, epic:13, legendary:2},
  late:   {common:30, rare:40, epic:25, legendary:5},
  elite:  {common:0,  rare:0,  epic:50, legendary:50},
};
function getRarityTier(wave){
  if(wave<=4) return 'early';
  if(wave<=10) return 'mid';
  return 'late';
}

// ═══ DOOM / GOLDEN / BOSS ═══
const DOOM_SETTINGS = { hpMult:1.5, dmgMult:1.3, extraCards:1, guaranteeEpic:true };
const GOLDEN_SETTINGS = { extraCards:1, bonusReroll:1, onlyElite:true };
const BOSS_SETTINGS = { hpMult:50, phases:3, rewardCards:2 };

// ═══ PERDITION ═══
const PERDITION_SETTINGS = {
  maxLevel:10,
  hpPerLevel:1.5, dmgPerLevel:1.3,
  extraModifiersPerLevel:1,
};

// ═══ DMG SOURCES / LOOT ═══
const DMG_SOURCE_NAMES={
  human:'🖐 Человек',robot:'🤖 Робот',runner:'🏃 Бегун',tank:'🛡 Танк',drone:'🔮 Орб',shooter:'🎯 Стрелок',bomber:'💣 Бомбардир',spitter:'🟢 Плеватель',gunner:'🔫 Пулемётчик',sniper_enemy:'🎯 Снайпер',shotgunner:'🔫 Дробовик',rocketeer:'🚀 Ракетчик',spawner:'🥚 Спавнер',enemy_shotgunner:'🔫 Дробовик-2',slug:'🐌 Слизень',trickster:'🎭 Трикстер',spider:'🕷 Паук',chariot:'🛞 Колесница',ninja:'🥷 Ниндзя',fortifier:'🛡 ФОРТИФИКАТОР',worm:'🪱 Червь',mortar:'💣 Мортирщик',illusionist:'🎭 Иллюзионист',illusion_copy:'👤 Копия',wallbreaker:'🧱 Стенобитник',verkhushka:'🥕 Вершки-корешки',chess_horse:'♞ Конь',chess_elephant:'♝ Слон',cheerful:'😄 Весельчак',ufo:'🛸 НЛО',green_alien:'👽 Человечек',hothead:'🤸 Горячая голова',cow:'🐄 Корова',unknown:'❓ Неизвестно'
};
const MEDKIT_CHANCE={tank:0.40,chariot:0.35,spawner:0.25,trickster:0.20,rocketeer:0.20,bomber:0.15,sniper_enemy:0.15,ninja:0.15,spider:0.12,fortifier:0.15,worm:0.15,mortar:0.20,illusionist:0.20,wallbreaker:0.15,chess_horse:0.15,chess_elephant:0.15,cheerful:0.20,ufo:0.20,green_alien:0.10,hothead:0.15};
const ARMOR_CHANCE={human:0.20,robot:0.30,runner:0.15,gunner:0.25,shotgunner:0.25,tank:0.5,fortifier:0.3,worm:0.25,wallbreaker:0.25,mortar:0.25,ninja:0.2,chariot:0.4,bomber:0.2,spitter:0.2,shooter:0.2,rocketeer:0.25,sniper_enemy:0.2,enemy_shotgunner:0.25,illusionist:0.2,illusion_copy:0.05,slug:0.1,spider:0.1,trickster:0.2,chess_horse:0.2,chess_elephant:0.2,cheerful:0.15,ufo:0.2,green_alien:0.15,hothead:0.2};
const TRICK_MSGS=['ХА-ХА-ХА!','ОЙ!','НЕ ТУДА!','ХАОС!','ЛОЛ','КЕК','ЧТО ЗА?!','А?','WTF','БРО...','НЕТ!','О НЕТ!','ХЕ-ХЕ','ОЙ-ОЙ','АХАХА','НЕТ БРО','ЗАЧЕМ?!','Э...','ХМММ','ОП!'];