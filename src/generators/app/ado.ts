import * as azdev from "azure-devops-node-api";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";

export interface NewBuildDefinition extends BuildDefinition {
    process: { type: number, yamlFilename: string }
 }

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
                variables: { "CapgeminiUkPackageReadKey": { value: "", isSecret: true } }
            },
            {
                name: "Azure DevOps",
                variables: { "GitAuthToken": { value: "", isSecret: true } }
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

    createBuildDefinition(solution: string, ymlFile: string, repoId: string, variableGroupIds: number[]): NewBuildDefinition {
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
    }
}

let orgUrl = "https://tdashworth-cap.visualstudio.com",
    project = "JiraSyncTesting",
    token = "gts67v2cwohoasxkbjwiczbyqx7boqmszo7duq7owe3mo6o7b73a";