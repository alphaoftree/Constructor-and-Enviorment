import React, { useState, useMemo, useEffect } from 'react';

// ===== 地形定义 =====
const TERRAIN = {
  hill:   { name: '丘陵',   line: 'hill',   tier: 1, color: '#8a7348', climate: 2 },
  mount:  { name: '山地',   line: 'hill',   tier: 2, color: '#6e5c38', climate: 2 },
  snow:   { name: '雪山',   line: 'hill',   tier: 3, color: '#d4d0c4', climate: 1 },
  forest:   { name: '森林', line: 'forest', tier: 1, color: '#4a6b38', climate: 2 },
  deepwood: { name: '密林', line: 'forest', tier: 2, color: '#355024', climate: 2 },
  ancient:  { name: '古木林',line:'forest', tier: 3, color: '#1f3a14', climate: 2 },
  marsh: { name: '湿地',    line: 'water',  tier: 1, color: '#5a7a6a', climate: 3 },
  river: { name: '河流',    line: 'water',  tier: 2, color: '#3a6a8a', climate: 3 },
  lake:  { name: '大江湖泊',line:'water',   tier: 3, color: '#2a5a8f', climate: 3 },
  plain: { name: '平原',    line: 'plain',  tier: 1, color: '#a89858', climate: 3 },
  rich:  { name: '沃土',    line: 'plain',  tier: 2, color: '#8a7838', climate: 3 },
  black: { name: '黑土',    line: 'plain',  tier: 3, color: '#5a4820', climate: 3 },
  grass: { name: '草原',    line: 'grass',  tier: 1, color: '#9aa858', climate: 4 },
  hillgrass:{name:'丘草原', line:'grass',   tier: 2, color: '#8a9a48', climate: 4 },
  meadow: { name: '牧野',   line: 'grass',  tier: 3, color: '#7a8a38', climate: 4 },
  tundra: { name: '冻原',   line: 'cold',   tier: 1, color: '#a8b8c8', climate: 1 },
  ice:    { name: '冰原',   line: 'cold',   tier: 2, color: '#c8d8e8', climate: 1 },
  frozen: { name: '极寒',   line: 'cold',   tier: 3, color: '#e8f0f8', climate: 1 },
  // 荒地线（覆盖所有温度，荒废状态）
  barren:   { name: '荒地',   line: 'barren', tier: 1, color: '#7a6e5a', climate: 0 },
  barrenhill:{ name: '荒丘', line: 'barren', tier: 2, color: '#6a5e4a', climate: 0 },
  barrenmtn: { name: '荒山', line: 'barren', tier: 3, color: '#5a4e3a', climate: 0 },
  // 空地
  empty:  { name: '空地',   line: 'empty',  tier: 0, color: '#3a3528', climate: 0 },
};

const LINE_NAMES = {
  hill: '丘陵线', forest: '森林线', water: '水域线',
  plain: '平原线', grass: '草原线', cold: '寒冷线',
  barren: '荒地线',
};

const CLIMATE_NAMES = {
  0: '无',
  1: '寒冷',
  2: '中冷',
  3: '中暖',
  4: '炎热',
};

const TIER_WEIGHT = { 0: 0, 1: 1, 2: 3, 3: 9 };

const LEVEL_COLOR = {
  粗浅: '#c9a961',  // 暖金
  严肃: '#7a9ab5',  // 灰蓝
  深刻: '#b07a9a',  // 烟紫
};

const MAP_W = 16;
const MAP_H = 11;

// 钻石布局（仿 CitySim WorldMapView），左右各留1列
const CITIES = [
  { id: 'A', name: '粮木城', x: 10, y: 2 },
  { id: 'B', name: '药木城', x: 5,  y: 2 },
  { id: 'C', name: '铁工城', x: 2,  y: 5 },
  { id: 'D', name: '云港城', x: 10, y: 8 },
  { id: 'E', name: '灰谷城', x: 5,  y: 8 },
  { id: 'F', name: '碧潮城', x: 13, y: 5 },
];

const getCityArea = (city) => {
  const area = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = city.x + dx, y = city.y + dy;
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) area.push([x, y]);
    }
  }
  return area;
};
const cellInCity = (x, y, city) => getCityArea(city).some(([cx, cy]) => cx === x && cy === y);

// ===== 资源 =====
const RES_KEYS = ['粮食','木材','石头','肉食','皮革','衣服','铁','工具','药草','魔晶','宝石','古董'];
const RES_ICON = {
  粮食:'🌾', 木材:'🪵', 石头:'🪨', 肉食:'🥩', 皮革:'🧵', 衣服:'👕',
  铁:'⛏️', 工具:'🔧', 药草:'🌿', 魔晶:'💎', 宝石:'💠', 古董:'📜',
};

// ===== 人口消耗（每人每回合） =====
const POP_NEEDS = {
  粗浅: { 粮食: 0.1, 木材: 0.03 },
  严肃: { 粮食: 0.2, 木材: 0.06, 肉食: 0.2, 工具: 0.03 },
  深刻: { 粮食: 0.4, 木材: 0.12, 肉食: 0.4, 工具: 0.06, 衣服: 0.12, 药草: 0.12 },
};

// ===== 商店 =====
const SHOP_VALUES = {
  粮食:1, 木材:1.2, 石头:1.3, 肉食:1.5, 药草:2, 宝石:2, 古董:3,
  皮革:3, 衣服:5, 铁:4, 工具:6, 魔晶:10,
};
const SHOP_NO_SELL = ['魔晶'];
const SHOP_NO_BUY  = ['宝石','古董'];

// ===== 生产建筑 =====
// 字段：id/name/tier(占哪档人口)/popCost/output/input?/cost(建造资源)/terrain?+need?(地形需求)/line/grade
const BUILDINGS = [
  // 粮食（粗浅）
  { id:'farm',   name:'农田',     tier:'粗浅', popCost:5,  output:{ 粮食:6 },  cost:{ 木材:2 },                   terrain:'plain',  need:3, line:'粮食', grade:1 },
  { id:'farm2',  name:'大农场',   tier:'粗浅', popCost:10, output:{ 粮食:14 }, cost:{ 木材:12, 石头:4 },          terrain:'rich',   need:2, line:'粮食', grade:2 },
  { id:'farm3',  name:'神佑农场', tier:'粗浅', popCost:25, output:{ 粮食:42 }, cost:{ 木材:48, 石头:24, 铁:8 },   terrain:'black',  need:1, line:'粮食', grade:3 },
  // 木材（粗浅）
  { id:'wood',   name:'伐木场',   tier:'粗浅', popCost:5,  output:{ 木材:4 },  cost:{ 木材:2 },                   terrain:'forest',  need:3, line:'木材', grade:1 },
  { id:'wood2',  name:'锯木厂',   tier:'粗浅', popCost:10, output:{ 木材:8 },  cost:{ 木材:8, 石头:4 },           terrain:'deepwood',need:2, line:'木材', grade:2 },
  { id:'wood3',  name:'古木坊',   tier:'粗浅', popCost:25, output:{ 木材:22 }, cost:{ 木材:36, 石头:24, 铁:8 },   terrain:'ancient', need:1, line:'木材', grade:3 },
  // 石头（粗浅）
  { id:'stone',  name:'采石场',   tier:'粗浅', popCost:5,  output:{ 石头:2 },  cost:{ 木材:3 },                   terrain:'hill',   need:3, line:'石头', grade:1 },
  { id:'stone2', name:'石料厂',   tier:'粗浅', popCost:10, output:{ 石头:6 },  cost:{ 木材:10, 石头:4 },          terrain:'mount',  need:2, line:'石头', grade:2 },
  { id:'stone3', name:'大石场',   tier:'粗浅', popCost:25, output:{ 石头:20 }, cost:{ 木材:36, 石头:24, 铁:8 },   terrain:'snow',   need:1, line:'石头', grade:3 },
  // 肉（猎人线，副产皮革）
  { id:'meat',   name:'猎人小屋', tier:'粗浅', popCost:5,  output:{ 肉食:1, 皮革:1 },  cost:{ 木材:3 },                   terrain:'grass',     need:3, line:'肉', grade:1 },
  { id:'meat2',  name:'牧场',     tier:'粗浅', popCost:10, output:{ 肉食:2, 皮革:3 },  cost:{ 木材:16, 石头:4 },          terrain:'hillgrass', need:2, line:'肉', grade:2 },
  { id:'meat3',  name:'牧野庄园', tier:'粗浅', popCost:25, output:{ 肉食:5, 皮革:10 }, cost:{ 木材:72, 石头:24, 铁:8 },   terrain:'meadow',    need:1, line:'肉', grade:3 },
  // 渔（产肉食）
  { id:'fish',   name:'渔场',     tier:'粗浅', popCost:5,  output:{ 肉食:3 },  cost:{ 木材:3 },                   terrain:'marsh', need:3, line:'渔', grade:1 },
  { id:'fish2',  name:'大渔场',   tier:'粗浅', popCost:10, output:{ 肉食:9 },  cost:{ 木材:16, 石头:4 },          terrain:'river', need:2, line:'渔', grade:2 },
  { id:'fish3',  name:'海港',     tier:'粗浅', popCost:25, output:{ 肉食:30 }, cost:{ 木材:72, 石头:24, 铁:8 },   terrain:'lake',  need:1, line:'渔', grade:3 },
  // 铁（严肃，二三档 共丘陵线）
  { id:'iron2',  name:'矿场',     tier:'严肃', popCost:8,  output:{ 铁:9 },   cost:{ 木材:16, 石头:8 },           terrain:'mount', need:2, line:'铁', grade:2 },
  { id:'iron3',  name:'深矿',     tier:'严肃', popCost:15, output:{ 铁:30 },  cost:{ 木材:72, 石头:48, 铁:16 },   terrain:'snow',  need:1, line:'铁', grade:3 },
  // 工具（严肃，加工无地形）
  { id:'tool2',  name:'工坊',     tier:'严肃', popCost:8,  output:{ 工具:6 },  input:{ 铁:3 },   cost:{ 木材:6, 石头:10 },                    line:'工具', grade:2 },
  { id:'tool3',  name:'铸造厂',   tier:'严肃', popCost:15, output:{ 工具:20 }, input:{ 铁:10 },  cost:{ 木材:30, 石头:30, 铁:10 },            line:'工具', grade:3 },
  // 药草（严肃，共用森林线 tier 2/3）
  { id:'herb2',  name:'药草园',   tier:'严肃', popCost:8,  output:{ 药草:6 },  cost:{ 木材:8, 石头:4 },                terrain:'deepwood', need:2, line:'药草', grade:2 },
  { id:'herb3',  name:'药剂工坊', tier:'严肃', popCost:15, output:{ 药草:20 }, cost:{ 木材:36, 石头:24, 铁:8 },        terrain:'ancient',  need:1, line:'药草', grade:3 },
  // 衣服（深刻，加工无地形）
  { id:'cloth2', name:'裁缝铺',   tier:'深刻', popCost:8,  output:{ 衣服:2 },  input:{ 皮革:3 },   cost:{ 木材:16, 石头:4 },                  line:'衣服', grade:2 },
  { id:'cloth3', name:'制衣车间', tier:'深刻', popCost:15, output:{ 衣服:10 }, input:{ 皮革:15 },  cost:{ 木材:72, 石头:24, 铁:8 },           line:'衣服', grade:3 },
  // 魔晶（深刻，加工无地形）
  { id:'crys3',  name:'炼金塔', tier:'深刻', popCost:25, output:{ 魔晶:20 }, input:{ 铁:20, 药草:30 },  cost:{ 木材:90, 石头:200, 铁:60 },            line:'魔晶', grade:3 },
];

// ===== 功能建筑 =====
const FUNC_BUILDINGS = [
  { id:'housing1', name:'粗浅住房', tier:null, popCost:0, effect:'粗浅住房', cost:{ 木材:3 },                    housing:8, housingTier:'粗浅' },
  { id:'housing2', name:'严肃住房', tier:null, popCost:0, effect:'严肃住房', cost:{ 木材:6, 石头:4 },            housing:5, housingTier:'严肃' },
  { id:'housing3', name:'深刻住房', tier:null, popCost:0, effect:'深刻住房', cost:{ 木材:10, 石头:6, 铁:4 },     housing:3, housingTier:'深刻' },
  { id:'wall',    name:'围墙',   tier:null,   popCost:0, effect:'防御+15%',  cost:{ 木材:6 } },
  { id:'well',    name:'水井',   tier:null,   popCost:0, effect:'灭火/浇水', cost:{ 木材:2 } },
  { id:'granary', name:'粮仓',   tier:null,   popCost:0, effect:'粮食存储+20', cost:{ 木材:4 } },
  { id:'clinic',  name:'诊所',   tier:'严肃', popCost:2, effect:'治疗+20%',  cost:{ 木材:4, 工具:1 } },
  { id:'hospital',name:'医院',   tier:'严肃', popCost:5, effect:'治疗+40%',  cost:{ 木材:8, 铁:3 } },
  { id:'train',   name:'训练场', tier:null,   popCost:0, effect:'训练×2',    cost:{ 木材:4 } },
  { id:'library', name:'图书馆', tier:null,   popCost:0, effect:'研究+1/回合', cost:{ 木材:16, 石头:8 } },
  { id:'castle',  name:'城堡',   tier:'深刻', popCost:8, effect:'粗浅上限+6 防御+30%', cost:{ 木材:15, 铁:10 }, housing:6 },
  { id:'mage',    name:'魔法塔', tier:'深刻', popCost:12, effect:'🏆 胜利条件', cost:{ 木材:120, 铁:60, 工具:60, 魔晶:200 } },
];

// ===== 初始数值 =====
const INIT_RES = { 粮食:33, 木材:33, 石头:20, 肉食:33, 皮革:16, 衣服:8, 铁:16, 工具:16, 药草:16, 魔晶:1, 宝石:0, 古董:0 };
const INIT_POP = { 粗浅:8, 严肃:0, 深刻:0 };
const INIT_HOUSING_COUNT = { A:2, B:1, C:1, D:1, E:1, F:1 }; // 粮木城起手2座粗浅住房，其余1座
const HAPPY_DOWN = 40;   // 需求不满每回合减幸福度
const HAPPY_UP   = 20;   // 需求满足每回合回幸福度
const POP_DECLINE = 4;   // 幸福=0时人口减少
const GROW_PER_HOUSING = 4; // 每座住房幸福>0时每回合涨人数

// ===== 扩城参数 =====
const EXTEND_COST = { 工具:3, 粮食:20 };
const EXTEND_CELLS = 3;

// ===== 神力（抽卡）=====
const MANA_INIT = 3;
const MANA_PER_TURN = 1;
const MANA_PER_BATCH = 3;

// 简化柏林噪声：生成平滑的2D值场
// 通过几个随机锚点+距离插值模拟
const makeNoiseField = (numAnchors = 8, smoothness = 1.5) => {
  const field = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  const anchors = [];
  for (let i = 0; i < numAnchors; i++) {
    anchors.push({
      x: Math.random() * MAP_W,
      y: Math.random() * MAP_H,
      value: Math.random(),
    });
  }
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let weightSum = 0;
      let valSum = 0;
      for (const a of anchors) {
        const d = Math.sqrt((x - a.x) ** 2 + (y - a.y) ** 2) + 0.3;
        const w = 1 / Math.pow(d, smoothness);
        weightSum += w;
        valSum += w * a.value;
      }
      field[y][x] = valSum / weightSum + (Math.random() - 0.5) * 0.15;
    }
  }
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (field[y][x] < min) min = field[y][x];
    if (field[y][x] > max) max = field[y][x];
  }
  const range = max - min || 1;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    field[y][x] = (field[y][x] - min) / range;
  }
  return field;
};

