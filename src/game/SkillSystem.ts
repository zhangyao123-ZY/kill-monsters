import type { Skill, Player, Monster } from '../types';
import { generateId, distance } from '../utils/gameUtils';

// 技能基础类
class BaseSkill implements Skill {
  id: string;
  name: string;
  description: string;
  type: 'aura' | 'projectile' | 'buff' | 'debuff';
  level: number;
  maxLevel: number;
  cooldown: number;
  currentCooldown: number;
  
  constructor(
    name: string,
    description: string,
    type: 'aura' | 'projectile' | 'buff' | 'debuff',
    maxLevel: number = 10,
    cooldown: number = 0
  ) {
    this.id = generateId();
    this.name = name;
    this.description = description;
    this.type = type;
    this.level = 1;
    this.maxLevel = maxLevel;
    this.cooldown = cooldown;
    this.currentCooldown = 0;
  }
  
  // 基础效果（子类需要重写）
  effect(_target: any | null): void {
    // 基础实现，子类重写
  }
  
  // 更新技能状态
  update(deltaTime: number, _owner: Player): void {
    // 更新冷却时间
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime;
      if (this.currentCooldown < 0) this.currentCooldown = 0;
    }
  }
  
  // 检查技能是否可以使用
  canUse(): boolean {
    return this.currentCooldown <= 0;
  }
  
  // 触发技能冷却
  triggerCooldown(): void {
    this.currentCooldown = this.cooldown;
  }
  
  // 获取技能等级描述
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel}`;
  }
}

// 光环技能 - 增加杀怪经验
export class ExperienceAuraSkill extends BaseSkill {
  private experienceBonus: number;
  
  constructor() {
    super(
      '经验光环',
      '增加杀怪获得的经验值',
      'aura',
      10
    );
    this.experienceBonus = 0.1; // 初始10%加成
  }
  
  effect(_target: any | null): void {
    // 光环技能通过其他方式生效，这里不直接触发
  }
  
  update(deltaTime: number, _owner: Player): void {
    super.update(deltaTime, _owner);
    // 光环技能持续生效
  }
  
  // 获取经验加成百分比
  getExperienceBonus(): number {
    return this.experienceBonus * this.level;
  }
  
  getLevelDescription(): string {
    const bonus = Math.round(this.getExperienceBonus() * 100);
    return `${this.name} Lv.${this.level}/${this.maxLevel} (+${bonus}% 经验)`;
  }
}

// 光环技能 - 吸血
export class LifestealAuraSkill extends BaseSkill {
  private lifestealPercent: number;
  
  constructor() {
    super(
      '生命窃取光环',
      '攻击时吸取生命值',
      'aura',
      10
    );
    this.lifestealPercent = 0.05; // 初始5%吸血
  }
  
  effect(_target: any | null): void {
    // 光环技能通过其他方式生效
  }
  
  // 处理吸血效果
  applyLifesteal(owner: Player, damage: number): void {
    const healAmount = damage * this.lifestealPercent * this.level;
    owner.health = Math.min(owner.health + healAmount, owner.maxHealth);
  }
  
  getLevelDescription(): string {
    const percent = Math.round(this.lifestealPercent * this.level * 100);
    return `${this.name} Lv.${this.level}/${this.maxLevel} (+${percent}% 吸血)`;
  }
}

// 光环技能 - 怪物减速光环
export class SlowAuraSkill extends BaseSkill {
  private slowRadius: number;
  private slowPercent: number;
  
  constructor() {
    super(
      '减速光环',
      '降低周围怪物的移动速度',
      'aura',
      10
    );
    this.slowRadius = 200;
    this.slowPercent = 0.1; // 初始10%减速
  }
  
  effect(_target: any | null): void {
    // 光环效果通过其他方式应用
  }
  
  // 检查怪物是否在光环范围内并应用减速
  applySlow(owner: Player, monster: Monster): boolean {
    const dist = distance(owner, monster);
    if (dist <= this.slowRadius) {
      return true; // 返回是否应该减速
    }
    return false;
  }
  
  // 获取减速百分比
  getSlowPercent(): number {
    return this.slowPercent * this.level;
  }
  
  getLevelDescription(): string {
    const percent = Math.round(this.getSlowPercent() * 100);
    return `${this.name} Lv.${this.level}/${this.maxLevel} (-${percent}% 移速，范围${this.slowRadius}）`;
  }
}

// 自动追踪技能 - 火球术
export class FireballSkill extends BaseSkill {
  private damage: number;
  private castInterval: number;
  private lastCastTime: number;
  
  constructor() {
    super(
      '自动火球术',
      '自动发射火球攻击附近敌人',
      'projectile',
      10,
      2 // 2秒冷却
    );
    this.damage = 20;
    this.castInterval = 1.5; // 1.5秒一次
    this.lastCastTime = 0;
  }
  
  effect(target: any | null): void {
    if (target && typeof target.takeDamage === 'function') {
      const finalDamage = this.damage * this.level;
      console.log(`火球术命中 ${finalDamage} 伤害`);
      target.takeDamage(finalDamage);
    }
  }
  
  update(deltaTime: number, owner: Player): void {
    super.update(deltaTime, owner);
    
    this.lastCastTime += deltaTime;
    if (this.lastCastTime >= this.castInterval && this.canUse()) {
      // 寻找范围内的目标
      const nearestMonster = this.findNearestMonster(owner);
      if (nearestMonster) {
        this.effect(nearestMonster);
        this.triggerCooldown();
        this.lastCastTime = 0;
      }
    }
  }
  
  // 寻找最近的怪物（这里简化处理，实际需要从游戏状态获取）
  private findNearestMonster(_owner: Player): Monster | null {
    // 实际实现需要访问游戏状态中的怪物列表
    // 这里返回null作为占位
    return null;
  }
  
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel} (伤害 ${this.damage * this.level})`;
  }
}

