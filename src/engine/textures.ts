import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D context for procedural texture.');
  }
  return [canvas, ctx];
}

export function createDesertDirtTexture(baseHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tire ruts and strata striations along track U/V
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 3.5;
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(255, 210, 175, 0.09)' : 'rgba(38, 16, 8, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle tire-track grooves
  ctx.strokeStyle = 'rgba(30, 14, 7, 0.18)';
  ctx.lineWidth = 5;
  for (const laneX of [180, 210, 302, 332]) {
    ctx.beginPath();
    ctx.moveTo(laneX, 0);
    for (let y = 0; y <= 512; y += 32) {
      ctx.lineTo(laneX + Math.sin(y * 0.04) * 4, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSandstoneCliffTexture(baseHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal sedimentary rock strata bands
  const bands = [
    'rgba(255, 175, 110, 0.14)',
    'rgba(45, 18, 10, 0.22)',
    'rgba(214, 96, 46, 0.18)',
    'rgba(24, 10, 8, 0.16)',
  ];
  let y = 0;
  while (y < 512) {
    const h = 8 + Math.random() * 26;
    ctx.fillStyle = bands[Math.floor(Math.random() * bands.length)];
    ctx.fillRect(0, y, 512, h);
    y += h;
  }

  // Craggy vertical fissures
  for (let i = 0; i < 65; i++) {
    const x = Math.random() * 512;
    ctx.strokeStyle = 'rgba(20, 8, 5, 0.18)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 32, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRampPlankTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#7C4A2D';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? 'rgba(255, 220, 185, 0.08)' : 'rgba(20, 10, 4, 0.12)';
    ctx.fillRect(0, y, 512, 30);
    ctx.fillStyle = 'rgba(15, 8, 4, 0.45)';
    ctx.fillRect(0, y + 30, 512, 2);
  }

  // Burnt-orange chevron launch stripes
  ctx.fillStyle = '#E85D04';
  for (let y = 90; y < 440; y += 110) {
    ctx.beginPath();
    ctx.moveTo(96, y + 40);
    ctx.lineTo(256, y);
    ctx.lineTo(416, y + 40);
    ctx.lineTo(416, y + 66);
    ctx.lineTo(256, y + 26);
    ctx.lineTo(96, y + 66);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCheckerBannerTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 128);
  const size = 32;
  for (let y = 0; y < 128; y += size) {
    for (let x = 0; x < 512; x += size) {
      const dark = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = dark ? '#16110E' : '#F5EFEA';
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.fillStyle = '#E85D04';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 118, 512, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSunsetSkyTexture(topHex: string, horizonHex: string): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, topHex);
  grad.addColorStop(0.48, '#53252A');
  grad.addColorStop(0.74, '#BA431D');
  grad.addColorStop(0.90, horizonHex);
  grad.addColorStop(1.0, '#F59E0B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle desert sun glow disc near horizon
  const sunGrad = ctx.createRadialGradient(256, 390, 8, 256, 390, 175);
  sunGrad.addColorStop(0, 'rgba(255, 244, 214, 0.92)');
  sunGrad.addColorStop(0.22, 'rgba(245, 158, 11, 0.55)');
  sunGrad.addColorStop(0.65, 'rgba(232, 93, 4, 0.16)');
  sunGrad.addColorStop(1, 'rgba(232, 93, 4, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 180, 512, 332);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 120);
  grad.addColorStop(0, 'rgba(10, 6, 4, 0.85)');
  grad.addColorStop(0.55, 'rgba(10, 6, 4, 0.35)');
  grad.addColorStop(1, 'rgba(10, 6, 4, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
