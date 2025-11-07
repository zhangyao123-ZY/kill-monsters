import type { Position, Obstacle } from '../types';
import { OBSTACLE_TYPES } from '../types';
import { generateId, random } from '../utils/gameUtils';
import { SpriteLoader } from './SpriteLoader';

// 地图区块大小
const CHUNK_SIZE = 500;

// 区块管理器类
export class Chunk {
  id: string;
  x: number;
  y: number;
  obstacles: Obstacle[];
  generated: boolean;

  constructor(x: number, y: number) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.obstacles = [];
    this.generated = false;
  }

  generate(seed: number) {
    if (this.generated) return;
    
    // 设置随机数种子，确保相同区块生成相同的障碍物
    const chunkSeed = seed + this.x * 10000 + this.y * 100;
    // 使用简单的随机数生成方法代替seedrandom
    const simpleRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const rng = () => simpleRandom(chunkSeed + Math.random() * 1000);
    
    // 计算区块的世界坐标
    const worldX = this.x * CHUNK_SIZE;
    const worldY = this.y * CHUNK_SIZE;
    
    // 生成障碍物数量
    const obstacleCount = Math.floor(rng() * 15) + 5; // 5-20个障碍物
    
    for (let i = 0; i < obstacleCount; i++) {
      // 随机位置
      const x = worldX + rng() * CHUNK_SIZE;
      const y = worldY + rng() * CHUNK_SIZE;
      
      // 随机选择障碍物类型
      const types = [OBSTACLE_TYPES.TREE, OBSTACLE_TYPES.ROCK, OBSTACLE_TYPES.WALL];
      const randomIndex = Math.floor(rng() * types.length);
      const obstacleType = types[randomIndex] || OBSTACLE_TYPES.TREE; // 确保有默认值
      
      // 根据类型设置大小和属性
      let width: number = 0, height: number = 0, health: number = 0, maxHealth: number = 0;
      switch (obstacleType) {
        case OBSTACLE_TYPES.TREE:
          width = 40 + rng() * 20;
          height = 60 + rng() * 40;
          health = 100;
          maxHealth = 100;
          break;
        case OBSTACLE_TYPES.ROCK:
          width = 30 + rng() * 30;
          height = 30 + rng() * 30;
          health = 200;
          maxHealth = 200;
          break;
        case OBSTACLE_TYPES.WALL:
          width = 50 + rng() * 100;
          height = 20;
          health = 500;
          maxHealth = 500;
          break;
      }
      
      // 创建障碍物
      const obstacle: Obstacle = {
        id: generateId(),
        type: 'obstacle',
        obstacleType,
        x,
        y,
        width,
        height,
        isSolid: true,
        health,
        maxHealth,
        level: 1,
        update: () => {},
        draw: (ctx: CanvasRenderingContext2D, camera: Position) => {
          // 绘制障碍物
          const screenX = x - camera.x;
          const screenY = y - camera.y;
          
          ctx.save();
          
          const spriteLoader = SpriteLoader.getInstance();
          
          // 根据障碍物类型选择精灵
          let spriteKey = 'tile_tree'; // 默认精灵
          switch (obstacleType) {
            case OBSTACLE_TYPES.TREE:
              spriteKey = 'tile_tree';
              break;
            case OBSTACLE_TYPES.ROCK:
              spriteKey = 'tile_rock';
              break;
            case OBSTACLE_TYPES.WALL:
              spriteKey = 'tile_wall';
              break;
          }
          
          // 获取并绘制精灵
          const sprite = spriteLoader.getSprite(spriteKey);
          if (sprite) {
            // 计算缩放比例
            const scaleX = width / sprite.width;
            const scaleY = height / sprite.height;
            
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
            switch (obstacleType) {
              case OBSTACLE_TYPES.TREE:
                ctx.fillStyle = '#8B4513'; // 树干棕色
                ctx.fillRect(screenX, screenY + height * 0.3, width * 0.4, height * 0.7);
                ctx.fillStyle = '#228B22'; // 树叶绿色
                ctx.beginPath();
                ctx.arc(screenX + width / 2, screenY + height * 0.3, width * 0.7, 0, Math.PI * 2);
                ctx.fill();
                break;
              case OBSTACLE_TYPES.ROCK:
                ctx.fillStyle = '#808080'; // 石头灰色
                ctx.fillRect(screenX, screenY, width, height);
                break;
              case OBSTACLE_TYPES.WALL:
                ctx.fillStyle = '#654321'; // 墙褐色
                ctx.fillRect(screenX, screenY, width, height);
                break;
            }
          }
          
          // 如果障碍物有血量且不是满的，绘制血条
          if (health < maxHealth) {
            const barWidth = width;
            const barHeight = 4;
            const barX = screenX;
            const barY = screenY - 8;
            
            // 血条背景
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // 当前血量
            ctx.fillStyle = health / maxHealth > 0.5 ? '#4CAF50' : health / maxHealth > 0.25 ? '#FFC107' : '#F44336';
            ctx.fillRect(barX, barY, barWidth * (health / maxHealth), barHeight);
          }
          
          ctx.restore();
        },
        takeDamage: (amount: number) => {
            obstacle.health -= amount;
            return obstacle.health <= 0;
          }
      };
      
      this.obstacles.push(obstacle);
    }
    
    this.generated = true;
  }

  // 获取区块内的所有障碍物
  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  // 检查点是否在区块内
  containsPoint(x: number, y: number): boolean {
    const worldX = this.x * CHUNK_SIZE;
    const worldY = this.y * CHUNK_SIZE;
    return x >= worldX && x < worldX + CHUNK_SIZE && y >= worldY && y < worldY + CHUNK_SIZE;
  }
}

