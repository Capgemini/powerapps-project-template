import { IPackageDetails } from "./IPackageDetails";

export interface IScaffoldSettings {
  project: string;
  client: string;
  package: IPackageDetails;
  repo: string;
  connections: {
    ci?: string;
    staging?: string;
  };
  nuget?: string;
}
