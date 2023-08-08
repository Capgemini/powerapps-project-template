import { ExtensionManagementApi } from 'azure-devops-node-api/ExtensionManagementApi';
import { sleep } from '../../../common/utilities';
import extensions from '../definitions/extensions.json';
import { IGenerator } from './IGenerator';

export default class ExtensionGenerator implements IGenerator<{ publisher: string; name: string }> {
  public readonly createdObjects: Array<{
    publisher: string;
    name: string;
  }>;

  private readonly conn: ExtensionManagementApi;

  private readonly log: (msg: string) => void;

  constructor(conn: ExtensionManagementApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
    this.createdObjects = [];
  }

  public async generate() {
    const installedExtensions = await this.conn.getInstalledExtensions();

    const uninstalledExtensions = extensions.filter((extension) => {
      const installed = installedExtensions
        // eslint-disable-next-line max-len
        .find((ext) => ext.extensionId === extension.name && ext.publisherId === extension.publisher) !== undefined;

      if (installed) {
        this.log(`Extension: ${extension.name} is already installed.`);
      }

      return !installed;
    });

    const installPromises: Array<Promise<void> | undefined> = uninstalledExtensions
      .map((extension) => this.installExtension(extension.publisher, extension.name));

    try {
      await Promise.all(installPromises);
    } catch (e) {
      this.log('Installing extensions failed. This is likely due to your user (who generated the PAC token) not having permissions to install extensions into this organisation. Please request the following extensions and wait for the install.');
      uninstalledExtensions.forEach((x) => this.log(`- https://marketplace.visualstudio.com/items?itemName=${x.publisher}.${x.name}`));
      throw e;
    }

    if (installPromises.length > 0) {
      this.log('Waiting 1 minute for the extension(s) to fully install.');
      const ONE_MINUTE = 1 * 60 * 1000;
      await sleep(ONE_MINUTE);
    }
  }

  public async rollback(): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} extensions...`);

    await Promise.all(
      this.createdObjects.map((obj) => this.conn.uninstallExtensionByName(obj.publisher, obj.name)),
    );
    this.createdObjects.length = 0;
  }

  private async installExtension(publisher: string, name: string) {
    this.log(
      `Installing '${name}' from '${publisher}' extension...`,
    );

    await this.conn.installExtensionByName(publisher, name);
    this.createdObjects.push({ publisher, name });
  }
}
