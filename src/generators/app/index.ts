import glob from "glob-promise";
import rimraf from "rimraf";
import inquirer from "inquirer";
import Renamer from "renamer";
import * as chalk from "chalk";
import Git from "simple-git/promise";
import Generator from "yeoman-generator";
import Ado from "./ado";

const TEMPLATE_GIT_REPO =
  "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates";

class Main extends Generator {
  private answers!: inquirer.Answers;
  private ado?: Ado = undefined;

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        filter: filterNamespace,
        message: "Name of the client?",
        name: "client",
        store: true,
        validate: validateNamespace,
      },
      {
        filter: filterNamespace,
        message: "Name of the package?",
        name: "package",
        store: true,
        validate: validateNamespace,
      },
      {
        message: "Extract environment URL?",
        name: "devUrl",
        store: true,
        validate: validateUrl,
      },
      {
        message: "Dynamics 365 service account email?",
        name: "devUsername",
        store: true,
        validate: validateEmail,
      },
      {
        mask: "*",
        message: "Dynamics 365 service account password?",
        name: "devPassword",
        type: "password",
      },
      {
        message: "Azure DevOps URL?",
        name: "adoUrl",
        store: true,
        validate: validateUrl,
      },
      {
        mask: "*",
        message: "Azure Dev Ops auth token (manage)?",
        name: "adoToken",
        type: "password",
      },
      {
        choices: async (answers) => {
          this.ado = new Ado(answers.adoUrl, answers.adoToken, this.log);
          return this.ado
            .getProjects()
            .then((projects) => projects.map((project) => project.name!));
        },
        message: "Azure DevOps project?",
        name: "adoProject",
        type: "list",
      },
      {
        mask: "*",
        message: "Azure Dev Ops auth token (code)?",
        name: "adoGitToken",
        type: "password",
      },
      {
        mask: "*",
        message: "Azure DevOps - Capgemini UK auth token (packages)?",
        name: "adoNugetKey",
        type: "password",
      },
    ]);
  }

  public async writing(): Promise<void> {
    this.log(`Downloading latest template to ${this.templatePath()}...`);
    downloadLatestTemplate(
      TEMPLATE_GIT_REPO,
      this.templatePath(),
      this.spawnCommandSync,
    );

    this.log(`Building package from template...`);
    copyAndTransformTemplate(
      this.templatePath(),
      this.destinationPath(),
      this.answers,
      this.fs,
    );
  }

  public async install() {
    const rootNamespace = `${this.answers.client}.${this.answers.package}`;

    this.log(`Renaming file and folders...`);
    renameFileAndFolders(
      "Client.Package",
      rootNamespace,
      this.destinationPath(),
    );

    this.log(`Setting up Azure DevOps...`);
    const { repositories } = await setupAzureDevOps(
      this.answers.adoUrl,
      this.answers.adoProject,
      this.answers.adoToken,
      this.answers.adoNugetKey,
      this.answers.adoGitToken,
      this.destinationPath(),
      rootNamespace,
      (msg?: string) => this.log("  " + msg),
    );

    this.log(`Initalising Git repo and pushing to Azure DevOps...`);
    if (repositories && repositories[0].remoteUrl) {
      await pushNewGitRepo(this.destinationPath(), repositories[0].remoteUrl || "");
    } else {
      this.log(chalk.default.red(`Failed! Repo was not created in Azure DevOps.`));
    }

    this.log(`Complete! Open the directory in VS or VS Code.`);
  }
}

//#region Input validation and filters
function validateNamespace(input: string): boolean | string {
  return /^[a-zA-Z]+$/.test(input)
    ? true
    : `Answer must not contain spaces, numeric characters or special characters.`;
}

function filterNamespace(input: string): string {
  return input
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join();
}

function validateUrl(input: string): boolean | string {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
    input,
  )
    ? true
    : "You must provide a valid URL.";
}

