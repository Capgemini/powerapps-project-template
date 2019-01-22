import * as azdev from "azure-devops-node-api";
import { BuildDefinition, BuildProcess } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";

// tslint:disable-next-line:interface-name
export interface BuildProcess {
  yamlFilename?: string;
}

export default class AzureDevOps {
  private connection: azdev.WebApi;
  private log: (message: string) => void;

  constructor(apiUrl: string, token: string, log: (message: string) => void) {
    this.log = log;
    this.log("Connecting to Azure DevOps...");
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    this.connection = new azdev.WebApi(apiUrl, authHandler);
  }

  public async getProjects() {
    return this.connection.getCoreApi().then((api) => api.getProjects());
  }

  public async createVariableGroups(
    project: string,
    groups: VariableGroupParameters[],
  ) {
    groups = groups || [
      {
        name: "Azure DevOps - Capgemini UK",
        variables: { CapgeminiUkPackageReadKey: { value: "", isSecret: true } },
      },
      {
        name: "Azure DevOps",
        variables: { GitAuthToken: { value: "", isSecret: true } },
      },
    ];

    this.log(`Creating ${groups.length} variable groups...`);

    const task = await this.connection.getTaskAgentApi();
    const results = await Promise.all(
      groups.map((group) => task.addVariableGroup(group, project)),
    );

    return results;
  }

  public async createRepos(project: string, repos: GitRepositoryCreateOptions[]) {
    this.log(`Creating ${repos.length} repositories...`);

    const git = await this.connection.getGitApi();
    const results = await Promise.all(
      repos.map((repo) => git.createRepository(repo, project)),
    );

    return results;
  }

  public async createBuildDefinitions(
    project: string,
    definitions: BuildDefinition[],
  ) {
    this.log(`Creating ${definitions.length} build definitions...`);

    const build = await this.connection.getBuildApi();
    const results = await Promise.all(
      definitions.map((definition) =>
        build.createDefinition(definition, project),
      ),
    );

    return results;
  }

  public createBuildDefinition(
    solution: string,
    ymlFile: string,
    repoId: string,
    variableGroupIds: number[],
  ): BuildDefinition {
    return {
      buildNumberFormat: "$(date:yyyyMMdd)$(rev:.r)",
      name: `${solution} - CI`,
      path: "\\CI Builds",
      process: {
        type: 2,
        yamlFilename: ymlFile,
      } as BuildProcess,
      quality: 1,
      queue: { name: "Hosted VS2017" },
      queueStatus: 0,
      repository: {
        checkoutSubmodules: false,
        clean: "true",
        defaultBranch: "refs/heads/master",
        id: repoId,
        properties: {
          checkoutNestedSubmodules: "false",
          cleanOptions: "3",
          fetchDepth: "0",
          gitLfsSupport: "false",
          labelSources: "0",
          labelSourcesFormat: "$(build.buildNumber)",
          reportBuildStatus: "true",
          skipSyncSource: "false",
        },
        type: "TfsGit",
      },
      type: 2,
      variableGroups: variableGroupIds.map((groupId) => ({ id: groupId })),
      variables: {
        BuildConfiguration: {
          allowOverride: true,
          value: "release",
        },
        BuildPlatform: {
          allowOverride: true,
          value: "any cpu",
        },
      },
    };
  }
}
