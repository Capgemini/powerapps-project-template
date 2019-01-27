import { CoreApi } from "azure-devops-node-api/CoreApi";
import { BuildGenerator } from "./generator/BuildGenerator";
import { ExtensionGenerator } from "./generator/ExtensionGenerator";
import { ReleaseGenerator } from "./generator/ReleaseGenerator";
import { RepoGenerator } from "./generator/RepoGenerator";
import { VarGroupGenerator } from "./generator/VarGroupGenerator";
import { IScaffoldResult } from "./IScaffoldResult";
import { IScaffoldSettings } from "./IScaffoldSettings";

export class AzureDevOpsScaffolder {
  private readonly coreApi: CoreApi;
  private readonly varGroupGenerator: VarGroupGenerator;
  private readonly repoGenerator: RepoGenerator;
  private readonly buildGenerator: BuildGenerator;
  private readonly extensionGenerator: ExtensionGenerator;
  private readonly releaseGenerator: ReleaseGenerator;

  private log: (message: string) => void;

  constructor(
    coreApi: CoreApi,
    varGroupGenerator: VarGroupGenerator,
    repoGenerator: RepoGenerator,
    buildGenerator: BuildGenerator,
    extensionGenerator: ExtensionGenerator,
    releaseGenerator: ReleaseGenerator,
    log: (message: string) => void
  ) {
    this.coreApi = coreApi;
    this.varGroupGenerator = varGroupGenerator;
    this.repoGenerator = repoGenerator;
    this.buildGenerator = buildGenerator;
    this.extensionGenerator = extensionGenerator;
    this.releaseGenerator = releaseGenerator;
    this.log = log;
  }

  public async scaffold(settings: IScaffoldSettings): Promise<IScaffoldResult> {
    this.log("Setting up Azure DevOps...");

    const varGroups = await this.varGroupGenerator.generate(
      settings.projectName,
      settings.packageName,
      settings.nugetFeedToken,
      settings.gitToken,
      settings.ciConnectionString
    );

    const repo = await this.repoGenerator.generate(
      settings.projectName,
      settings.repoName,
      settings.packagePath
    );

    const varGroupIds = varGroups.map(group => group.id!);

    const buildDefs = await this.buildGenerator.generate(
      settings.packagePath,
      settings.projectName,
      settings.packageName,
      repo.id!,
      varGroupIds
    );

    this.extensionGenerator.generate();

    const releaseDefs = await this.releaseGenerator.generate(
      settings.projectName,
      await this.getProjectId(settings.projectName),
      buildDefs.filter(def => def.path!.includes("Solutions")),
      varGroupIds
    );

    this.log(`Finished setting up Azure DevOps.`);
    return {
      buildDefinitions: buildDefs,
      releaseDefinitions: releaseDefs,
      repositories: repo,
      variableGroups: varGroups
    };
  }

  private async getProjectId(projectName: string): Promise<string> {
    return this.coreApi
      .getProjects()
      .then(projects => projects.find(project => project.name === projectName))
      .then(project => project!.id!);
  }
}
