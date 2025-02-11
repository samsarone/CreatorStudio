# SamsarOne Generative Workflow Creation Suite

This is the client code for SamsarOne generative suite.

It is built primarily using ReactJS over CanvasJS.

You can choose between one of four workflows.

You will need to create an account and get credits to send model requests.

Hosted version is available [here](https://app.samsar.one).

To install

Leave the API values as is.

Then in the terminal - 

```
cp .env.example .env

yarn install

yarn
```

You should run the client on port 3000 for Google oAuth to work.

## Studio Creator
Can be used to create and edit movie, narrative, and music videos.

![Studio Screenshot](https://samsar-resources.s3.us-west-2.amazonaws.com/landing/Screenshot+2025-02-11+at+11.02.07%E2%80%AFAM.png)


Supported Features- 
1. Image Creating and Editing
2. Video Creation via Text to video and Img To Video  
3. Subtitle generation and alignment.
4. Audio Generation and alignment.
5. Speech Generation and alignment.
6. Add Shapes and Text.
7. Canvas Animations and image editing capability.
6. Add/Remove/Stack layers. 
7. Add/Remove/Re-align Audio (Music/Speech/Sound Effect) Layers.
8. Add lip-sync video-to-video flow.
9. Add sound-effect video-to-video flow.
10. Export Frame Image.
11. Export Session Video.
12. Manage Multiple Projects.
13. Audio/Video/Image library to re-use/export previously generated audio/images and scenes.


## Express Creator
One-shot Narrative video creation pipeline.
Edit in Studio for post-processing or to add/remove scenes.

## VidGPT
One-shot full-feature film creation pipeline.
Edit in Studio for post-processing or to Add/Remove scenes.

### For API only Use-Cases docs are available [here](https://docs.samsar.one).


## Supported Models

### Image Models

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

(**Note**: `-` indicates the property is not specified or `false`.)

---

### Video Models

| **Name**                | **Key**              | **isExpressModel** | **isTransitionModel** |
|-------------------------|----------------------|--------------------|-----------------------|
| Runway Gen-3           | RUNWAYML             | true               | true                  |
| Kling 1.6 Pro          | KLINGIMGTOVIDPRO     | true               | -                     |
| Luma AI                | LUMA                 | -                  | -                     |
| SD Video               | SDVIDEO              | -                  | -                     |
| Hailuo Minimax O1-Live | HAILUO               | -                  | -                     |
| Haiper 2.0             | HAIPER2.0            | -                  | -                     |

---

### Image Edit Models

| **Name**                      | **Key**                 | **editType** |
|-------------------------------|-------------------------|-------------|
| Flux-1 Pro Fill              | FLUX1PROFILL           | inpaint     |
| Flux-1.1 Pro Ultra Redux     | FLUX1.1PROULTRAREDUX   | prompt      |
| Flux-1.1 Pro Redux           | FLUX1.1PROREDUX        | prompt      |

---

### Assistant Models

| **Model**     |
|---------------|
| GPT4O         |
| GPTO1         |
| GPTO3MINI     |

---

### Inference Models

| **Model**           | 
|---------------------|
| GPT O3 Mini (H)     |
| GPT 4O              | 
| GPT O1              | 

---

### TTS Providers

| **Model**   |
|-------------|
| OPENAI      |
| PLAYAI      |
| ELEVENLABS  |

---
This list will be updated as more models are added, some removed etc.

Contrinutions and pull requests are welcome.

Questions, Suggestions. Join the [Discord](https://discord.gg/2tbhKwRy).

Check out the [Gallery](https://www.youtube.com/@samsar_one) for inspiration.

[X](https://x.com/samsar_one) and [Threads](https://www.threads.net/@samsar_one_videos) for news and updates.

