import { CoreApi } from "azure-devops-node-api/CoreApi";
import { YamlProcess } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ReleaseDefinition } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { BuildGenerator } from "./generator/BuildGenerator";
import { ExtensionGenerator } from "./generator/ExtensionGenerator";
import { IGenerator } from "./generator/IGenerator";
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
      settings.package.name,
      settings.ciEnvironmentUrl,
      settings.serviceAccountUsername,
      settings.serviceAccountPassword
    );

    const repo = await this.repoGenerator.generate(
      settings.projectName,
      settings.gitRepository,
      settings.package.path
    );

    const varGroupIds = varGroups.map(group => group.id!);

    const buildDefs = await this.buildGenerator.generate(
      settings.package.path,
      settings.projectName,
      settings.package.name,
      repo.id!,
      varGroupIds
    );

    let releaseDef: ReleaseDefinition;
    try {
      await this.extensionGenerator.generate();
      releaseDef = await this.releaseGenerator.generate(
        settings.projectName,
        settings.package.name,
        settings.clientName,
        await this.getProjectId(settings.projectName),
        buildDefs.find(
          def =>
            (def.process as YamlProcess).yamlFilename === "azure-pipelines.yml"
        )!,
        varGroupIds
      );
    } catch (e) {
      throw new Error(
        "Failed to create release definition. Please ensure you have permission to install extensions in your target organisation"
      );
    }

    this.log(`Finished setting up Azure DevOps.`);
    return {
      buildDefinitions: buildDefs,
      releaseDefinition: releaseDef,
      repositories: repo,
      variableGroups: varGroups
    };
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back all generated objects in ${project}...`);
    const generators: Array<IGenerator<any>> = [
      this.repoGenerator,
      this.buildGenerator,
      this.releaseGenerator,
      this.varGroupGenerator,
      this.extensionGenerator,
    ];
    await Promise.all(generators.map(gen => gen.rollback(project)));
    return;
  }

  private async getProjectId(projectName: string): Promise<string> {
    return this.coreApi
      .getProjects()
      .then(projects => projects.find(project => project.name === projectName))
      .then(project => project!.id!);
  }
}
