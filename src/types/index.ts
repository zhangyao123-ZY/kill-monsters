// 游戏类型定义

// 位置接口
export interface Position {
  x: number;
  y: number;
}

// 尺寸接口
export interface Size {
  width: number;
  height: number;
}

// 碰撞体接口
export interface Collider extends Position, Size {
  isSolid: boolean;
}

// 实体基类
export interface Entity extends Collider {
  id: string;
  type: 'player' | 'monster' | 'npc' | 'obstacle';
  health: number;
  maxHealth: number;
  level: number;
  update: (deltaTime: number) => void;
  draw: (ctx: CanvasRenderingContext2D, camera: Position) => void;
  takeDamage: (amount: number) => boolean; // 返回是否死亡
}

// 角色接口
export interface Player extends Entity {
  type: 'player';
  attack: number;
  defense: number;
  experience: number;
  experienceToNextLevel: number;
  skills: Skill[];
  equipment: Equipment[];
  // 添加缺失的inventory属性
  inventory: Equipment[];
  move: (dx: number, dy: number, obstacles: Collider[]) => void;
  gainExperience: (amount: number) => void;
  levelUp: () => void;
  learnSkill: (skill: Skill) => void;
  addEquipment: (equipment: Equipment) => void;
  // 添加攻击相关方法
  canAttack: () => boolean;
  performAttack: () => number;
}

// 怪物接口
export interface Monster extends Entity {
  type: 'monster';
  attack: number;
  defense: number;
  experienceReward: number;
  isElite: boolean;
  isBoss: boolean;
  target?: Player;
  move: (deltaTime: number, obstacles: Collider[]) => void;
  attackTarget: (target: Player) => void;
  dropLoot: () => Equipment[];
}

// 障碍物接口
export interface Obstacle extends Entity {
  type: 'obstacle';
  obstacleType: 'tree' | 'rock' | 'wall';
}

// 技能接口
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'aura' | 'projectile' | 'buff' | 'debuff';
  level: number;
  maxLevel: number;
  cooldown: number;
  currentCooldown: number;
  effect: (target: Entity | null) => void;
  update: (deltaTime: number, owner: Player) => void;
}

// 装备接口
export interface Equipment {
  id: string;
  name: string;
  description: string;
  type: 'WEAPON' | 'ARMOR' | 'ACCESSORY';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats: {
    attack?: number;
    defense?: number;
    health?: number;
    attackSpeed?: number;
    movementSpeed?: number;
  };
  isEquipped: boolean;
  specialEffect?: string;
  // 添加缺失的方法定义
  applyEffect?: (player: Player) => void;
  removeEffect?: (player: Player) => void;
  getRarityColor?: () => string;
  getRarityMultiplier?: () => number;
  getRarityLevel?: () => number;
}

// 游戏状态接口
export interface GameState {
  player: Player;
  monsters: Monster[];
  obstacles: Obstacle[];
  equipment: Equipment[];
  keys: {
    [key: string]: boolean;
  };
  camera: Position;
  score: number;
  gameOver: boolean;
  lastMonsterCount: number;
}

// 技能类型常量
export const SKILL_TYPES = {
  AURA: 'aura',
  PROJECTILE: 'projectile',
  BUFF: 'buff',
  DEBUFF: 'debuff'
} as const;

// 装备类型常量
export const EQUIPMENT_TYPES = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  ACCESSORY: 'ACCESSORY'
} as const;

// 装备稀有度常量
// 导出常量
export const RARITY_TYPES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
} as const;

// 保留原有的RARITY_LEVELS作为别名
export const RARITY_LEVELS = RARITY_TYPES;
// 障碍物类型常量
export const OBSTACLE_TYPES = {
  TREE: 'tree',
  ROCK: 'rock',
  WALL: 'wall'
} as const;