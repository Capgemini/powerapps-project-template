import { raw } from "guid";
import inquirer from "inquirer";
import Renamer from "renamer";
import stripJsonComments from "strip-json-comments";
import { Builder, parseString } from "xml2js";
import Generator from "yeoman-generator";
import { validatePacAuthProfile } from "../../common/utilities";

class Main extends Generator {
  private answers!: inquirer.Answers;

  public async prompting(): Promise<void> {
    this.answers = await this.prompt([
      {
        message: "Publisher prefix?",
        name: "prefix",
        store: true,
      },
      {
        message: "Name of the client?",
        name: "client",
        store: true,
      },
      {
        message: "Name of the package?",
        name: "package",
        store: true,
      },
      {
        message: "Name of the solution?",
        name: "solution",
        store: true,
      },
      {
        message:
          "Name of PAC Auth profile? This is used to export the solution locally. (please ensure this has been created with pac auth create -n <name> -u <url>)",
        name: "pacProfile",
        store: false,
        validate: validatePacAuthProfile,
        when: !this.options?.chatbot,
      },
      {
        message: "Development environment URL?",
        name: "environment",
        store: false,
      },
      {
        message:
          "Are changes to this solution promoted using a staging environment?",
        name: "hasStagingEnvironment",
        store: false,
        type: "confirm",
      },
      {
        message: "Staging environment URL?",
        name: "stagingEnvironment",
        store: false,
        when: (answers: any) => answers.hasStagingEnvironment,
      },
    ]);

    this.answers.client = this.answers.client.replace(/\s/g, "");
    this.answers.package = this.answers.package.replace(/\s/g, "");
    this.answers.solution = this.answers.solution.replace(/\s/g, "");
    this.answers.solutionUniqueName = `${this.answers.prefix}_${this.answers.package}_${this.answers.solution}`;
    this.answers.projectGuid = raw();
  }

  public writing(): void {
    this.writeSource();
    this.writeSolutionConfig();
    this.updateTasks();
    this.updateImportConfig();
  }

  public async install() {
    this.renameFileAndFolders([
      { from: "{{Client}}", to: this.answers.client },
      { from: "{{Package}}", to: this.answers.package },
      { from: "{{Solution}}", to: this.answers.solution },
      { from: "{{prefix}}", to: this.answers.prefix },
    ]);
  }

  private writeSource = () => {
    this.log("Writing solution from template...");
    this.fs.copyTpl(
      this.templatePath("source"),
      this.destinationPath("src", "solutions"),
      this.answers,
      {},
      { globOptions: { dot: true } }
    );
  };

  private writeSolutionConfig = () => {
    this.log("Writing solution configuration...");

    const solutionConfig: any = {};

    solutionConfig.DevelopmentProfile = this.answers.pacProfile;
    solutionConfig.environment = this.answers.environment;

    if (this.answers.hasStagingEnvironment) {
      solutionConfig.stagingEnvironment = this.answers.stagingEnvironment;
    }

    this.fs.writeJSON(
      this.destinationPath(
        "src",
        "solutions",
        "{{prefix}}_{{Package}}_{{Solution}}",
        "solution.json"
      ),
      solutionConfig
    );
  };

  private updateTasks = () => {
    this.log("Updating tasks.json...");
    const tasksString = this.fs.read(
      this.destinationPath(".vscode", "tasks.json")
    );
    const tasks = JSON.parse(stripJsonComments(tasksString));
    tasks.inputs
      .find((input: { id: string }) => input.id === "solution")
      .options.push(
        `${this.answers.prefix}_${this.answers.package}_${this.answers.solution}`
      );
    this.fs.writeJSON(this.destinationPath(".vscode", "tasks.json"), tasks);
  };

  private updateImportConfig = async () => {
    this.log("Updating import config to include new solution.");

    const importConfigPath = this.destinationPath(
      "deploy",
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
        const solutions = res.configdatastorage.solutions[0];
        const solutionFullName = `${this.answers.prefix}_${this.answers.package}_${this.answers.solution}`;
        const solutionElement = {
          $: {
            deleteonly: "false",
            forceUpgrade: "false",
            overwriteunmanagedcustomizations: true,
            publishworkflowsandactivateplugins: true,
            solutionpackagefilename: `${solutionFullName}/${solutionFullName}.zip`,
            useAsync: "true",
          },
        };

        if (solutions.configsolutionfile) {
          solutions.configsolutionfile.push(solutionElement);
        } else {
          res.configdatastorage.solutions = [
            {
              configsolutionfile: [solutionElement],
            },
          ];
        }

        this.fs.write(
          importConfigPath,
          new Builder({
            explicitArray: true,
            includeWhiteChars: false,
            renderOpts: { pretty: true },
            trim: true,
          }).buildObject(res)
        );
      }
    );
  };

  private renameFileAndFolders = (
    rules: Array<{ from: string; to: string }>
  ) => {
    this.log("Renaming file and folders...");

    const renamer = new Renamer();

    rules.forEach((rule) => {
      this.log(`From ${rule.from} to ${rule.to}.`);

      renamer.rename({
        dryRun: false,
        files: [`${this.destinationPath()}/src/solutions/**/*`],
        find: rule.from,
        replace: rule.to,
      });
    });
  };
}

module.exports = Main;
