using System.Text.RegularExpressions;

#addin nuget:?package=Cake.Xrm.Sdk&version=0.1.9
#addin nuget:?package=Cake.Xrm.SolutionPackager&version=0.1.9
#addin nuget:?package=Cake.Xrm.DataMigration&version=0.1.8
#addin nuget:?package=Cake.Xrm.Spkl&version=0.1.7
#addin nuget:?package=Cake.Npm&version=0.17.0
#addin nuget:?package=Cake.Json&version=3.0.0

const string DataFolder = "./Data";
const string SolutionsFolder = "./Solutions";
const string PackagesFolder = "./packages";
const string DeployProjectFolder = "./Deploy";
const string TestsFolder = "./Tests";

var target = Argument("target", "Default");
var solution = Argument<string>("solution", "");

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
    EnsureDirectoryExists($"{DeployProjectFolder}/bin/Release/PowerShell");
    CopyFiles($"{PackagesFolder}/Microsoft.CrmSdk.XrmTooling.PackageDeployment.Wpf.*/tools/**/*", Directory($"{DeployProjectFolder}/bin/Release"), true);
    CopyFiles($"{PackagesFolder}/Microsoft.CrmSdk.XrmTooling.PackageDeployment.PowerShell.*/tools/**/*", Directory($"{DeployProjectFolder}/bin/Release/PowerShell"));
    foreach (var solutionDir in GetDirectories($"{SolutionsFolder}/*"))
    {
      EnsureDirectoryExists($"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}");
      DeleteFiles($"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}/**/*");
      CopyDirectory(solutionDir.Combine("bin/Release").FullPath, $"{DeployProjectFolder}/bin/Release/PkgFolder/{solutionDir.GetDirectoryName()}");  
    } 
  });

Task("PackAll")
  .Does(() => {
    var solutionDirectories = GetDirectories($"{SolutionsFolder}/*");
    foreach (var solutionDirectory in solutionDirectories)
    {
      solution = solutionDirectory.GetDirectoryName();
      RunTarget("PackSolution");
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
      Directory($"{SolutionsFolder}/{solution}").Path.Combine("Extract"));
  });

Task("ExtractSolutionFromDevelopmentHub")
  .Does(() => {
    var connectionString = GetConnectionString(solution, false);
    var tempDirectory = Directory(EnvironmentVariable("TEMP"));
    var unmanagedSolution = XrmDownloadAttachment(connectionString, Guid.Parse(Argument<string>("unmanagedNoteId")), tempDirectory);
    var managedSolution = XrmDownloadAttachment(connectionString, Guid.Parse(Argument<string>("managedNoteId")), tempDirectory);
    var outputPath = Directory($"{SolutionsFolder}/{solution}").Path.Combine("Extract");
    
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
    DeleteFiles($"{SolutionsFolder}/bin/Release/**/*");
    PackSolution($"{SolutionsFolder}/{solution}", solution, Argument<string>("solutionVersion", ""));
    var solutionFolder = Directory(SolutionsFolder).Path.Combine(solution);
    var dataFolder = solutionFolder.Combine("Data");
    var outputDataFolder = solutionFolder.Combine("bin/Release/Data");
    if (DirectoryExists(dataFolder))
    {
      CopyDirectory(dataFolder, solutionFolder.Combine("bin/Release/Data"));
      DeleteFiles($"{outputDataFolder}/**/*Export.json");
    }
  });

// data targets 
Task("ExportData")
  .Does(() => {
    var solutionDataFolder = Directory($"{SolutionsFolder}/{solution}/Data");
    EnsureDirectoryExists(solutionDataFolder.Path.Combine("Extract"));
    ExportData(
      solutionDataFolder.Path.Combine("Data/Extract"),
      solutionDataFolder.Path.CombineWithFilePath($"{solution.Split('_')[2]}DataExport.json"));
  });

Task("StageData")
  .Does(() => {
    var solutionDataFolder = Directory($"{SolutionsFolder}/{solution}/Data");
    XrmImportData(
      new DataMigrationImportSettings(
        GetConnectionString(solution, true), 
        Directory($"{SolutionsFolder}/{solution}/Data").Path.CombineWithFilePath($"{solution.Split('_')[2]}DataImport.json")));
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
  var envConfig = ParseJsonFromFile(File($"{SolutionsFolder}/{solution}/env.json"));
  var targetEnvironment = stagingEnvironment && envConfig["stagingEnvironment"] != null ? "stagingEnvironment" : "environment";
  var url = envConfig[targetEnvironment].ToString();
  var username = envConfig["username"] ?? EnvironmentVariable("CAKE_DYNAMICS_USERNAME");
  var password = EnvironmentVariable("CAKE_DYNAMICS_PASSWORD");

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
    Directory(projectFolder).Path.Combine("Extract"),
    SolutionPackageType.Both,
    Directory(projectFolder).Path.CombineWithFilePath("MappingFile.xml")));
}

RunTarget(target);