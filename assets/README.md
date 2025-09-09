Place binary assets here:

- example.gif — animated UI reference (used in Storybook notes).
- measurements.pdf — HOVER report; if unavailable, include page images (measurements_Page_01.png … measurements_Page_31.png).
- mock-scan.glb — simple placeholder mesh for the scanning wizard.

During dev, the web app loads these from `/assets/*`.

PBR textures
- Put PBR sets under `apps/web/public/textures/<name>/` with files:
  - `basecolor_512.jpg`, `basecolor_2k.jpg`
  - `normal_512.jpg`, `normal_2k.jpg`
  - `roughness_512.jpg`, `roughness_2k.jpg`
  - `ao_512.jpg`, `ao_2k.jpg`
- Optional KTX2: include `.ktx2` variants (same filenames, `.ktx2` extension). The engine will prefer KTX2 and fall back to JPG.

KTX2 transcoder
- To enable KTX2 on web, place Basis transcoder files under `apps/web/public/basis/`:
  - `basis_transcoder.js`, `basis_transcoder.wasm`
  - `zstddec.js`, `zstddec.wasm` (if using ZSTD)
The engine auto-detects support and falls back if unavailable.
