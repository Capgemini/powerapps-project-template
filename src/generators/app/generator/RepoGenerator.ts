import { GitApi } from "azure-devops-node-api/GitApi";
import {
  GitRepository,
  GitRepositoryCreateOptions
} from "azure-devops-node-api/interfaces/GitInterfaces";
import Git from "simple-git/promise";

export class RepoGenerator {
  private readonly conn: GitApi;
  private readonly log: (msg: string) => void;

  constructor(conn: GitApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
  }

  public async generate(
    projectName: string,
    repoName: string,
    repoLocation: string
  ): Promise<GitRepository> {
    this.log("Generating repository...");
    const repo = await this.createRepos(projectName, {
      name: repoName
    });

    if (repo === undefined) {
      throw new Error("An error occurred while creating repository.");
    }

    await this.pushRepo(repoLocation, repo.remoteUrl!);

    return repo;
  }

  private async createRepos(
    project: string,
    repo: GitRepositoryCreateOptions
  ): Promise<GitRepository> {
    this.log(`Creating ${repo.name} repository...`);
    return this.conn.createRepository(repo, project);
  }

  private async pushRepo(repoLocation: string, gitUrl: string) {
    this.log(`Pushing initial commit to ${gitUrl}`);

    const repo = Git(repoLocation);
    return repo
      .init()
      .then(() => repo.add("."))
      .then(() => repo.commit("Initial commit from template."))
      .then(() => repo.remote(["add", "origin", gitUrl]))
      .then(() => repo.push("origin", "master", { "-u": true }));
  }
}
