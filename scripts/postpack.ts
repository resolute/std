// `deno pack` generates the tarball’s package.json from deno.json but drops
// metadata fields such as `repository`. npm provenance verification rejects a
// publish when package.json’s `repository.url` does not match the repository
// asserted in the provenance statement, so patch the generated package.json
// inside the tarball with the metadata from deno.json.

const denoJson = JSON.parse(await Deno.readTextFile('deno.json')) as {
  description?: string;
  repository?: { type: string; url: string };
};

if (!denoJson.repository) {
  throw new Error('deno.json is missing the "repository" field required for npm provenance.');
}

const tarballs: string[] = [];
for await (const entry of Deno.readDir('.')) {
  if (entry.isFile && entry.name.endsWith('.tgz')) {
    tarballs.push(entry.name);
  }
}

if (tarballs.length !== 1) {
  throw new Error(`Expected exactly one .tgz tarball, found ${tarballs.length}.`);
}

const [tarball] = tarballs;
const workDir = await Deno.makeTempDir({ dir: '.', prefix: '.postpack-' });

try {
  await run('tar', '-xzf', tarball, '-C', workDir);

  const packageJsonPath = `${workDir}/package/package.json`;
  const packageJson = JSON.parse(await Deno.readTextFile(packageJsonPath)) as Record<
    string,
    unknown
  >;
  packageJson.description ??= denoJson.description;
  packageJson.repository = denoJson.repository;
  await Deno.writeTextFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  await run('tar', '-czf', tarball, '-C', workDir, 'package');
  console.log(`✓ ${tarball} patched with repository metadata`);
} finally {
  await Deno.remove(workDir, { recursive: true });
}

async function run(command: string, ...args: string[]): Promise<void> {
  const { code, stderr } = await new Deno.Command(command, { args }).output();
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${new TextDecoder().decode(stderr)}`);
  }
}