// 无限地图生成器类
export class MapGenerator {
  private chunks: Map<string, Chunk>;
  private seed: number;
  private activeChunkRadius: number;

  constructor(seed: number = Date.now(), activeChunkRadius: number = 2) {
    this.chunks = new Map();
    this.seed = seed;
    this.activeChunkRadius = activeChunkRadius;
  }

  // 获取区块坐标
  private getChunkCoordinates(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / CHUNK_SIZE),
      y: Math.floor(worldY / CHUNK_SIZE)
    };
  }

  // 获取区块唯一键
  private getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // 获取或创建区块
  private getOrCreateChunk(x: number, y: number): Chunk {
    const key = this.getChunkKey(x, y);
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(x, y);
      chunk.generate(this.seed);
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key)!;
  }

  // 更新活跃区块
  updateActiveChunks(centerX: number, centerY: number): void {
    const centerChunk = this.getChunkCoordinates(centerX, centerY);
    
    // 生成以玩家为中心的区块
    for (let x = -this.activeChunkRadius; x <= this.activeChunkRadius; x++) {
      for (let y = -this.activeChunkRadius; y <= this.activeChunkRadius; y++) {
        const chunkX = centerChunk.x + x;
        const chunkY = centerChunk.y + y;
        this.getOrCreateChunk(chunkX, chunkY);
      }
    }
    
    // 清理远离玩家的区块，减少内存使用
    this.cleanupDistantChunks(centerChunk.x, centerChunk.y);
  }

  // 清理远离玩家的区块
  private cleanupDistantChunks(centerX: number, centerY: number): void {
    const maxDistance = this.activeChunkRadius + 1;
    const keysToRemove: string[] = [];
    
    this.chunks.forEach((chunk, key) => {
      const distanceX = Math.abs(chunk.x - centerX);
      const distanceY = Math.abs(chunk.y - centerY);
      if (distanceX > maxDistance || distanceY > maxDistance) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.chunks.delete(key));
  }

  // 获取指定区域内的所有障碍物
  getObstaclesInArea(minX: number, minY: number, maxX: number, maxY: number): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const startChunk = this.getChunkCoordinates(minX, minY);
    const endChunk = this.getChunkCoordinates(maxX, maxY);
    
    for (let x = startChunk.x; x <= endChunk.x; x++) {
      for (let y = startChunk.y; y <= endChunk.y; y++) {
        const chunk = this.getOrCreateChunk(x, y);
        const chunkObstacles = chunk.getObstacles();
        
        // 过滤出在指定区域内的障碍物
        const filteredObstacles = chunkObstacles.filter(obs => 
          obs.x < maxX && obs.x + obs.width > minX &&
          obs.y < maxY && obs.y + obs.height > minY
        );
        
        obstacles.push(...filteredObstacles);
      }
    }
    
    return obstacles;
  }

  // 获取所有活跃区块中的障碍物
  getAllActiveObstacles(): Obstacle[] {
    const obstacles: Obstacle[] = [];
    this.chunks.forEach(chunk => {
      obstacles.push(...chunk.getObstacles());
    });
    return obstacles;
  }

  // 绘制地形背景
  drawBackground(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, canvasWidth: number, canvasHeight: number): void {
    // 绘制网格背景
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    const gridSize = 50;
    const startX = Math.floor((cameraX % gridSize) - gridSize);
    const startY = Math.floor((cameraY % gridSize) - gridSize);
    
    for (let x = startX; x < canvasWidth + cameraX; x += gridSize) {
      const screenX = x - cameraX;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvasHeight);
      ctx.stroke();
    }
    
    for (let y = startY; y < canvasHeight + cameraY; y += gridSize) {
      const screenY = y - cameraY;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvasWidth, screenY);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // 获取随机出生点（确保附近没有障碍物）
  getRandomSpawnPoint(avoidX: number, avoidY: number, radius: number = 200): Position {
    // 生成远离指定点的随机位置
    const angle = random(0, Math.PI * 2);
    const distance = radius + random(100, 300);
    const x = avoidX + Math.cos(angle) * distance;
    const y = avoidY + Math.sin(angle) * distance;
    
    return { x, y };
  }
}