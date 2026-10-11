output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "api_function_name" {
  value = aws_lambda_function.api.function_name
}

output "dbops_function_name" {
  value = aws_lambda_function.dbops.function_name
}

output "api_log_group" {
  value = aws_cloudwatch_log_group.api.name
}
