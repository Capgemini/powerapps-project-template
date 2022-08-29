import { GitApi } from 'azure-devops-node-api/GitApi';
import {
  GitRepository,
  GitRepositoryCreateOptions,
} from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as fs from 'fs';
import Git from 'simple-git';
import { IGenerator } from './IGenerator';

export default class RepoGenerator implements IGenerator<GitRepository> {
  public readonly createdObjects: GitRepository[];

  private readonly conn: GitApi;

  private readonly log: (msg: string) => void;

  private repoLocation: string;

  constructor(conn: GitApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
    this.createdObjects = [];
    this.repoLocation = '';
  }

  public async generate(
    projectName: string,
    repoName: string,
    repoLocation: string,
    adoToken: string,
  ): Promise<GitRepository> {
    this.log('Generating repository...');
    this.repoLocation = repoLocation;

    const repo = await this.createRepo(projectName, {
      name: repoName,
    });

    if (repo === undefined) {
      throw new Error('An error occurred while creating repository.');
    }

    const orgName = repo.remoteUrl!.split('/')[3].split('.')[0];
    const repoUrl = `https://${orgName}:${adoToken}@dev.azure.com/${orgName}/${encodeURIComponent(projectName)}/_git/${repoName}`;

    await this.pushRepo(repoLocation, repoUrl);

    return repo;
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} repositories...`);

    await Promise.all(
      this.createdObjects.map((obj) => this.conn.deleteRepository(obj.id!, project)),
    );

    if (this.repoLocation && fs.existsSync(`${this.repoLocation}/.git`)) {
      this.log('Deleting the .git directory...');
      // @ts-ignore The second argument is allowed but the type definition hasn't been updated.
      await fs.promises.rmdir(`${this.repoLocation}/.git`, { recursive: true });
    }

    this.createdObjects.length = 0;
  }

  private async createRepo(
    project: string,
    repo: GitRepositoryCreateOptions,
  ): Promise<GitRepository> {
    this.log(`Creating ${repo.name} repository...`);
    const repository = await this.conn.createRepository(repo, project);
    this.createdObjects.push(repository);

    return repository;
  }

  private async pushRepo(repoLocation: string, gitUrl: string) {
    this.log(`Pushing initial commit to ${gitUrl}`);

    const repo = Git(repoLocation);
    return repo
      .init(['--initial-branch', 'master'])
      .then(() => repo.add('.'))
      .then(() => repo.commit('Initial commit from template.'))
      .then(() => repo.remote(['add', 'origin', gitUrl]))
      .then(() => repo.push('origin', undefined, ['--set-upstream', '--all']));
  }
}
