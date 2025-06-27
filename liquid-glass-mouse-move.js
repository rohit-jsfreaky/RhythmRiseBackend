// Vanilla JS Liquid Glass Effect with Mouse Following - Paste into browser console
// Enhanced version with elastic movement and wave effects that follows mouse

(function() {
  'use strict';
  
  // Check if liquid glass already exists and destroy it
  if (window.liquidGlass) {
    window.liquidGlass.destroy();
    console.log('Previous liquid glass effect removed.');
  }
  
  // Utility functions
  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  function texture(x, y) {
    return { type: 't', x, y };
  }

  // Generate unique ID
  function generateId() {
    return 'liquid-glass-' + Math.random().toString(36).substr(2, 9);
  }

  // Main Shader class with mouse following
  class Shader {
    constructor(options = {}) {
      this.width = options.width || 100;
      this.height = options.height || 100;
      this.fragment = options.fragment || ((uv) => texture(uv.x, uv.y));
      this.canvasDPI = 1;
      this.id = generateId();
      this.offset = 10;
      
      this.mouse = { x: 0, y: 0 };
      this.mouseUsed = false;
      
      // Elasticity properties
      this.position = { x: 0, y: 0 };
      this.velocity = { x: 0, y: 0 };
      this.targetPosition = { x: 0, y: 0 };
      this.elasticity = 0.15; // Spring strength
      this.damping = 0.85; // Friction
      this.animationId = null;
      
      // Wave effect properties
      this.waveTime = 0;
      this.waveAmplitude = 0;
      this.waveDecay = 0.95;
      
      // Mouse interaction
      this.mouseVelocity = { x: 0, y: 0 };
      this.lastMousePos = { x: 0, y: 0 };
      
      this.createElement();
      this.setupEventListeners();
      this.startAnimation();
      this.updateShader();
    }

    createElement() {
      // Create container
      this.container = document.createElement('div');
      this.container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${this.width}px;
        height: ${this.height}px;
        overflow: hidden;
        border-radius: 150px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25), 0 -10px 25px inset rgba(0, 0, 0, 0.15);
        cursor: none;
        backdrop-filter: url(#${this.id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1);
        z-index: 9999;
        pointer-events: none;
        transition: border-radius 0.3s ease-out;
      `;

      // Store initial position
      const rect = this.container.getBoundingClientRect();
      this.position.x = rect.left;
      this.position.y = rect.top;
      this.targetPosition.x = rect.left;
      this.targetPosition.y = rect.top;

      // Create SVG filter
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      this.svg.setAttribute('width', '0');
      this.svg.setAttribute('height', '0');
      this.svg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 9998;
      `;

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', `${this.id}_filter`);
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('colorInterpolationFilters', 'sRGB');
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', this.width.toString());
      filter.setAttribute('height', this.height.toString());

      this.feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
      this.feImage.setAttribute('id', `${this.id}_map`);
      this.feImage.setAttribute('width', this.width.toString());
      this.feImage.setAttribute('height', this.height.toString());

      this.feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
      this.feDisplacementMap.setAttribute('in', 'SourceGraphic');
      this.feDisplacementMap.setAttribute('in2', `${this.id}_map`);
      this.feDisplacementMap.setAttribute('xChannelSelector', 'R');
      this.feDisplacementMap.setAttribute('yChannelSelector', 'G');

      filter.appendChild(this.feImage);
      filter.appendChild(this.feDisplacementMap);
      defs.appendChild(filter);
      this.svg.appendChild(defs);

      // Create canvas for displacement map (hidden)
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width * this.canvasDPI;
      this.canvas.height = this.height * this.canvasDPI;
      this.canvas.style.display = 'none';

      this.context = this.canvas.getContext('2d');
    }

    constrainPosition(x, y) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const minX = this.offset;
      const maxX = viewportWidth - this.width - this.offset;
      const minY = this.offset;
      const maxY = viewportHeight - this.height - this.offset;
      
      const constrainedX = Math.max(minX, Math.min(maxX, x));
      const constrainedY = Math.max(minY, Math.min(maxY, y));
      
      return { x: constrainedX, y: constrainedY };
    }

    startAnimation() {
      const animate = () => {
        this.updatePhysics();
        this.updateShader();
        this.animationId = requestAnimationFrame(animate);
      };
      animate();
    }

    updatePhysics() {
      // Update wave time
      this.waveTime += 0.1;
      this.waveAmplitude *= this.waveDecay;
      
      // Spring physics for elastic movement
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      
      // Apply spring force
      this.velocity.x += dx * this.elasticity;
      this.velocity.y += dy * this.elasticity;
      
      // Apply damping
      this.velocity.x *= this.damping;
      this.velocity.y *= this.damping;
      
      // Update position
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      
      // Update DOM position with elastic movement
      this.container.style.left = this.position.x + 'px';
      this.container.style.top = this.position.y + 'px';
      this.container.style.transform = 'none';
      
      // Add subtle deformation based on velocity
      const velocityMagnitude = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      const deformation = Math.min(velocityMagnitude * 2, 20);
      const baseRadius = 150;
      const newRadius = baseRadius - deformation;
      
      this.container.style.borderRadius = `${newRadius}px`;
    }

    setupEventListeners() {
      // Mouse following functionality
      document.addEventListener('mousemove', (e) => {
        // Calculate mouse velocity
        const mouseVelX = e.clientX - this.lastMousePos.x;
        const mouseVelY = e.clientY - this.lastMousePos.y;
        this.mouseVelocity.x = mouseVelX * 0.1;
        this.mouseVelocity.y = mouseVelY * 0.1;
        this.lastMousePos.x = e.clientX;
        this.lastMousePos.y = e.clientY;

        // Update target position to follow mouse (centered on cursor)
        const mouseX = e.clientX - this.width / 2;
        const mouseY = e.clientY - this.height / 2;
        
        const constrainedPos = this.constrainPosition(mouseX, mouseY);
        this.targetPosition.x = constrainedPos.x;
        this.targetPosition.y = constrainedPos.y;
        
        // Add movement energy to wave amplitude
        const movementSpeed = Math.sqrt(mouseVelX * mouseVelX + mouseVelY * mouseVelY);
        this.waveAmplitude = Math.min(this.waveAmplitude + movementSpeed * 0.01, 0.5);

        // Update mouse position for shader
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width;
        this.mouse.y = (e.clientY - rect.top) / rect.height;
      });

      // Add click effect for extra waves
      document.addEventListener('click', () => {
        this.waveAmplitude = Math.max(this.waveAmplitude, 0.4);
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        const constrained = this.constrainPosition(this.targetPosition.x, this.targetPosition.y);
        this.targetPosition.x = constrained.x;
        this.targetPosition.y = constrained.y;
      });
    }

    updateShader() {
      const mouseProxy = new Proxy(this.mouse, {
        get: (target, prop) => {
          this.mouseUsed = true;
          return target[prop];
        }
      });

      this.mouseUsed = false;

      const w = this.width * this.canvasDPI;
      const h = this.height * this.canvasDPI;
      const data = new Uint8ClampedArray(w * h * 4);

      let maxScale = 0;
      const rawValues = [];

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);
        const pos = this.fragment(
          { x: x / w, y: y / h },
          mouseProxy,
          {
            time: this.waveTime,
            amplitude: this.waveAmplitude,
            velocity: this.velocity,
            mouseVelocity: this.mouseVelocity
          }
        );
        const dx = pos.x * w - x;
        const dy = pos.y * h - y;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        rawValues.push(dx, dy);
      }

      maxScale *= 0.5;

      let index = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = rawValues[index++] / maxScale + 0.5;
        const g = rawValues[index++] / maxScale + 0.5;
        data[i] = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }

      this.context.putImageData(new ImageData(data, w, h), 0, 0);
      this.feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.canvas.toDataURL());
      this.feDisplacementMap.setAttribute('scale', (maxScale / this.canvasDPI).toString());
    }

    appendTo(parent) {
      parent.appendChild(this.svg);
      parent.appendChild(this.container);
    }

    destroy() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.svg.remove();
      this.container.remove();
      this.canvas.remove();
    }
  }

  // Create the liquid glass effect that follows mouse
  function createLiquidGlass() {
    const shader = new Shader({
      width: 300,
      height: 200,
      fragment: (uv, mouse, effects) => {
        const ix = uv.x - 0.5;
        const iy = uv.y - 0.5;
        
        // Base shape
        const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
        
        // Add wave effects for water-like movement
        let waveX = 0;
        let waveY = 0;
        
        if (effects) {
          // Ripple effect from center
          const centerDist = Math.sqrt(ix * ix + iy * iy);
          const ripple = Math.sin(centerDist * 20 - effects.time * 2) * effects.amplitude * 0.1;
          
          // Velocity-based distortion
          const velocityEffect = (effects.velocity.x + effects.velocity.y) * 0.01;
          
          // Mouse interaction waves
          const mouseEffect = (effects.mouseVelocity.x + effects.mouseVelocity.y) * 0.005;
          
          waveX = (ripple + velocityEffect + mouseEffect) * Math.cos(effects.time * 0.5);
          waveY = (ripple + velocityEffect + mouseEffect) * Math.sin(effects.time * 0.3);
        }
        
        const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
        const scaled = smoothStep(0, 1, displacement);
        
        // Apply wave distortion
        const finalX = (ix + waveX) * scaled + 0.5;
        const finalY = (iy + waveY) * scaled + 0.5;
        
        return texture(finalX, finalY);
      }
    });

    shader.appendTo(document.body);

    console.log('Liquid Glass Mouse Follower created! Move your mouse around to see the elastic following effect. Click for extra waves!');
    
    window.liquidGlass = shader;
  }

  // Initialize
  createLiquidGlass();
})();