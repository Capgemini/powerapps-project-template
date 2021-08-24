## Table of Contents

- [Pre-requisites](#pre-requisites)
- [Azure AD App Registration](#azure-ad-app-registration)
- [Azure AD Security Group](#azure-ad-security-group)
- [Allow Service Principals to use Power BI APIs](#allow-service-principals-to-use-power-bi-apis)
- [Creating a Target Power BI Workspace](#creating-a-target-power-bi-workspace)
- [Release Pipeline Set Up for pbix a file](#release-pipeline-set-up-for-a-pbix-file)

## Pre-requisites

- Azure AD App Registration with Power BI Service API Permissions
- Azure AD Security Group 
- Allowing Service Princilaps to use Power BI APIs
- Creating a Target Power BI Workspace

## Azure AD App Registration

Application registration will be used as a member of Azure AD security group to be able to access Power BI APIs without a signed in user. You can follow the steps below to create App Registration.

- Navigate to [Azure Active Directory](https://aad.portal.azure.com/)
- From the left panel, choose Azure Active Directory > App registrations
- Choose "+ New registration"
- In the “Register An Application” form provide a name for your application
- Select “Accounts in this organizational directory only” and then choose Register
- Once App registration has been created, from Navigational Panel, click on API Permissions and add Power BI Service permissions
- From Navigational Panel, click on "Certificates & secrets" and add a new secret. IMPORTANT: Once the secret has been created please record the value. You will not be able to view the secret again once you leave the current screen. This secret will be used along side Tenant Id and Application Client ID in the powershell scripts to get access to Power BI.
- From Navigational Panel, click on Manifest and make sure “oauth2AllowIdTokenImplicitFlow” is set to true

## Azure AD Security Group

Security Group is used to give App Registration access to Power BI APIs without a signed in user. You can follow the steps below to set this up.

- Navigate to [Azure Active Directory](https://aad.portal.azure.com/)
- From the left panel, choose Azure Active Directory > Groups
- Choose "+ New Group"
- In the “New Group” form provide a name for your group
- Select “Security” as Group Type and then choose Create
- Once the Security group has been created, open it and from the Navigational Panel click on “Members” and then “Add members”
- From the “Add members” form, search for the Application Registration created in the previous step and add the Application Registration as a member to the group

## Allow Service Principals to use Power BI APIs

This will allow you to access Power BI APIs without a signed in user. Without this setting, powershell scripts will not be able to interact with Power BI APIs using the application registration created above. Before this can be done, you will need to login to Power BI as an administrator as the settings below are only visible to Power BI Admin users. You can follow the steps below to set this up.

- Navigate to [Power BI Admin Portal](https://app.powerbi.com/admin-portal/)
- This will land you on Power BI Admin Portal page and Tenant Settings will be selected from the navigation pane.
- If Tenant Settings is not selected then select “Tenant Settings” and scroll down to “Developer settings” and expand “Allow service principals to use Power BI APIs” option
- Select “Specify security groups (Recommended)” and add the Azure Active Directory Group created in the previous step.

## Creating a Target Power BI Workspace

This is the target workspace to deploy pbix files. At the moment, the creation of the workspace is a manual process. You can follow the steps below to set this up.

- Navigate to [Power BI Service](https://app.powerbi.com/home)
- From the Navigational Panel, click on Workspaces and Select “Create a workspace” from the bottom of Workspaces Panel
- In the “Create a workspace” Form provide a name and description for the workspace and click on "Save"
- Once the Workspace has been created please open the workspace and in the workspace form , select “Access” from top right
- In the “Access” form, add the Azure Active Directory Security Group created in the steps above as Admin to the workspace. This will allow the powershell scripts to execute CRUD operations in this workspace.

## Release Pipeline Set Up for pbix a file

This set up is following 1 release pipeline per pbix file. During the set up of the powerbi sub generator, build yaml template has been update to include powerbi reports and scripts folder in the artifacts. This allows the powershell and pbix files to be accessible in any related release pipeline/s. You can follow the steps below to set up a release pipeline.

- Navigate to [Azure DevOps](#https://dev.azure.com/) and Select the project under which we should be creating the Release Pipeline
- Select "New Release Pipeline" and select "Empty Job" and provide a stage name
- Click on “Add an artifact” under Artifacts and select the build artifact that publishes the reports and scripts
- To start adding task/s to a stage, please step into the Stage
- Click on the “+” icon on the agent job to add a new task and search for “PowerShell” and click on Add
- You can now start selecting the powershell scripts available in the artifacts.

For example : If you wanted to upload a report and then update its parameter/s. You can add a powershell task and select "UploadReport.ps1" and then add the second powershell task and select "Update Parameters.ps1" from the artifacts/powerbi/scripts folder.

Every Powershell script has a dependency on the "PowerBI_Automation_Module.psm1" module that is added by the subgenerator. The module is where the functions are located to interact with Power BI Rest APIs. 

Scripts can be executed/debugged locally. All you need to do is, provide the parameters to the relevant script and run it.

Information about some of the parameters that are used by scripts can be found in each of the script files. IT IS RECOMMENDED THAT any passwords/secret values are converted to a secret in ADO variables.
