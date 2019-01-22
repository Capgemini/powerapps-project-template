import * as azdev from "azure-devops-node-api";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";
import { ReleaseDefinition, DeployPhase, ReleaseDefinitionEnvironment } from "azure-devops-node-api/interfaces/ReleaseInterfaces";

export interface NewBuildDefinition extends BuildDefinition {
  process: { type: number, yamlFilename: string }
}

export interface NewDeployPhase extends DeployPhase {
  deploymentInput: {
    queueId: number
  }
}

export interface NewReleaseDefinitionEnvironment extends ReleaseDefinitionEnvironment {
  deployPhases: NewDeployPhase[]
}

export interface NewReleaseDefinition extends ReleaseDefinition {
  environments: NewReleaseDefinitionEnvironment[]
};

export default class AzureDevOps {
  connection: azdev.WebApi;
  project: string;
  log: any;

  constructor(apiUrl: string, project: string, token: string, log: any) {
    this.project = project;
    this.log = log;

    this.log("Connecting to Azure DevOps...")
    let authHandler = azdev.getPersonalAccessTokenHandler(token);
    this.connection = new azdev.WebApi(apiUrl, authHandler);
  };

  async createVariableGroups(groups?: VariableGroupParameters[]) {
    groups = groups || [
      {
        name: "Azure DevOps - Capgemini UK",
        variables: { CapgeminiUkPackageReadKey: { value: "", isSecret: true } }
      },
      {
        name: "Azure DevOps",
        variables: { GitAuthToken: { value: "", isSecret: true } }
      }
    ];

    try {
      this.log(`Creating ${groups.length} variable groups...`)

      let task = await this.connection.getTaskAgentApi();
      let results = await Promise.all(
        groups.map(group => task.addVariableGroup(group, this.project))
      );

      return results;
    } catch (e) { throw e };
  };

  async createRepos(repos: GitRepositoryCreateOptions[]) {
    try {
      this.log(`Creating ${repos.length} repositories...`)

      let git = await this.connection.getGitApi();
      let results = await Promise.all(
        repos.map(repo => git.createRepository(repo, this.project))
      );

      return results;
    } catch (e) { throw e }
  }

  async createBuildDefinitions(definitions: NewBuildDefinition[]) {
    try {
      this.log(`Creating ${definitions.length} build definitions...`)

      let build = await this.connection.getBuildApi();
      let results = await Promise.all(
        definitions.map(definition => build.createDefinition(definition, this.project))
      );

      return results;
    } catch (e) { throw e }
  };

  async createReleaseDefinitions(definitions: NewReleaseDefinition[]) {
    try {
      await this.installExtension("WaelHamze", "xrm-ci-framework-build-tasks");

      this.log(`Creating ${definitions.length} release definitions...`)
      let release = await this.connection.getReleaseApi();
      let results = await Promise.all(
        definitions.map(definition => release.createReleaseDefinition(definition, this.project))
      );

      return results;
    } catch (e) { throw e }
  };

  async installExtension(publisherName: string, extensionName: string) {
    try {
      this.log(`Installing '${extensionName}' from '${publisherName}' extension...`)
      let extentsion = await this.connection.getExtensionManagementApi();
      await extentsion.installExtensionByName(publisherName, extensionName);
    } catch (e) {
      if (e.message.includes("already installed"))
        this.log(`  Extension already installed.`)
      else
        console.error(e);
    }
  };

  async getProjectId() {
    return this.connection.getCoreApi()
      .then(core => core.getProjects())
      .then(projects => projects.filter(project => project.name === this.project)[0].id);
  }

  Helper = {
    generateBuildDefinitionFromTemplate(
      solution: string,
      ymlFile: string,
      repoId: string,
      variableGroupIds: number[]
    ): NewBuildDefinition {
      return {
        options: [],
        triggers: [],
        variables: {
          BuildConfiguration: {
            value: "release",
            allowOverride: true
          },
          BuildPlatform: {
            value: "any cpu",
            allowOverride: true
          }
        },
        retentionRules: [],
        properties: {},
        tags: [],
        buildNumberFormat: "$(date:yyyyMMdd)$(rev:.r)",
        jobAuthorizationScope: 1,
        jobTimeoutInMinutes: 60,
        jobCancelTimeoutInMinutes: 5,
        process: {
          type: 2,
          yamlFilename: ymlFile
        },
        repository: {
          properties: {
            labelSources: "0",
            reportBuildStatus: "true",
            fetchDepth: "0",
            gitLfsSupport: "false",
            skipSyncSource: "false",
            cleanOptions: "3",
            labelSourcesFormat: "$(build.buildNumber)",
            checkoutNestedSubmodules: "false"
          },
          id: repoId,
          type: "TfsGit",
          defaultBranch: "refs/heads/master",
          clean: "true",
          checkoutSubmodules: false
        },
        quality: 1,
        drafts: [],
        queue: { name: "Hosted VS2017" },
        name: `${solution} - CI`,
        path: "\\CI Builds",
        type: 2,
        queueStatus: 0,
        variableGroups: variableGroupIds.map(groupId => ({ id: groupId }))
      }
    },

    generateReleaseDefinitionFromTemplate(
      solution: string,
      variableGroupIds: number[],
      projectId: string,
      definitionId: number,
      agentPoolQueueId: number
    ): NewReleaseDefinition {
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
              }
            ],
          }
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
}