import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";
import {
  ArtifactSourceTrigger,
  ReleaseDefinition
} from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { ReleaseApi } from "azure-devops-node-api/ReleaseApi";
import releaseDefinition from "../definitions/release/solution-cd.json";

export class ReleaseGenerator {
  private readonly conn: ReleaseApi;
  private readonly log: (msg: string) => void;

  constructor(conn: ReleaseApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
  }

  public async generate(
    projectName: string,
    projectId: string,
    buildDefs: BuildDefinition[],
    varGroupIds: number[]
  ): Promise<ReleaseDefinition[]> {
    this.log("Generating release definitions...");
    const defs = await this.createReleaseDefinitions(
      projectName,

      buildDefs.map(buildDef =>
        this.generateReleaseDefinition(
          buildDef.name!,
          varGroupIds,
          projectId,
          `${buildDef.path!.split("\\")[1]}\\CD`,
          buildDef.id!,
          (buildDefs[0] && buildDefs[0].queue && buildDefs[0].queue.id) || 0
        )
      )
    ).catch(this.log);

    if (defs === undefined) {
      throw new Error("An error occurred while creating release definitions.");
    }

    return defs;
  }

  private async createReleaseDefinitions(
    project: string,
    definitions: ReleaseDefinition[]
  ): Promise<ReleaseDefinition[]> {
    const defs: ReleaseDefinition[] = [];
    for (const def of definitions) {
      defs.push(await this.conn.createReleaseDefinition(def, project));
    }
    return defs;
  }

  private generateReleaseDefinition(
    solution: string,
    variableGroupIds: number[],
    projectId: string,
    path: string,
    definitionId: number,
    agentPoolQueueId: number
  ): ReleaseDefinition {
    this.log(`Creating ${solution} release...`);

    const def: ReleaseDefinition = JSON.parse(
      JSON.stringify(releaseDefinition)
    );
    def.name = `${solution} Release`;
    def.path = path;
    def.variables!.SolutionName.value = solution.replace(/\./g, "_");
    def.variableGroups = variableGroupIds;
    def.environments![0].queueId = agentPoolQueueId;
    (def.environments![0]
      .deployPhases![0] as DeployPhase).deploymentInput!.queueId = agentPoolQueueId;
    def!.artifacts![0].alias = def.variables!.SolutionName.value;
    def!.artifacts![0].definitionReference!.definition.id = definitionId.toString();
    def!.artifacts![0].definitionReference!.project.id = projectId;
    const trigger: ArtifactSourceTrigger = def!.triggers![0];
    trigger.artifactAlias = def!.artifacts![0].alias;
    return def;
  }
}
