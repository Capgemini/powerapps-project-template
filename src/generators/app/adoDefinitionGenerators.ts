import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { ReleaseDefinition, ReleaseDefinitionEnvironment } from "azure-devops-node-api/interfaces/ReleaseInterfaces";

export interface IBuildProcess {
  yamlFilename?: string;
  type?: number;
}

export interface IDeployPhase {
  deploymentInput?: {
    queueId?: number,
  };
}

export function generateBuildDefinition(
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
    } as IBuildProcess,
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

export function generateReleaseDefinitionFromTemplate(
  solution: string,
  variableGroupIds: number[],
  projectId: string,
  definitionId: number,
  agentPoolQueueId: number,
): ReleaseDefinition {
  return {
    artifacts: [
      {
        alias: solution,
        definitionReference: {
          defaultVersionType: { id: "latestType" },
          definition: { id: definitionId.toString() },
          project: { id: projectId },
        },
        type: "Build",
      },
    ],
    environments: [
      {
        deployPhases: [
          {
            deploymentInput: {
              queueId: agentPoolQueueId,
            },
            name: "Agent job",
            phaseType: 1,
            rank: 1,
            workflowTasks: [
              {
                enabled: true,
                taskId: "04ad1c72-5e49-4686-8a3a-dda6948b0fcd",
                version: "9.*",
              },
              {
                enabled: true,
                inputs: {
                  asyncWaitTimeout: "900",
                  convertToManaged: "true",
                  crmConnectionString: "$(ConnectionString)",
                  crmConnectionTimeout: "120",
                  holdingSolution: "false",
                  override: "false",
                  overwriteUnmanagedCustomizations: "false",
                  publishWorkflows: "false",
                  skipProductUpdateDependencies: "false",
                  solutionFile: "$(System.DefaultWorkingDirectory)/Core/Solutions/$(SolutionName)_managed.zip",
                  useAsyncMode: "true",
                },
                taskId: "4455576d-d40a-4234-ad75-3d7ff40ec76e",
                version: "11.*",
              },
            ],
          } as IDeployPhase,
        ],
        name: "Import Solution",
        postDeployApprovals: {
          approvals: [
            {
              id: 1,
              isAutomated: true,
              isNotificationOn: false,
              rank: 1,
            },
          ],
        },
        preDeployApprovals: {
          approvals: [
            {
              id: 1,
              isAutomated: true,
              isNotificationOn: false,
              rank: 1,
            },
          ],
        },
        queueId: agentPoolQueueId,
        retentionPolicy: {
          daysToKeep: 30,
          releasesToKeep: 3,
          retainBuild: true,
        },
      } as ReleaseDefinitionEnvironment,
    ],
    name: `${solution} - CD Release`,
    variableGroups: variableGroupIds,
    variables: {
      SolutionName: {
        value: solution.replace(/\./g, "_"),
      },
    },
  };
}
