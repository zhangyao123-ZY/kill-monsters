import type { GameState } from '../types';
import { MapGenerator } from './MapGenerator';
import { Player as PlayerClass } from './Player';
import { MonsterSpawner } from './Monster';
import { SpriteLoader } from './SpriteLoader';

export class GameSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private mapGenerator: MapGenerator;
  private monsterSpawner: MonsterSpawner;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private keysPressed: Set<string> = new Set();
  private showSkillSelection: boolean = false;
  private isGameOver: boolean = false;
  
  // 攻击效果系统
  private attackEffects: Array<{
    x: number;
    y: number;
    damage: number;
    lifetime: number;
    maxLifetime: number;
    color: string;
  }> = [];
  
  // 移动端控制
  private isMobile: boolean;
  private joystick: {
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    radius: number;
  } = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    radius: 80
  };
  private attackButton: {
    x: number;
    y: number;
    radius: number;
    pressed: boolean;
  } = {
    x: 0,
    y: 0,
    radius: 60,
    pressed: false
  };
  private touchIds: Set<number> = new Set();

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameState = this.initializeGameState();
    this.mapGenerator = new MapGenerator();
    this.monsterSpawner = new MonsterSpawner();
    
    // 检测是否为移动设备
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    this.setupEventListeners();
    this.resizeCanvas();
  }

  private initializeGameState(): GameState {
    // 创建玩家
    const player = new PlayerClass();
    
    return {
      player,
      monsters: [],
      obstacles: [],
      equipment: [],
      keys: {},
      camera: { x: 0, y: 0 },
      score: 0,
      gameOver: false,
      lastMonsterCount: 0
    };
  }
  
  private setupEventListeners(): void {
    // 键盘事件监听
    window.addEventListener('keydown', (event) => {
      this.keysPressed.add(event.key);
    });
    
    window.addEventListener('keyup', (event) => {
      this.keysPressed.delete(event.key);
    });
    
    // 鼠标移动事件 - 使用下划线前缀表示未使用的参数
    window.addEventListener('mousemove', (_event) => {
      // 暂时不处理鼠标移动
    });
    
    // 窗口大小变化事件
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
    
    window.addEventListener('click', (event) => {
      if (this.showSkillSelection) {
        this.handleSkillSelection(event);
      } else if (this.isGameOver) {
        // 检查是否点击了重新开始按钮
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height / 2 + 50;
        
        // 获取鼠标在canvas中的坐标
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // 检查是否点击了按钮区域
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth && 
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
          this.restartGame();
        }
      }
    });
    
    // 触摸事件监听 - 适用于移动设备
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault(); // 防止默认行为（如滚动）
      
      const touches = event.touches;
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        if (touch) {
          this.handleTouchStart(touch);
        }
      }
    });
    
    this.canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      
      const touches = event.touches;
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        if (touch) {
          this.handleTouchMove(touch);
        }
      }
    });
    
    this.canvas.addEventListener('touchend', (event) => {
      event.preventDefault();
      
      const changedTouches = event.changedTouches;
      for (let i = 0; i < changedTouches.length; i++) {
        const touch = changedTouches[i];
        if (touch) {
          this.handleTouchEnd(touch);
        }
      }
    });
    
    this.canvas.addEventListener('touchcancel', (event) => {
      event.preventDefault();
      
      const changedTouches = event.changedTouches;
      for (let i = 0; i < changedTouches.length; i++) {
        const touch = changedTouches[i];
        if (touch) {
          this.handleTouchEnd(touch);
        }
      }
    });
  }
  
  // 处理触摸开始事件
  private handleTouchStart(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // 检查是否点击了攻击按钮区域（屏幕右侧）
    const attackButtonArea = {
      x: this.canvas.width - this.attackButton.radius * 2,
      y: this.canvas.height - this.attackButton.radius * 2,
      width: this.attackButton.radius * 2,
      height: this.attackButton.radius * 2
    };
    
    // 检查是否点击了虚拟摇杆区域（屏幕左侧）
    const joystickArea = {
      x: 0,
      y: this.canvas.height - this.joystick.radius * 2,
      width: this.joystick.radius * 2,
      height: this.joystick.radius * 2
    };
    
    // 如果在攻击按钮区域
    if (x >= attackButtonArea.x && x <= attackButtonArea.x + attackButtonArea.width &&
        y >= attackButtonArea.y && y <= attackButtonArea.y + attackButtonArea.height) {
      this.attackButton.x = attackButtonArea.x + attackButtonArea.width / 2;
      this.attackButton.y = attackButtonArea.y + attackButtonArea.height / 2;
      this.attackButton.pressed = true;
      this.touchIds.add(touch.identifier);
    }
    // 如果在虚拟摇杆区域
    else if (x >= joystickArea.x && x <= joystickArea.x + joystickArea.width &&
             y >= joystickArea.y && y <= joystickArea.y + joystickArea.height) {
      this.joystick.active = true;
      this.joystick.startX = joystickArea.x + joystickArea.width / 2;
      this.joystick.startY = joystickArea.y + joystickArea.height / 2;
      this.joystick.currentX = x;
      this.joystick.currentY = y;
      this.touchIds.add(touch.identifier);
    }
    // 游戏结束时的触摸处理
    else if (this.isGameOver) {
      // 检查是否点击了重新开始按钮
      const buttonWidth = 200;
      const buttonHeight = 60;
      const buttonX = this.canvas.width / 2 - buttonWidth / 2;
      const buttonY = this.canvas.height / 2 + 50;
      
      if (x >= buttonX && x <= buttonX + buttonWidth && 
          y >= buttonY && y <= buttonY + buttonHeight) {
        this.restartGame();
      }
    }
  }
  
  // 处理触摸移动事件
  private handleTouchMove(touch: Touch): void {
    if (!this.touchIds.has(touch.identifier)) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // 更新虚拟摇杆位置
    if (this.joystick.active) {
      this.joystick.currentX = x;
      this.joystick.currentY = y;
    }
  }
  
  // 处理触摸结束事件
  private handleTouchEnd(touch: Touch): void {
    if (!this.touchIds.has(touch.identifier)) return;
    
    // 重置虚拟摇杆和攻击按钮状态
    this.joystick.active = false;
    this.attackButton.pressed = false;
    this.touchIds.delete(touch.identifier);
  }
  
  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  // 启动游戏前预加载资源
  async start(): Promise<void> {
    try {
      // 预加载精灵资源
      const spriteLoader = SpriteLoader.getInstance();
      await spriteLoader.preloadGameSprites();
      
      // 资源加载完成后开始游戏
      this.spawnInitialMonsters();
      this.animate();
    } catch (error) {
      console.error('Failed to load game resources:', error);
      // 即使资源加载失败，也尝试启动游戏（会使用后备绘制）
      this.spawnInitialMonsters();
      this.animate();
    }
  }
  
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  private spawnInitialMonsters(): void {
    // 生成一些初始怪物
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 500;
      const x = this.gameState.player.x + Math.cos(angle) * radius;
      const y = this.gameState.player.y + Math.sin(angle) * radius;
      
      // 使用正确的方法名spawnMonster
      const monster = this.monsterSpawner.spawnMonster(x, y);
      this.gameState.monsters.push(monster);
    }
  }
  
  private animate(currentTime: number = 0): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    if (!this.isGameOver) {
      this.update(deltaTime / 1000);
    }
    this.render();
    
    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }
  
  private update(deltaTime: number): void {
    this.updatePlayer(deltaTime);
    this.updateCamera();
    this.checkMonsterSpawn();
    this.updateMonsters(deltaTime);
    this.updateSkills();
    this.applyAuraEffects();
    this.applySlowEffects();
    this.checkCollisions();
    this.updateMap();
    this.checkGameOver();
    this.updateAttackEffects(deltaTime);
  }
  
  private updatePlayer(deltaTime: number): void {
    const player = this.gameState.player;
    
    // 使用moveSpeed代替不存在的speed属性
    const playerInstance = player as any;
    const moveSpeed = playerInstance.moveSpeed || 300; // 默认速度
    const speed = moveSpeed * deltaTime;
    
    let dx = 0;
    let dy = 0;
    
    // 键盘控制
    if (this.keysPressed.has('ArrowUp')) {
      dy -= speed;
    }
    if (this.keysPressed.has('ArrowDown')) {
      dy += speed;
    }
    if (this.keysPressed.has('ArrowLeft')) {
      dx -= speed;
    }
    if (this.keysPressed.has('ArrowRight')) {
      dx += speed;
    }
    
    // 虚拟摇杆控制
    if (this.joystick.active) {
      const deltaX = this.joystick.currentX - this.joystick.startX;
      const deltaY = this.joystick.currentY - this.joystick.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 0) {
        // 计算方向向量并归一化
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;
        
        // 限制最大移动距离为摇杆半径
        const moveDistance = Math.min(distance, this.joystick.radius);
        
        dx += normalizedX * moveDistance * (speed / this.joystick.radius);
        dy += normalizedY * moveDistance * (speed / this.joystick.radius);
      }
    }
    
    // 简单的移动实现
    player.x += dx;
    player.y += dy;
  }
  
  private updateCamera(): void {
    const player = this.gameState.player;
    const camera = this.gameState.camera;
    
    camera.x = player.x - this.canvas.width / 2;
    camera.y = player.y - this.canvas.height / 2;
  }
  
  private checkMonsterSpawn(): void {
    const maxMonsters = 10;
    if (this.gameState.monsters.length < maxMonsters) {
      // 根据游戏进度生成更强大的怪物
      const player = this.gameState.player;
      const spawnDistance = 1000;
      
      const angle = Math.random() * Math.PI * 2;
      const spawnX = player.x + Math.cos(angle) * spawnDistance;
      const spawnY = player.y + Math.sin(angle) * spawnDistance;
      
      // 使用正确的方法名spawnMonster
      const monster = this.monsterSpawner.spawnMonster(spawnX, spawnY);
      
      this.gameState.monsters.push(monster);
    }
  }
  
  private updateMonsters(deltaTime: number): void {
    const player = this.gameState.player;
    
    for (const monster of this.gameState.monsters) {
      // 简化的怪物AI - 直接向玩家移动
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
      
      if (distanceToPlayer > 0) {
        // 使用默认速度代替不存在的speed属性
        const defaultSpeed = 150;
        const moveX = (dx / distanceToPlayer) * defaultSpeed * deltaTime;
        const moveY = (dy / distanceToPlayer) * defaultSpeed * deltaTime;
        
        monster.x += moveX;
        monster.y += moveY;
      }
    }
  }
  
  private handleMonsterDeath(monster: any, index: number): void {
    const player = this.gameState.player;
    
    console.log(`怪物死亡，获得 ${monster.experienceReward} 经验值`);
    
    // 增加分数
    this.gameState.score += monster.experienceReward;
    
    // 增加经验
    player.gainExperience(monster.experienceReward);
    
    // 生成掉落装备
    const loot = monster.dropLoot();
    if (loot.length > 0) {
      // 将装备添加到玩家背包
      loot.forEach((item: any) => {
        player.addEquipment(item);
      });
    }
    
    // 从怪物列表中移除
    this.gameState.monsters.splice(index, 1);
  }

  // 完全删除这个未使用的方法
  private updateSkills(): void {
    // 暂时不更新技能
  }
  
  private applyAuraEffects(): void {
    // 暂时不应用光环效果
  }
  
  private handleSkillSelection(_event: MouseEvent): void {
    // 简化的技能选择处理 - 移除所有未使用的变量
  }
  
  private applySlowEffects(): void {
    // 暂时不应用减速效果
  }

  // 移除整个未使用的方法
  private checkCollisions(): void {
    // 检查玩家与怪物的碰撞
    this.checkPlayerAttacks();
    this.checkMonsterAttacks();
  }
  
  private checkPlayerAttacks(): void {
    const player = this.gameState.player;
    
    // 检查空格键是否被按下或攻击按钮是否被触摸
    if (this.keysPressed.has(' ') || this.attackButton.pressed) {
      console.log(this.attackButton.pressed ? '攻击按钮被按下' : '空格键被按下');
      
      // 创建玩家攻击特效
      this.createAttackEffect(player.x, player.y, 0, '#FF4500');
      
      // 直接执行攻击，不依赖canAttack检查，确保攻击能够触发
      console.log('执行攻击，忽略冷却时间');
      
      // 计算攻击伤害
      let attackDamage = 25; // 固定基础伤害
      
      // 如果玩家实例有performAttack方法，则使用它
      if (player.performAttack) {
        const calculatedDamage = player.performAttack();
        attackDamage = calculatedDamage > 0 ? calculatedDamage : attackDamage;
      }
      
      console.log('最终攻击伤害:', attackDamage);
      
      // 遍历所有怪物，使用较大的攻击范围
      for (let i = this.gameState.monsters.length - 1; i >= 0; i--) {
        const monster = this.gameState.monsters[i];
        if (!monster || !monster.takeDamage) {
          console.log('跳过无效怪物或无法受伤的怪物');
          continue;
        }
        
        // 计算距离
        const distance = Math.sqrt(
          Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
        );
        
        console.log(`怪物 ${i} 距离: ${distance}`);
        
        // 扩大攻击范围到150像素
        if (distance <= 150) {
          console.log(`攻击范围内的怪物，造成 ${attackDamage} 点伤害`);
          
          try {
            // 对怪物造成伤害
            const isDead = monster.takeDamage(attackDamage);
            console.log('怪物受伤，是否死亡:', isDead);
            
            // 在怪物位置创建伤害特效
            this.createAttackEffect(monster.x, monster.y, attackDamage, '#FF6B6B');
            
            // 如果怪物死亡，处理死亡逻辑
            if (isDead) {
              console.log('怪物死亡，处理死亡逻辑');
              this.handleMonsterDeath(monster, i);
            }
          } catch (error) {
            console.error('攻击怪物时出错:', error);
          }
        }
      }
    }
  }
  
  // 暂时注释掉未使用的方法
  // private applyLifesteal(_damage: number): void {
  //   // 暂时禁用生命偷取
  //   // TODO: 实现生命偷取逻辑
  // }
  
  private checkMonsterAttacks(): void {
    const player = this.gameState.player;
    
    for (const monster of this.gameState.monsters) {
      if (!monster) continue;
      
      const distance = Math.sqrt(
        Math.pow(player.x - monster.x, 2) + Math.pow(player.y - monster.y, 2)
      );
      
      // 简化版：如果怪物在攻击范围内（60像素），则攻击玩家
      if (distance <= 60) {
        // 使用monster.attack作为伤害，应用玩家防御减免
        const actualDamage = Math.max(1, monster.attack - player.defense * 0.5);
        console.log(`怪物攻击玩家，造成 ${actualDamage} 点伤害`);
        
        player.takeDamage(actualDamage);
      }
    }
  }
  
  private updateMap(): void {
    const player = this.gameState.player;
    this.mapGenerator.updateActiveChunks(player.x, player.y);
  }
  
  private checkGameOver(): void {
    if (this.gameState.player.health <= 0) {
      this.isGameOver = true;
    }
  }
  
  // 更新攻击效果
  private updateAttackEffects(deltaTime: number): void {
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      if (effect) {
        effect.lifetime -= deltaTime;
        
        // 移除过期的效果
        if (effect.lifetime <= 0) {
          this.attackEffects.splice(i, 1);
        }
      }
    }
  }
  
  // 创建攻击效果
  private createAttackEffect(x: number, y: number, damage: number, color: string): void {
    this.attackEffects.push({
      x,
      y,
      damage,
      lifetime: 0.5, // 持续0.5秒
      maxLifetime: 0.5,
      color
    });
  }
  
  // 渲染攻击效果
  private renderAttackEffects(): void {
    const ctx = this.ctx;
    const camera = this.gameState.camera;
    
    for (const effect of this.attackEffects) {
      const screenX = effect.x - camera.x;
      const screenY = effect.y - camera.y;
      
      // 计算透明度（根据剩余生命值）
      const alpha = effect.lifetime / effect.maxLifetime;
      
      // 渲染伤害数字
      if (effect.damage > 0) {
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 数字向上飘动的效果
        const floatOffset = (1 - alpha) * 20;
        
        ctx.fillText(`-${effect.damage}`, screenX, screenY - floatOffset);
        ctx.restore();
      }
      
      // 渲染攻击光圈效果
      ctx.save();
      ctx.beginPath();
      ctx.arc(screenX, screenY, 30 * alpha, 0, Math.PI * 2);
      ctx.strokeStyle = `${effect.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      
      // 渲染粒子效果
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Date.now() * 0.005;
        const particleRadius = 40 * alpha;
        const particleX = screenX + Math.cos(angle) * particleRadius;
        const particleY = screenY + Math.sin(angle) * particleRadius;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `${effect.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
        ctx.restore();
      }
    }
  }
  
  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.isGameOver) {
      this.renderGameOver();
    } else {
      this.renderMap();
      this.renderMonsters();
      this.renderPlayer();
      this.renderAttackRange();
      this.renderAttackEffects();
      this.renderUI();
      
      if (this.showSkillSelection) {
        this.renderSkillSelection();
      }
    }
  }
  
  private renderAttackRange(): void {
    const ctx = this.ctx;
    const player = this.gameState.player;
    const camera = this.gameState.camera;
    
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    const attackRange = 150; // 与checkPlayerAttacks方法中的攻击范围保持一致
    
    // 绘制半透明的圆形表示攻击范围
    ctx.beginPath();
    ctx.arc(screenX, screenY, attackRange, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 107, 107, 0.2)'; // 半透明红色
    ctx.fill();
    
    // 绘制攻击范围的边框
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  private renderMap(): void {
    const ctx = this.ctx;
    const camera = this.gameState.camera;
    
    // 渲染背景
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染障碍物
    const activeObstacles = this.mapGenerator.getAllActiveObstacles();
    
    for (const obstacle of activeObstacles) {
      const screenX = obstacle.x - camera.x;
      const screenY = obstacle.y - camera.y;
      
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(screenX - 25, screenY - 25, 50, 50);
    }
  }
  
  private renderMonsters(): void {
    const ctx = this.ctx;
    const camera = this.gameState.camera;
    
    for (const monster of this.gameState.monsters) {
      const screenX = monster.x - camera.x;
      const screenY = monster.y - camera.y;
      
      // 渲染怪物
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(screenX - 20, screenY - 20, 40, 40);
      
      // 渲染怪物血条
      this.renderHealthBar(ctx, screenX, screenY - 30, 40, monster.health, monster.maxHealth);
      
      // 渲染怪物等级
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText(`Lv.${monster.level}`, screenX - 12, screenY + 35);
    }
  }
  
  private renderPlayer(): void {
    const ctx = this.ctx;
    const player = this.gameState.player;
    const camera = this.gameState.camera;
    
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    
    // 渲染玩家
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(screenX - 25, screenY - 25, 50, 50);
    
    // 渲染玩家血条
    this.renderHealthBar(ctx, screenX, screenY - 40, 50, player.health, player.maxHealth);
    
    // 渲染玩家等级
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText(`Lv.${player.level}`, screenX - 15, screenY + 45);
  }
  
  private renderHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, current: number, max: number): void {
    const healthPercent = Math.max(0, current / max);
    
    // 渲染血条背景
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - width / 2, y, width, 8);
    
    // 渲染当前血量
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x - width / 2, y, width * healthPercent, 8);
  }
  
  private renderUI(): void {
    const ctx = this.ctx;
    const player = this.gameState.player;
    
    // 渲染分数
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText(`分数: ${this.gameState.score}`, 20, 30);
    
    // 渲染玩家状态
    ctx.fillText(`等级: ${player.level}`, 20, 60);
    ctx.fillText(`血量: ${Math.floor(player.health)}/${Math.floor(player.maxHealth)}`, 20, 90);
    ctx.fillText(`攻击: ${player.attack}`, 20, 120);
    ctx.fillText(`防御: ${player.defense}`, 20, 150);
    ctx.fillText(`经验: ${Math.floor(player.experience)}/${Math.floor(player.experienceToNextLevel)}`, 20, 180);
    
    // 渲染技能栏
    this.renderSkillBar();
    
    // 渲染移动设备控制界面（虚拟摇杆和攻击按钮）
    if (this.isMobile || window.innerWidth < 768) {
      this.renderMobileControls();
    }
  }
  
  // 渲染移动设备控制界面
  private renderMobileControls(): void {
    const ctx = this.ctx;
    
    // 渲染虚拟摇杆背景
    const joystickCenterX = this.joystick.radius;
    const joystickCenterY = this.canvas.height - this.joystick.radius;
    
    // 摇杆背景圆
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(joystickCenterX, joystickCenterY, this.joystick.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    
    // 如果摇杆激活，渲染移动的内圆
    if (this.joystick.active) {
      const deltaX = this.joystick.currentX - joystickCenterX;
      const deltaY = this.joystick.currentY - joystickCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let stickX = joystickCenterX;
      let stickY = joystickCenterY;
      
      // 限制内圆在背景圆内
      if (distance > 0) {
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;
        const maxDistance = this.joystick.radius * 0.6;
        const moveDistance = Math.min(distance, maxDistance);
        
        stickX += normalizedX * moveDistance;
        stickY += normalizedY * moveDistance;
      }
      
      // 渲染摇杆内圆
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(stickX, stickY, this.joystick.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#CCCCCC';
      ctx.fill();
      ctx.restore();
    } else {
      // 未激活时，渲染居中的内圆
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(joystickCenterX, joystickCenterY, this.joystick.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#CCCCCC';
      ctx.fill();
      ctx.restore();
    }
    
    // 渲染攻击按钮
    const attackButtonX = this.canvas.width - this.attackButton.radius;
    const attackButtonY = this.canvas.height - this.attackButton.radius;
    
    // 攻击按钮外圈
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(attackButtonX, attackButtonY, this.attackButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.attackButton.pressed ? '#FF6B6B' : '#FF4500';
    ctx.fill();
    ctx.restore();
    
    // 攻击按钮内圈
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(attackButtonX, attackButtonY, this.attackButton.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = this.attackButton.pressed ? '#FF4500' : '#FF6B6B';
    ctx.fill();
    
    // 渲染攻击图标（简单的剑图标）
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(attackButtonX - 15, attackButtonY - 20);
    ctx.lineTo(attackButtonX + 15, attackButtonY + 20);
    ctx.moveTo(attackButtonX + 15, attackButtonY - 20);
    ctx.lineTo(attackButtonX - 15, attackButtonY + 20);
    ctx.stroke();
    ctx.restore();
  }
  
  private renderSkillBar(): void {
    const ctx = this.ctx;
    const startX = this.canvas.width - 200;
    const startY = 20;
    
    // 渲染技能栏背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(startX - 10, startY - 10, 180, 60); // 固定大小代替依赖不存在的技能列表
    
    // 渲染技能栏标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText('技能栏', startX + 5, startY + 17);
  }
  
  private renderSkillSelection(): void {
    const ctx = this.ctx;
    const startY = this.canvas.height / 2;
    
    // 渲染背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染标题
    ctx.fillStyle = '#FFFF00';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('升级！选择一个技能', this.canvas.width / 2, startY - 50);
    ctx.textAlign = 'left';
  }
  
  // 暂时禁用物品渲染功能
  // private renderItems(): void {
  //   const ctx = this.ctx;
    // 暂时禁用物品渲染功能，因为GameState没有items属性
    // TODO: 实现物品渲染功能
  // }
  
  // 暂时禁用物品拾取方法
  // private checkItemPickup(): void {
    // 暂时禁用物品拾取功能
    // TODO: 实现物品拾取功能
  // }
  
  // 简化的游戏结束渲染
  private renderGameOver(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#FF0000';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    // 渲染最终分数
    ctx.fillStyle = '#FFFF00';
    ctx.font = '24px Arial';
    ctx.fillText(`最终分数: ${this.gameState.score}`, this.canvas.width / 2, this.canvas.height / 2);
    
    // 渲染重新开始按钮
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = this.canvas.width / 2 - buttonWidth / 2;
    const buttonY = this.canvas.height / 2 + 50;
    
    // 按钮背景
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 按钮边框
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 按钮文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText('重新开始游戏', this.canvas.width / 2, this.canvas.height / 2 + 85);
  }
  
  private restartGame(): void {
    // 停止当前动画循环
    this.stop();
    
    // 重置游戏状态
    this.gameState = this.initializeGameState();
    this.isGameOver = false;
    
    // 生成初始怪物
    this.spawnInitialMonsters();
    
    // 重新开始游戏循环
    this.animate();
  }
}