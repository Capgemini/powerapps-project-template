<#
 .SYNOPSIS
    PowerBi_Tool 

 .DESCRIPTION
    This script is used to call function defined in .PSM1 file

.PARAMETERS
        $BuildSourcesDirectory: Path to PowerShell module which is responsible for the interactions with Power BI Rest APIs. Can be selected from artifacts folder
        $checkModule : List of Modules that should be imported to run the script successfully. In this case you only need “MicrosoftPowerBIMgmt”
        $ClientID : Application Id of the app registration created as part of pre-requisites
        $ClientSecret : Secret that was added to this app registration as part of pre-requisites
        $TenantId : Tenant Id of the app registration
        $WorkSpaceName : target Workspace name
        $Authority : App registration oauthv1 endpoint. This can be found under App Reg Endpoint in Azure Active Directory
        $Resource : Resource URL to get an access token for to update credentials of the datasource
        $Dataset_Input : Name of the report/dataset to update parameters for
        $Api_URL : always set this parameter to 'https://api.powerbi.com/v1.0/myorg'
        $DataSource_Type : Type of data set we are targeting. At the moment only Dataverse is supported so use “Extension”. This can be extended
        $Admin_User_PowerBI : name of the systemuser to use as powerbi admin which is a user in dataverse instance as well
        $Admin_Password_PowerBI : password of the systemuser to use as powerbi admin which is a user in resource dataverse instance as well
    #>

    [CmdletBinding()]  
    param(
        [Parameter(Mandatory=$true)][string]$BuildSourcesDirectory,
        [parameter(Mandatory=$true)]$CheckModule, 
        [Parameter(Mandatory=$true)]$ClientID,  
        [Parameter(Mandatory=$true)]$ClientSecret, 
        [Parameter(Mandatory=$true)]$TenantId, 
        [Parameter(Mandatory=$true)]$WorkSpaceName,
        [Parameter(Mandatory=$true)]$Authority,
        [Parameter(Mandatory=$true)]$Resource,
        [Parameter(Mandatory=$true)]$Api_URL,
        [Parameter(Mandatory=$true)]$Dataset_Input,
        [Parameter(Mandatory=$true)]$Admin_User_PowerBI,
        [Parameter(Mandatory=$true)]$Admin_Password_PowerBI,
        [Parameter(Mandatory=$true)]$DataSource_Type
    )

    Write-Host "Path of Release Directory :$BuildSourcesDirectory."
    # Importing UserCreationProcess.psm1 module.
    Import-Module "$BuildSourcesDirectory"
    Write-Host "Importing Module :$CheckModule."
    # Importing Module ie. Active Directory .
    ModuleToImport -checkModule $checkModule

    Update_DataSourceCredential -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId -WorkSpaceName $WorkSpaceName -Authority $Authority -Resource $Resource -Admin_User_PowerBI $Admin_User_PowerBI -Admin_Password_PowerBI $Admin_Password_PowerBI -Dataset_Input $Dataset_Input -Api_URL $Api_URL -DataSource_Type $DataSource_Type
