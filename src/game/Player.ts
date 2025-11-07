import type { Player as IPlayer, Position, Collider, Skill, Equipment } from '../types';
import { generateId, randomInt, willCollide, formatNumber } from '../utils/gameUtils';
import { SpriteLoader } from './SpriteLoader';

// 玩家角色类
export class Player implements IPlayer {
  id: string;
  type: 'player' = 'player';
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
  experience: number;
  experienceToNextLevel: number;
  skills: Skill[];
  equipment: Equipment[];
  // 添加缺失的inventory属性
  inventory: Equipment[];
  
  // 移动速度
  private moveSpeed: number;
  // 攻击速度（攻击间隔，单位：毫秒）
  private attackSpeed: number;
  // 最后攻击时间
  private lastAttackTime: number;
  // 技能点
  private skillPoints: number;
  
  constructor(x: number = 0, y: number = 0) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 60;
    this.isSolid = true;
    
    // 初始属性
    this.level = 1;
    this.health = 100;
    this.maxHealth = 100;
    this.attack = 20; // 增加初始攻击力
    this.defense = 5;
    this.experience = 0;
    this.experienceToNextLevel = 100;
    this.skills = [];
    this.equipment = [];
    this.inventory = [];
    
    // 其他属性
    this.moveSpeed = 300;
    this.attackSpeed = 1000; // 1秒攻击间隔
    this.lastAttackTime = 0; // 确保初始可以攻击
    this.skillPoints = 0;
  }
  
  // 更新玩家状态
  update(deltaTime: number): void {
    // 更新所有技能
    this.skills.forEach(skill => skill.update(deltaTime, this));
    
    // 自动恢复生命值（每10秒恢复1%）
    if (this.health < this.maxHealth && Math.random() < deltaTime * 0.0001) {
      this.health = Math.min(this.health + this.maxHealth * 0.01, this.maxHealth);
    }
  }
  
  // 绘制玩家
  draw(ctx: CanvasRenderingContext2D, camera: Position): void {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    const spriteLoader = SpriteLoader.getInstance();
    
    ctx.save();
    
    // 获取并绘制玩家精灵
    const sprite = spriteLoader.getSprite('player_idle');
    if (sprite) {
      // 计算缩放比例以适应玩家大小
      const scaleX = this.width / sprite.width;
      const scaleY = this.height / sprite.height;
      
      // 绘制精灵
      ctx.drawImage(
        sprite, 
        screenX, 
        screenY, 
        sprite.width * scaleX, 
        sprite.height * scaleY
      );
    } else {
      // 后备绘制：如果精灵未加载，使用基本形状
      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(screenX, screenY, this.width, this.height);
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, screenY - 10, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制血条
    this.drawHealthBar(ctx, screenX, screenY - 30);
    
    // 绘制等级
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${this.level}`, screenX + this.width / 2, screenY + this.height + 15);
    
    ctx.restore();
  }
  
  // 绘制血条
  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const barWidth = 50;
    const barHeight = 8;
    const healthPercent = this.health / this.maxHealth;
    
    // 血条背景
    ctx.fillStyle = '#333';
    ctx.fillRect(x - (barWidth - this.width) / 2, y, barWidth, barHeight);
    
    // 当前血量
    ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
    ctx.fillRect(x - (barWidth - this.width) / 2, y, barWidth * healthPercent, barHeight);
    
    // 血量文字
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.health)}/${Math.round(this.maxHealth)}`, x + this.width / 2, y + 6);
  }
  
  // 移动玩家
  move(dx: number, dy: number, obstacles: Collider[]): void {
    // 如果尝试移动的距离太近，则不移动
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
    
    // 检查碰撞
    if (!willCollide(this, dx, 0, obstacles)) {
      this.x += dx;
    }
    if (!willCollide(this, 0, dy, obstacles)) {
      this.y += dy;
    }
  }
  
  // 处理键盘移动
  handleKeyboardMovement(keys: { [key: string]: boolean }, deltaTime: number, obstacles: Collider[]): void {
    let moveX = 0;
    let moveY = 0;
    
    if (keys['KeyW'] || keys['ArrowUp']) {
      moveY -= this.moveSpeed * deltaTime;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      moveY += this.moveSpeed * deltaTime;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
      moveX -= this.moveSpeed * deltaTime;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
      moveX += this.moveSpeed * deltaTime;
    }
    
    // 归一化移动向量，确保斜向移动速度相同
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > 0) {
      const normalizedMoveX = (moveX / magnitude) * this.moveSpeed * deltaTime;
      const normalizedMoveY = (moveY / magnitude) * this.moveSpeed * deltaTime;
      this.move(normalizedMoveX, normalizedMoveY, obstacles);
    }
  }
  
  // 攻击
  canAttack(): boolean {
    return Date.now() - this.lastAttackTime >= this.attackSpeed;
  }
  
  // 执行攻击
  performAttack(): number {
    if (!this.canAttack()) return 0;
    
    this.lastAttackTime = Date.now();
    
    // 应用装备加成
    let finalAttack = this.attack;
    this.equipment.forEach(item => {
      if (item.isEquipped && item.stats.attack) {
        finalAttack += item.stats.attack;
      }
    });
    
    // 暴击系统（5%几率暴击，造成1.5倍伤害）
    if (Math.random() < 0.05) {
      finalAttack *= 1.5;
      console.log('暴击！', finalAttack);
    }
    
    return finalAttack;
  }
  
  // 受到伤害
  takeDamage(amount: number): boolean {
    // 计算防御减免
    const damageReduction = Math.min(this.defense, amount * 0.8); // 最多减免80%伤害
    let actualDamage = Math.max(1, amount - damageReduction);
    
    // 应用装备防御加成
    this.equipment.forEach(item => {
      if (item.isEquipped && item.stats.defense) {
        const itemReduction = Math.min(item.stats.defense, actualDamage * 0.5);
        actualDamage -= itemReduction;
      }
    });
    
    this.health -= Math.max(1, actualDamage);
    
    // 触发受伤技能效果
    this.skills.forEach(skill => {
      if (skill.type === 'buff' && skill.name.includes('受伤')) {
        skill.effect(this);
      }
    });
    
    return this.health <= 0;
  }
  
  // 获得经验值
  gainExperience(amount: number): void {
    this.experience += amount;
    
    // 检查是否升级
    while (this.experience >= this.experienceToNextLevel) {
      this.levelUp();
    }
  }
  
  // 升级
  levelUp(): void {
    this.level++;
    this.experience -= this.experienceToNextLevel;
    
    // 升级所需经验值递增
    this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);
    
    // 属性提升
    const healthGain = randomInt(20, 40);
    const attackGain = randomInt(5, 10);
    const defenseGain = randomInt(3, 6);
    
    this.maxHealth += healthGain;
    this.health = this.maxHealth; // 升级时回满生命
    this.attack += attackGain;
    this.defense += defenseGain;
    
    // 获得技能点
    this.skillPoints++;
    
    console.log(`升级！当前等级: ${this.level}, 生命+${healthGain}, 攻击+${attackGain}, 防御+${defenseGain}`);
  }
  
  // 学习或升级技能
  learnSkill(skill: Skill): void {
    // 检查是否有足够的技能点
    if (this.skillPoints <= 0) return;
    
    // 检查是否已经学习过该技能
    const existingSkill = this.skills.find(s => s.id === skill.id);
    
    if (existingSkill) {
      // 升级现有技能
      if (existingSkill.maxLevel !== undefined && existingSkill.level < existingSkill.maxLevel) {
        existingSkill.level++;
        this.skillPoints--;
        console.log(`技能升级: ${existingSkill.name} Lv.${existingSkill.level}`);
      }
    } else {
      // 学习新技能
      this.skills.push({ ...skill, level: 1 });
      this.skillPoints--;
      console.log(`学习新技能: ${skill.name}`);
    }
  }
  
  // 添加装备
  addEquipment(equipment: Equipment): void {
    this.equipment.push({ ...equipment, isEquipped: false });
    console.log(`获得装备: ${equipment.name}`);
  }
  
  // 装备物品
  equipItem(equipmentId: string): void {
    const equipment = this.equipment.find(item => item.id === equipmentId);
    if (!equipment) return;
    
    // 如果已经装备，则卸载
    if (equipment.isEquipped) {
      equipment.isEquipped = false;
      console.log(`卸载装备: ${equipment.name}`);
      return;
    }
    
    // 同一类型的装备只能装备一个
    this.equipment.forEach(item => {
      if (item.type === equipment.type) {
        item.isEquipped = false;
      }
    });
    
    // 装备新物品
    equipment.isEquipped = true;
    console.log(`装备物品: ${equipment.name}`);
  }
  
  // 获取角色属性摘要
  getStatsSummary(): { [key: string]: string } {
    return {
      '等级': this.level.toString(),
      '生命': `${formatNumber(this.health)}/${formatNumber(this.maxHealth)}`,
      '攻击': formatNumber(this.attack),
      '防御': formatNumber(this.defense),
      '经验': `${formatNumber(this.experience)}/${formatNumber(this.experienceToNextLevel)}`,
      '技能点': this.skillPoints.toString(),
      '技能数量': this.skills.length.toString(),
      '装备数量': this.equipment.filter(e => e.isEquipped).length.toString()
    };
  }
  
  // 重置玩家状态（用于重新开始游戏）
  reset(): void {
    this.health = this.maxHealth = 100;
    this.attack = 10;
    this.defense = 5;
    this.experience = 0;
    this.experienceToNextLevel = 100;
    this.level = 1;
    this.skills = [];
    this.equipment = [];
    this.skillPoints = 1;
  }
  
  // 检查是否可以学习新技能
  canLearnSkills(): boolean {
    return this.skillPoints > 0;
  }
}
