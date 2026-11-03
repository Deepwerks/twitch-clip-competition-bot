import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

dotenv.config({ path: '.env', quiet: true });

export const booleanFromEnv = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true' || val === '1') return true;
    if (val.toLowerCase() === 'false' || val === '0') return false;
  }
  return val;
}, z.boolean());

export function getBotVersion(): string | null {
  try {
    const packageJsonPath = findPackageJsonRoot(__dirname);
    if (!packageJsonPath) {
      console.error('Could not find package.json in any parent directory.');
      return null;
    }

    const rawData = fs.readFileSync(packageJsonPath, 'utf-8');
    const json = JSON.parse(rawData);
    return json.version || null;
  } catch (error) {
    console.error('Error reading version from package.json:', error);
    return null;
  }
}

function findPackageJsonRoot(startDir: string): string | null {
  let dir = startDir;

  while (dir !== path.parse(dir).root) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  return null;
}
