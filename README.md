# SamsarOne Generative Workflow Creation Suite

Easy-to-use Generative Image and Video Creation/Edit Workflows

ReactJS Canvas implementation for the studio.

You can choose between one of three workflow creators: **Studio**, **Express**, and **VidGPT**.

You must create an account and obtain credits to send model requests.

A hosted version is available [here](https://app.samsar.one).

To install:

1. Leave the API values as is.  
2. In the terminal, run:
   ```
   cp .env.example .env

   yarn install

   yarn
   ```
3. Run the client on port 3000 for Google OAuth to work.

## Studio Creator
Use the Studio Creator to create and edit movie, narrative, and music videos. You can also create and edit images.

## Add Theme
Define a theme to constrain the visual style of your story.

![Samsar.one Studio Theme creator preview](https://samsar-github.s3.us-west-2.amazonaws.com/theme.png)

## Adding Scenes
Create scenes with the "Add Scenes" button on the left toolbar. Drag to re-arrange scenes and click to change duration or remove scenes.

![Samsar.one Studio Add Scene creator preview](https://samsar-github.s3.us-west-2.amazonaws.com/scenes.png)

## Iterate with the Assistant
Use the assistant for brainstorming or refining ideas.

## Image Creating and Editing
Generate images standalone or as starting frame images for scenes.

![Samsar.one Studio Image generator preview](https://samsar-github.s3.us-west-2.amazonaws.com/image.png)

### Supported Image Models

| **Name**                    | **Key**          | **isExpressModel** |
|-----------------------------|------------------|--------------------|
| Flux-1.1 Pro               | FLUX1.1PRO       | true               |
| Google Imagen3             | IMAGEN3          | true               |
| Dall-E 3                   | DALLE3           | -                  |
| Flux-1 Pro                 | FLUX1PRO         | -                  |
| Flux 1.1 Ultra             | FLUX1.1ULTRA     | -                  |
| Flux-1 Dev                 | FLUX1DEV         | -                  |
| Recraft V3                 | RECRAFTV3        | -                  |
| Stable Diffusion V3.5      | SDV3.5           | -                  |
| Nvidia Sana                | SANA             | -                  |
| Recraft 20B                | RECRAFT20B       | -                  |
| Lumalabs Photon            | PHOTON           | -                  |
| Lumalabs Photon Flash      | PHOTONFLASH      | -                  |
| Google Imagen3 Flash       | IMAGEN3FLASH     | -                  |

---

## Video Creation
Create generative videos via text-to-image and image-to-video workflows. These base videos can be further lip-synced or aligned with sound effects.

![Samsar.one Studio Video generator preview](https://samsar-github.s3.us-west-2.amazonaws.com/video.png)

| **Name**                | **Key**              | **isExpressModel** | **isTransitionModel** |
|-------------------------|----------------------|--------------------|-----------------------|
| Runway Gen-3           | RUNWAYML             | true               | true                  |
| Kling 1.6 Pro          | KLINGIMGTOVIDPRO     | true               | -                     |
| Luma AI                | LUMA                 | -                  | -                     |
| SD Video               | SDVIDEO              | -                  | -                     |
| Hailuo Minimax O1-Live | HAILUO               | -                  | -                     |
| Haiper 2.0             | HAIPER2.0            | -                  | -                     |

---

## Subtitle/Audio/Speech Generation and Alignment
Create subtitled speech, sound effects, or backing music from the Audio tab in the right toolbar.

![Samsar.one speaker preview](https://samsar-github.s3.us-west-2.amazonaws.com/audio.png)

See [here](https://docs.samsar.one/docs/speakers) for a list of supported TTS speakers.

### Additional Features
- Add Shapes and Text
- Canvas Animations and Image Editing
- Add/Remove/Stack Layers
- Add/Remove/Re-align Audio (Music/Speech/Sound Effects) Layers
- Add Lip-Sync Video-to-Video Flow
- Add Sound-Effect Video-to-Video Flow
- Export Frame Image
- Export Session Video
- Manage Multiple Projects
- Audio/Video/Image Library to Re-use/Export Previously Generated Assets

## Express Creator
A one-shot narrative video creation pipeline.  
Edit in Studio for post-processing or to add/remove scenes.

## VidGPT
A one-shot, full-feature film creation pipeline.  
Edit in Studio for post-processing or to add/remove scenes.

### For API-Only Use-Cases
Documentation is available [here](https://docs.samsar.one).

## Supported Models

### Video Models
*(Listed above)*

### Image Edit Models

| **Name**                      | **Key**                 | **editType** |
|-------------------------------|-------------------------|-------------|
| Flux-1 Pro Fill              | FLUX1PROFILL           | inpaint     |
| Flux-1.1 Pro Ultra Redux     | FLUX1.1PROULTRAREDUX   | prompt      |
| Flux-1.1 Pro Redux           | FLUX1.1PROREDUX        | prompt      |

---

### Assistant Models

| **Model**  |
|------------|
| GPT4O      |
| GPTO1      |
| GPTO3MINI  |

---

### Inference Models

| **Model**         | 
|-------------------|
| GPT O3 Mini (H)   |
| GPT 4O            | 
| GPT O1            | 

---

### TTS Providers

| **Model**   |
|-------------|
| OPENAI      |
| PLAYAI      |
| ELEVENLABS  |

---

This list is subject to updates as more models are added (or removed).

Contributions and pull requests are welcome.

For questions or suggestions, join the [Discord](https://discord.gg/2tbhKwRy).  
Check out the [Gallery](https://www.youtube.com/@samsar_one) for inspiration, and follow on [X](https://x.com/samsar_one) or [Threads](https://www.threads.net/@samsar_one_videos) for news and updates.

---