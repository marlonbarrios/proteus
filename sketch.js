import './style.css';

/** Text (Llama stream) + portrait still (FLUX via Replicate). */

async function postReplicate(body) {
  const res = await fetch('/api/replicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

/** Llama (etc.) token stream via server SSE — see handleReplicateTextStream */
async function streamReplicateProfileText(prompt, onChunk) {
  const res = await fetch('/api/replicate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      textInput: {
        prompt,
        max_tokens: 1600,
        temperature: 0.9,
        top_p: 0.92,
      },
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      const t = await res.text();
      if (t) msg = t;
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });

    for (;;) {
      const sep = carry.indexOf('\n\n');
      if (sep === -1) break;
      const block = carry.slice(0, sep);
      carry = carry.slice(sep + 2);

      for (const line of block.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        let payload;
        try {
          payload = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (payload.error) throw new Error(payload.error);
        if (payload.done) return;
        if (payload.chunk != null) onChunk(payload.chunk);
      }
    }
  }
}
let isLoading = false;
let sampleSound; // Declare the variable for the sound
let isSoundPlaying = false; // Track the playing state

// Add p5 preload image variable
let currentImage = null;

/** True after profile text is done, while FLUX portrait is still loading. */
let awaitingPortraitImage = false;

/** Minimal techno — dark / light palettes (mutable `THEME` is the active set). */
const THEME_PRESETS = {
  dark: {
    bg: [11, 11, 14],
    panel: [22, 22, 28],
    grid: [36, 38, 48],
    text: [228, 230, 236],
    muted: [100, 104, 118],
    accent: [96, 188, 255],
    accentDim: [56, 100, 140],
    line: [48, 50, 60],
  },
  light: {
    bg: [246, 246, 249],
    panel: [255, 255, 255],
    grid: [210, 213, 222],
    text: [36, 38, 48],
    muted: [108, 112, 128],
    accent: [32, 96, 200],
    accentDim: [80, 118, 175],
    line: [198, 201, 212],
  },
};

const THEME = { ...THEME_PRESETS.light };
let uiThemeKey = 'light';

const UI_MONO = 'IBM Plex Mono';

/** Hit test for `drawThemeToggle` (set each frame). */
let themeToggleBounds = { x: 0, y: 0, w: 0, h: 0, valid: false };

function rgbToHex(rgb) {
  const [r, g, b] = rgb;
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function syncThemeDerivedUi() {
  TEXT_PARAMS.backgroundColor = [
    THEME.panel[0],
    THEME.panel[1],
    THEME.panel[2],
    240,
  ];
  TEXT_PARAMS.textColor = [THEME.text[0], THEME.text[1], THEME.text[2]];
  TEXT_PARAMS.glyphColor = [
    THEME.accent[0],
    THEME.accent[1],
    THEME.accent[2],
    40,
  ];
  TEXT_PARAMS.borderColor = [
    THEME.line[0],
    THEME.line[1],
    THEME.line[2],
    200,
  ];
  TEXT_PARAMS.glowColor = [
    THEME.accent[0],
    THEME.accent[1],
    THEME.accent[2],
    22,
  ];
  if (typeof document !== 'undefined') {
    document.body.style.background = `rgb(${THEME.bg[0]},${THEME.bg[1]},${THEME.bg[2]})`;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', rgbToHex(THEME.bg));
  }
}

function applyUiTheme(key) {
  if (!THEME_PRESETS[key]) return;
  uiThemeKey = key;
  Object.assign(THEME, THEME_PRESETS[key]);
  syncThemeDerivedUi();
}

function hitThemeToggle(mx, my) {
  if (!themeToggleBounds.valid) return false;
  const b = themeToggleBounds;
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}

/** Click left half → dark, right half → light */
function handleThemeToggleClick(mx, my) {
  if (!hitThemeToggle(mx, my)) return false;
  const b = themeToggleBounds;
  if (mx < b.x + b.w / 2) applyUiTheme('dark');
  else applyUiTheme('light');
  return true;
}

/** Minimal split control: D | L — accent marks the active theme. */
function drawThemeToggle(p) {
  const m = Math.max(14, Math.min(canvasWidth, canvasHeight) * 0.02);
  const w = 40;
  const h = 17;
  const x = m;
  const y = m;
  themeToggleBounds = { x, y, w, h, valid: true };

  p.push();
  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2]);
  p.strokeWeight(1);
  p.fill(THEME.panel[0], THEME.panel[1], THEME.panel[2]);
  p.rect(x, y, w, h, 3);

  const mid = x + w / 2;
  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2], 160);
  p.line(mid, y + 3, mid, y + h - 3);

  p.textFont(UI_MONO);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(9);
  p.noStroke();

  const dim = THEME.muted;
  const hi = THEME.accent;
  if (uiThemeKey === 'dark') {
    p.fill(hi[0], hi[1], hi[2]);
    p.text('D', x + w * 0.25, y + h / 2);
    p.fill(dim[0], dim[1], dim[2]);
    p.text('L', x + w * 0.75, y + h / 2);
  } else {
    p.fill(dim[0], dim[1], dim[2]);
    p.text('D', x + w * 0.25, y + h / 2);
    p.fill(hi[0], hi[1], hi[2]);
    p.text('L', x + w * 0.75, y + h / 2);
  }
  p.pop();
}

function applyThemeBackground(p) {
  p.background(THEME.bg[0], THEME.bg[1], THEME.bg[2]);
}

function drawTechnoGrid(p) {
  p.push();
  p.stroke(THEME.grid[0], THEME.grid[1], THEME.grid[2]);
  p.strokeWeight(1);
  const step = Math.max(56, Math.floor(Math.min(canvasWidth, canvasHeight) * 0.055));
  for (let x = 0; x <= canvasWidth; x += step) {
    p.line(x + 0.5, 0, x + 0.5, canvasHeight);
  }
  for (let y = 0; y <= canvasHeight; y += step) {
    p.line(0, y + 0.5, canvasWidth, y + 0.5);
  }
  p.pop();
}

// Add at the top with other global variables
let letters = [];
let textToShow = "";
let textIndex = 0;
let isDragging = false;
let lastConversionFrame = 0;
const conversionInterval = 60;
let canvasWidth;
let canvasHeight;

// Surveillance square dimensions (randomized each generation)
let surveillanceSquares = {
  main: { size: 0.6, x: 0, y: 0 },
  leftEye: { size: 0.08, x: -0.15, y: -0.15 },
  rightEye: { size: 0.08, x: 0.07, y: -0.15 },
  nose: { size: 0.06, x: 0, y: -0.05 },
  mouth: { size: 0.12, x: 0, y: 0.1 }
};

// Language system
let currentLanguage = 'english';
const languages = {
  english: { name: 'English', code: 'en' },
  spanish: { name: 'Español', code: 'es' },
  portuguese: { name: 'Português', code: 'pt' },
  french: { name: 'Français', code: 'fr' },
  german: { name: 'Deutsch', code: 'de' },
  turkish: { name: 'Türkçe', code: 'tr' },
  quechua: { name: 'Kichwa', code: 'qu' },
  nahuatl: { name: 'Nahuatl', code: 'nah' },
  guarani: { name: 'Guaraní', code: 'gn' }
};
let languageKeys = Object.keys(languages);
let currentLanguageIndex = 0;

// Add responsive sizing parameters
const BASE_PARAMS = {
  canvasWidth: 1920,  // Base canvas width for scaling
  canvasHeight: 1080, // Base canvas height for scaling
  fontSize: 32,       // Base font size
  boxSize: 45,       // Base box size
  lineHeight: 70,    // Base line height
  spacing: 25        // Base letter spacing
};

// Responsive scaling function
function updateResponsiveParams() {
  const scaleX = canvasWidth / BASE_PARAMS.canvasWidth;
  const scaleY = canvasHeight / BASE_PARAMS.canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1.2); // Cap scaling for very large screens
  
  // Update letter parameters responsively
  LETTER_PARAMS.size = Math.max(15, BASE_PARAMS.boxSize * scale * 0.6);
  LETTER_PARAMS.spacing = Math.max(2, BASE_PARAMS.spacing * scale * 0.2);
  LETTER_PARAMS.lineHeight = Math.max(25, BASE_PARAMS.lineHeight * scale * 0.6);
  LETTER_PARAMS.textSize = Math.max(12, BASE_PARAMS.fontSize * scale * 0.5);
  LETTER_PARAMS.marginX = Math.max(50, canvasWidth * 0.05);
  LETTER_PARAMS.marginY = Math.max(30, canvasHeight * 0.05);
  
  // Update text parameters (profile column — slightly larger body type)
  TEXT_PARAMS.fontSize = Math.max(14, BASE_PARAMS.fontSize * scale * 0.52);
  TEXT_PARAMS.lineHeight = Math.max(19, TEXT_PARAMS.fontSize * 1.38);
  TEXT_PARAMS.width = Math.min(canvasWidth * 0.8, 900);
  TEXT_PARAMS.padding = Math.max(20, canvasWidth * 0.02);
}

