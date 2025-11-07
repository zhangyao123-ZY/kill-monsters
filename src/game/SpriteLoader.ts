// 精灵加载器类，用于加载和管理游戏中的图像资源

export interface SpriteMap {
  [key: string]: HTMLImageElement | HTMLCanvasElement;
}

export class SpriteLoader {
  private static instance: SpriteLoader;
  private sprites: SpriteMap = {};
  private loadingPromises: Map<string, Promise<void>> = new Map();

  private constructor() {}

  public static getInstance(): SpriteLoader {
    if (!SpriteLoader.instance) {
      SpriteLoader.instance = new SpriteLoader();
    }
    return SpriteLoader.instance;
  }

  // 加载单个精灵
  public loadSprite(key: string, src: string): Promise<void> {
    if (this.sprites[key]) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites[key] = img;
        this.loadingPromises.delete(key);
        resolve();
      };
      img.onerror = () => {
        this.loadingPromises.delete(key);
        reject(new Error(`Failed to load sprite: ${src}`));
      };
      img.src = src;
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  // 加载多个精灵
  public loadSprites(spriteMap: { [key: string]: string }): Promise<void[]> {
    const promises: Promise<void>[] = [];
    for (const [key, src] of Object.entries(spriteMap)) {
      promises.push(this.loadSprite(key, src));
    }
    return Promise.all(promises);
  }

  // 获取精灵
  public getSprite(key: string): HTMLImageElement | HTMLCanvasElement | null {
    return this.sprites[key] || null;
  }

  // 创建简单的SVG精灵作为后备
  public createSvgSprite(key: string, svgContent: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // 解析SVG尺寸
    const width = 64;
    const height = 64;
    canvas.width = width;
    canvas.height = height;

    // 创建临时图像加载SVG
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgContent);

    this.sprites[key] = canvas;
    return canvas;
  }

  // 预加载游戏所需的所有精灵
  public async preloadGameSprites(): Promise<void> {
    // 这里将在后续实现中加载实际的图像资源
    // 现在我们创建一些基本的SVG精灵作为占位符
    this.createDefaultSprites();
  }

  // 创建默认的SVG精灵
  private createDefaultSprites(): void {
    // 玩家精灵
    this.createSvgSprite('player_idle', `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="30" width="24" height="30" fill="#4ECDC4" />
        <circle cx="32" cy="20" r="12" fill="#FFD700" />
        <path d="M20 45 L32 60 L44 45" fill="none" stroke="#FF6B6B" stroke-width="3" />
      </svg>
    `);

    // 怪物精灵
    this.createSvgSprite('monster_normal', `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="20" fill="#FF6B6B" />
        <circle cx="26" cy="26" r="4" fill="white" />
        <circle cx="38" cy="26" r="4" fill="white" />
        <path d="M24 36 Q32 42 40 36" fill="none" stroke="white" stroke-width="3" />
      </svg>
    `);

    this.createSvgSprite('monster_elite', `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="25" fill="#FFD700" />
        <circle cx="26" cy="26" r="5" fill="white" />
        <circle cx="38" cy="26" r="5" fill="white" />
        <path d="M22 38 Q32 45 42 38" fill="none" stroke="white" stroke-width="4" />
        <circle cx="32" cy="32" r="15" fill="#FF9800" opacity="0.5" />
      </svg>
    `);

    this.createSvgSprite('monster_boss', `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#9C27B0" />
        <circle cx="26" cy="26" r="6" fill="white" />
        <circle cx="38" cy="26" r="6" fill="white" />
        <path d="M20 40 Q32 48 44 40" fill="none" stroke="white" stroke-width="5" />
        <circle cx="32" cy="32" r="20" fill="#673AB7" opacity="0.5" />
        <circle cx="32" cy="32" r="10" fill="#E91E63" opacity="0.7" />
      </svg>
    `);

    // 地形瓦片精灵
    this.createSvgSprite('tile_grass', `
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#8BC34A" />
        <path d="M16 8 L18 12 L14 12 Z" fill="#689F38" />
        <path d="M8 16 L12 18 L12 14 Z" fill="#689F38" />
        <path d="M24 16 L28 18 L28 14 Z" fill="#689F38" />
        <path d="M16 24 L18 28 L14 28 Z" fill="#689F38" />
      </svg>
    `);

    this.createSvgSprite('tile_wall', `
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#795548" />
        <rect x="4" y="4" width="24" height="24" fill="#5D4037" />
        <line x1="4" y1="16" x2="28" y2="16" stroke="#8D6E63" stroke-width="2" />
        <line x1="16" y1="4" x2="16" y2="28" stroke="#8D6E63" stroke-width="2" />
      </svg>
    `);

    this.createSvgSprite('tile_tree', `
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="20" width="4" height="12" fill="#8B4513" />
        <circle cx="16" cy="16" r="8" fill="#4CAF50" />
        <circle cx="16" cy="12" r="6" fill="#66BB6A" />
        <circle cx="12" cy="16" r="5" fill="#66BB6A" />
        <circle cx="20" cy="16" r="5" fill="#66BB6A" />
      </svg>
    `);

    this.createSvgSprite('tile_rock', `
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="10" fill="#9E9E9E" />
        <path d="M16 6 Q26 16 16 26 Q6 16 16 6" fill="none" stroke="#757575" stroke-width="2" />
        <path d="M10 16 Q16 10 22 16 Q16 22 10 16" fill="none" stroke="#757575" stroke-width="2" />
      </svg>
    `);
  }
}