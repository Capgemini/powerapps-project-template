using System.Text.RegularExpressions;

#addin nuget:?package=Cake.Xrm.Sdk&version=0.1.9
#addin nuget:?package=Cake.Xrm.SolutionPackager&version=0.1.11
#addin nuget:?package=Cake.Xrm.DataMigration&version=0.1.8
#addin nuget:?package=Cake.Xrm.Spkl&version=0.2.0
#addin nuget:?package=Cake.Npm&version=0.17.0
#addin nuget:?package=Cake.Json&version=4.0.0

const string SolutionsFolder = "./src/solutions";
const string PackagesFolder = "./packages";
const string DeployProjectFolder = "./deploy";
const string TestsFolder = "./tests";

var target = Argument("target", "Default");
var solution = Argument<string>("solution", "");
var packedSolutions = new List<string>();

// Build package
Task("Default")
  .IsDependentOn("PackAll")
  .IsDependentOn("BuildDeploymentProject");

Task("BuildDeploymentProject")
  .Does(() => {
    BuildCSharpProject(
      File($"{DeployProjectFolder}/<%= client %>.<%= package %>.Deployment.csproj"), 
      new NuGetRestoreSettings { ConfigFile = "NuGet.config" }, 
      new MSBuildSettings { Configuration = "Release" });
    foreach (var solutionDir in GetDirectories($"{SolutionsFolder}/*"))
    {
      EnsureDirectoryExists($"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}");
      DeleteFiles($"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}/**/*");
      CopyDirectory(solutionDir.Combine("bin/Release").FullPath, $"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}");
      EnsureDirectoryExists(solutionDir.Combine("data").FullPath);
      CopyDirectory(solutionDir.Combine("data").FullPath, $"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}/data");
    } 
  });

Task("PackAll")
  .Does(() => {
    foreach (var solutionDirectory in GetDirectories($"{SolutionsFolder}/*"))
    {
      solution = solutionDirectory.GetDirectoryName();
      if (!packedSolutions.Contains(solution)){
        RunTarget("PackSolution");
      }
    }
  });

Task("GenerateModel")
  .Does(() => {
    SpklGenerateEarlyBound(
      Directory($"{SolutionsFolder}/{solution}").Path.CombineWithFilePath("spkl.json"), 
      GetConnectionString(solution, false));
  });

Task("ExtractSolution")
  .Does(() => {
    ExtractSolution(
      GetConnectionString(solution, true), 
      solution, 
      Directory($"{SolutionsFolder}/{solution}").Path.Combine("extract"));
  });

Task("ExtractSolutionFromDevelopmentHub")
  .Does(() => {
    var connectionString = GetConnectionString(solution, false);
    var tempDirectory = Directory(EnvironmentVariable("TEMP"));
    var unmanagedSolution = XrmDownloadAttachment(connectionString, Guid.Parse(Argument<string>("unmanagedNoteId")), tempDirectory);
    var managedSolution = XrmDownloadAttachment(connectionString, Guid.Parse(Argument<string>("managedNoteId")), tempDirectory);
    var outputPath = Directory($"{SolutionsFolder}/{solution}").Path.Combine("extract");
    
    SolutionPackagerExtract(unmanagedSolution, outputPath, SolutionPackageType.Both);
  });

// build targets 
Task("BuildTestProjects")
  .Does(() => {
    var nugetSettings = new NuGetRestoreSettings { ConfigFile = "NuGet.config" };
    foreach (var testProject in GetFiles($"{TestsFolder}/**/*.csproj")) 
    {
      BuildCSharpProject(testProject.FullPath, nugetSettings, new MSBuildSettings { Configuration = "Debug" });
    }
  });

Task("BuildSolution")
  .DoesForEach(
    GetFiles($"{Directory($"{SolutionsFolder}/{solution}")}/**/package.json",  new GlobberSettings { Predicate = (fileSystemInfo) => !fileSystemInfo.Path.FullPath.Contains("node_modules") }), 
    (packageFile) => {
      var directory = packageFile.GetDirectory();
      NpmInstall(new NpmInstallSettings { WorkingDirectory = directory });
      NpmRunScript(new NpmRunScriptSettings { ScriptName = "build", WorkingDirectory = directory, });
  })
  .DoesForEach(
    GetFiles($"{Directory($"{SolutionsFolder}/{solution}")}/**/*.csproj"),
    (msBuildProject) => {
      BuildCSharpProject(
        msBuildProject, 
        new NuGetRestoreSettings { ConfigFile = "NuGet.config" }, 
        new MSBuildSettings { Configuration = "Deploy" });
    }
  );