// Update LETTER_PARAMS to use responsive values
const LETTER_PARAMS = {
  size: 25,          // Reduced from 35 to 25
  spacing: 4,        // Reduced from 8 to 4
  lineHeight: 40,    // Reduced from 60 to 40
  cornerRadius: 6,   // Reduced from 8 to 6
  opacity: 235,      
  yOffset: 10,
  textSize: 16,      // Reduced from 24 to 16
  marginX: 100,      // Reduced from 250 to 100
  marginY: 40,       // Reduced from 120 to 40
  bottomOffset: 80   // New parameter for bottom positioning
};

const TEXT_PARAMS = {
  fontSize: 16,
  lineHeight: 22,
  padding: 40,
  width: Math.min(canvasWidth * 0.8, 900),
  backgroundColor: [THEME.panel[0], THEME.panel[1], THEME.panel[2], 240],
  textColor: [THEME.text[0], THEME.text[1], THEME.text[2]],
  glyphColor: [THEME.accent[0], THEME.accent[1], THEME.accent[2], 40],
  borderColor: [THEME.line[0], THEME.line[1], THEME.line[2], 200],
  glowColor: [THEME.accent[0], THEME.accent[1], THEME.accent[2], 22],
  borderWidth: 1,
  glowBlur: 8,
  font: UI_MONO,
};

syncThemeDerivedUi();

// Add these global variables at the top
let backgroundZoom = 1;
let backgroundX = 0;
let backgroundY = 0;
let zoomDirection = -1;
let panSpeed = 0.2;
let zoomSpeed = 0.0003;
let maxZoom = 1.5;
let minZoom = 0.9;
let panAmplitudeX = 100;
let panAmplitudeY = 80;
let panFrequency = 0.002;

// Add these global variables
let decayInterval = 2000; // Base interval for decay in milliseconds
let lastDecayTime = 0;    // Track last decay time
let decayProbability = 0.1; // Probability of decay per check

let startX, startY; // Add these variables for global scope

// Add a new flag to track initial load
let isInitialLoad = true;

// Add these global variables
let lastGenerationTime = 0;
const GENERATION_INTERVAL = 60000; // 1 minute in milliseconds

// Add these variables to store current and next content
let currentText = "";
let nextText = "";
let nextImage = null;
let isGenerating = false;

// Add a flag to track first load
let isFirstLoad = true;

// Add these to the global variables section
const TRAIL_LENGTH = 8;  // Number of positions to remember for trail
const TRAIL_OPACITY = 100;  // Base opacity for trail effect

// Add these global variables for sound
let oscillator;
let isOscillatorPlaying = false;

// Add sound parameters for the loader
const DRONE_PARAMS = {
  baseFreq: 180,
  maxFreq: 400,
  baseAmp: 0.3,
  maxAmp: 0.5,
  modulatorFreq: 80,
  modulatorDepth: 100,
  maxModFreq: 200,
  maxModDepth: 150,
  noiseLevel: 0
};

// Add modulator oscillator
let modulatorOsc;
let noiseOsc;

/** Per–Space-bar generation: new traveler, no default “same person”. */
let portalGenerationCount = 0;

