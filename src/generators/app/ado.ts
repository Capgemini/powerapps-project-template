import * as azdev from "azure-devops-node-api";
import { BuildDefinition, BuildProcess } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { GitRepositoryCreateOptions } from "azure-devops-node-api/interfaces/GitInterfaces";
import { ReleaseDefinition, ReleaseDefinitionEnvironment } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { VariableGroupParameters } from "azure-devops-node-api/interfaces/TaskAgentInterfaces";

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
    return this.getProjects().then((projects) => projects.filter((project) => project.name === projectName)[0].id);
  }

  public async createVariableGroups(project: string, groups: VariableGroupParameters[]) {
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

  public async createBuildDefinitions(project: string, definitions: BuildDefinition[]) {
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

    this.log(`Creating ${definitions.length} release definitions...`);

    const release = await this.connection.getReleaseApi();
    const results = await Promise.all(
      definitions.map((definition) =>
        release.createReleaseDefinition(definition, project)),
    );

    return results;
  }

  public async installExtension(publisherName: string, extensionName: string) {
    this.log(`Installing '${extensionName}' from '${publisherName}' extension...`);

    const extentsion = await this.connection.getExtensionManagementApi();

    await extentsion.installExtensionByName(publisherName, extensionName)
      .catch((e) => {
        if (e.message.includes("already installed")) { this.log(`  Extension already installed.`); } else { throw e; }
      });
  }
}
