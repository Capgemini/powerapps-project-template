using System.ComponentModel.Composition;
using Microsoft.Xrm.Tooling.PackageDeployment.CrmPackageExtentionBase;
using Capgemini.Xrm.Deployment.PackageDeployer;

namespace <%= client %>.<%= package %>.Deployment
{
    /// <summary>
    /// Import package starter frame. 
    /// </summary>
    [Export(typeof(IImportExtensions))]
public class PackageTemplate : CapgeminiPackageTemplate
{
    /// <summary>
    /// Name of the Import Package to Use
    /// </summary>
    /// <param name="plural">if true, return plural version</param>
    /// <returns></returns>
    public override string GetNameOfImport(bool plural) => "<%= package %>";

    /// <summary>
    /// Folder Name for the Package data. 
    /// </summary>
    public override string GetImportPackageDataFolderName => "PkgFolder";

    /// <summary>
    /// Description of the package, used in the package selection UI
    /// </summary>
    public override string GetImportPackageDescriptionText => "<%= package %>";

    /// <summary>
    /// Long name of the Import Package. 
    /// </summary>
    public override string GetLongNameOfImport => "<%= package %>";
}
}
