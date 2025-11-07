import type { Collider, Position } from '../types';

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 碰撞检测
export function checkCollision(a: Collider, b: Collider): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// 检测移动是否会碰撞
export function willCollide(
  entity: Collider,
  dx: number,
  dy: number,
  obstacles: Collider[]
): boolean {
  const newX = entity.x + dx;
  const newY = entity.y + dy;
  
  for (const obstacle of obstacles) {
    if (!obstacle.isSolid) continue;
    
    if (
      newX < obstacle.x + obstacle.width &&
      newX + entity.width > obstacle.x &&
      newY < obstacle.y + obstacle.height &&
      newY + entity.height > obstacle.y
    ) {
      return true;
    }
  }
  
  return false;
}

// 随机数生成
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// 随机整数生成
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 计算两点之间的距离
export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 计算朝向目标的方向向量
export function getDirectionTowards(from: Position, to: Position): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) return { x: 0, y: 0 };
  
  return {
    x: dx / dist,
    y: dy / dist
  };
}

// 限制值在范围内
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 线性插值
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * clamp(factor, 0, 1);
}

// 角度转弧度
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// 弧度转角度
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

// 格式化数字显示
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 洗牌数组
export function shuffleArray<T>(array: T[]): T[] {
  const newArray: T[] = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // 使用类型断言确保类型安全
    const temp: T = newArray[i] as T;
    newArray[i] = newArray[j] as T;
    newArray[j] = temp;
  }
  return newArray;
}

// 从数组中随机选择一个元素
export function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot get random element from empty array');
  }
  return array[Math.floor(Math.random() * array.length)] as T;
}

// 生成随机颜色
export function getRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return getRandomElement(colors);
}

// 检测是否在视野范围内
export function isInSightRange(from: Position, to: Position, range: number): boolean {
  return distance(from, to) <= range;
}

// 检查直线是否有障碍物阻挡（简化版视线检测）
export function hasLineOfSight(
  start: Position,
  end: Position,
  obstacles: Collider[],
  resolution: number = 5
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(2, Math.floor(dist / resolution));
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    
    // 创建一个小的碰撞体来检测点碰撞
    const pointCollider = { x, y, width: 1, height: 1, isSolid: true };
    
    for (const obstacle of obstacles) {
      if (obstacle.isSolid && checkCollision(pointCollider, obstacle)) {
        return false;
      }
    }
  }
  
  return true;
}