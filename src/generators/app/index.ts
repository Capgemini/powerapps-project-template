import inquirer from 'inquirer';
import Renamer from 'renamer';
import Generator from 'yeoman-generator';
import { validateNamespace } from '../../common/utilities';

class Main extends Generator {
  private answers!: inquirer.Answers;

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        message: 'Name of the client?',
        name: 'client',
        store: true,
        validate: validateNamespace,
      },
      {
        message: 'Name of the package?',
        name: 'package',
        store: true,
      },
    ]);
  }

  public writing(): void {
    this.log('Writing package from template...');

    this.fs.copyTpl(
      this.templatePath('source'),
      this.destinationPath(),
      this.answers,
      {},
      { globOptions: { dot: true } },
    );
  }

  public async install() {
    this.log('Renaming file and folders...');

    const rootNamespace = `${this.answers.client}.${
      this.answers.package
    }`.replace(/\s/g, '');

    new Renamer().rename({
      dryRun: false,
      files: [`${this.destinationPath()}/**/*`],
      find: 'Client.Package',
      replace: rootNamespace,
    });
  }
}

module.exports = Main;
