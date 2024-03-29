namespace <%= client %>.<%= package %>.Deployment
{
    using System.ComponentModel.Composition;
    using Capgemini.PowerApps.PackageDeployerTemplate;
    using Microsoft.Xrm.Tooling.PackageDeployment.CrmPackageExtentionBase;

    /// <summary>
    /// Import package starter frame.
    /// </summary>
    [Export(typeof(IImportExtensions))]
    public class PackageTemplate : PackageTemplateBase
    {
        /// <inheritdoc/>
        public override string GetImportPackageDataFolderName => "PkgFolder";

        /// <inheritdoc/>
        public override string GetImportPackageDescriptionText => "<%= package %>";

        /// <inheritdoc/>
        public override string GetLongNameOfImport => "<%= package %>";

        /// <inheritdoc/>
        public override string GetNameOfImport(bool plural) => "<%= package %>";
    }
}
