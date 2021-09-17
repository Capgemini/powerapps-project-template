import { BuildApi } from 'azure-devops-node-api/BuildApi';
import { BuildDefinition } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import glob from 'glob-promise';
import { parse } from 'path';
import buildDef from '../definitions/build/build.json';
import { IGenerator } from './IGenerator.js';

function getBuildDefinitionName(yamlPath: string) {
  const path = parse(yamlPath);

  return path.name === 'azure-pipelines'
    ? 'Package Build'
    : path.name
      .replace('azure-pipelines-', '')
      .replace(/-/g, ' ')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export default class BuildGenerator implements IGenerator<BuildDefinition> {
  public readonly createdObjects: BuildDefinition[];

  private readonly conn: BuildApi;

  private readonly log: (msg: string) => void;

  constructor(conn: BuildApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
    this.createdObjects = [];
  }

  public async generate(
    packageDirectory: string,
    project: string,
    packageName: string,
    repoId: string,
  ): Promise<BuildDefinition[]> {
    this.log('Generating builds definitions...');
    const yamlDetails = await this.getYamlDetails(packageDirectory);
    const buildDefs = await this.createBuildDefinitions(
      project,
      yamlDetails.map((yaml) => this.generateBuildDefinition(yaml, packageName, repoId)),
    );

    if (buildDefs === undefined) {
      throw new Error('An error occurred while creating build definitions.');
    }

    this.createdObjects.push(...buildDefs);

    return buildDefs;
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} build definitions...`);

    await Promise.all(
      this.createdObjects.map((obj) => this.conn.deleteDefinition(obj.id!, project)),
    );
    this.createdObjects.length = 0;
  }

  private async getYamlDetails(packageDirectory: string) {
    return glob('pipelines/*.yml', { cwd: `${packageDirectory}` }).then((files) => {
      this.log(`Found ${files.length} YAML builds.`);
      return files;
    });
  }

  private async createBuildDefinitions(
    project: string,
    definitions: BuildDefinition[],
  ) {
    const createDefinitionPromises = definitions
      .map((def) => this.conn.createDefinition(def, project));

    return Promise.all(createDefinitionPromises);
  }

  private generateBuildDefinition(
    yamlPath: string,
    packageName: string,
    repoId: string,
  ): BuildDefinition {
    this.log(`Creating ${yamlPath} build...`);
    const def: BuildDefinition = JSON.parse(JSON.stringify(buildDef));
    const buildDefinitionName = getBuildDefinitionName(yamlPath);
    def.name = `${packageName} - ${buildDefinitionName}`;
    const process: BuildProcess = {
      type: 2,
      yamlFilename: yamlPath,
    };
    def.process = process;
    def.repository!.id = repoId;
    def.path = packageName.replace(/\s/g, '');
    def.variableGroups = [];

    return def;
  }
}
