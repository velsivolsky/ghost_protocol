let glProgram = null;
let glCanvasRef = null;
let glRef = null;
let glBuffer = null;
let glDataTexture = null;
let glWallAtlasTexture = null;
let glFloorAtlasTexture = null;
let glCeilingAtlasTexture = null;
let glMapTexture = null;
let glZTexture = null;
let glColumnData = null;
let glZData = null;
let glMapData = null;
let glLastWidth = 0;
let glLastHeight = 0;
let attribPos = -1;

let uniformColumns = null;
let uniformScreen = null;
let uniformHalfH = null;
let uniformDataTex = null;
let uniformWallAtlasTex = null;
let uniformFloorAtlasTex = null;
let uniformCeilingAtlasTex = null;
let uniformMapTex = null;
let uniformZTex = null;
let uniformMapSize = null;
let uniformPlayerPos = null;
let uniformDir = null;
let uniformPlane = null;
let uniformWallAtlasGrid = null;
let uniformFloorAtlasGrid = null;
let uniformCeilingAtlasGrid = null;
let uniformWallAtlasEnabled = null;
let uniformFloorAtlasEnabled = null;
let uniformCeilingAtlasEnabled = null;
let uniformFloorEnabled = null;
let uniformFloorMaxDist = null;
let uniformZMaxDist = null;

let lastWallAtlasCanvas = null;
let lastWallAtlasW = 0;
let lastWallAtlasH = 0;
let lastFloorPixelsRef = null;
let lastCeilingPixelsRef = null;
let lastFloorAtlasW = 0;
let lastFloorAtlasH = 0;
let lastCeilingAtlasW = 0;
let lastCeilingAtlasH = 0;
let lastMapW = 0;
let lastMapH = 0;

