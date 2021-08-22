declare module 'renamer' {
  export interface RenameOptions {
    files: string[];
    find: string;
    replace: string;
    dryRun: boolean;
  }
  export default class Renamer {
    public rename(options: RenameOptions): void;
  }
}
