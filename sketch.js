import './style.css';
import OpenAI from 'openai';



const openAIKey = import.meta.env.VITE_OPENAI_KEY;

let openai;
let isLoading = false;
let sampleSound; // Declare the variable for the sound
let isSoundPlaying = false; // Track the playing state
let generatedImage = null; // Store the generated image
let imageLoading = false; // Track image loading state

// Add p5 preload image variable
let currentImage = null;

// Add at the top with other global variables
let letters = [];
let textToShow = "";
let textIndex = 0;
let isDragging = false;
let lastConversionFrame = 0;
const conversionInterval = 60;
let canvasWidth;
let canvasHeight;

// Add responsive sizing parameters
const BASE_PARAMS = {
  canvasWidth: 1920,  // Base canvas width for scaling
  canvasHeight: 1080, // Base canvas height for scaling
  fontSize: 32,       // Base font size
  boxSize: 45,       // Base box size
  lineHeight: 70,    // Base line height
  spacing: 25        // Base letter spacing
};

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

// Update TEXT_PARAMS with Verdana font
const TEXT_PARAMS = {
  fontSize: 20,
  lineHeight: 32,
  padding: 40,
  width: Math.min(canvasWidth * 0.8, 900),
  backgroundColor: [0, 0, 0, 240],
  textColor: [0, 255, 255],
  glyphColor: [0, 255, 255, 40],
  borderColor: [0, 255, 255, 100],
  glowColor: [0, 255, 255, 50],
  borderWidth: 2,
  glowBlur: 15,
  font: 'Verdana'  // Change to Verdana
};

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

const prompt = `Generate a very short( max 60 words) dating profile in 1st person that emphasizes Global South perspectives and experiences. Include:
- Location using local/indigenous names (e.g., Tkaronto instead of Toronto, Abya Yala instead of Americas, Nyoongar Boodjar, Alkebulan)
- Use some words from local languages mixed with English
- Location in transformed metropolis (focus on cities in Latin America, Africa, Asia, or the Caribbean)
- Cultural elements and traditions using their original names
- Relationship styles using local terms for kinship and connection
- Personal interests that blend ancestral practices (use original names)
- Your unique career in post-colonial future economies.
- mix with future tech. Be global as well as local.
- Include at least 2-3 untranslated words from the local language (with context)
Set in post-2085 when time travel became open source. Include which year you'd like to meet in. Avoid stereotypes.

Example terms to inspire (but use others):
- Pachamama (Quechua/Aymara - Mother Earth)
- Ubuntu (Nguni Bantu - human interconnectedness)
- Sumak Kawsay (Kichwa - good living in harmony)
- Sawubona (Zulu - "I see you" as greeting)
- Use similar terms from the region you choose`;

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
  textGlow: 'rgba(0, 255, 255, 0.6)'
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

// Add network visualization parameters
const NETWORK_PARAMS = {
  nodes: [],
  nodeCount: 20,          // Increased for fuller coverage
  connections: [],
  pulseRadius: 0,
  maxRadius: 100,
  nodeSize: 4,
  pulseSpeed: 0.02,
  connectionThreshold: 150,
  yOffset: 0,            // Start from top
  width: 250,           // Width of network area
  height: window.innerHeight, // Full height
  margin: 20            // Margin from edge
};

