import { ServiceEndpoint } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";
import capgeminiIp from "../definitions/serviceendpoints/capgemini-ip.json";

export class ServiceEndpointGenerator {
  private readonly conn: ITaskAgentApi;
  private readonly log: (msg: string) => void;

  constructor(conn: ITaskAgentApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
  }

  public async generate(
    projectName: string,
    nugetToken: string
  ): Promise<ServiceEndpoint[]> {
    this.log("Generating service endpoints...");

    return Promise.all(
      this.createServiceEndpoints(nugetToken).map(serviceEndpoint =>
        this.conn.createServiceEndpoint(serviceEndpoint, projectName)
      )
    );
  }

  private createServiceEndpoints(nugetToken: string): ServiceEndpoint[] {
    const def: ServiceEndpoint = capgeminiIp;
    def.authorization!.parameters = {
      apitoken: nugetToken
    };

    return [def];
  }
}