// 强化自身技能 - 力量提升
export class StrengthBuffSkill extends BaseSkill {
  private attackBonus: number;
  
  constructor() {
    super(
      '力量提升',
      '永久增加攻击力',
      'buff',
      10
    );
    this.attackBonus = 5;
  }
  
  effect(_target: any | null): void {
    // 被动技能，直接通过属性加成生效
  }
  
  // 获取攻击加成
  getAttackBonus(): number {
    return this.attackBonus * this.level;
  }
  
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel} (+${this.getAttackBonus()} 攻击)`;
  }
}

// 强化自身技能 - 护甲提升
export class DefenseBuffSkill extends BaseSkill {
  private defenseBonus: number;
  
  constructor() {
    super(
      '护甲提升',
      '永久增加防御力',
      'buff',
      10
    );
    this.defenseBonus = 3;
  }
  
  effect(_target: any | null): void {
    // 被动技能
  }
  
  // 获取防御加成
  getDefenseBonus(): number {
    return this.defenseBonus * this.level;
  }
  
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel} (+${this.getDefenseBonus()} 防御)`;
  }
}

// 强化自身技能 - 生命提升
export class HealthBuffSkill extends BaseSkill {
  private healthBonus: number;
  
  constructor() {
    super(
      '生命提升',
      '永久增加生命值上限',
      'buff',
      10
    );
    this.healthBonus = 20;
  }
  
  effect(_target: any | null): void {
    // 被动技能
  }
  