// Add Node class for network visualization
class Node {
  constructor(p, x, y) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.vx = p.random(-0.5, 0.5);
    this.vy = p.random(-0.5, 0.5);
    this.brightness = p.random(100, 255);
  }

  update(strength) {
    // Move nodes based on connection strength
    this.x += this.vx * strength;
    this.y += this.vy * strength;

    // Bounce off boundaries
    if (this.x < 0 || this.x > NETWORK_PARAMS.width) this.vx *= -1;
    if (this.y < 0 || this.y > NETWORK_PARAMS.height) this.vy *= -1;

    // Constrain position
    this.x = this.p.constrain(this.x, 0, NETWORK_PARAMS.width);
    this.y = this.p.constrain(this.y, 0, NETWORK_PARAMS.height);
  }
}

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
    
    // Initialize oscillators with proper waveforms
    oscillator = new p5.Oscillator('sine');
    oscillator.amp(0);
    
    modulatorOsc = new p5.Oscillator('sine');
    modulatorOsc.amp(0);
    modulatorOsc.freq(DRONE_PARAMS.modulatorFreq);
    
    // Start oscillators
    oscillator.start();
    modulatorOsc.start();
  };

  p.draw = function() {
    if (isInitialLoad) {
      // Clear background
      p.background(0);
      
      // Draw animated background grid
      p.push();
      p.stroke(30);
      p.strokeWeight(0.5);
      const time = p.millis() * 0.001;
      for(let i = 0; i < canvasWidth; i += 50) {
        const offset = Math.sin(time + i * 0.01) * 5;
        p.line(i, offset, i, canvasHeight + offset);
      }
      for(let i = 0; i < canvasHeight; i += 50) {
        const offset = Math.cos(time + i * 0.01) * 5;
        p.line(offset, i, canvasWidth + offset, i);
      }
      p.pop();
      
      // Show landing page with animation
      displayLandingPage(p);
      return;
    }

    // Clear background
    p.background(0);
    
    // Draw background grid
    p.push();
    p.stroke(30);
    p.strokeWeight(0.5);
    for(let i = 0; i < canvasWidth; i += 50) {
      p.line(i, 0, i, canvasHeight);
    }
    for(let i = 0; i < canvasHeight; i += 50) {
      p.line(0, i, canvasWidth, i);
    }
    p.pop();

    if (isLoading) {
      displayLoader(p);
      return;
    }

    // Draw image if available
    if (currentImage) {
      p.push();
      
      // Calculate dimensions and positions
      const imageSize = Math.min(canvasHeight * 0.8, canvasWidth * 0.4); // Image takes 40% of width
      
      // Position image in the left second quarter
      const centerX = canvasWidth * 0.25; // This puts it in the left second quarter
      const centerY = canvasHeight/2;
      
      // Calculate pixelation based on text streaming progress
      if (STREAM_PARAMS.isStreaming) {
        const progress = STREAM_PARAMS.currentIndex / textToShow.length;
        PIXEL_PARAMS.currentSize = Math.max(
          PIXEL_PARAMS.finalSize,
          PIXEL_PARAMS.initialSize * (1 - progress)
        );
      }
      
      // Draw pixelated image
      drawPixelatedImage(p, currentImage, centerX, centerY, imageSize);
      p.pop();
      
      // Draw date/time display
      displayDateTime(p);
    }

    // Draw streaming text if available
    if (textToShow) {
      const imageSize = Math.min(canvasHeight * 0.8, canvasWidth * 0.4);
      const textWidth = Math.min(canvasWidth * 0.4, 600);
      
      // Position text to the right of the image
      const textX = (canvasWidth * 0.25) + (imageSize/2) + 50; // Align with image position
      
      // Calculate image middle position
      const imageTopY = canvasHeight/2 - imageSize/2;
      const imageMidY = imageTopY + (imageSize * 0.5); // Middle of the image
      const textY = imageMidY - 100; // Start text slightly above middle
      
      streamText(p, textToShow, textX, textY, textWidth);
      
      // Draw fixed elements after streaming text
      if (STREAM_PARAMS.isStreaming || STREAM_PARAMS.currentIndex >= textToShow.length) {
        displayFixedElements(p);
      }
    }

    // Show network visualization after text completes
    if (CONNECTION_PARAMS.isFluctuating) {
      displayConnectionStrength(p);
    }

    // Always draw attribution
    displayAttribution(p);
  };

  // Update keyPressed handler
  p.keyPressed = function() {
    if (p.keyCode === 32) { // Space bar
      if (isInitialLoad) {
        // First press - start initial generation
        isInitialLoad = false;
        isLoading = true;
        
        // Reset all parameters
        resetParameters();
        
        // Start loader sound
        startLoaderSound();
        
        chat();
      } else if (!isLoading) {  // Only check if not loading
        // Subsequent presses - trigger new generation
        isLoading = true;
        
        // Reset all parameters
        resetParameters();
        
        // Clear current content
        textToShow = "";
        currentImage = null;
        
        // Start loader sound
        startLoaderSound();
        
        chat();
      }
    }
  };

  // Initialize audio context only after user interaction
  p.mousePressed = function() {
    if (p.getAudioContext().state !== 'running') {
      p.getAudioContext().resume();
    }
  };
};

