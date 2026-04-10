import './style.css';
import p5 from 'p5';

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

let isLoading = false;
let textToShow = '';

const sketch = (p) => {
  p.setup = function () {
    p.createCanvas(p.windowWidth, 700);
    p.fill(p.color('black'));
    p.textSize(30);
  };

  p.keyPressed = function () {
    if (p.keyCode === 32) {
      isLoading = true;
      chat('generate haiku');
    }
  };

  async function chat(prompt) {
    try {
      const { text } = await postReplicate({
        action: 'text',
        prompt,
      });

      textToShow = text;
      isLoading = false;
    } catch (err) {
      console.error('An error occurred in the chat function:', err);
      isLoading = false;
    }
  }

  p.draw = function () {
    p.background(p.color(255));
    if (isLoading) {
      displayLoader(p);
    } else {
      p.textAlign(p.CENTER, p.TOP);
      p.fill(p.color(50));
      p.text(textToShow, 10, 50, p.width - 20, p.height - 20);
    }
  };
};

function displayLoader(p) {
  // Simplify or modify this loader animation as needed
}

function onReady() {
  const mainElt = document.querySelector('main');
  new p5(sketch, mainElt);
}

if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener('DOMContentLoaded', onReady);
}
