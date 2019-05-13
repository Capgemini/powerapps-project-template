import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";
import {
  ArtifactSourceTrigger,
  ReleaseDefinition,
  ReleaseDefinitionEnvironment,
  WorkflowTask,
  Artifact
} from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { ReleaseApi } from "azure-devops-node-api/ReleaseApi";
import releaseDefinition from "../definitions/release/release.json";
import { IGenerator } from "./IGenerator.js";

export class ReleaseGenerator implements IGenerator<ReleaseDefinition> {
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
    varGroupIds: number[]
  ): Promise<ReleaseDefinition> {
    this.log("Generating release definition...");
    const def = await this.createReleaseDefinition(
      project,
      this.generateReleaseDefinition(
        packageName,
        varGroupIds,
        projectId,
        client,
        `${buildDef.path!.split("\\")[1]}\\CD`,
        buildDef.id!,
        (buildDef && buildDef.queue && buildDef.queue.id) || 0
      )
    ).catch(this.log);

    if (def === undefined) {
      throw new Error("An error occurred while creating release definitions.");
    }

    this.createdObjects.push(def);

    return def;
  }

  public async rollback(project: string): Promise<void> {
    this.log(
      `Rolling back ${this.createdObjects.length} releases definitions...`
    );

    await Promise.all(
      this.createdObjects.map(obj =>
        this.conn.deleteReleaseDefinition(project, obj.id!)
      )
    );
    this.createdObjects.length = 0;
    return;
  }

  private async createReleaseDefinition(
    project: string,
    def: ReleaseDefinition
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
    agentPoolQueueId: number
  ): ReleaseDefinition {
    this.log(`Creating ${packageName} release...`);

    const def: ReleaseDefinition = JSON.parse(
      JSON.stringify(releaseDefinition)
    );
    this.configureDefinition(def, packageName, path, variableGroupIds);
    this.configureEnvironment(def.environments![0], agentPoolQueueId);
    const packageArtifact = def!.artifacts![0];
    this.configureArtifact(
      packageArtifact,
      packageName,
      definitionId,
      projectId
    );
    const trigger: ArtifactSourceTrigger = def!.triggers![0];
    trigger.artifactAlias = def!.artifacts![0].alias;
    const packageFolder = `$(System.DefaultWorkingDirectory)/${packageName}/${packageName}`;
    const ciDeploymentTasks = def.environments![0].deployPhases![0]
      .workflowTasks!;
    this.configureTasks(ciDeploymentTasks, packageFolder, client, packageName);
    
    return def;
  }

  private configureTasks(
    ciDeploymentTasks: WorkflowTask[],
    packageFolder: string,
    client: string,
    packageName: string
  ) {
    const deployPackageTask = ciDeploymentTasks[0];
    deployPackageTask.inputs!.workingDir = packageFolder;
    deployPackageTask.inputs!.packageName = `${client}.${packageName}.Deployment.dll`;
    deployPackageTask.inputs!.configSubFolder = packageFolder;
    const verifyPackageTask = ciDeploymentTasks[1];
    verifyPackageTask.inputs!.workingDir = packageFolder;
    const importConfigDataTask = ciDeploymentTasks[2];
    importConfigDataTask.inputs!.jsonFolderPath = `${packageFolder}/PkgFolder/Data/Configuration/Extract`;
    importConfigDataTask.inputs!.configFilePath = `${packageFolder}/PkgFolder/Data/Configuration/ConfigurationDataImport.json`;
    const importReferenceDataTask = ciDeploymentTasks[3];
    importReferenceDataTask.inputs!.jsonFolderPath = `${packageFolder}/PkgFolder/Data/Reference/Extract`;
    importReferenceDataTask.inputs!.configFilePath = `${packageFolder}/PkgFolder/Data/Reference/ReferenceDataImport.json`;
    const activateProcessesTask = ciDeploymentTasks[4];
    activateProcessesTask.inputs!.pkgFolderPath = `${packageFolder}/PkgFolder`;
    const importWordTemplateTask = ciDeploymentTasks[5];
    importWordTemplateTask.inputs!.pkgFolderPath = `${packageFolder}/PkgFolder`;
  }

  private configureArtifact(
    packageArtifact: Artifact,
    packageName: string,
    definitionId: number,
    projectId: string
  ) {
    packageArtifact.alias = packageName;
    packageArtifact.definitionReference!.definition.id = definitionId.toString();
    packageArtifact.definitionReference!.project.id = projectId;
  }

  private configureEnvironment(
    environment: ReleaseDefinitionEnvironment,
    agentPoolQueueId: number
  ) {
    environment.queueId = agentPoolQueueId;
    (environment.deployPhases![0] as DeployPhase).deploymentInput!.queueId = agentPoolQueueId;
  }

  private configureDefinition(
    def: ReleaseDefinition,
    packageName: string,
    path: string,
    variableGroupIds: number[]
  ) {
    def.name = `${packageName} Release`;
    def.path = path;
    def.releaseNameFormat = `${packageName} $(Build.BuildNumber) - Release $(Rev:r)`;
    def.variableGroups = variableGroupIds;
  }
}
