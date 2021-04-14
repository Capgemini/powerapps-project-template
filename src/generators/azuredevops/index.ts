import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import inquirer from "inquirer";
import Generator from "yeoman-generator";
import { validateEmail, validateGuid, validateNamespace, validateUrl } from "../../common/utilities";
import { AzureDevOpsScaffolder } from "./AzureDevOpsScaffolder";
import { BuildGenerator } from "./generator/BuildGenerator";
import { ExtensionGenerator } from "./generator/ExtensionGenerator";
import { RepoGenerator } from "./generator/RepoGenerator";
import { ServiceEndpointGenerator } from "./generator/ServiceEndpointGenerator";
import { VarGroupGenerator } from "./generator/VarGroupGenerator";

class Main extends Generator {
  private answers!: inquirer.Answers;
  private conn?: WebApi = undefined;

  public async prompting(): Promise<void> {
    const adoAnswers = await this.prompt([
      {
        message: "Azure DevOps URL?",
        name: "adoUrl",
        store: true,
        validate: validateUrl
      },
      {
        mask: "*",
        message: "Azure DevOps auth token (manage)?",
        name: "adoToken",
        store: false,
        type: "password"
      }
    ]);

    this.conn = new WebApi(
      adoAnswers.adoUrl,
      getPersonalAccessTokenHandler(adoAnswers.adoToken)
    );

    const projects = await this.conn
      .getCoreApi()
      .then(api => api.getProjects())
      .then(projs => projs.map(project => project.name!));

    const packageAnswers = await this.prompt([
      {
        choices: projects,
        message: "Azure DevOps project?",
        name: "adoProject",
        type: "list"
      },
      {
        message: "Name of the client?",
        name: "client",
        store: true,
        validate: validateNamespace
      },
      {
        message: "Name of the package?",
        name: "package",
        store: true,
        validate: (input: any, answers: any) =>
          this.validatePackage(input, answers!, adoAnswers)
      }
    ]);

    packageAnswers.repositoryName = packageAnswers.package
      .toLowerCase()
      .replace(/\s/g, "-");
    packageAnswers.package = packageAnswers.package.replace(/\s/g, "");
    packageAnswers.client = packageAnswers.client.replace(/\s/g, "");

    const connectionAnswers = await this.prompt([
      {
        message: "CI environment URL?",
        name: "ciUrl",
        store: true,
        validate: validateUrl
      },
      {
        message: "Service account email?",
        name: "serviceAccountUsername",
        store: true,
        validate: validateEmail,
      },
      {
        mask: "*",
        message: "Service account password?",
        name: "serviceAccountPassword",
        store: false,
        type: "password",
      },
      {
        message: "Tenant ID?",
        name: "tenantId",
        store: true,
        validate: validateGuid,
      },
      {
        message: "Application ID?",
        name: "applicationId",
        store: true,
        validate: validateGuid,
      },
      {
        mask: "*",
        message: "Client secret?",
        name: "clientSecret",
        store: false,
        type: "password",
      },
    ]);

    this.answers = {
      ...adoAnswers,
      ...packageAnswers,
      ...connectionAnswers
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
        this.log
      ),
      new ServiceEndpointGenerator(await this.conn!.getTaskAgentApi(), this.log),
      this.log
    );

    try {
      const scaffoldResult = await scaffolder.scaffold({
        applicationId: this.answers.applicationId,
        ciEnvironmentUrl: this.answers.ciUrl,
        clientName: this.answers.client,
        clientSecret: this.answers.clientSecret,
        gitRepository: this.answers.repositoryName,
        package: {
          name: this.answers.package,
          path: this.destinationPath()
        },
        projectName: this.answers.adoProject,
        serviceAccountPassword: this.answers.serviceAccountPassword,
        serviceAccountUsername: this.answers.serviceAccountUsername,
        tenantId: this.answers.tenantId,
      });
      this.log("Done.")
    } catch (e) {
      this.log("Package generator encountered an error.");
      await scaffolder.rollback(this.answers.adoProject);
      this.log(e);
    }
  };

  private validatePackage = async (
    packageName: string,
    answers: inquirer.Answers,
    adoAnswers: inquirer.Answers
  ): Promise<boolean | string> => {
    const nameResult = validateNamespace(answers.package);
    if (typeof nameResult === "string") {
      return nameResult;
    }
    const gitApi = await this.conn!.getGitApi();
    const repos = await gitApi.getRepositories(adoAnswers.adoProject);
    return repos.find(repo => repo.name === answers.repositoryName)
      ? "Package already exists. Please choose a new package name."
      : true;
  };
}

module.exports = Main;