function displayLoader(p) {
  // Update loader parameters based on progress
  LOADER_PARAMS.currentSpeed = Math.min(
    LOADER_PARAMS.currentSpeed + LOADER_PARAMS.acceleration,
    LOADER_PARAMS.maxSpeed
  );
  
  // Update sound parameters for FM synthesis
  if (oscillator && modulatorOsc) {
    // Modulator frequency increases with speed
    const modFreq = p.map(
      LOADER_PARAMS.currentSpeed,
      LOADER_PARAMS.baseSpeed,
      LOADER_PARAMS.maxSpeed,
      DRONE_PARAMS.modulatorFreq,
      DRONE_PARAMS.maxModFreq
    );
    
    // Modulation depth increases with speed
    const modDepth = p.map(
      LOADER_PARAMS.currentSpeed,
      LOADER_PARAMS.baseSpeed,
      LOADER_PARAMS.maxSpeed,
      DRONE_PARAMS.modulatorDepth,
      DRONE_PARAMS.maxModDepth
    );
    
    // Update carrier frequency with modulation
    const carrierFreq = DRONE_PARAMS.baseFreq + 
      Math.sin(p.millis() * 0.001) * modDepth;
    
    // Apply FM synthesis
    oscillator.freq(carrierFreq);
    modulatorOsc.freq(modFreq);
    
    // Set amplitudes with smooth transitions
    oscillator.amp(DRONE_PARAMS.baseAmp, 0.1);
    modulatorOsc.amp(DRONE_PARAMS.baseAmp * 0.8, 0.1);
  }

  const time = p.millis() * 0.001;
  const centerX = canvasWidth/2;
  const centerY = canvasHeight/2;
  const size = 200;
  
  // Draw background and grid
  p.push();
  p.background(0);
  p.stroke(30);
  p.strokeWeight(0.5);
  for(let i = 0; i < canvasWidth; i += 50) {
    p.line(i, 0, i, canvasHeight);
  }
  for(let i = 0; i < canvasHeight; i += 50) {
    p.line(0, i, canvasWidth, i);
  }
  p.pop();
  
  p.push();
  p.translate(centerX, centerY);
  
  // Draw rotating circles in cyan
  for(let i = 0; i < 3; i++) {
    p.push();
    p.rotate(time * LOADER_PARAMS.currentSpeed + (i * 2 * Math.PI / 3));
    p.noFill();
    p.stroke(0, 255, 255);
    p.strokeWeight(3);
    p.circle(size * Math.cos(time), size * Math.sin(time), 80);
    
    // Add inner circle
    p.stroke(0, 255, 255, 150);
    p.circle(size * Math.cos(time), size * Math.sin(time), 50);
    p.pop();
  }
  
  // Add pulsing center
  const pulseSize = 60 + Math.sin(time * 4) * 15;
  p.noFill();
  p.stroke(0, 255, 255);
  p.strokeWeight(3);
  p.circle(0, 0, pulseSize);
  
  // Add crossing lines
  p.stroke(0, 255, 255, 200);
  p.line(-pulseSize * 1.5, 0, pulseSize * 1.5, 0);
  p.line(0, -pulseSize * 1.5, 0, pulseSize * 1.5);
  
  // Add "OPENING THE PORTAL" text
  p.noStroke();
  p.fill(0, 255, 255);
  p.textSize(24);
  p.textAlign(p.CENTER, p.CENTER);
  p.text("OPENING PORTAL", 0, pulseSize + 60);
  
  // Add loading percentage
  const loadingPercent = Math.floor((Math.sin(time * 2) + 1) * 50);
  p.textSize(20);
  p.fill(0, 255, 255, 150);
  p.text(`${loadingPercent}%`, 0, pulseSize + 100);
  
  // Add decorative elements
  p.noFill();
  p.stroke(0, 255, 255, 100);
  p.strokeWeight(1);
  p.circle(0, 0, size * 2);
  
  // Add corner markers
  const markerSize = 30;
  p.stroke(0, 255, 255);
  p.strokeWeight(2);
  // Top left
  p.line(-size, -size, -size + markerSize, -size);
  p.line(-size, -size, -size, -size + markerSize);
  // Top right
  p.line(size, -size, size - markerSize, -size);
  p.line(size, -size, size, -size + markerSize);
  // Bottom left
  p.line(-size, size, -size + markerSize, size);
  p.line(-size, size, -size, size - markerSize);
  // Bottom right
  p.line(size, size, size - markerSize, size);
  p.line(size, size, size, size - markerSize);
  
  p.pop();
}

