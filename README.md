# Creative Suite for Generative Image and Video Synthesis Workflows

![React](https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61dafb)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![KonvaJS](https://img.shields.io/badge/KonvaJS-FF6F00?style=for-the-badge&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38b2ac?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)


You can choose between one of three workflow creators: **Studio**, **Express**, and **VidGPT**.

You can create an account and sign up for a paid plan/free trial to send model requests.

A hosted version is available [here](https://app.samsar.one).

## Installation

1. Leave the API values as is.  
2. Run the following in the terminal:

   ```sh
   cp .env.example .env

   yarn install

   yarn start
   ```

3. Run the client on port 3000 for Google OAuth to work.


---

### We have recently migrated from CRA to Vite. Please reset and update your local-source code if you haven't already.

## Studio Creator

Use the **Studio Creator** to create and edit movies, narratives, and music videos. You can also create and edit images.

### Add Theme

Define a theme to constrain the visual style of your story.

![Studio Theme Creator](https://samsar-github.s3.us-west-2.amazonaws.com/theme.png)

### Adding Scenes

Create scenes using the "Add Scenes" button on the left toolbar. Drag to rearrange scenes and click to change duration or remove scenes.

![Studio Add Scene](https://samsar-github.s3.us-west-2.amazonaws.com/scenes.png)

### Iterate with the Assistant

Use the assistant for brainstorming or refining ideas.

### Image Creation & Editing

Generate images standalone or as starting frame images for scenes.

![Image Generator](https://samsar-github.s3.us-west-2.amazonaws.com/image.png)

#### Supported Image Models

| **Name**                 | **Key**         | **isExpressModel** |
|--------------------------|----------------|--------------------|
| Flux-1.1 Pro            | FLUX1.1PRO      | true               |
| Google Imagen3          | IMAGEN3         | true               |
| Dall-E 3                | DALLE3          | -                  |
| Dall-E 3 HD             | DALLE3HD        | -                  |
| Flux-1 Pro              | FLUX1PRO        | -                  |
| Flux 1.1 Ultra          | FLUX1.1ULTRA    | -                  |
| Flux-1 Dev              | FLUX1DEV        | -                  |
| Recraft V3              | RECRAFTV3       | -                  |
| Stable Diffusion V3.5   | SDV3.5          | -                  |
| Nvidia Sana             | SANA            | -                  |
| Recraft 20B             | RECRAFT20B      | -                  |
| Lumalabs Photon         | PHOTON          | -                  |
| Lumalabs Photon Flash   | PHOTONFLASH     | -                  |
| Google Imagen3 Flash    | IMAGEN3FLASH    | -                  |

---

## Video Creation

Create generative videos via text-to-video or image-to-video workflows. These base videos can be further lip-synced or aligned with sound effects.

![Video Generator](https://samsar-github.s3.us-west-2.amazonaws.com/video.png)

| **Name**                 | **Key**                  | **isExpressModel** | **isTransitionModel** |
|--------------------------|--------------------------|--------------------|-----------------------|
| Runway Gen-3             | RUNWAYML                 | true               | true                  |
| Kling 1.6 Pro (Img2Vid)  | KLINGIMGTOVIDPRO         | true               | -                     |
| Luma Ray2                | LUMA                     | true               | true                  |
| SD Video                 | SDVIDEO                  | -                  | -                     |
| Hailuo Minimax O1-Live   | HAILUO                   | -                  | -                     |
| Haiper 2.0               | HAIPER2.0                | -                  | -                     |

---

## Subtitle/Audio/Speech Generation & Alignment

Create subtitled speech, sound effects, or background music from the **Audio** tab.

![Audio Generator](https://samsar-github.s3.us-west-2.amazonaws.com/audio.png)

More details: [TTS Speakers](https://docs.samsar.one/docs/speakers).

### Additional Features

- Add Shapes and Text  
- Canvas Animations and Image Editing  
- Add/Remove/Stack Layers  
- Add/Re-align Audio Layers (Music, Speech, Sound Effects)  
- Add Lip-Sync Video-to-Video Flow  
- Add Sound-Effect Video-to-Video Flow  
- Export Frame Images  
- Export Session Videos  
- Manage Multiple Projects  
- Asset Library for Audio/Video/Image Reuse  

---

## Express Creator

A one-shot narrative video creation pipeline.  
Edit in **Studio** for post-processing or to add/remove scenes.

## VidGPT

A one-shot, full-feature film creation pipeline.  
Edit in **Studio** for post-processing or to add/remove scenes.

### API Documentation

[Available here](https://docs.samsar.one).

---

## Model Pricing

### Image Model Prices

| **Model**     | **1:1** | **16:9** | **9:16** |
|---------------|--------:|--------:|--------:|
| DALLE3        | 10      | 15      | 15      |
| DALLE3HD      | 15      | 18      | 18      |
| FLUX1PRO      | 10      | 15      | 15      |
| FLUX1.1PRO    | 10      | 15      | 15      |
| FLUX1DEV      | 5       | 10      | 10      |
| FLUX1.1ULTRA  | 12      | 16      | 16      |
| RECRAFTV3     | 10      | 15      | 15      |
| SDV3.5        | 10      | 15      | 15      |
| SANA          | 5       | 5       | 5       |
| PHOTON        | 10      | 15      | 15      |
| PHOTONFLASH   | 5       | 5       | 5       |
| RECRAFT20B    | 5       | 5       | 5       |
| IMAGEN3       | 5       | 5       | 5       |
| IMAGEN3FLASH  | 3       | 3       | 3       |

### Video Model Prices

| **Model**               | **1:1** | **16:9** | **9:16** | **Units** |
|-------------------------|-------:|--------:|--------:|:---------:|
| LUMA                    | -       | 60      | 60      | 5, 9      |
| SKYREELSI2V            | -       | 60      | 60      | -         |
| KLINGTXTTOVIDSTANDARD   | 60      | 60      | 60      | -         |
| KLINGIMGTOVIDSTANDARD   | 60      | 60      | 60      | -         |
| KLINGTXTTOVIDPRO        | 60      | 60      | 60      | -         |
| KLINGIMGTOVIDPRO        | 60      | 60      | 60      | 5, 10     |
| RUNWAYML                | -       | 60      | 60      | 5, 10     |
| HAIPER2.0               | 30      | 30      | 30      | 4, 8      |
| VEO                     | -       | 200     | 200     | 5, 8      |
| VEOI2V                  | -       | 300     | 300     | 5, 8      |
| SDVIDEO                 | 15      | 15      | 15      | -         |
| PIXVERSEI2V             | 60      | 60      | 60      | 5, 8      |
| HAILUO                  | -       | 60      | -       | -         |
| SYNCLIPSYNC             | 10      | 10      | 10      | -         |
| LATENTSYNC              | 10      | 10      | 10      | -         |
| MMAUDIOV2               | 10      | 10      | 10      | 5, 10     |
| WANI2V                  | -       | 60      | -       | -         |
| PIKA2.2I2V              | -       | 40      | 40      | -         |

### Assistant Model Prices

| **Model**  | **Operation Type** | **Tokens** | **Price** |
|------------|--------------------|-----------:|----------:|
| GPT4O      | words             | 1000       | 1         |
| GPTO1      | words             | 1000       | 6         |
| GPT4.5O    | words             | 1000       | 6         |
| GPTO3MIni  | words             | 1000       | 2         |

### Speech Model Prices

| **Key** | **Operation Type** | **Tokens** | **Price** |
|---------|--------------------|-----------:|----------:|
| TTS     | words             | 1000       | 1         |
| TTSHD   | words             | 400        | 1         |

### Music Model Prices

| **Key**      | **Operation Type** | **Price** |
|--------------|--------------------|----------:|
| AUDIOCRAFT   | generate_song      | 2         |

---

## Community & Support

- **[Join Discord](https://discord.gg/2tbhKwRy)**
- **[View the Gallery](https://www.youtube.com/@samsar_one)**
- **Follow on [X](https://x.com/samsar_one) or [Threads](https://www.threads.net/@samsar_one_videos)**

**Contributions and pull requests are welcome!**

