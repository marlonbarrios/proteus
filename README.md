# Entropic Haiku
![Screenshot 2024-02-21 at 10 45 43 PM](https://github.com/marlonbarrios/entropic_haiku/assets/90220317/74303025-f5ad-4a1f-b4fa-28ab21ae83c3)


entropic haiku | duet with latent space
Powered by GPT-4 and designed in p5.js
concept, programming, sound design by marlon barrios solano

![Screenshot 2024-02-21 at 10 49 12 PM](https://github.com/marlonbarrios/entropic_haiku/assets/90220317/e0871208-0b04-48c1-8c65-6e5c688a89f4)

Entropic Haiku is a generative, self-dissipating synthetic poem that uses GPT-4 to create Haikus in English and two other languages or codes, such as Morse code or emojis. This unique project leverages the capabilities of OpenAI's GPT-4 model, integrated into a creative p5.js environment to produce an interactive poetic experience. As users interact with the interface, the poem's entropy increases, leading to a dynamic and ephemeral artistic expression. This project is designed exclusively for desktop use, offering a duet in latent space between the user and the AI.

https://github.com/marlonbarrios/entropic_haiku/assets/90220317/45c1ba2c-4369-4af7-aa12-041fff143579

## Duet in Latent Space

Latent space refers to a conceptual and mathematical space generated by algorithms, particularly those used in machine learning and generative models. This space is characterized by the high-dimensional representation of data where similar data points are mapped closely together, and dissimilar points are further apart. In essence, latent spaces serve as the underlying structure that models use to understand and generate new data instances based on learned patterns, without being explicitly programmed with specific rules for every possible outcome.

The intention to perform actions in latent space, especially with a model, is to perform within an unknown probability space, utilizing the generative capabilities of the model to create art or perform in real-time. This process involves interacting with the model in a way that it generates outputs based on the vast, unseen dimensions of the data it has learned from, yet doing so in a manner that is unpredictable and unique to each performance. The performer, by manipulating inputs (prompts) or guiding the model's generative process, improvises with these outputs, creating an interplay between the expected and the unexpected, the known and the unknown. This act of performing in real-time within latent space becomes a dance (or a drawing) within a probability space.

## Explore More

- **Live Application:** Experience Entrpic Haiku in action [here](https://entropic-haiku.vercel.app/).
- **Marlon Barrios Solano:** For more about Marlon, his projects, and how you can support his work, visit his [Linktree](https://linktr.ee/marlonbarriososolano).

## Features

- **Dynamic Letter Animation:** Letters dynamically fall and settle on the bottom of the screen, with physics-based animations including gravity, bounce, and friction effects.
- **Interactive Control:** Users can interact with the visualization by moving their mouse to generate new letters and drag settled letters around the screen.
- **Text Generation:** Integrates with OpenAI's GPT-4 to generate text based on a wide array of prompts, showcasing the model's ability to understand and create content based on complex themes.
- **Sound Interaction:** Plays a sample sound when a specific key is pressed, adding an auditory dimension to the interaction.
- **Growing Lines:** A visual effect where lines grow towards the falling letters, starting from a random position at the top of the screen.
- **Generative Poetry with GPT-4:** Press the Spacebar to generate a new Haiku in English and in two other languages or codes. The selection of languages or codes includes, but is not limited to, Morse code, emojis, etc.
- **Interactive Entropy:** Move your mouse across the canvas to increase the entropy, creating a dynamic and ever-changing poetic landscape.

## Setup

- **Prerequisites:** Ensure you have Node.js installed on your machine to run this project.
- **Installation:** Clone the repository, then install dependencies using `npm install`.
- **Configuration:** Set your OpenAI API key in your project's environment variables as `VITE_OPENAI_KEY`.
- **Running the Project:** Start the project by running `npm run start` and open it in your web browser.

## Technologies Used

- **p5.js:** A client-side library for creative coding, used for drawing and animating the letters and lines.
- **OpenAI JavaScript SDK:** Used for integrating the OpenAI GPT-4 model to dynamically generate text based on user-defined prompts.
- **CSS:** For basic styling of the webpage.

## How to Use

- **Generating Letters:** Move your mouse across the screen to generate falling letters.
- **Interacting with Letters:** Click and drag settled letters to move them around.
- **Playing Sound:** Press the 'P' key to play or stop the sample sound.
- **Generating Text with OpenAI:** Press the spacebar to trigger a prompt to OpenAI's GPT-4 (configured in the code), and watch as the generated text animates on the screen.

## Customization

You can customize the text generation prompts, animation parameters, and sound samples by modifying the `sketch.js` file. Experiment with different settings to create a personalized experience.

## Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests with your enhancements or bug fixes. Whether you're improving the interactivity, adding new features, or fixing issues, your contributions help make Entropic Haiku a richer experience.

This README.md provides a comprehensive overview of the Entropic Haiku project, emphasizing its generative, interactive nature and the unique collaboration between human and AI in creating ephemeral poetry.


# OpenAI + P5.js template by SpatialPixel

This is just a simple template to incorporate OpenAI's Node.js SDK into a P5.js sketch.

## Requirements

This template requires a recent version of Node.js, recommended version 16 or later.

Clone the repository with git...

    git clone https://github.com/spatialpixel/openai-p5js-template.git

...or [download the code from the repository](https://github.com/spatialpixel/openai-p5js-template) as a zip file.

Then install the libraries:

    cd openai-p5js-template
    npm install

## Start the dev environment

This template uses [Vite](https://vitejs.dev/) as a local development server. Start it with the following:

    npm run dev

By default, this starts a local server at http://localhost:5173/. Just copy/paste this URL into
a browser window to view the app. This will automatically update when you save changes to your code (that is,
no manual refresh required!).

## OpenAI API Key

Remember to provide your OpenAI API key into `sketch.js`. Note that this is configured
for local development only, and this code should not be used on a production server.

## MIT License

Copyright (c) 2024 Marlon Barrios Solano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.