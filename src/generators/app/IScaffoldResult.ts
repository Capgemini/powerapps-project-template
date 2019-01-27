import {
  BuildDefinition,
  VariableGroup
} from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ReleaseDefinition } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { GitRepository } from "azure-devops-node-api/interfaces/TfvcInterfaces";

export interface IScaffoldResult {
  buildDefinitions: BuildDefinition[];
  releaseDefinitions: ReleaseDefinition[];
  repositories: GitRepository;
  variableGroups: VariableGroup[];
}
