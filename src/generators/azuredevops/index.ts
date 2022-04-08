import { getPersonalAccessTokenHandler, WebApi } from 'azure-devops-node-api';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Generator from 'yeoman-generator';
import {
  validateEmail, validateGuid, validateNamespace, validateUrl,
} from '../../common/utilities';
import AzureDevOpsScaffolder from './AzureDevOpsScaffolder';
import BuildGenerator from './generator/BuildGenerator';
import ExtensionGenerator from './generator/ExtensionGenerator';
import ReleaseGenerator from './generator/ReleaseGenerator';
import RepoGenerator from './generator/RepoGenerator';
import ServiceEndpointGenerator from './generator/ServiceEndpointGenerator';
import VarGroupGenerator from './generator/VarGroupGenerator';

class Main extends Generator {
  private answers!: inquirer.Answers;

  private conn?: WebApi = undefined;

  public async prompting(): Promise<void> {
    this.log('The following questions are used to connect to your Azure DevOps project. You will need to be a project administrator to complete this activity.');

    const adoAnswers = await this.prompt([
      {
        message: 'Azure DevOps URL? (e.g. https://dev.azure.com/my-organisation)',
        name: 'adoUrl',
        store: true,
        validate: validateUrl,
      },
      {
        mask: '*',
        message: 'Azure DevOps PAC Token with full access? (how to: https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page#create-a-pat, recommendation to expire this tomorrow or manually after the generator has completed)',
        name: 'adoToken',
        store: false,
        type: 'password',
      },
    ]);

    this.conn = new WebApi(
      adoAnswers.adoUrl,
      getPersonalAccessTokenHandler(adoAnswers.adoToken),
    );

    const projects = await this.conn
      .getCoreApi()
      .then((api) => api.getProjects())
      .then((projs) => projs.map((project) => project.name!));

    const packageAnswers = await this.prompt([
      {
        choices: projects,
        message: 'Azure DevOps project?',
        name: 'adoProject',
        type: 'list',
      },
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
        validate: (input: any, answers: any) => this.validatePackage(input, answers!, adoAnswers),
      },
    ]);

    packageAnswers.repositoryName = packageAnswers.package
      .toLowerCase()
      .replace(/\s/g, '-');
    packageAnswers.package = packageAnswers.package.replace(/\s/g, '');
    packageAnswers.client = packageAnswers.client.replace(/\s/g, '');

    this.log('The following questions will used to configure continuous integration and deployment. This requires an application user to be created which can be done following this guides: https://docs.microsoft.com/en-us/powerapps/developer/data-platform/walkthrough-register-app-azure-active-directory https://docs.microsoft.com/en-us/power-platform/admin/manage-application-users#create-an-application-user');

    const connectionAnswers = await this.prompt([
      {
        message: 'CI environment URL? (e.g. https://myenvironment.crm.dynamics.com)',
        name: 'ciUrl',
        store: true,
        validate: validateUrl,
      },
      {
        message: 'Tenant ID?',
        name: 'tenantId',
        store: true,
        validate: validateGuid,
      },
      {
        message: 'Application ID?',
        name: 'applicationId',
        store: true,
        validate: validateGuid,
      },
      {
        mask: '*',
        message: 'Client secret?',
        name: 'clientSecret',
        store: false,
        type: 'password',
      },
    ]);

    this.log('These final questions are used by the integration and UI test projects within the CI pipeline. These values are stored in `Integration Tests` variable group.');

    const testingCredentials = await this.prompt([
      {
        message: 'Service account email?',
        name: 'serviceAccountUsername',
        store: true,
        validate: validateEmail,
      },
      {
        mask: '*',
        message: 'Service account password?',
        name: 'serviceAccountPassword',
        store: false,
        type: 'password',
      },
    ]);

    this.answers = {
      ...adoAnswers,
      ...packageAnswers,
      ...connectionAnswers,
      ...testingCredentials,
    };
  }

  public async default() {
    const scaffolder = new AzureDevOpsScaffolder(
      await this.conn!.getCoreApi(),
      new VarGroupGenerator(await this.conn!.getTaskAgentApi(), this.log),
      new RepoGenerator(await this.conn!.getGitApi(), this.log),
      new BuildGenerator(await this.conn!.getBuildApi(), this.log),
      new ExtensionGenerator(
        await this.conn!.getExtensionManagementApi(),
        this.log,
      ),
      new ReleaseGenerator(await this.conn!.getReleaseApi(), this.log),
      new ServiceEndpointGenerator(await this.conn!.getTaskAgentApi(), this.log),
      this.log,
    );

    try {
      await scaffolder.scaffold({
        personalAccessToken: this.answers.adoToken,
        applicationId: this.answers.applicationId,
        ciEnvironmentUrl: this.answers.ciUrl,
        clientName: this.answers.client,
        clientSecret: this.answers.clientSecret,
        gitRepository: this.answers.repositoryName,
        package: {
          name: this.answers.package,
          path: this.destinationPath(),
        },
        projectName: this.answers.adoProject,
        serviceAccountPassword: this.answers.serviceAccountPassword,
        serviceAccountUsername: this.answers.serviceAccountUsername,
        tenantId: this.answers.tenantId,
      });
      this.log('Done.');
    } catch (scaffoldError) {
      this.log(chalk.red('Package generator encountered an error:'));
      this.log(chalk.red((scaffoldError as Error).toString()));
      this.log('');
      try {
        await scaffolder.rollback(this.answers.adoProject);
      } catch (rollbackError) {
        this.log(chalk.red('Rollback failed:'));
        this.log(chalk.red((rollbackError as Error).toString()));
      }
    }
  }

  private validatePackage = async (
    packageName: string,
    answers: inquirer.Answers,
    adoAnswers: inquirer.Answers,
  ): Promise<boolean | string> => {
    const nameResult = validateNamespace(answers.package);
    if (typeof nameResult === 'string') {
      return nameResult;
    }
    const gitApi = await this.conn!.getGitApi();
    const repos = await gitApi.getRepositories(adoAnswers.adoProject);
    return repos.find((repo) => repo.name === answers.repositoryName)
      ? 'Package already exists. Please choose a new package name.'
      : true;
  };
}

module.exports = Main;
