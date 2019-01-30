import { IPackageDetails } from "./IPackageDetails";

export interface IScaffoldSettings {
  project: string;
  package: IPackageDetails;
  repo: string;
  connections: {
    ci?: string;
  };
  git?: string;
  nuget?: string;
}
