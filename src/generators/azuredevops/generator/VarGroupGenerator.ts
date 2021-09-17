import { VariableGroup } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { VariableGroupParameters } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';
import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi';
import ciEnvironment from '../definitions/variablegroups/ci-environment.json';
import integrationTests from '../definitions/variablegroups/integration-tests.json';
import { IGenerator } from './IGenerator.js';

export default class VarGroupGenerator implements IGenerator<VariableGroup> {
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
    ciEnvironmentUrl: string,
    serviceAccountUsername: string,
    serviceAccountPassword: string,
  ): Promise<VariableGroup[]> {
    this.log('Generating variable groups...');

    const groupsToCreate = VarGroupGenerator.generateVariableGroups(
      packageName,
      ciEnvironmentUrl,
      serviceAccountUsername,
      serviceAccountPassword,
    );

    const varGroups = await this.createVariableGroups(project, groupsToCreate);
    this.createdObjects.push(...varGroups);

    return varGroups;
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} variable groups...`);
    await Promise.all(
      this.createdObjects.map((obj) => this.conn.deleteVariableGroup(project, obj.id!)),
    );
    this.createdObjects.length = 0;
  }

  private static generateVariableGroups(
    packageName: string,
    ciEnvironmentUrl: string,
    serviceAccountUsername: string,
    serviceAccountPassword: string,
  ): VariableGroup[] {
    const groups: VariableGroup[] = [];

    ciEnvironment.name = `CI Environment - ${packageName}`;
    groups.push(ciEnvironment);

    integrationTests.name = `Integration Tests - ${packageName}`;
    integrationTests.variables['CDS Test CDS URL'].value = ciEnvironmentUrl;
    integrationTests.variables['CDS Test Admin Username'].value = serviceAccountUsername;
    integrationTests.variables['CDS Test Admin Password'].value = serviceAccountPassword;
    groups.push(integrationTests);

    return groups;
  }

  private async createVariableGroups(
    project: string,
    groups: VariableGroupParameters[],
  ): Promise<VariableGroup[]> {
    return Promise.all(
      groups.map((group) => {
        this.log(`Creating ${group.name} variable group...`);
        return this.conn.addVariableGroup(group, project);
      }),
    );
  }
}
