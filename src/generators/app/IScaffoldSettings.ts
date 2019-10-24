import { IPackageDetails } from "./IPackageDetails";

export interface IScaffoldSettings {
  projectName: string;
  clientName: string;
  package: IPackageDetails;
  gitRepository: string;
  serviceAccountUsername?: string;
  serviceAccountPassword?: string;
  ciEnvironmentUrl?: string;
}
