import inquirer from 'inquirer';
import Generator from 'yeoman-generator';
import { validateNamespace } from '../../common/utilities';

class Main extends Generator {
  private answers!: inquirer.Answers;

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        message: 'Name of the client? (this will be used for naming various artifacts)',
        name: 'client',
        store: true,
        validate: validateNamespace,
      },
      {
        message: 'Name of the package? (this will be used for naming various artifacts)',
        name: 'package',
        store: true,
      },
    ]);
    this.composeWith(require.resolve('../solution'), { ...this.options, client: this.answers.client, package: this.answers.package });
  }

  public writing(): void {
    this.log('Writing package from template...');

    this.fs.copyTpl(
      this.templatePath('source'),
      this.destinationPath(),
      this.answers,
      {},
      {
        globOptions: { dot: true },
        processDestinationPath:
          (destinationPath: string) => destinationPath.replace(/Client.Package/g, `${this.answers.client}.${this.answers.package}`),
      },
    );
  }
}

module.exports = Main;
