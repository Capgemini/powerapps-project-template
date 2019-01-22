import * as azdev from "azure-devops-node-api";
import { BuildDefinition, BuildProcess } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { ReleaseDefinition, ReleaseDefinitionEnvironment } from "azure-devops-node-api/interfaces/ReleaseInterfaces";

export interface BuildProcess {
  yamlFilename?: string;
}

export interface DeployPhase {
  deploymentInput?: {
    queueId?: number
  };
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

  public async getProjectId(projectName: string) {
    return this.getProjects().then(projects => projects.filter(project => project.name === projectName)[0].id);
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

  public async createReleaseDefinitions(project: string, definitions: ReleaseDefinition[]) {
    await this.installExtension("WaelHamze", "xrm-ci-framework-build-tasks");

    this.log(`Creating ${definitions.length} release definitions...`)

    let release = await this.connection.getReleaseApi();
    let results = await Promise.all(
      definitions.map(definition =>
        release.createReleaseDefinition(definition, project))
    );

    return results;
  };

  async installExtension(publisherName: string, extensionName: string) {
    this.log(`Installing '${extensionName}' from '${publisherName}' extension...`);

    let extentsion = await this.connection.getExtensionManagementApi();

    try {
      await extentsion.installExtensionByName(publisherName, extensionName);
    } catch (e) {
      if (e.message.includes("already installed"))
        this.log(`  Extension already installed.`)
      else
        throw e;
    }
  };

  public generateBuildDefinition(
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

  public generateReleaseDefinitionFromTemplate(
    solution: string,
    variableGroupIds: number[],
    projectId: string,
    definitionId: number,
    agentPoolQueueId: number
  ): ReleaseDefinition {
    return {
      name: `${solution} - CD Release`,
      variables: {
        SolutionName: {
          value: solution.replace(/\./g, "_")
        }
      },
      variableGroups: variableGroupIds,
      environments: [
        {
          name: "Import Solution",
          queueId: agentPoolQueueId,
          retentionPolicy: {
            daysToKeep: 30,
            releasesToKeep: 3,
            retainBuild: true
          },
          preDeployApprovals: {
            approvals: [
              {
                rank: 1,
                isAutomated: true,
                isNotificationOn: false,
                id: 1
              }
            ]
          },
          postDeployApprovals: {
            approvals: [
              {
                rank: 1,
                isAutomated: true,
                isNotificationOn: false,
                id: 1
              }
            ]
          },
          deployPhases: [
            {
              rank: 1,
              phaseType: 1,
              name: "Agent job",
              workflowTasks: [
                {
                  taskId: "04ad1c72-5e49-4686-8a3a-dda6948b0fcd",
                  version: "9.*",
                  enabled: true,
                },
                {
                  taskId: "4455576d-d40a-4234-ad75-3d7ff40ec76e",
                  version: "11.*",
                  enabled: true,
                  inputs: {
                    crmConnectionString: "$(ConnectionString)",
                    solutionFile: "$(System.DefaultWorkingDirectory)/Core/Solutions/$(SolutionName)_managed.zip",
                    publishWorkflows: "false",
                    overwriteUnmanagedCustomizations: "false",
                    skipProductUpdateDependencies: "false",
                    convertToManaged: "true",
                    holdingSolution: "false",
                    override: "false",
                    useAsyncMode: "true",
                    asyncWaitTimeout: "900",
                    crmConnectionTimeout: "120"
                  }
                }
              ],
              deploymentInput: {
                queueId: agentPoolQueueId
              }
            } as DeployPhase
          ],
        } as ReleaseDefinitionEnvironment
      ],
      artifacts: [
        {
          type: "Build",
          alias: solution,
          definitionReference: {
            project: { id: projectId },
            definition: { id: definitionId.toString() },
            defaultVersionType: { id: "latestType" },
          },
        }
      ]
    }
  }
}
