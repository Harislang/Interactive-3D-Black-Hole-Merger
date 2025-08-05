# 🌌 Black Hole Merger Simulation

An interactive, scientifically-inspired 3D visualization of binary black hole mergers featuring realistic gravitational physics, stunning visual effects, and real-time rendering.

![Black Hole Merger Simulation](https://img.shields.io/badge/Three.js-r163-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![WebGL](https://img.shields.io/badge/WebGL-Powered-orange?style=flat-square)
![Status](https://img.shields.io/badge/status-Active-success?style=flat-square)

**Created by [Sai Gattupalli, Ph.D.](https://saigattupalli.com)** - STEM Education Technology Expert, Researcher, and Writer  
*Developed using innovative "vibe coding" techniques*

## 🎯 Overview

This project simulates one of the most violent and energetic events in the universe - the merger of two black holes. Inspired by LIGO's groundbreaking gravitational wave detections, this simulation combines accurate physics with stunning visual effects to create an educational and mesmerizing experience.

### ✨ Key Features

- **🔬 Realistic Physics Engine**
  - Newtonian gravitational attraction
  - Energy loss through gravitational wave radiation
  - Conservation of momentum and mass-energy
  - Schwarzschild radius calculations
  - Keplerian orbital mechanics

- **🎨 Advanced Visual Effects**
  - Real-time gravitational lensing that warps spacetime
  - Dynamic gravitational wave visualization
  - 70,000+ particle star field
  - Accretion disk with 20,000 particles per black hole
  - Particle-based merger flare effect
  - Bloom and post-processing effects

- **🎮 Interactive Controls**
  - Adjustable mass ratio between black holes
  - Variable initial separation distance
  - Time scale control (0.1x to 3.0x speed)
  - Toggle individual visual effects
  - Orbit camera with smooth damping
  - Real-time parameter adjustments

- **📊 Three Simulation Phases**
  1. **Inspiral**: Black holes orbit each other, slowly losing energy
  2. **Merger**: The violent collision and coalescence
  3. **Ringdown**: The merged black hole settles into equilibrium

## 🚀 Live Demo

[**Launch Simulation →**]([https://your-project.vercel.app](https://interactive-3-d-black-hole-merger.vercel.app/))

*Best experienced on desktop with a modern browser*

## 🛠️ Technology Stack

- **[Three.js](https://threejs.org/)** (r163) - 3D graphics library
- **WebGL** - Hardware-accelerated graphics rendering
- **GLSL Shaders** - Custom gravitational lensing and wave effects
- **ES6 Modules** - Modern JavaScript architecture
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework dependencies

## 📦 Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/black-hole-merger-simulation.git
   cd black-hole-merger-simulation
   ```

2. **Serve the files locally**
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Using Node.js:
   ```bash
   npx serve
   ```
   
   Using VS Code:
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Deployment

#### Vercel (Recommended)

1. Fork this repository
2. Import to [Vercel](https://vercel.com/new)
3. Deploy (no configuration needed)

#### GitHub Pages

1. Go to Settings → Pages
2. Select source: "Deploy from a branch"
3. Choose branch: main, folder: / (root)
4. Save and wait for deployment

#### Netlify

1. Drag and drop the project folder to [Netlify Drop](https://app.netlify.com/drop)
2. Instant deployment with a unique URL

## 🎮 Controls & Usage

### Mouse Controls
- **Left Click + Drag**: Rotate camera around the black holes
- **Scroll Wheel**: Zoom in/out
- **Right Click + Drag**: Pan camera (disabled by default)

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play/Pause simulation |
| `R` | Reset simulation |
| `L` | Toggle gravitational lensing |
| `W` | Toggle gravitational waves |
| `D` | Toggle accretion disks |
| `I` | Show information panel |
| `Esc` | Close information panel |

### Control Panel
- **Mass Ratio**: Adjust the relative masses (M₂/M₁) from 0.1 to 1.0
- **Initial Separation**: Set starting distance (25-80 Schwarzschild radii)
- **Simulation Speed**: Control time scale (0.1x to 3.0x)
- **Visual Effects**: Toggle individual effects on/off

## 🔬 Physics Implementation

### Gravitational Dynamics

The simulation implements classical Newtonian gravity with relativistic corrections:

```javascript
F = G * m1 * m2 / r²
```

### Energy Loss via Gravitational Waves

Based on the Peters-Mathews formula for orbital decay:

```javascript
dE/dt = -(32/5) * (G⁴/c⁵) * (m1² * m2² * (m1+m2)) / r⁵
```

### Mass-Energy Conversion

During merger, approximately 5% of the total mass is converted to gravitational wave energy, following Einstein's mass-energy equivalence.

### Schwarzschild Radius

The event horizon radius is calculated as:
```javascript
Rs = 2GM/c²
```

## 📊 Performance Optimization

- **Particle Systems**: Efficient buffer geometry for 90,000+ particles
- **Level-of-Detail**: Dynamic quality adjustments based on performance
- **Frustum Culling**: Automatic Three.js optimization
- **GPU Acceleration**: WebGL shaders for complex calculations
- **Adaptive Quality**: Pixel ratio capped at 2x for high-DPI displays

### Debug Mode

Add `#debug` to the URL to enable performance monitoring:
```
https://your-site.com/#debug
```

## 🎨 Visual Effects Details

### Gravitational Lensing
Custom GLSL shader that bends light around massive objects, creating realistic spacetime distortion.

### Gravitational Waves
Quadrupole wave pattern shader visualizing spacetime ripples emanating from the system.

### Accretion Disks
20,000 particles per black hole with:
- Keplerian orbital mechanics
- Tidal disruption effects
- Temperature-based color gradients
- Particle life cycles

### Bloom Post-Processing
UnrealBloomPass for enhanced glow effects during merger events.

## 📁 Project Structure

```
black-hole-merger-simulation/
├── index.html          # Main HTML structure
├── style.css           # Styles and animations
├── script.js           # Core simulation logic
├── README.md           # Documentation
└── preview.png         # Social media preview image (optional)
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Maintain consistent code style
- Add comments for complex physics calculations
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Ensure mobile responsiveness
- Optimize performance for low-end devices

## 📚 Educational Resources

### Learn More About Black Holes

- [LIGO Scientific Collaboration](https://www.ligo.org/)
- [Black Hole Mergers and Gravitational Waves](https://www.ligo.caltech.edu/page/gravitational-waves)
- [Einstein's General Relativity](https://einstein.stanford.edu/SPACETIME/spacetime2.html)
- [Schwarzschild Metric](https://en.wikipedia.org/wiki/Schwarzschild_metric)

### Three.js Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [WebGL Fundamentals](https://webglfundamentals.org/)

## 🐛 Known Issues & Limitations

- Performance may vary on integrated graphics cards
- Mobile devices may experience reduced particle counts
- Safari may have minor shader compatibility issues
- Maximum recommended particle count: 100,000 total

## 🗺️ Roadmap

- [ ] Add sound effects and gravitational wave audio
- [ ] Implement spinning black holes (Kerr metric)
- [ ] Add more preset scenarios (different mass ratios)
- [ ] VR/AR support for immersive experience
- [ ] Neutron star merger variant
- [ ] Educational mode with annotations
- [ ] Record and export simulation videos
- [ ] Multi-body simulations (3+ black holes)



## 🙏 Acknowledgments

- Inspired by LIGO's detection of gravitational waves from GW150914
- Three.js community for the excellent documentation and examples
- NASA for public domain space imagery and educational resources
- The scientific community for making complex physics accessible

## 📧 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Project Link: [https://github.com/yourusername/black-hole-merger-simulation](https://github.com/yourusername/black-hole-merger-simulation)
- Live Demo: [https://your-project.vercel.app](https://your-project.vercel.app)

## 📸 Screenshots

### Inspiral Phase
*Two black holes orbiting each other, slowly losing energy to gravitational waves*

### Merger Event
*The violent collision creating intense gravitational waves and energy release*

### Gravitational Lensing
*Spacetime distortion bending light from background stars*

---

<div align="center">
  
**Made with ❤️ and physics**

⭐ Star this repository if you find it interesting!

</div>
