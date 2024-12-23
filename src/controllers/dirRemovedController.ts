import { checkStructure } from "../utils/checkStructure";

export default async function dirRemovedController(path: string) {
  console.log(`[dir-removed-controller] dir removed: ${path}`);

  const structure = checkStructure(path);

  if (!structure) {
    console.log(
      `[dir-controller] structure in ${path} isnt valid. skipping...`
    );
    return;
  }

  console.log(`[dir-removed-controller] structure:`, structure);
}
