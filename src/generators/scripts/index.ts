import inquirer from "inquirer";
import Generator from "yeoman-generator";
import { MappingFileTransformer } from "../../common/MappingFileTransformer";
import { PackageReader } from "../../common/PackageReader";

class Main extends Generator {
  private readonly packageReader: PackageReader;
  private readonly mappingFileTransformer: MappingFileTransformer;

  private answers!: inquirer.Answers;

  constructor(args: string | string[], opts: {}) {
    super(args, opts);

    this.packageReader = new PackageReader(this.destinationPath());
    this.mappingFileTransformer = new MappingFileTransformer(this.fs);
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
  }

  public writing(): void {
    this.writeSource();
    this.updateMappingFile();
  }

  private updateMappingFile = async (): Promise<void> => {
    const packMappingFilePath = this.destinationPath("src", "solutions", this.answers.sourceSolution, "PackMappingFile.xml");
    const templatePackMappingFilePath = this.templatePath("PackMappingFile.xml");

    this.mappingFileTransformer.transform(templatePackMappingFilePath, this.answers, packMappingFilePath);

    const ExtractMappingFilePath = this.destinationPath("src", "solutions", this.answers.sourceSolution, "ExtractMappingFile.xml");
    const templateExtractMappingFilePath = this.templatePath("ExtractMappingFile.xml");

    this.mappingFileTransformer.transform(templateExtractMappingFilePath, this.answers, ExtractMappingFilePath);
  }

  private writeSource = () => {
    this.log(`Writing solution from template...`);
    this.fs.copyTpl(
      this.templatePath("source"),
      this.destinationPath("src", "solutions", this.answers.sourceSolution),
      this.answers,
      {},
      { globOptions: { dot: true } }
    );
  };
}

module.exports = Main;
