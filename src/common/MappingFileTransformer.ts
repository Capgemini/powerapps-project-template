import { render } from 'ejs';
import { Builder, parseString } from 'xml2js';
import Generator from 'yeoman-generator';

export default class MappingFileTransformer {
  private readonly fs: Generator.MemFsEditor;

  constructor(fs: Generator.MemFsEditor) {
    this.fs = fs;
  }

  public async transform(
    templateMappingFilePath: string,
    data: any, targetMappingFilePath: string,
  ): Promise<void> {
    const templateMappingFileParsed = this.getRenderedTemplate(templateMappingFilePath, data);

    parseString(
      templateMappingFileParsed,
      { trim: true, includeWhiteChars: false, renderOpts: { pretty: true } },
      (tErr, tRes) => {
        if (tErr) {
          throw tErr;
        }

        parseString(
          this.fs.read(targetMappingFilePath),
          { trim: true, includeWhiteChars: false, renderOpts: { pretty: true } },
          (err, res) => {
            if (err) {
              throw err;
            }

            const merge = MappingFileTransformer.mergeMappings(tRes, res);

            this.fs.write(
              targetMappingFilePath,
              new Builder({
                explicitArray: true,
                includeWhiteChars: false,
                renderOpts: { pretty: true },
                trim: true,
              }).buildObject(merge),
            );
          },
        );
      },
    );
  }

  private static mergeMappings(source: any, target: any) {
    const result = { ...target };

    if (typeof target.Mapping !== 'object') {
      result.Mapping = {};
    }

    Object.keys(source.Mapping).forEach((mappingType) => {
      if (!Array.isArray(target.Mapping[mappingType])) {
        result.Mapping[mappingType] = [];
      }
      result.Mapping[mappingType].push(...source.Mapping[mappingType]);
    });

    return result;
  }

  private getRenderedTemplate(templatePath: string, data: any) {
    return render(this.fs.read(templatePath), data);
  }
}
