import Generator from "yeoman-generator";
import yosay from "yosay";
import inquirer from "inquirer";
import rimraf from "rimraf";
import Renamer from "renamer";
import ADO from "./ado";
import glob from "glob-promise";
import * as chalk from "chalk";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";
import Git from "simple-git/promise";

const TEMPLATE_GIT_REPO = "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates";

class main extends Generator {
  answers!: inquirer.Answers;
  async prompting(): Promise<void> {
    this.log(yosay(`Welcome to the laudable ${chalk.default.red("cdspackage")} generator!`));

    const prompts: Generator.Questions = [
      {
        type: "input",
        name: "client",
        message: "What is the name of the client?",
        validate: validateNamespace,
        filter: filterNamespace,
        store: true
      },
      {
        type: "input",
        name: "package",
        message: "What is the name of the package?",
        validate: validateNamespace,
        filter: filterNamespace,
        store: true
      },
      {
        type: "input",
        name: "devUrl",
        message: "What is the dev URL?",
        validate: validateUrl,
        store: true
      },
      {
        type: "input",
        name: "devUsername",
        message: "What is the dev admin email?",
        validate: validateEmail,
        store: true
      },
      {
        type: "input",
        name: "devPassword",
        message: "What is the dev admin password?",
        store: true,
        mask: "*"
      },
      {
        type: "input",
        name: "adoUrl",
        message: "What is your AzureDevOps url?",
        validate: validateUrl,
        store: true
      },
      {
        type: "input",
        name: "adoProject",
        message: "What is your project name on Azure DevOps?",
        store: true
      },
      {
        type: "input",
        name: "adoToken",
        message: "What is your auth token for Azure DevOps?",
        store: true,
        mask: "*"
      },
      {
        type: "input",
        name: "adoNugetKey",
        message: "What is your Nuget key for Capgemini IP?",
        store: true,
        mask: "*"
      },
      {
        type: "input",
        name: "adoGitToken",
        message: "What is your Azure DevOps git auth token?",
        store: true,
        mask: "*"
      }
    ];

    this.answers = await this.prompt(prompts);
  }

  async writing(): Promise<void> {
    this.log(`Downloading latest template to ${this.templatePath()}...`);
    downloadLatestTemplate(TEMPLATE_GIT_REPO, this.templatePath(), this.spawnCommandSync);

    this.log(`Building package from template...`)
    copyAndTransformTemplate(this.templatePath(), this.destinationPath(), this.answers, this.fs);
  };

  async install() {
    const rootNamespace = `${this.answers.client}.${this.answers.package}`

    this.log(`Renaming file and folders...`);
    renameFileAndFolders("Client.Package", rootNamespace, this.destinationPath());

    this.log(`Setting up Azure DevOps...`);
    const { remoteGitUrl } = await setupAzureDevOps(
      this.answers.adoUrl,
      this.answers.adoProject,
      this.answers.adoToken,
      this.answers.adoNugetKey,
      this.answers.adoGitToken,
      this.destinationPath(),
      rootNamespace,
      (msg: string) => this.log("  " + msg));

    this.log(`Initalising Git repo and pushing to Azure DevOps...`);
    await pushNewGitRepo(this.destinationPath(), remoteGitUrl || "");

    this.log(`Complete! Open the directory in VS or VS Code.`);
  }
};

//#region Input validation and filters
function validateNamespace(input: string): boolean | string {
  return /^[a-zA-Z]+$/.test(input)
    ? true
    : `Answer must not contain spaces, numeric characters or special characters.`;
}

function filterNamespace(input: string): string {
  return input
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join();
}

function validateUrl(input: string): boolean | string {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
    input
  )
    ? true
    : "You must provide a valid URL.";
}

function validateEmail(input: string): boolean | string {
  // tslint:disable-next-line:max-line-length
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    input
  )
    ? true
    : "You must provide a valid email.";
}

//#endregion

//#region Writing steps
function downloadLatestTemplate(gitRepo: string, destination: string, spawnCommandSync: any) {
  rimraf.sync(destination);
  spawnCommandSync("git", [
    "clone",
    "--depth=1",
    "--single-branch",
    "--branch",
    "sample-repository",
    "-q",
    gitRepo,
    destination
  ]);

  rimraf.sync(`${destination}/.git`);
}

function copyAndTransformTemplate(from: string, to: string, map: object, fs: Generator.MemFsEditor) {
  fs.copyTpl(
    from,
    to,
    map,
    {},
    { globOptions: { dot: true } }
  );  
}

function renameFileAndFolders(from: string, to: string, location: string) {
  const renamer = new Renamer();
  renamer.rename({
    files: [`${location}/**/*`],
    find: from,
    replace: to,
    dryRun: false
  });
}

async function setupAzureDevOps(url: string, project: string, token: string, nugetKey: string, gitToken: string, destination: string, repoName: string, log: any){
  try {
    let azureDevOps = new ADO(url, project, token, log);

    let variableGroupsResult = await azureDevOps.createVariableGroups([
      {
        name: "Azure DevOps - Capgemini UK",
        variables: { "CapgeminiUkPackageReadKey": { value: nugetKey, isSecret: true } }
      },
      {
        name: "Azure DevOps",
        variables: { "GitAuthToken": { value: gitToken, isSecret: true } }
      }
    ]);

    let repos: GitRepositoryCreateOptions[] = [{ name: repoName }];
    let reposResult = await azureDevOps.createRepos(repos);

    let solutions = await getYamlBuildFilesFromPackage(destination);
    let variableGroupIds = variableGroupsResult.map(group => group.id || -1);
    let buildDefinitions = solutions.map(solution => azureDevOps.createBuildDefinition(solution.name, solution.filePath, reposResult[0].id || "", variableGroupIds))

    let buildDefinitionsResult = await azureDevOps.createBuildDefinitions(buildDefinitions);

    return {
      remoteGitUrl: reposResult[0].remoteUrl
    }
  } catch (e) {
    console.error(e);

    return {
      remoteGitUrl: undefined
    }
  }
};

async function getYamlBuildFilesFromPackage(packageDirectory: string) {
  return (await glob("**\\*.yml", { cwd: packageDirectory }))
    .map(f => {
      let parts = f.split("/").slice(-2);
      return {
        name: parts[0],
        file: parts[1],
        filePath: f
      }
    });
};

async function pushNewGitRepo(repoLocation:string, gitUrl: string) {
  const repo = Git(repoLocation);
  await repo.init();
  await repo.add(".");
  await repo.commit("Init. Build from template.");
  await repo.remote(["add", "origin", gitUrl]);
  await repo.push("origin", "master", {"-u": true});
}
//#endregion

module.exports = main;