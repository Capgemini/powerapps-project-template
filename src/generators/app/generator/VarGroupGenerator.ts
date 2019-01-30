import { VariableGroup } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import azDevCapUk from "../definitions/variablegroups/azure-devops-capgemini-uk.json";
import azDev from "../definitions/variablegroups/azure-devops.json";
import env from "../definitions/variablegroups/environment.json";
import pkg from "../definitions/variablegroups/pkg.json";
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
    ciConn?: string,
    nuget?: string,
    git?: string
  ): Promise<VariableGroup[]> {
    this.log("Generating variable groups...");

    const groupsToCreate = this.generateVariableGroups(
      packageName,
      ciConn,
      nuget,
      git
    );

    const varGroups = await this.createVariableGroups(project, groupsToCreate);
    this.createdObjects.push(...varGroups);

    if (ciConn && nuget && git) {
      return varGroups;
    }

    const existingGroups: string[] = [];

    if (!ciConn) {
      existingGroups.push(env.name);
    }
    if (!nuget) {
      existingGroups.push(azDevCapUk.name);
    }
    if (!git) {
      existingGroups.push(azDev.name);
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
    ciConn?: string,
    nuget?: string,
    git?: string
  ): VariableGroup[] {
    const groups: VariableGroup[] = [pkg];
    pkg.name = `Package - ${packageName}`;
    if (ciConn) {
      env.variables.ConnectionString.value = ciConn;
      groups.push(env);
    }
    if (nuget) {
      azDevCapUk.variables.CapgeminiUkPackageReadKey.value = nuget;
      groups.push(azDevCapUk);
    }
    if (git) {
      azDev.variables.GitAuthToken.value = git;
      groups.push(azDev);
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
