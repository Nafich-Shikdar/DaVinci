
const { useState, useEffect } = React;

// Utility functions for color manipulation
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
const hexToRgb = hex => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};
const adjustHue = (hex, degrees) => {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  hsl.h = (hsl.h + degrees) % 360;
  const { r: newR, g: newG, b: newB } = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(Math.round(newR), Math.round(newG), Math.round(newB));
};
const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
};
const hslToRgb = (h, s, l) => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    h /= 360;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
};
const generateRandomColor = () => {
  return rgbToHex(
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256)
  );
};

// Simulate AI preference learning (mock Gemini API)
const mockGeminiAPI = (color, preferences) => {
  const { h } = rgbToHsl(...Object.values(hexToRgb(color)));
  return {
    analogous: [adjustHue(color, -30), adjustHue(color, 30)],
    triadic: [adjustHue(color, 120), adjustHue(color, 240)],
    gradient: [color, adjustHue(color, 15), adjustHue(color, 30)]
  };
};

// Main React component
const ColorPatternTool = () => {
  const [baseColor, setBaseColor] = useState('#ff5733');
  const [palette, setPalette] = useState([]);
  const [lockedColors, setLockedColors] = useState([]);
  const [hueShift, setHueShift] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [temperature, setTemperature] = useState(0);
  const [preferences, setPreferences] = useState([]);

  useEffect(() => {
    generatePalette();
  }, [baseColor, lockedColors, hueShift, brightness, temperature]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        setBaseColor(generateRandomColor());
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const generatePalette = () => {
    const aiSuggestions = mockGeminiAPI(baseColor, preferences);
    const newPalette = [
      baseColor,
      ...aiSuggestions.analogous,
      ...aiSuggestions.triadic,
      ...lockedColors
    ].map(color => {
      const { r, g, b } = hexToRgb(color);
      const { h, s, l } = rgbToHsl(r, g, b);
      const newH = (h + hueShift) % 360;
      const newL = Math.min(1, Math.max(0, l * brightness));
      const tempAdjusted = temperature > 0 ? adjustHue(color, temperature * 30) : color;
      return adjustHue(rgbToHex(...Object.values(hslToRgb(newH, s, newL))), temperature * 30);
    });
    setPalette(newPalette.slice(0, 5));
    setPreferences([...preferences, baseColor].slice(-10));
  };

  const lockColor = (color) => {
    if (!lockedColors.includes(color)) {
      setLockedColors([...lockedColors, color]);
    } else {
      setLockedColors(lockedColors.filter(c => c !== color));
    }
  };

  const exportPalette = (format) => {
    if (format === 'png') {
      html2canvas(document.getElementById('palette')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'palette.png';
        link.href = canvas.toDataURL();
        link.click();
      });
    } else if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      palette.forEach((color, i) => {
        doc.setFillColor(color);
        doc.rect(10, 10 + i * 30, 50, 20, 'F');
        doc.setTextColor(0);
        doc.text(color, 70, 20 + i * 30);
      });
      doc.save('palette.pdf');
    } else if (format === 'scss') {
      const scss = palette.map((color, i) => `$color${i + 1}: ${color};`).join('\n');
      const blob = new Blob([scss], { type: 'text/scss' });
      const link = document.createElement('a');
      link.download = 'palette.scss';
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Color Pattern Tool</h1>
      <div className="mb-4">
        <label className="block mb-2">Base Color:</label>
        <input
          type="color"
          value={baseColor}
          onChange={(e) => setBaseColor(e.target.value)}
          className="w-20 h-10"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Hue Shift: {hueShift}°</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={hueShift}
          onChange={(e) => setHueShift(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Brightness: {brightness.toFixed(2)}</label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Temperature: {temperature.toFixed(2)}</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div id="palette" className="flex mb-4">
        {palette.map((color, i) => (
          <div
            key={i}
            className={`w-20 h-20 mr-2 cursor-pointer ${lockedColors.includes(color) ? 'border-4 border-blue-500' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => lockColor(color)}
            title={color}
          ></div>
        ))}
      </div>
      <div className="mb-4">
        <button
          onClick={() => exportPalette('png')}
          className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Export PNG
        </button>
        <button
          onClick={() => exportPalette('pdf')}
          className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Export PDF
        </button>
        <button
          onClick={() => exportPalette('scss')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Export SCSS
        </button>
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">UI Card Mockup</h2>
        <div
          className="p-4 rounded-lg shadow-lg"
          style={{
            backgroundColor: palette[0],
            color: palette[1],
            borderColor: palette[2]
          }}
        >
          <h3 className="text-lg font-bold">Sample Card</h3>
          <p style={{ color: palette[3] }}>This is a sample UI card using your palette.</p>
          <button
            style={{ backgroundColor: palette[4], color: palette[0] }}
            className="mt-2 px-4 py-2 rounded"
          >
            Action
          </button>
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Gradient Preview</h2>
        <div
          className="w-full h-20 rounded"
          style={{
            background: `linear-gradient(to right, ${mockGeminiAPI(baseColor, preferences).gradient.join(', ')})`
          }}
        ></div>
      </div>
    </div>
  );
};

ReactDOM.render(<ColorPatternTool />, document.getElementById('root'));
