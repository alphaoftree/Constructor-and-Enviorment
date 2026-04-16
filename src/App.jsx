import React, { useState, useMemo } from 'react';

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

const CITIES = [
  { id: 'A', name: '粮木城', x: 2, y: 2 },
  { id: 'B', name: '药木城', x: 7, y: 2 },
  { id: 'C', name: '铁工城', x: 2, y: 5 },
  { id: 'D', name: '云港城', x: 7, y: 5 },
  { id: 'E', name: '灰谷城', x: 2, y: 8 },
  { id: 'F', name: '碧潮城', x: 7, y: 8 },
];

const getCityArea = (city) => {
  const area = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = city.x + dx, y = city.y + dy;
      if (x >= 0 && x < 10 && y >= 0 && y < 10) area.push([x, y]);
    }
  }
  return area;
};
const cellInCity = (x, y, city) => getCityArea(city).some(([cx, cy]) => cx === x && cy === y);

// 信众需求（每人每回合消耗）
const POP_NEEDS = {
  粗浅: { 粮食: 1, 木材: 1, 肉食: 1 },
  严肃: { 粮食: 1, 木材: 1, 肉食: 1, 药草: 1, 鱼获: 1 },
  深刻: { 粮食: 2, 木材: 1, 肉食: 1, 药草: 2, 鱼获: 1, 铁: 2 },
};

// 建筑按资源类型分组，不同等级建筑占用不同数量的对应信众
const BUILDINGS = [
  // 粮食（粗浅信众）
  { id: 'farm',     name: '农田',     terrain: 'plain',   need: 3, output: '粮食+16/回合',  unlock: { level: '粗浅', count: 5 } },
  { id: 'bigfarm',  name: '大农场',   terrain: 'rich',    need: 2, output: '粮食+48/回合',  unlock: { level: '粗浅', count: 10 } },
  { id: 'megafarm', name: '神佑农场', terrain: 'black',   need: 1, output: '粮食+144/回合', unlock: { level: '粗浅', count: 15 } },
  // 木材（粗浅信众）
  { id: 'wood',     name: '伐木场',   terrain: 'forest',  need: 3, output: '木材+16/回合',  unlock: { level: '粗浅', count: 5 } },
  { id: 'sawmill',  name: '锯木厂',   terrain: 'deepwood',need: 2, output: '木材+48/回合',  unlock: { level: '粗浅', count: 10 } },
  { id: 'elfwood',  name: '古木坊',   terrain: 'ancient', need: 1, output: '木材+144/回合', unlock: { level: '粗浅', count: 15 } },
  // 肉食（严肃信众）
  { id: 'ranch',    name: '牧场',     terrain: 'grass',   need: 3, output: '肉食+16/回合',  unlock: { level: '严肃', count: 5 } },
  { id: 'bigranch', name: '大牧场',   terrain: 'hillgrass',need:2, output: '肉食+48/回合',  unlock: { level: '严肃', count: 10 } },
  { id: 'meadow_r', name: '牧野庄园', terrain: 'meadow',  need: 1, output: '肉食+144/回合', unlock: { level: '严肃', count: 15 } },
  // 鱼获（严肃信众）
  { id: 'fish',     name: '渔场',     terrain: 'river',   need: 2, output: '鱼获+32/回合',  unlock: { level: '严肃', count: 5 } },
  { id: 'megafish', name: '大渔场',   terrain: 'lake',    need: 1, output: '鱼获+96/回合',  unlock: { level: '严肃', count: 10 } },
  // 铁（深刻信众，只有最高级）
  { id: 'warforge', name: '兵工厂',   terrain: 'snow',    need: 1, output: '铁+144/回合',   unlock: { level: '深刻', count: 5 } },
  // 药草（深刻信众，只有最高级）
  { id: 'alchemy',  name: '炼金塔',   terrain: 'lake',    need: 1, output: '药草+144/回合', unlock: { level: '深刻', count: 5 } },
];

