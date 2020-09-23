import { ExtensionManagementApi } from "azure-devops-node-api/ExtensionManagementApi";
import extensions from "../definitions/extensions.json";
import { IGenerator } from "./IGenerator";

export class ExtensionGenerator
  implements IGenerator<{ publisher: string; name: string }> {
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
    const installPromises: Array<Promise<void> | undefined> = extensions.map(extension => {
      if (installedExtensions.find(ext => ext.extensionId === extension.name && ext.publisherId === extension.publisher) === undefined) {
        return this.installExtension(extension.publisher, extension.name);
      } else {
        this.log(`Extension: ${extension.name} is already installed.`)
      }
    });
    return Promise.all(installPromises);
  }

  public async rollback(project: string): Promise<void> {
    this.log(`Rolling back ${this.createdObjects.length} extensions...`);

    await Promise.all(
      this.createdObjects.map(obj =>
        this.conn.uninstallExtensionByName(obj.publisher, obj.name)
      )
    );
    this.createdObjects.length = 0;
    return;
  }

  private async installExtension(publisher: string, name: string) {
    this.log(
      `Installing '${name}' from '${publisher}' extension...`
    );

    try {
      await this.conn.installExtensionByName(publisher, name);
      this.createdObjects.push({ publisher, name });
    } catch (e) {
      if (!e.message.includes("already installed")) {
        throw e;
      }
    }
  }
}