// Add a function to check API key validity
async function checkAPIKey() {
  try {
    const response = await openai.models.list();
    return true;
  } catch (error) {
    console.error("API Key validation error:", error);
    textToShow = "Error: Invalid or expired API key. Please check your configuration.";
    return false;
  }
}

// Update onReady function to check API key
function onReady() {
  try {
    openai = new OpenAI({
      apiKey: openAIKey,
      dangerouslyAllowBrowser: true
    });

    // Check API key before proceeding
    checkAPIKey().then(isValid => {
      if (!isValid) {
        console.error("Invalid API key");
        return;
      }
      
      // Create p5 instance with the sketch
      const mainElt = document.querySelector('main');
      new p5(sketch, mainElt);
    });
  } catch (error) {
    console.error("Error initializing OpenAI:", error);
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Unable to initialize OpenAI. Please check your API key.</div>';
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
  charDelay: 50,    // Increased delay between characters
  currentIndex: 0,
  streamingText: "",
  isStreaming: false,
  lastCharTime: 0,
  imageLoaded: false  // New flag to track image loading
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
  if (!STREAM_PARAMS.imageLoaded) return false;
  
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
  
  // Handle typing and sound effects
  if (currentTime - STREAM_PARAMS.lastCharTime > STREAM_PARAMS.charDelay) {
    if (STREAM_PARAMS.currentIndex < fullText.length) {
      STREAM_PARAMS.streamingText += fullText[STREAM_PARAMS.currentIndex];
      STREAM_PARAMS.currentIndex++;
      STREAM_PARAMS.lastCharTime = currentTime;
      
      // Play typing sound
      if (oscillator) {
        const charCode = fullText[STREAM_PARAMS.currentIndex - 1].charCodeAt(0);
        const typeFreq = TYPING_PARAMS.baseFreq + 
          (charCode % TYPING_PARAMS.freqRange) - TYPING_PARAMS.freqRange/2;
        
        const modFreq = typeFreq + Math.sin(currentTime * 0.01) * TYPING_PARAMS.modDepth;
        
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
  p.textFont('Verdana');
  p.textSize(TEXT_PARAMS.fontSize);
  p.textLeading(TEXT_PARAMS.lineHeight);
  p.fill(0, 255, 255);
  
  // Add glow effect
  p.drawingContext.shadowBlur = 4;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.4)';
  
  // Format text with box
  const formattedText = 
    '╔══════════════════════════════════╗\n' +
    '║  ' + STREAM_PARAMS.streamingText + (currentTime % 1000 < 500 ? '█' : ' ') + '  ║\n' +
    '╚══════════════════════════════════╝';
  
  // Draw text aligned to the right of the image
  p.textAlign(p.LEFT, p.TOP); // Align to top
  p.text(formattedText, x, y, width);
  
  p.pop();
  
  // When streaming completes, start connection fluctuation
  if (STREAM_PARAMS.currentIndex >= fullText.length) {
    CONNECTION_PARAMS.isFluctuating = true;
  }
  
  return STREAM_PARAMS.currentIndex >= fullText.length;
}

// Add time display function
function displayDateTime(p) {
  p.push();
  
  // Calculate position (to the right of the image)
  const imageSize = Math.min(canvasHeight * 0.8, canvasWidth * 0.4);
  const x = (canvasWidth * 0.25) + (imageSize/2) + 50; // Align with right edge of image
  const y = canvasHeight - 50; // Bottom position
  
  // Add glow effect
  p.drawingContext.shadowBlur = 8;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.6)';
  
  // Set text properties
  p.textAlign(p.LEFT, p.BOTTOM);
  p.textSize(16);
  p.fill(0, 255, 255);
  
  // Get current date and time
  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const time = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Format in cyberpunk style
  const dateTimeText = 
    `⟨ ${date.replace(/\//g, '.')} ⟩\n` +
    `◈ ${time} ◈`;
  
  // Add subtle animation
  const pulseAlpha = 180 + Math.sin(p.millis() * 0.002) * 75;
  p.fill(0, 255, 255, pulseAlpha);
  
  // Draw text
  p.text(dateTimeText, x, y);
  
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

// Add connection strength display function
function displayConnectionStrength(p) {
  const x = 20;
  const y = 60;  // Keep quantum link indicator position
  
  p.push();
  // Draw quantum link indicator
  p.textAlign(p.LEFT, p.CENTER);
  p.textSize(16);
  p.drawingContext.shadowBlur = 4;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.4)';
  
  // Calculate connection strength using Perlin noise
  if (CONNECTION_PARAMS.isFluctuating) {
    CONNECTION_PARAMS.noiseOffset += CONNECTION_PARAMS.noiseIncrement;
    CONNECTION_PARAMS.strength = p.map(
      p.noise(CONNECTION_PARAMS.noiseOffset),
      0,
      1,
      CONNECTION_PARAMS.minStrength,
      CONNECTION_PARAMS.maxStrength
    );
  }
  
  // Display connection bars
  const barCount = 5;
  const barWidth = 15;
  const barSpacing = 5;
  const maxBarHeight = 20;
  
  p.noStroke();
  for (let i = 0; i < barCount; i++) {
    const barStrength = (i + 1) / barCount;
    const alpha = CONNECTION_PARAMS.strength >= barStrength ? 255 : 50;
    p.fill(0, 255, 255, alpha);
    const barHeight = maxBarHeight * ((i + 1) / barCount);
    p.rect(x + i * (barWidth + barSpacing), y - barHeight/2, barWidth, barHeight);
  }
  
  // Display connection percentage
  p.fill(0, 255, 255);
  p.text(`QUANTUM LINK: ${Math.floor(CONNECTION_PARAMS.strength * 100)}%`, 
         x + (barCount * (barWidth + barSpacing)) + 10, 
         y);
  
  // Draw network visualization
  if (CONNECTION_PARAMS.isFluctuating) {
    // Initialize nodes if needed
    if (NETWORK_PARAMS.nodes.length === 0) {
      for (let i = 0; i < NETWORK_PARAMS.nodeCount; i++) {
        NETWORK_PARAMS.nodes.push(new Node(
          p,
          p.random(NETWORK_PARAMS.margin, NETWORK_PARAMS.width - NETWORK_PARAMS.margin),
          p.random(0, NETWORK_PARAMS.height)
        ));
      }
    }
    
    // Update and draw nodes
    NETWORK_PARAMS.nodes.forEach(node => {
      node.update(CONNECTION_PARAMS.strength);
    });
    
    // Draw connections
    p.stroke(0, 255, 255, 30);
    p.strokeWeight(0.5);
    for (let i = 0; i < NETWORK_PARAMS.nodes.length; i++) {
      for (let j = i + 1; j < NETWORK_PARAMS.nodes.length; j++) {
        const node1 = NETWORK_PARAMS.nodes[i];
        const node2 = NETWORK_PARAMS.nodes[j];
        const d = p.dist(node1.x, node1.y, node2.x, node2.y);
        
        if (d < NETWORK_PARAMS.connectionThreshold * CONNECTION_PARAMS.strength) {
          const alpha = p.map(d, 0, NETWORK_PARAMS.connectionThreshold * CONNECTION_PARAMS.strength, 100, 0);
          p.stroke(0, 255, 255, alpha);
          p.line(node1.x, node1.y, node2.x, node2.y);
        }
      }
    }
    
    // Draw nodes with glow effect
    p.noStroke();
    NETWORK_PARAMS.nodes.forEach(node => {
      const pulseSize = NETWORK_PARAMS.nodeSize + 
        Math.sin(p.millis() * NETWORK_PARAMS.pulseSpeed) * 2 * CONNECTION_PARAMS.strength;
      
      // Node glow
      p.fill(0, 255, 255, 30);
      p.circle(node.x, node.y, pulseSize * 3);
      
      // Node core
      p.fill(0, 255, 255, node.brightness);
      p.circle(node.x, node.y, pulseSize);
    });
  }
  
  p.pop();
}

// Add attribution parameters
const ATTRIBUTION = {
  text: "concept and programming by marlon barrios solano",
  link: "https://marlonbarrios.github.io/",
  x: 20,  // Will be updated to right align
  y: 20,  // Will be updated to bottom position
  size: 14,
  color: [0, 255, 255, 180],
  hoverColor: [0, 255, 255, 255],
  padding: 20
};

// Add this function to display the attribution
function displayAttribution(p) {
  const x = canvasWidth - ATTRIBUTION.padding;
  const y = canvasHeight - ATTRIBUTION.padding;
  
  p.push();
  p.textAlign(p.RIGHT, p.BOTTOM);
  p.textSize(ATTRIBUTION.size);
  
  // Add hover effect
  const isHovering = p.mouseX > x - 300 && p.mouseX < x && 
                    p.mouseY > y - 30 && p.mouseY < y;
  
  // Add glow effect
  p.drawingContext.shadowBlur = isHovering ? 8 : 4;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.5)';
  
  // Change color on hover
  p.fill(isHovering ? ATTRIBUTION.hoverColor : ATTRIBUTION.color);
  
  // Add cyberpunk decorators
  const prefix = isHovering ? '◈ ' : '[ ';
  const suffix = isHovering ? ' ◈' : ' ]';
  
  p.text(prefix + ATTRIBUTION.text + suffix, x, y);
  
  // Make text clickable
  if (isHovering && p.mouseIsPressed) {
    window.open(ATTRIBUTION.link, '_blank');
  }
  
  p.pop();
}

// Add landing page display function
function displayLandingPage(p) {
  const size = Math.min(canvasWidth, canvasHeight) * 0.4;
  const time = p.millis() * 0.001;
  
  p.push();
  p.translate(canvasWidth/2, canvasHeight/2);
  p.textAlign(p.CENTER, p.CENTER);
  
  // Stronger glow effect
  p.drawingContext.shadowBlur = 15;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.8)';
  
  // Draw animated circles in background with more visibility
  p.push();
  p.noFill();
  p.stroke(0, 255, 255, 50);
  p.strokeWeight(2);
  
  // Add loader-like rotating circles in center
  for (let i = 0; i < 3; i++) {
    const rotationSpeed = 0.5 + Math.sin(time * 0.5) * 0.3; // Variable speed
    p.rotate(time * rotationSpeed + (i * Math.PI * 2/3));
    
    // Outer rotating circles
    const circleSize = size * (1.8 + 0.8 * Math.sin(time * 0.3 + i));
    p.circle(0, 0, circleSize);
    
    // Inner loader circles
    p.stroke(0, 255, 255, 100);
    const loaderSize = size * 0.4;
    p.circle(loaderSize * Math.cos(time * 2), loaderSize * Math.sin(time * 2), 40);
    
    // Add scanning lines
    p.stroke(0, 255, 255, 30);
    p.line(-size, loaderSize * Math.sin(time * 3 + i), size, loaderSize * Math.sin(time * 3 + i));
  }
  
  // Add pulsing center circle
  p.stroke(0, 255, 255, 150);
  const pulseSize = size * 0.2 * (1 + 0.2 * Math.sin(time * 4));
  p.circle(0, 0, pulseSize);
  
  // Add rotating corner markers
  const markerSize = size * 0.1;
  p.stroke(0, 255, 255, 100);
  for (let i = 0; i < 4; i++) {
    p.push();
    p.rotate(time + i * Math.PI/2);
    p.translate(size * 0.6, 0);
    p.line(-markerSize, 0, markerSize, 0);
    p.line(0, -markerSize, 0, markerSize);
    p.pop();
  }
  
  p.pop();
  
  // Title with wave effect
  p.fill(0, 255, 255);
  p.textSize(64);
  const titleText = "PRŌTEÚS PORTAL";
  let xOffset = -p.textWidth(titleText) / 2;
  
  for (let i = 0; i < titleText.length; i++) {
    const yOffset = Math.sin(time * 1.2 + i * 0.3) * 8;
    p.text(titleText[i], xOffset, -size * 0.8 + yOffset);
    xOffset += p.textWidth(titleText[i]);
  }
  
  // Rest of the text elements...
  p.textSize(28);
  const subtitleAlpha = 200 + Math.sin(time) * 55;
  p.fill(200, subtitleAlpha);
  p.text("TRANS-TEMPORAL DATING PORTAL", 0, -size * 0.65);
  
  p.textSize(20);
  const introText = "Connect with time travelers from the future through the Prōteús Portal using Open Source Time Travel Technology.";
  const introWidth = Math.min(800, canvasWidth * 0.6);
  p.fill(200);
  p.text(introText, -introWidth/2, -size * 0.45, introWidth);
  
  // Space instruction with animated arrow
  p.textSize(22);
  const pulseAlpha = 200 + Math.sin(time * 2) * 55;
  p.fill(0, 255, 255, pulseAlpha);
  const arrow = Math.sin(time * 4) > 0 ? "→" : "▶";
  p.text(`[ PRESS SPACE ${arrow} OPEN PORTAL ]`, 0, size * 0.9);
  
  p.pop();
}