const makeInitialMap = () => {
  const m = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('empty'));

  const tempNoise = makeNoiseField(8, 1.5);
  const temp = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      temp[y][x] = 0.55 * (y / (MAP_H - 1)) + 0.45 * tempNoise[y][x];
    }
  }
  const elev = makeNoiseField(6, 1.8);
  const humid = makeNoiseField(7, 1.5);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = temp[y][x];
      const e = elev[y][x];
      const h = humid[y][x];

      // 先正常按温度海拔湿度生成地形
      let terrain = 'plain';

      // 高海拔
      if (e > 0.7) {
        terrain = t < 0.35 ? 'tundra' : 'hill';
      } else if (e > 0.55) {
        // 中高海拔
        if (t < 0.3) terrain = 'tundra';
        else if (h > 0.5) terrain = 'forest';
        else terrain = 'hill';
      } else if (h > 0.65 && e < 0.4) {
        // 高湿度+低海拔 → 水域
        terrain = 'marsh';
      } else if (t < 0.2) {
        terrain = 'tundra';
      } else if (t < 0.35) {
        terrain = h > 0.5 ? 'forest' : 'plain';
      } else if (t < 0.55) {
        if (h > 0.55) terrain = 'forest';
        else if (h > 0.35) terrain = 'plain';
        else terrain = 'grass';
      } else if (t < 0.75) {
        if (h > 0.6) terrain = 'marsh';
        else if (h > 0.4) terrain = 'plain';
        else terrain = 'grass';
      } else {
        if (h > 0.55) terrain = 'forest';
        else if (h > 0.35) terrain = 'grass';
        else terrain = 'plain';
      }

      m[y][x] = terrain;
    }
  }

  const nonCityCells = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!CITIES.some(c => c.x === x && c.y === y)) nonCityCells.push([x, y]);
    }
  }
  const barrenCount = Math.round(nonCityCells.length * 0.6);
  const shuffled2 = nonCityCells.sort(() => Math.random() - 0.5);
  for (let i = 0; i < barrenCount; i++) {
    const [x, y] = shuffled2[i];
    m[y][x] = 'barren';
  }

  return m;
};

const SHAPES = {
  // 由字形：3×2方块+下方出头1格，共7格
  //  XXX
  //  XXX
  //  .X.
  you: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]],
};
// 卡片模板：同类地形连成片，按形状的空间位置分组
// line: 左3 + 右4 或 左4 + 右3
// bigL: 竖臂4格 + 横臂3格
// bigT: 横梁5格 + 竖柱2格
// hook: 横段3格 + 拐弯段4格
// block: 上排3格 + 左下4格
// fat:  左上4格 + 右下3格
// 卡片生成
const SHAPE_KEYS = Object.keys(SHAPES);
const BASE_TERRAINS = ['plain', 'forest', 'hill', 'grass', 'marsh', 'tundra'];
const HAND_SIZE = 5;

let cardCounter = Date.now();
const generateCard = () => {
  const shapeKey = 'you';
  const twoColorSplits = [
    [[0,1,2],[3,4,5,6]],
    [[0,1,2,3],[4,5,6]],
  ];
  const threeColorSplits = [
    [[0,1],[2,5],[3,4,6]],
    [[0,3],[1,2,5],[4,6]],
  ];

  // 选地形时保证气候不冲突（差<2）
  const pickCompatibleTypes = (count) => {
    const pool = [...BASE_TERRAINS];
    const first = pool[Math.floor(Math.random() * pool.length)];
    const firstClimate = TERRAIN[first].climate;
    const compatible = pool.filter(t => t !== first && Math.abs(TERRAIN[t].climate - firstClimate) < 2);
    if (count === 2) {
      if (compatible.length === 0) return [first, first];
      const second = compatible[Math.floor(Math.random() * compatible.length)];
      return [first, second];
    }
    // 3种：第二种要和第一种兼容，第三种要和前两种都兼容
    if (compatible.length === 0) return [first, first, first];
    const second = compatible[Math.floor(Math.random() * compatible.length)];
    const secondClimate = TERRAIN[second].climate;
    const compatible2 = compatible.filter(t => t !== second && Math.abs(TERRAIN[t].climate - secondClimate) < 2);
    if (compatible2.length === 0) return [first, second, first];
    const third = compatible2[Math.floor(Math.random() * compatible2.length)];
    return [first, second, third];
  };

  const numTypes = Math.random() < 0.5 ? 2 : 3;
  const types = pickCompatibleTypes(numTypes);
  const terrains = Array(7).fill('');

  if (numTypes === 2) {
    const split = twoColorSplits[Math.floor(Math.random() * twoColorSplits.length)];
    for (const idx of split[0]) terrains[idx] = types[0];
    for (const idx of split[1]) terrains[idx] = types[1];
  } else {
    const split = threeColorSplits[Math.floor(Math.random() * threeColorSplits.length)];
    for (const idx of split[0]) terrains[idx] = types[0];
    for (const idx of split[1]) terrains[idx] = types[1];
    for (const idx of split[2]) terrains[idx] = types[2];
  }

  const nameStr = [...new Set(types)].map(t => TERRAIN[t].name).join('+');
  cardCounter++;
  return { id: `gen_${cardCounter}_${Math.random().toString(36).slice(2,8)}`, shape: shapeKey, terrains, name: nameStr };
};

const generateHand = () => Array.from({ length: HAND_SIZE }, () => generateCard());

const rotateShape = (coords, times = 1) => {
  let r = coords;
  for (let i = 0; i < times; i++) r = r.map(([x, y]) => [-y, x]);
  const mx = Math.min(...r.map(c => c[0])), my = Math.min(...r.map(c => c[1]));
  return r.map(([x, y]) => [x - mx, y - my]);
};

// 统计城市辖区内某具体地形类型的格子数
const cityTerrainValue = (map, city, terrainKey) => {
  let count = 0;
  for (const [x, y] of getCityArea(city)) {
    if (map[y][x] === terrainKey) count += 1;
  }
  return count;
};

// 统计某条线所有地形的权重和（用于城市面板总览显示）
const cityLineValue = (map, city, line) => {
  let v = 0;
  for (const [x, y] of getCityArea(city)) {
    const t = TERRAIN[map[y][x]];
    if (t.line === line) v += TIER_WEIGHT[t.tier] || 0;
  }
  return v;
};

const getClimateConflicts = (map) => {
  const conflicts = [];
  const citySet = new Set(CITIES.map(c => `${c.x},${c.y}`));
  for (let y = 0; y < MAP_H; y++) {
    if (!map[y]) continue;
    for (let x = 0; x < MAP_W; x++) {
      if (citySet.has(`${x},${y}`)) continue;
      const t = TERRAIN[map[y][x]];
      if (!t || t.climate === 0) continue;
      for (const [dx, dy] of [[1,0],[0,1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= MAP_W || ny >= MAP_H) continue;
        if (citySet.has(`${nx},${ny}`)) continue;
        if (!map[ny]) continue;
        const nt = TERRAIN[map[ny][nx]];
        if (!nt || nt.climate === 0) continue;
        if (Math.abs(t.climate - nt.climate) >= 2) conflicts.push({ x, y, nx, ny });
      }
    }
  }
  return conflicts;
};

// 找所有可升级的连通区域
// 一个 line 的同一大片（tier N + N+1 相连）视为一个 patch：
//   maxUpgrades = floor(patchSize / 3)，canUpgrade = maxUpgrades - 已升数
// 返回：[{ key, line, startTier, cells: 可选L(N)格, higherCells: 已升L(N+1)格, totalSize, higherCount, canUpgrade }, ...]
const findUpgradableRegions = (map) => {
  const conflictCells = new Set();
  const citySet = new Set(CITIES.map(c => `${c.x},${c.y}`));
  for (let y = 0; y < MAP_H; y++) {
    if (!map[y]) continue;
    for (let x = 0; x < MAP_W; x++) {
      if (citySet.has(`${x},${y}`)) continue;
      const t = TERRAIN[map[y][x]];
      if (!t || t.climate === 0) continue;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        if (citySet.has(`${nx},${ny}`)) continue;
        if (!map[ny]) continue;
        const nt = TERRAIN[map[ny][nx]];
        if (!nt || nt.climate === 0) continue;
        if (Math.abs(t.climate - nt.climate) >= 2) {
          conflictCells.add(`${x},${y}`);
          break;
        }
      }
    }
  }

  const regions = [];

  for (const startTier of [1, 2]) {
    const visited = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (visited[y][x]) continue;
        const key = map[y][x];
        const t = TERRAIN[key];
        if (t.tier !== startTier) continue;
        if (t.line === 'barren' || t.line === 'empty') continue;
        if (citySet.has(`${x},${y}`)) continue;
        if (conflictCells.has(`${x},${y}`)) continue;

        const line = t.line;
        const cellsByTier = { 1: [], 2: [], 3: [] };
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cx >= MAP_W || cy < 0 || cy >= MAP_H) continue;
          if (visited[cy][cx]) continue;
          if (conflictCells.has(`${cx},${cy}`)) continue;

          if (citySet.has(`${cx},${cy}`)) {
            visited[cy][cx] = true;
            stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
            continue;
          }

          const ct = TERRAIN[map[cy][cx]];
          if (ct.line !== line) continue;
          if (ct.tier !== 1 && ct.tier !== 2 && ct.tier !== 3) continue;

          visited[cy][cx] = true;
          cellsByTier[ct.tier].push([cx, cy]);
          stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
        }

        const totalSize = cellsByTier[1].length + cellsByTier[2].length + cellsByTier[3].length;
        let maxUpgrades, higherCount, lowCells, higherCells;
        if (startTier === 1) {
          lowCells = cellsByTier[1];
          higherCells = [...cellsByTier[2], ...cellsByTier[3]];
          maxUpgrades = Math.floor(totalSize / 3);
          higherCount = higherCells.length;
        } else { // startTier === 2
          lowCells = cellsByTier[2];
          higherCells = cellsByTier[3];
          maxUpgrades = Math.floor(totalSize / 9);
          higherCount = higherCells.length;
        }
        const canUpgrade = Math.max(0, maxUpgrades - higherCount);

        if (lowCells.length > 0 && maxUpgrades >= 1) {
          regions.push({
            key, line, startTier,
            cells: lowCells,
            higherCells,
            totalSize,
            higherCount,
            maxUpgrades,
            canUpgrade,
            tierCounts: { 1: cellsByTier[1].length, 2: cellsByTier[2].length, 3: cellsByTier[3].length },
          });
        }
      }
    }
  }
  return regions;
};

const upgradeTarget = (key) => {
  const t = TERRAIN[key];
  for (const [k, v] of Object.entries(TERRAIN)) {
    if (v.line === t.line && v.tier === t.tier + 1) return k;
  }
  return null;
};

const terrainKeyOf = (line, tier) => {
  for (const [k, v] of Object.entries(TERRAIN)) {
    if (v.line === line && v.tier === tier) return k;
  }
  return null;
};

// 一座城的人口占用（只计算未禁用的生产建筑+功能建筑有 tier 的）
const calcCityPopUsage = (bldsOfCity) => {
  const u = { 粗浅: 0, 严肃: 0, 深刻: 0 };
  for (const b of bldsOfCity) {
    if (b.disabled) continue;
    if (b.tier && b.popCost) u[b.tier] += b.popCost;
  }
  return u;
};

// 扩展后的城市格子（原3×3 + 玩家扩展格）
const getCityCellsFull = (city, extension) => {
  const cells = getCityArea(city).slice();
  const seen = new Set(cells.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of (extension || [])) {
    const k = `${x},${y}`;
    if (!seen.has(k)) { cells.push([x, y]); seen.add(k); }
  }
  return cells;
};

// 数城市辖区（含扩展）里某种地形的格子数；conflictSet 里的格子（气候冲突）不计
const cityTerrainCountFull = (map, city, extension, terrainKey, conflictSet) => {
  let count = 0;
  for (const [x, y] of getCityCellsFull(city, extension)) {
    if (conflictSet && conflictSet.has(`${x},${y}`)) continue;
    if (map[y][x] === terrainKey) count += 1;
  }
  return count;
};

// 按"相同地形平均分配"计算一座建筑拿到的地形值
// 同城里所有启用的、需要同种地形的建筑一起分母
const buildingTerrainShare = (map, city, extension, bldsOfCity, building, conflictSet) => {
  if (!building.terrain) return Infinity; // 加工建筑不需要地形
  const total = cityTerrainCountFull(map, city, extension, building.terrain, conflictSet);
  const sameTerrainCount = bldsOfCity.filter(b => !b.disabled && b.terrain === building.terrain).length || 1;
  return total / sameTerrainCount;
};

// 根据地形值判产能档（100 / 25 / 0）
const productionRate = (share, need) => {
  if (need == null) return 1;
  if (share >= need) return 1;
  if (share > 0) return 0.25;
  return 0;
};

const INIT_CITY_BUILDINGS = () => {
  const out = {};
  for (const c of CITIES) {
    const n = INIT_HOUSING_COUNT[c.id] || 1;
    const h1 = FUNC_BUILDINGS.find(f => f.id === 'housing1');
    const blds = [];
    let popLeft = INIT_POP['粗浅'];
    for (let i = 0; i < n; i++) {
      const residents = Math.max(0, Math.min(h1.housing, popLeft));
      popLeft -= residents;
      blds.push({ ...h1, residents });
    }
    out[c.id] = blds;
  }
  return out;
};
const INIT_POP_PER_CITY = () => Object.fromEntries(CITIES.map(c => [c.id, { ...INIT_POP }]));
const INIT_HAPPY = () => Object.fromEntries(CITIES.map(c => [c.id, { 粗浅: 100, 严肃: 100, 深刻: 100 }]));
const INIT_HOMELESS = () => Object.fromEntries(CITIES.map(c => [c.id, { 粗浅: 0, 严肃: 0, 深刻: 0 }]));

