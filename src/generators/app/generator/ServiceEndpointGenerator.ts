import { ServiceEndpoint } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import capgeminiIp from "../definitions/serviceendpoints/capgemini-ip.json";
import { IGenerator } from "./IGenerator.js";

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
    nuget?: string
  ): Promise<ServiceEndpoint[]> {
    this.log("Generating service endpoints...");

    if (!nuget) {
      return this.getExistingServiceEndpoints(project);
    }

    const serviceEndpoints = await Promise.all(
      this.createServiceEndpoints(nuget).map(serviceEndpoint =>
        this.conn.createServiceEndpoint(serviceEndpoint, project)
      )
    );

    this.createdObjects.push(...serviceEndpoints);

    return serviceEndpoints;
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} service endpoint...`);

    await Promise.all(
      this.createdObjects.map(obj =>
        this.conn.deleteServiceEndpoint(project, obj.id!)
      )
    );
    this.createdObjects.length = 0;
    return;
  }

  private async getExistingServiceEndpoints(project: string) {
    this.log(`Using existing service endpoint for: ${capgeminiIp.name}`);

    return this.conn.getServiceEndpointsByNames(project, [capgeminiIp.name]);
  }

  private createServiceEndpoints(nugetToken: string): ServiceEndpoint[] {
    const def: ServiceEndpoint = capgeminiIp;
    def.authorization!.parameters = {
      apitoken: nugetToken
    };

    return [def];
  }
}
