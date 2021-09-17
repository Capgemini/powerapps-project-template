import { BuildDefinition } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import {
  Artifact,
  ArtifactSourceTrigger,
  ReleaseDefinition,
  ReleaseDefinitionEnvironment,
  WorkflowTask,
} from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import { ServiceEndpoint } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';
import { ReleaseApi } from 'azure-devops-node-api/ReleaseApi';
import releaseDefinition from '../definitions/release/release.json';
import { IGenerator } from './IGenerator.js';

export default class ReleaseGenerator implements IGenerator<ReleaseDefinition> {
  public readonly createdObjects: ReleaseDefinition[];

  private readonly conn: ReleaseApi;

  private readonly log: (msg: string) => void;

  constructor(conn: ReleaseApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
    this.createdObjects = [];
  }

  public async generate(
    project: string,
    packageName: string,
    client: string,
    projectId: string,
    buildDef: BuildDefinition,
    ciVarGroupIds: number[],
    serviceEndpoint: ServiceEndpoint,
  ): Promise<ReleaseDefinition> {
    this.log('Generating release definition...');
    const def = await this.createReleaseDefinition(
      project,
      this.generateReleaseDefinition(
        packageName,
        ciVarGroupIds,
        projectId,
        client,
        `${buildDef.path!.split('\\')[1]}\\CD`,
        buildDef.id!,
        (buildDef && buildDef.queue && buildDef.queue.id) || 0,
        serviceEndpoint,
      ),
    );

    if (def === undefined) {
      throw new Error('An error occurred while creating release definitions.');
    }

    this.createdObjects.push(def);

    return def;
  }

  public async rollback(project: string): Promise<void> {
    this.log(
      `Rolling back ${this.createdObjects.length} releases definitions...`,
    );

    await Promise.all(
      this.createdObjects.map((obj) => this.conn.deleteReleaseDefinition(project, obj.id!)),
    );
    this.createdObjects.length = 0;
  }

  private async createReleaseDefinition(
    project: string,
    def: ReleaseDefinition,
  ): Promise<ReleaseDefinition> {
    return this.conn.createReleaseDefinition(def, project);
  }

  private generateReleaseDefinition(
    packageName: string,
    variableGroupIds: number[],
    projectId: string,
    client: string,
    path: string,
    definitionId: number,
    agentPoolQueueId: number,
    serviceEndpoint: ServiceEndpoint,
  ): ReleaseDefinition {
    this.log(`Creating ${packageName} release...`);

    const def = ReleaseGenerator.configureDefinition(
      JSON.parse(JSON.stringify(releaseDefinition)),
      packageName,
      path,
    );
    def.environments![0] = ReleaseGenerator.configureEnvironment(
      def.environments![0],
      agentPoolQueueId,
      variableGroupIds,
    );
    def!.artifacts![0] = ReleaseGenerator.configureArtifact(
      def!.artifacts![0],
      packageName,
      definitionId,
      projectId,
    );
    const trigger: ArtifactSourceTrigger = def!.triggers![0];
    trigger.artifactAlias = def!.artifacts![0].alias;
    const packageFolder = `$(System.DefaultWorkingDirectory)/${packageName}/package`;
    const ciDeploymentTasks = def.environments![0].deployPhases![0]
      .workflowTasks!;
    ReleaseGenerator.configureTasks(
      ciDeploymentTasks,
      packageFolder,
      client,
      packageName,
      serviceEndpoint,
    );

    return def;
  }

  private static configureTasks(
    ciDeploymentTasks: WorkflowTask[],
    packageFolder: string,
    client: string,
    packageName: string,
    serviceEndpoint: ServiceEndpoint,
  ) {
    const deployPackageTask = ciDeploymentTasks[1];
    deployPackageTask.inputs!.PackageFile = `${packageFolder}/${client}.${packageName}.Deployment.dll`;
    deployPackageTask.inputs!.PowerPlatformSPN = serviceEndpoint.id!;
  }

  private static configureArtifact(
    packageArtifact: Artifact,
    packageName: string,
    definitionId: number,
    projectId: string,
  ) {
    const result: Artifact = { ...packageArtifact };

    result.alias = packageName;
    result.definitionReference!.definition.id = definitionId.toString();
    result.definitionReference!.project.id = projectId;

    return result;
  }

  private static configureEnvironment(
    environment: ReleaseDefinitionEnvironment,
    agentPoolQueueId: number,
    variableGroupIds: number[],
  ) {
    const result: ReleaseDefinitionEnvironment = { ...environment };

    result.queueId = agentPoolQueueId;
    result.variableGroups = variableGroupIds;

    // eslint-disable-next-line no-restricted-syntax
    for (const deployPhase of result.deployPhases!) {
      (deployPhase as DeployPhase).deploymentInput!.queueId = agentPoolQueueId;
    }

    return result;
  }

  private static configureDefinition(
    def: ReleaseDefinition,
    packageName: string,
    path: string,
  ) {
    const result: ReleaseDefinition = { ...def };
    result.name = `${packageName} Release`;
    result.path = path;
    result.releaseNameFormat = `${packageName} $(Build.BuildNumber) - Release $(Rev:r)`;

    return result;
  }
}
