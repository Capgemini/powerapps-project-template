# Contributing

Please ensure that pull requests are atomic and do not contain partially built functionality. This allows for holistic code reviews, cleaner git history and a more stable package. The repository contains all of the dependencies required to develop Dynamics 365 functionality.

## Development environment

...


### Power Apps CLI

You must have the [Power Apps CLI](https://docs.microsoft.com/en-us/powerapps/developer/common-data-service/powerapps-cli) installed to use some of the Visual Studio Code build tasks. The _solution.json_ in each solution folder has a `developmentProfile` property - this is the Power Apps CLI authentication profile that maps to the development environment for that solution. You must create these authentication profiles using `pac auth create`.

### Build tasks

Build tasks have been defined to make development easier. Call these in Visual Studio Code via the command palette (_ctrl + shift + p_) and selecting _Tasks: Run Task_.

The following tasks are available: 

- Clean
- Restore
- Compile
- Compile tests
- Generate early-bound model
- Deploy workflow activities
- Deploy plug-ins
- Extract solution
- Pack solution

A description will be shown for each.

> ⚠ **Building outside of the tasks is not recommended!**. If you are building the solution in Visual Studio, you should set the following environment variable:
`MSBUILDDISABLENODEREUSE=1`. This is a workaround for an apparent bug in the MSBuild tasks used by solutions created with the Power Apps CLI. If you do not disable parallel builds or node reuse using the environment variable above, plug-in assembly files become locked afte a build and subsequent builds will fail.
### Extract to source control

Before creating a pull request containing your changes, you must extract the solutions into source control. This can be done using the _Extract solution_ task and specifying which solution(s) to extract.

### Create a git branch

Create a git branch from master using the following naming convention:

`<category>/<key>-<description>`

- All characters should be lowercase and spaces should be separated by hyphens.
- Category should be either: `feature` for new functionality, `bug` for bug fixes, or `tech` for any technical changes (e.g. updating builds etc.).
- Key will be the numeric portion of the story, bug, or task's key/ID (e.g. 1722).
- Description will be a summary of the story, bug or task. This will possibly be the same as the issue name but it may have to be made more succinct.

For example, `feature/1722-view-and-maintain-accounts`.

### Create a development solution

A development solution should be created in the development environment which will exist until your branch is merged with master. The solution should be created with the following convention:

- Unique Name: `ds_<key>_<description>`
- Display Name: `<description>`

Using the above branch as an example, we would create a solution with the following values:

- Unique Name: `ds_1722_ViewAndMaintainAccounts`
- Display Name: `View and Maintain Accounts`

The following rules need to be adhered to when working in your development solution:

- Only one development solution can make changes to a component (e.g. relationship, field, view, form, assembly or process) at a time. Check other development solutions if you are unsure. Multiple development solutions modifying the same components will mean that either:
  - Unfinished customisations will be added to the build
  - Developent solutions cannot be merged because of dependencies added by other development solutions
- Avoid locking out shared components for longer than required by modifying them last if possible
- Add only the components that you require to your solution. Do not check 'Add all assets' or 'Include entity metadata' when adding entities.
- Do not add dependencies when prompted. These should already exist in the target system (the staging environment).
- Avoid changes to managed components where possible. There may be a couple of exceptions.

### Processes and plugins

- Plugin steps can't be scoped so alternatives should be considered when dealing with out-of-the-box entities and messsages.

## Tools

Visual Studio is recommended for .NET development (i.e. plugins assemblies) while Visual Studio Code is recommended for most other tasks.

- Visual Studio

  - NPM Task Runner
  - Cake for Visual Studio
  - SpecFlow for Visual Studio

- Visual Studio Code

  - npm
  - Azure Repos

- Fiddler

## Writing tests

There are three test projects corresponding to unit, integration and UI tests. Ensure that your feature branch updates the test projects in order to verify your changes:

- Write unit tests when writing custom code (e.g. workflow activities or plugins)
- Write integration tests when making changes that affect the back-end (e.g. configuring Common Data Service security roles, processes or entities)
- Write UI tests when making changes that affect the front-end (e.g. configuring apps, views, dashboards, and forms)

### Configuring integration test users

The `CommonDataServiceFixture` class fixture (refer to the xUnit documentation on class fixtures [here](https://xunit.net/docs/shared-context#class-fixture)) provides access to an `AdminTestClient` property - a `CrmServiceClient` instance authenticated as an admin user. All integration tests will require at least the ability to authenticate as an administrator in the Common Data Service environment under test. This can be achieved by setting the following environment variables:

- CDS_TEST_ADMIN_USERNAME
- CDS_TEST_ADMIN_PASWORD

If you wish to test users with specific security roles, the `CommonDataServiceFixture` provides a `GetUserTestClient` method. Pass an alias to this method and it will use environment variables with the following pattern for authentication - 

- CDS_TEST_<ALIAS>_USERNAME
- CDS_TEST_<ALIAS>_PASSWORD

These variables must also be added to the `Integration Tests` variable group in Azure DevOps. The variable group is linked to the release pipeline which allows the pipeline to them as environment variables. Note that passwords are stored as secret variables and these are not automatically decrypted into environment variables for the pipeline. This means that, each time a new alias is added, the `Set user credentials task` in the CI stage of the release pipeline must be updated to include the following -

`echo ##vso[task.setvariable variable=CDS_TEST_<ALIAS>_PASSWORD]$(CDS Test <Alias> Password)`

### Configuring UI test users 

UI test users are configured according to the specflow-xrm-bindings [documentation](https://github.com/Capgemini/specflow-xrm-bindings/blob/master/README.md).

## Cake

Cake is a build automation tool that can be integrated with Visual Studio and Visual Studio code through extensions. An add-in for Cake has been developed by the Capgemini Dynamics team which automates many of the day-to-day tasks of Dynamics 365 developers. A Cake build script (_build.cake_) and bootstrapper (_build.ps1_) are present in the root of this repository.

It is not recommended to call the Cake build executable directly. The _build.ps1_ bootstrapper script should be used instead. The bootstrapper script handle dependency resolution, negating the need to store Cake dependencies in source control.

**Note:** The Cake extension for Visual Studio does not use the _build.ps1_ bootstrapper. It is recommended that you run your first Cake task through Visual Studio Code to resolve dependencies first.

### Extracting a solution

Solutions can be extracted using the `Extract Solution` task.

### Packing a solution

Solutions can be packed into managed and unmanaged solution zip files using the `Pack Solution` task.

_Note: it is unlikely that developers will need to pack the solutions themselves. This is typically done via CI build_

### Extracting data

Data can be exported using the `ExportData` task.

The data is exported using the [Capgemini Data Migration Engine](https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.DataMigration) and the export config file located in the relevant data folder.

### Deploying web resources

In most instances, developers should [configure Fiddler AutoResponder rules](https://docs.microsoft.com/en-us/dynamics365/customer-engagement/developer/streamline-javascript-development-fiddler-autoresponder) and deploy their web resource via Dynamics 365 UI.

### Deploying plugins

Plugins can be deployed using the `Deploy Plugins` task. This deploys all steps declared via the Spkl attribute.

### Deploying workflow activities

Worklow activities can be deployed using the `Deploy Workflow Activities` task. This deploys all workflow activities declared via the Spkl attribute.

### Generating the early-bound model classes

The early-bound model classes can be generated for solutions using the `Generate Model` Cake task. It will use the early-bound configuration located in the spkl.json file in the root of the solution folder.

### Building the package

The entire package can be built using the `Build Package` task. This will pack all solutions and copy them to the _Package_ folder. The PackageDeployer import configuration and reference/configuration data and associated import configurations will also be copied to this folder.


## Pull requests

Please ensure that you:

- Write commit messages that increment the version using [GitVersion](https://gitversion.readthedocs.io/en/latest/input/docs/more-info/version-increments/) syntax
- Write commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification
- Write automated tests to cover any new or changed functionality 
- Update the README.md with details of any new or changed functionality
