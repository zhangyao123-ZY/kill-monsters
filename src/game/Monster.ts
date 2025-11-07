import type { Monster as IMonster, Position, Collider, Player, Equipment } from '../types';
import { generateId, random, randomInt, distance, getDirectionTowards, willCollide, hasLineOfSight } from '../utils/gameUtils';
import { SpriteLoader } from './SpriteLoader';

// 怪物类型定义
interface MonsterType {
  name: string;
  baseHealth: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseExperience: number;
  color: string;
  size: { min: number; max: number };
}

// 预设怪物类型
const MONSTER_TYPES: MonsterType[] = [
  {
    name: '小怪',
    baseHealth: 50,
    baseAttack: 5,
    baseDefense: 2,
    baseSpeed: 150,
    baseExperience: 10,
    color: '#FF6B6B',
    size: { min: 30, max: 40 }
  },
  {
    name: '精英怪',
    baseHealth: 200,
    baseAttack: 20,
    baseDefense: 8,
    baseSpeed: 120,
    baseExperience: 50,
    color: '#FFD700',
    size: { min: 40, max: 60 }
  },
  {
    name: 'Boss',
    baseHealth: 1000,
    baseAttack: 50,
    baseDefense: 20,
    baseSpeed: 80,
    baseExperience: 200,
    color: '#9C27B0',
    size: { min: 80, max: 120 }
  }
];

// 怪物类
export class Monster implements IMonster {
  id: string;
  type: 'monster' = 'monster';
  x: number;
  y: number;
  width: number;
  height: number;
  isSolid: boolean;
  health: number;
  maxHealth: number;
  level: number;
  attack: number;
  defense: number;
  experienceReward: number;
  isElite: boolean;
  isBoss: boolean;
  target?: Player;
  
  // 怪物属性
  private monsterType: MonsterType;
  private moveSpeed: number;
  private attackRange: number;
  private attackSpeed: number;
  private lastAttackTime: number;
  private aggroRange: number;
  private wanderDirection: { x: number; y: number };
  private wanderTimer: number;
  private wanderInterval: number;
  
  constructor(x: number, y: number, level: number, isElite: boolean = false, isBoss: boolean = false) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.isSolid = true;
    this.level = level;
    this.isElite = isElite;
    this.isBoss = isBoss;
    
    // 根据类型选择怪物模板
    let templateIndex = 0;
    if (isBoss) templateIndex = 2;
    else if (isElite) templateIndex = 1;
    
    const selectedType = MONSTER_TYPES[templateIndex] || MONSTER_TYPES[0];
      // 确保类型安全，MONSTER_TYPES至少有一个元素
      if (!selectedType) {
        // 这种情况理论上不应该发生，但为了类型安全还是加上
        throw new Error('Monster type not found');
      }
      this.monsterType = selectedType;
    
    // 根据等级和类型计算属性
    const levelMultiplier = 1 + (level - 1) * 0.2;
    const eliteMultiplier = isElite ? 2 : 1;
    const bossMultiplier = isBoss ? 5 : 1;
    const typeMultiplier = eliteMultiplier * bossMultiplier;
    
    // 设置尺寸
    const sizeVariation = random(this.monsterType.size.min, this.monsterType.size.max);
    this.width = sizeVariation;
    this.height = sizeVariation * 1.2;
    
    // 设置属性
    this.maxHealth = Math.floor(this.monsterType.baseHealth * levelMultiplier * typeMultiplier);
    this.health = this.maxHealth;
    this.attack = Math.floor(this.monsterType.baseAttack * levelMultiplier * typeMultiplier);
    this.defense = Math.floor(this.monsterType.baseDefense * levelMultiplier * typeMultiplier);
    this.experienceReward = Math.floor(this.monsterType.baseExperience * levelMultiplier * typeMultiplier);
    
