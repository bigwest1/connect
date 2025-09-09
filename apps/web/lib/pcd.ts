export async function samplePointCloudFromGLB(url: string, stride = 80): Promise<Float32Array> {
  const [{ GLTFLoader }, THREE] = await Promise.all([
    import('three-stdlib'),
    import('three')
  ]);
  const loader = new (GLTFLoader as any)();
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf: any) => {
      const pts: number[] = [];
      const v = new (THREE as any).Vector3();
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o: any) => {
        if (o.isMesh && o.geometry) {
          const g = o.geometry as any;
          const pos = g.getAttribute('position');
          if (!pos) return;
          for (let i = 0; i < pos.count; i += stride) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            pts.push(v.x, v.z);
          }
        }
      });
      resolve(new Float32Array(pts));
    }, undefined, reject);
  });
}