function validateEmail(input: string): boolean | string {
  // tslint:disable-next-line:max-line-length
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    input,
  )
    ? true
    : "You must provide a valid email.";
}

//#endregion

//#region Writing steps
function downloadLatestTemplate(
  gitRepo: string,
  destination: string,
  spawnCommandSync: (command: string, args: string[]) => any,
) {
  rimraf.sync(destination);
  spawnCommandSync("git", [
    "clone",
    "--depth=1",
    "--single-branch",
    "--branch",
    "sample-repository",
    "-q",
    gitRepo,
    destination,
  ]);

  rimraf.sync(`${destination}/.git`);
}

function copyAndTransformTemplate(
  from: string,
  to: string,
  map: object,
  fs: Generator.MemFsEditor,
) {
  fs.copyTpl(from, to, map, {}, { globOptions: { dot: true } });
}

function renameFileAndFolders(from: string, to: string, location: string) {
  const renamer = new Renamer();
  renamer.rename({
    dryRun: false,
    files: [`${location}/**/*`],
    find: from,
    replace: to,
  });
}

async function setupAzureDevOps(
  url: string,
  project: string,
  token: string,
  nugetKey: string,
  gitToken: string,
  destination: string,
  repoName: string,
  log: (message?: string) => void,
) {
  const azureDevOps = new Ado(url, token, log);
  const variableGroups = await azureDevOps.createVariableGroups(
    project,
    [
      {
        name: "Azure DevOps - Capgemini UK",
        variables: {
          CapgeminiUkPackageReadKey: { value: nugetKey, isSecret: true },
        },
      },
      {
        name: "Azure DevOps",
        variables: { GitAuthToken: { value: gitToken, isSecret: true } },
      },
    ],
  ).catch(e => {
    log(e);
    return undefined;
  });

  const repositories = await azureDevOps.createRepos(project, [{ name: repoName }]);
  const packageSolutions = await getYamlBuildFilesFromPackage(destination);
  const projectId = await azureDevOps.getProjectId(project);

  if (variableGroups === undefined)
    throw "Cannot continue. Azure DevOps setup is stopping."

  const variableGroupIds = variableGroups.map(group => group.id!);

  const buildDefinitions = await azureDevOps.createBuildDefinitions(
    project,
    packageSolutions.map((solution) =>
      azureDevOps.generateBuildDefinition(
        solution.name,
        solution.filePath,
        repositories[0].id || "",
        variableGroupIds,
      )
    )
  ).catch(e => {
    log(e);
    return undefined;
  });

  if (buildDefinitions === undefined)
    throw "Cannot continue. Azure DevOps setup is stopping."

  const releaseDefinitions = await azureDevOps.createReleaseDefinitions(
    project,
    packageSolutions.map(solution =>
      azureDevOps.generateReleaseDefinitionFromTemplate(
        solution.name,
        variableGroupIds,
        projectId!,
        buildDefinitions.filter(definition => (definition.name && definition.name.startsWith(solution.name)))[0].id || 0,
        buildDefinitions[0] && buildDefinitions[0].queue && buildDefinitions[0].queue.id || 0
      )
    )
  ).catch(e => {
    log(e);
    return undefined;
  });

  return {
    variableGroups,
    repositories,
    buildDefinitions,
    releaseDefinitions
  };
}

async function getYamlBuildFilesFromPackage(packageDirectory: string) {
  return (await glob("**\\*.yml", { cwd: packageDirectory })).map((f) => {
    const parts = f.split("/").slice(-2);
    return {
      file: parts[1],
      filePath: f,
      name: parts[0],
    };
  });
}

async function pushNewGitRepo(repoLocation: string, gitUrl: string) {
  const repo = Git(repoLocation);
  repo
    .init()
    .then(() => repo.add("."))
    .then(() => repo.commit("Initial commit from template."))
    .then(() => repo.remote(["add", "origin", gitUrl]))
    .then(() => repo.push("origin", "master", { "-u": true }));
}
//#endregion

module.exports = Main;
