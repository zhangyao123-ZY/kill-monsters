import type { Equipment, Player } from '../types';
import { EQUIPMENT_TYPES, RARITY_TYPES } from '../types';
import { generateId, random, randomInt } from '../utils/gameUtils';



// 装备基础类
class BaseEquipment implements Equipment {
  id: string;
  name: string;
  type: keyof typeof EQUIPMENT_TYPES;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // 修改为与接口兼容的类型
  level: number;
  stats: {
    attack?: number;
    defense?: number;
    maxHealth?: number;
    criticalRate?: number;
    lifesteal?: number;
    [key: string]: number | undefined;
  };
  description: string;
  isEquipped: boolean; // 添加isEquipped属性声明
  
  constructor(
    name: string,
    type: keyof typeof EQUIPMENT_TYPES,
    rarity: string, // 接受字符串类型
    level: number = 1
  ) {
    this.id = generateId();
    this.name = name;
    this.type = type;
    this.rarity = rarity.toLowerCase() as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // 确保存储为小写
    this.level = level;
    this.stats = {};
    this.description = this.generateDescription();
    this.isEquipped = false; // 在构造函数中初始化
  }
  
  // 生成装备描述
  private generateDescription(): string {
    const rarityNames: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    };
    
    let desc = `${rarityNames[this.rarity] || '未知'} ${this.name}`;
    
    // 添加属性描述
    if (Object.keys(this.stats).length > 0) {
      desc += ' 属性:';
      for (const [stat, value] of Object.entries(this.stats)) {
        if (typeof value === 'number' && value > 0) {
          const statNames: Record<string, string> = {
            attack: '攻击力',
            defense: '防御力',
            maxHealth: '最大生命值',
            criticalRate: '暴击率',
            lifesteal: '生命偷取'
          };
          desc += ` ${statNames[stat] || stat}+${value}`;
        }
      }
    }
    
    return desc;
  }
  
  // 应用装备效果到玩家
  applyEffect(player: Player): void {
    // 应用装备效果到玩家
    for (const [stat, value] of Object.entries(this.stats)) {
      if (typeof value !== 'number') continue;
      
      switch (stat) {
        case 'attack':
          if ('baseAttack' in player) {
            (player as any).baseAttack += value;
          } else {
            player.attack += value;
          }
          break;
        case 'defense':
          if ('baseDefense' in player) {
            (player as any).baseDefense += value;
          } else {
            player.defense += value;
          }
          break;
        case 'maxHealth':
          player.maxHealth += value;
          player.health = Math.min(player.health + value, player.maxHealth);
          break;
        case 'criticalRate':
          if ('criticalRate' in player) {
            (player as any).criticalRate += value;
          }
          break;
        case 'lifesteal':
          if ('lifesteal' in player) {
            (player as any).lifesteal += value;
          }
          break;
      }
    }
  }

  removeEffect(player: Player): void {
    // 从玩家身上移除装备效果
    for (const [stat, value] of Object.entries(this.stats)) {
      if (typeof value !== 'number') continue;
      
      switch (stat) {
        case 'attack':
          if ('baseAttack' in player) {
            (player as any).baseAttack -= value;
          } else {
            player.attack -= value;
          }
          break;
        case 'defense':
          if ('baseDefense' in player) {
            (player as any).baseDefense -= value;
          } else {
            player.defense -= value;
          }
          break;
        case 'maxHealth':
          player.maxHealth -= value;
          player.health = Math.max(1, player.health - value);
          break;
        case 'criticalRate':
          if ('criticalRate' in player) {
            (player as any).criticalRate -= value;
          }
          break;
        case 'lifesteal':
          if ('lifesteal' in player) {
            (player as any).lifesteal -= value;
          }
          break;
      }
    }
  }

  getRarityColor(): string {
    const rarityColors: Record<string, string> = {
      common: '#FFFFFF',
      uncommon: '#4CAF50',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FFD700'
    };
    
    return rarityColors[this.rarity] || '#FFFFFF';
  }
  
  // 添加缺失的方法定义
  getRarityMultiplier(): number {
    // 暂时返回基础值，将在prototype中被覆盖
    return 1;
  }
  
  getRarityLevel(): number {
    // 暂时返回基础值，将在prototype中被覆盖
    return 0;
  }
}

// 武器类装备
class Weapon extends BaseEquipment {
  constructor(name: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', level: number) {
    super(name, EQUIPMENT_TYPES.WEAPON, rarity as keyof typeof RARITY_TYPES, level);
    this.generateWeaponStats();
  }
  
