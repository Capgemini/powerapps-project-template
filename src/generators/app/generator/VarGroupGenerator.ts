import { VariableGroup } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";

export class VarGroupGenerator {
  private readonly conn: ITaskAgentApi;
  private readonly log: (msg: string) => void;

  constructor(conn: ITaskAgentApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
  }

  public async generate(
    projectName: string,
    packageName: string,
    nugetToken: string,
    gitToken: string,
    ciConnString: string
  ): Promise<VariableGroup[]> {
    this.log("Generating variable groups...");
    const varGroups = await this.createVariableGroups(projectName, [
      {
        name: "Azure DevOps - Capgemini UK",
        variables: {
          CapgeminiUkPackageReadKey: {
            isSecret: true,
            value: nugetToken
          }
        }
      },
      {
        name: "Azure DevOps",
        variables: {
          GitAuthToken: { value: gitToken, isSecret: true }
        }
      },
      {
        name: `Package - ${packageName}`,
        variables: { packageVersion: { value: "0.1" } }
      },
      {
        name: "Environment - CI",
        variables: {
          ConnectionString: {
            value: ciConnString
          }
        }
      }
    ]).catch(this.log);

    if (varGroups === undefined) {
      throw new Error("An error occured while creating variable groups.");
    }

    return varGroups;
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
