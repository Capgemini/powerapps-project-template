import { CoreApi } from 'azure-devops-node-api/CoreApi';
import { YamlProcess } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import BuildGenerator from './generator/BuildGenerator';
import ExtensionGenerator from './generator/ExtensionGenerator';
import { IGenerator } from './generator/IGenerator';
import ReleaseGenerator from './generator/ReleaseGenerator';
import RepoGenerator from './generator/RepoGenerator';
import ServiceEndpointGenerator from './generator/ServiceEndpointGenerator';
import VarGroupGenerator from './generator/VarGroupGenerator';
import { IScaffoldResult } from './IScaffoldResult';
import { IScaffoldSettings } from './IScaffoldSettings';

export default class AzureDevOpsScaffolder {
  private readonly coreApi: CoreApi;

  private readonly varGroupGenerator: VarGroupGenerator;

  private readonly repoGenerator: RepoGenerator;

  private readonly buildGenerator: BuildGenerator;

  private readonly extensionGenerator: ExtensionGenerator;

  private readonly releaseGenerator: ReleaseGenerator;

  private readonly serviceEndpointGenerator: ServiceEndpointGenerator;

  private log: (message: string) => void;

  constructor(
    coreApi: CoreApi,
    varGroupGenerator: VarGroupGenerator,
    repoGenerator: RepoGenerator,
    buildGenerator: BuildGenerator,
    extensionGenerator: ExtensionGenerator,
    releaseGenerator: ReleaseGenerator,
    serviceEndpointGenerator: ServiceEndpointGenerator,
    log: (message: string) => void,
  ) {
    this.coreApi = coreApi;
    this.varGroupGenerator = varGroupGenerator;
    this.repoGenerator = repoGenerator;
    this.buildGenerator = buildGenerator;
    this.extensionGenerator = extensionGenerator;
    this.releaseGenerator = releaseGenerator;
    this.serviceEndpointGenerator = serviceEndpointGenerator;
    this.log = log;
  }

  public async scaffold(settings: IScaffoldSettings): Promise<IScaffoldResult> {
    this.log('Setting up Azure DevOps...');

    const varGroups = await this.varGroupGenerator.generate(
      settings.projectName,
      settings.package.name,
      settings.ciEnvironmentUrl,
      settings.serviceAccountUsername,
      settings.serviceAccountPassword,
    );

    const repo = await this.repoGenerator.generate(
      settings.projectName,
      settings.gitRepository,
      settings.package.path,
      settings.personalAccessToken,
    );

    const buildDefs = await this.buildGenerator.generate(
      settings.package.path,
      settings.projectName,
      settings.package.name,
      repo.id!,
    );

    await this.extensionGenerator.generate();

    const serviceEndpoint = await this.serviceEndpointGenerator.generate(
      settings.projectName,
      settings.package.name,
      settings.ciEnvironmentUrl,
      settings.tenantId,
      settings.applicationId,
      settings.clientSecret,
    );

    const mainBuildDef = buildDefs.find((def) => ((def.process as YamlProcess).yamlFilename || '').endsWith(
      'azure-pipelines.yml',
    ))!;

    const releaseDef = await this.releaseGenerator.generate(
      settings.projectName,
      settings.package.name,
      settings.clientName,
      await this.getProjectId(settings.projectName),
      mainBuildDef,
      varGroups.map((vg) => vg.id!),
      serviceEndpoint,
    );

    this.log('Finished setting up Azure DevOps.');
    return {
      buildDefinitions: buildDefs,
      releaseDefinition: releaseDef,
      repositories: repo,
      serviceEndpoint,
      variableGroups: varGroups,
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
      this.serviceEndpointGenerator,
    ];
    await Promise.all(generators.map((gen) => gen.rollback(project)));
  }

  private async getProjectId(projectName: string): Promise<string> {
    return this.coreApi
      .getProjects()
      .then((projects) => projects.find((project) => project.name === projectName))
      .then((project) => project!.id!);
  }
}