  private generateWeaponStats(): void {
    // 基于稀有度和等级生成武器属性
    const rarityMultiplier = this.getRarityMultiplier();
    const levelMultiplier = 1 + (this.level - 1) * 0.1;
    
    // 武器主要加攻击力
    const baseAttack = randomInt(10, 30);
    this.stats.attack = Math.floor(baseAttack * rarityMultiplier * levelMultiplier);
    
    // 高级武器可能有暴击率
    if (this.rarity >= RARITY_TYPES.RARE) {
      this.stats.criticalRate = random(0.02, 0.05) * rarityMultiplier;
    }
  }
}

// 防具类装备
class Armor extends BaseEquipment {
  constructor(name: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', level: number) {
    super(name, EQUIPMENT_TYPES.ARMOR, rarity as keyof typeof RARITY_TYPES, level);
    this.generateArmorStats();
  }
  
  private generateArmorStats(): void {
    const rarityMultiplier = this.getRarityMultiplier();
    const levelMultiplier = 1 + (this.level - 1) * 0.1;
    
    // 防具主要加防御力和生命值
    const baseDefense = randomInt(5, 15);
    const baseHealth = randomInt(20, 50);
    
    this.stats.defense = Math.floor(baseDefense * rarityMultiplier * levelMultiplier);
    this.stats.maxHealth = Math.floor(baseHealth * rarityMultiplier * levelMultiplier);
  }
}

// 饰品类装备
class Accessory extends BaseEquipment {
  constructor(name: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', level: number) {
    super(name, EQUIPMENT_TYPES.ACCESSORY, rarity as keyof typeof RARITY_TYPES, level);
    this.generateAccessoryStats();
  }
  
  private generateAccessoryStats(): void {
    const rarityMultiplier = this.getRarityMultiplier();
    const levelMultiplier = 1 + (this.level - 1) * 0.1;
    
    // 饰品可以加各种属性
    const statOptions = [
      () => { this.stats.attack = Math.floor(randomInt(5, 15) * rarityMultiplier * levelMultiplier); },
      () => { this.stats.defense = Math.floor(randomInt(3, 10) * rarityMultiplier * levelMultiplier); },
      () => { this.stats.maxHealth = Math.floor(randomInt(15, 40) * rarityMultiplier * levelMultiplier); },
      () => { this.stats.criticalRate = random(0.01, 0.05) * rarityMultiplier; },
      () => { this.stats.lifesteal = random(0.01, 0.04) * rarityMultiplier; }
    ];
    
    // 根据稀有度决定属性数量
    const statCount = Math.min(1 + this.getRarityLevel(), statOptions.length);
    
    // 随机选择属性
    const selectedStats = [...statOptions].sort(() => Math.random() - 0.5).slice(0, statCount);
    selectedStats.forEach(statGen => statGen());
  }
}

// 装备工厂类
class EquipmentFactory {
  // 武器名称列表
  private weaponNames = [
    '木剑', '铁剑', '钢剑', '精钢剑', '玄铁剑',
    '短剑', '长剑', '重剑', '巨剑', '双刃剑',
    '法杖', '魔杖', '魔法书', '水晶球', '符文剑',
    '火焰剑', '冰霜剑', '雷电剑', '圣光剑', '暗影剑'
  ];
  
  // 防具名称列表
  private armorNames = [
    '布甲', '皮甲', '铁甲', '钢甲', '板甲',
    '头盔', '胸甲', '护肩', '护腿', '战靴',
    '魔法袍', '法师帽', '守护者铠甲', '龙鳞甲', '圣衣'
  ];
  
  // 饰品名称列表
  private accessoryNames = [
    '戒指', '项链', '耳环', '手镯', '护符',
    '宝石', '徽章', '符文', '吊坠', '纪念品',
    '力量之戒', '守护之符', '生命项链', '幸运耳环', '魔法徽章'
  ];
  
  // 生成随机装备
  generateRandomEquipment(playerLevel: number, isBossDrop: boolean = false): Equipment {
    const rarity = this.generateRarity(isBossDrop);
    const equipmentLevel = Math.floor(playerLevel * (0.8 + Math.random() * 0.4));
    const equipmentType = this.getRandomEquipmentType();
    const name = this.getRandomEquipmentName(equipmentType);
    
    // 转换稀有度为小写以匹配Equipment接口
    const rarityLower = rarity.toLowerCase() as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    
    switch (equipmentType) {
      case 'WEAPON':
        return new Weapon(name, rarityLower, equipmentLevel);
      case 'ARMOR':
        return new Armor(name, rarityLower, equipmentLevel);
      case 'ACCESSORY':
        return new Accessory(name, rarityLower, equipmentLevel);
      default:
        return new Weapon(name, rarityLower, equipmentLevel);
    }
  }
  