function pickPromptVariant(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Function to generate prompt in selected language (unique anchors each time Space is pressed)
function getPrompt() {
  portalGenerationCount += 1;
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const lang = languages[currentLanguage].name;

  const locationSeed = pickPromptVariant([
    'Neo-Abya Yala arcology',
    'Tkaronto-3 floodline ward',
    'Digital Alkebulan relay',
    'Pachamama Station marsh decks',
    'Ubuntu-7 consensus ring',
    'Taíno Nexus salt-flats',
    'Kichwa uplink andes spine',
    'Nahua lakeshore temporal pier',
    'Guaraní river-cloud cooperative',
    'Sápmi ice-tunnel archive',
  ]);

  const vocationSeed = pickPromptVariant([
    'ancestral code weaver',
    'quantum memory curator',
    'decolonial AI whisper-trainer',
    'indigenous futures architect',
    'community healing facilitator',
    'orbital seed-keeper',
    'chronicle diver for suppressed timelines',
    'wetland carbon rights advocate',
    'dream-protocol negotiator',
    'tidal consent engineer',
    'memory-sovereignty broker',
    'biome grief counselor',
    'relay-symbiosis technician',
    'archive breath-curator',
  ]);

  /** Concrete future year they’re from — always state this in the profile. */
  const homeYearSeed = pickPromptVariant([
    '2114',
    '2127',
    '2139',
    '2156',
    '2172',
    '2188',
    '2203',
    '2219',
    '2236',
    '2251',
    '2268',
    '2284',
    '2301',
  ]);

  const moodSeed = pickPromptVariant([
    'wary but warm',
    'playfully defiant',
    'quietly brilliant',
    'feral tenderness',
    'ceremonial humor',
    'slow-burn charisma',
    'storm-calm confidence',
  ]);

  const twistSeed = pickPromptVariant([
    'Names one specific ritual object they always carry.',
    'Mentions a food memory tied to migration or return.',
    'References a non-human kin (animal, plant, machine) as family.',
    'Describes a scar, tattoo, or implant with a story.',
    'Names a favorite sound from their home biome.',
    'Includes a proverb in an indigenous language plus a loose gloss.',
  ]);

  const ageBandSeed = pickPromptVariant([
    'early 20s',
    'late 20s',
    'around 35',
    'early 40s',
    'mid-40s',
    'early 50s',
    'late 50s',
    'sixties',
    'early 70s',
    'late 70s or older',
  ]);

  /** Push a different naming texture every session so the model does not recycle the same handles. */
  const nameDiversitySeed = pickPromptVariant([
    'Mononym or single public handle — short, speakable, not English-default.',
    'Hyphenated two-root given; roots from non-English language families.',
    'Patronymic / lineage particle + personal core — not US “first last” cliché.',
    'Indigenous Americas or Pacific given, respectful romanization (diacritics OK).',
    'Arabic or Swahili-coast phonology; avoid Western sci-fi filler names.',
    'South Asian given + optional matronymic/clan tag — specific, not generic.',
    'Lusophone African or Brazilian future spelling — fresh compound.',
    'Turkish / Persian / Kurdish melodic given — not anglicized.',
    'Vietnamese or Tagalog compact romanized given.',
    'Japanese-adjacent future romanization — not anime stock roster.',
    'Greek or Armenian diaspora future root — uncommon in English media.',
    'Nigerian or Ethiopian naming rhythm — polysyllabic, dignified.',
    'Sámi / Nordic Indigenous adjacent — avoid Marvel-villain tone.',
    'Quechua or Guaraní echo in the given name — grounded, not costume.',
    'Caribbean creole spelling of a rare traditional given.',
    'Two-word given treated as ONE name (both words line 1 only); no reuse after.',
    'Nickname in quotes is the public name — legal second name never repeated either.',
    'Phonetic coinage (speakable) from Malay / Indonesian roots.',
    'Slavic diminutive as the name they actually use publicly.',
    'Mixed diaspora: two cultures audible in one believable compound.',
  ]);

  return `[Instructions for you only — do not quote, summarize, or repeat this block in your answer.]

You are generating one unique traveler for a trans-temporal dating portal (internal ref: ${sessionId} · #${portalGenerationCount}). NEW PERSON EVERY TIME: different name, age, place, job, gender and relation language, voice — never a generic repeat.

LANGUAGE: ${lang}, first person only. Their civilization is after 2090 (open-source time travel). Decolonial: Global South / Indigenous futures — grounded, not a lecture.

AGE (critical): Do not default to young adults only. Across different generations you must include a real spread: people in their 20s through 80s+. This session’s age band to embody (pick a specific age inside it): **${ageBandSeed}**. Older travelers should feel as vivid and whole as younger ones — life experience, desire, and voice are not “youth-only.”

HOME YEAR (critical): They always state **which calendar year (or unambiguous narrow range) they come from** — their anchor in time. This session’s reference year to weave in (you may nudge ±a few years for their biography): **${homeYearSeed}**. It must appear clearly in the text (not buried in metaphor only).

TIME-TRAVEL AWARENESS: They **know** they are time travelers — not naive, not pretending otherwise. Let that awareness show through lived detail: how they hold contact across eras, what transit or threading costs them emotionally, why they’re reaching out. Avoid hollow one-liner clichés; show the mind of someone who actually lives with the paradox.

SPECULATIVE WORK: Their job must read as a **profession of the future** — a title or role that could not exist today, tied to institutions, tech, or social forms of their century. Use this as spirit, then **invent a fresh name** for their work: **${vocationSeed}**.

NAME (critical): Invent a **new** name this time — **never** recycle the same first name you used in your last few examples, and **avoid** overused English sci-fi defaults (Alex, Sam, River, Nova, Cipher, Zoe, Maya, etc.). This session’s naming texture (follow it): **${nameDiversitySeed}** Name must fit **${lang}** and the character’s world.

**Hard rule — say the name once:** Line 1 **starts** with your use-name (one word, or two words only if they are **one** fixed given, e.g. “Mary Jane—”). After line 1, **never** type that name again — not in dialogue, not for emphasis, not mid-sentence. **Do not** repeat any **word** that is part of that name later. From line 2 onward only **I / me / my / we** and specifics.

LENGTH (strict): at most 30 short lines OR under 420 words. Telegraphic sentences. One idea per line. No long paragraphs.

Cover briefly (1 line each, merge where needed):
- Line 1: **name once** (see NAME rules) · concrete age (band: **${ageBandSeed}**) · **year (${homeYearSeed} or adjacent)** · where (hint: ${locationSeed})
- How they move through the world (${moodSeed}); include **time-traveler self-awareness** in substance, not slogans
- Work / calling: **speculative future profession** (spirit of: ${vocationSeed} — invent the actual title and what a shift looks like)
- Gender / relation words (non-Western, concise)
- **First date:** where they’d want to meet (a real place or type of place in their world) and **what they’d like to do together** on that first meeting — specific, sensory, era-appropriate; not a generic “coffee or drinks.”
- **What they like to do:** everyday joys, hobbies, rituals, or how they spend time off — concrete, not a vague list (“I like music”); show taste and texture.
- ${twistSeed}

OUTPUT RULES (critical):
- Your entire reply must be ONLY the traveler speaking as themselves — the profile text visitors read. Nothing else.
- Do not announce that you are creating, writing, or presenting a profile. Never say things like: “I’ll create…”, “Let me write…”, “Here’s my attempt…”, “Below is my profile…”, “I’m generating…”, “Allow me to introduce…”, “My dating profile:”, or any similar setup. No preamble at all.
- Line 1 **must begin** with your use-name (no Hi / Hello / Name: / I’m before it). You may put a dash, dot, or comma right after the name.
- **Count check:** your name (the exact opening token or two-token given) appears **exactly once** in the full text. If you typed it twice, rewrite.
- Fold **age, home year, and place** into line 1 or line 2 so the reader knows **who, when from, where**.
- Do not mention Prōteús, the portal, AI, prompts, or that this is a profile.
- Do not use empty taglines (“I am a time traveler.” alone). **Do** let them speak as someone who knows they move through time — concrete, emotional, specific. End sharp.`;
}

/**
 * Portrait step runs ONLY after the profile text is finished — image must match that person.
 * @param {string} profileText
 */
function buildImagePromptFromProfile(profileText) {
  const trimmed = (profileText || '').trim();
  return `PHOTO BRIEF — BLADE RUNNER–ERA NOIR PORTRAIT (black & white, photorealistic).

PIPELINE: (1) Read the dating profile below as the ONLY biography of the subject. (2) Invent a face, wardrobe, age, and ethnic presentation that FIT that text (names, job, place, gender expression, mood). (3) Render ONE tight head-and-shoulders portrait of that exact imagined person — not a generic noir model.

VISUAL STYLE: Hyper-realistic B&W noir — deep shadows, venetian-blind or single-source light, smoke/steam, heavy grain, high contrast, cinematic (Ridley Scott mood). Urban decay / rain-soaked future; photoreal, not illustrative.

SUBJECT LOCK: The person must visibly embody the profile: **stated or implied age** (including middle-aged and older — never default to looking 25), cultural cues from the text, gender presentation described or implied, and character (weathering, gaze, styling). If they name a **home year** or **speculative job**, let wardrobe, wear, or bearing hint at that future plausibly (still noir photoreal, not cartoon sci-fi). If the profile mentions a specific body detail, scar, adornment, or hair — reflect it plausibly. Do NOT default to a repeated “stock” young face across generations.

COMPOSITION: Tight portrait, direct or near-direct eye contact, partial shadow / smoke, Blade Runner dread and dignity.

NEGATIVE: No duplicate of a prior generic portrait; no cartoon, no beauty-filter plastic skin, no watermark, no text in image.

—— PROFILE TO EMBODY (only source of identity; stay faithful) ——
${trimmed}
—— END PROFILE ——`;
}

/** Label for the empty portrait slot (null = no overlay text). */
function getPortraitWaitLabel() {
  if (currentImage) return null;
  if (awaitingPortraitImage) return 'RECEIVING\nIMAGE';
  return 'OPEN\nPORTAL';
}

// Add error handling constants
const ERROR_MESSAGES = {
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  QUOTA_EXCEEDED: "API quota exceeded. Please check billing details.",
  GENERIC: "An error occurred. Please try again."
};

// Add mock data for testing when API is unavailable
const USE_MOCK_DATA = false;  // Change this to false

// Add decorative cyber-glyphs
const CYBER_GLYPHS = [
  '◈', '◇', '⌬', '⌭', '⌮', '⌯', '⌖', '⌑', '⌐', '⌙',
  '░', '▒', '▓', '█', '▀', '▄', '▌', '▐', '■', '□',
  '●', '○', '◐', '◑', '◒', '◓', '◔', '◕', '◖', '◗'
]; 

// Add retro-tech styling parameters
const RETRO_STYLE = {
  glowStrength: 8,
  scanlineSpacing: 4,
  scanlineAlpha: 30,
  gridSize: 30,
  textBlockMargin: 40,
  cornerSize: 20,
  textGlow: 'rgba(96, 188, 255, 0.35)',
};

// Add custom cyber symbols
const CYBER_SYMBOLS = [
  '◎⚡◈⌬⎔⏣⏢⌬',
  '⟁⟟⟰⟯⟡⟤⟥⟨',
  '⧊⧋⧌⧍⧎⧏⧐⧑',
  '⫿⫸⫷⫶⫵⫴⫳⫲',
  '⦿⦾⦽⦼⦻⦺⦹⦸',
  '⫘⫗⫖⫕⫔⫓⫒⫑'
];

// Add glitch text function
function generateGlitchText(text) {
  return text + '\n\n' + 
         '[ ᗩᒪᕵᕼᗩ-ᐯ3.2.1 ]' + '\n' +
         CYBER_SYMBOLS[Math.floor(Math.random() * CYBER_SYMBOLS.length)] + '\n' +
         '⟨ ⎔ QUANTUM-LINK ESTABLISHED ⎔ ⟩' + '\n' +
         '◈◈◈ TIMELINE VERIFIED ◈◈◈' + '\n' +
         generateRandomSymbols(3);
}

// Generate random cyber symbols
function generateRandomSymbols(lines) {
  let symbols = '';
  for(let i = 0; i < lines; i++) {
    const length = Math.floor(Math.random() * 10) + 5;
    for(let j = 0; j < length; j++) {
      const randomSet = CYBER_SYMBOLS[Math.floor(Math.random() * CYBER_SYMBOLS.length)];
      symbols += randomSet[Math.floor(Math.random() * randomSet.length)];
    }
    symbols += '\n';
  }
  return symbols;
}

// Add acceleration parameters at the top with other constants
const LOADER_PARAMS = {
  baseSpeed: 0.5,          // Initial rotation speed
  maxSpeed: 8,             // Maximum rotation speed
  acceleration: 0.05,      // How quickly it speeds up
  currentSpeed: 0.5,       // Current rotation speed (starts at baseSpeed)
  pulseFrequency: 1,       // Initial pulse frequency
  maxPulseFrequency: 4     // Maximum pulse frequency
};

// Add pixelation parameters
const PIXEL_PARAMS = {
  initialSize: 32,    // Starting pixel size
  finalSize: 1,      // Final pixel size (no pixelation)
  currentSize: 32,   // Current pixel size
  transitionSpeed: 0.5  // How fast pixelation clears
};

/**
 * Fixed layout: square portrait slot on the left, profile text column on the right.
 * @returns {{ margin: number, portraitSize: number, portraitCenterX: number, portraitCenterY: number, portraitLeft: number, portraitTop: number, portraitRight: number, portraitBottom: number, textX: number, textWidth: number, textTopY: number, statusStackY: number, connectionStrengthY: number }}
 */
function getPortalLayout() {
  const w = canvasWidth;
  const h = canvasHeight;
  const margin = Math.max(28, w * 0.032);
  const portraitSize = Math.min(h * 0.7, w * 0.34, 520);
  const portraitLeft = margin;
  const portraitCenterX = portraitLeft + portraitSize / 2;
  const portraitCenterY = h / 2;
  const portraitTop = portraitCenterY - portraitSize / 2;
  const portraitBottom = portraitCenterY + portraitSize / 2;
  const portraitRight = portraitLeft + portraitSize;
  const gutter = Math.max(28, w * 0.022);
  const textX = portraitRight + gutter;
  const textWidth = Math.max(220, w - textX - margin);
  /** Profile copy starts here — only label + body (session chrome is in the left margin). */
  const textTopY = portraitTop + 8;
  const toggleBand = margin + 17 + 12;
  const approxStatusStackH = 92;
  let statusStackY = toggleBand;
  if (statusStackY + approxStatusStackH > portraitTop - 8) {
    statusStackY = portraitBottom + 12;
  }
  const connectionStrengthY = Math.min(
    statusStackY + approxStatusStackH + 14,
    h - 36,
  );
  return {
    margin,
    portraitSize,
    portraitCenterX,
    portraitCenterY,
    portraitLeft,
    portraitTop,
    portraitRight,
    portraitBottom,
    textX,
    textWidth,
    textTopY,
    statusStackY,
    connectionStrengthY,
  };
}

/** Empty portrait channel — minimal frame */
function drawPortraitSlotFrame(p, layout, waitLabel) {
  const { portraitLeft, portraitTop, portraitSize } = layout;
  const t = p.millis() * 0.001;

  p.push();
  p.noStroke();
  p.fill(THEME.panel[0], THEME.panel[1], THEME.panel[2]);
  p.rect(portraitLeft, portraitTop, portraitSize, portraitSize);

  p.noFill();
  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2]);
  p.strokeWeight(1);
  p.rect(portraitLeft + 0.5, portraitTop + 0.5, portraitSize - 1, portraitSize - 1);

  p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 140);
  p.strokeWeight(1);
  const tick = Math.min(12, portraitSize * 0.05);
  const L = portraitLeft;
  const T = portraitTop;
  const R = portraitLeft + portraitSize;
  p.line(L, T + tick, L, T);
  p.line(L, T, L + tick, T);
  p.line(R - tick, T, R, T);
  p.line(R, T, R, T + tick);

  if (waitLabel) {
    const scanY = T + ((t * 70) % portraitSize);
    p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 50);
    p.line(L, scanY, R, scanY);

    p.textFont(UI_MONO);
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.textSize(Math.max(10, portraitSize * 0.032));
    p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
    p.text(waitLabel, portraitLeft + portraitSize / 2, portraitTop + portraitSize / 2);
  }
  p.pop();
}

