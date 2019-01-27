import {
  BuildDefinition,
  VariableGroup
} from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ReleaseDefinition } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { ServiceEndpoint } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { GitRepository } from "azure-devops-node-api/interfaces/TfvcInterfaces";

export interface IScaffoldResult {
  serviceEndpoints: ServiceEndpoint[];
  buildDefinitions: BuildDefinition[];
  releaseDefinitions: ReleaseDefinition[];
  repositories: GitRepository;
  variableGroups: VariableGroup[];
}
