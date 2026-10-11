using FieldMate.Api.Endpoints;
using FieldMate.Api.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);

// Runs as fieldmate-api-{env} behind API Gateway (HTTP API, payload v2). Outside Lambda this is a no-op and the
// same application runs on Kestrel, so nothing in the application depends on the Lambda host.
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);
builder.Services.AddFieldMateFoundation(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<RequestPipelineMiddleware>();
app.MapFoundationEndpoints();

app.Run();

/// <summary>Entry point; public so integration tests can host the API in-process.</summary>
public partial class Program;