/** Surveillance overlay while portrait is still resolving with the stream. */
function portraitStreamRevealActive() {
  if (!currentImage || !textToShow.length) return false;
  if (STREAM_PARAMS.currentIndex < textToShow.length) return true;
  return PIXEL_PARAMS.currentSize > PIXEL_PARAMS.finalSize;
}

/**
 * Portrait sharpness tracks profile stream: same pacing as `charDelay`, with smooth ramps between characters.
 */
function updatePortraitPixelationFromTextProgress(p) {
  if (!currentImage || !textToShow.length) return;

  const len = textToShow.length;
  let u;
  if (STREAM_PARAMS.currentIndex >= len) {
    u = 1;
  } else {
    const since = p.millis() - STREAM_PARAMS.lastCharTime;
    const frac = Math.min(1, since / STREAM_PARAMS.charDelay);
    u = (STREAM_PARAMS.currentIndex + frac) / len;
  }
  u = Math.min(1, Math.max(0, u));
  const eased = 1 - Math.pow(1 - u, 1.12);
  PIXEL_PARAMS.currentSize = Math.max(
    PIXEL_PARAMS.finalSize,
    PIXEL_PARAMS.initialSize +
      (PIXEL_PARAMS.finalSize - PIXEL_PARAMS.initialSize) * eased,
  );
}

// Add font loading to preload
let sixtyFourFont;

// Add connection strength parameters
const CONNECTION_PARAMS = {
  strength: 1.0,
  fluctuationSpeed: 0.002,
  minStrength: 0.3,
  maxStrength: 1.0,
  isFluctuating: false,
  noiseOffset: 0,        // For Perlin noise
  noiseIncrement: 0.005  // How fast we move through noise
};