const WALL_FOG_DIST = 14;
const Z_MAX_DIST = 24;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl) {
  const vs = createShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `);

  const fs = createShader(gl, gl.FRAGMENT_SHADER, `
    precision highp float;

    varying vec2 vUv;

    uniform sampler2D uDataTex;
    uniform sampler2D uWallAtlasTex;
    uniform sampler2D uFloorAtlasTex;
    uniform sampler2D uCeilingAtlasTex;
    uniform sampler2D uMapTex;
    uniform sampler2D uZTex;

    uniform float uColumns;
    uniform vec2 uScreen;
    uniform float uHalfH;
    uniform vec2 uMapSize;
    uniform vec2 uPlayerPos;
    uniform vec2 uDir;
    uniform vec2 uPlane;
    uniform vec2 uWallAtlasGrid;
    uniform vec2 uFloorAtlasGrid;
    uniform vec2 uCeilingAtlasGrid;
    uniform float uWallAtlasEnabled;
    uniform float uFloorAtlasEnabled;
    uniform float uCeilingAtlasEnabled;
    uniform float uFloorEnabled;
    uniform float uFloorMaxDist;
    uniform float uZMaxDist;

    vec3 ceilingColor(float xPx, float yPx, float yN) {
      vec3 topCol = vec3(0.0, 0.0, 0.0);
      vec3 midCol = vec3(0.02, 0.055, 0.03);
      vec3 lowCol = vec3(0.035, 0.08, 0.045);
      float t = clamp(yN * 2.0, 0.0, 1.0);
      vec3 gradient = (t < 0.6)
        ? mix(topCol, midCol, t / 0.6)
        : mix(midCol, lowCol, (t - 0.6) / 0.4);

      if (uCeilingAtlasEnabled < 0.5 || yPx >= uHalfH) {
        return gradient;
      }

      float rowDist = uHalfH / max(1.0, uHalfH - yPx);
      float cameraX = (2.0 * xPx) / uScreen.x - 1.0;
      vec2 world = uPlayerPos + rowDist * (uDir + uPlane * cameraX);
      vec2 tile = floor(world);
      float h = fract(sin(dot(tile, vec2(41.873, 93.217))) * 27487.354);
      float variant = floor(h * (uCeilingAtlasGrid.x * uCeilingAtlasGrid.y));
      float vTileX = mod(variant, uCeilingAtlasGrid.x);
      float vTileY = floor(variant / uCeilingAtlasGrid.x);
      vec2 fracUv = fract(world);
      vec2 atlasUv = vec2(
        (vTileX + fracUv.x) / uCeilingAtlasGrid.x,
        (vTileY + fracUv.y) / uCeilingAtlasGrid.y
      );
      vec3 col = texture2D(uCeilingAtlasTex, atlasUv).rgb;
      float fog = max(0.18, 1.0 - rowDist / 18.0);
      return col * fog;
    }

    vec3 floorFallbackColor(float yN) {
      vec3 nearCol = vec3(0.025, 0.07, 0.035);
      vec3 farCol = vec3(0.01, 0.03, 0.018);
      float t = clamp((yN - 0.5) * 2.0, 0.0, 1.0);
      return mix(nearCol, farCol, t);
    }

    vec3 wallBase(float tile) {
      if (abs(tile - 1.0) < 0.5) return vec3(18.0, 52.0, 28.0) / 255.0;
      if (abs(tile - 6.0) < 0.5) return vec3(12.0, 55.0, 50.0) / 255.0;
      if (abs(tile - 12.0) < 0.5) return vec3(60.0, 18.0, 8.0) / 255.0;
      if (abs(tile - 4.0) < 0.5) return vec3(0.0, 85.0, 60.0) / 255.0;
      if (abs(tile - 5.0) < 0.5) return vec3(0.0, 55.0, 85.0) / 255.0;
      if (abs(tile - 8.0) < 0.5) return vec3(0.0, 45.0, 65.0) / 255.0;
      if (abs(tile - 13.0) < 0.5) return vec3(70.0, 45.0, 0.0) / 255.0;
      return vec3(22.0, 48.0, 28.0) / 255.0;
    }

    bool isFloorRenderable(float tile) {
      if (abs(tile - 1.0) < 0.5) return false;
      if (abs(tile - 6.0) < 0.5) return false;
      if (abs(tile - 12.0) < 0.5) return false;
      if (abs(tile - 8.0) < 0.5) return false;
      if (abs(tile - 4.0) < 0.5) return false;
      if (abs(tile - 5.0) < 0.5) return false;
      if (abs(tile - 13.0) < 0.5) return false;
      return true;
    }

    float floorVariant(vec2 tilePos) {
      float h = fract(sin(dot(tilePos, vec2(12.9898, 78.233))) * 43758.5453);
      return floor(h * 9.0);
    }

    vec3 wallColor(float distN, float side, float hitTile, float variant, float texU, float yPx) {
      vec3 col;

      if (uWallAtlasEnabled > 0.5 && abs(hitTile - 1.0) < 0.5) {
        float tileX = mod(variant, uWallAtlasGrid.x);
        float tileY = floor(variant / uWallAtlasGrid.x);
        float wallU = clamp(texU, 0.0, 0.9995);
        float dist = max(0.08, distN * 14.0);
        float lineH = min(uScreen.y * 2.0, uScreen.y / dist);
        float wallTop = uHalfH - lineH * 0.5;
        float wallV = clamp((yPx - wallTop) / max(1.0, lineH), 0.0, 0.9995);
        vec2 uv = vec2(
          (tileX + wallU) / uWallAtlasGrid.x,
          (tileY + wallV) / uWallAtlasGrid.y
        );
        col = texture2D(uWallAtlasTex, uv).rgb;
      } else {
        col = wallBase(hitTile);
      }

      float fog = max(0.12, 1.0 - distN);
      float sideDim = mix(1.0, 0.58, step(0.5, side));
      return col * fog * sideDim;
    }

    vec3 floorColor(float xPx, float yPx, float zDistN, float yN) {
      if (uFloorEnabled < 0.5 || uFloorAtlasEnabled < 0.5) {
        return floorFallbackColor(yN);
      }

      if (yPx <= uHalfH + 1.0) {
        return floorFallbackColor(yN);
      }

      float rowDist = uHalfH / max(1.0, yPx - uHalfH);
      if (rowDist > uFloorMaxDist) {
        return floorFallbackColor(yN);
      }

      float rowDistN = min(1.0, rowDist / uZMaxDist);
      if (rowDistN >= zDistN) {
        return floorFallbackColor(yN);
      }

      float cameraX = (2.0 * xPx) / uScreen.x - 1.0;
      vec2 world = uPlayerPos + rowDist * (uDir + uPlane * cameraX);
      vec2 tile = floor(world);

      if (tile.x < 0.0 || tile.y < 0.0 || tile.x >= uMapSize.x || tile.y >= uMapSize.y) {
        return floorFallbackColor(yN);
      }

      vec2 mapUv = (tile + vec2(0.5, 0.5)) / uMapSize;
      float tileType = floor(texture2D(uMapTex, mapUv).r * 255.0 + 0.5);
      if (!isFloorRenderable(tileType)) {
        return floorFallbackColor(yN);
      }

      vec2 tileCenter = tile + vec2(0.5, 0.5);
      vec2 rel = tileCenter - uPlayerPos;
      if (dot(rel, uDir) <= 0.001) {
        return floorFallbackColor(yN);
      }

      float variant = floorVariant(tile);
      float vTileX = mod(variant, uFloorAtlasGrid.x);
      float vTileY = floor(variant / uFloorAtlasGrid.x);
      vec2 fracUv = fract(world);
      vec2 atlasUv = vec2(
        (vTileX + fracUv.x) / uFloorAtlasGrid.x,
        (vTileY + fracUv.y) / uFloorAtlasGrid.y
      );

      vec3 col = texture2D(uFloorAtlasTex, atlasUv).rgb;
      float fog = max(0.18, 1.0 - rowDist / 16.0);
      return col * fog;
    }

    void main() {
      float colIndex = min(uColumns - 1.0, floor(vUv.x * uColumns));
      float texX = (colIndex + 0.5) / uColumns;

      vec4 geom = texture2D(uDataTex, vec2(texX, 0.25));
      vec4 texData = texture2D(uDataTex, vec2(texX, 0.75));
      float zDistN = texture2D(uZTex, vec2(texX, 0.5)).r;

      float sLo = floor(geom.r * 255.0 + 0.5);
      float sHi = floor(geom.g * 255.0 + 0.5);
      float eLo = floor(geom.b * 255.0 + 0.5);
      float eHi = floor(geom.a * 255.0 + 0.5);
      float startY = sLo + sHi * 256.0;
      float endY = eLo + eHi * 256.0;

      float distN = texData.r;
      float texU = texData.g;
      float sideTile = floor(texData.b * 255.0 + 0.5);
      float variant = floor(texData.a * 255.0 + 0.5);
      float side = step(127.5, sideTile);
      float hitTile = mod(sideTile, 128.0);
      float yN = 1.0 - vUv.y;
      float yPx = yN * uScreen.y;
      float xPx = vUv.x * uScreen.x;

      vec3 color;
      if (endY <= startY + 0.5) {
        color = (yPx < uHalfH)
          ? ceilingColor(xPx, yPx, yN)
          : floorColor(xPx, yPx, zDistN, yN);
      } else if (yPx < startY) {
        color = ceilingColor(xPx, yPx, yN);
      } else if (yPx > endY) {
        color = floorColor(xPx, yPx, zDistN, yN);
      } else {
        color = wallColor(distN, side, hitTile, variant, texU, yPx);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `);

  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function ensureCanvas(G) {
  if (glCanvasRef && document.body.contains(glCanvasRef)) {
    return glCanvasRef;
  }

  if (!G.canvas || !G.canvas.parentNode) {
    return null;
  }

  const glCanvas = document.createElement('canvas');
  glCanvas.id = 'gc-gl';
  glCanvas.style.position = 'fixed';
  glCanvas.style.top = '36px';
  glCanvas.style.left = '0';
  glCanvas.style.right = '0';
  glCanvas.style.bottom = '0';
  glCanvas.style.display = 'block';
  glCanvas.style.zIndex = '0';
  glCanvas.style.pointerEvents = 'none';
  G.canvas.parentNode.insertBefore(glCanvas, G.canvas);
  G.canvas.style.zIndex = '1';
  G.canvas.style.background = 'transparent';
  glCanvasRef = glCanvas;
  return glCanvasRef;
}

function configureTexture(gl, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function uploadFallbackTexture(gl, texture, rgba) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(rgba)
  );
}

export function initWebGLRenderer(G) {
  const glCanvas = ensureCanvas(G);
  if (!glCanvas) {
    G.webglEnabled = false;
    return false;
  }

  const gl = glCanvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });

  if (!gl) {
    G.webglEnabled = false;
    return false;
  }

  const program = createProgram(gl);
  if (!program) {
    G.webglEnabled = false;
    return false;
  }

  const buffer = gl.createBuffer();
  const dataTexture = gl.createTexture();
  const wallTexture = gl.createTexture();
  const floorTexture = gl.createTexture();
  const ceilingTexture = gl.createTexture();
  const mapTexture = gl.createTexture();
  const zTexture = gl.createTexture();

  if (!buffer || !dataTexture || !wallTexture || !floorTexture || !ceilingTexture || !mapTexture || !zTexture) {
    if (buffer) gl.deleteBuffer(buffer);
    if (dataTexture) gl.deleteTexture(dataTexture);
    if (wallTexture) gl.deleteTexture(wallTexture);
    if (floorTexture) gl.deleteTexture(floorTexture);
    if (ceilingTexture) gl.deleteTexture(ceilingTexture);
    if (mapTexture) gl.deleteTexture(mapTexture);
    if (zTexture) gl.deleteTexture(zTexture);
    gl.deleteProgram(program);
    G.webglEnabled = false;
    return false;
  }

  glProgram = program;
  glRef = gl;
  glBuffer = buffer;
  glDataTexture = dataTexture;
  glWallAtlasTexture = wallTexture;
  glFloorAtlasTexture = floorTexture;
  glCeilingAtlasTexture = ceilingTexture;
  glMapTexture = mapTexture;
  glZTexture = zTexture;

  attribPos = gl.getAttribLocation(program, 'aPos');
  uniformColumns = gl.getUniformLocation(program, 'uColumns');
  uniformScreen = gl.getUniformLocation(program, 'uScreen');
  uniformHalfH = gl.getUniformLocation(program, 'uHalfH');
  uniformDataTex = gl.getUniformLocation(program, 'uDataTex');
  uniformWallAtlasTex = gl.getUniformLocation(program, 'uWallAtlasTex');
  uniformFloorAtlasTex = gl.getUniformLocation(program, 'uFloorAtlasTex');
  uniformCeilingAtlasTex = gl.getUniformLocation(program, 'uCeilingAtlasTex');
  uniformMapTex = gl.getUniformLocation(program, 'uMapTex');
  uniformZTex = gl.getUniformLocation(program, 'uZTex');
  uniformMapSize = gl.getUniformLocation(program, 'uMapSize');
  uniformPlayerPos = gl.getUniformLocation(program, 'uPlayerPos');
  uniformDir = gl.getUniformLocation(program, 'uDir');
  uniformPlane = gl.getUniformLocation(program, 'uPlane');
  uniformWallAtlasGrid = gl.getUniformLocation(program, 'uWallAtlasGrid');
  uniformFloorAtlasGrid = gl.getUniformLocation(program, 'uFloorAtlasGrid');
  uniformCeilingAtlasGrid = gl.getUniformLocation(program, 'uCeilingAtlasGrid');
  uniformWallAtlasEnabled = gl.getUniformLocation(program, 'uWallAtlasEnabled');
  uniformFloorAtlasEnabled = gl.getUniformLocation(program, 'uFloorAtlasEnabled');
  uniformCeilingAtlasEnabled = gl.getUniformLocation(program, 'uCeilingAtlasEnabled');
  uniformFloorEnabled = gl.getUniformLocation(program, 'uFloorEnabled');
  uniformFloorMaxDist = gl.getUniformLocation(program, 'uFloorMaxDist');
  uniformZMaxDist = gl.getUniformLocation(program, 'uZMaxDist');

  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]), gl.STATIC_DRAW);

  configureTexture(gl, glDataTexture);
  configureTexture(gl, glWallAtlasTexture);
  configureTexture(gl, glFloorAtlasTexture);
  configureTexture(gl, glCeilingAtlasTexture);
  configureTexture(gl, glMapTexture);
  configureTexture(gl, glZTexture);

  uploadFallbackTexture(gl, glWallAtlasTexture, [18, 52, 28, 255]);
  uploadFallbackTexture(gl, glFloorAtlasTexture, [12, 35, 20, 255]);
  uploadFallbackTexture(gl, glCeilingAtlasTexture, [8, 14, 10, 255]);
  uploadFallbackTexture(gl, glMapTexture, [0, 0, 0, 255]);
  uploadFallbackTexture(gl, glZTexture, [255, 0, 0, 255]);

  G.glCanvas = glCanvas;
  G.gl = gl;
  G.webglEnabled = true;
  return true;
}

export function resizeWebGLRenderer(G, width, height) {
  if (!G.webglEnabled || !G.glCanvas || !G.gl) return;
  G.glCanvas.width = width;
  G.glCanvas.height = height;
  G.gl.viewport(0, 0, width, height);
  glLastWidth = width;
  glLastHeight = height;
}

function ensureColumnBuffers(width) {
  const neededCol = width * 8;
  if (!glColumnData || glColumnData.length !== neededCol) {
    glColumnData = new Uint8Array(neededCol);
  }

  const neededZ = width * 4;
  if (!glZData || glZData.length !== neededZ) {
    glZData = new Uint8Array(neededZ);
  }
}

function updateMapTexture(gl, tileFlat, mapW, mapH) {
  if (!glMapTexture || !tileFlat || mapW <= 0 || mapH <= 0) {
    return;
  }

  const needed = mapW * mapH * 4;
  if (!glMapData || glMapData.length !== needed || mapW !== lastMapW || mapH !== lastMapH) {
    glMapData = new Uint8Array(needed);
    lastMapW = mapW;
    lastMapH = mapH;
  }

  const total = mapW * mapH;
  for (let i = 0; i < total; i += 1) {
    const v = tileFlat[i] & 0xFF;
    const b = i * 4;
    glMapData[b] = v;
    glMapData[b + 1] = 0;
    glMapData[b + 2] = 0;
    glMapData[b + 3] = 255;
  }

  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, glMapTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mapW, mapH, 0, gl.RGBA, gl.UNSIGNED_BYTE, glMapData);
}

function updateWallAtlasTexture(gl, wallAtlasReady, wallAtlasCanvas) {
  if (!glWallAtlasTexture) return;

  if (!wallAtlasReady || !wallAtlasCanvas) {
    return;
  }

  const w = wallAtlasCanvas.width | 0;
  const h = wallAtlasCanvas.height | 0;
  if (w <= 0 || h <= 0) {
    return;
  }

  if (wallAtlasCanvas === lastWallAtlasCanvas && w === lastWallAtlasW && h === lastWallAtlasH) {
    return;
  }

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, glWallAtlasTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallAtlasCanvas);

  lastWallAtlasCanvas = wallAtlasCanvas;
  lastWallAtlasW = w;
  lastWallAtlasH = h;
}

function updateFloorAtlasTexture(gl, floorAtlasReady, floorAtlasPixels, floorAtlasWidth, floorAtlasHeight) {
  if (!glFloorAtlasTexture) return;
  if (!floorAtlasReady || !floorAtlasPixels || floorAtlasWidth <= 0 || floorAtlasHeight <= 0) {
    return;
  }

  if (floorAtlasPixels === lastFloorPixelsRef && floorAtlasWidth === lastFloorAtlasW && floorAtlasHeight === lastFloorAtlasH) {
    return;
  }

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, glFloorAtlasTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    floorAtlasWidth,
    floorAtlasHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    floorAtlasPixels
  );

  lastFloorPixelsRef = floorAtlasPixels;
  lastFloorAtlasW = floorAtlasWidth;
  lastFloorAtlasH = floorAtlasHeight;
}

function updateCeilingAtlasTexture(gl, ceilingAtlasReady, ceilingAtlasPixels, ceilingAtlasWidth, ceilingAtlasHeight) {
  if (!glCeilingAtlasTexture) return;
  if (!ceilingAtlasReady || !ceilingAtlasPixels || ceilingAtlasWidth <= 0 || ceilingAtlasHeight <= 0) {
    return;
  }

  if (ceilingAtlasPixels === lastCeilingPixelsRef && ceilingAtlasWidth === lastCeilingAtlasW && ceilingAtlasHeight === lastCeilingAtlasH) {
    return;
  }

  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, glCeilingAtlasTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    ceilingAtlasWidth,
    ceilingAtlasHeight,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    ceilingAtlasPixels
  );

  lastCeilingPixelsRef = ceilingAtlasPixels;
  lastCeilingAtlasW = ceilingAtlasWidth;
  lastCeilingAtlasH = ceilingAtlasHeight;
}

export function renderRaycastWebGL(G, params) {
  if (!G.webglEnabled || !glRef || !glProgram || !glDataTexture) {
    return false;
  }

  const {
    width,
    height,
    halfH,
    drawStart,
    drawEnd,
    perpDist,
    side,
    texU,
    hitTile,
    mapX,
    mapY,
    zBuffer,
    wallVariantsFlat,
    wallVariantsFlatW,
    tileFlat,
    tileMapW,
    tileMapH,
    playerX,
    playerY,
    dirX,
    dirY,
    planeX,
    planeY,
    wallAtlasReady,
    wallAtlasCanvas,
    wallAtlasCols,
    wallAtlasRows,
    floorEnabled,
    floorMaxRowDist,
    floorAtlasReady,
    floorAtlasPixels,
    floorAtlasWidth,
    floorAtlasHeight,
    floorAtlasCols,
    floorAtlasRows,
    ceilingAtlasReady,
    ceilingAtlasPixels,
    ceilingAtlasWidth,
    ceilingAtlasHeight,
    ceilingAtlasCols,
    ceilingAtlasRows,
  } = params;

  if (glLastWidth !== width || glLastHeight !== height) {
    resizeWebGLRenderer(G, width, height);
  }

  const gl = glRef;
  ensureColumnBuffers(width);

  for (let i = 0; i < width; i += 1) {
    const row0 = i * 4;
    const row1 = width * 4 + i * 4;
    const ds = Math.max(0, Math.min(height - 1, drawStart[i] | 0));
    const de = Math.max(0, Math.min(height - 1, drawEnd[i] | 0));
    const dist = Math.max(0.08, Math.min(WALL_FOG_DIST, perpDist[i] || WALL_FOG_DIST));

    let u = texU[i];
    if (!Number.isFinite(u)) u = 0;
    if (u < 0) u = 0;
    if (u > 1) u = 1;

    let variant = 0;
    if (wallVariantsFlat && wallVariantsFlatW > 0) {
      const mx = mapX[i] | 0;
      const my = mapY[i] | 0;
      const idx = my * wallVariantsFlatW + mx;
      if (idx >= 0 && idx < wallVariantsFlat.length) {
        variant = wallVariantsFlat[idx] & 0xFF;
      }
    }

    glColumnData[row0] = ds & 0xFF;
    glColumnData[row0 + 1] = (ds >> 8) & 0xFF;
    glColumnData[row0 + 2] = de & 0xFF;
    glColumnData[row0 + 3] = (de >> 8) & 0xFF;

    const tileType = hitTile[i] < 0 ? 0 : (hitTile[i] & 0x7F);
    const sideTile = (side[i] ? 0x80 : 0x00) | tileType;

    glColumnData[row1] = ((dist / WALL_FOG_DIST) * 255) | 0;
    glColumnData[row1 + 1] = (u * 255) | 0;
    glColumnData[row1 + 2] = sideTile;
    glColumnData[row1 + 3] = Math.max(0, Math.min(8, variant)) & 0xFF;

    const z = Math.max(0.08, Math.min(Z_MAX_DIST, zBuffer && Number.isFinite(zBuffer[i]) ? zBuffer[i] : Z_MAX_DIST));
    const zb = i * 4;
    glZData[zb] = ((z / Z_MAX_DIST) * 255) | 0;
    glZData[zb + 1] = 0;
    glZData[zb + 2] = 0;
    glZData[zb + 3] = 255;
  }

  updateWallAtlasTexture(gl, wallAtlasReady, wallAtlasCanvas);
  updateFloorAtlasTexture(gl, floorAtlasReady, floorAtlasPixels, floorAtlasWidth, floorAtlasHeight);
  updateCeilingAtlasTexture(gl, ceilingAtlasReady, ceilingAtlasPixels, ceilingAtlasWidth, ceilingAtlasHeight);
  updateMapTexture(gl, tileFlat, tileMapW, tileMapH);

  gl.useProgram(glProgram);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
  gl.enableVertexAttribArray(attribPos);
  gl.vertexAttribPointer(attribPos, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, glDataTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, glColumnData);

  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, glZTexture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, glZData);

  gl.uniform1i(uniformDataTex, 0);
  gl.uniform1i(uniformWallAtlasTex, 1);
  gl.uniform1i(uniformFloorAtlasTex, 2);
  gl.uniform1i(uniformMapTex, 3);
  gl.uniform1i(uniformZTex, 4);
  gl.uniform1i(uniformCeilingAtlasTex, 5);

  gl.uniform1f(uniformColumns, width);
  gl.uniform2f(uniformScreen, width, height);
  gl.uniform1f(uniformHalfH, halfH);
  gl.uniform2f(uniformMapSize, Math.max(1, tileMapW), Math.max(1, tileMapH));
  gl.uniform2f(uniformPlayerPos, playerX, playerY);
  gl.uniform2f(uniformDir, dirX, dirY);
  gl.uniform2f(uniformPlane, planeX, planeY);
  gl.uniform2f(uniformWallAtlasGrid, Math.max(1, wallAtlasCols), Math.max(1, wallAtlasRows));
  gl.uniform2f(uniformFloorAtlasGrid, Math.max(1, floorAtlasCols), Math.max(1, floorAtlasRows));
  gl.uniform2f(uniformCeilingAtlasGrid, Math.max(1, ceilingAtlasCols || 1), Math.max(1, ceilingAtlasRows || 1));
  gl.uniform1f(uniformWallAtlasEnabled, wallAtlasReady ? 1 : 0);
  gl.uniform1f(uniformFloorAtlasEnabled, floorAtlasReady ? 1 : 0);
  gl.uniform1f(uniformCeilingAtlasEnabled, ceilingAtlasReady ? 1 : 0);
  gl.uniform1f(uniformFloorEnabled, floorEnabled ? 1 : 0);
  gl.uniform1f(uniformFloorMaxDist, Math.max(1, floorMaxRowDist || 10));
  gl.uniform1f(uniformZMaxDist, Z_MAX_DIST);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

export function clearWebGLRenderer(G) {
  if (!G.webglEnabled || !G.gl) return;
  G.gl.viewport(0, 0, G.glCanvas.width, G.glCanvas.height);
  G.gl.clearColor(0, 0, 0, 1);
  G.gl.clear(G.gl.COLOR_BUFFER_BIT);
}
