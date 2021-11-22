import { raw } from 'guid';
import inquirer from 'inquirer';
import Renamer from 'renamer';
import stripJsonComments from 'strip-json-comments';
import { Builder, parseString } from 'xml2js';
import Generator from 'yeoman-generator';
import { validatePacAuthProfile, validateUrl } from '../../common/utilities';

class Main extends Generator {
  private answers!: inquirer.Answers;

  public async prompting(): Promise<void> {
    this.answers = {};

    const { existingSolution } = await this.prompt([
      {
        message: 'Does the solution already exist?',
        name: 'existingSolution',
        store: false,
        type: 'confirm',
      },
    ]);

    if (existingSolution) {
      // Ask and store solution unique name.
      const { solutionUniqueName } = await this.prompt([
        {
          message: 'What is the solution unique name?',
          name: 'solutionUniqueName',
          store: true,
        },
      ]);

      this.answers.solutionUniqueName = solutionUniqueName;
    } else {
      // Ask questions to build solution unique name.
      const solutionParts = await this.prompt([
        {
          message: 'Publisher prefix?',
          name: 'prefix',
          store: true,
        },
        {
          message: 'Name of the package?',
          name: 'package',
          store: true,
        },
        {
          message: 'Name of the solution?',
          name: 'solution',
          store: true,
        },
      ]);

      this.answers.solutionUniqueName = `${solutionParts.prefix}_${solutionParts.package}_${solutionParts.solution}`;
    }

    const solutionConfig = await this.prompt([
      {
        message:
          'Name of PAC Auth profile? This is used to export the solution locally. (please ensure this has been created with pac auth create -n <name> -u <url>)',
        name: 'pacProfile',
        store: false,
        validate: validatePacAuthProfile,
        when: !this.options?.chatbot,
      },
      {
        message: 'Development environment URL?',
        name: 'environment',
        store: false,
        validate: validateUrl,
      },
      {
        message:
          'Are changes to this solution promoted using a staging environment?',
        name: 'hasStagingEnvironment',
        store: false,
        type: 'confirm',
      },
      {
        message: 'Staging environment URL?',
        name: 'stagingEnvironment',
        store: false,
        validate: validateUrl,
        when: (answers: any) => answers.hasStagingEnvironment,
      },
    ]);

    this.answers = { ...this.answers, ...solutionConfig };
    this.answers.projectGuid = raw();
  }

  public writing(): void {
    this.writeSource();
    this.writeSolutionConfig();
    this.updateTasks();
    this.updateImportConfig();
  }

  private writeSource = () => {
    this.log('Writing solution from template...');
    this.fs.copyTpl(
      this.templatePath('source'),
      this.destinationPath('src', 'solutions'),
      this.answers,
      {},
      {
        globOptions: { dot: true },
        processDestinationPath:
          (destinationPath: string) => destinationPath.replace(/{{solutionUniqueName}}/g, this.answers.solutionUniqueName),
      },
    );
  };

  private writeSolutionConfig = () => {
    this.log('Writing solution configuration...');

    const solutionConfig: any = {};

    solutionConfig.DevelopmentProfile = this.answers.pacProfile;
    solutionConfig.environment = this.answers.environment;

    if (this.answers.hasStagingEnvironment) {
      solutionConfig.stagingEnvironment = this.answers.stagingEnvironment;
    }

    this.fs.writeJSON(
      this.destinationPath(
        'src',
        'solutions',
        this.answers.solutionUniqueName,
        'solution.json',
      ),
      solutionConfig,
    );
  };

  private updateTasks = () => {
    this.log('Updating tasks.json...');
    const tasksString = this.fs.read(
      this.destinationPath('.vscode', 'tasks.json'),
    );
    const tasks = JSON.parse(stripJsonComments(tasksString));
    tasks.inputs
      .find((input: { id: string }) => input.id === 'solution')
      .options.push(this.answers.solutionUniqueName);
    this.fs.writeJSON(this.destinationPath('.vscode', 'tasks.json'), tasks);
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
      { trim: true, includeWhiteChars: false, renderOpts: { pretty: true } },
      (err, res) => {
        if (err) {
          throw err;
        }
        const solutions = res.configdatastorage.solutions[0];
        const solutionElement = {
          $: {
            deleteonly: 'false',
            forceUpgrade: 'false',
            overwriteunmanagedcustomizations: true,
            publishworkflowsandactivateplugins: true,
            solutionpackagefilename: `${this.answers.solutionUniqueName}/${this.answers.solutionUniqueName}.zip`,
            useAsync: 'true',
          },
        };

        if (solutions.configsolutionfile) {
          solutions.configsolutionfile.push(solutionElement);
        } else {
          res.configdatastorage.solutions = [
            {
              configsolutionfile: [solutionElement],
            },
          ];
        }

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
}

module.exports = Main;