// 简化柏林噪声：生成平滑的2D值场
// 通过几个随机锚点+距离插值模拟
const makeNoiseField = (numAnchors = 8, smoothness = 1.5) => {
  const field = Array.from({ length: 10 }, () => Array(10).fill(0));
  const anchors = [];
  for (let i = 0; i < numAnchors; i++) {
    anchors.push({
      x: Math.random() * 10,
      y: Math.random() * 10,
      value: Math.random(),
    });
  }
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      let weightSum = 0;
      let valSum = 0;
      for (const a of anchors) {
        const d = Math.sqrt((x - a.x) ** 2 + (y - a.y) ** 2) + 0.3;
        const w = 1 / Math.pow(d, smoothness);
        weightSum += w;
        valSum += w * a.value;
      }
      // 叠加高频噪声让边界更碎
      field[y][x] = valSum / weightSum + (Math.random() - 0.5) * 0.15;
    }
  }
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    if (field[y][x] < min) min = field[y][x];
    if (field[y][x] > max) max = field[y][x];
  }
  const range = max - min || 1;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    field[y][x] = (field[y][x] - min) / range;
  }
  return field;
};

const makeInitialMap = () => {
  const m = Array.from({ length: 10 }, () => Array(10).fill('empty'));

  // 三张独立噪声图，更多锚点+更低平滑度 → 更碎片
  const tempNoise = makeNoiseField(8, 1.5);
  const temp = Array.from({ length: 10 }, () => Array(10).fill(0));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      temp[y][x] = 0.55 * (y / 9) + 0.45 * tempNoise[y][x];
    }
  }
  const elev = makeNoiseField(6, 1.8);
  const humid = makeNoiseField(7, 1.5);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
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

  // 固定60%荒地：先收集所有非城市格子，随机选60%变荒地
  const nonCityCells = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
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
const HAND_SIZE = 8;

let cardCounter = 100;
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
  return { id: `gen_${cardCounter}`, shape: shapeKey, terrains, name: `${nameStr}·由` };
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
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (citySet.has(`${x},${y}`)) continue;
      const t = TERRAIN[map[y][x]];
      if (t.climate === 0) continue;
      for (const [dx, dy] of [[1,0],[0,1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 10 || ny >= 10) continue;
        if (citySet.has(`${nx},${ny}`)) continue;
        const nt = TERRAIN[map[ny][nx]];
        if (nt.climate === 0) continue;
        if (Math.abs(t.climate - nt.climate) >= 2) conflicts.push({ x, y, nx, ny });
      }
    }
  }
  return conflicts;
};