class Letter {
  constructor(p, letter, x, y, vx, vy) {
    this.p = p;
    this.letter = letter;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = 0;
    this.angularVelocity = 0;  // Start with no rotation
    this.isSettled = false;
    this.fallDelay = 5; // Small delay before falling
    this.mass = 1;
    this.isDisturbed = false;
    this.width = LETTER_PARAMS.size;
    this.height = LETTER_PARAMS.size;
    this.lastX = x;  // Store previous position for collision resolution
    this.lastY = y;
    this.isDragged = false;  // Track if letter is being dragged
    this.decayRotation = p.random(-0.1, 0.1); // Random rotation for decay
    this.fadeOut = 255; // For fade out effect
    this.shouldRemove = false;  // New property to track removal
    
    // Add trail properties
    this.trail = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trail.push({x: x, y: y, angle: 0});
    }
  }

  applyForce(fx, fy) {
    if (!this.isSettled) {
      this.vx += fx;
      this.vy += fy;
    }
  }

  disturb(mouseX, mouseY) {
    if (this.isSettled) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < LETTER_PARAMS.disturbRadius) {
        const angle = Math.atan2(dy, dx);
        const force = (1 - distance / LETTER_PARAMS.disturbRadius) * LETTER_PARAMS.disturbForce;
        
        // More bouncy initial movement
        this.vx = Math.cos(angle) * force;
        this.vy = LETTER_PARAMS.initialJumpForce; // Fixed upward jump
        this.isSettled = false;
        this.isDisturbed = true;
        this.angularVelocity = this.p.random(-0.3, 0.3); // More rotation
      }
    }
  }

  checkCollision(other) {
    if (this === other) return false;

    const dx = Math.abs(this.x - other.x);
    const dy = Math.abs(this.y - other.y);
    
    // Use slightly smaller collision box for better stacking
    return dx < LETTER_PARAMS.size - LETTER_PARAMS.collisionBuffer && 
           dy < LETTER_PARAMS.size - LETTER_PARAMS.collisionBuffer;
  }

  resolveCollision(other) {
    if (this.isDragged || other.isDragged) return;

    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;

    const nx = dx / distance;
    const ny = dy / distance;

    const overlap = LETTER_PARAMS.size - distance;
    if (overlap > 0) {
      // Calculate vertical positioning
      const isAbove = this.y < other.y;
      const verticalOverlap = Math.abs(this.y - other.y);
      
      // Adjust position with stacking consideration
      if (verticalOverlap < LETTER_PARAMS.size * 0.5) {
        const pushX = nx * overlap * 0.5;
        const pushY = ny * overlap * 0.5;
        
        if (isAbove) {
          // If letter is above another, rest on top
          this.y = other.y - LETTER_PARAMS.size + LETTER_PARAMS.stackingBuffer;
          this.vy *= LETTER_PARAMS.bounceReduction;
          if (Math.abs(this.vx) < LETTER_PARAMS.stabilityThreshold) {
            this.vx = 0;
          }
        }

        this.x += pushX;
        other.x -= pushX;

        // Transfer momentum with stacking consideration
        const relativeVelX = this.vx - other.vx;
        const relativeVelY = this.vy - other.vy;
        
        // Reduce horizontal momentum when stacking
        const horizontalDamping = isAbove ? 0.8 : 1;
        
        this.vx = (this.vx * 0.5 + other.vx * 0.5) * horizontalDamping;
        other.vx = (other.vx * 0.5 + this.vx * 0.5) * horizontalDamping;

        // Vertical momentum transfer
        if (!isAbove) {
          const impulse = Math.min(
            relativeVelY * LETTER_PARAMS.collisionElasticity,
            LETTER_PARAMS.maxStackForce
          );
          this.vy = -impulse * 0.5;
          other.vy = impulse * 0.5;
        }
      }
    }
  }

  update() {
    if (this.fallDelay > 0) {
      this.fallDelay--;
      return;
    }

    if (!this.isSettled && !this.isDragged) {
      // Apply physics
      this.vx *= LETTER_PARAMS.friction;
      this.vy *= LETTER_PARAMS.friction;
      this.vy += LETTER_PARAMS.gravity;

      // Update position
      this.x += this.vx;
      this.y += this.vy;

      // Dampen rotation
      this.angularVelocity *= LETTER_PARAMS.rotationDamping;
      this.angle += this.angularVelocity;

      // Floor collision
      if (this.y >= canvasHeight - LETTER_PARAMS.groundY) {
        this.y = canvasHeight - LETTER_PARAMS.groundY;
        this.vy *= -LETTER_PARAMS.bounceReduction;
        this.vx *= LETTER_PARAMS.groundFriction;
        this.angularVelocity *= LETTER_PARAMS.bounceReduction;

        // Check for settling
        if (Math.abs(this.vy) < LETTER_PARAMS.stabilityThreshold && 
            Math.abs(this.vx) < LETTER_PARAMS.stabilityThreshold) {
          this.isSettled = true;
          this.vy = 0;
          this.vx = 0;
          this.angularVelocity = 0;
          this.angle = 0;  // Reset angle when settled
        }
      }

      // Wall collisions
      if (this.x <= 0) {
        this.x = 0;
        this.vx = Math.abs(this.vx * LETTER_PARAMS.bounceReduction);
        this.angularVelocity = -this.angularVelocity * LETTER_PARAMS.bounceReduction;
      } else if (this.x >= canvasWidth) {
        this.x = canvasWidth;
        this.vx = -Math.abs(this.vx * LETTER_PARAMS.bounceReduction);
        this.angularVelocity = -this.angularVelocity * LETTER_PARAMS.bounceReduction;
      }

      // Mouse collision/repulsion
      const dx = this.x - this.p.mouseX;
      const dy = this.y - this.p.mouseY;
      const distToMouse = Math.sqrt(dx * dx + dy * dy);
      
      if (distToMouse < LETTER_PARAMS.mouseRepelRadius) {
        const angle = Math.atan2(dy, dx);
        const force = (1 - distToMouse / LETTER_PARAMS.mouseRepelRadius) * LETTER_PARAMS.mouseRepelForce;
        this.vx += Math.cos(angle) * force;
        this.vy += Math.sin(angle) * force;
        this.angularVelocity += (Math.random() - 0.5) * 0.1;
      }
    }

    // Limit rotation speed
    this.angularVelocity = Math.max(
      -LETTER_PARAMS.maxRotationSpeed,
      Math.min(LETTER_PARAMS.maxRotationSpeed, this.angularVelocity)
    );

    if (this.isSettled) {
      // Add slight movement even when settled for decay effect
      if (Math.random() < 0.01) {
        this.isSettled = false;
        this.vy = this.p.random(-0.5, 0);
        this.vx = this.p.random(-0.5, 0.5);
      }
    }

    if (this.y > canvasHeight + 100) { // Add buffer below screen
      this.shouldRemove = true;
    }

    // Update trail first
    if (!this.isSettled && (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1)) {
      this.trail.pop();  // Remove oldest position
      this.trail.unshift({  // Add current position
        x: this.x,
        y: this.y,
        angle: this.angle
      });
    }
  }

  display() {
    // Draw trail
    if (!this.isSettled) {
      this.trail.forEach((pos, i) => {
        const opacity = TRAIL_OPACITY * (1 - i/TRAIL_LENGTH);
        this.p.push();
        this.p.translate(pos.x, pos.y);
        this.p.rotate(pos.angle);
        
        // Trail background
        this.p.fill(255, opacity);
        this.p.noStroke();
        this.p.rectMode(this.p.CENTER);
        this.p.rect(0, 0, LETTER_PARAMS.size, LETTER_PARAMS.size, LETTER_PARAMS.cornerRadius);
        
        // Trail letter
        this.p.fill(0, opacity);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.textSize(LETTER_PARAMS.textSize);
        this.p.text(this.letter, 0, 0);
        this.p.pop();
      });
    }

    // Draw current letter (existing display code)
    this.p.push();
    this.p.translate(this.x, this.y);
    this.p.rotate(this.angle);
    
    this.p.fill(255, LETTER_PARAMS.opacity);
    this.p.noStroke();
    this.p.rectMode(this.p.CENTER);
    this.p.rect(0, 0, LETTER_PARAMS.size, LETTER_PARAMS.size, LETTER_PARAMS.cornerRadius);
    
    this.p.fill(0);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.textSize(LETTER_PARAMS.textSize);
    this.p.text(this.letter, 0, 0);
    this.p.pop();
  }

  isMouseOver() {
    let distance = this.p.dist(this.p.mouseX, this.p.mouseY, this.x, this.y);
    return distance < 30; // Adjust the value based on your letter size
  }

  moveWithMouse() {
    if (this.isMouseOver() && !this.isDragged) {
      this.isDragged = true;
      this.isSettled = false;
    }
    
    if (this.isDragged) {
      const targetX = this.p.mouseX;
      const targetY = this.p.mouseY;
      
      // More responsive dragging
      this.vx = (targetX - this.x) * LETTER_PARAMS.dragSpeed;
      this.vy = (targetY - this.y) * LETTER_PARAMS.dragSpeed;
      
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  static create(p, letter, x, y) {
    return new Letter(
      p,
      letter,
      x,
      y,
      p.random(-LETTER_PARAMS.initialVelocityRange, LETTER_PARAMS.initialVelocityRange),
      0 // Start with zero vertical velocity for more natural fall
    );
  }
}

// Store p5 instance for use in chat function
let p5Instance;

// Update sketch creation to store p5 instance
const sketch = p => {
  p5Instance = p;  // Store the p5 instance
  
  p.setup = function() {
    canvasWidth = p.windowWidth;
    canvasHeight = p.windowHeight;
    p.createCanvas(canvasWidth, canvasHeight);
    
    // Make canvas responsive and liquid
    p.pixelDensity(1); // Optimize for performance

    // Do not start p5.sound oscillators here — Chrome blocks AudioContext until a user gesture.
    // They are created in startLoaderSound() on Space / after interaction.

    // Initialize responsive parameters
    updateResponsiveParams();
  };

  // Add window resize handler for liquid responsiveness
  p.windowResized = function() {
    canvasWidth = p.windowWidth;
    canvasHeight = p.windowHeight;
    p.resizeCanvas(canvasWidth, canvasHeight);
    
    // Update responsive parameters
    updateResponsiveParams();
  };

  p.draw = function() {
    if (isInitialLoad) {
      applyThemeBackground(p);
      drawTechnoGrid(p);
      drawThemeToggle(p);
      displayLandingPage(p);
      displayAttribution(p);
      return;
    }

    applyThemeBackground(p);
    drawTechnoGrid(p);

    if (isLoading) {
      displayLoader(p);
      drawThemeToggle(p);
      displayAttribution(p);
      return;
    }

    const layout = getPortalLayout();

    // Left: fixed square portrait channel (placeholder → progressive pixel portrait)
    drawPortraitSlotFrame(p, layout, getPortraitWaitLabel());

    displaySessionStatus(p, layout);

    // Right: profile stream — run before portrait so pixelation matches this frame's stream position
    if (textToShow) {
      streamText(
        p,
        textToShow,
        layout.textX,
        layout.textTopY,
        layout.textWidth,
      );

      if (STREAM_PARAMS.isStreaming || STREAM_PARAMS.currentIndex >= textToShow.length) {
        displayFixedElements(p);
      }
    }

    if (currentImage) {
      updatePortraitPixelationFromTextProgress(p);
      drawPixelatedImage(
        p,
        currentImage,
        layout.portraitCenterX,
        layout.portraitCenterY,
        layout.portraitSize,
      );
      if (STREAM_PARAMS.isStreaming || portraitStreamRevealActive()) {
        drawSurveillanceOverlay(
          p,
          layout.portraitCenterX,
          layout.portraitCenterY,
          layout.portraitSize,
        );
      }
      drawPortraitRasterScanLine(
        p,
        layout.portraitCenterX,
        layout.portraitCenterY,
        layout.portraitSize,
      );
      displayDateTime(p, layout);
    }

    if (CONNECTION_PARAMS.isFluctuating) {
      displayConnectionStrength(p, layout);
    }

    drawThemeToggle(p);
    displayAttribution(p);
  };

  // Update keyPressed handler
  p.keyPressed = function() {
    if (p.keyCode === 32) { // Space bar
      if (isInitialLoad) {
        // First press - start initial generation
        isInitialLoad = false;
        isLoading = true;
        resetParameters();
        startLoaderSound();
        chat();
      } else if (!isLoading) {
        isLoading = true;
        resetParameters();
        startLoaderSound();
        chat();
      }
    } else if (p.key === 's' || p.key === 'S') {
      // Save functionality
      if (currentImage && textToShow) {
        // Save the current canvas
        p.saveCanvas('proteus_traveler_' + Date.now(), 'png');
      }
    } else if (p.key === 'l' || p.key === 'L') {
      // Language selection
      currentLanguageIndex = (currentLanguageIndex + 1) % languageKeys.length;
      currentLanguage = languageKeys[currentLanguageIndex];
    }
  };

  p.mousePressed = function() {
    if (handleThemeToggleClick(p.mouseX, p.mouseY)) {
      return;
    }
    const ctx = p.getAudioContext();
    if (ctx && ctx.state !== 'running') {
      ctx.resume();
    }
  };
};

function displayLoader(p) {
  LOADER_PARAMS.currentSpeed = Math.min(
    LOADER_PARAMS.currentSpeed + LOADER_PARAMS.acceleration,
    LOADER_PARAMS.maxSpeed,
  );

  if (oscillator && modulatorOsc) {
    const modFreq = p.map(
      LOADER_PARAMS.currentSpeed,
      LOADER_PARAMS.baseSpeed,
      LOADER_PARAMS.maxSpeed,
      DRONE_PARAMS.modulatorFreq,
      DRONE_PARAMS.maxModFreq,
    );
    const modDepth = p.map(
      LOADER_PARAMS.currentSpeed,
      LOADER_PARAMS.baseSpeed,
      LOADER_PARAMS.maxSpeed,
      DRONE_PARAMS.modulatorDepth,
      DRONE_PARAMS.maxModDepth,
    );
    const carrierFreq =
      DRONE_PARAMS.baseFreq + Math.sin(p.millis() * 0.001) * modDepth;
    oscillator.freq(carrierFreq);
    modulatorOsc.freq(modFreq);
    oscillator.amp(DRONE_PARAMS.baseAmp, 0.1);
    modulatorOsc.amp(DRONE_PARAMS.baseAmp * 0.8, 0.1);
  }

  const t = p.millis() * 0.001;
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const r = 36;

  applyThemeBackground(p);
  drawTechnoGrid(p);

  p.push();
  p.translate(cx, cy);
  p.noFill();
  p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 200);
  p.strokeWeight(1.5);
  const a = t * LOADER_PARAMS.currentSpeed * 1.2;
  p.arc(0, 0, r * 2, r * 2, a - 1.2, a + 2.5);

  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2]);
  p.strokeWeight(1);
  p.circle(0, 0, r * 2);

  p.noStroke();
  p.textFont(UI_MONO);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(11);
  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text('OPEN PORTAL', 0, r + 28);
  p.pop();
}

