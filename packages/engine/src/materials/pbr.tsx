import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { KTX2Loader } from "three-stdlib";
import { useQuality } from "../quality/context";

export type Tier = "Ultra" | "High" | "Balanced" | "Battery";

type StreamTexOpts = {
  wrap?: THREE.Wrapping;
  repeat?: [number, number];
  colorSpace?: THREE.ColorSpace;
  anisotropy?: number;
  generateMipmaps?: boolean;
  minFilter?: THREE.TextureFilter;
  magFilter?: THREE.MagnificationTextureFilter;
};

function applyTexSettings(tex: THREE.Texture, opts: StreamTexOpts) {
  if (!tex) return tex;
  if (opts.wrap) { tex.wrapS = tex.wrapT = opts.wrap; }
  if (opts.repeat) { tex.repeat.set(opts.repeat[0], opts.repeat[1]); tex.needsUpdate = true; }
  if (opts.colorSpace) tex.colorSpace = opts.colorSpace;
  if (typeof opts.anisotropy === 'number') tex.anisotropy = opts.anisotropy;
  if (typeof opts.generateMipmaps === 'boolean') tex.generateMipmaps = opts.generateMipmaps;
  if (opts.minFilter) tex.minFilter = opts.minFilter;
  if (opts.magFilter) tex.magFilter = opts.magFilter;
  return tex;
}

