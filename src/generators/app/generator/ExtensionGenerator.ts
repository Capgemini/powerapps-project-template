import { ExtensionManagementApi } from "azure-devops-node-api/ExtensionManagementApi";

export class ExtensionGenerator {
  private readonly conn: ExtensionManagementApi;
  private readonly log: (msg: string) => void;

  constructor(conn: ExtensionManagementApi, log: (msg: string) => void) {
    this.conn = conn;
    this.log = log;
  }

  public async generate() {
    return this.installExtension("WaelHamze", "xrm-ci-framework-build-tasks");
  }

  private async installExtension(publisherName: string, extensionName: string) {
    this.log(
      `Installing '${extensionName}' from '${publisherName}' extension...`
    );

    try {
      await this.conn.installExtensionByName(publisherName, extensionName);
    } catch (e) {
      if (!e.message.includes("already installed")) {
        throw e;
      }
    }
  }
}