// Helper function to draw hexagon
function drawHexagon(p, x, y, size) {
  p.beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    p.vertex(px, py);
  }
  p.endShape(p.CLOSE);
}

// Helper function to draw corner decorations
function drawCornerDecorations(p, size, time) {
  const cornerSize = 40;
  const positions = [
    [-size, -size],
    [size, -size],
    [-size, size],
    [size, size]
  ];
  
  p.stroke(0, 255, 255, 100 + Math.sin(time * 2) * 50);
  p.strokeWeight(2);
  
  positions.forEach(([x, y], i) => {
    const rotation = time * 0.5 + i * Math.PI / 2;
    p.push();
    p.translate(x, y);
    p.rotate(rotation);
    p.line(-cornerSize, 0, 0, 0);
    p.line(0, -cornerSize, 0, 0);
    p.pop();
  });
}

// Update displayFixedElements function to arrange elements vertically
function displayFixedElements(p) {
  p.push();
  
  // Calculate base position (aligned with text position)
  const imageSize = Math.min(canvasHeight * 0.8, canvasWidth * 0.4);
  const baseX = (canvasWidth * 0.25) + (imageSize/2) + 50; // Align with text
  
  // Position elements above text, starting from image top
  const imageTopY = canvasHeight/2 - imageSize/2; // Top of image
  let yPos = imageTopY + 40; // Start below text top
  
  p.textAlign(p.LEFT, p.TOP);
  
  // System indicators with cyan color and enhanced styling
  p.textSize(14);
  p.fill(0, 255, 255);
  
  // Add glow effect
  p.drawingContext.shadowBlur = 4;
  p.drawingContext.shadowColor = 'rgba(0, 255, 255, 0.4)';
  
  const time = p.millis() * 0.001;
  
  // System version with pulse
  const versionAlpha = 200 + Math.sin(time * 2) * 55;
  p.fill(0, 255, 255, versionAlpha);
  p.text('[ ᗩᒪᕵᕼᗩ-ᐯ3.2.1 ]', baseX, yPos);
  yPos += 25;
  
  // Quantum link status with scanning effect
  const linkAlpha = 200 + Math.sin(time * 3) * 55;
  p.fill(0, 255, 255, linkAlpha);
  p.text('⟨ ⎔ QUANTUM-LINK ESTABLISHED ⎔ ⟩', baseX, yPos);
  yPos += 25;
  
  // Timeline verification with blinking effect
  const verifyAlpha = 200 + Math.sin(time * 4) * 55;
  p.fill(0, 255, 255, verifyAlpha);
  p.text('◈◈◈ TIMELINE VERIFIED ◈◈◈', baseX, yPos);
  yPos += 25;
  
  // Cyber symbols with wave effect
  p.textSize(12);
  CYBER_SYMBOLS.forEach((symbolSet, index) => {
    const symbolAlpha = 180 + Math.sin(time * 2 + index) * 75;
    p.fill(0, 255, 255, symbolAlpha);
    const symbol = symbolSet[Math.floor(time * 2 + index) % symbolSet.length];
    const xOffset = Math.sin(time * 2 + index * 0.5) * 5;
    p.text(symbol, baseX + xOffset, yPos);
    yPos += 20;
  });
  
  p.pop();
}