  // 获取生命加成
  getHealthBonus(): number {
    return this.healthBonus * this.level;
  }
  
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel} (+${this.getHealthBonus()} 生命)`;
  }
}

// 自动追踪技能 - 闪电链
export class LightningChainSkill extends BaseSkill {
  private damage: number;
  private bounceCount: number;
  private castInterval: number;
  private lastCastTime: number;
  
  constructor() {
    super(
      '闪电链',
      '攻击一个敌人并弹射到附近的其他敌人',
      'projectile',
      10,
      3 // 3秒冷却
    );
    this.damage = 15;
    this.bounceCount = 2;
    this.castInterval = 3;
    this.lastCastTime = 0;
  }
  
  effect(target: any | null): void {
    if (target && typeof target.takeDamage === 'function') {
      const finalDamage = this.damage * this.level;
      console.log(`闪电链命中 ${finalDamage} 伤害`);
      target.takeDamage(finalDamage);
      
      // 实际实现中这里应该处理弹跳逻辑
    }
  }
  
  update(deltaTime: number, owner: Player): void {
    super.update(deltaTime, owner);
    
    this.lastCastTime += deltaTime;
    if (this.lastCastTime >= this.castInterval && this.canUse()) {
      const nearestMonster = this.findNearestMonster(owner);
      if (nearestMonster) {
        this.effect(nearestMonster);
        this.triggerCooldown();
        this.lastCastTime = 0;
      }
    }
  }
  
  private findNearestMonster(_owner: Player): Monster | null {
    return null; // 占位实现
  }
  
  getLevelDescription(): string {
    const bounce = this.bounceCount + Math.floor(this.level / 3);
    return `${this.name} Lv.${this.level}/${this.maxLevel} (伤害 ${this.damage * this.level}, 弹跳${bounce}次)`;
  }
}

// 光环技能 - 毒素光环
export class PoisonAuraSkill extends BaseSkill {
  private damagePerSecond: number;
  private radius: number;
  private damageInterval: number;
  private monsterDamageTimers: Map<string, number>;
  
  constructor() {
    super(
      '毒素光环',
      '对周围敌人持续造成毒素伤害',
      'aura',
      10
    );
    this.damagePerSecond = 5;
    this.radius = 150;
    this.damageInterval = 1; // 每秒造成一次伤害
    this.monsterDamageTimers = new Map();
  }
  
  effect(target: any | null): void {
    if (target && typeof target.takeDamage === 'function') {
      const damage = this.damagePerSecond * this.level;
      console.log(`毒素伤害 ${damage} 伤害`);
      target.takeDamage(damage);
    }
  }
  
  update(deltaTime: number, _owner: Player): void {
    super.update(deltaTime, _owner);
    
    // 实际实现中需要遍历范围内的怪物并应用毒素伤害
  }
  
  // 应用毒素伤害到怪物
  applyPoisonDamage(monster: Monster, deltaTime: number): void {
    const monsterId = monster.id;
    const currentTime = this.monsterDamageTimers.get(monsterId) || 0;
    const newTime = currentTime + deltaTime;
    
    if (newTime >= this.damageInterval) {
      this.effect(monster);
      this.monsterDamageTimers.set(monsterId, 0);
    } else {
      this.monsterDamageTimers.set(monsterId, newTime);
    }
  }
  
  getLevelDescription(): string {
    return `${this.name} Lv.${this.level}/${this.maxLevel} (${this.damagePerSecond * this.level}/秒，范围${this.radius})`;
  }
}

// 技能池管理器
export class SkillPool {
  private availableSkills: (() => Skill)[];
  
  constructor() {
    this.availableSkills = [
      () => new ExperienceAuraSkill(),
      () => new LifestealAuraSkill(),
      () => new SlowAuraSkill(),
      () => new FireballSkill(),
      () => new StrengthBuffSkill(),
      () => new DefenseBuffSkill(),
      () => new HealthBuffSkill(),
      () => new LightningChainSkill(),
      () => new PoisonAuraSkill()
    ];
  }
  
  // 获取随机技能选项（用于升级时选择）
  getRandomSkillOptions(count: number = 3): Skill[] {
    // 洗牌技能池
    const shuffled = [...this.availableSkills].sort(() => Math.random() - 0.5);
    
    // 选择前count个并实例化
    return shuffled.slice(0, count).map(skillFactory => skillFactory());
  }
  
  // 根据ID获取技能实例
  getSkillById(skillId: string): Skill | null {
    // 遍历所有技能类型尝试匹配
    for (const skillFactory of this.availableSkills) {
      const skill = skillFactory();
      if (skill.name === skillId) {
        return skill;
      }
    }
    return null;
  }
  
  // 获取所有可用技能类型
  getAllSkillTypes(): string[] {
    return this.availableSkills.map(factory => factory().name);
  }
}

// 全局技能池实例
export const skillPool = new SkillPool();