// Validate Replicate token via server (see /api/replicate + replicate-handlers.js)
async function checkReplicateToken() {
  try {
    await postReplicate({ action: 'ping' });
    return true;
  } catch (error) {
    console.error(
      'Replicate API validation error:',
      error,
      'Set REPLICATE_API_TOKEN in .env and restart the dev server.',
    );
    return false;
  }
}

function onReady() {
  try {
    const mainElt = document.querySelector('main');
    new p5(sketch, mainElt);

    checkReplicateToken().then((isValid) => {
      if (!isValid) {
        console.error('Invalid or missing Replicate token — AI features disabled');
      }
    });
  } catch (error) {
    console.error('Error initializing:', error);
    const mainElt = document.querySelector('main');
    new p5(sketch, mainElt);
  }
}

// Make sure we wait for DOM to be ready
if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}

// Add streaming text parameters
const STREAM_PARAMS = {
  /** ms between visible characters — portrait loads in parallel while text reveals */
  charDelay: 51,
  currentIndex: 0,
  streamingText: "",
  isStreaming: false,
  lastCharTime: 0,
  imageLoaded: false, // portrait bitmap ready — sharpness still follows text stream until complete
};

// Update typing sound parameters for more interesting effects
const TYPING_PARAMS = {
  baseFreq: 200,
  freqRange: 100,
  amplitude: 0.1,
  duration: 50,
  modDepth: 50
};

// Add UI layout parameters
const UI_LAYOUT = {
  margin: 20,
  indicators: {
    top: 20,
    right: 20,
    spacing: 25
  },
  symbols: {
    right: 20,
    spacing: 15
  },
  text: {
    left: 300,  // Leave space for network visualization
    top: 100,   // Leave space for indicators
    width: 600
  }
};

// Update streamText function with proper spacing
function streamText(p, fullText, x, y, width) {
  if (!fullText) return false;

  const currentTime = p.millis();

  if (!STREAM_PARAMS.isStreaming) {
    STREAM_PARAMS.isStreaming = true;
    STREAM_PARAMS.currentIndex = 0;
    STREAM_PARAMS.streamingText = "";
    STREAM_PARAMS.lastCharTime = currentTime;

    // Stop loader sounds when streaming starts
    if (modulatorOsc) modulatorOsc.amp(0, 0.1);
    if (noiseOsc) noiseOsc.amp(0, 0.1);
  }

  if (currentTime - STREAM_PARAMS.lastCharTime > STREAM_PARAMS.charDelay) {
    if (STREAM_PARAMS.currentIndex < fullText.length) {
      STREAM_PARAMS.streamingText += fullText[STREAM_PARAMS.currentIndex];
      STREAM_PARAMS.currentIndex++;
      STREAM_PARAMS.lastCharTime = currentTime;

      if (oscillator) {
        const charCode = fullText[STREAM_PARAMS.currentIndex - 1].charCodeAt(0);
        const typeFreq =
          TYPING_PARAMS.baseFreq +
          (charCode % TYPING_PARAMS.freqRange) -
          TYPING_PARAMS.freqRange / 2;

        const modFreq =
          typeFreq + Math.sin(currentTime * 0.01) * TYPING_PARAMS.modDepth;

        oscillator.freq(modFreq, 0.01);
        oscillator.amp(TYPING_PARAMS.amplitude, 0.01);

        if (Math.random() < 0.1) {
          setTimeout(() => oscillator.freq(typeFreq * 2, 0.05), 5);
        }

        setTimeout(() => oscillator.freq(typeFreq * 0.7, 0.1), 10);
        setTimeout(() => oscillator.amp(0, 0.05), TYPING_PARAMS.duration);
      }
    }
  }
  
  p.push();
  p.textFont(UI_MONO);
  p.textAlign(p.LEFT, p.TOP);

  const labelSize = Math.max(11, TEXT_PARAMS.fontSize * 0.78);
  p.textSize(labelSize);
  p.textLeading(labelSize * 1.25);
  p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2], 220);
  p.text('PROFILE', x, y);

  const bodyY = y + labelSize * 1.5;
  const cursor = currentTime % 1000 < 500 ? '_' : '';
  const body = STREAM_PARAMS.streamingText + cursor;

  p.textSize(TEXT_PARAMS.fontSize);
  p.textLeading(TEXT_PARAMS.lineHeight);
  p.fill(THEME.text[0], THEME.text[1], THEME.text[2]);
  p.text(body, x, bodyY, width);

  p.pop();
  
  // When streaming completes, start connection fluctuation
  if (STREAM_PARAMS.currentIndex >= fullText.length) {
    CONNECTION_PARAMS.isFluctuating = true;
  }
  
  return STREAM_PARAMS.currentIndex >= fullText.length;
}

// Add time display function
function displayDateTime(p, layout) {
  const L = layout || getPortalLayout();
  p.push();
  p.textFont(UI_MONO);

  const x = L.textX;
  /** Near bottom, just above attribution (attribution uses ~20px padding from canvas bottom). */
  const y = canvasHeight - 36;

  p.textAlign(p.LEFT, p.BOTTOM);
  p.textSize(11);

  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text(`${date.replace(/\//g, '.')}  ${timeStr}`, x, y);

  p.pop();
}

