import inquirer from 'inquirer';
import Renamer from 'renamer';
import { Builder, parseString } from 'xml2js';
import Generator from 'yeoman-generator';
import PackageReader from '../../common/PackageReader';

class Main extends Generator {
  private readonly packageReader: PackageReader;

  private answers!: inquirer.Answers;

  constructor(args: string | string[], opts: {}) {
    super(args, opts);

    this.packageReader = new PackageReader(this.destinationPath());
  }

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        choices: () => this.packageReader.getSolutions(),
        message: 'Name of the solution?',
        name: 'sourceSolution',
        store: true,
        type: 'list',
      },
      {
        default: false,
        message: 'Import data before solution?',
        name: 'importBeforeSolution',
        type: 'confirm',
      },
    ]);
    const folderComponents = this.answers.sourceSolution.split('_');
    [this.answers.prefix] = folderComponents;
    this.answers.solution = folderComponents[2] ?? folderComponents[1] ?? folderComponents[0];
  }

  public writing(): void {
    this.writeSource();
    this.updateImportConfig();
  }

  public install() {
    this.renameFileAndFolders('{{Solution}}', this.answers.solution);
  }

  private writeSource = () => {
    this.log('Writing data configuration files from template...');
    this.fs.copyTpl(
      this.templatePath('source'),
      this.destinationPath('src', 'solutions', this.answers.sourceSolution),
      this.answers,
      {},
      { globOptions: { dot: true } },
    );
  };

  private updateImportConfig = async () => {
    this.log('Updating import config to include new solution.');

    const importConfigPath = this.destinationPath(
      'deploy',
      'PkgFolder',
      'ImportConfig.xml',
    );
    parseString(
      this.fs.read(importConfigPath),
      {
        trim: true, includeWhiteChars: false, renderOpts: { pretty: true }, emptyTag: {},
      },
      (err, res) => {
        if (err) {
          throw err;
        }

        [res.configdatastorage.templateconfig] = (res.configdatastorage.templateconfig ?? [{}]);
        // eslint-disable-next-line max-len
        [res.configdatastorage.templateconfig.dataimports] = (res.configdatastorage.templateconfig.dataimports ?? [{}]);
        // eslint-disable-next-line max-len
        [res.configdatastorage.templateconfig.dataimports.dataimport] = res.configdatastorage.templateconfig.dataimports.dataimport ?? [];

        const dataImports = res.configdatastorage.templateconfig.dataimports.dataimport;
        const dataImport = {
          $: {
            datafolderpath: `${this.answers.sourceSolution}/data/extract`,
            importbeforesolutions: this.answers.importBeforeSolution,
            importconfigpath: `${this.answers.sourceSolution}/data/${this.answers.solution}DataImport.json`,
          },
        };

        dataImports.push(dataImport);

        this.fs.write(
          importConfigPath,
          new Builder({
            explicitArray: true,
            includeWhiteChars: false,
            renderOpts: { pretty: true },
            trim: true,
          }).buildObject(res),
        );
      },
    );
  };

  private renameFileAndFolders = (from: string, to: string) => {
    this.log('Renaming file and folders...');
    const renamer = new Renamer();
    renamer.rename({
      dryRun: false,
      files: [`${this.destinationPath('src', 'solutions', this.answers.sourceSolution, 'data')}/**/*`],
      find: from,
      replace: to,
    });
  };
}

module.exports = Main;
