# UAE railway — Emirati traveller on the platform

One Emirati man standing beside a modern intercity passenger train at a
contemporary UAE station. The reference image for a premium national
infrastructure campaign: **UAE + railway + people + future infrastructure**,
photographed, not rendered.

The wording that produces it lives in [`scene.json`](scene.json) — that file is
the source of truth. This one explains the direction, how to drive each
generator, and what to reject.

```bash
node scripts/render-scene.mjs uae-railway --dry-run          # print the prompt
node scripts/render-scene.mjs uae-railway --count 4          # render via Workers AI
node scripts/render-scene.mjs uae-railway --framing wide     # hero | wide | low
```

## The line that decides the image

Every choice below serves one rule: **this is a photograph of a real man, not a
character.** Models drift toward a game hero the moment the prompt sounds like
a 3D brief, so the prompt never says render, character, model, or artstation.
It says photograph, lens, aperture, film grain, skin pores, fabric weight. The
negative list then spends most of its weight pushing back on exactly the
failure the request names: CGI, plastic skin, videogame character, exaggerated
muscles, sci-fi train, neon.

| Element | Direction | Why |
| --- | --- | --- |
| The man | Mid-thirties, natural build, calm unforced expression, looking slightly off camera | A held gaze and a smile read as stock photography; off-camera reads as documentary |
| Dress | Pristine white kandura, soft white ghutra, level black agal | Emirati, not pan-Gulf: white ghutra, never the red-and-white pattern, never a turban |
| Posture | Relaxed, one hand at his side, weight settled | Confident without the catalogue stance |
| Position | Left third, several metres clear of the train | He must not block the train — the train is half the message |
| Train | Brushed aluminium and white, slim accent stripe, tapered nose, real seams, bogies, pantograph | Named engineering keeps it a railway vehicle instead of a spaceship |
| Station | White steel-and-glass canopy, mashrabiya-inspired perforated screens, polished stone, tactile platform edge | The UAE reference is architectural and subtle, not decorative pastiche |
| Light | Late-afternoon sun raking through the canopy, cool blue fill, soft volumetric shafts, light haze | Warm key against cool shadow is the whole palette |
| Sky | Real cumulus through the open end of the station | Gives the haze something to come from |
| Camera | 50mm at f/2.8, ISO 100, subject sharp head to feet | Subtle depth of field; a blown-out background loses the station |
| Grade | Restrained blue-neutral, warm highlights, fine natural grain | Government campaign, not a car advert |

### Framings

- **hero** *(default)* — three-quarter body, chest height, 50mm. The campaign frame.
- **wide** — full body, 35mm, canopy and train length in shot, the man small against the architecture. The scale frame.
- **low** — full body, slightly below eye height, 40mm, platform edge leading to the nose of the train. The most cinematic, the least usable for headlines.

Render 4–8 of one framing and choose; do not chase a single seed.

## Driving each generator

`--dry-run` prints the prompt for any of these. Aspect ratio is 21:9 for the
cinematic crop, 16:9 if the image has to carry a headline.

**Midjourney v7** — append the flags; `--style raw` is what stops the glossy
house look, and the `--no` list is the negative prompt shortened to what
Midjourney actually weights.

```
<prompt> --ar 21:9 --style raw --stylize 150 --no cartoon, 3d render, cgi, videogame character, plastic skin, neon, cyberpunk, sci-fi, text, watermark, crowd
```

**Flux 1.1 Pro / Flux dev** — paste the paragraph unchanged; Flux reads prose
and ignores keyword stacking. Guidance 2.5–3.5, 28–40 steps. It takes no
negative prompt, which is why the prompt itself states the positives
("real human skin with visible pores", "built like real engineering").

**SDXL / SD 3.5** — prompt plus the full negative prompt, 20–30 steps,
guidance 6–7, 1280×704. Refiner on if available.

**Nano Banana, GPT-image, Firefly** — give the paragraph as an instruction and
add one sentence: *"Photographic, not illustrated or 3D-rendered; a real person
photographed on location."* Firefly for anything commercially sensitive, since
its training is rights-cleared.

**Workers AI** — `scripts/render-scene.mjs`, model ids and per-model parameters
in `scene.json`. Fast and cheap for blocking out the composition; the frame you
ship should come from Flux Pro or Midjourney.

## Review each render against this

Reject on any one of these. Most are cheap to spot at thumbnail size.

- [ ] **One person.** No second figure, no crowd behind the train.
- [ ] **Headwear correct.** Ghutra draped and white; agal sitting level, a closed black double cord — not a turban, not a headband, not patterned.
- [ ] **Kandura correct.** Full length, long sleeves, no belt, no sash, no embroidery beyond the collar placket, no fantasy robe.
- [ ] **Hands.** Both visible hands have five fingers and plausible joints. The most common failure and the least fixable.
- [ ] **Face.** Symmetrical eyes, real skin texture, no waxy sheen, no airbrushed plastic. Zoom to 100% before approving.
- [ ] **The train reads as a train.** Wheels on rails, bogies under the body, doors with seals, windows in a row, a nose — not a pod, not a capsule, not glowing.
- [ ] **He is clear of the train.** The nose and at least one carriage readable, not obscured by him.
- [ ] **Geometry holds.** Rails converge to one vanishing point, canopy columns are vertical, the platform edge is straight.
- [ ] **No text.** Any signage is out of focus or blank. Generated Arabic is always garbled and always a liability — recompose rather than fix it.
- [ ] **Light is consistent.** One sun direction; his shadow agrees with the train's.
- [ ] **Palette held.** Blue-neutral with warm highlights. No neon, no teal-and-orange crush, no blown highlights on the kandura.

## When it goes wrong

| What you get | Fix |
| --- | --- |
| Game-character face, plastic skin | Lower guidance/stylize; add "candid documentary photograph, natural skin texture, unretouched"; drop any word resembling "render" |
| Train looks like a spaceship | Name the parts: bogies, pantograph, coupler, door seals, panel seams, steel rails. Concrete mechanics beat "not futuristic" |
| Man too small or lost | Switch to `hero`; state "he fills the left third of the frame, head near the upper third line" |
| Man blocks the train | State the gap in metres and which way the train points |
| Garbled Arabic on signage | Add "signage blank and out of focus"; if it persists, crop it out |
| Flat, even light | Ask for "raking late-afternoon sun through the canopy, deep cool shadows, one strong key" |
| Too clean, no atmosphere | Add "fine atmospheric haze, dust in the light shafts, soft falloff into the distance" |
| Empty, lifeless station | Keep it empty — that is the direction. Add a distant blurred figure only if it must read as in service |

## Before it is used anywhere

The image is synthetic. It depicts no real person, no real station, and no
operator's actual rolling stock, and nothing here suggests otherwise.

- Do not present it as a photograph of an existing service, station, or train.
- Do not add a real operator's name, livery, or logo to it.
- Label it a visualisation wherever it appears in anything public.
- Check the generator's licence before commercial use, and prefer a
  rights-cleared model for campaign work.