// pack targets
Task("PackSolution")
  .IsDependentOn("BuildSolution")
  .Does(() => {
    var solutionFolder = Directory($"{SolutionsFolder}/{solution}");
    
    SolutionPackagerPack(
      new SolutionPackagerPackSettings(
        solutionFolder.Path.CombineWithFilePath($"bin\\Release\\{solution}.zip"),
        solutionFolder.Path.Combine("extract"),
        SolutionPackageType.Both,
        solutionFolder.Path.CombineWithFilePath("PackMappingFile.xml")));
    packedSolutions.Add(solution);
  });

// data targets 
Task("ExportData")
  .Does(() => {
    var solutionDataFolder = Directory($"{SolutionsFolder}/{solution}/Data");
    EnsureDirectoryExists(solutionDataFolder.Path.Combine("extract"));
    ExportData(
      solutionDataFolder.Path.Combine("data/extract"),
      solutionDataFolder.Path.CombineWithFilePath($"{solution.Split('_')[2]}DataExport.json"));
  });

Task("StageData")
  .Does(() => {
    var solutionDataFolder = Directory($"{SolutionsFolder}/{solution}/data");
    XrmImportData(
      new DataMigrationImportSettings(
        GetConnectionString(solution, true), 
        Directory($"{SolutionsFolder}/{solution}/data").Path.CombineWithFilePath($"{solution.Split('_')[2]}DataImport.json")));
  });
  
// deploy targets
Task("DeployPlugins")
  .DoesForEach(
    GetFiles($"{Directory($"{SolutionsFolder}/{solution}")}/**/*.csproj"),
    (msBuildProject) => {
      BuildCSharpProject(
        msBuildProject, 
        new NuGetRestoreSettings { ConfigFile = "NuGet.config" }, 
        new MSBuildSettings { Configuration = "Deploy" });
    }
  )
  .Does(() => {
    SpklDeployPlugins(Directory($"{SolutionsFolder}/{solution}").Path.CombineWithFilePath("spkl.json"), GetConnectionString(solution, false));
});

Task("DeployWorkflowActivities")
  .DoesForEach(
    GetFiles($"{Directory($"{SolutionsFolder}/{solution}")}/**/*.csproj"),
    (msBuildProject) => {
      BuildCSharpProject(
        msBuildProject, 
        new NuGetRestoreSettings { ConfigFile = "NuGet.config" }, 
        new MSBuildSettings { Configuration = "Deploy" });
    }
  )
  .Does(() => {
    SpklDeployWorkflows(Directory($"{SolutionsFolder}/{solution}").Path.CombineWithFilePath("spkl.json"), GetConnectionString(solution, false));
});

void BuildCSharpProject(FilePath projectPath, NuGetRestoreSettings nugetSettings, MSBuildSettings msBuildSettings = null) { 
    NuGetRestore(projectPath, nugetSettings);
    MSBuild(projectPath, msBuildSettings);
}

// Utilities

string GetConnectionString(string solution, bool stagingEnvironment) {
  var solutionConfig = ParseJsonFromFile(File($"{SolutionsFolder}/{solution}/solution.json"));
  var targetEnvironment = stagingEnvironment && solutionConfig["stagingEnvironment"] != null ? "stagingEnvironment" : "environment";
  var url = solutionConfig[targetEnvironment].ToString();
  var username = solutionConfig["username"] ?? EnvironmentVariable("CAKE_<%= package.toUpperCase().replace(" ", "").trim(); %>_USERNAME");
  var password = EnvironmentVariable("CAKE_<%= package.toUpperCase().replace(" ", "").trim(); %>_PASSWORD");

  return $"Url={url}; Username={username}; Password={password}; AuthType=Office365;";
}

void ExtractSolution(string connectionString, string solutionName, DirectoryPath outputPath) {
  var tempDirectory = DirectoryPath.FromString(EnvironmentVariable("TEMP"));
  XrmExportSolution(connectionString, solutionName, tempDirectory, isManaged: false);
  XrmExportSolution(connectionString, solutionName, tempDirectory, isManaged: true);
  SolutionPackagerExtract(tempDirectory.CombineWithFilePath($"{solutionName}.zip"), outputPath, SolutionPackageType.Both);
}

void ExportData(DirectoryPath extractFolder, FilePath exportConfigPath) {
  DeleteFiles($"{extractFolder}/**/*");
  XrmExportData(new DataMigrationExportSettings(GetConnectionString(solution, false), exportConfigPath));
}

void PackSolution(string projectFolder, string solutionName, string solutionVersion) {    
  SolutionPackagerPack(new SolutionPackagerPackSettings(
    Directory(projectFolder).Path.CombineWithFilePath($"bin\\Release\\{solutionName}.zip"),
    Directory(projectFolder).Path.Combine("extract"),
    SolutionPackageType.Both,
    Directory(projectFolder).Path.CombineWithFilePath("PackMappingFile.xml")));
}

RunTarget(target);