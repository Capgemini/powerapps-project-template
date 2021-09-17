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
        $Dataset_Input : Name of the report/dataset to update parameters for
        $Api_URL : always set this parameter to 'https://api.powerbi.com/v1.0/myorg'
        $ParameterCollection > json array of parameter names and values to be updated. i.e. '[{"ParamName": "Name of the parameter", "ParamValue": "new value of the parameter"}, {"ParamName": "Name of the parameter 2", "ParamValue": "new value of the parameter 2"}]'
    #>

    [CmdletBinding()]  
    param(
        [Parameter(Mandatory=$true)][string]$BuildSourcesDirectory,
        [parameter(Mandatory=$true)]$checkModule, 
        [Parameter(Mandatory=$true)]$ClientID,  
        [Parameter(Mandatory=$true)]$ClientSecret, 
        [Parameter(Mandatory=$true)]$TenantId, 
        [Parameter(Mandatory=$true)]$WorkSpaceName,
        [Parameter(Mandatory=$true)]$Dataset_Input,
        [Parameter(Mandatory=$true)]$Api_URL,
        [Parameter(Mandatory=$true)]$ParameterCollection
        
    )
    
    Write-Host "Path of Release Directory :$BuildSourcesDirectory."
    # Importing UserCreationProcess.psm1 module.
    Import-Module "$BuildSourcesDirectory"
    Write-Host "Importing Module :$checkModule."
    # Importing Module ie. Active Directory .
    ModuleToImport -checkModule $checkModule

    Update_Parameter -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId -WorkSpaceName $WorkSpaceName -Dataset_Input $Dataset_Input -Api_URL $Api_URL -ParameterCollection $ParameterCollection