import { VariableGroup } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import azDevCapUk from "../definitions/variablegroups/azure-devops-capgemini-uk.json";
import cake from "../definitions/variablegroups/cake.json";
import envCi from "../definitions/variablegroups/environment-ci.json";
import { IGenerator } from "./IGenerator.js";

export class VarGroupGenerator implements IGenerator<VariableGroup> {
  public readonly createdObjects: VariableGroup[];

  private readonly conn: ITaskAgentApi;
  private readonly log: (msg: string) => void;

  constructor(conn: ITaskAgentApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
    this.createdObjects = [];
  }

  public async generate(
    project: string,
    packageName: string,
    ciEnvironmentUrl?: string,
    capUkPackageReadKey?: string,
    serviceAccountUsername?: string,
    serviceAccountPassword?: string,
  ): Promise<VariableGroup[]> {
    this.log("Generating variable groups...");

    const groupsToCreate = this.generateVariableGroups(
      packageName,
      ciEnvironmentUrl,
      capUkPackageReadKey,
      serviceAccountUsername,
      serviceAccountPassword
    );

    const varGroups = await this.createVariableGroups(project, groupsToCreate);
    this.createdObjects.push(...varGroups);

    if (ciEnvironmentUrl && capUkPackageReadKey && serviceAccountPassword && serviceAccountUsername) {
      return varGroups;
    }

    const existingGroups: string[] = [];

    if (!ciEnvironmentUrl) {
      existingGroups.push(envCi.name);
    }
    if (!capUkPackageReadKey) {
      existingGroups.push(azDevCapUk.name);
    }
    if (!serviceAccountPassword) {
      existingGroups.push(cake.name)
    }

    varGroups.push(...(await this.getExistingGroups(project, existingGroups)));

    return varGroups;
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} variable groups...`);
    await Promise.all(
      this.createdObjects.map(obj =>
        this.conn.deleteVariableGroup(project, obj.id!)
      )
    );
    this.createdObjects.length = 0;
    return;
  }

  private async getExistingGroups(
    project: string,
    groups: string[]
  ): Promise<VariableGroup[]> {
    this.log(`Using existing variable groups for: ${groups.join(", ")}`);

    const existingGroups = await this.conn.getVariableGroups(project);
    return groups.map(name => existingGroups.find(grp => grp.name === name)!);
  }

  private generateVariableGroups(
    packageName: string,
    ciEnvironmentUrl?: string,
    capUkPackageReadKey?: string,
    serviceAccountUsername?: string,
    serviceAccountPassword?: string
  ): VariableGroup[] {
    const groups: VariableGroup[] = [];

    if (ciEnvironmentUrl) {
      envCi.variables.url.value = ciEnvironmentUrl;
      envCi.variables.username.value = serviceAccountUsername!;
      envCi.variables.password.value = serviceAccountPassword!;
      envCi.variables.connectionString.value = "Url=$(url); Username=$(username); Password=$(password); AuthType=Office365";
      groups.push(envCi);
    }

    if (capUkPackageReadKey) {
      azDevCapUk.variables.capgeminiUkPackageReadKey.value = capUkPackageReadKey;
      groups.push(azDevCapUk);
    }

    if (serviceAccountPassword) {
      cake.variables.dynamicsPassword.value = serviceAccountPassword;
      groups.push(cake);
    }

    return groups;
  }

  private async createVariableGroups(
    project: string,
    groups: VariableGroupParameters[]
  ): Promise<VariableGroup[]> {
    return Promise.all(
      groups.map(group => {
        this.log(`Creating ${group.name} variable group...`);
        return this.conn.addVariableGroup(group, project);
      })
    );
  }
}
