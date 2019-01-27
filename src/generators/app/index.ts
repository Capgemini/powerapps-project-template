import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api";
import inquirer from "inquirer";
import Renamer from "renamer";
import rimraf from "rimraf";
import Generator from "yeoman-generator";
import { AzureDevOpsScaffolder } from "./AzureDevOpsScaffolder";
import { BuildGenerator } from "./generator/BuildGenerator";
import { ExtensionGenerator } from "./generator/ExtensionGenerator";
import { ReleaseGenerator } from "./generator/ReleaseGenerator";
import { RepoGenerator } from "./generator/RepoGenerator";
import { ServiceEndpointGenerator } from "./generator/ServiceEndpointGenerator";
import { VarGroupGenerator } from "./generator/VarGroupGenerator";
import {
  filterNamespace,
  validateEmail,
  validateNamespace,
  validateUrl
} from "./utilities";

class Main extends Generator {
  private static readonly templateGitRepo =
    "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates";

  private answers!: inquirer.Answers;
  private conn?: WebApi = undefined;

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        filter: filterNamespace,
        message: "Name of the client?",
        name: "client",
        store: true,
        validate: validateNamespace
      },
      {
        filter: filterNamespace,
        message: "Name of the package?",
        name: "package",
        store: true,
        validate: validateNamespace
      },
      {
        message: "Extract environment URL?",
        name: "devUrl",
        store: true,
        validate: validateUrl
      },
      {
        message: "CI environment URL?",
        name: "ciUrl",
        store: true,
        validate: validateUrl
      },
      {
        message: "Dynamics 365 service account email?",
        name: "devUsername",
        store: true,
        validate: validateEmail
      },
      {
        mask: "*",
        message: "Dynamics 365 service account password?",
        name: "devPassword",
        store: true,
        type: "password"
      },
      {
        message: "Azure DevOps URL?",
        name: "adoUrl",
        store: true,
        validate: validateUrl
      },
      {
        mask: "*",
        message: "Azure Dev Ops auth token (manage)?",
        name: "adoToken",
        store: true,
        type: "password"
      },
      {
        choices: async answers => {
          this.conn = new WebApi(
            answers.adoUrl,
            getPersonalAccessTokenHandler(answers.adoToken)
          );
          return this.conn
            .getCoreApi()
            .then(api => api.getProjects())
            .then(projects => projects.map(project => project.name!));
        },
        message: "Azure DevOps project?",
        name: "adoProject",
        type: "list"
      },
      {
        mask: "*",
        message: "Azure Dev Ops auth token (code)?",
        name: "adoGitToken",
        store: true,
        type: "password"
      },
      {
        mask: "*",
        message: "Azure DevOps - Capgemini UK auth token (packages)?",
        name: "adoNugetKey",
        store: true,
        type: "password"
      }
    ]);
  }

  public writing(): void {
    this.cloneTemplate();
    this.writePackage();
  }

  public async install() {
    const rootNamespace = `${this.answers.client}.${this.answers.package}`;
    this.renameFileAndFolders("Client.Package", rootNamespace);
    return this.setupAzureDevOps(rootNamespace);
  }

  private setupAzureDevOps = async (rootNamespace: string) => {
    const taskAgentApi = this.conn!.getTaskAgentApi();

    return new AzureDevOpsScaffolder(
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
    ).scaffold({
      ciConnectionString: `Url=${this.answers.ciUrl}; Username=${
        this.answers.devUsername
      }; Password=${this.answers.devPassword}; AuthType=Office365;`,
      gitToken: this.answers.adoGitToken,
      nugetFeedToken: this.answers.adoNugetKey,
      packageName: this.answers.package,
      packagePath: this.destinationPath(),
      projectName: this.answers.adoProject,
      repoName: rootNamespace
    });
  };

  private cloneTemplate = () => {
    this.log("Cloning latest template...");
    rimraf.sync(this.templatePath());
    this.spawnCommandSync("git", [
      "clone",
      "--depth=1",
      "--single-branch",
      "--branch",
      "sample-repository",
      "-q",
      Main.templateGitRepo,
      this.templatePath()
    ]);
    rimraf.sync(this.templatePath(".git"));
  };

  private writePackage = () => {
    this.log(`Writing package from template...`);
    this.fs.copyTpl(
      this.templatePath(),
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
}

module.exports = Main;
