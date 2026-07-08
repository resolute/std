const paths = ['coverage', 'dist'];
const generatedExtensions = new Set(['.cjs', '.d.ts', '.js', '.js.map', '.mjs']);

for (const path of paths) {
  await remove(path);
}

for await (const entry of Deno.readDir('.')) {
  if (entry.isFile && (entry.name.endsWith('.tgz') || hasGeneratedExtension(entry.name))) {
    await remove(entry.name);
  }
}

for await (const entry of Deno.readDir('dom')) {
  if (entry.isFile && hasGeneratedExtension(entry.name)) {
    await remove(`dom/${entry.name}`);
  }
}

async function remove(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
}

function hasGeneratedExtension(path: string): boolean {
  for (const extension of generatedExtensions) {
    if (path.endsWith(extension)) {
      return true;
    }
  }
  return false;
}