// Add reset function for loader parameters
function resetLoaderParams() {
  // Reset loader to complete stop
  LOADER_PARAMS.currentSpeed = 0;
  
  // Reset all sound components
  if (oscillator && modulatorOsc && noiseOsc) {
    oscillator.stop();
    modulatorOsc.stop();
    noiseOsc.stop();
    
    oscillator.amp(0);
    modulatorOsc.amp(0);
    noiseOsc.amp(0);
    
    oscillator.freq(DRONE_PARAMS.baseFreq);
    modulatorOsc.freq(DRONE_PARAMS.modulatorFreq);
    
    oscillator.start();
    modulatorOsc.start();
    noiseOsc.start();
  }
  
  // Reset connection params
  CONNECTION_PARAMS.isFluctuating = false;
  CONNECTION_PARAMS.strength = CONNECTION_PARAMS.maxStrength;
  CONNECTION_PARAMS.noiseOffset = 0;
  PIXEL_PARAMS.currentSize = PIXEL_PARAMS.finalSize;
}

function displayConnectionStrength(p, layout) {
  const L = layout || getPortalLayout();
  const x = L.margin;
  const y = L.connectionStrengthY;

  p.push();
  p.textFont(UI_MONO);
  p.textAlign(p.LEFT, p.CENTER);
  p.textSize(11);

  if (CONNECTION_PARAMS.isFluctuating) {
    CONNECTION_PARAMS.noiseOffset += CONNECTION_PARAMS.noiseIncrement;
    CONNECTION_PARAMS.strength = p.map(
      p.noise(CONNECTION_PARAMS.noiseOffset),
      0,
      1,
      CONNECTION_PARAMS.minStrength,
      CONNECTION_PARAMS.maxStrength,
    );
  }

  const barCount = 5;
  const barWidth = 4;
  const barSpacing = 3;
  const maxBarHeight = 18;

  p.noStroke();
  for (let i = 0; i < barCount; i++) {
    const barStrength = (i + 1) / barCount;
    const on = CONNECTION_PARAMS.strength >= barStrength;
    const alpha = on ? 220 : 45;
    p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2], alpha);
    const barHeight = maxBarHeight * ((i + 1) / barCount);
    p.rect(x + i * (barWidth + barSpacing), y - barHeight / 2, barWidth, barHeight);
  }

  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text(
    `SIGNAL ${String(Math.floor(CONNECTION_PARAMS.strength * 100)).padStart(3, '0')}`,
    x + barCount * (barWidth + barSpacing) + 10,
    y,
  );

  p.pop();
}

const ATTRIBUTION = {
  text: 'concept and programming by marlon barrios solano',
  link: 'https://marlonbarrios.github.io/',
  padding: 20,
  size: 11,
};

// Add this function to display the attribution
function displayAttribution(p) {
  const x = canvasWidth - ATTRIBUTION.padding;
  const y = canvasHeight - ATTRIBUTION.padding;

  p.push();
  p.textFont(UI_MONO);
  p.textAlign(p.RIGHT, p.BOTTOM);
  p.textSize(ATTRIBUTION.size);

  const isHovering =
    p.mouseX > x - 300 &&
    p.mouseX < x &&
    p.mouseY > y - 24 &&
    p.mouseY < y;

  if (isHovering) {
    p.fill(THEME.text[0], THEME.text[1], THEME.text[2]);
  } else {
    p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2], 200);
  }
  p.text(ATTRIBUTION.text, x, y);

  if (isHovering && p.mouseIsPressed) {
    window.open(ATTRIBUTION.link, '_blank');
  }

  p.pop();
}

function displayLandingPage(p) {
  updateResponsiveParams();
  const time = p.millis() * 0.001;

  p.push();
  p.translate(canvasWidth / 2, canvasHeight / 2);
  p.textAlign(p.CENTER, p.CENTER);
  p.textFont(UI_MONO);

  const titleSize = Math.max(28, Math.min(canvasWidth * 0.065, 52));
  p.textSize(titleSize);
  p.fill(THEME.text[0], THEME.text[1], THEME.text[2]);
  p.text('PRŌTEÚS', 0, -110);

  p.textSize(11);
  p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2]);
  p.text('TRANS-TEMPORAL DATING', 0, -58);

  p.textSize(12);
  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  const introW = Math.min(420, canvasWidth * 0.72);
  p.textLeading(18);
  p.text(
    'Open the portal for a time traveler who wants to connect with you.',
    0,
    -12,
    introW,
  );

  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2]);
  p.strokeWeight(1);
  const barW = Math.min(280, canvasWidth * 0.5);
  p.line(-barW / 2, 48, barW / 2, 48);

  p.noStroke();
  p.textSize(11);
  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text(`L  language  ·  ${languages[currentLanguage].name}`, 0, 78);

  p.fill(THEME.text[0], THEME.text[1], THEME.text[2]);
  const blink = Math.sin(time * 3) > 0 ? '■' : '□';
  p.text(`SPACE  ${blink}  open`, 0, 108);

  p.pop();
}

/** Session chrome in the left margin — keeps the profile column free for generated copy. */
function displaySessionStatus(p, layout) {
  const L = layout || getPortalLayout();
  const x = L.margin;
  let y = L.statusStackY;
  const time = p.millis() * 0.001;

  p.push();
  p.textFont(UI_MONO);
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(11);

  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text('PRŌTEÚS', x, y);
  y += 17;

  p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2]);
  p.text('CHANNEL OPEN', x, y);
  y += 17;

  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text('TIMELINE OK', x, y);
  y += 22;

  if (!STREAM_PARAMS.isStreaming && STREAM_PARAMS.currentIndex >= textToShow.length) {
    p.fill(THEME.text[0], THEME.text[1], THEME.text[2]);
    const blink = Math.sin(time * 3) > 0 ? '■' : '□';
    p.text(`SPACE  ${blink}  new`, x, y);
  }

  p.pop();
}

/** Top-right shortcuts only (status stack is `displaySessionStatus`). */
function displayFixedElements(p) {
  p.push();
  p.textFont(UI_MONO);

  const instructionsX = canvasWidth - 24;
  const instructionsY = 28;

  p.textAlign(p.RIGHT, p.TOP);
  p.textSize(11);
  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2]);
  p.text(`L  ${languages[currentLanguage].name}`, instructionsX, instructionsY);
  p.text('S  save', instructionsX, instructionsY + 16);
  p.text('SPACE  portal', instructionsX, instructionsY + 32);

  p.pop();
}

