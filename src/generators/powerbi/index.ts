import { raw } from "guid";
import inquirer from "inquirer";
import Renamer from "renamer";
import Generator from "yeoman-generator";
import yaml from "js-yaml";
import { PackageReader } from "../../common/PackageReader";

class Main extends Generator {
    private packageReader: PackageReader;
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
    
        const solutionPathComponents = this.answers.sourceSolution.split("_");
        const solution = {
          package: solutionPathComponents[1],
          prefix: solutionPathComponents[0],
          solution: "PowerBI"
        };
    
        this.answers.prefix = solution.prefix;
        this.answers.package = solution.package;
        this.answers.solution = solution.solution;
        this.answers.client = this.packageReader.getClient();
        this.answers.projectGuid = raw();
    }

    public writing(): void {
        this.writeSource();
        this.updateBuildStageYmlFile();
    }    

    public async install() {
        this.renameFileAndFolders([
          { from: "{{Client}}", to: this.answers.client },
          { from: "{{Package}}", to: this.answers.package },
          { from: "{{Solution}}", to: this.answers.solution },
          { from: "{{prefix}}", to: this.answers.prefix }
        ]);
    }
         
    private writeSource = () => {
        this.log(`Writing solution from template...`);
        this.fs.copyTpl(
          this.templatePath("source"),
          this.destinationPath("src", "solutions", this.answers.sourceSolution, "PowerBI"),
          this.answers,
          {},
          { globOptions: { dot: true } }
        );
    };

    private updateBuildStageYmlFile = async (): Promise<void> => {
        const buildStageYmlFilePath = this.destinationPath("pipelines", "templates", "include-build-stage.yml");
         
        let file : any = yaml.load(this.fs.read(buildStageYmlFilePath)); 
        let contentJson = JSON.parse(JSON.stringify(file));

        const stepsLength = contentJson.stages[0].jobs[0].steps.length;

        contentJson.stages[0].jobs[0].steps[stepsLength] = {
          task : 'CopyFiles@2',
          displayName: 'Copy PowerBI reports and deployment scripts to artifact staging directory',
          inputs: {
              SourceFolder: `src\\solutions\\${this.answers.sourceSolution}\\PowerBI\\${this.answers.client}.${this.answers.package}.PowerBI\\bin\\Debug\\net462`,
              TargetFolder: '$(Build.ArtifactStagingDirectory)/powerbi'
            }
          }

          contentJson.stages[0].jobs[0].steps[stepsLength + 1] = {
          task : 'PublishBuildArtifacts@1',
          displayName: 'Publish PowerBI artifact',
          inputs: {
              pathtoPublish: '$(Build.ArtifactStagingDirectory)/powerbi',
              artifactName: 'PowerBI'
            }
          }
        
        let updatedYaml = yaml.dump(contentJson, {lineWidth: -1, quotingType: "'"});
        
        this.fs.write(
          buildStageYmlFilePath,
          updatedYaml          
        );
    }

    private renameFileAndFolders = (
        rules: Array<{ from: string; to: string }>
      ) => {
        this.log("Renaming file and folders...");
    
        const renamer = new Renamer();
    
        rules.forEach(rule => {
          this.log(`From ${rule.from} to ${rule.to}.`);
    
          renamer.rename({
            dryRun: false,
            files: [`${this.destinationPath()}/src/solutions/**/*`],
            find: rule.from,
            replace: rule.to
          });
        });
    };
}

module.exports = Main;