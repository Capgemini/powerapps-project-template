namespace TestClient.TestPackage.IntegrationTests
{
    using System;
    using System.Net;
    using Microsoft.Xrm.Tooling.Connector;

    /// <summary>
    /// A base class for integration tests ran against a Common Data Service environment.
    /// </summary>
    public class CommonDataServiceFixture : IDisposable
    {
        private const string AdminAlias = "ADMIN";
        private const string EnvironmentVariableUrl = "CDS_TEST_CDS_URL";
        private const string EnvironmentVariableFormatUsername = "CDS_TEST_{0}_USERNAME";
        private const string EnvironmentVariableFormatPassword = "CDS_TEST_{0}_PASSWORD";

        /// <summary>
        /// Initializes a new instance of the <see cref="CommonDataServiceFixture"/> class.
        /// </summary>
        public CommonDataServiceFixture()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            this.AdminTestClient = this.GetCrmServiceClient(
                EnvironmentVariableUrl,
                AdminAlias);
        }

        /// <summary>
        /// Gets a <see cref="CrmServiceClient"/> instance as an admin for the environment under test.
        /// </summary>
        public CrmServiceClient AdminTestClient { get; private set; }

        /// <inheritdoc/>
        public void Dispose()
        {
            this.AdminTestClient.Dispose();
        }

        /// <summary>
        /// Gets a <see cref="CrmServiceClient"/> instance as a given security role.
        /// </summary>
        /// <param name="userAlias">The alias to use for the test.</param>
        /// <returns>A service client authenticated as the provided role.</returns>
        public CrmServiceClient GetUserTestClient(string userAlias)
        {
            if (userAlias == null)
            {
                throw new ArgumentNullException(nameof(userAlias));
            }

            return this.GetCrmServiceClient(
                EnvironmentVariableUrl,
                userAlias);
        }

        private static string GetConnectionString(string url, string username, string password)
        {
            if (string.IsNullOrEmpty(url))
            {
                throw new ArgumentException("You must provide a URL for the connection string.", nameof(url));
            }

            if (string.IsNullOrEmpty(username))
            {
                throw new ArgumentException("You must provide a username for the connection string.", nameof(username));
            }

            if (string.IsNullOrEmpty(password))
            {
                throw new ArgumentException("You must provide a password for the connection string.", nameof(password));
            }

            return $"Url={url}; Username={username}; Password={password}; authtype=Office365; RequireNewInstance=true";
        }

        private CrmServiceClient GetCrmServiceClient(string urlEnvironmentVariable, string userAlias)
        {
            if (string.IsNullOrEmpty(urlEnvironmentVariable))
            {
                throw new ArgumentException("You must provide the name of an environment variable containing the URL.", nameof(urlEnvironmentVariable));
            }

            if (string.IsNullOrEmpty(userAlias))
            {
                throw new ArgumentException("You must provide an alias to use for the client.", nameof(userAlias));
            }

            var url = Environment.GetEnvironmentVariable(urlEnvironmentVariable);
            var usernameEnvironmentVariable = string.Format(EnvironmentVariableFormatUsername, userAlias.ToUpper());
            var username = Environment.GetEnvironmentVariable(usernameEnvironmentVariable);
            var passwordEnvironmentVariable = string.Format(EnvironmentVariableFormatPassword, userAlias.ToUpper());
            var password = Environment.GetEnvironmentVariable(passwordEnvironmentVariable);

            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                throw new Exception($"One or more of the following environment variables were not set: {urlEnvironmentVariable}, {usernameEnvironmentVariable}, {passwordEnvironmentVariable}.");
            }

            var client = new CrmServiceClient(GetConnectionString(url, username, password));
            if (client.LastCrmException != null)
            {
                throw client.LastCrmException;
            }

            return client;
        }
    }
}
