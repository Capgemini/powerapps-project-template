import { lstatSync, readdirSync } from 'fs';
import { GlobSync } from 'glob';
import { join } from 'path';

export default class PackageReader {
  private readonly destinationPath: string;

  constructor(destinationPath: string) {
    this.destinationPath = destinationPath;
  }

  public static getClient(): string {
    const solutionFile = new GlobSync('*.sln').found[0];
    return solutionFile.split('.')[0];
  }

  public getSolutions(): string[] {
    const solutionsPath = join(this.destinationPath, 'src', 'solutions');

    return readdirSync(solutionsPath)
      .filter((path) => PackageReader.isDirectoryPath(join(solutionsPath, path)));
  }

  private static isDirectoryPath(path: string): boolean {
    return lstatSync(path).isDirectory();
  }
}