    // 设置行为参数
    this.moveSpeed = this.monsterType.baseSpeed;
    this.attackRange = 60;
    this.attackSpeed = isBoss ? 2000 : (isElite ? 1500 : 1000);
    this.lastAttackTime = 0;
    this.aggroRange = isBoss ? 400 : (isElite ? 300 : 200);
    this.wanderDirection = { x: random(-1, 1), y: random(-1, 1) };
    this.wanderTimer = 0;
    this.wanderInterval = random(2000, 5000); // 2-5秒改变一次游荡方向
  }
  
  // 更新怪物状态
  update(deltaTime: number): void {
    // 更新游荡计时器
    this.wanderTimer += deltaTime * 1000;
    if (this.wanderTimer >= this.wanderInterval) {
      this.wanderDirection = { x: random(-1, 1), y: random(-1, 1) };
      this.wanderTimer = 0;
      this.wanderInterval = random(2000, 5000);
    }
    
    // 如果有目标，则追击
    if (this.target) {
      const targetDistance = distance(this, this.target);
      
      // 如果目标超出仇恨范围，则丢失目标
      if (targetDistance > this.aggroRange) {
        this.target = undefined;
      } else if (targetDistance > this.attackRange) {
        // 如果在攻击范围外，则移动接近目标
        this.moveTowardsTarget(deltaTime);
      } else {
        // 如果在攻击范围内，则攻击目标
        this.attackTarget(this.target);
      }
    }
  }
  
  // 绘制怪物
  draw(ctx: CanvasRenderingContext2D, camera: Position): void {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    const spriteLoader = SpriteLoader.getInstance();
    
    ctx.save();
    
    // 根据怪物类型选择精灵
    let spriteKey = 'monster_normal';
    if (this.isElite) {
      spriteKey = 'monster_elite';
    } else if (this.isBoss) {
      spriteKey = 'monster_boss';
    }
    
    // 获取并绘制精灵
    const sprite = spriteLoader.getSprite(spriteKey);
    if (sprite) {
      // 计算缩放比例以适应怪物大小
      const scaleX = this.width / sprite.width;
      const scaleY = this.height / sprite.height;
      
      // 绘制精灵，居中显示
      ctx.drawImage(
        sprite, 
        screenX, 
        screenY, 
        sprite.width * scaleX, 
        sprite.height * scaleY
      );
    } else {
      // 后备绘制：如果精灵未加载，使用基本形状
      ctx.fillStyle = this.monsterType.color;
      ctx.fillRect(screenX, screenY, this.width, this.height);
    }
    
    // 绘制怪物等级
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${this.level}`, screenX + this.width / 2, screenY + this.height + 15);
    
    // 绘制血条
    this.drawHealthBar(ctx, screenX, screenY - 20);
    
    ctx.restore();
  }
  
  // 绘制血条
  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const barWidth = this.width;
    const barHeight = 5;
    const healthPercent = this.health / this.maxHealth;
    
    // 血条背景
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // 当前血量
    ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
  }
  
  // 移动向目标
  private moveTowardsTarget(deltaTime: number): void {
    if (!this.target) return;
    
    const direction = getDirectionTowards(this, this.target);
    const moveX = direction.x * this.moveSpeed * deltaTime;
    const moveY = direction.y * this.moveSpeed * deltaTime;
    
    this.x += moveX;
    this.y += moveY;
  }
  
  // 移动（带碰撞检测）
  move(deltaTime: number, obstacles: Collider[]): void {
    let moveX = 0;
    let moveY = 0;
    
    if (this.target) {
      // 有目标时追击
      const direction = getDirectionTowards(this, this.target);
      moveX = direction.x * this.moveSpeed * deltaTime;
      moveY = direction.y * this.moveSpeed * deltaTime;
    } else {
      // 无目标时随机游荡
      moveX = this.wanderDirection.x * (this.moveSpeed * 0.5) * deltaTime;
      moveY = this.wanderDirection.y * (this.moveSpeed * 0.5) * deltaTime;
    }
    
    // 检查碰撞并移动
    if (!willCollide(this, moveX, 0, obstacles)) {
      this.x += moveX;
    } else {
      this.wanderDirection.x *= -0.5; // 反弹部分方向
    }
    
    if (!willCollide(this, 0, moveY, obstacles)) {
      this.y += moveY;
    } else {
      this.wanderDirection.y *= -0.5; // 反弹部分方向
    }
  }
  
  // 攻击目标
  attackTarget(target: Player): void {
    const currentTime = Date.now();
    
    if (currentTime - this.lastAttackTime >= this.attackSpeed) {
      this.lastAttackTime = currentTime;
      
      // 检查是否在攻击范围内
      const targetDistance = distance(this, target);
      if (targetDistance <= this.attackRange) {
        // 计算实际伤害
        let damage = this.attack;
        
        // Boss有几率造成暴击
        if (this.isBoss && Math.random() < 0.1) {
          damage *= 2;
          console.log('怪物暴击！', damage);
        }
        
        // 应用防御减免
        const damageDealt = Math.max(1, damage - target.defense * 0.5);
        
        console.log(`怪物攻击: ${damageDealt}点伤害`);
        target.takeDamage(damageDealt);
      }
    }
  }
  
  // 受到伤害
  takeDamage(amount: number): boolean {
    // 计算防御减免
    const damageReduction = Math.min(this.defense, amount * 0.5);
    const actualDamage = Math.max(1, amount - damageReduction);
    
    this.health -= actualDamage;
    
    return this.health <= 0;
  }
  
  // 设置目标
  setTarget(player: Player): void {
    const dist = distance(this, player);
    if (dist <= this.aggroRange) {
      // 检查是否有视线
      const obstacles: Collider[] = []; // 需要传入实际的障碍物列表
      if (hasLineOfSight(this, player, obstacles)) {
        this.target = player;
      }
    }
  }
  
  // 生成装备属性
  private generateLootStats(equipmentType: string, rarity: string): any {
    const baseStat = this.level * 5;
    const rarityMultiplier = {
      COMMON: 1,
      UNCOMMON: 1.5,
      RARE: 2,
      EPIC: 3,
      LEGENDARY: 5
    }[rarity] || 1;
    
    const stats: any = {};
    
    switch (equipmentType) {
      case 'WEAPON':
        stats.attack = Math.floor(baseStat * rarityMultiplier);
        break;
      case 'ARMOR':
        stats.defense = Math.floor(baseStat * rarityMultiplier);
        stats.maxHealth = Math.floor(baseStat * 2 * rarityMultiplier);
        break;
      case 'ACCESSORY':
        stats.criticalRate = Math.floor(baseStat * 0.1 * rarityMultiplier);
        stats.lifesteal = Math.floor(baseStat * 0.05 * rarityMultiplier);
        break;
    }
    
    return stats;
  }
  
  // 掉落装备
  dropLoot(): Equipment[] {
    const loot: Equipment[] = [];
    
    // 计算掉落概率
    const dropChance = this.isBoss ? 0.8 : this.isElite ? 0.5 : 0.2;
    
    if (Math.random() < dropChance) {
      // 生成装备类型（确保大写）
      const equipmentTypes = ['WEAPON', 'ARMOR', 'ACCESSORY'];
      const equipmentType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
      
      // 生成稀有度
      const rarityChance = Math.random();
      let rarity: string;
      if (this.isBoss) {
        rarity = rarityChance < 0.4 ? 'EPIC' : 'LEGENDARY';
      } else if (this.isElite) {
        rarity = rarityChance < 0.6 ? 'RARE' : 'EPIC';
      } else {
        rarity = rarityChance < 0.5 ? 'COMMON' : rarityChance < 0.8 ? 'UNCOMMON' : 'RARE';
      }
      
      // 生成装备名称
      const baseNames = {
        WEAPON: ['剑', '斧', '杖', '匕首', '弓'],
        ARMOR: ['头盔', '胸甲', '护腿', '战靴', '盾牌'],
        ACCESSORY: ['戒指', '项链', '护身符', '腰带', '手镯']
      };
      
      const prefixes = {
        COMMON: '',
        UNCOMMON: ['坚固的', '锋利的', '精致的'],
        RARE: ['稀有的', '闪耀的', '优质的'],
        EPIC: ['史诗级', '传说的', '远古的'],
        LEGENDARY: ['神话', '无敌', '永恒']
      };
      
      const baseName = baseNames[equipmentType as keyof typeof baseNames][Math.floor(Math.random() * 5)];
      const prefix = rarity !== 'COMMON' 
        ? prefixes[rarity as keyof typeof prefixes][Math.floor(Math.random() * 3)]
        : '';
      const name = (prefix ? `${prefix}${baseName}` : baseName) || '未知装备';
      
      // 生成装备属性
      const stats = this.generateLootStats(equipmentType!, rarity);
      
      loot.push({
        id: generateId(),
        name,
        description: `一件${prefix}${baseName}，提供强大的属性加成。`,
        type: equipmentType as 'WEAPON' | 'ARMOR' | 'ACCESSORY',
        rarity: rarity.toLowerCase() as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
        stats,
        isEquipped: false
      });
    }
    
    return loot;
  }
  
  // 获取怪物信息
  getInfo(): string {
    return `${this.monsterType.name} Lv.${this.level} (${this.health}/${this.maxHealth} HP)`;
  }
}

// 怪物生成器类
export class MonsterSpawner {
  private minLevel: number;
  private maxLevel: number;
  private eliteChance: number;
  private bossChance: number;
  
  constructor(minLevel: number = 1) {
    this.minLevel = minLevel;
    this.maxLevel = minLevel + 2;
    this.eliteChance = 0.1; // 10%几率生成精英怪
    this.bossChance = 0.02; // 2%几率生成BOSS
  }
  
  // 根据玩家等级更新生成参数
  updateDifficulty(playerLevel: number): void {
    this.minLevel = Math.max(1, playerLevel - 1);
    this.maxLevel = playerLevel + 3;
    
    // 随着玩家等级提升，精英和BOSS的生成几率略微增加
    this.eliteChance = Math.min(0.2, 0.1 + playerLevel * 0.005);
    this.bossChance = Math.min(0.05, 0.02 + playerLevel * 0.001);
  }
  
  // 生成单个怪物
  spawnMonster(x: number, y: number): Monster {
    const isBoss = Math.random() < this.bossChance;
    const isElite = !isBoss && Math.random() < this.eliteChance;
    
    // 生成等级
    let level;
    if (isBoss) {
      // BOSS等级比玩家高1-2级
      level = this.maxLevel + randomInt(0, 2);
    } else {
      level = randomInt(this.minLevel, this.maxLevel);
    }
    
    return new Monster(x, y, level, isElite, isBoss);
  }
  
  // 批量生成怪物
  spawnMonsters(position: Position, count: number, avoidRadius: number = 200): Monster[] {
    const monsters: Monster[] = [];
    
    for (let i = 0; i < count; i++) {
      // 生成远离指定位置的随机点
      const angle = random(0, Math.PI * 2);
      const distance = avoidRadius + random(100, 500);
      const x = position.x + Math.cos(angle) * distance;
      const y = position.y + Math.sin(angle) * distance;
      
      monsters.push(this.spawnMonster(x, y));
    }
    
    return monsters;
  }
}
