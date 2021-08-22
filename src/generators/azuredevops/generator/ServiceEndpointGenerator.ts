import { ServiceEndpoint } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';
import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi';
import ciEnvironment from '../definitions/serviceendpoints/ci-environment.json';
import { IGenerator } from './IGenerator.js';

export class ServiceEndpointGenerator implements IGenerator<ServiceEndpoint> {
  public readonly createdObjects: ServiceEndpoint[];

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
    ciUrl: string,
    tenantId: string,
    applicationId: string,
    clientSecret: string,
  ): Promise<ServiceEndpoint> {
    this.log('Generating service connections...');
    const serviceEndpoint = this.generateServiceEndpoint(packageName, ciUrl, tenantId, applicationId, clientSecret);
    const def = await this.conn.createServiceEndpoint(serviceEndpoint, project);

    if (def === undefined) {
      throw new Error('An error occurred while creating service connections.');
    }

    this.createdObjects.push(def);

    return def;
  }

  public async rollback(project: string): Promise<void> {
    this.log(
      `Rolling back ${this.createdObjects.length} service connections...`,
    );

    await Promise.all(
      this.createdObjects.map((obj) => this.conn.deleteServiceEndpoint(project, obj.id!)),
    );
    this.createdObjects.length = 0;
  }

  private async createServiceEndpoint(
    project: string,
    endpoint: ServiceEndpoint,
  ): Promise<ServiceEndpoint> {
    return this.conn.createServiceEndpoint(endpoint, project);
  }

  private generateServiceEndpoint(
    packageName: string,
    ciUrl: string,
    tenantId: string,
    applicationId: string,
    clientSecret: string,
  ): ServiceEndpoint {
    const endpoint: ServiceEndpoint = JSON.parse(JSON.stringify(ciEnvironment));

    endpoint.name = `CI Environment - ${packageName}`;
    endpoint.url = ciUrl;
    endpoint.authorization!.parameters!.tenantId = tenantId;
    endpoint.authorization!.parameters!.applicationId = applicationId;
    endpoint.authorization!.parameters!.clientSecret = clientSecret;

    return endpoint;
  }
}
