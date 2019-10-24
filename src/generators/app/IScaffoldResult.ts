import {
  BuildDefinition,
  VariableGroup
} from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ReleaseDefinition } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { GitRepository } from "azure-devops-node-api/interfaces/TfvcInterfaces";

export interface IScaffoldResult {
  buildDefinitions: BuildDefinition[];
  releaseDefinition: ReleaseDefinition;
  repositories: GitRepository;
  variableGroups: VariableGroup[];
}