  // 生成稀有度
  private generateRarity(isBossDrop: boolean): keyof typeof RARITY_TYPES {
    // 根据是否为Boss掉落调整权重
    const weights = {
      COMMON: isBossDrop ? 0 : 60,
      UNCOMMON: isBossDrop ? 10 : 30,
      RARE: isBossDrop ? 30 : 8,
      EPIC: isBossDrop ? 40 : 2,
      LEGENDARY: isBossDrop ? 20 : 0
    };
    
    // 内联的加权随机函数
    const weightedRandom = (weights: Record<string, number>): string => {
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      let randomValue = Math.random() * totalWeight;
      
      for (const [key, weight] of Object.entries(weights)) {
        randomValue -= weight;
        if (randomValue <= 0) {
          return key;
        }
      }
      
      // 确保返回字符串类型，避免undefined
      return Object.keys(weights)[0] || 'COMMON';
    };
    
    return weightedRandom(weights) as keyof typeof RARITY_TYPES;
  }
  
  // 获取随机装备类型
  private getRandomEquipmentType(): keyof typeof EQUIPMENT_TYPES {
    const types = Object.keys(EQUIPMENT_TYPES) as (keyof typeof EQUIPMENT_TYPES)[];
    return types[Math.floor(Math.random() * types.length)] ?? 'WEAPON'; // 添加nullish合并操作符
  }
  
  // 获取随机装备名称 - 移除未使用的rarity参数
  private getRandomEquipmentName(type: keyof typeof EQUIPMENT_TYPES): string {
    let baseName = '';
    
    switch (type) {
      case 'WEAPON':
        baseName = this.weaponNames[Math.floor(Math.random() * this.weaponNames.length)] || '木剑';
        break;
      case 'ARMOR':
        baseName = this.armorNames[Math.floor(Math.random() * this.armorNames.length)] || '布甲';
        break;
      case 'ACCESSORY':
        baseName = this.accessoryNames[Math.floor(Math.random() * this.accessoryNames.length)] || '戒指';
        break;
      default:
        baseName = '木剑';
    }
    
    return baseName;
  }
}

// 装备管理器
class EquipmentManager {
  private equipmentFactory: EquipmentFactory;
  
  constructor() {
    this.equipmentFactory = new EquipmentFactory();
  }
  
  // 生成BOSS掉落的装备
  generateBossDrop(playerLevel: number): Equipment {
    return this.equipmentFactory.generateRandomEquipment(playerLevel, true);
  }
  
  // 生成精英怪掉落的装备
  generateEliteDrop(playerLevel: number): Equipment | null {
    // 精英怪有30%概率掉落装备
    if (Math.random() < 0.3) {
      return this.equipmentFactory.generateRandomEquipment(playerLevel, false);
    }
    return null;
  }
  
  // 检查装备冲突（同一类型是否已装备）
  checkEquipmentConflict(player: Player, equipment: Equipment): boolean {
    for (const equipped of player.equipment) {
      if (equipped.type === equipment.type) {
        return true;
      }
    }
    return false;
  }
  
  // 装备物品到玩家
  equipToPlayer(player: Player, equipment: Equipment): boolean {
    // 如果有同类型装备，先卸载
    const oldEquipment = player.equipment.find(eq => eq.type === equipment.type);
    if (oldEquipment) {
      oldEquipment.removeEffect?.(player); // 添加可选链操作符
      player.inventory.push(oldEquipment);
      player.equipment = player.equipment.filter(eq => eq.id !== oldEquipment.id);
    }
    
    // 装备新物品
    if (equipment.applyEffect) {
      equipment.applyEffect(player); // 添加检查
    }
    player.equipment.push(equipment);
    equipment.isEquipped = true;
    
    return true;
  }
  
  // 从玩家卸下装备
  unequipFromPlayer(player: Player, equipment: Equipment): boolean {
    const index = player.equipment.indexOf(equipment);
    if (index >= 0) {
      equipment.removeEffect?.(player); // 添加可选链操作符
      player.equipment.splice(index, 1);
      player.inventory.push(equipment);
      equipment.isEquipped = false;
      return true;
    }
    return false;
  }
}

// 全局装备管理器实例
export const equipmentManager = new EquipmentManager();

// 为BaseEquipment类添加辅助方法
BaseEquipment.prototype.getRarityMultiplier = function() {
  const multipliers: Record<string, number> = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    epic: 3,
    legendary: 5
  };
  return multipliers[this.rarity] || 1;
};

BaseEquipment.prototype.getRarityLevel = function() {
  const levels: Record<string, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4
  };
  return levels[this.rarity] || 0;
};

// 简单的加权随机函数实现
