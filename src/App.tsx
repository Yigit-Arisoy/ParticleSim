import { useRef, useEffect } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const PARTICLE_COUNT = 1e6;

  const stride = 4; // 4 floats x,y,dx,dy;
  const byte_stride = stride * 4; // 4 bytes per float
  const sabParticles = new SharedArrayBuffer(PARTICLE_COUNT * byte_stride);

  // x, y, dx, dy
  const sabViewParticles = new Float32Array(sabParticles);

  // dt + mouse x + mouse y + touch down + screen with + screen height
  const sabSimData = new SharedArrayBuffer(4 + 4 + 4 + 4 + 4 + 4);
  const sabViewSimData = new Float32Array(sabSimData);
  // event listeners
  window.addEventListener("mousemove", (e) => {
    sabViewSimData[1] = e.clientX;
    sabViewSimData[2] = e.clientY;
  });
  window.addEventListener("mousedown", (_e) => {
    sabViewSimData[3] = 1;
  });
  window.addEventListener("mouseup", (_e) => {
    sabViewSimData[3] = 0;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize the canvas to fill the window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Function to paint random pixels
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    //init particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sabViewParticles[i * stride] = Math.random() * canvas.width;
      sabViewParticles[i * stride + 1] = Math.random() * canvas.height;
      sabViewParticles[i * stride + 2] = (Math.random() * 2 - 1) * 10;
      sabViewParticles[i * stride + 3] = (Math.random() * 2 - 1) * 10;
    }

    const physicsSim = () => {
      const deltaTime = sabViewSimData[0];
      const isTouch = sabViewSimData[3];
      const mx = sabViewSimData[1];
      const my = sabViewSimData[2];

      const decay = 1 / (1 + deltaTime * 1);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let dx = sabViewParticles[i * stride + 2] * decay;
        let dy = sabViewParticles[i * stride + 3] * decay;

        if (isTouch) {
          const x = sabViewParticles[i * stride];
          const y = sabViewParticles[i * stride + 1];
          const tx = mx - x;
          const ty = my - y;
          const dist = Math.sqrt(tx * tx + ty * ty);
          const dirX = tx / dist;
          const dirY = ty / dist;
          const force = 3 * Math.min(1200, 25830000 / (dist * dist));
          dx += dirX * force * deltaTime;
          dy += dirY * force * deltaTime;
        }

        sabViewParticles[i * stride] += dx * deltaTime;
        sabViewParticles[i * stride + 1] += dy * deltaTime;
        sabViewParticles[i * stride + 2] = dx;
        sabViewParticles[i * stride + 3] = dy;
      }
    };
    const blackFill = () => {
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; // Red
        pixels[i + 1] = 0; // Green
        pixels[i + 2] = 0; // Blue
        pixels[i + 3] = 255; // Alpha (fully opaque)
      }
    };
    const pixelColorFill = () => {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = sabViewParticles[i * 4];
        if (x <= 0 || x >= width)
          //reverse direction
          sabViewParticles[i * 4 + 2] *= -0.5;
        const y = sabViewParticles[i * 4 + 1];
        if (y <= 0 || y >= height)
          //reverse direction
          sabViewParticles[i * 4 + 3] *= -0.5;
        const pixelIndex = ((y | 0) * width + (x | 0)) * 4;
        const rx = x / width;
        const ry = y / height;
        pixels[pixelIndex] += 25 + 65 * rx; // Red channel
        pixels[pixelIndex + 1] += 25 + 65 * ry; // Green channel
        pixels[pixelIndex + 2] += 25 + 65 * (1 - rx); // Blue channel
        pixels[pixelIndex + 3] = 255; // Alpha channel (opacity)
      }
    };

    const paintPixels = () => {
      physicsSim();
      blackFill();
      pixelColorFill();

      ctx.putImageData(imageData, 0, 0);
    };

    // Continuous animation
    let lastTime = 1;
    const animate = (currentTime: number) => {
      const dt = Math.min(1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      sabViewSimData[0] = dt;
      paintPixels();
      requestAnimationFrame(animate);
    };
    animate(0);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} className="p-0 m-0" />;
}

export default App;