export default function Demo() {
  const [map, setMap] = useState(makeInitialMap);
  // 地图尺寸变化时（HMR 后状态不匹配新 MAP_W/MAP_H）自动重建
  useEffect(() => {
    if (!map || map.length !== MAP_H || !map[0] || map[0].length !== MAP_W) {
      setMap(makeInitialMap());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [mapHistory, setMapHistory] = useState([]);
  const [hand, setHand] = useState(() => []);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [hoverCell, setHoverCell] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState('A');
  const [cityBuildings, setCityBuildings] = useState(INIT_CITY_BUILDINGS);
  const [cityExtensions, setCityExtensions] = useState(() => Object.fromEntries(CITIES.map(c => [c.id, []])));
  const [resources, setResources] = useState(() => ({ ...INIT_RES }));
  // 每城每档人口
  const [population, setPopulation] = useState(INIT_POP_PER_CITY);
  const [happiness, setHappiness] = useState(INIT_HAPPY);
  const [homeless, setHomeless]   = useState(INIT_HOMELESS);
  const [research, setResearch] = useState(0);
  const [unlockedBlds, setUnlockedBlds] = useState(() => new Set());
  const [mana, setMana] = useState(MANA_INIT);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState(['游戏开始。选择手牌放置地形，然后在右侧城市面板建造建筑。']);

  const selectedCard = hand.find(c => c.id === selectedCardId);
  const addLog = (msg) => setLog(prev => [msg, ...prev].slice(0, 20));

  const previewCells = useMemo(() => {
    if (!selectedCard || !hoverCell) return [];
    const shape = rotateShape(SHAPES[selectedCard.shape], rotation);
    // 计算形状中心点，让鼠标在正中
    const centerX = Math.round((Math.min(...shape.map(c => c[0])) + Math.max(...shape.map(c => c[0]))) / 2);
    const centerY = Math.round((Math.min(...shape.map(c => c[1])) + Math.max(...shape.map(c => c[1]))) / 2);
    return shape.map(([dx, dy], i) => ({
      x: hoverCell.x + dx - centerX,
      y: hoverCell.y + dy - centerY,
      terrain: selectedCard.terrains[i],
    })).filter(c =>
      c.x >= 0 && c.x < MAP_W && c.y >= 0 && c.y < MAP_H &&
      !CITIES.some(city => city.x === c.x && city.y === c.y)
    );
  }, [selectedCard, hoverCell, rotation]);

  // 只要有至少1格能放下就可以放（出界和城市中心自动跳过）
  const canPlace = selectedCard && previewCells.length > 0;

  // ===== 快照 / 撤回 =====
  const snapshot = () => ({
    map, buildings: cityBuildings, extensions: cityExtensions,
    resources, population, happiness, homeless,
    research, unlocked: new Set(unlockedBlds), hand, mana,
    freeChanges, rerollsLeft,
  });

  const handlePlace = () => {
    if (!canPlace) return;
    const newMap = map.map(row => [...row]);
    for (const { x, y, terrain } of previewCells) newMap[y][x] = terrain;
    setMapHistory([...mapHistory, snapshot()]);
    setMap(newMap);
    setHand(hand.filter(c => c.id !== selectedCardId));
    setSelectedCardId(null);
    setRotation(0);
    const skipped = 7 - previewCells.length;
    addLog(`◇ 放置：${selectedCard.name}${skipped > 0 ? `（${skipped}格跳过）` : ''}`);
  };

  const handleUndo = () => {
    if (mapHistory.length === 0) return;
    const last = mapHistory[mapHistory.length - 1];
    setMap(last.map);
    setCityBuildings(last.buildings);
    if (last.extensions) setCityExtensions(last.extensions);
    setResources(last.resources);
    if (last.population) setPopulation(last.population);
    if (last.happiness) setHappiness(last.happiness);
    if (last.homeless) setHomeless(last.homeless);
    if (typeof last.research === 'number') setResearch(last.research);
    if (last.unlocked) setUnlockedBlds(last.unlocked);
    if (last.hand) setHand(last.hand);
    if (typeof last.mana === 'number') setMana(last.mana);
    if (typeof last.freeChanges === 'number') setFreeChanges(last.freeChanges);
    if (typeof last.rerollsLeft === 'number') setRerollsLeft(last.rerollsLeft);
    setMapHistory(mapHistory.slice(0, -1));
    addLog('↶ 撤回');
  };

  // 每座城的人口占用（不是全局）
  const popUsageByCity = useMemo(() => {
    const out = {};
    for (const c of CITIES) out[c.id] = calcCityPopUsage(cityBuildings[c.id] || []);
    return out;
  }, [cityBuildings]);

  // 建造：只看资源 + 科技树；人口不足则建好后自动⏸停工
  const handleBuild = (cityId, building) => {
    // 资源够吗
    if (building.cost) {
      for (const [r, a] of Object.entries(building.cost)) {
        if ((resources[r] || 0) < a) { addLog(`⚠ ${r}不足（需${a}，当前${resources[r] || 0}）`); return; }
      }
    }
    // 科技树检查（二/三档生产建筑需要先解锁）
    if (building.grade && building.grade >= 2 && !unlockedBlds.has(building.id)) {
      addLog(`⚠ ${building.name} 未在科技树解锁`);
      return;
    }
    setMapHistory([...mapHistory, snapshot()]);
    // 扣资源
    const newRes = { ...resources };
    if (building.cost) for (const [r, a] of Object.entries(building.cost)) newRes[r] -= a;
    setResources(newRes);
    // 构造新建筑实例
    const nb = { ...building };
    if (nb.housing) nb.residents = 0;
    // 人口不够 → 自动停工
    if (nb.tier && nb.popCost) {
      const usage = popUsageByCity[cityId] || { 粗浅:0, 严肃:0, 深刻:0 };
      const free = (population[cityId][nb.tier] || 0) - (usage[nb.tier] || 0);
      if (free < nb.popCost) { nb.disabled = true; nb.autoDisabled = true; }
    }
    setCityBuildings({ ...cityBuildings, [cityId]: [...cityBuildings[cityId], nb] });
    const city = CITIES.find(c => c.id === cityId);
    addLog(nb.disabled ? `⚒ ${city.name} ${building.name}（人手不足⏸停工）` : `⚒ ${city.name} ${building.name}`);
  };

  const handleDemolish = (cityId, idx) => {
    const b = cityBuildings[cityId][idx];
    if (!b) return;
    // 住房有住客时二次确认
    if (b.housing && (b.residents || 0) > 0) {
      if (!window.confirm(`${b.name} 住有 ${b.residents} 人。拆除后将尝试迁入同档其他住房，溢出将变无家可归。确定拆除？`)) return;
    }
    setMapHistory([...mapHistory, snapshot()]);
    // 住房拆除：住户变无家可归
    if (b.housing && b.residents > 0 && b.housingTier) {
      const evicted = b.residents;
      const tier = b.housingTier;
      const otherHouses = cityBuildings[cityId]
        .map((x, i) => ({ x, i }))
        .filter(o => o.i !== idx && o.x.housing && o.x.housingTier === tier);
      // 尽量迁入其他同档空房
      const newBlds = [...cityBuildings[cityId]];
      let remaining = evicted;
      for (const { x, i } of otherHouses) {
        const free = x.housing - (x.residents || 0);
        if (free <= 0) continue;
        const take = Math.min(free, remaining);
        newBlds[i] = { ...x, residents: (x.residents || 0) + take };
        remaining -= take;
        if (remaining <= 0) break;
      }
      // 剩下的变无家可归
      if (remaining > 0) {
        setHomeless(prev => ({ ...prev, [cityId]: { ...prev[cityId], [tier]: (prev[cityId][tier] || 0) + remaining } }));
        addLog(`✗ 拆除${b.name}，${remaining}名${tier}人口无家可归`);
      }
      newBlds.splice(idx, 1);
      setCityBuildings({ ...cityBuildings, [cityId]: newBlds });
      // 人口从这个 tier 扣掉全部 evicted（无家可归继续算人口）
      setPopulation(prev => ({ ...prev, [cityId]: { ...prev[cityId], [tier]: Math.max(0, prev[cityId][tier] - 0) } })); // 人口数不变，只是改了住所
      return;
    }
    setCityBuildings({
      ...cityBuildings,
      [cityId]: cityBuildings[cityId].filter((_, i) => i !== idx)
    });
    addLog(`✗ 拆除 ${b.name}`);
  };

  // 启用/禁用（手动，不是 autoDisabled）
  const handleToggleBuilding = (cityId, idx) => {
    const t = cityBuildings[cityId][idx];
    if (!t) return;
    const newBlds = [...cityBuildings[cityId]];
    if (t.disabled) {
      if (t.tier && t.popCost > 0) {
        const usage = calcCityPopUsage(cityBuildings[cityId]);
        const free = population[cityId][t.tier] - usage[t.tier];
        if (free < t.popCost) { addLog(`⚠ ${cityId}${t.tier}人手不足，无法启用${t.name}`); return; }
      }
      newBlds[idx] = { ...t, disabled: false, autoDisabled: false };
    } else {
      newBlds[idx] = { ...t, disabled: true, autoDisabled: false };
    }
    setCityBuildings({ ...cityBuildings, [cityId]: newBlds });
  };

  // 住房升级：粗浅 → 严肃 → 深刻（residents 跟着变成新档位）
  const TIER_ORDER = ['粗浅','严肃','深刻'];

  // 住房降级：深刻 → 严肃 → 粗浅（免费，residents 继承但限容量）
  const handleDowngradeHousing = (cityId, idx) => {
    const b = cityBuildings[cityId][idx];
    if (!b || !b.housingTier) return;
    const ti = TIER_ORDER.indexOf(b.housingTier);
    if (ti <= 0) return;
    const fromTier = b.housingTier;
    const toTier = TIER_ORDER[ti - 1];
    const def = FUNC_BUILDINGS.find(f => f.housingTier === toTier);
    if (!def) return;
    setMapHistory([...mapHistory, snapshot()]);
    const keep = Math.min(b.residents || 0, def.housing);
    const overflow = Math.max(0, (b.residents || 0) - def.housing);
    const newBlds = [...cityBuildings[cityId]];
    newBlds[idx] = { ...def, residents: keep };
    setCityBuildings({ ...cityBuildings, [cityId]: newBlds });
    setPopulation(prev => ({ ...prev,
      [cityId]: { ...prev[cityId],
        [fromTier]: prev[cityId][fromTier] - (b.residents || 0),
        [toTier]: prev[cityId][toTier] + keep,
      }
    }));
    if (overflow > 0) {
      setHomeless(prev => ({ ...prev,
        [cityId]: { ...prev[cityId], [toTier]: prev[cityId][toTier] + overflow }
      }));
    }
    addLog(`⬇ ${b.residents || 0}${fromTier} → ${keep}${toTier}${overflow > 0 ? ` +${overflow}无家可归` : ''}`);
  };

  const handleUpgradeHousing = (cityId, idx) => {
    const b = cityBuildings[cityId][idx];
    if (!b || !b.housingTier) return;
    const ti = TIER_ORDER.indexOf(b.housingTier);
    if (ti >= 2) return;
    const toTier = TIER_ORDER[ti + 1];
    const def = FUNC_BUILDINGS.find(f => f.housingTier === toTier);
    if (!def) return;
    // 资源够吗
    for (const [r, a] of Object.entries(def.cost || {})) {
      if ((resources[r] || 0) < a) { addLog(`⚠ ${r}不足，无法升级`); return; }
    }
    // 住满才能升级（按 PopulationDemo 规则）
    if ((b.residents || 0) < b.housing) { addLog(`⚠ 住房未满无法升级`); return; }
    setMapHistory([...mapHistory, snapshot()]);
    const newRes = { ...resources };
    for (const [r, a] of Object.entries(def.cost || {})) newRes[r] -= a;
    setResources(newRes);
    const newBlds = [...cityBuildings[cityId]];
    newBlds[idx] = { ...def, residents: def.housing };
    setCityBuildings({ ...cityBuildings, [cityId]: newBlds });
    setPopulation(prev => ({ ...prev,
      [cityId]: { ...prev[cityId],
        [b.housingTier]: prev[cityId][b.housingTier] - b.residents,
        [toTier]: prev[cityId][toTier] + def.housing,
      }
    }));
    addLog(`⬆ ${b.residents}${b.housingTier} → ${def.housing}${toTier}（启迪）`);
  };

  // 科技树解锁
  const doUnlock = (b) => {
    const cost = b.grade === 2 ? 5 : 10;
    if (unlockedBlds.has(b.id)) return;
    if (research < cost) return;
    // 三档必须先解锁同线二档
    if (b.grade === 3) {
      const g2 = BUILDINGS.find(x => x.line === b.line && x.grade === 2);
      if (g2 && !unlockedBlds.has(g2.id)) return;
    }
    setMapHistory([...mapHistory, snapshot()]);
    setResearch(r => r - cost);
    setUnlockedBlds(prev => new Set([...prev, b.id]));
    addLog(`🔬 解锁 ${b.name}`);
  };

  // 扩城
  const handleExtendCell = (x, y) => {
    // 不能选城市中心、已属于任何城市区域（含扩展）
    if (CITIES.some(c => c.x === x && c.y === y)) return;
    for (const c of CITIES) {
      if (getCityCellsFull(c, cityExtensions[c.id]).some(([cx, cy]) => cx === x && cy === y)) return;
    }
    const pending = extendPending || [];
    const already = pending.findIndex(p => p[0] === x && p[1] === y);
    if (already >= 0) {
      const next = [...pending]; next.splice(already, 1);
      setExtendPending(next);
    } else {
      if (pending.length >= EXTEND_CELLS) return;
      setExtendPending([...pending, [x, y]]);
    }
  };
  const handleConfirmExtend = () => {
    if (!extendPending || extendPending.length === 0) return;
    // 资源够吗
    for (const [r, a] of Object.entries(EXTEND_COST)) {
      if ((resources[r] || 0) < a) { addLog(`⚠ 扩城${r}不足`); return; }
    }
    setMapHistory([...mapHistory, snapshot()]);
    const newRes = { ...resources };
    for (const [r, a] of Object.entries(EXTEND_COST)) newRes[r] -= a;
    setResources(newRes);
    setCityExtensions(prev => ({ ...prev, [extendCityId]: [...(prev[extendCityId] || []), ...extendPending] }));
    const city = CITIES.find(c => c.id === extendCityId);
    addLog(`✛ ${city.name} 扩城 ${extendPending.length} 格`);
    setExtendPending([]);
    setExtendMode(false);
  };

  // 商店
  const [shopSell, setShopSell] = useState({}); // { 资源: 数量 }
  const [shopBuy,  setShopBuy]  = useState({});
  const shopValueSell = Object.entries(shopSell).reduce((s, [r, a]) => s + (SHOP_VALUES[r] || 1) * a, 0);
  const shopValueBuy  = Object.entries(shopBuy).reduce((s, [r, a]) => s + (SHOP_VALUES[r] || 1) * a * 4, 0); // 买 4 倍
  const shopCanTrade = shopValueSell >= shopValueBuy && shopValueSell > 0;
  const handleShopExecute = () => {
    if (!shopCanTrade) return;
    setMapHistory([...mapHistory, snapshot()]);
    const newRes = { ...resources };
    for (const [r, a] of Object.entries(shopSell)) newRes[r] = (newRes[r] || 0) - a;
    for (const [r, a] of Object.entries(shopBuy))  newRes[r] = (newRes[r] || 0) + a;
    setResources(newRes);
    addLog(`⇄ 商店：卖 ${Object.entries(shopSell).map(([r,a])=>`${r}${a}`).join(' ')} 买 ${Object.entries(shopBuy).map(([r,a])=>`${r}${a}`).join(' ')}`);
    setShopSell({}); setShopBuy({});
  };

  const [upgradeMode, setUpgradeMode] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [extendMode, setExtendMode] = useState(false);
  const [extendCityId, setExtendCityId] = useState('A');
  const [extendPending, setExtendPending] = useState([]);
  const [freeChanges, setFreeChanges] = useState(2);
  const [freeChangeMode, setFreeChangeMode] = useState(false);
  const [freeChangePicking, setFreeChangePicking] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [rerollSelected, setRerollSelected] = useState(new Set());
  const [activeRegion, setActiveRegion] = useState(null);
  const [upgradeSelections, setUpgradeSelections] = useState([]);

  const upgradableRegions = useMemo(() => findUpgradableRegions(map), [map]);
  const regionMap = useMemo(() => {
    const m = {};
    upgradableRegions.forEach((r, idx) => {
      r.cells.forEach(([x, y]) => { m[`${x},${y}`] = idx; });
    });
    return m;
  }, [upgradableRegions]);

  // 点击地图格子时（升级模式）
  const handleUpgradeClick = (x, y) => {
    const regIdx = regionMap[`${x},${y}`];
    if (regIdx === undefined) {
      // 不在可升级区域
      setActiveRegion(null);
      setUpgradeSelections([]);
      return;
    }
    const region = upgradableRegions[regIdx];
    // 如果点的是新区域，重置
    if (!activeRegion || activeRegion.idx !== regIdx) {
      setActiveRegion({ idx: regIdx, ...region });
      setUpgradeSelections([]);
      return;
    }
    // 同一区域内点击：切换选中状态
    const clickedCell = [x, y];
    const already = upgradeSelections.findIndex(c => c[0] === x && c[1] === y);
    if (already >= 0) {
      const next = [...upgradeSelections];
      next.splice(already, 1);
      setUpgradeSelections(next);
    } else {
      // 最多选 canUpgrade 个
      if (upgradeSelections.length < region.canUpgrade) {
        setUpgradeSelections([...upgradeSelections, clickedCell]);
      }
    }
  };

  const handleConfirmUpgrade = () => {
    if (!activeRegion || upgradeSelections.length === 0) return;
    const target = upgradeTarget(activeRegion.key);
    if (!target) return;
    setMapHistory([...mapHistory, snapshot()]);
    const newMap = map.map(row => [...row]);
    for (const [x, y] of upgradeSelections) {
      newMap[y][x] = target;
    }
    setMap(newMap);
    addLog(`✦ 升级 ${upgradeSelections.length} 格 ${TERRAIN[activeRegion.key].name} → ${TERRAIN[target].name}`);
    setActiveRegion(null);
    setUpgradeSelections([]);
  };

  const handleNextTurn = () => {
    const newRes = { ...resources };
    const newPop = JSON.parse(JSON.stringify(population));
    const newHappy = JSON.parse(JSON.stringify(happiness));
    const newHomeless = JSON.parse(JSON.stringify(homeless));
    const allBlds = JSON.parse(JSON.stringify(cityBuildings));
    let popMsg = '';

    // 1. 先复工（人口足够则复活 autoDisabled），再随机停工（超载时）
    for (const city of CITIES) {
      for (const tier of TIER_ORDER) {
        const tierPop = newPop[city.id][tier];
        let used = allBlds[city.id]
          .filter(b => b.tier === tier && !b.disabled && !b.housing)
          .reduce((s, b) => s + (b.popCost || 0), 0);
        const autoOff = allBlds[city.id].filter(b => b.tier === tier && b.disabled && b.autoDisabled && !b.housing);
        for (const bld of autoOff) {
          if (used + (bld.popCost || 0) <= tierPop) {
            const idx = allBlds[city.id].indexOf(bld);
            if (idx >= 0) allBlds[city.id][idx] = { ...bld, disabled: false, autoDisabled: false };
            used += (bld.popCost || 0);
            popMsg += ` ${city.name}${bld.name}复工`;
          }
        }
        const live = allBlds[city.id].filter(b => b.tier === tier && !b.disabled && !b.housing);
        while (used > tierPop && live.length > 0) {
          const ri = Math.floor(Math.random() * live.length);
          const s = live.splice(ri, 1)[0];
          const idx = allBlds[city.id].indexOf(s);
          if (idx >= 0) allBlds[city.id][idx] = { ...s, disabled: true, autoDisabled: true };
          used -= (s.popCost || 0);
          popMsg += ` ${city.name}${s.name}停工`;
        }
      }
    }

    // 2. 建筑产出（按地形产能档 100/50/0；原料不够→停产）
    for (const city of CITIES) {
      for (const b of allBlds[city.id]) {
        if (b.disabled) { b.halted = false; continue; }
        // 原料
        if (b.input) {
          let enough = true;
          for (const [r, a] of Object.entries(b.input)) {
            if ((newRes[r] || 0) < a) { enough = false; break; }
          }
          if (!enough) { b.halted = true; popMsg += ` ${city.name}${b.name}原料不足停产`; continue; }
          for (const [r, a] of Object.entries(b.input)) newRes[r] -= a;
        }
        b.halted = false;
        // 地形产能档（加工建筑无地形 → 100%）
        let rate = 1;
        if (b.terrain) {
          const share = buildingTerrainShare(map, city, cityExtensions[city.id], allBlds[city.id], b, conflictSet);
          rate = productionRate(share, b.need);
        }
        if (rate === 0) continue;
        if (b.output) {
          for (const [r, a] of Object.entries(b.output)) {
            newRes[r] = (newRes[r] || 0) + Math.floor(a * rate);
          }
        }
      }
    }

    // 3. 人口消耗 + 幸福 + 增长/下降（按城市按档）
    for (const city of CITIES) {
      for (const tier of TIER_ORDER) {
        const count = newPop[city.id][tier];
        const homelessN = newHomeless[city.id][tier];
        const total = count + homelessN;
        let resMet = true;
        if (total > 0) {
          for (const [r, a] of Object.entries(POP_NEEDS[tier])) {
            if ((newRes[r] || 0) < a * total) { resMet = false; break; }
          }
          if (resMet) {
            for (const [r, a] of Object.entries(POP_NEEDS[tier])) newRes[r] -= a * total;
          } else {
            for (const [r, a] of Object.entries(POP_NEEDS[tier])) {
              const want = a * total;
              newRes[r] = Math.max(0, (newRes[r] || 0) - Math.min(newRes[r] || 0, want));
            }
          }
        } else {
          // 人口为 0：空住房想长人需要每种需求资源都够1人份，否则视作不满足
          for (const [r, a] of Object.entries(POP_NEEDS[tier])) {
            if ((newRes[r] || 0) < a) { resMet = false; break; }
          }
        }
        const hasHomeless = homelessN > 0;
        const needsMet = resMet && !hasHomeless;
        if (needsMet) {
          newHappy[city.id][tier] = Math.min(100, newHappy[city.id][tier] + HAPPY_UP);
          if (newHappy[city.id][tier] > 0) {
            let grown = 0;
            for (const b of allBlds[city.id]) {
              if (!b.housing || b.housingTier !== tier) continue;
              const cur = b.residents || 0, cap = b.housing;
              if (cur >= cap) continue;
              const g = Math.min(GROW_PER_HOUSING, cap - cur);
              b.residents = cur + g;
              grown += g;
            }
            if (grown > 0) { newPop[city.id][tier] += grown; popMsg += ` ${city.name}${tier}+${grown}`; }
          }
        } else {
          const oldH = newHappy[city.id][tier];
          newHappy[city.id][tier] = Math.max(0, oldH - HAPPY_DOWN);
          if (oldH - newHappy[city.id][tier] > 0) popMsg += ` ${city.name}${tier}幸福-${oldH - newHappy[city.id][tier]}`;
          if (newHappy[city.id][tier] === 0 && total > 0) {
            let toRemove = Math.min(POP_DECLINE, total);
            const fromH = Math.min(Math.ceil(toRemove / 2), homelessN);
            newHomeless[city.id][tier] -= fromH;
            toRemove -= fromH;
            if (toRemove > 0) {
              newPop[city.id][tier] = Math.max(0, newPop[city.id][tier] - toRemove);
              let need = toRemove;
              for (const b of allBlds[city.id]) {
                if (!b.housing || b.housingTier !== tier) continue;
                const take = Math.min(b.residents || 0, need);
                b.residents = (b.residents || 0) - take;
                need -= take;
                if (need <= 0) break;
              }
              popMsg += ` ${city.name}${tier}-${toRemove}`;
            }
          }
        }
      }
    }

    // 4. 研究点数 +3 + 每座图书馆 +1
    let libCount = 0;
    for (const c of CITIES) for (const b of allBlds[c.id]) if (b.id === 'library') libCount++;
    const researchAdd = 3 + libCount;

    setResources(newRes);
    setPopulation(newPop);
    setHappiness(newHappy);
    setHomeless(newHomeless);
    setCityBuildings(allBlds);
    setResearch(r => r + researchAdd);
    setMana(m => m + MANA_PER_TURN);
    setTurn(turn + 1);
    setMapHistory([]);
    setSelectedCardId(null); setRotation(0);
    addLog(`━ 回合 ${turn + 1}｜🔬+${researchAdd} 神力+${MANA_PER_TURN}${popMsg}`);
  };

  const handleDrawBatch = () => {
    if (mana < MANA_PER_BATCH) return;
    setMapHistory([...mapHistory, snapshot()]);
    setMana(m => m - MANA_PER_BATCH);
    setHand(generateHand());
    setSelectedCardId(null);
    setRerollSelected(new Set());
    setRerollsLeft(3);
    setFreeChanges(2); setFreeChangeMode(false); setFreeChangePicking(null);
    addLog(`🌍 世界改变（消耗 ${MANA_PER_BATCH} 神力 · 弃旧批抽新批 · 改造/重抽回满）`);
  };

  const handleRotate = () => setRotation((rotation + 1) % 4);

  const handleFreeChangeClick = (x, y) => {
    if (CITIES.some(c => c.x === x && c.y === y)) return;
    setFreeChangePicking({ x, y });
  };
  const handleFreeChangeConfirm = (terrainKey) => {
    if (!freeChangePicking || freeChanges <= 0) return;
    setMapHistory([...mapHistory, snapshot()]);
    const newMap = map.map(row => [...row]);
    newMap[freeChangePicking.y][freeChangePicking.x] = terrainKey;
    setMap(newMap);
    setFreeChanges(freeChanges - 1);
    addLog(`✎ 自由改造 (${freeChangePicking.x},${freeChangePicking.y}) → ${TERRAIN[terrainKey].name}（剩余${freeChanges - 1}次）`);
    setFreeChangePicking(null);
  };

  const handleReroll = () => {
    if (rerollsLeft <= 0 || rerollSelected.size === 0) return;
    const newHand = hand.map(card =>
      rerollSelected.has(card.id) ? generateCard() : card
    );
    setHand(newHand);
    setRerollsLeft(rerollsLeft - 1);
    setRerollSelected(new Set());
    setSelectedCardId(null);
    addLog(`⟳ 随机了${rerollSelected.size}张卡（剩余${rerollsLeft - 1}次）`);
  };

  const conflicts = useMemo(() => getClimateConflicts(map), [map]);
  const conflictSet = useMemo(() => {
    const s = new Set();
    conflicts.forEach(c => { s.add(`${c.x},${c.y}`); s.add(`${c.nx},${c.ny}`); });
    return s;
  }, [conflicts]);

  // 城市运行状态（气候冲突格子不计入可用地形）
  const cityStatus = CITIES.map(city => {
    const extension = cityExtensions[city.id] || [];
    const terrainValues = {};
    for (const key of Object.keys(TERRAIN)) {
      if (key === 'empty' || TERRAIN[key].line === 'barren') continue;
      const v = cityTerrainCountFull(map, city, extension, key, conflictSet);
      if (v > 0) terrainValues[key] = v;
    }
    const blds = cityBuildings[city.id] || [];
    const builtBuildings = blds.map(b => {
      if (!b.terrain) return { ...b, value: null, status: b.disabled ? 'disabled' : (b.halted ? 'halted' : 'ok') };
      const share = buildingTerrainShare(map, city, extension, blds, b, conflictSet);
      let status;
      if (b.disabled) status = 'disabled';
      else if (b.halted) status = 'halted';
      else if (share >= b.need) status = 'ok';
      else if (share > 0) status = 'debuff25';
      else status = 'stopped';
      return { ...b, value: share, status };
    });
    return { ...city, terrainValues, buildings: builtBuildings, extension };
  });

  const currentCityStatus = cityStatus.find(c => c.id === selectedCityId);

  // 预估下一回合资源净增量（按当前产能档）
  const netChange = useMemo(() => {
    const net = {};
    for (const city of CITIES) {
      const blds = cityBuildings[city.id] || [];
      for (const b of blds) {
        if (b.disabled) continue;
        let rate = 1;
        if (b.terrain) {
          const share = buildingTerrainShare(map, city, cityExtensions[city.id], blds, b, conflictSet);
          rate = productionRate(share, b.need);
        }
        if (rate === 0) continue;
        if (b.input) for (const [r, a] of Object.entries(b.input)) net[r] = (net[r] || 0) - a;
        if (b.output) for (const [r, a] of Object.entries(b.output)) net[r] = (net[r] || 0) + Math.floor(a * rate);
      }
    }
    // 人口消耗
    for (const c of CITIES) {
      for (const tier of TIER_ORDER) {
        const total = (population[c.id][tier] || 0) + (homeless[c.id][tier] || 0);
        if (total === 0) continue;
        for (const [r, a] of Object.entries(POP_NEEDS[tier])) net[r] = (net[r] || 0) - a * total;
      }
    }
    return net;
  }, [map, cityBuildings, population, homeless, cityExtensions]);

  // 每座城每回合净产出（用于城市选择栏展示）
  const outputPerCity = useMemo(() => {
    const out = {};
    for (const c of CITIES) {
      const o = {};
      const blds = cityBuildings[c.id] || [];
      for (const b of blds) {
        if (b.disabled) continue;
        let rate = 1;
        if (b.terrain) {
          const share = buildingTerrainShare(map, c, cityExtensions[c.id], blds, b, conflictSet);
          rate = productionRate(share, b.need);
        }
        if (rate === 0) continue;
        if (b.output) for (const [r, a] of Object.entries(b.output)) o[r] = (o[r] || 0) + Math.floor(a * rate);
      }
      out[c.id] = o;
    }
    return out;
  }, [map, cityBuildings, cityExtensions]);

  // 全局总人口
  const totalPop = useMemo(() => {
    const t = { 粗浅: 0, 严肃: 0, 深刻: 0 };
    for (const c of CITIES) for (const tier of TIER_ORDER) t[tier] += (population[c.id][tier] || 0);
    return t;
  }, [population]);

  // 图书馆数 + 研究点增速
  const libCount = useMemo(() => {
    let n = 0;
    for (const c of CITIES) for (const b of (cityBuildings[c.id] || [])) if (b.id === 'library') n++;
    return n;
  }, [cityBuildings]);
  const researchPerTurn = 3 + libCount;

  const [showHelp, setShowHelp] = useState(false);
  const [showConsumption, setShowConsumption] = useState(false);

  // 胜利判定：任何城市建成魔法塔即胜利
  const victory = useMemo(() => {
    for (const c of CITIES) {
      for (const b of (cityBuildings[c.id] || [])) {
        if (b.id === 'mage') return c;
      }
    }
    return null;
  }, [cityBuildings]);
  const [victoryAck, setVictoryAck] = useState(false);
  useEffect(() => { if (victory) setVictoryAck(false); }, [victory]);

  // 消耗汇总：每档人口每回合吃掉多少、全局总计
  const consumptionSummary = useMemo(() => {
    const perTier = { 粗浅: {}, 严肃: {}, 深刻: {} };
    const total = {};
    for (const tier of TIER_ORDER) {
      let count = 0;
      for (const c of CITIES) count += (population[c.id][tier] || 0) + (homeless[c.id][tier] || 0);
      if (count === 0) continue;
      for (const [r, a] of Object.entries(POP_NEEDS[tier])) {
        const amt = a * count;
        perTier[tier][r] = amt;
        total[r] = (total[r] || 0) + amt;
      }
    }
    return { perTier, total };
  }, [population, homeless]);

  return (
    <div style={{
      background: '#1a1812', color: '#e8dfc8',
      fontFamily: "'Noto Serif SC', 'Songti SC', serif",
      height: '100vh', padding: '12px 16px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Serif+SC:wght@400;500;600&display=swap');`}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '8px 16px', background: '#242017',
          border: '1px solid #3d3524', marginBottom: 12, gap: 6,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#c9a961', fontSize: 16, fontWeight: 600, fontFamily: "'Noto Serif SC', serif" }}>
              建设与环境 · <span style={{ color: '#9c8f72' }}>回合 {turn}</span>
            </span>
            <div style={{ display:'flex', gap: 4, alignItems:'center' }}>
            <button onClick={() => setShowHelp(true)} style={{ ...btn(false), fontSize: 14 }}>❓ 说明</button>
            <button onClick={() => setShowConsumption(true)} style={{ ...btn(false), fontSize: 14 }}>📊 消耗</button>
            <button onClick={() => {
              setMap(makeInitialMap());
              setMapHistory([]);
              setHand([]);
              setMana(MANA_INIT);
              setSelectedCardId(null);
              setRotation(0);
              setSelectedCityId('A');
              setCityBuildings(INIT_CITY_BUILDINGS());
              setCityExtensions(Object.fromEntries(CITIES.map(c => [c.id, []])));
              setResources({ ...INIT_RES });
              setPopulation(INIT_POP_PER_CITY());
              setHappiness(INIT_HAPPY());
              setHomeless(INIT_HOMELESS());
              setResearch(0);
              setUnlockedBlds(new Set());
              setTurn(1);
              setUpgradeMode(false);
              setActiveRegion(null);
              setUpgradeSelections([]);
              setFreeChanges(2);
              setFreeChangeMode(false);
              setFreeChangePicking(null);
              setRerollsLeft(3);
              setRerollSelected(new Set());
              setHoverCell(null);
              setExtendMode(false);
              setExtendPending([]);
              setShopSell({}); setShopBuy({});
              setShowShop(false); setShowTech(false); setShowHelp(false); setShowConsumption(false);
              setVictoryAck(false);
              addLog('━ 新局开始');
            }} style={{ ...btn(false), fontSize: 14 }}>重新开始</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setShowShop(true)} style={{ ...btn(false), fontSize: 14 }}>商店</button>
            <button onClick={() => setShowTech(true)} style={{ ...btn(false), fontSize: 14, background: '#7a9ab5', color: '#1a1812' }}>🔬 科技树 {research}</button>
            <span style={{ color:'#7a9ab5', fontSize: 15 }}>研究 <span style={{ color:'#7a9a4f', fontWeight:600 }}>+{researchPerTurn}</span>/回合</span>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 17, flex: 1 }}>
              {RES_KEYS.filter(k => k !== '宝石' && k !== '古董').map(k => {
                const v = resources[k] || 0;
                const delta = netChange[k] || 0;
                const deltaStr = delta > 0 ? '+' + (Math.round(delta * 10) / 10) : (Math.round(delta * 10) / 10);
                return (
                  <div key={k}>
                    <span style={{ color: '#9c8f72', marginRight: 3 }}>{RES_ICON[k]}{k}</span>
                    <span style={{ color: v <= 0 ? '#c25a3a' : '#c9a961', fontWeight: 600 }}>{v.toFixed(1)}</span>
                    <span style={{ marginLeft: 3, fontSize: 15, color: delta > 0 ? '#7a9a4f' : delta < 0 ? '#c25a3a' : '#5a5140' }}>
                      ({deltaStr})
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ width: 1, height: 24, background: '#3d3524' }} />
            <div style={{ color: '#9c8f72', fontSize: 17 }}>总人口</div>
            {TIER_ORDER.map(tier => (
              <span key={tier} style={{ color: LEVEL_COLOR[tier], fontWeight: 600, fontSize: 17 }}>
                {tier} {totalPop[tier]}
              </span>
            ))}
          </div>
        </div>

        {/* 消耗统计弹窗 */}
        {showConsumption && (() => {
          const consumptionKeys = RES_KEYS.filter(r => TIER_ORDER.some(t => POP_NEEDS[t][r]));
          return (
            <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }} onClick={() => setShowConsumption(false)}>
              <div style={{ background:'#242017', border:'1px solid #3d3524', padding:20, width:'90%', maxWidth:800, maxHeight:'85vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ color:'#c9a961', fontSize:20, fontWeight:600 }}>📊 人口消耗（每人/回合）</span>
                  <button onClick={() => setShowConsumption(false)} style={{ ...btn(false), padding:'4px 12px' }}>关闭</button>
                </div>
                <table style={{ width:'100%', fontSize:15, borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #3d3524' }}>
                      <th style={{ textAlign:'left', padding:'6px 4px', color:'#9c8f72' }}></th>
                      {consumptionKeys.map(r => (
                        <th key={r} style={{ textAlign:'right', padding:'6px 4px', color:'#9c8f72' }}>{RES_ICON[r]}{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_ORDER.map(tier => {
                      const count = totalPop[tier];
                      return (
                        <React.Fragment key={tier}>
                          <tr style={{ borderBottom:'1px solid #2b2619' }}>
                            <td style={{ padding:'4px', color: LEVEL_COLOR[tier], fontWeight:600 }}>{tier} <span style={{ color:'#9c8f72', fontWeight:400 }}>×{count}</span></td>
                            {consumptionKeys.map(r => {
                              const per = POP_NEEDS[tier][r] || 0;
                              return (
                                <td key={r} style={{ textAlign:'right', padding:'4px', color: per ? '#e8dfc8' : '#3d3524' }}>
                                  {per || '-'}
                                </td>
                              );
                            })}
                          </tr>
                          {count > 0 && (
                            <tr style={{ borderBottom:'1px solid #2b2619', background:'#1a1812' }}>
                              <td style={{ padding:'3px 4px 3px 18px', color:'#5a5140' }}>合计</td>
                              {consumptionKeys.map(r => {
                                const tot = (POP_NEEDS[tier][r] || 0) * count;
                                return (
                                  <td key={r} style={{ textAlign:'right', padding:'3px 4px', color: tot ? '#c25a3a' : '#3d3524' }}>
                                    {tot ? `-${Math.round(tot * 100) / 100}` : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <tr style={{ borderTop:'2px solid #3d3524' }}>
                      <td style={{ padding:'6px 4px', color:'#c9a961', fontWeight:600 }}>总计</td>
                      {consumptionKeys.map(r => {
                        const tot = TIER_ORDER.reduce((s, t) => s + (POP_NEEDS[t][r] || 0) * totalPop[t], 0);
                        return (
                          <td key={r} style={{ textAlign:'right', padding:'6px 4px', color: tot ? '#c25a3a' : '#3d3524', fontWeight:600 }}>
                            {tot ? `-${Math.round(tot * 100) / 100}` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* 帮助说明 */}
        {showHelp && (
          <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }} onClick={() => setShowHelp(false)}>
            <div style={{ background:'#242017', border:'1px solid #3d3524', padding:24, width:'90%', maxWidth:700, maxHeight:'85vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ color:'#c9a961', fontSize:20, fontWeight:600 }}>❓ 游戏说明</span>
                <button onClick={() => setShowHelp(false)} style={{ ...btn(false), padding:'4px 12px' }}>关闭</button>
              </div>
              <div style={{ fontSize:14, color:'#e8dfc8', lineHeight:1.7 }}>
                <p><b style={{ color: LEVEL_COLOR.粗浅 }}>粗浅</b>——基础农民，住在粗浅住房（8人/座）。种田、砍木、采石、打猎、捕鱼。需要粮食、木材。</p>
                <p><b style={{ color: LEVEL_COLOR.严肃 }}>严肃</b>——工匠阶层，需要粗浅住房升级而来（升级要住满）。打造工具、开矿、种药草。还需要肉和工具维持生活。</p>
                <p><b style={{ color: LEVEL_COLOR.深刻 }}>深刻</b>——智者阶层，由严肃继续升级。制衣、炼魔晶、搞奥秘。他们消耗是最多的（粮食×2、衣服、药草）。</p>
                <hr style={{ border:0, borderTop:'1px solid #3d3524', margin:'10px 0' }}/>
                <p><b style={{ color:'#c9a961' }}>地形值</b>——每座城 3×3 辖区（可扩展）里某种地形的格子数。<b>每种地形独立算，不跨档</b>（平原≠沃土≠黑土）。</p>
                <p><b style={{ color:'#c9a961' }}>产能档</b>——</p>
                <ul style={{ marginLeft:20, marginTop:4 }}>
                  <li>地形值 ≥ 需求 → <span style={{ color:'#7a9a4f', fontWeight:600 }}>100% 产能</span></li>
                  <li>地形值 &gt; 0 但 &lt; 需求 → <span style={{ color:'#c9a961', fontWeight:600 }}>25% 产能</span></li>
                  <li>地形值 = 0 → <span style={{ color:'#c25a3a', fontWeight:600 }}>停产</span></li>
                </ul>
                <p><b>同种地形被多座建筑共享</b>——2 座农田都要"平原 3"，城里只有 5 格平原，则每座分到 2.5 格（平均）。</p>
                <hr style={{ border:0, borderTop:'1px solid #3d3524', margin:'10px 0' }}/>
                <p><b style={{ color:'#d4a85a' }}>停产状态</b>——原料不足自动停产本回合，下回合自动恢复。</p>
                <p><b style={{ color:'#c25a3a' }}>停工状态</b>——人口不足或玩家手动禁用；人口恢复后自动复工，或玩家点"启用"恢复。</p>
                <p><b>加工建筑（工坊/裁缝铺/炼金塔等）不需要地形</b>——只要原料+人口够就满产。</p>
                <hr style={{ border:0, borderTop:'1px solid #3d3524', margin:'10px 0' }}/>
                <p><b style={{ color:'#c9a961' }}>科技树</b>——二档 5 研究点、三档 10 点；三档需先解二档。研究点每回合 +3，每座图书馆 +1。</p>
                <p><b style={{ color:'#c9a961' }}>扩城</b>——消耗 🔧3 🌾20，在辖区外选 3 格纳入领地。</p>
                <p><b style={{ color:'#c9a961' }}>胜利条件</b>——任何城建成魔法塔（🪵120 ⛏️60 🔧60 💎200）即胜利。</p>
              </div>
            </div>
          </div>
        )}

        {/* 胜利弹窗 */}
        {victory && !victoryAck && (
          <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.85)' }}>
            <div style={{ background:'#242017', border:'2px solid #c9a961', padding:40, width:'90%', maxWidth:500, textAlign:'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 28, color:'#c9a961', fontWeight:600, marginBottom:8 }}>胜利！</div>
              <div style={{ fontSize: 16, color:'#e8dfc8', marginBottom: 6 }}>{victory.name} 建成 魔法塔</div>
              <div style={{ fontSize: 14, color:'#9c8f72', marginBottom: 20 }}>回合 {turn}｜总人口 {totalPop.粗浅 + totalPop.严肃 + totalPop.深刻}</div>
              <button onClick={() => setVictoryAck(true)} style={{ ...primaryBtn, fontSize: 15, padding:'10px 30px' }}>继续游戏</button>
            </div>
          </div>
        )}

        {showShop && (
          <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }} onClick={() => { setShowShop(false); setShopSell({}); setShopBuy({}); }}>
            <div style={{ background:'#242017', border:'1px solid #3d3524', padding:20, width:'90%', maxWidth:1100, maxHeight:'85vh', display:'flex', flexDirection:'column', gap:12 }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:'#c9a961', fontSize:22, fontWeight:600 }}>🏪 资源交易所</span>
                <button onClick={() => { setShowShop(false); setShopSell({}); setShopBuy({}); }} style={{ ...btn(false), padding:'4px 12px', background:'#c25a3a', color:'#e8dfc8' }}>关闭</button>
              </div>
              <div style={{ color:'#9c8f72', fontSize:15 }}>点击左侧库存加入待售 | 点击右侧商品加入待购 | 买价=价值×4</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, flex:1, overflow:'hidden' }}>
                {/* 左：库存 */}
                <div style={{ background:'#1a1812', padding:10, border:'1px solid #3d3524', overflow:'auto' }}>
                  <div style={{ color:'#c9a961', fontWeight:600, marginBottom:6, fontSize:17 }}>📦 库存</div>
                  {RES_KEYS.filter(r => !SHOP_NO_SELL.includes(r)).map(r => {
                    const stock = resources[r] || 0;
                    const sold = shopSell[r] || 0;
                    const avail = stock - sold;
                    const miniBtn = { padding:'1px 6px', fontSize:13, background:'#3d3524', color:'#c9a961', border:'1px solid #5a5140', cursor:'pointer', fontFamily:'inherit' };
                    return (
                      <div key={r} onClick={() => avail > 0 && setShopSell(s => ({ ...s, [r]: (s[r]||0) + 1 }))} style={{ padding:'6px 8px', marginBottom:3, background:'#242017', color: avail > 0 ? '#e8dfc8' : '#5a5140', border:'1px solid #3d3524', cursor: avail > 0 ? 'pointer' : 'not-allowed', fontSize:15 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                          <span>{RES_ICON[r]} {r}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <button disabled={sold < 10} onClick={(e) => { e.stopPropagation(); setShopSell(s => ({ ...s, [r]: Math.max(0, (s[r]||0) - 10) })); }} style={{ ...miniBtn, opacity: sold < 10 ? 0.4 : 1, cursor: sold < 10 ? 'not-allowed' : 'pointer' }}>-10</button>
                            <button disabled={avail < 10} onClick={(e) => { e.stopPropagation(); setShopSell(s => ({ ...s, [r]: (s[r]||0) + 10 })); }} style={{ ...miniBtn, opacity: avail < 10 ? 0.4 : 1, cursor: avail < 10 ? 'not-allowed' : 'pointer' }}>+10</button>
                            <span><span style={{ color:'#7a9a4f' }}>{Math.floor(avail)}</span><span style={{ color:'#5a5140' }}>/{Math.floor(stock)}</span></span>
                          </div>
                        </div>
                        <div style={{ fontSize:13, color:'#9c8f72' }}>价值: {SHOP_VALUES[r]}</div>
                      </div>
                    );
                  })}
                </div>
                {/* 中：交易区 */}
                <div style={{ background:'#1a1812', padding:10, border:'1px solid #3d3524', display:'flex', flexDirection:'column' }}>
                  <div style={{ color:'#b07a9a', fontWeight:600, marginBottom:6, fontSize:17, textAlign:'center' }}>⚖️ 交易区</div>
                  <div style={{ flex:1, overflow:'auto', marginBottom:8 }}>
                    <div style={{ fontSize:14, color:'#c9a961', marginBottom:4 }}>📤 待售 (价值: {shopValueSell.toFixed(1)})</div>
                    <div style={{ minHeight:80, background:'#141008', padding:6, marginBottom:8 }}>
                      {Object.entries(shopSell).filter(([,a]) => a > 0).map(([k, a]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 6px', background:'#242017', marginBottom:2, fontSize:14 }}>
                          <span>{RES_ICON[k]} {k} ×{a}</span>
                          <button onClick={() => setShopSell(s => { const n = { ...s }; delete n[k]; return n; })} style={{ background:'none', border:'none', color:'#c25a3a', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:14, color:'#7a9ab5', marginBottom:4 }}>📥 待购 (价值: {shopValueBuy.toFixed(1)})</div>
                    <div style={{ minHeight:80, background:'#141008', padding:6 }}>
                      {Object.entries(shopBuy).filter(([,a]) => a > 0).map(([k, a]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 6px', background:'#242017', marginBottom:2, fontSize:14 }}>
                          <span>{RES_ICON[k]} {k} ×{a}</span>
                          <button onClick={() => setShopBuy(s => { const n = { ...s }; delete n[k]; return n; })} style={{ background:'none', border:'none', color:'#c25a3a', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleShopExecute} disabled={!shopCanTrade} style={{ padding:'10px', background: shopCanTrade ? '#7a9a4f' : '#2b2619', color: shopCanTrade ? '#1a1812' : '#5a5140', border:'none', fontWeight:600, fontSize:16, cursor: shopCanTrade ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
                    {shopValueSell >= shopValueBuy ? '✓ 成交' : `⚠ 价值不足 (${shopValueSell.toFixed(1)} < ${shopValueBuy.toFixed(1)})`}
                  </button>
                </div>
                {/* 右：商品 */}
                <div style={{ background:'#1a1812', padding:10, border:'1px solid #3d3524', overflow:'auto' }}>
                  <div style={{ color:'#7a9ab5', fontWeight:600, marginBottom:6, fontSize:17 }}>🛒 可购买</div>
                  {RES_KEYS.filter(r => !SHOP_NO_BUY.includes(r)).map(r => {
                    const inCart = shopBuy[r] || 0;
                    const miniBtn = { padding:'1px 6px', fontSize:13, background:'#3d3524', color:'#7a9ab5', border:'1px solid #5a5140', cursor:'pointer', fontFamily:'inherit' };
                    return (
                    <div key={r} onClick={() => setShopBuy(s => ({ ...s, [r]: (s[r]||0) + 1 }))} style={{ padding:'6px 8px', marginBottom:3, background:'#242017', color:'#e8dfc8', border:'1px solid #3d3524', cursor:'pointer', fontSize:15 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                        <span>{RES_ICON[r]} {r}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <button disabled={inCart < 10} onClick={(e) => { e.stopPropagation(); setShopBuy(s => ({ ...s, [r]: Math.max(0, (s[r]||0) - 10) })); }} style={{ ...miniBtn, opacity: inCart < 10 ? 0.4 : 1, cursor: inCart < 10 ? 'not-allowed' : 'pointer' }}>-10</button>
                          <button onClick={(e) => { e.stopPropagation(); setShopBuy(s => ({ ...s, [r]: (s[r]||0) + 10 })); }} style={miniBtn}>+10</button>
                          {inCart > 0 && <span style={{ color:'#7a9ab5' }}>×{inCart}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:13, color:'#9c8f72' }}>买价: {(SHOP_VALUES[r]*4).toFixed(1)}</div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 科技树 */}
        {showTech && (() => {
          const techBlds = BUILDINGS.filter(b => b.grade >= 2);
          const groups = {};
          for (const b of techBlds) { if (!groups[b.line]) groups[b.line] = []; groups[b.line].push(b); }
          return (
            <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }} onClick={() => setShowTech(false)}>
              <div style={{ background:'#242017', border:'1px solid #3d3524', padding:20, width:'90%', maxWidth:900, maxHeight:'85vh', display:'flex', flexDirection:'column', gap:10 }} onClick={e => e.stopPropagation()}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#c9a961', fontSize:20, fontWeight:600 }}>🔬 科技树</span>
                  <span style={{ color:'#7a9ab5', fontSize:16 }}>研究点数: {research}（每回合+3 + 图书馆×1）</span>
                  <button onClick={() => setShowTech(false)} style={{ ...btn(false), padding:'4px 12px' }}>关闭</button>
                </div>
                <div style={{ fontSize:13, color:'#9c8f72' }}>二档 5 点 · 三档 10 点 · 三档须先解锁二档 · 一档建筑默认可建</div>
                <div style={{ overflow:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(groups).map(([line, blds]) => (
                    <div key={line} style={{ background:'#1a1812', padding:8, border:'1px solid #3d3524' }}>
                      <div style={{ color:'#c9a961', fontWeight:600, marginBottom:4, fontSize:15 }}>{line}线</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                        {blds.map(b => {
                          const cost = b.grade === 2 ? 5 : 10;
                          const unlocked = unlockedBlds.has(b.id);
                          const g2 = BUILDINGS.find(x => x.line === b.line && x.grade === 2);
                          const preOk = b.grade === 2 ? true : (!g2 || unlockedBlds.has(g2.id));
                          const canUnlock = !unlocked && research >= cost && preOk;
                          return (
                            <div key={b.id} style={{ padding:'6px 10px', background: unlocked ? '#2e3a1f' : '#242017', border:`1px solid ${unlocked ? '#7a9a4f' : '#3d3524'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div style={{ flex:1 }}>
                                <div style={{ color: LEVEL_COLOR[b.tier], fontWeight:600, fontSize:14 }}>{b.name} <span style={{ fontSize:12, color:'#9c8f72' }}>(grade {b.grade})</span></div>
                                <div style={{ fontSize:12, color:'#9c8f72' }}>
                                  产 {Object.entries(b.output).map(([r, a]) => `${RES_ICON[r]}+${a}`).join(' ')}
                                  {b.input && ' · 耗' + Object.entries(b.input).map(([r, a]) => `${RES_ICON[r]}${a}`).join(' ')}
                                </div>
                                {b.cost && <div style={{ fontSize:12, color:'#7a6e5a' }}>建 {Object.entries(b.cost).map(([r, a]) => `${RES_ICON[r]}${a}`).join(' ')}</div>}
                                {b.terrain && <div style={{ fontSize:12, color: LEVEL_COLOR[b.tier] }}>需地形：{TERRAIN[b.terrain].name}×{b.need}</div>}
                                {!b.terrain && <div style={{ fontSize:12, color:'#5a5140' }}>加工建筑 不要地形</div>}
                                {b.tier && <div style={{ fontSize:12, color: LEVEL_COLOR[b.tier] }}>占 {b.popCost} {b.tier}</div>}
                              </div>
                              <button onClick={() => doUnlock(b)} disabled={unlocked || !canUnlock}
                                style={{ ...btn(unlocked || !canUnlock), padding:'4px 10px', background: unlocked ? '#7a9a4f' : canUnlock ? '#7a9ab5' : '#2b2619', color: unlocked ? '#1a1812' : canUnlock ? '#1a1812' : '#5a5140', fontWeight:600, fontSize:13 }}>
                                {unlocked ? '✓已解锁' : !preOk ? '需先解二档' : `解锁(${cost})`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr 460px', gap: 12, flex: 1, overflow: 'hidden' }}>
          {/* 左栏：操作面板 + 日志 */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...panel, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* 神力展示条 */}
              <div style={{ padding:'8px 10px', background:'#2b1d27', border:'1px solid #b07a9a', marginBottom: 8, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink: 0 }}>
                <span style={{ color:'#b07a9a', fontSize: 18, fontWeight: 600 }}>✨ 神力 {mana}</span>
                <span style={{ color:'#9c8f72', fontSize: 13 }}>+{MANA_PER_TURN}/回合</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
                <h3 style={h3Style}>
                  {upgradeMode ? `升级 · ${upgradableRegions.length} 区域`
                    : freeChangeMode ? `改造 · 剩余 ${freeChanges} 次`
                    : `地形卡 · ${hand.length}张`}
                </h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setUpgradeMode(!upgradeMode);
                      setFreeChangeMode(false);
                      setFreeChangePicking(null);
                      setActiveRegion(null);
                      setUpgradeSelections([]);
                      setSelectedCardId(null);
                    }}
                    style={{
                      ...btn(false), fontSize: 16, padding: '4px 8px',
                      background: upgradeMode ? '#c9a961' : '#3d3524',
                      color: upgradeMode ? '#1a1812' : '#c9a961',
                    }}
                  >{upgradeMode ? '退出升级' : '升级'}</button>
                  <button
                    onClick={() => {
                      setFreeChangeMode(!freeChangeMode);
                      setUpgradeMode(false);
                      setFreeChangePicking(null);
                      setActiveRegion(null);
                      setSelectedCardId(null);
                    }}
                    disabled={freeChanges <= 0 && !freeChangeMode}
                    style={{
                      ...(freeChanges <= 0 && !freeChangeMode ? btn(true) : btn(false)),
                      fontSize: 16, padding: '4px 8px',
                      ...(freeChangeMode ? { background: '#c9a961', color: '#1a1812' } : {}),
                    }}
                  >{freeChangeMode ? '退出改造' : `改造地形(${freeChanges})`}</button>
                  <button onClick={handleUndo} disabled={mapHistory.length === 0} style={{ ...btn(mapHistory.length === 0), fontSize: 16, padding: '4px 8px' }}>撤回</button>
                </div>
              </div>

              {upgradeMode ? (
                <div>
                  {activeRegion ? (
                    <div style={{ background: '#1a1812', padding: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 16, color: '#e8dfc8', marginBottom: 4 }}>
                        {TERRAIN[activeRegion.key].name} → {TERRAIN[upgradeTarget(activeRegion.key)].name}
                      </div>
                      <div style={{ fontSize: 14, color: '#9c8f72', marginBottom: 4 }}>
                        区域共 <span style={{ color: '#c9a961' }}>{activeRegion.totalSize}</span> 格（{
                          [1,2,3].filter(tr => activeRegion.tierCounts[tr] > 0).map(tr => {
                            const k = terrainKeyOf(activeRegion.line, tr);
                            return `${activeRegion.tierCounts[tr]} ${k ? TERRAIN[k].name : ''}`;
                          }).join(' + ')
                        }）
                      </div>
                      {(() => {
                        const l2Key = terrainKeyOf(activeRegion.line, 2);
                        const l3Key = terrainKeyOf(activeRegion.line, 3);
                        const l2Max = Math.floor(activeRegion.totalSize / 3);
                        const l2Used = activeRegion.tierCounts[2] + activeRegion.tierCounts[3];
                        const l3Max = Math.floor(activeRegion.totalSize / 9);
                        const l3Used = activeRegion.tierCounts[3];
                        return (
                          <div style={{ fontSize: 14, color: '#9c8f72', marginBottom: 4 }}>
                            可升级<span style={{ color: '#c9a961' }}>{l2Key ? TERRAIN[l2Key].name : ''}</span> {l2Used}/{l2Max}
                            {l3Max > 0 && <> · 可升级<span style={{ color: '#c9a961' }}>{l3Key ? TERRAIN[l3Key].name : ''}</span> {l3Used}/{l3Max}</>}
                          </div>
                        );
                      })()}
                      <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 6 }}>
                        本次可升 <span style={{ color: '#c9a961' }}>{activeRegion.canUpgrade}</span> 格 · 已选 <span style={{ color: '#7a9a4f' }}>{upgradeSelections.length}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleConfirmUpgrade} disabled={upgradeSelections.length === 0}
                          style={{ ...primaryBtn, padding: '5px 12px', fontSize: 13 }}>
                          确认升级 {upgradeSelections.length} 格
                        </button>
                        <button onClick={() => { setActiveRegion(null); setUpgradeSelections([]); }}
                          style={{ ...btn(false), padding: '5px 12px', fontSize: 13 }}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 16, color: '#9c8f72', padding: '8px 10px', background: '#1a1812' }}>
                      {upgradableRegions.length === 0
                        ? '无可升级区域（需3格同类相连）'
                        : '点虚线格子选区域 → 点格子选升级'}
                    </div>
                  )}
                </div>
              ) : freeChangeMode ? (
                <div>
                  {freeChangePicking ? (
                    <div style={{ background: '#1a1812', padding: 10 }}>
                      <div style={{ fontSize: 16, color: '#e8dfc8', marginBottom: 6 }}>
                        ({freeChangePicking.x},{freeChangePicking.y}) 变为：
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {BASE_TERRAINS.map(key => (
                          <button key={key} onClick={() => handleFreeChangeConfirm(key)} style={{
                            padding: '4px 8px', background: TERRAIN[key].color,
                            color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
                            cursor: 'pointer', fontSize: 16, fontFamily: "'Noto Serif SC', serif",
                          }}>{TERRAIN[key].name}</button>
                        ))}
                      </div>
                      <button onClick={() => setFreeChangePicking(null)}
                        style={{ ...btn(false), marginTop: 6, fontSize: 12 }}>取消</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 16, color: '#9c8f72', padding: '8px 10px', background: '#1a1812' }}>
                      点击地图非城市格选地形（剩余{freeChanges}次）
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  {/* 世界改变按钮置顶 */}
                  <div style={{ marginBottom: 10 }}>
                    <button onClick={handleDrawBatch} disabled={mana < MANA_PER_BATCH}
                      style={{ ...btn(mana < MANA_PER_BATCH), width: '100%', padding:'8px 14px', fontSize: 15, background: mana >= MANA_PER_BATCH ? '#b07a9a' : '#2b2619', color: mana >= MANA_PER_BATCH ? '#1a1812' : '#5a5140', fontWeight: 600 }}>
                      🌍 世界改变
                    </button>
                    <div style={{ fontSize: 12, color: '#9c8f72', textAlign: 'center', marginTop: 3 }}>消耗 {MANA_PER_BATCH} 神力 抽 {HAND_SIZE} 张地形卡</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {hand.map(card => {
                      const isRerollMarked = rerollSelected.has(card.id);
                      return (
                        <div key={card.id} style={{ position: 'relative' }}>
                          <CardView card={card}
                            selected={card.id === selectedCardId}
                            rotation={card.id === selectedCardId ? rotation : 0}
                            onClick={() => { setSelectedCardId(card.id === selectedCardId ? null : card.id); setRotation(0); setRerollSelected(new Set()); }}
                          />
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCardId(null);
                              const next = new Set(rerollSelected);
                              if (next.has(card.id)) next.delete(card.id);
                              else next.add(card.id);
                              setRerollSelected(next);
                            }}
                            style={{
                              position: 'absolute', top: 2, right: 2,
                              width: 16, height: 16,
                              background: isRerollMarked ? '#c9a961' : '#3d3524',
                              color: isRerollMarked ? '#1a1812' : '#9c8f72',
                              border: '1px solid #9c8f72',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, cursor: 'pointer',
                            }}
                            title="标记随机"
                          >{isRerollMarked ? '✓' : '⟳'}</div>
                        </div>
                      );
                    })}
                    {hand.length === 0 && <div style={{ color: '#9c8f72', fontSize: 14 }}>手牌空 · 点顶部按钮花神力抽批</div>}
                  </div>
                  {rerollSelected.size > 0 && (
                    <button onClick={handleReroll} disabled={rerollsLeft <= 0}
                      style={{
                        ...primaryBtn,
                        padding: '5px 12px',
                        fontSize: 13,
                        background: rerollsLeft <= 0 ? '#2b2619' : primaryBtn.background,
                        color: rerollsLeft <= 0 ? '#5a5140' : primaryBtn.color,
                        cursor: rerollsLeft <= 0 ? 'not-allowed' : 'pointer',
                      }}>
                      重抽{rerollSelected.size}张（{rerollsLeft}/3）
                    </button>
                  )}
                </div>
              )}
              <div style={{ flexShrink: 0, borderTop: '1px solid #3d3524', marginTop: 'auto', paddingTop: 8, fontSize: 14, color: '#9c8f72', fontWeight: 600, lineHeight: 1.8 }}>
                <div>· 鼠标右键旋转地形卡</div>
                <div>· 点击卡片右上角 ⟳ 标记不想要的卡，可重新抽取</div>
              </div>
            </div>

            <div style={{ ...panel, marginTop: 8, flexShrink: 0, height: 140, display: 'flex', flexDirection: 'column' }}>
              <h3 style={h3Style}>日志</h3>
              <div style={{ fontSize: 12, flex: 1, overflowY: 'auto', marginTop: 6 }}>
                {log.map((l, i) => (
                  <div key={i} style={{ color: i === 0 ? '#e8dfc8' : '#9c8f72', padding: '2px 0' }}>{l}</div>
                ))}
              </div>
            </div>

          </div>

          {/* 中栏：地图 */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {extendMode && (
              <div style={{ background: '#7a9ab5', color: '#1a1812', padding:'6px 12px', marginBottom: 8, fontWeight:600, fontSize: 14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>✛ 正在扩展：{CITIES.find(c => c.id === extendCityId)?.name} · 已选 {extendPending.length}/{EXTEND_CELLS} 格 · 点地图非城市非已归属格 · 消耗 🔧{EXTEND_COST.工具} 🌾{EXTEND_COST.粮食}</span>
                <button onClick={() => { setExtendMode(false); setExtendPending([]); }} style={{ ...btn(false), padding:'3px 10px', fontSize:12, background:'#1a1812', color:'#e8dfc8' }}>取消</button>
              </div>
            )}
            <div style={{ ...panel, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '6vh', position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_W}, 1fr)`, gap: 2, width: '100%', maxWidth: 'min(calc(100vh - 200px), 92vw)', aspectRatio: `${MAP_W} / ${MAP_H}` }}>
                {Array.from({ length: MAP_H }).map((_, y) =>
                  Array.from({ length: MAP_W }).map((_, x) => {
                    const terrain = map[y][x];
                    const t = TERRAIN[terrain];
                    const isPreview = previewCells.some(c => c.x === x && c.y === y);
                    const prev = isPreview ? previewCells.find(c => c.x === x && c.y === y).terrain : null;
                    const city = CITIES.find(c => c.x === x && c.y === y);
                    const inSelCity = currentCityStatus && getCityCellsFull(currentCityStatus, cityExtensions[selectedCityId]).some(([cx, cy]) => cx === x && cy === y);
                    const isExtendPending = extendMode && extendPending.some(([cx, cy]) => cx === x && cy === y);
                    const hasConflict = conflictSet.has(`${x},${y}`);

                    // 升级模式相关
                    const inActiveRegion = upgradeMode && activeRegion && (
                      activeRegion.cells.some(([cx,cy]) => cx === x && cy === y) ||
                      (activeRegion.higherCells || []).some(([cx,cy]) => cx === x && cy === y)
                    );
                    const isUpgradeSelection = upgradeSelections.some(([cx,cy]) => cx === x && cy === y);
                    const canUpgradeHere = upgradeMode && !city && regionMap[`${x},${y}`] !== undefined;

                    const isFreeChangePick = freeChangeMode && freeChangePicking && freeChangePicking.x === x && freeChangePicking.y === y;
                    let borderStyle;
                    if (isFreeChangePick) borderStyle = '3px solid #c9a961';
                    else if (city) borderStyle = '2px solid #c9a961';
                    else if (isExtendPending) borderStyle = '3px solid #7a9ab5';
                    else if (isUpgradeSelection) borderStyle = '3px solid #7a9a4f';
                    else if (inActiveRegion) borderStyle = '2px solid #e8dfc8';
                    else if (inSelCity) borderStyle = '2px solid #c9a961';
                    else if (isPreview) borderStyle = '2px solid #e8dfc8';
                    else if (canUpgradeHere) borderStyle = '1px dashed #c9a961';
                    else borderStyle = '1px solid #3d3524';

                    // Tooltip内容
                    let tooltip = '';
                    if (city) {
                      tooltip = `${city.name}（城市中心，不可被覆盖，视为万能地形连接器）`;
                    } else {
                      const tierName = t.tier === 1 ? '基础' : t.tier === 2 ? '中级II' : t.tier === 3 ? '高级III' : '';
                      tooltip = `${t.name}${tierName ? `（${tierName}）` : ''}`;
                      // 气候
                      if (t.climate > 0) tooltip += ` · 气候：${CLIMATE_NAMES[t.climate]}（寒冷1｜中冷2｜中暖3｜炎热4，差≥2冲突）`;
                      else if (t.line === 'barren') tooltip += ` · 气候：无（荒地不产生气候冲突）`;
                      // 显示这条地形线的完整三级
                      if (t.line !== 'empty' && t.tier >= 1) {
                        const lineTerrains = Object.entries(TERRAIN)
                          .filter(([_, v]) => v.line === t.line)
                          .sort((a, b) => a[1].tier - b[1].tier)
                          .map(([_, v]) => v.name);
                        tooltip += `\n地形线：${lineTerrains.join(' → ')}`;
                      }
                      // 升级目标
                      const target = upgradeTarget(map[y][x]);
                      if (target) {
                        tooltip += `\n3格同类相连可升级1格 → ${TERRAIN[target].name}`;
                      } else if (t.tier === 3) {
                        tooltip += '\n已是最高级';
                      }
                      if (regionMap[`${x},${y}`] !== undefined) {
                        const r = upgradableRegions[regionMap[`${x},${y}`]];
                        const parts = [1,2,3].filter(tr => r.tierCounts[tr] > 0).map(tr => {
                          const k = terrainKeyOf(r.line, tr);
                          return `${r.tierCounts[tr]}${k ? TERRAIN[k].name : ''}`;
                        });
                        const l2Key = terrainKeyOf(r.line, 2);
                        const l3Key = terrainKeyOf(r.line, 3);
                        const l2Max = Math.floor(r.totalSize / 3);
                        const l2Used = r.tierCounts[2] + r.tierCounts[3];
                        const l3Max = Math.floor(r.totalSize / 9);
                        const l3Used = r.tierCounts[3];
                        tooltip += `\n所在区域共${r.totalSize}格（${parts.join('+')}）`;
                        tooltip += `\n可升级${l2Key ? TERRAIN[l2Key].name : ''} ${l2Used}/${l2Max}`;
                        if (l3Max > 0) tooltip += ` · 可升级${l3Key ? TERRAIN[l3Key].name : ''} ${l3Used}/${l3Max}`;
                      }
                      if (hasConflict) tooltip += '\n⚡ 气候冲突：与相邻地形气候差≥2档，不计入相连（断开）';
                    }

                    return (
                      <div
                        key={`${x}-${y}`}
                        title={tooltip}
                        onMouseEnter={() => setHoverCell({ x, y })}
                        onMouseLeave={() => setHoverCell(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (selectedCard) setRotation((rotation + 1) % 4);
                        }}
                        onClick={() => {
                          // 有手牌且预览有效时，优先放置（即使点在城市格上，城市格本身会被自动跳过）
                          if (selectedCard && canPlace && !extendMode && !upgradeMode && !freeChangeMode) {
                            handlePlace();
                            return;
                          }
                          if (city) { setSelectedCityId(city.id); return; }
                          if (extendMode) handleExtendCell(x, y);
                          else if (upgradeMode) handleUpgradeClick(x, y);
                          else if (freeChangeMode && freeChanges > 0) handleFreeChangeClick(x, y);
                        }}
                        style={{
                          background: isPreview ? TERRAIN[prev].color : t.color,
                          border: borderStyle,
                          position: 'relative',
                          cursor: city ? 'pointer' : upgradeMode ? (canUpgradeHere ? 'pointer' : 'default') : freeChangeMode ? 'crosshair' : selectedCard ? 'pointer' : 'default',
                          aspectRatio: '1',
                          opacity: isPreview ? 0.85 : (upgradeMode && !inActiveRegion && !canUpgradeHere && !city) ? 0.4 : 1,
                        }}
                      >
                        {!city && t.tier >= 2 && (
                          <div style={{
                            position: 'absolute', bottom: 1, right: 2,
                            fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 700
                          }}>{t.tier === 2 ? 'II' : 'III'}</div>
                        )}
                        {city && (
                          <div style={{
                            position: 'absolute', inset: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: 14,
                            color: '#1a1812', background: 'rgba(201, 169, 97, 0.9)',
                            lineHeight: 1.1, textAlign: 'center', padding: 1,
                          }}>{city.name}</div>
                        )}
                        {hasConflict && !city && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(194,90,58,0.3) 3px, rgba(194,90,58,0.3) 5px)',
                          }}>
                            <div style={{ position: 'absolute', top: 1, right: 1, fontSize: 12, color: '#c25a3a' }}>⚡</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ marginTop: 6, fontSize: 16, color: '#9c8f72', display: 'flex', gap: 16, justifyContent: 'center', flexShrink: 0 }}>
                <span>II = 中级地形</span>
                <span>III = 高级地形</span>
                <span>3格同类相连可升级1格</span>
                <span>⚡ 气候冲突：相邻气候差≥2档断开相连，无法升级</span>
              </div>
              <div style={{ position: 'absolute', bottom: 56, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button onClick={() => {
                  setExtendMode(!extendMode);
                  setExtendCityId(selectedCityId);
                  setExtendPending([]);
                  setUpgradeMode(false);
                  setFreeChangeMode(false);
                }} style={{ ...btn(false), fontSize: 15, padding: '6px 16px', width: 130, background: extendMode ? '#c9a961' : '#3d3524', color: extendMode ? '#1a1812' : '#c9a961' }}>
                  {extendMode ? `退出（${extendPending.length}/${EXTEND_CELLS}）` : '扩建城市'}
                </button>
                <div style={{ fontSize: 12, color: '#9c8f72', textAlign: 'right', lineHeight: 1.3 }}>
                  选 {EXTEND_CELLS} 格 · 消耗 🔧{EXTEND_COST.工具} 🌾{EXTEND_COST.粮食}
                </div>
                {extendMode && extendPending.length > 0 && (
                  <button onClick={handleConfirmExtend} style={{ ...btn(false), fontSize: 13, padding: '5px 10px', width: 180, background: '#7a9a4f', color: '#1a1812', fontWeight: 600 }}>
                    确认 · {CITIES.find(c => c.id === extendCityId).name} 扩 {extendPending.length} 格
                  </button>
                )}
                <div style={{ height: 28 }} />
                <button onClick={handleNextTurn} style={{ ...primaryBtn, fontSize: 16, padding: '12px 48px', width: '100%' }}>下一回合 ▶</button>
              </div>
            </div>

          </div>

          {/* 右栏：城市面板 */}
          <div style={{ ...panel, overflowY: 'auto' }}>
            {currentCityStatus && (() => {
              const cityId = selectedCityId;
              const cityPopUsage = popUsageByCity[cityId] || { 粗浅:0, 严肃:0, 深刻:0 };
              const cityBlds = cityBuildings[cityId] || [];
              return (
              <>
                {/* 城市切换（2 行 × 3 列） */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 10 }}>
                  {CITIES.map(c => {
                    const out = outputPerCity[c.id] || {};
                    const entries = Object.entries(out).filter(([, a]) => a > 0);
                    const active = c.id === selectedCityId;
                    return (
                      <div key={c.id} onClick={() => setSelectedCityId(c.id)} style={{ cursor:'pointer', padding:'5px 6px', textAlign:'center', background: active ? '#3d3524' : '#1a1812', border: active ? '2px solid #c9a961' : '1px solid #3d3524' }}>
                        <div style={{ fontSize: 15, color: active ? '#c9a961' : '#9c8f72', fontWeight: active ? 600 : 400 }}>{c.name}</div>
                        <div style={{ fontSize: 13 }}>
                          {TIER_ORDER.map((t, i) => (
                            <span key={t}>
                              <span style={{ color: LEVEL_COLOR[t] }}>{population[c.id][t]}</span>
                              {i < 2 && <span style={{ color: '#5a5140' }}>/</span>}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: '#7a9a4f', lineHeight: 1.2, marginTop: 1 }}>
                          {entries.length === 0 ? <span style={{ color: '#3d3524' }}>—</span> : entries.map(([r, a]) => (
                            <span key={r} style={{ marginRight: 3 }}>{RES_ICON[r]}+{a}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 18, color: '#c9a961', marginBottom: 6, fontWeight: 600 }}>
                    {currentCityStatus.name} · 辖区地形
                    {currentCityStatus.extension && currentCityStatus.extension.length > 0 && (
                      <span style={{ color: '#9c8f72', fontSize: 15, marginLeft: 8 }}>（含扩{currentCityStatus.extension.length}格）</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
                    {Object.entries(currentCityStatus.terrainValues).length === 0 ? (
                      <div style={{ fontSize: 14, color: '#5a5140', padding: '4px 6px', gridColumn: 'span 6' }}>无有效地形</div>
                    ) : (
                      Object.entries(currentCityStatus.terrainValues).map(([key, v]) => {
                        const bldsUsing = cityBlds.filter(b => !b.disabled && b.terrain === key);
                        const n = bldsUsing.length;
                        return (
                          <div key={key} style={{ padding: '3px 5px', background: '#1a1812', fontSize: 13, display: 'flex', flexDirection:'column', alignItems:'center', borderLeft: `2px solid ${TERRAIN[key].color}` }}>
                            <span style={{ color: '#e8dfc8', fontSize: 12 }}>
                              {TERRAIN[key].name}
                              {TERRAIN[key].tier >= 2 && <span style={{ color: '#9c8f72', fontSize: 11, marginLeft: 2 }}>{TERRAIN[key].tier === 2 ? 'II' : 'III'}</span>}
                            </span>
                            <span style={{ color: '#c9a961', fontWeight: 600, fontSize: 14 }}>{v}</span>
                            {n > 0 ? (
                              <>
                                <span style={{ color: '#9c8f72', fontSize: 11, lineHeight: 1.2 }}>{n}🏛️</span>
                                <span style={{ color: '#9c8f72', fontSize: 11, lineHeight: 1.2 }}>{(v/n).toFixed(1)}/🏛️</span>
                              </>
                            ) : <span style={{ color: '#3d3524', fontSize: 11 }}>未用</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 人口/幸福（一行居中） */}
                <div style={{ marginBottom: 10, padding:'6px 10px', background:'#1a1812', fontSize:15, display:'flex', justifyContent:'space-around', alignItems:'center' }}>
                  {TIER_ORDER.map(tier => {
                    const h = happiness[cityId][tier];
                    const hColor = h >= 60 ? '#7a9a4f' : h >= 30 ? '#c9a961' : '#c25a3a';
                    return (
                      <span key={tier} style={{ color: LEVEL_COLOR[tier] }}>
                        {tier} {cityPopUsage[tier]}/{population[cityId][tier]}
                        <span style={{ color: hColor, marginLeft: 4 }}>😊{h}</span>
                        {homeless[cityId][tier] > 0 && <span style={{ color: '#c25a3a', marginLeft: 4 }}>🏚{homeless[cityId][tier]}</span>}
                      </span>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 6 }}>已建造 · {cityBlds.length}</div>
                  {cityBlds.length === 0 ? (
                    <div style={{ fontSize: 15, color: '#5a5140', padding: '6px 10px', background: '#1a1812' }}>尚未建造</div>
                  ) : (() => {
                    // 折叠满员住房：同 id + 满员 → 合并为一条；其余分开
                    const displayList = [];
                    const fullGroup = {};
                    cityBlds.forEach((b, i) => {
                      if (b.housing && (b.residents || 0) >= b.housing) {
                        if (fullGroup[b.id] == null) {
                          fullGroup[b.id] = displayList.length;
                          displayList.push({ b, firstIdx: i, count: 1 });
                        } else {
                          displayList[fullGroup[b.id]].count += 1;
                        }
                      } else {
                        displayList.push({ b, firstIdx: i, count: 1 });
                      }
                    });
                    return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                    {displayList.map(({ b, firstIdx: i, count }) => {
                      const isHouse = !!b.housing;
                      const canUpgrade = isHouse && b.housingTier && TIER_ORDER.indexOf(b.housingTier) < 2 && (b.residents || 0) >= b.housing;
                      const canEnable = !b.disabled || !b.tier || b.popCost === 0 || ((population[cityId][b.tier] || 0) - (cityPopUsage[b.tier] || 0)) >= b.popCost;
                      const stat = currentCityStatus.buildings[i] ? currentCityStatus.buildings[i].status : 'ok';
                      const borderColor = stat === 'ok' ? '#7a9a4f' : stat === 'debuff25' ? '#c9a961' : stat === 'halted' ? '#d4a85a' : stat === 'disabled' ? '#5a5140' : '#c25a3a';
                      const share = currentCityStatus.buildings[i] ? currentCityStatus.buildings[i].value : null;
                      return (
                        <div key={i} style={{ padding: '6px 8px', background: b.disabled || b.halted ? '#141010' : '#1a1812', marginBottom: 3, borderLeft: `3px solid ${borderColor}`, opacity: b.disabled || b.halted ? 0.6 : 1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4 }}>
                            <div style={{ flex:1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, color: '#e8dfc8', display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                                <span>{b.name}</span>
                                {b.disabled && (() => {
                                  let extra = '';
                                  if (b.autoDisabled && b.tier && b.popCost) {
                                    const usage = calcCityPopUsage(cityBlds);
                                    const free = (population[cityId][b.tier] || 0) - (usage[b.tier] || 0);
                                    const shortage = b.popCost - free;
                                    if (shortage > 0) extra = ` ·差${shortage}${b.tier}`;
                                  }
                                  return <span style={{ background:'#c25a3a', color:'#1a1812', padding:'1px 5px', fontSize:11, fontWeight:700 }}>⏸停工{extra}</span>;
                                })()}
                                {!b.disabled && b.halted && <span style={{ background:'#d4a85a', color:'#1a1812', padding:'1px 5px', fontSize:11, fontWeight:700 }}>⚠停产·原料</span>}
                                {!b.disabled && !b.halted && stat === 'debuff25' && <span style={{ background:'#c9a961', color:'#1a1812', padding:'1px 5px', fontSize:11, fontWeight:700 }}>🟡产能25%</span>}
                                {!b.disabled && !b.halted && stat === 'stopped' && <span style={{ background:'#c25a3a', color:'#1a1812', padding:'1px 5px', fontSize:11, fontWeight:700 }}>✗停产·地形</span>}
                                {isHouse && <span style={{ color: '#9c8f72', fontSize: 13 }}>{b.residents || 0}/{b.housing}{b.housingTier}</span>}
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:14, marginTop: 2 }}>
                                <button onClick={() => handleDemolish(cityId, i)} style={{ ...btn(false), padding:'1px 6px', fontSize:11 }}>拆</button>
                                {count > 1 && <span style={{ color:'#c9a961', fontSize: 12 }}>×{count}</span>}
                              </div>
                              {/* 产量 / 消耗 一排 */}
                              {(b.output && !b.housing) || b.input ? (
                                <div style={{ fontSize: 13, color: '#9c8f72', display:'flex', gap:8, flexWrap:'wrap' }}>
                                  {b.output && !b.housing && <span><span style={{ color:'#5a5140' }}>产量</span> <span style={{ color:'#7a9a4f' }}>{Object.entries(b.output).map(([r, a]) => `${RES_ICON[r]}+${a}`).join(' ')}/回合</span></span>}
                                  {b.input && <span><span style={{ color:'#5a5140' }}>消耗</span> <span style={{ color:'#c25a3a' }}>{Object.entries(b.input).map(([r, a]) => `${RES_ICON[r]}${a}`).join(' ')}</span></span>}
                                </div>
                              ) : null}
                              {/* 地形需求 / 占人口 一排 */}
                              {(b.terrain && share != null) || (b.tier && !b.housing) ? (
                                <div style={{ fontSize: 13, display:'flex', gap:8, flexWrap:'wrap' }}>
                                  {b.terrain && share != null && <span style={{ color:'#7a6e5a' }}><span style={{ color:'#5a5140' }}>地形需求</span> <span style={{ color:'#c9a961', fontWeight:600 }}>{TERRAIN[b.terrain].name} {b.need}</span> <span style={{ color: stat === 'ok' ? '#7a9a4f' : stat === 'debuff25' ? '#c9a961' : '#c25a3a' }}>当前{share.toFixed(1)}{(stat === 'debuff25' || stat === 'stopped') ? ' · 地形值不足' : ''}</span></span>}
                                  {b.tier && !b.housing && <span style={{ color: LEVEL_COLOR[b.tier] }}><span style={{ color:'#5a5140' }}>占人口</span> {b.popCost}{b.tier}</span>}
                                </div>
                              ) : null}
                              {/* 住房升级成本 */}
                              {isHouse && b.housingTier && TIER_ORDER.indexOf(b.housingTier) < 2 && (() => {
                                const nextTier = TIER_ORDER[TIER_ORDER.indexOf(b.housingTier) + 1];
                                const nextDef = FUNC_BUILDINGS.find(f => f.housingTier === nextTier);
                                if (!nextDef || !nextDef.cost) return null;
                                return (
                                  <>
                                    <div style={{ fontSize: 13, color:'#5a5140' }}>升级到{nextTier}所需</div>
                                    <div style={{ fontSize: 13, display:'flex', gap:6, flexWrap:'wrap' }}>
                                      {Object.entries(nextDef.cost).map(([r, a]) => (
                                        <span key={r} style={{ color: (resources[r] || 0) >= a ? '#9c8f72' : '#c25a3a' }}>{RES_ICON[r]}{a}</span>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                              {canUpgrade && <button onClick={() => handleUpgradeHousing(cityId, i)} style={{ ...btn(false), padding:'1px 6px', fontSize:11, color:'#7a9ab5' }}>⬆升级</button>}
                              {isHouse && b.housingTier && TIER_ORDER.indexOf(b.housingTier) > 0 && (
                                <button onClick={() => handleDowngradeHousing(cityId, i)} style={{ ...btn(false), padding:'1px 6px', fontSize:11, color:'#c9a961' }}>⬇降级</button>
                              )}
                              {b.tier && !b.housing && (
                                <button onClick={() => handleToggleBuilding(cityId, i)} disabled={b.disabled && !canEnable} style={{ ...btn(b.disabled && !canEnable), padding:'1px 6px', fontSize:11, color: b.disabled ? (canEnable ? '#7a9a4f' : '#5a5140') : '#c25a3a' }}>
                                  {b.disabled ? '启用' : '禁用'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    );
                  })()}
                </div>

                <div>
                  {(() => {
                    const buildable = BUILDINGS.filter(b => b.grade === 1 || unlockedBlds.has(b.id));
                    const groups = [
                      { title: '住房', items: FUNC_BUILDINGS.filter(b => b.housing && b.housingTier === '粗浅') },
                      { title: '采集（需地形）', items: buildable.filter(b => b.terrain) },
                      { title: '加工（无地形）', items: buildable.filter(b => !b.terrain) },
                      { title: '功能', items: FUNC_BUILDINGS.filter(b => !b.housing) },
                    ];
                    const cityTerrainAllBlds = cityBuildings[cityId] || [];
                    const renderRow = (b) => {
                      const resOk = !b.cost || Object.entries(b.cost).every(([r, a]) => (resources[r] || 0) >= a);
                      // 预览：如果现在建，地形份额和产能档
                      let preview = null;
                      if (b.terrain) {
                        const city = CITIES.find(cc => cc.id === cityId);
                        const total = cityTerrainCountFull(map, city, cityExtensions[cityId], b.terrain, conflictSet);
                        const sameCount = cityTerrainAllBlds.filter(x => !x.disabled && x.terrain === b.terrain).length + 1;
                        const share = total / sameCount;
                        const rate = productionRate(share, b.need);
                        const col = rate === 1 ? '#7a9a4f' : rate === 0.25 ? '#c9a961' : '#c25a3a';
                        preview = <span style={{ color: col, fontSize: 12 }}>产能{Math.round(rate*100)}% 当前{share.toFixed(1)}{rate < 1 ? ' · 地形值不足' : ''}</span>;
                      }
                      return (
                        <div key={b.id} style={{ padding: '6px 8px', background: '#1a1812', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: resOk ? 1 : 0.5, borderLeft: `3px solid ${LEVEL_COLOR[b.tier] || '#5a5140'}`, minHeight: 76 }}>
                          <div>
                            <div style={{ fontSize: 15, color: '#e8dfc8' }}>{b.name}</div>
                            {/* 产 / 耗 一排 */}
                            {(b.output) || b.input ? (
                              <div style={{ fontSize: 13, color: '#9c8f72', display:'flex', gap:8, flexWrap:'wrap' }}>
                                {b.output && <span><span style={{ color:'#5a5140' }}>产量</span> <span style={{ color:'#7a9a4f' }}>{Object.entries(b.output).map(([r, a]) => `${RES_ICON[r]}+${a}`).join(' ')}/回合</span></span>}
                                {b.input && <span><span style={{ color:'#5a5140' }}>消耗</span> <span style={{ color:'#c25a3a' }}>{Object.entries(b.input).map(([r, a]) => `${RES_ICON[r]}${a}`).join(' ')}</span></span>}
                              </div>
                            ) : null}
                            {!b.output && b.effect && <div style={{ fontSize: 13, color: '#9c8f72' }}>{b.effect}</div>}
                            {/* 地形需求 */}
                            {b.terrain && <div style={{ fontSize: 13, color: LEVEL_COLOR[b.tier] }}>
                              <span style={{ color:'#5a5140' }}>地形需求</span> <span style={{ color:'#c9a961', fontWeight:600 }}>{TERRAIN[b.terrain].name} {b.need}</span>
                              {preview && <span style={{ marginLeft: 4 }}>{preview}</span>}
                            </div>}
                            {!b.terrain && b.tier && b.output && <div style={{ fontSize: 13, color:'#5a5140' }}>加工·无地形</div>}
                            {/* 建造成本 + 占用人口 一排 */}
                            {(b.cost || (b.tier && !b.housing)) ? (
                              <div style={{ fontSize: 13, display:'flex', gap:8, flexWrap:'wrap' }}>
                                {b.cost && <span style={{ color: '#7a6e5a' }}><span style={{ color:'#5a5140' }}>建造成本</span> {Object.entries(b.cost).map(([r, a]) => <span key={r} style={{ color: (resources[r] || 0) >= a ? '#9c8f72' : '#c25a3a', marginLeft: 3 }}>{RES_ICON[r]}{a}</span>)}</span>}
                                {b.tier && !b.housing && <span style={{ color: LEVEL_COLOR[b.tier] }}><span style={{ color:'#5a5140' }}>占人口</span> {b.popCost}{b.tier}</span>}
                              </div>
                            ) : null}
                          </div>
                          <button onClick={() => handleBuild(cityId, b)} disabled={!resOk}
                            style={{ ...btn(!resOk), padding: '3px 8px', fontSize: 13, marginTop: 4, width: '100%' }}>
                            {resOk ? '建造' : '缺料'}
                          </button>
                        </div>
                      );
                    };
                    return groups.filter(g => g.items.length > 0).map(g => (
                      <div key={g.title} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 15, color: '#c9a961', marginBottom: 4, borderBottom: '1px solid #3d3524', paddingBottom: 2 }}>{g.title}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                          {g.items.map(renderRow)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}

const panel = {
  background: '#242017',
  padding: 16,
  border: '1px solid #3d3524',
};
const h3Style = {
  fontFamily: "'Cinzel', serif",
  fontSize: 16,
  letterSpacing: 2,
  color: '#c9a961',
  margin: 0,
  textTransform: 'uppercase',
  fontWeight: 600,
};
const btn = (disabled) => ({
  background: disabled ? '#2b2619' : '#3d3524',
  color: disabled ? '#5a5140' : '#c9a961',
  border: '1px solid #3d3524',
  padding: '6px 12px',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: 1,
});
const primaryBtn = {
  background: '#c9a961',
  color: '#1a1812',
  border: 'none',
  padding: '8px 18px',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
  cursor: 'pointer',
  letterSpacing: 2,
  fontWeight: 600,
};

function CardView({ card, selected, rotation, onClick }) {
  const shape = rotateShape(SHAPES[card.shape], rotation);
  const maxX = Math.max(...shape.map(c => c[0]));
  const maxY = Math.max(...shape.map(c => c[1]));
  return (
    <div onClick={onClick} style={{
      background: selected ? '#3d3524' : '#2b2619',
      border: selected ? '2px solid #c9a961' : '1px solid #3d3524',
      padding: 8,
      cursor: 'pointer',
      minWidth: 90,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${maxX + 1}, 16px)`,
        gridTemplateRows: `repeat(${maxY + 1}, 16px)`,
        gap: 1,
        marginBottom: 6,
      }}>
        {Array.from({ length: maxY + 1 }).map((_, y) =>
          Array.from({ length: maxX + 1 }).map((_, x) => {
            const idx = shape.findIndex(c => c[0] === x && c[1] === y);
            if (idx === -1) return <div key={`${x}-${y}`} />;
            return <div key={`${x}-${y}`} style={{
              background: TERRAIN[card.terrains[idx]].color,
              border: '1px solid rgba(0,0,0,0.3)',
            }} />;
          })
        )}
      </div>
      <div style={{ fontSize: 16, color: selected ? '#c9a961' : '#9c8f72', textAlign: 'center' }}>
        {card.name}
      </div>
    </div>
  );
}
