import inquirer from "inquirer";
import Renamer from "renamer";
import { Builder, parseString } from "xml2js";
import Generator from "yeoman-generator";
import { PackageReader } from "../../common/PackageReader";

class Main extends Generator {
  private readonly packageReader: PackageReader;

  private answers!: inquirer.Answers;

  constructor(args: string | string[], opts: {}) {
    super(args, opts);

    this.packageReader = new PackageReader(this.destinationPath());
  }

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        choices: () => this.packageReader.getSolutions(),
        message: "Name of the solution?",
        name: "sourceSolution",
        store: true,
        type: "list"
      }
    ]);
    const solutionFolderComponents = this.answers.sourceSolution.split("_");
    this.answers.prefix = solutionFolderComponents[0];
    this.answers.solution = solutionFolderComponents[2];
  }

  public writing(): void {
    this.writeSource();
    this.updateImportConfig();
  }

  public install() {
    this.renameFileAndFolders("{{Solution}}", this.answers.solution);
  }

  private writeSource = () => {
    this.log(`Writing data configuration files from template...`);
    this.fs.copyTpl(
      this.templatePath("source"),
      this.destinationPath("Solutions", this.answers.sourceSolution),
      this.answers,
      {},
      { globOptions: { dot: true } }
    );
  };

  private updateImportConfig = async () => {
    this.log(`Updating import config to include new solution.`);

    const importConfigPath = this.destinationPath(
      "Deploy",
      "PkgFolder",
      "ImportConfig.xml"
    );
    parseString(
      this.fs.read(importConfigPath),
      { trim: true, includeWhiteChars: false, renderOpts: { pretty: true } },
      (err, res) => {
        if (err) {
          throw err;
        }
        const configurationMigrations = res.configdatastorage.capgeminiConfigurationMigration[0];
        const importPackage = {
          $: {
            extractedDataPath: `${this.answers.sourceSolution}/Data/Extract`,
            importConfigFilePath: `${this.answers.sourceSolution}/Data/${this.answers.solution}DataImport.json`,
          }
        };

        if (configurationMigrations.importPackage) {
          configurationMigrations.importPackage.push(importPackage);
        } else {
          res.configdatastorage.capgeminiConfigurationMigration = [
            {
              importPackage: [importPackage]
            }
          ];
        }

        this.fs.write(
          importConfigPath,
          new Builder({
            explicitArray: true,
            includeWhiteChars: false,
            renderOpts: { pretty: true },
            trim: true
          }).buildObject(res)
        );
        return;
      }
    );
  };

  private renameFileAndFolders = (from: string, to: string) => {
    this.log(`Renaming file and folders...`);
    const renamer = new Renamer();
    renamer.rename({
      dryRun: false,
      files: [`${this.destinationPath("Solutions", this.answers.sourceSolution, "Data")}/**/*`],
      find: from,
      replace: to
    });
  };
}

module.exports = Main;