// Add chat function to handle generation
async function chat() {
  try {
    isLoading = true;
    textToShow = '';

    await streamReplicateProfileText(getPrompt(), (chunk) => {
      if (isLoading) isLoading = false;
      textToShow += chunk;
    });

    if (isLoading) isLoading = false;

    const profileForPortrait = textToShow.trim();
    if (!profileForPortrait) {
      throw new Error('Empty profile — cannot generate portrait');
    }

    // Chain: profile text is complete → image must depict THIS traveler only
    const imagePrompt = buildImagePromptFromProfile(profileForPortrait);

    awaitingPortraitImage = true;
    try {
      const { url: imageUrl } = await postReplicate({
        action: 'image',
        prompt: imagePrompt,
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      currentImage = p5Instance.createImage(img.width, img.height);
      currentImage.drawingContext.drawImage(img, 0, 0);
      STREAM_PARAMS.imageLoaded = true;
      PIXEL_PARAMS.currentSize = PIXEL_PARAMS.initialSize;
    } finally {
      awaitingPortraitImage = false;
    }

    isLoading = false;

  } catch (error) {
    console.error('Error:', error);
    isLoading = false;
    awaitingPortraitImage = false;
    if (error.message.includes('Rate limit')) {
      alert(ERROR_MESSAGES.RATE_LIMIT);
    } else if (error.message.includes('quota')) {
      alert(ERROR_MESSAGES.QUOTA_EXCEEDED);
    } else {
      alert(ERROR_MESSAGES.GENERIC);
    }
  }
}

/** @param {p5.Image} img */
function drawPixelatedImage(p, img, centerX, centerY, size) {
  if (!img) return;

  let buffer = p.createGraphics(size, size);

  if (PIXEL_PARAMS.currentSize > 1) {
    const tempBuffer = p.createGraphics(
      Math.ceil(size / PIXEL_PARAMS.currentSize),
      Math.ceil(size / PIXEL_PARAMS.currentSize),
    );

    tempBuffer.image(img, 0, 0, tempBuffer.width, tempBuffer.height);
    buffer.image(tempBuffer, 0, 0, size, size);
    tempBuffer.remove();
  } else {
    buffer.image(img, 0, 0, size, size);
  }

  p.image(buffer, centerX - size / 2, centerY - size / 2, size, size);
  buffer.remove();

  p.stroke(THEME.line[0], THEME.line[1], THEME.line[2], 28);
  p.strokeWeight(1);
  for (let i = centerY - size / 2; i < centerY + size / 2; i += 3) {
    p.line(centerX - size / 2, i, centerX + size / 2, i);
  }
}

// Function to randomize surveillance square dimensions
function randomizeSurveillanceSquares() {
  surveillanceSquares = {
    main: { 
      size: 0.5 + Math.random() * 0.3, // 0.5 to 0.8
      x: (Math.random() - 0.5) * 0.1, // slight random offset
      y: (Math.random() - 0.5) * 0.1 
    },
    leftEye: { 
      size: 0.06 + Math.random() * 0.04, // 0.06 to 0.10
      x: -0.18 + Math.random() * 0.06, // -0.18 to -0.12
      y: -0.18 + Math.random() * 0.06 // -0.18 to -0.12
    },
    rightEye: { 
      size: 0.06 + Math.random() * 0.04, // 0.06 to 0.10
      x: 0.05 + Math.random() * 0.06, // 0.05 to 0.11
      y: -0.18 + Math.random() * 0.06 // -0.18 to -0.12
    },
    nose: { 
      size: 0.04 + Math.random() * 0.04, // 0.04 to 0.08
      x: (Math.random() - 0.5) * 0.06, // slight random offset
      y: -0.08 + Math.random() * 0.06 // -0.08 to -0.02
    },
    mouth: { 
      size: 0.08 + Math.random() * 0.08, // 0.08 to 0.16
      x: (Math.random() - 0.5) * 0.06, // slight random offset
      y: 0.08 + Math.random() * 0.06 // 0.08 to 0.14
    }
  };
}

/** Horizontal scan line, sweeps top → bottom → top across the portrait (after image is fully revealed too). */
function drawPortraitRasterScanLine(p, centerX, centerY, imageSize) {
  const time = p.millis() * 0.001;
  const top = centerY - imageSize / 2;
  const u = (Math.sin(time * 1.2) + 1) / 2;
  const scanY = top + u * imageSize;

  p.push();
  p.strokeWeight(1);
  p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 52);
  p.line(centerX - imageSize / 2, scanY, centerX + imageSize / 2, scanY);
  p.pop();
}

// Add AI surveillance recognition overlay with random dimensions
function drawSurveillanceOverlay(p, centerX, centerY, imageSize) {
  const time = p.millis() * 0.001;
  
  p.push();
  p.noFill();
  p.strokeWeight(2);
  
  // Main facial recognition square (using random dimensions)
  const mainSquareSize = imageSize * surveillanceSquares.main.size;
  const mainX = centerX + (imageSize * surveillanceSquares.main.x);
  const mainY = centerY + (imageSize * surveillanceSquares.main.y);
  const scanAlpha = 100 + Math.sin(time * 2.2) * 55;
  p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], scanAlpha);
  p.rect(
    mainX - mainSquareSize/2, 
    mainY - mainSquareSize/2, 
    mainSquareSize, 
    mainSquareSize
  );
  
  // Corner brackets for main square
  const bracketSize = 20;
  p.strokeWeight(2);
  p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 160);
  
  // Top-left bracket
  p.line(mainX - mainSquareSize/2, mainY - mainSquareSize/2, 
         mainX - mainSquareSize/2 + bracketSize, mainY - mainSquareSize/2);
  p.line(mainX - mainSquareSize/2, mainY - mainSquareSize/2, 
         mainX - mainSquareSize/2, mainY - mainSquareSize/2 + bracketSize);
  
  // Top-right bracket
  p.line(mainX + mainSquareSize/2, mainY - mainSquareSize/2, 
         mainX + mainSquareSize/2 - bracketSize, mainY - mainSquareSize/2);
  p.line(mainX + mainSquareSize/2, mainY - mainSquareSize/2, 
         mainX + mainSquareSize/2, mainY - mainSquareSize/2 + bracketSize);
  
  // Bottom-left bracket
  p.line(mainX - mainSquareSize/2, mainY + mainSquareSize/2, 
         mainX - mainSquareSize/2 + bracketSize, mainY + mainSquareSize/2);
  p.line(mainX - mainSquareSize/2, mainY + mainSquareSize/2, 
         mainX - mainSquareSize/2, mainY + mainSquareSize/2 - bracketSize);
  
  // Bottom-right bracket
  p.line(mainX + mainSquareSize/2, mainY + mainSquareSize/2, 
         mainX + mainSquareSize/2 - bracketSize, mainY + mainSquareSize/2);
  p.line(mainX + mainSquareSize/2, mainY + mainSquareSize/2, 
         mainX + mainSquareSize/2, mainY + mainSquareSize/2 - bracketSize);
  
  p.strokeWeight(1);
  const featureAlpha = 70 + Math.sin(time * 3) * 45;
  p.stroke(THEME.accentDim[0], THEME.accentDim[1], THEME.accentDim[2], featureAlpha);
  
  // Left eye detection square
  const leftEyeSize = imageSize * surveillanceSquares.leftEye.size;
  const leftEyeX = centerX + (imageSize * surveillanceSquares.leftEye.x);
  const leftEyeY = centerY + (imageSize * surveillanceSquares.leftEye.y);
  p.rect(leftEyeX, leftEyeY, leftEyeSize, leftEyeSize);
  
  // Right eye detection square
  const rightEyeSize = imageSize * surveillanceSquares.rightEye.size;
  const rightEyeX = centerX + (imageSize * surveillanceSquares.rightEye.x);
  const rightEyeY = centerY + (imageSize * surveillanceSquares.rightEye.y);
  p.rect(rightEyeX, rightEyeY, rightEyeSize, rightEyeSize);
  
  // Nose detection square
  const noseSize = imageSize * surveillanceSquares.nose.size;
  const noseX = centerX + (imageSize * surveillanceSquares.nose.x);
  const noseY = centerY + (imageSize * surveillanceSquares.nose.y);
  p.rect(noseX - noseSize/2, noseY, noseSize, noseSize);
  
  // Mouth detection square
  const mouthSize = imageSize * surveillanceSquares.mouth.size;
  const mouthX = centerX + (imageSize * surveillanceSquares.mouth.x);
  const mouthY = centerY + (imageSize * surveillanceSquares.mouth.y);
  p.rect(mouthX - mouthSize/2, mouthY, mouthSize, mouthSize * 0.6);

  p.textFont(UI_MONO);
  p.fill(THEME.muted[0], THEME.muted[1], THEME.muted[2], 220);
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(9);
  p.text('ID  ···', centerX - imageSize/2 + 6, centerY - imageSize/2 + 6);
  p.text('CONF  97', centerX - imageSize/2 + 6, centerY - imageSize/2 + 17);
  p.text('STAT  OK', centerX - imageSize/2 + 6, centerY - imageSize/2 + 28);
  
  p.pop();
}

// Add helper function to reset parameters
function resetParameters() {
  // Reset streaming parameters
  STREAM_PARAMS.isStreaming = false;
  STREAM_PARAMS.currentIndex = 0;
  STREAM_PARAMS.streamingText = "";
  STREAM_PARAMS.imageLoaded = false;

  currentImage = null;
  
  // Randomize surveillance square dimensions for new generation
  randomizeSurveillanceSquares();
  
  // Reset connection parameters
  CONNECTION_PARAMS.isFluctuating = false;
  
  // Reset pixelation
  PIXEL_PARAMS.currentSize = PIXEL_PARAMS.initialSize;
  
  // Reset loader parameters
  LOADER_PARAMS.currentSpeed = LOADER_PARAMS.baseSpeed;

  awaitingPortraitImage = false;
}

// Add helper function to handle loader sound
function startLoaderSound() {
  if (p5Instance) {
    const ctx = p5Instance.getAudioContext();
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
  }

  if (oscillator) {
    oscillator.stop();
  }
  if (modulatorOsc) {
    modulatorOsc.stop();
  }
  
  // Initialize oscillators (after user gesture, e.g. Space)
  oscillator = new p5.Oscillator('sine');
  modulatorOsc = new p5.Oscillator('sine');
  
  // Set initial frequencies
  oscillator.freq(DRONE_PARAMS.baseFreq);
  modulatorOsc.freq(DRONE_PARAMS.modulatorFreq);
  
  // Set initial amplitudes
  oscillator.amp(DRONE_PARAMS.baseAmp);
  modulatorOsc.amp(DRONE_PARAMS.baseAmp * 0.8);
  
  // Start oscillators
  oscillator.start();
  modulatorOsc.start();
}