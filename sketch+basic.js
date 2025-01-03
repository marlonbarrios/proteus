import './style.css';
import OpenAI from 'openai';
import p5 from 'p5';

const openAIKey = import.meta.env.VITE_OPENAI_KEY;
let openai;
let isLoading = false;
let textToShow = "";

const sketch = p => {
  p.setup = function() {
    p.createCanvas(p.windowWidth, 700);
    p.fill(p.color('black'));
    p.textSize(30);
  };

  p.keyPressed = function() {
    if (p.keyCode === 32) {
      isLoading = true;
      chat("generate haiku");
    }
  };

  async function chat(prompt) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.5,
        messages: [{ "role": "user", "content": prompt }]
      });

      textToShow = completion.choices[0].message.content;
      isLoading = false;
    } catch (err) {
      console.error("An error occurred in the chat function:", err);
      isLoading = false;
    }
  }

  p.draw = function() {
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
  openai = new OpenAI({
    apiKey: openAIKey,
    dangerouslyAllowBrowser: true
  });

  const mainElt = document.querySelector('main');
  new p5(sketch, mainElt);
}

if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}
