export async function saveBase64(name: string, base64: string, mime?: string): Promise<{ uri: string }> {
  try {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
    const fs: any = g?.Capacitor?.Plugins?.Filesystem || g?.Capacitor?.Filesystem;
    if (fs && typeof fs.writeFile === 'function') {
      const res = await fs.writeFile({ path: name, data: base64, directory: 'CACHE' });
      return { uri: (res as any).uri || '' };
    }
    return { uri: '' };
  } catch {
    return { uri: '' };
  }
}
