import { render } from 'ejs';
import { raw } from 'guid';
import inquirer from 'inquirer';
import Renamer from 'renamer';
import Generator from 'yeoman-generator';
import MappingFileTransformer from '../../common/MappingFileTransformer';
import PackageReader from '../../common/PackageReader';

export default class PluginAssemblyGenerator extends Generator {
  private packageReader: PackageReader;

  private mappingFileTransformer: MappingFileTransformer;

  private answers!: inquirer.Answers;

  constructor(args: string | string[], opts: {}) {
    super(args, opts);

    this.packageReader = new PackageReader(this.destinationPath());
    this.mappingFileTransformer = new MappingFileTransformer(this.fs);
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
    ]);

    const solutionPathComponents = this.answers.sourceSolution.split('_');
    const solution = {
      package: solutionPathComponents[1],
      prefix: solutionPathComponents[0],
      solution: solutionPathComponents[2],
    };

    this.answers.prefix = solution.prefix;
    this.answers.package = solution.package;
    this.answers.solution = solution.solution;
    this.answers.client = PackageReader.getClient();
    this.answers.projectGuid = raw();
  }

  public writing(): void {
    this.writeSource();
    this.updateSpklConfig();
    this.updateMappingFile();
  }

  public async install() {
    this.renameFileAndFolders([
      { from: '{{Client}}', to: this.answers.client },
      { from: '{{Package}}', to: this.answers.package },
      { from: '{{Solution}}', to: this.answers.solution },
      { from: '{{prefix}}', to: this.answers.prefix },
    ]);
  }

  private writeSource = () => {
    this.log('Writing solution from template...');
    this.fs.copyTpl(
      this.templatePath('source'),
      this.destinationPath('src', 'solutions', this.answers.sourceSolution, 'PluginAssemblies'),
      this.answers,
      {},
      { globOptions: { dot: true } },
    );
  };

  private updateSpklConfig = () => {
    const targetSpklConfigPath = this.destinationPath('src', 'solutions', this.answers.sourceSolution, 'spkl.json');
    const spklConfig = this.fs.readJSON(targetSpklConfigPath);

    if (!spklConfig.plugins) {
      spklConfig.plugins = [];
    }

    const spklConfigTemplate = this.fs.read(this.templatePath('spkl.json'));
    const spklConfigTemplateParsed = JSON.parse(render(spklConfigTemplate, this.answers));

    spklConfig.plugins = [...spklConfig.plugins, ...spklConfigTemplateParsed.plugins];

    this.fs.writeJSON(targetSpklConfigPath, spklConfig);
  };

  private updateMappingFile = async (): Promise<void> => {
    const packMappingFilePath = this.destinationPath('src', 'solutions', this.answers.sourceSolution, 'PackMappingFile.xml');
    const templatePackMappingFilePath = this.templatePath('PackMappingFile.xml');

    this.mappingFileTransformer.transform(
      templatePackMappingFilePath,
      this.answers,
      packMappingFilePath,
    );

    const ExtractMappingFilePath = this.destinationPath('src', 'solutions', this.answers.sourceSolution, 'ExtractMappingFile.xml');
    const templateExtractMappingFilePath = this.templatePath('ExtractMappingFile.xml');

    this.mappingFileTransformer.transform(
      templateExtractMappingFilePath,
      this.answers,
      ExtractMappingFilePath,
    );
  };

  private renameFileAndFolders = (
    rules: Array<{ from: string; to: string }>,
  ) => {
    this.log('Renaming file and folders...');

    const renamer = new Renamer();

    rules.forEach((rule) => {
      this.log(`From ${rule.from} to ${rule.to}.`);

      renamer.rename({
        dryRun: false,
        files: [`${this.destinationPath()}/src/solutions/**/*`],
        find: rule.from,
        replace: rule.to,
      });
    });
  };
}
