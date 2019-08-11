import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import inquirer from "inquirer";
import Renamer from "renamer";
import Generator from "yeoman-generator";
import { AzureDevOpsScaffolder } from "./AzureDevOpsScaffolder";
import { BuildGenerator } from "./generator/BuildGenerator";
import { ExtensionGenerator } from "./generator/ExtensionGenerator";
import { ReleaseGenerator } from "./generator/ReleaseGenerator";
import { RepoGenerator } from "./generator/RepoGenerator";
import { ServiceEndpointGenerator } from "./generator/ServiceEndpointGenerator";
import { VarGroupGenerator } from "./generator/VarGroupGenerator";
import { validateEmail, validateNamespace, validateUrl } from "./utilities";

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
        validate: (input, answers) =>
          this.validatePackage(input, answers!, adoAnswers)
      }
    ]);

    packageAnswers.repositoryName = packageAnswers.package
      .toLowerCase()
      .replace(/\s/g, "-");
    packageAnswers.package = packageAnswers.package.replace(/\s/g, "");
    packageAnswers.client = packageAnswers.client.replace(/\s/g, "");

    const ciGroupExists = await this.conn!.getTaskAgentApi()
      .then(api => api.getVariableGroups(packageAnswers.adoProject, "Environment - CI"))
      .then(grps => grps.length > 0);

    const capUkGroupExists = await this.conn!.getTaskAgentApi()
      .then(api => api.getVariableGroups(packageAnswers.adoProject, "Azure DevOps - Capgemini UK"))
      .then(grps => grps.length > 0);

    const cakeGroupExists = await this.conn!.getTaskAgentApi()
      .then(api => api.getVariableGroups(packageAnswers.adoProject, "Cake"))
      .then(grps => grps.length > 0);

    const connectionAnswers = await this.prompt([
      {
        message: "CI environment URL?",
        name: "ciUrl",
        store: true,
        validate: validateUrl,
        when: !ciGroupExists
      },
      {
        message: "Dynamics 365 service account email?",
        name: "serviceAccountUsername",
        store: true,
        validate: validateEmail,
        when: !ciGroupExists
      },
      {
        mask: "*",
        message: "Dynamics 365 service account password?",
        name: "serviceAccountPassword",
        store: false,
        type: "password",
        when: !cakeGroupExists || !ciGroupExists
      },
      {
        mask: "*",
        message: "Azure DevOps - Capgemini UK auth token (packages)?",
        name: "adoNugetKey",
        store: false,
        type: "password",
        when: !capUkGroupExists
      }
    ]);

    this.answers = {
      ...adoAnswers,
      ...packageAnswers,
      ...connectionAnswers
    };
  }

  public writing(): void {
    this.writePackage();
  }

  public async install() {
    const rootNamespace = `${this.answers.client.replace(
      /\s/g,
      ""
    )}.${this.answers.package.replace(/\s/g, "")}`;
    this.renameFileAndFolders("Client.Package", rootNamespace);
    return this.setupAzureDevOps();
  }

  private setupAzureDevOps = async () => {
    const taskAgentApi = this.conn!.getTaskAgentApi();
    
    const scaffolder = new AzureDevOpsScaffolder(
      await this.conn!.getCoreApi(),
      new VarGroupGenerator(await taskAgentApi, this.log),
      new ServiceEndpointGenerator(await taskAgentApi, this.log),
      new RepoGenerator(await this.conn!.getGitApi(), this.log),
      new BuildGenerator(await this.conn!.getBuildApi(), this.log),
      new ExtensionGenerator(
        await this.conn!.getExtensionManagementApi(),
        this.log
      ),
      new ReleaseGenerator(await this.conn!.getReleaseApi(), this.log),
      this.log
    );

    try {
      await scaffolder.scaffold({
        capgeminiUkPackageReadKey: this.answers.adoNugetKey,
        ciEnvironmentUrl: this.answers.ciUrl,
        clientName: this.answers.client,
        gitRepository: this.answers.repositoryName,
        package: {
          name: this.answers.package,
          path: this.destinationPath()
        },
        projectName: this.answers.adoProject,
        serviceAccountPassword: this.answers.serviceAccountPassword,
        serviceAccountUsername: this.answers.serviceAccountUsername,
      });
    } catch (e) {
      this.log("Package generator encountered an error.");
      await scaffolder.rollback(this.answers.adoProject);
      this.log(e);
    }
  };

  private writePackage = () => {
    this.log(`Writing package from template...`);
    this.fs.copyTpl(
      this.templatePath("source"),
      this.destinationPath(),
      this.answers,
      {},
      { globOptions: { dot: true } }
    );
  };

  private renameFileAndFolders = (from: string, to: string) => {
    this.log(`Renaming file and folders...`);
    const renamer = new Renamer();
    renamer.rename({
      dryRun: false,
      files: [`${this.destinationPath()}/**/*`],
      find: from,
      replace: to
    });
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