function makeSolidTexture(color: string) {
  const c = new THREE.Color(color);
  const data = new Uint8Array([c.r * 255, c.g * 255, c.b * 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.needsUpdate = true;
  return tex as unknown as THREE.Texture;
}

function useStreamedTexture(lowUrl: string | null, highUrl: string | null, opts: StreamTexOpts) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const loaderRef = useRef(new THREE.TextureLoader());
  const { gl } = useThree();
  const quality = (() => { try { return useQuality(); } catch { return null; } })();
  const forceKtx2 = quality?.forceKTX2 ?? false;
  const ktx2Ref = useRef<KTX2Loader | null>(null);
  // lazily init KTX2 loader
  useEffect(() => {
    if (!gl || ktx2Ref.current) return;
    try {
      const l = new KTX2Loader();
      // Expected to host basis transcoder files under /basis/
      l.setTranscoderPath('/basis/');
      l.detectSupport(gl);
      ktx2Ref.current = l;
    } catch {
      ktx2Ref.current = null;
    }
  }, [gl]);
  useEffect(() => {
    let cancelled = false;
    const loader = loaderRef.current;
    const onLow = (t: THREE.Texture) => { if (!cancelled) setTex(applyTexSettings(t, opts)); };
    const onHigh = (t: THREE.Texture) => { if (!cancelled) setTex(applyTexSettings(t, opts)); };
    const ktx2 = ktx2Ref.current;
    const tryLoad = (url: string, success: (t: THREE.Texture)=>void, fallback?: () => void) => {
      if (!url) { fallback?.(); return; }
      const isKTX2 = url.endsWith('.ktx2');
      if (isKTX2 && ktx2) {
        ktx2.load(url, success, undefined, () => fallback?.());
      } else {
        loader.load(url, success, undefined, () => fallback?.());
      }
    };
    // prefer KTX2 then fallback to JPG/solid; optionally force KTX2 only
    if (lowUrl) {
      const ktxLow = lowUrl.replace(/\.jpg$/i, '.ktx2');
      if (forceKtx2) {
        tryLoad(ktxLow, onLow, () => onLow(applyTexSettings(makeSolidTexture('#777'), opts)));
      } else {
        tryLoad(ktxLow, onLow, () => tryLoad(lowUrl, onLow, () => onLow(applyTexSettings(makeSolidTexture('#777'), opts))));
      }
    }
    if (highUrl) {
      const ktxHigh = highUrl.replace(/\.jpg$/i, '.ktx2');
      if (forceKtx2) {
        tryLoad(ktxHigh, onHigh, () => {});
      } else {
        tryLoad(ktxHigh, onHigh, () => tryLoad(highUrl, onHigh));
      }
    }
    return () => { cancelled = true; };
  }, [lowUrl, highUrl, opts.wrap, opts.repeat?.[0], opts.repeat?.[1], opts.colorSpace, opts.anisotropy, opts.generateMipmaps, opts.minFilter, opts.magFilter, gl, forceKtx2]);
  return tex;
}

export function tierTextureSettings(tier: Tier) {
  if (tier === "Ultra") return { anisotropy: 16, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter } as const;
  if (tier === "High") return { anisotropy: 8, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter } as const;
  if (tier === "Balanced") return { anisotropy: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter } as const;
  return { anisotropy: 1, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } as const;
}

export function usePBRMaterials(tier: Tier) {
  const quality = (() => { try { return useQuality(); } catch { return null; } })();
  const texBase = "/textures"; // public root; place your 2k and 512 assets here
  const base = tierTextureSettings(tier);
  const settings = {
    ...base,
    anisotropy: quality?.settings.textures.anisotropy ?? base.anisotropy,
    generateMipmaps: quality?.settings.textures.generateMipmaps ?? base.generateMipmaps,
    minFilter: (quality?.settings.textures.minFilter === 'trilinear' ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter),
  } as const;
  const wrap = THREE.RepeatWrapping;

  function maps(name: string, repeat: [number, number], colorish: boolean) {
    const base512 = `${texBase}/${name}/basecolor_512.jpg`;
    const base2k = `${texBase}/${name}/basecolor_2k.jpg`;
    const normal512 = `${texBase}/${name}/normal_512.jpg`;
    const normal2k = `${texBase}/${name}/normal_2k.jpg`;
    const rough512 = `${texBase}/${name}/roughness_512.jpg`;
    const rough2k = `${texBase}/${name}/roughness_2k.jpg`;
    const ao512 = `${texBase}/${name}/ao_512.jpg`;
    const ao2k = `${texBase}/${name}/ao_2k.jpg`;

    const colorMap = useStreamedTexture(base512, base2k, { ...settings, wrap, repeat, colorSpace: THREE.SRGBColorSpace });
    const normalMap = useStreamedTexture(normal512, normal2k, { ...settings, wrap, repeat, colorSpace: THREE.LinearSRGBColorSpace });
    const roughnessMap = useStreamedTexture(rough512, rough2k, { ...settings, wrap, repeat, colorSpace: THREE.LinearSRGBColorSpace });
    const aoMap = useStreamedTexture(ao512, ao2k, { ...settings, wrap, repeat, colorSpace: THREE.LinearSRGBColorSpace });

    return { colorMap, normalMap, roughnessMap, aoMap };
  }

  const siding = maps("siding", [2, 2], true);
  const brick = maps("brick", [2, 1], true);
  const asphalt = maps("asphalt", [4, 2], false);
  const concrete = maps("concrete", [1, 1], false);
  const metal = maps("metal", [1, 1], false);
  const wood = maps("wood", [1, 1], true);

  // If normal maps are missing, synthesize a micro normal to avoid flat look.
  function ensureMicroNormal(mat: THREE.MeshStandardMaterial) {
    if (!mat.normalMap) {
      const size = 64;
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const nx = Math.floor(128 + 20 * Math.sin((x + y) * 0.3));
          const ny = Math.floor(128 + 20 * Math.cos((x - y) * 0.3));
          data[i] = nx; data[i+1] = ny; data[i+2] = 255; data[i+3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      tex.needsUpdate = true;
      mat.normalMap = tex as any;
      mat.needsUpdate = true;
    }
  }

  // Materials memoized to avoid re-instantiation every frame
  const sidingMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.05, roughness: 0.65 }), []);
  const brickMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.8 }), []);
  const asphaltMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.95 }), []);
  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.9 }), []);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.25, color: '#b8bcc0' }), []);
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.6 }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ transmission: 0.9, thickness: 0.01, roughness: 0.05, metalness: 0.0, reflectivity: 0.5, ior: 1.45, color: '#ffffff' }), []);

  // Assign maps when ready
  useEffect(() => {
    if (sidingMat) { sidingMat.map = siding.colorMap ?? sidingMat.map; sidingMat.normalMap = siding.normalMap ?? sidingMat.normalMap; sidingMat.roughnessMap = siding.roughnessMap ?? sidingMat.roughnessMap; sidingMat.aoMap = siding.aoMap ?? sidingMat.aoMap; ensureMicroNormal(sidingMat); sidingMat.needsUpdate = true; }
  }, [siding.colorMap, siding.normalMap, siding.roughnessMap, siding.aoMap, sidingMat]);
  useEffect(() => {
    if (brickMat) { brickMat.map = brick.colorMap ?? brickMat.map; brickMat.normalMap = brick.normalMap ?? brickMat.normalMap; brickMat.roughnessMap = brick.roughnessMap ?? brickMat.roughnessMap; brickMat.aoMap = brick.aoMap ?? brickMat.aoMap; ensureMicroNormal(brickMat); brickMat.needsUpdate = true; }
  }, [brick.colorMap, brick.normalMap, brick.roughnessMap, brick.aoMap, brickMat]);
  useEffect(() => {
    if (asphaltMat) { asphaltMat.map = asphalt.colorMap ?? asphaltMat.map; asphaltMat.normalMap = asphalt.normalMap ?? asphaltMat.normalMap; asphaltMat.roughnessMap = asphalt.roughnessMap ?? asphaltMat.roughnessMap; asphaltMat.aoMap = asphalt.aoMap ?? asphaltMat.aoMap; ensureMicroNormal(asphaltMat); asphaltMat.needsUpdate = true; }
  }, [asphalt.colorMap, asphalt.normalMap, asphalt.roughnessMap, asphalt.aoMap, asphaltMat]);
  useEffect(() => {
    if (concreteMat) { concreteMat.map = concrete.colorMap ?? concreteMat.map; concreteMat.normalMap = concrete.normalMap ?? concreteMat.normalMap; concreteMat.roughnessMap = concrete.roughnessMap ?? concreteMat.roughnessMap; concreteMat.aoMap = concrete.aoMap ?? concreteMat.aoMap; ensureMicroNormal(concreteMat); concreteMat.needsUpdate = true; }
  }, [concrete.colorMap, concrete.normalMap, concrete.roughnessMap, concrete.aoMap, concreteMat]);
  useEffect(() => {
    if (metalMat) { metalMat.map = metal.colorMap ?? metalMat.map; metalMat.normalMap = metal.normalMap ?? metalMat.normalMap; metalMat.roughnessMap = metal.roughnessMap ?? metalMat.roughnessMap; metalMat.aoMap = metal.aoMap ?? metalMat.aoMap; ensureMicroNormal(metalMat); metalMat.needsUpdate = true; }
  }, [metal.colorMap, metal.normalMap, metal.roughnessMap, metal.aoMap, metalMat]);
  useEffect(() => {
    if (woodMat) { woodMat.map = wood.colorMap ?? woodMat.map; woodMat.normalMap = wood.normalMap ?? woodMat.normalMap; woodMat.roughnessMap = wood.roughnessMap ?? woodMat.roughnessMap; woodMat.aoMap = wood.aoMap ?? woodMat.aoMap; ensureMicroNormal(woodMat); woodMat.needsUpdate = true; }
  }, [wood.colorMap, wood.normalMap, wood.roughnessMap, wood.aoMap, woodMat]);

  return {
    siding: sidingMat,
    brick: brickMat,
    asphalt: asphaltMat,
    concrete: concreteMat,
    glass: glassMat,
    metal: metalMat,
    wood: woodMat,
  } as const;
}
