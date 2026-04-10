# Proteus: Trans-Temporal Dating Portal  
**"There is someone for you… in the future"**

<img src="https://github.com/user-attachments/assets/2670f0ab-1463-4cdf-ac1a-70d4b9c10157" alt="Screenshot 2025-01-04 at 3 46 18 PM" width="700">

## Live App  
Check out the live app here: [Proteus: Trans-Temporal Dating Portal](https://proteus-umber.vercel.app/)  

## Overview  
*Proteus* is not just a dating app—it's an art-driven portal into speculative futures. This web art piece invites users to connect with time travelers from eras yet to come, whose profiles reflect fluid and dynamic possibilities of identity, labor, relationships, and embodiment. Each interaction becomes an exploration of how boundaries—genetic, disciplinary, national, relational, and corporeal—might dissolve or transform in a distant, evolving world.

A **decolonial framework** informs the design and narrative of *Proteus*, challenging Eurocentric and hierarchical paradigms of identity, labor, and technology. By foregrounding diverse and non-linear perspectives, it reimagines the future as a space of plurality, mutuality, and fluidity.

---

## 🆕 New Features & Enhancements

### 🌍 **Multilingual Support**
- **9 Languages Available**: English, Español, Português, Français, Deutsch, Türkçe, Kichwa, Nahuatl, Guaraní
- **Dynamic Generation**: AI creates profiles in the selected language
- **Interactive Selection**: Press 'L' to cycle through languages
- **Cultural Authenticity**: Respects linguistic and cultural contexts

### 🎨 **Liquid & Adaptive Interface**
- **Fully Responsive**: Automatically adapts to any screen size
- **Liquid Animations**: Flowing grid lines and organic wave patterns
- **Adaptive Scaling**: All elements scale proportionally
- **Mobile Optimized**: Beautiful experience on all devices

### 🤖 **AI Surveillance Overlay**
- **Dynamic Recognition Squares**: Randomized dimensions each generation
- **Blade Runner Aesthetic**: Cyberpunk surveillance interface
- **Feature Detection**: Eyes, nose, mouth tracking squares
- **Temporal Scanning**: Appears during generation, disappears when complete

### 🎭 **Enhanced Noir Cinematography**
- **Blade Runner Style**: Hyper-realistic noir black and white portraits
- **Diverse Representation**: All ages (20s-70s+), ethnicities, body types
- **Authentic Film Quality**: Solarized tones, dramatic lighting
- **Anti-AI Appearance**: Prompts specifically avoid AI-generated look

### 🏳️‍🌈 **Revolutionary Identity Concepts**
- **New Genders**: Fluxgender, stellargender, quantumgender, ancestralgender, spiritgender
- **Reimagined Sexuality**: Chronosexual, energysexual, memorysexual, consciousness-attracted
- **Decolonial Approach**: Indigenous wisdom, Global South perspectives
- **Future Labor**: Ancestral code weavers, decolonial AI trainers, community healing facilitators

---

<img src="https://github.com/user-attachments/assets/9da7df98-0cef-435c-b8e9-bd2ef0df5487" alt="Screenshot 2025-01-04 at 3 41 41 PM" width="700">

## Key Concept  
Profiles on *Proteus* are designed as narratives of potential futures, embracing the radical fluidity of:  
- **Genealogies**: Where heritage and genetic codes are no longer fixed but fluid and collaborative  
- **Disciplines**: Where rigid professional or academic boundaries give way to interdisciplinary hybrids  
- **Labor**: Where the concept of work transforms with AI and post-scarcity economies, redefining value and productivity  
- **Nations**: Where geopolitical borders blur, and identities become global or even planetary  
- **Relationships**: Where the kinds of connections—romantic, platonic, communal—break free from traditional molds  
- **Bodies**: Where the boundaries of the body expand, incorporating biotech, augmented reality, and virtual forms, enabling beings to transcend physical limits  

Each profile speculates how these shifts might manifest, turning every user interaction into a playful yet profound engagement with possible futures.

---

## Features  

### 1. **Speculative Profiles**  
Time travelers embody a future of boundless possibilities, with their profiles crafted by AI-driven chaining processes:  
- **Text**: Open-source **Meta Llama 3 8B Instruct** on Replicate streams over **SSE** (`/api/replicate-stream`), with **`run()` fallback** if streaming errors; override with `REPLICATE_TEXT_MODEL`
- **Visuals**: Replicate **FLUX.2 [pro]** (`black-forest-labs/flux-2-pro`, configurable) renders the portrait from the completed profile prompt (still image only; no video step)
- **Length**: Prompt targets ~22 short lines / under 320 words; `max_tokens` default 720 (see `sketch.js` / `replicate-handlers.js`)

### 2. **Interactive Controls**  
- **SPACE**: Open a portal to generate new time traveler
- **L**: Cycle through available languages
- **S**: Save current traveler as image file
- **Responsive Interface**: Works seamlessly on all devices

### 3. **Advanced Visual Effects**  
- **AI Surveillance Overlay**: Dynamic recognition squares during generation
- **Liquid Background**: Flowing, adaptive grid animations
- **Noir Cinematography**: Professional film-quality portraits
- **Temporal Scanning**: Authentic cyberpunk interface elements

### 4. **Multilingual Generation**  
- **Cultural Adaptation**: Profiles respect linguistic and cultural contexts
- **Indigenous Languages**: Includes Kichwa, Nahuatl, Guaraní
- **European Languages**: English, Spanish, Portuguese, French, German, Turkish
- **Dynamic Prompts**: AI generation adapts to selected language

---

## Technical Implementation  
- **Vite**: Fast development and build system for modern web apps
- **p5.js**: Creative coding framework for interactive animations and visual effects
- **Replicate API**: Text streams through `POST /api/replicate-stream` (SSE); health ping and **async FLUX** (`image_start` → `image_poll` loops on the client) use `POST /api/replicate` so each serverless invocation stays short and **Vercel Hobby avoids 504** on long image runs (Vite dev middleware + `api/*.js` on Vercel)
- **Responsive Design**: CSS and JavaScript for liquid, adaptive layouts
- **Real-time Interaction**: Dynamic language switching and generation controls

### **AI Pipeline Enhancement**:
- **Decolonial Prompts**: Specifically designed to challenge Western-centric paradigms
- **Blade Runner Aesthetics**: Detailed prompts for authentic noir cinematography
- **Cultural Sensitivity**: Language-specific generation with cultural awareness
- **Anti-AI Prompts**: Explicitly designed to avoid obvious AI-generated appearance

---

## Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- [Replicate](https://replicate.com/) API token

### Installation
```bash
# Clone the repository
git clone https://github.com/marlonbarrios/proteus.git
cd proteus

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Replicate token to .env (server-side only — not bundled into the client)
REPLICATE_API_TOKEN=your_replicate_token_here

# Optional: override default models (text must support Replicate streaming)
# REPLICATE_TEXT_MODEL=meta/meta-llama-3-8b-instruct
# REPLICATE_IMAGE_MODEL=black-forest-labs/flux-2-pro

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

`npm run preview` serves the static build only; it does **not** include the Replicate API route. Use `npm run dev` locally, or deploy to Vercel (or another host) with `REPLICATE_API_TOKEN` set so `api/replicate.js` can run.

---

## Usage Instructions

### **Getting Started**
1. **Select Language**: Press 'L' to cycle through available languages
2. **Open Portal**: Press SPACE to generate a time traveler profile
3. **View Profile**: Watch AI surveillance scanning during generation
4. **Save Traveler**: Press 'S' to download the portrait as an image
5. **Generate More**: Press SPACE again for new travelers

### **Language Options**
- **English**: Default language
- **Español**: Spanish profiles with Latin American perspective
- **Português**: Portuguese with Brazilian/Lusophone contexts
- **Français**: French with Francophone cultural elements
- **Deutsch**: German with Central European perspectives
- **Türkçe**: Turkish with Middle Eastern/Anatolian contexts
- **Kichwa**: Quechua with Andean indigenous wisdom
- **Nahuatl**: Nahuatl with Mesoamerican cultural perspectives
- **Guaraní**: Guaraní with South American indigenous frameworks

---

## Roadmap  

### **Completed Features** ✅
- Multilingual support (9 languages)
- Liquid responsive design
- AI surveillance overlay
- Enhanced noir cinematography
- Revolutionary identity concepts
- Decolonial framework integration

### **Future Enhancements** 🚀
1. **Real-Time Interaction**: Direct communication with time travelers
2. **Voice Synthesis**: Audio profiles in selected languages
3. **Lip-Sync Animation**: Animated portraits with speech
4. **Cultural Themes**: Region-specific visual styles
5. **Community Features**: Share and discuss time traveler encounters

---

## Why Proteus?  
The name references the Greek god Proteus, known for his ability to transform endlessly, a fitting metaphor for a project rooted in the ever-shifting nature of identity and reality.

A **decolonial lens** further shapes *Proteus*, offering a critique of dominant narratives and envisioning futures informed by multiplicity, intersectionality, and equity. By centering voices and perspectives from the margins, *Proteus* becomes a speculative space for rethinking the future beyond colonial constructs.

*Proteus* envisions a future where the rigid frameworks of today dissolve, offering a playful, artistic lens to explore the potential transformations of humanity, technology, and society. By interacting with the characters and their speculative worlds, users engage in an act of co-creation, imagining futures shaped by their own curiosity and connection.

---

## Licensing and Attribution  
*Proteus* is published under an **open-source license**. Users and collaborators are encouraged to explore, adapt, and build upon the project, provided proper attribution is given to the creators. If the work is used or exhibited, clear acknowledgment must be made, crediting its original development.  

---

## Contributing
We welcome contributions that align with the decolonial vision of Proteus. Please consider:
- **Cultural Sensitivity**: Respect for diverse perspectives and identities
- **Technical Excellence**: Clean, performant, accessible code
- **Artistic Vision**: Maintaining the speculative, transformative aesthetic
- **Inclusive Design**: Ensuring accessibility across devices and abilities

---

## Live App  
Check out the live app here: [Proteus: Trans-Temporal Dating Portal](https://proteus-umber.vercel.app/)  

---

## Slogan  
**"There is someone for you… in the future."**

---

*Step through. The boundaries of what's possible await your discovery.*

<img src="https://github.com/user-attachments/assets/f5929092-e75f-426e-aeea-73d064ea1735" alt="Screenshot 2025-01-04 at 3 42 35 PM" width="700">