// 找所有可升级的连通区域
// 返回：[{ key, cells: [[x,y],...], canUpgrade: 数量 }, ...]
const findUpgradableRegions = (map) => {
  // 先算出所有有气候冲突的格子
  const conflictCells = new Set();
  const citySet = new Set(CITIES.map(c => `${c.x},${c.y}`));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (citySet.has(`${x},${y}`)) continue;
      const t = TERRAIN[map[y][x]];
      if (t.climate === 0) continue;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) continue;
        if (citySet.has(`${nx},${ny}`)) continue;
        const nt = TERRAIN[map[ny][nx]];
        if (nt.climate === 0) continue;
        if (Math.abs(t.climate - nt.climate) >= 2) {
          conflictCells.add(`${x},${y}`);
          break;
        }
      }
    }
  }

  const visited = Array.from({ length: 10 }, () => Array(10).fill(false));
  const regions = [];

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (visited[y][x]) continue;
      const key = map[y][x];
      const t = TERRAIN[key];
      if (t.tier === 0 || t.tier === 3 || t.line === 'barren') continue;
      if (citySet.has(`${x},${y}`)) continue;
      if (conflictCells.has(`${x},${y}`)) continue;

      const cells = [];
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= 10 || cy < 0 || cy >= 10) continue;
        if (visited[cy][cx]) continue;
        // 气候冲突格子断开，不纳入
        if (conflictCells.has(`${cx},${cy}`)) continue;

        const cellKey = `${cx},${cy}`;
        const isCity = citySet.has(cellKey);

        if (isCity) {
          // 城市格子：视为万能连接器，标记已访问但不加入cells，继续扩展
          visited[cy][cx] = true;
          stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
          continue;
        }

        if (map[cy][cx] !== key) continue;
        visited[cy][cx] = true;
        cells.push([cx, cy]);
        stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
      }
      const canUpgrade = Math.floor(cells.length / 3);
      if (canUpgrade >= 1) {
        regions.push({ key, cells, canUpgrade });
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

// 计算所有建筑总共占用了多少信众
const calcPopUsage = (cityBuildings) => {
  const usage = { 粗浅: 0, 严肃: 0, 深刻: 0 };
  for (const cityId of Object.keys(cityBuildings)) {
    for (const b of cityBuildings[cityId]) {
      usage[b.unlock.level] += b.unlock.count;
    }
  }
  return usage;
};

export default function Demo() {
  const [map, setMap] = useState(makeInitialMap);
  const [mapHistory, setMapHistory] = useState([]);
  const [hand, setHand] = useState(() => generateHand());
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [hoverCell, setHoverCell] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState('A');
  const [cityBuildings, setCityBuildings] = useState({
    A: [], B: [], C: [], D: [], E: [], F: []
  });
  const [resources, setResources] = useState({
    粮食: 100, 木材: 100, 铁: 150, 药草: 150, 鱼获: 150, 肉食: 150
  });
  // 全局人口按知识等级分
  const [population, setPopulation] = useState({
    粗浅: 40, 严肃: 0, 深刻: 0
  });
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
      c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10 &&
      !CITIES.some(city => city.x === c.x && city.y === c.y)
    );
  }, [selectedCard, hoverCell, rotation]);

  // 只要有至少1格能放下就可以放（出界和城市中心自动跳过）
  const canPlace = selectedCard && previewCells.length > 0;

  const handlePlace = () => {
    if (!canPlace) return;
    const newMap = map.map(row => [...row]);
    for (const { x, y, terrain } of previewCells) newMap[y][x] = terrain;
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
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
    setResources(last.resources);
    if (last.population) setPopulation(last.population);
    if (last.hand) setHand(last.hand);
    setMapHistory(mapHistory.slice(0, -1));
    addLog('↶ 撤回');
  };

  const popUsage = useMemo(() => calcPopUsage(cityBuildings), [cityBuildings]);

  const handleBuild = (cityId, building) => {
    // 检查空闲信众是否足够
    const free = population[building.unlock.level] - popUsage[building.unlock.level];
    if (free < building.unlock.count) {
      addLog(`⚠ 空闲${building.unlock.level}之人不足（需${building.unlock.count}，空闲${free}）`);
      return;
    }
    const existing = cityBuildings[cityId];
    if (existing.some(b => b.id === building.id)) {
      addLog(`⚠ 已有该建筑`);
      return;
    }
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
    setCityBuildings({
      ...cityBuildings,
      [cityId]: [...existing, building]
    });
    const city = CITIES.find(c => c.id === cityId);
    addLog(`⚒ ${city.name} 建造 ${building.name}（占用 ${building.unlock.count} 名${building.unlock.level}之人）`);
  };

  const handleDemolish = (cityId, buildingId) => {
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
    setCityBuildings({
      ...cityBuildings,
      [cityId]: cityBuildings[cityId].filter(b => b.id !== buildingId)
    });
    addLog(`✗ 拆除建筑`);
  };

  const [upgradeMode, setUpgradeMode] = useState(false);
  const [unmetTurns, setUnmetTurns] = useState({ 粗浅: 0, 严肃: 0, 深刻: 0 });
  const [showShop, setShowShop] = useState(false);
  const [freeChanges, setFreeChanges] = useState(3);
  const [freeChangeMode, setFreeChangeMode] = useState(false);
  const [freeChangePicking, setFreeChangePicking] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(2);
  const [rerollSelected, setRerollSelected] = useState(new Set()); // {x,y} 正在选地形的格子
  // 正在查看的区域（点击地图某格后显示这一整片区域）
  const [activeRegion, setActiveRegion] = useState(null);
  // 已经在本次升级中选中待升级的格子 [[x,y],...]
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
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
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
    const newResources = { ...resources };
    let gained = {};
    // 建筑产出
    for (const city of CITIES) {
      for (const b of cityBuildings[city.id]) {
        const v = cityTerrainValue(map, city, b.terrain);
        const match = b.output.match(/(.+?)\+(\d+)/);
        if (!match) continue;
        const res = match[1];
        let amt = parseInt(match[2]);
        if (v >= b.need) {
          newResources[res] = (newResources[res] || 0) + amt;
          gained[res] = (gained[res] || 0) + amt;
        } else if (v > 0) {
          amt = Math.floor(amt / 2);
          newResources[res] = (newResources[res] || 0) + amt;
          gained[res] = (gained[res] || 0) + amt;
        }
      }
    }
    // 检查每个等级的需求是否满足
    const newUnmet = { ...unmetTurns };
    let popMsg = '';
    let newPop = { ...population };
    for (const level of ['粗浅', '严肃', '深刻']) {
      const needs = POP_NEEDS[level];
      let met = true;
      for (const [res, amt] of Object.entries(needs)) {
        if ((newResources[res] || 0) < amt * population[level]) {
          met = false;
          break;
        }
      }
      if (met) {
        for (const [res, amt] of Object.entries(needs)) {
          newResources[res] -= amt * population[level];
          gained[res] = (gained[res] || 0) - amt * population[level];
        }
        newUnmet[level] = 0;
        // 只有粗浅会自然增长（0人时也能涨），其他等级靠启示
        if (level === '粗浅') {
          newPop.粗浅 += 20;
          popMsg += ` 粗浅+20`;
        }
      } else {
        // 人口为0时没有需求，不会走到这里
        if (population[level] === 0) { newUnmet[level] = 0; continue; }
        // 部分扣（能扣多少扣多少）
        for (const [res, amt] of Object.entries(needs)) {
          const want = amt * population[level];
          const actual = Math.min(newResources[res] || 0, want);
          newResources[res] = (newResources[res] || 0) - actual;
          gained[res] = (gained[res] || 0) - actual;
        }
        newUnmet[level] += 1;
        if (newUnmet[level] >= 3) {
          const loss = Math.min(population[level], 5);
          newPop[level] = population[level] - loss;
          popMsg += ` ${level}-${loss}(需求不满3回合)`;
        } else {
          popMsg += ` ${level}需求不满(${newUnmet[level]}/3)`;
        }
      }
    }
    setUnmetTurns(newUnmet);
    setPopulation(newPop);
    setResources(newResources);
    setTurn(turn + 1);
    setMapHistory([]);
    // 每回合重roll全部手牌+重置自由改造
    setHand(generateHand());
    setFreeChanges(3);
    setFreeChangeMode(false);
    setFreeChangePicking(null);
    setRerollsLeft(2);
    setRerollSelected(new Set());
    setSelectedCardId(null);
    setRotation(0);
    const gainStr = Object.entries(gained).filter(([_,v]) => v !== 0).map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`).join(' ');
    addLog(`━ 回合 ${turn + 1}｜${gainStr}${popMsg}`);
  };

  const handleRotate = () => setRotation((rotation + 1) % 4);

  // 自由改地形：点格子选位置，再选地形类型
  const handleFreeChangeClick = (x, y) => {
    if (CITIES.some(c => c.x === x && c.y === y)) return;
    setFreeChangePicking({ x, y });
  };
  const handleFreeChangeConfirm = (terrainKey) => {
    if (!freeChangePicking || freeChanges <= 0) return;
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
    const newMap = map.map(row => [...row]);
    newMap[freeChangePicking.y][freeChangePicking.x] = terrainKey;
    setMap(newMap);
    setFreeChanges(freeChanges - 1);
    addLog(`✎ 自由改造 (${freeChangePicking.x},${freeChangePicking.y}) → ${TERRAIN[terrainKey].name}（剩余${freeChanges - 1}次）`);
    setFreeChangePicking(null);
  };

  // 随机重roll选中的卡
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

  // 启示：升级人口知识等级
  const handleEnlighten = (fromLevel, toLevel, need) => {
    const free = population[fromLevel] - popUsage[fromLevel];
    if (free < need) {
      addLog(`⚠ 空闲${fromLevel}之人不足（需${need}，空闲${free}）`);
      return;
    }
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
    setPopulation({
      ...population,
      [fromLevel]: population[fromLevel] - need,
      [toLevel]: population[toLevel] + Math.floor(need / 2),
    });
    addLog(`✦ 启迪智慧：${need}名${fromLevel}之人 → ${Math.floor(need / 2)}名${toLevel}之人`);
  };

  // 商店交易：3个from资源换1个to资源
  const handleTrade = (fromRes, toRes) => {
    if ((resources[fromRes] || 0) < 3) {
      addLog(`⚠ ${fromRes}不足3，无法交易`);
      return;
    }
    setMapHistory([...mapHistory, { map, buildings: cityBuildings, resources, population, hand }]);
    setResources({
      ...resources,
      [fromRes]: resources[fromRes] - 3,
      [toRes]: (resources[toRes] || 0) + 1,
    });
    addLog(`⇄ 交易：${fromRes}-3 → ${toRes}+1`);
  };

  const cityStatus = CITIES.map(city => {
    // 统计辖区内每种地形的权重和
    const terrainValues = {};
    for (const key of Object.keys(TERRAIN)) {
      if (key === 'empty') continue;
      const v = cityTerrainValue(map, city, key);
      if (v > 0) terrainValues[key] = v;
    }
    const builtBuildings = cityBuildings[city.id].map(b => {
      const v = cityTerrainValue(map, city, b.terrain);
      let status;
      if (v === 0) status = 'stopped';
      else if (v < b.need) status = 'debuff';
      else status = 'ok';
      return { ...b, value: v, status };
    });
    return { ...city, terrainValues, buildings: builtBuildings };
  });

  const conflicts = useMemo(() => getClimateConflicts(map), [map]);
  const conflictSet = new Set();
  conflicts.forEach(c => { conflictSet.add(`${c.x},${c.y}`); conflictSet.add(`${c.nx},${c.ny}`); });

  const currentCityStatus = cityStatus.find(c => c.id === selectedCityId);

  // 预估下一回合资源净增量
  const netChange = useMemo(() => {
    const net = {};
    // 建筑产出
    for (const city of CITIES) {
      for (const b of cityBuildings[city.id]) {
        const v = cityTerrainValue(map, city, b.terrain);
        const match = b.output.match(/(.+?)\+(\d+)/);
        if (!match) continue;
        const res = match[1];
        let amt = parseInt(match[2]);
        if (v >= b.need) net[res] = (net[res] || 0) + amt;
        else if (v > 0) net[res] = (net[res] || 0) + Math.floor(amt / 2);
      }
    }
    // 人口消耗
    for (const [level, count] of Object.entries(population)) {
      if (count === 0) continue;
      for (const [res, amt] of Object.entries(POP_NEEDS[level])) {
        net[res] = (net[res] || 0) - amt * count;
      }
    }
    return net;
  }, [map, cityBuildings, population]);

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
          display: 'flex', alignItems: 'center',
          padding: '8px 16px', background: '#242017',
          border: '1px solid #3d3524', marginBottom: 12, flexWrap: 'wrap', gap: 10,
          flexShrink: 0,
        }}>
          <button onClick={() => setShowShop(!showShop)} style={{ ...btn(false), fontSize: 14 }}>
            {showShop ? '关闭商店' : '商店'}
          </button>
          <span style={{ color: '#9c8f72', fontSize: 15 }}>回合 {turn}</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 16, flexWrap: 'wrap' }}>
            {Object.entries(resources).map(([k, v]) => {
              const delta = netChange[k] || 0;
              return (
                <div key={k}>
                  <span style={{ color: '#9c8f72', marginRight: 4 }}>{k}</span>
                  <span style={{ color: v < 0 ? '#c25a3a' : '#c9a961', fontWeight: 600 }}>{v}</span>
                  <span style={{
                    marginLeft: 4, fontSize: 16,
                    color: delta > 0 ? '#7a9a4f' : delta < 0 ? '#c25a3a' : '#5a5140'
                  }}>
                    ({delta > 0 ? '+' : ''}{delta})
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ width: 1, height: 24, background: '#3d3524', margin: '0 4px' }} />
          <div style={{ color: '#9c8f72', fontSize: 16, letterSpacing: 1 }}>智慧等级</div>
          {['粗浅', '严肃', '深刻'].map(level => {
            const needs = POP_NEEDS[level];
            const needStr = Object.entries(needs).map(([r, a]) => `${r}×${a}`).join(' ');
            const used = popUsage[level];
            const total = population[level];
            return (
              <div key={level} style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <div>
                  <span style={{ color: LEVEL_COLOR[level], marginRight: 4 }}>{level}</span>
                  <span style={{ color: LEVEL_COLOR[level], fontWeight: 600 }}>{used}/{total}</span>
                  {unmetTurns[level] > 0 && (
                    <span style={{ color: '#c25a3a', fontSize: 16, marginLeft: 3 }}>
                      ({unmetTurns[level]}/3断供)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#5a5140' }}>需求：{needStr}</div>
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <button onClick={() => {
            setMap(makeInitialMap());
            setMapHistory([]);
            setHand(generateHand());
            setSelectedCardId(null);
            setRotation(0);
            setSelectedCityId('A');
            setCityBuildings({ A: [], B: [], C: [], D: [], E: [], F: [] });
            setResources({ 粮食: 100, 木材: 100, 铁: 150, 药草: 150, 鱼获: 150, 肉食: 150 });
            setPopulation({ 粗浅: 40, 严肃: 0, 深刻: 0 });
            setTurn(1);
            setUnmetTurns({ 粗浅: 0, 严肃: 0, 深刻: 0 });
            setUpgradeMode(false);
            setActiveRegion(null);
            setUpgradeSelections([]);
            setFreeChanges(3);
            setFreeChangeMode(false);
            setFreeChangePicking(null);
            setRerollsLeft(2);
            setRerollSelected(new Set());
            setHoverCell(null);
            addLog('━ 新局开始');
          }} style={{ ...btn(false), fontSize: 14 }}>重新开始</button>
        </div>

        {showShop && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
          }} onClick={() => setShowShop(false)}>
            <div style={{
              background: '#242017', padding: 24, border: '1px solid #3d3524',
              maxWidth: 800, width: '90%',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={h3Style}>商店 · 3换1</h3>
                <button onClick={() => setShowShop(false)} style={{ ...btn(false), padding: '4px 12px' }}>✕</button>
              </div>
              <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 12 }}>
                点击"资源A → 资源B"进行交易：消耗3个A，换1个B
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {['粮食', '木材', '铁', '药草', '鱼获', '肉食'].map(fromRes => (
                  <div key={fromRes} style={{ background: '#1a1812', padding: 8 }}>
                    <div style={{ fontSize: 16, color: '#c9a961', marginBottom: 6, fontWeight: 600 }}>
                      卖 {fromRes}
                      <span style={{ color: '#9c8f72', marginLeft: 4, fontWeight: 400 }}>
                        ({resources[fromRes] || 0})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {['粮食', '木材', '铁', '药草', '鱼获', '肉食'].filter(r => r !== fromRes).map(toRes => (
                        <button key={toRes}
                          onClick={() => handleTrade(fromRes, toRes)}
                          disabled={(resources[fromRes] || 0) < 3}
                          style={{
                            ...btn((resources[fromRes] || 0) < 3),
                            fontSize: 16, padding: '2px 4px', textAlign: 'left'
                          }}>
                          → {toRes}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr auto 400px', gap: 12, flex: 1, overflow: 'hidden' }}>
          {/* 左栏：操作面板 + 日志 */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...panel, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                        {TERRAIN[activeRegion.key].name}（{activeRegion.cells.length}格）→ {TERRAIN[upgradeTarget(activeRegion.key)].name}
                      </div>
                      <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 6 }}>
                        可升 <span style={{ color: '#c9a961' }}>{activeRegion.canUpgrade}</span> 格 · 已选 <span style={{ color: '#7a9a4f' }}>{upgradeSelections.length}</span>
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
                <div style={{ flex: 1, overflowY: 'auto' }}>
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
                    {hand.length === 0 && <div style={{ color: '#9c8f72', fontSize: 14 }}>手牌用完</div>}
                  </div>
                  {rerollSelected.size > 0 && (
                    <button onClick={handleReroll} disabled={rerollsLeft <= 0}
                      style={{ ...primaryBtn, padding: '5px 12px', fontSize: 13 }}>
                      重抽{rerollSelected.size}张（{rerollsLeft}/2）
                    </button>
                  )}
                </div>
              )}
              <div style={{ flexShrink: 0, borderTop: '1px solid #3d3524', marginTop: 'auto', paddingTop: 8, fontSize: 14, color: '#9c8f72', fontWeight: 600, lineHeight: 1.8 }}>
                <div>· 鼠标右键旋转地形卡</div>
                <div>· 点击卡片右上角 ⟳ 标记不想要的卡，可重新抽取</div>
              </div>
            </div>

            <div style={{ ...panel, marginTop: 8, flexShrink: 0, height: 180, display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ ...panel, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, width: '100%', maxWidth: 'calc(100vh - 200px)', aspectRatio: '1' }}>
                {Array.from({ length: 10 }).map((_, y) =>
                  Array.from({ length: 10 }).map((_, x) => {
                    const terrain = map[y][x];
                    const t = TERRAIN[terrain];
                    const isPreview = previewCells.some(c => c.x === x && c.y === y);
                    const prev = isPreview ? previewCells.find(c => c.x === x && c.y === y).terrain : null;
                    const city = CITIES.find(c => c.x === x && c.y === y);
                    const inSelCity = currentCityStatus && cellInCity(x, y, currentCityStatus);
                    const hasConflict = conflictSet.has(`${x},${y}`);

                    // 升级模式相关
                    const inActiveRegion = upgradeMode && activeRegion && activeRegion.cells.some(([cx,cy]) => cx === x && cy === y);
                    const isUpgradeSelection = upgradeSelections.some(([cx,cy]) => cx === x && cy === y);
                    const canUpgradeHere = upgradeMode && !city && regionMap[`${x},${y}`] !== undefined;

                    let borderStyle;
                    if (city) borderStyle = '2px solid #c9a961';
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
                        tooltip += `\n所在区域：${r.cells.length}格相连，当前可升级${r.canUpgrade}格`;
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
                          if (city) { setSelectedCityId(city.id); return; }
                          if (upgradeMode) handleUpgradeClick(x, y);
                          else if (freeChangeMode && freeChanges > 0) handleFreeChangeClick(x, y);
                          else if (canPlace) handlePlace();
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
            </div>

          </div>

          {/* 中间操作栏 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => handleEnlighten('粗浅', '严肃', 10)}
              disabled={(population.粗浅 - popUsage.粗浅) < 10}
              style={{ ...btn((population.粗浅 - popUsage.粗浅) < 10), fontSize: 13, padding: '6px 10px', whiteSpace: 'nowrap' }}>
              启迪智慧·粗浅→严肃(10→5)
            </button>
            <button onClick={() => handleEnlighten('严肃', '深刻', 6)}
              disabled={(population.严肃 - popUsage.严肃) < 6}
              style={{ ...btn((population.严肃 - popUsage.严肃) < 6), fontSize: 13, padding: '6px 10px', whiteSpace: 'nowrap' }}>
              启迪智慧·严肃→深刻(6→3)
            </button>
            <button onClick={handleNextTurn} style={{ ...primaryBtn, whiteSpace: 'nowrap' }}>下一回合 ▶</button>
          </div>

          {/* 右栏：城市面板 */}
          <div style={{ ...panel, overflowY: 'auto' }}>
            {currentCityStatus && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, color: '#c9a961', marginBottom: 6, letterSpacing: 1, fontWeight: 600 }}>
                    {currentCityStatus.name} · 辖区地形
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {Object.entries(currentCityStatus.terrainValues).length === 0 ? (
                      <div style={{ fontSize: 16, color: '#5a5140', padding: '6px 10px', gridColumn: 'span 2' }}>
                        辖区内无有效地形
                      </div>
                    ) : (
                      Object.entries(currentCityStatus.terrainValues).map(([key, v]) => (
                        <div key={key} style={{
                          padding: '6px 10px', background: '#1a1812',
                          fontSize: 16, display: 'flex', justifyContent: 'space-between',
                          borderLeft: `2px solid ${TERRAIN[key].color}`,
                        }}>
                          <span style={{ color: '#e8dfc8' }}>
                            {TERRAIN[key].name}
                            {TERRAIN[key].tier >= 2 && <span style={{ color: '#9c8f72', fontSize: 16, marginLeft: 3 }}>{TERRAIN[key].tier === 2 ? 'II' : 'III'}</span>}
                          </span>
                          <span style={{ color: '#c9a961', fontWeight: 600 }}>{v}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 6, letterSpacing: 1 }}>
                    已建造 · {currentCityStatus.buildings.length}
                  </div>
                  {currentCityStatus.buildings.length === 0 ? (
                    <div style={{ fontSize: 16, color: '#5a5140', padding: '8px 10px', background: '#1a1812' }}>
                      此城市尚未建造任何建筑
                    </div>
                  ) : (
                    currentCityStatus.buildings.map(b => (
                      <div key={b.id} style={{
                        padding: '8px 10px', background: '#1a1812', marginBottom: 3,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderLeft: `3px solid ${b.status === 'ok' ? '#7a9a4f' : b.status === 'debuff' ? '#c9a961' : '#c25a3a'}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 16, color: '#e8dfc8' }}>{b.name}</div>
                          <div style={{ fontSize: 16, color: '#9c8f72' }}>
                            {b.output} ·
                            {b.status === 'ok' && <span style={{ color: '#7a9a4f' }}> 满负荷</span>}
                            {b.status === 'debuff' && <span style={{ color: '#c9a961' }}> 产能减半 · {TERRAIN[b.terrain].name}{b.value}/{b.need}</span>}
                            {b.status === 'stopped' && <span style={{ color: '#c25a3a' }}> 停产 · 无{TERRAIN[b.terrain].name}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDemolish(selectedCityId, b.id)}
                          style={{ ...btn(false), padding: '3px 8px', fontSize: 13 }}>拆</button>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 16, color: '#9c8f72', marginBottom: 6, letterSpacing: 1 }}>
                    可建造
                  </div>
                  {BUILDINGS.map(b => {
                    const already = currentCityStatus.buildings.some(x => x.id === b.id);
                    const v = cityTerrainValue(map, currentCityStatus, b.terrain);
                    const free = population[b.unlock.level] - popUsage[b.unlock.level];
                    const unlocked = free >= b.unlock.count;
                    const willWork = v >= b.need;
                    return (
                      <div key={b.id} style={{
                        padding: '8px 10px', background: '#1a1812', marginBottom: 3,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        opacity: already ? 0.4 : 1,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, color: '#e8dfc8', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {b.name}
                            <span style={{
                              fontSize: 16,
                              color: willWork ? '#7a9a4f' : v > 0 ? '#c9a961' : '#c25a3a',
                            }}>
                              需{TERRAIN[b.terrain].name}≥{b.need}（当前{v}）
                            </span>
                          </div>
                          <div style={{ fontSize: 16, color: '#9c8f72' }}>
                            {b.output} · 占用 {b.unlock.count} 名<span style={{ color: LEVEL_COLOR[b.unlock.level] }}>{b.unlock.level}</span>之人（<span style={{ color: unlocked ? LEVEL_COLOR[b.unlock.level] : '#c25a3a' }}>空闲{free}</span>）
                          </div>
                        </div>
                        <button
                          onClick={() => handleBuild(selectedCityId, b)}
                          disabled={already || !unlocked}
                          style={{ ...btn(already || !unlocked), padding: '4px 10px', fontSize: 13 }}
                        >
                          {already ? '已建' : unlocked ? '建造' : '人手不足'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
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