// Add chat function to handle generation
async function chat() {
  try {
    isLoading = true;
    
    // Initialize OpenAI if not already done
    if (!openai) {
      openai = new OpenAI({
        apiKey: openAIKey,
        dangerouslyAllowBrowser: true
      });
    }

    // Generate text content
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    textToShow = completion.choices[0].message.content;
    
    // Generate image
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: "Create a cyberpunk portrait for this dating profile: " + textToShow,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json" // Request base64 instead of URL
    });

    // Create image from base64
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = "data:image/png;base64," + imageResponse.data[0].b64_json;
    });

    // Convert to p5 image
    currentImage = p5Instance.createImage(img.width, img.height);
    currentImage.drawingContext.drawImage(img, 0, 0);
    STREAM_PARAMS.imageLoaded = true;
    isLoading = false;

  } catch (error) {
    console.error('Error:', error);
    isLoading = false;
    if (error.message.includes('Rate limit')) {
      alert(ERROR_MESSAGES.RATE_LIMIT);
    } else if (error.message.includes('quota')) {
      alert(ERROR_MESSAGES.QUOTA_EXCEEDED);
    } else {
      alert(ERROR_MESSAGES.GENERIC);
    }
  }
}

// Add drawPixelatedImage function
function drawPixelatedImage(p, img, centerX, centerY, size) {
  if (!img) return;
  
  // Create buffer at square size
  let buffer = p.createGraphics(size, size);
  
  if (PIXEL_PARAMS.currentSize > 1) {
    // Draw to buffer at reduced size for pixelation
    const tempBuffer = p.createGraphics(
      Math.ceil(size / PIXEL_PARAMS.currentSize),
      Math.ceil(size / PIXEL_PARAMS.currentSize)
    );
    
    tempBuffer.image(img, 0, 0, tempBuffer.width, tempBuffer.height);
    buffer.image(tempBuffer, 0, 0, size, size);
    tempBuffer.remove();
  } else {
    buffer.image(img, 0, 0, size, size);
  }
  
  // Draw final buffer to canvas
  p.image(buffer, 
    centerX - size/2, 
    centerY - size/2, 
    size, 
    size
  );
  buffer.remove();
  
  // Add scan lines
  p.stroke(0, 30);
  p.strokeWeight(1);
  for (let i = centerY - size/2; i < centerY + size/2; i += 2) {
    p.line(
      centerX - size/2,
      i,
      centerX + size/2,
      i
    );
  }
}

// Add helper function to reset parameters
function resetParameters() {
  // Reset streaming parameters
  STREAM_PARAMS.isStreaming = false;
  STREAM_PARAMS.currentIndex = 0;
  STREAM_PARAMS.streamingText = "";
  STREAM_PARAMS.imageLoaded = false;
  
  // Reset connection parameters
  CONNECTION_PARAMS.isFluctuating = false;
  
  // Reset pixelation
  PIXEL_PARAMS.currentSize = PIXEL_PARAMS.initialSize;
  
  // Reset loader parameters
  LOADER_PARAMS.currentSpeed = LOADER_PARAMS.baseSpeed;
}

// Add helper function to handle loader sound
function startLoaderSound() {
  if (oscillator) {
    oscillator.stop();
  }
  if (modulatorOsc) {
    modulatorOsc.stop();
  }
  
  // Initialize oscillators
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